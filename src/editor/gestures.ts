/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pointer gestures as pure document transforms.
 *
 * Each function takes the document, a snapshot of the nodes the gesture grabbed
 * when it began, and the pointer's current page position, and returns the next
 * document. No React, no DOM, no mutation.
 *
 * The critical contract: **every call derives its result from `nodes`, the
 * gesture's starting snapshot — never from `doc`'s current values.** A drag is
 * delivered as dozens of `pointermove` events, all of which run through here. If
 * a scale factor were applied to the live node instead of the snapshot, it would
 * compound once per event, and a 1.2x drag spread over ten events would land at
 * 1.2^10. Same story, more subtly, for accumulated float error on a move.
 */

import {
  applyGroupScale,
  groupResizeTransform,
  resizeFrame,
  rotateFrame,
  rotateFrameAbout,
  rotationDelta,
  sub,
  unionAabb,
} from './geometry';
import { frameOf, mapNodes, scaleNodeProps, withFrame } from './document';
import { computeSnap, type SnapTarget } from './snapping';
import type { Box, EditorDocument, EditorNode, HandleId, SnapGuide, Vec } from './types';

export const MIN_SIZE = 4;

/** The nodes a gesture grabbed, exactly as they were on `pointerdown`. */
export type NodeMap = Record<string, EditorNode>;

export const framesOf = (nodes: NodeMap) => Object.values(nodes).map(frameOf);

/** Bounding box of a snapshot. Never null: a gesture always grabs something. */
export const groupBoxOf = (nodes: NodeMap): Box =>
  unionAabb(framesOf(nodes)) ?? { x: 0, y: 0, width: 0, height: 0 };

export interface MoveGesture {
  nodes: NodeMap;
  groupBox: Box;
  startPage: Vec;
}

export interface MoveOptions {
  /** Shift: constrain to the dominant axis. */
  axisLock?: boolean;
  snapTargets?: SnapTarget[];
  /** In page units. Pass `SNAP_PIXELS / zoom`. Zero or absent disables snapping. */
  snapThreshold?: number;
}

export function applyMoveGesture(
  doc: EditorDocument,
  gesture: MoveGesture,
  pointer: Vec,
  { axisLock = false, snapTargets, snapThreshold = 0 }: MoveOptions = {},
): { doc: EditorDocument; guides: SnapGuide[]; delta: Vec } {
  let delta = sub(pointer, gesture.startPage);

  if (axisLock) {
    delta = Math.abs(delta.x) >= Math.abs(delta.y) ? { x: delta.x, y: 0 } : { x: 0, y: delta.y };
  }

  let guides: SnapGuide[] = [];
  if (snapTargets && snapTargets.length > 0 && snapThreshold > 0) {
    const moved: Box = {
      ...gesture.groupBox,
      x: gesture.groupBox.x + delta.x,
      y: gesture.groupBox.y + delta.y,
    };
    const snap = computeSnap(moved, snapTargets, snapThreshold);
    delta = { x: delta.x + snap.offset.x, y: delta.y + snap.offset.y };
    guides = snap.guides;
  }

  const ids = Object.keys(gesture.nodes);
  const next = mapNodes(doc, ids, (n) => {
    const f = frameOf(gesture.nodes[n.id]);
    return withFrame(n, { ...f, x: f.x + delta.x, y: f.y + delta.y });
  });

  return { doc: next, guides, delta };
}

export interface ResizeGesture {
  nodes: NodeMap;
  groupBox: Box;
  handle: HandleId;
  /** True for a multi-selection: children scale through the group's bounding box. */
  isGroup: boolean;
}

export interface ResizeOptions {
  /** Alt: grow about the centre. */
  fromCenter?: boolean;
  /** Shift: keep the starting aspect ratio. */
  lockAspect?: boolean;
  /**
   * Scale mode. When on, a single-node resize also scales font size, stroke and
   * radius — the difference between "make the box bigger" and "make it bigger".
   * A group resize always scales, because that is the only reading of it.
   */
  scaleMode?: boolean;
}

export function applyResizeGesture(
  doc: EditorDocument,
  gesture: ResizeGesture,
  pointer: Vec,
  { fromCenter = false, lockAspect = false, scaleMode = false }: ResizeOptions = {},
): { doc: EditorDocument; size: { width: number; height: number } } {
  const opts = { fromCenter, lockAspect, minSize: MIN_SIZE };
  const ids = Object.keys(gesture.nodes);

  if (!gesture.isGroup) {
    const startNode = gesture.nodes[ids[0]];
    const start = frameOf(startNode);
    const next = resizeFrame(start, gesture.handle, pointer, opts);
    // Geometric mean: the single factor reproducing the same area change as the
    // (sx, sy) pair, and the only defensible number to scale type by.
    const factor = Math.sqrt(
      (next.width / Math.max(start.width, 1e-6)) * (next.height / Math.max(start.height, 1e-6)),
    );
    return {
      doc: mapNodes(doc, ids, () =>
        withFrame(scaleMode ? scaleNodeProps(startNode, factor) : startNode, next),
      ),
      size: { width: next.width, height: next.height },
    };
  }

  const { anchor, sx, sy } = groupResizeTransform(gesture.groupBox, gesture.handle, pointer, opts);
  const factor = Math.sqrt(Math.abs(sx * sy));

  return {
    doc: mapNodes(doc, ids, (n) => {
      const startNode = gesture.nodes[n.id];
      return withFrame(
        scaleNodeProps(startNode, factor),
        applyGroupScale(frameOf(startNode), anchor, sx, sy, MIN_SIZE),
      );
    }),
    size: { width: gesture.groupBox.width * sx, height: gesture.groupBox.height * sy },
  };
}

export interface RotateGesture {
  nodes: NodeMap;
  /** Own centre for one node, group-box centre for several. */
  pivot: Vec;
  startPage: Vec;
}

export interface RotateOptions {
  /** Shift: snap to `snapDegrees`. */
  snap?: boolean;
  snapDegrees?: number;
}

export function applyRotateGesture(
  doc: EditorDocument,
  gesture: RotateGesture,
  pointer: Vec,
  { snap = false, snapDegrees = 15 }: RotateOptions = {},
): { doc: EditorDocument; angle: number } {
  const ids = Object.keys(gesture.nodes);

  if (ids.length === 1) {
    const next = rotateFrame(frameOf(gesture.nodes[ids[0]]), gesture.startPage, pointer, {
      snap,
      snapDegrees,
    });
    return { doc: mapNodes(doc, ids, (n) => withFrame(n, next)), angle: next.rotation };
  }

  let delta = rotationDelta(gesture.pivot, gesture.startPage, pointer);
  if (snap) delta = Math.round(delta / snapDegrees) * snapDegrees;

  return {
    doc: mapNodes(doc, ids, (n) =>
      withFrame(n, rotateFrameAbout(frameOf(gesture.nodes[n.id]), gesture.pivot, delta)),
    ),
    angle: delta,
  };
}

/** Drawing a new node: a box between the press point and the pointer. */
export function drawBox(origin: Vec, pointer: Vec, square = false): Box {
  let width = Math.abs(pointer.x - origin.x);
  let height = Math.abs(pointer.y - origin.y);
  if (square) width = height = Math.max(width, height);
  return {
    x: pointer.x < origin.x ? origin.x - width : origin.x,
    y: pointer.y < origin.y ? origin.y - height : origin.y,
    width,
    height,
  };
}
