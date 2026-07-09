/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * All the trigonometry the editor needs, as pure functions.
 *
 * Two coordinate spaces show up constantly:
 *
 *   world  — page coordinates. Origin at the page's top-left, y grows downward.
 *   local  — a node's own frame. Origin at the node's *center*, axes rotated
 *            with the node, y still grows downward.
 *
 * `worldToLocal` / `localToWorld` are the only things that cross between them,
 * and every rotation-aware operation below is written as: convert to local, do
 * the easy axis-aligned thing, convert back.
 */

import type { Box, Frame, HandleId, Vec } from './types';

export const add = (a: Vec, b: Vec): Vec => ({ x: a.x + b.x, y: a.y + b.y });
export const sub = (a: Vec, b: Vec): Vec => ({ x: a.x - b.x, y: a.y - b.y });
export const scale = (a: Vec, k: number): Vec => ({ x: a.x * k, y: a.y * k });

export const toRad = (deg: number): number => (deg * Math.PI) / 180;
export const toDeg = (rad: number): number => (rad * 180) / Math.PI;

export const clamp = (v: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, v));

/** Fold any angle into [0, 360). */
export const normalizeAngle = (deg: number): number => ((deg % 360) + 360) % 360;

/** Rotate `v` about the origin by `deg` degrees clockwise (y-down screen convention). */
export function rotate(v: Vec, deg: number): Vec {
  if (deg === 0) return { x: v.x, y: v.y };
  const r = toRad(deg);
  const c = Math.cos(r);
  const s = Math.sin(r);
  return { x: v.x * c - v.y * s, y: v.x * s + v.y * c };
}

export const centerOf = (b: Box): Vec => ({
  x: b.x + b.width / 2,
  y: b.y + b.height / 2,
});

/** World point for a point expressed in the frame's local (center-origin) space. */
export const localToWorld = (f: Frame, local: Vec): Vec =>
  add(centerOf(f), rotate(local, f.rotation));

/** Local (center-origin) point for a world point. */
export const worldToLocal = (f: Frame, world: Vec): Vec =>
  rotate(sub(world, centerOf(f)), -f.rotation);

/** The frame's four corners in world space, clockwise from top-left. */
export function corners(f: Frame): [Vec, Vec, Vec, Vec] {
  const hw = f.width / 2;
  const hh = f.height / 2;
  return [
    localToWorld(f, { x: -hw, y: -hh }),
    localToWorld(f, { x: hw, y: -hh }),
    localToWorld(f, { x: hw, y: hh }),
    localToWorld(f, { x: -hw, y: hh }),
  ];
}

/** Axis-aligned bounding box of a (possibly rotated) frame, in world space. */
export function aabb(f: Frame): Box {
  const pts = corners(f);
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  return { x: minX, y: minY, width: Math.max(...xs) - minX, height: Math.max(...ys) - minY };
}

/** Union of several frames' bounding boxes. Returns null for an empty list. */
export function unionAabb(frames: Frame[]): Box | null {
  if (frames.length === 0) return null;
  const boxes = frames.map(aabb);
  const minX = Math.min(...boxes.map((b) => b.x));
  const minY = Math.min(...boxes.map((b) => b.y));
  const maxX = Math.max(...boxes.map((b) => b.x + b.width));
  const maxY = Math.max(...boxes.map((b) => b.y + b.height));
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/** Is `world` inside the rotated frame? Cheap: unrotate the point, compare to the box. */
export function hitTest(f: Frame, world: Vec): boolean {
  const l = worldToLocal(f, world);
  return Math.abs(l.x) <= f.width / 2 && Math.abs(l.y) <= f.height / 2;
}

/** Do two axis-aligned boxes overlap at all? Used by marquee selection. */
export function boxesIntersect(a: Box, b: Box): boolean {
  return (
    a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y
  );
}

/**
 * Unit offset of each handle in local space: `nw` sits at (-1, -1) × half-size,
 * `e` at (+1, 0) × half-size, and so on. A zero component means "this handle
 * does not move that axis".
 */
export const HANDLE_VECTORS: Record<HandleId, Vec> = {
  nw: { x: -1, y: -1 },
  n: { x: 0, y: -1 },
  ne: { x: 1, y: -1 },
  e: { x: 1, y: 0 },
  se: { x: 1, y: 1 },
  s: { x: 0, y: 1 },
  sw: { x: -1, y: 1 },
  w: { x: -1, y: 0 },
};

export const CORNER_HANDLES: HandleId[] = ['nw', 'ne', 'se', 'sw'];
export const ALL_HANDLES: HandleId[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

export interface ResizeOptions {
  /** Alt/Option: grow symmetrically about the center instead of pinning the opposite corner. */
  fromCenter?: boolean;
  /** Shift: preserve the starting aspect ratio. */
  lockAspect?: boolean;
  minSize?: number;
}

/**
 * Resize `start` by dragging `handle` to the world-space point `pointer`.
 *
 * The invariant that makes rotation work: the handle *opposite* the one you
 * grabbed stays nailed to its world position. So we compute that anchor once
 * from the starting frame, express the pointer in the frame's local axes
 * relative to it, read the new width/height straight off those local axes, then
 * solve for the center that puts the anchor back where it was.
 *
 * Dragging a handle past its anchor clamps at `minSize` rather than flipping the
 * node — flipping a certificate's signature block is never what anyone meant.
 */
export function resizeFrame(
  start: Frame,
  handle: HandleId,
  pointer: Vec,
  { fromCenter = false, lockAspect = false, minSize = 1 }: ResizeOptions = {},
): Frame {
  const h = HANDLE_VECTORS[handle];
  const c0 = centerOf(start);

  let width = start.width;
  let height = start.height;

  if (fromCenter) {
    // The center is the anchor; the pointer sits at half the new extent.
    const local = rotate(sub(pointer, c0), -start.rotation);
    if (h.x !== 0) width = Math.abs(local.x) * 2;
    if (h.y !== 0) height = Math.abs(local.y) * 2;
  } else {
    // The opposite handle is the anchor, fixed in world space for the whole drag.
    const anchorLocal = { x: (-h.x * start.width) / 2, y: (-h.y * start.height) / 2 };
    const anchorWorld = localToWorld(start, anchorLocal);
    const local = rotate(sub(pointer, anchorWorld), -start.rotation);
    // For an edge handle the corresponding component of `h` is 0, so that
    // dimension is left alone. For the others `h` is ±1, and multiplying by it
    // turns the signed local offset into a positive extent.
    if (h.x !== 0) width = h.x * local.x;
    if (h.y !== 0) height = h.y * local.y;
  }

  width = Math.max(minSize, width);
  height = Math.max(minSize, height);

  if (lockAspect && start.width > 0 && start.height > 0) {
    // Grow along whichever axis the pointer pulled harder. Edge handles only
    // drive one axis, so this just mirrors that axis onto the other.
    const s = Math.max(width / start.width, height / start.height);
    width = start.width * s;
    height = start.height * s;
  }

  const center = fromCenter
    ? c0
    : (() => {
        const anchorLocal = { x: (-h.x * start.width) / 2, y: (-h.y * start.height) / 2 };
        const anchorWorld = localToWorld(start, anchorLocal);
        // Where the anchor sits relative to the *new* center, in local axes.
        const anchorLocalNew = { x: (-h.x * width) / 2, y: (-h.y * height) / 2 };
        return sub(anchorWorld, rotate(anchorLocalNew, start.rotation));
      })();

  return {
    x: center.x - width / 2,
    y: center.y - height / 2,
    width,
    height,
    rotation: start.rotation,
  };
}

export interface RotateOptions {
  /** Shift: snap to multiples of `snapDegrees`. */
  snap?: boolean;
  snapDegrees?: number;
}

/**
 * Rotation delta from swinging the pointer around `pivot`.
 *
 * Returned as a delta rather than an absolute angle so the caller can apply it
 * to every node in a multi-selection about a shared pivot.
 */
export function rotationDelta(
  pivot: Vec,
  startPointer: Vec,
  pointer: Vec,
): number {
  const a0 = Math.atan2(startPointer.y - pivot.y, startPointer.x - pivot.x);
  const a1 = Math.atan2(pointer.y - pivot.y, pointer.x - pivot.x);
  return toDeg(a1 - a0);
}

/** Rotate a single frame about its own center to follow the pointer. */
export function rotateFrame(
  start: Frame,
  startPointer: Vec,
  pointer: Vec,
  { snap = false, snapDegrees = 15 }: RotateOptions = {},
): Frame {
  const pivot = centerOf(start);
  let rotation = start.rotation + rotationDelta(pivot, startPointer, pointer);
  if (snap) rotation = Math.round(rotation / snapDegrees) * snapDegrees;
  return { ...start, rotation: normalizeAngle(rotation) };
}

/** Rotate a frame about an arbitrary pivot — its center orbits, its angle spins. */
export function rotateFrameAbout(start: Frame, pivot: Vec, deltaDeg: number): Frame {
  const c = rotate(sub(centerOf(start), pivot), deltaDeg);
  const center = add(pivot, c);
  return {
    x: center.x - start.width / 2,
    y: center.y - start.height / 2,
    width: start.width,
    height: start.height,
    rotation: normalizeAngle(start.rotation + deltaDeg),
  };
}

/**
 * The scale factors and anchor for resizing a whole selection by its bounding box.
 *
 * The group box is always axis-aligned, so this is the unrotated case of
 * `resizeFrame`. Children are then mapped through the same affine scale, which
 * keeps rotated children rotated and correctly repositioned.
 */
export function groupResizeTransform(
  startBox: Box,
  handle: HandleId,
  pointer: Vec,
  opts: ResizeOptions = {},
): { anchor: Vec; sx: number; sy: number } {
  const startFrame: Frame = { ...startBox, rotation: 0 };
  const next = resizeFrame(startFrame, handle, pointer, opts);
  const h = HANDLE_VECTORS[handle];

  const anchor: Vec = opts.fromCenter
    ? centerOf(startBox)
    : {
        x: startBox.x + ((1 - h.x) / 2) * startBox.width,
        y: startBox.y + ((1 - h.y) / 2) * startBox.height,
      };

  return {
    anchor,
    sx: startBox.width === 0 ? 1 : next.width / startBox.width,
    sy: startBox.height === 0 ? 1 : next.height / startBox.height,
  };
}

/** Apply a group scale to one child frame. Rotation is preserved. */
export function applyGroupScale(
  frame: Frame,
  anchor: Vec,
  sx: number,
  sy: number,
  minSize = 1,
): Frame {
  const width = Math.max(minSize, frame.width * sx);
  const height = Math.max(minSize, frame.height * sy);
  const c = centerOf(frame);
  const center = {
    x: anchor.x + (c.x - anchor.x) * sx,
    y: anchor.y + (c.y - anchor.y) * sy,
  };
  return {
    x: center.x - width / 2,
    y: center.y - height / 2,
    width,
    height,
    rotation: frame.rotation,
  };
}

/**
 * Which of the eight resize cursors to show, accounting for the node's rotation.
 * A 90°-rotated node's `e` handle points south, so it wants `ns-resize`.
 */
const CURSOR_RING = [
  'ew-resize',
  'nwse-resize',
  'ns-resize',
  'nesw-resize',
  'ew-resize',
  'nwse-resize',
  'ns-resize',
  'nesw-resize',
];

const HANDLE_BASE_ANGLE: Record<HandleId, number> = {
  e: 0,
  se: 45,
  s: 90,
  sw: 135,
  w: 180,
  nw: 225,
  n: 270,
  ne: 315,
};

export function resizeCursor(handle: HandleId, rotation: number): string {
  const angle = normalizeAngle(HANDLE_BASE_ANGLE[handle] + rotation);
  return CURSOR_RING[Math.round(angle / 45) % 8];
}
