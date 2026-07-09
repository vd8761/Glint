/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The playground: an infinite pannable plane holding exactly one page.
 *
 * This file is deliberately thin. It owns pointer plumbing — capture, hit
 * testing, which gesture a press begins — and delegates every document change to
 * the pure functions in `gestures.ts`. Each gesture snapshots the nodes it
 * grabbed on `pointerdown`, transiently rewrites the document on every
 * `pointermove`, and records exactly one undo step on `pointerup`.
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { aabb, boxesIntersect, centerOf, clamp, hitTest } from './geometry';
import { DEFAULT_SIZE, createNode, frameOf, mapNodes, withFrame } from './document';
import {
  applyMoveGesture,
  applyResizeGesture,
  applyRotateGesture,
  drawBox,
  groupBoxOf,
  type NodeMap,
} from './gestures';
import { MeasurementBadge, Overlay, boxToFrame } from './Overlay';
import { NodeView } from './NodeView';
import { pageSnapTarget, type SnapTarget } from './snapping';
import type { History } from './useHistory';
import type { ViewportController } from './useViewport';
import type { Box, EditorDocument, EditorNode, Frame, HandleId, NodeKind, SnapGuide, Vec } from './types';

export type Tool = 'select' | 'hand' | 'text' | 'rect' | 'ellipse' | 'image';

const DRAW_TOOLS: Tool[] = ['text', 'rect', 'ellipse', 'image'];
/** Snap magnet radius in screen pixels; divided by zoom to reach page units. */
const SNAP_PX = 6;
/** Below this drag distance, a draw gesture counts as a click. */
const CLICK_SLOP = 4;

type Drag =
  | { kind: 'pan'; lastClient: Vec }
  | { kind: 'marquee'; origin: Vec; base: string[] }
  | { kind: 'move'; startPage: Vec; nodes: NodeMap; groupBox: Box; snapshot: EditorDocument; changed: boolean }
  | {
      kind: 'resize';
      handle: HandleId;
      nodes: NodeMap;
      groupBox: Box;
      isGroup: boolean;
      snapshot: EditorDocument;
      changed: boolean;
    }
  | { kind: 'rotate'; startPage: Vec; pivot: Vec; nodes: NodeMap; snapshot: EditorDocument; changed: boolean }
  | { kind: 'draw'; id: string; origin: Vec; snapshot: EditorDocument };

export interface CanvasStageProps {
  history: History<EditorDocument>;
  vp: ViewportController;
  selection: string[];
  setSelection: (ids: string[]) => void;
  tool: Tool;
  setTool: (tool: Tool) => void;
  /** When on, resizing also scales font size, stroke width and corner radius. */
  scaleMode: boolean;
  snapEnabled: boolean;
  editingId: string | null;
  setEditingId: (id: string | null) => void;
  /** Space held: temporarily behave like the hand tool. */
  spaceDown: boolean;
}

export function CanvasStage({
  history,
  vp,
  selection,
  setSelection,
  tool,
  setTool,
  scaleMode,
  snapEnabled,
  editingId,
  setEditingId,
  spaceDown,
}: CanvasStageProps) {
  const doc = history.present;
  const { viewport, containerRef, clientToPage } = vp;

  const dragRef = useRef<Drag | null>(null);
  /** Last press on a node, for detecting a double-press without `dblclick`. */
  const lastPressRef = useRef<{ id: string; at: number }>({ id: '', at: -Infinity });
  const [guides, setGuides] = useState<SnapGuide[]>([]);
  const [marquee, setMarquee] = useState<Box | null>(null);
  const [badge, setBadge] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);

  const nodeById = useMemo(() => {
    const map: Record<string, EditorNode> = {};
    for (const n of doc.nodes) map[n.id] = n;
    return map;
  }, [doc.nodes]);

  const selectedNodes = useMemo(
    () => selection.map((id) => nodeById[id]).filter(Boolean),
    [selection, nodeById],
  );

  const selectionBox = useMemo(() => {
    if (selectedNodes.length === 0) return null;
    return groupBoxOf(Object.fromEntries(selectedNodes.map((n) => [n.id, n])));
  }, [selectedNodes]);

  const isGroup = selectedNodes.length > 1;
  const selectionFrame: Frame | null = !selectionBox
    ? null
    : isGroup
      ? boxToFrame(selectionBox)
      : frameOf(selectedNodes[0]);

  const panning = tool === 'hand' || spaceDown;

  const captureNodes = useCallback(
    (ids: string[]): NodeMap => {
      const nodes: NodeMap = {};
      for (const id of ids) if (nodeById[id]) nodes[id] = nodeById[id];
      return nodes;
    },
    [nodeById],
  );

  const snapTargetsFor = useCallback(
    (movingIds: Set<string>): SnapTarget[] => {
      const targets: SnapTarget[] = [pageSnapTarget(doc.page.width, doc.page.height)];
      for (const n of doc.nodes) {
        if (movingIds.has(n.id) || n.hidden) continue;
        targets.push({ box: aabb(frameOf(n)) });
      }
      return targets;
    },
    [doc],
  );

  const endDrag = useCallback(() => {
    const drag = dragRef.current;
    dragRef.current = null;
    setGuides([]);
    setMarquee(null);
    setBadge(null);
    return drag;
  }, []);

  // ---------------------------------------------------------- gesture starts

  // Leaving edit mode is driven entirely by the editor's own `blur`. Clearing
  // `editingId` from a pointerdown handler would unmount the contentEditable
  // before the browser gets to move focus off it, so `blur` would never fire and
  // the edit would be silently discarded. Pressing anywhere else moves focus,
  // which commits — no explicit teardown needed here.
  const onStagePointerDown = (event: React.PointerEvent) => {
    if (event.button === 2) return;
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);

    // Middle mouse, the hand tool, or a held space bar: pan, whatever the pointer
    // happens to be over.
    if (panning || event.button === 1) {
      dragRef.current = { kind: 'pan', lastClient: { x: event.clientX, y: event.clientY } };
      return;
    }

    const page = clientToPage(event);

    if (DRAW_TOOLS.includes(tool)) {
      const snapshot = history.peek();
      const node = createNode(tool as NodeKind, { x: page.x, y: page.y, width: 0, height: 0 });
      history.update((d) => ({ ...d, nodes: [...d.nodes, node] }));
      setSelection([node.id]);
      dragRef.current = { kind: 'draw', id: node.id, origin: page, snapshot };
      return;
    }

    const base = event.shiftKey ? selection : [];
    if (!event.shiftKey) setSelection([]);
    dragRef.current = { kind: 'marquee', origin: page, base };
    setMarquee({ x: page.x, y: page.y, width: 0, height: 0 });
  };

  const onNodePointerDown = (id: string, event: React.PointerEvent) => {
    // Let the stage handle it: panning outranks selection.
    if (panning || event.button === 1 || event.button === 2) return;
    if (editingId === id) return;

    event.stopPropagation();

    // Double-press on a text node opens it for editing. Detected here, from the
    // press sequence, rather than with a `dblclick` listener: the pointer capture
    // taken below retargets the browser's synthesised click to the stage, so a
    // `dblclick` on the node would never arrive. Timing beats `event.detail`
    // because `detail` is always 0 for touch.
    const now = event.timeStamp;
    const doublePress = lastPressRef.current.id === id && now - lastPressRef.current.at < 350;
    lastPressRef.current = { id, at: now };

    if (doublePress && nodeById[id]?.kind === 'text') {
      setSelection([id]);
      setEditingId(id);
      return;
    }

    containerRef.current?.setPointerCapture(event.pointerId);

    const next = event.shiftKey
      ? selection.includes(id)
        ? selection.filter((s) => s !== id)
        : [...selection, id]
      : selection.includes(id)
        ? selection
        : [id];

    setSelection(next);
    if (next.length === 0) return;

    const nodes = captureNodes(next);
    dragRef.current = {
      kind: 'move',
      startPage: clientToPage(event),
      nodes,
      groupBox: groupBoxOf(nodes),
      snapshot: history.peek(),
      changed: false,
    };
  };

  const onHandlePointerDown = (handle: HandleId, event: React.PointerEvent) => {
    event.stopPropagation();
    containerRef.current?.setPointerCapture(event.pointerId);
    const nodes = captureNodes(selection);
    if (Object.keys(nodes).length === 0) return;
    dragRef.current = {
      kind: 'resize',
      handle,
      nodes,
      groupBox: groupBoxOf(nodes),
      isGroup: selection.length > 1,
      snapshot: history.peek(),
      changed: false,
    };
  };

  const onRotatePointerDown = (_handle: HandleId, event: React.PointerEvent) => {
    event.stopPropagation();
    containerRef.current?.setPointerCapture(event.pointerId);
    const nodes = captureNodes(selection);
    const ids = Object.keys(nodes);
    if (ids.length === 0) return;
    dragRef.current = {
      kind: 'rotate',
      startPage: clientToPage(event),
      // A lone node spins about its own centre; a group spins about the centre of
      // its bounding box.
      pivot: ids.length === 1 ? centerOf(frameOf(nodes[ids[0]])) : centerOf(groupBoxOf(nodes)),
      nodes,
      snapshot: history.peek(),
      changed: false,
    };
  };

  // ---------------------------------------------------------------- tracking

  const onPointerMove = (event: React.PointerEvent) => {
    const drag = dragRef.current;

    if (!drag) {
      if (tool !== 'select' || panning) {
        if (hoverId) setHoverId(null);
        return;
      }
      const page = clientToPage(event);
      // Top-down hit test: the node you see on top is the one you get.
      const hit = [...doc.nodes]
        .reverse()
        .find((n) => !n.locked && !n.hidden && hitTest(frameOf(n), page));
      const next = hit && !selection.includes(hit.id) ? hit.id : null;
      if (next !== hoverId) setHoverId(next);
      return;
    }

    if (drag.kind === 'pan') {
      vp.panBy(event.clientX - drag.lastClient.x, event.clientY - drag.lastClient.y);
      drag.lastClient = { x: event.clientX, y: event.clientY };
      return;
    }

    const page = clientToPage(event);

    switch (drag.kind) {
      case 'marquee': {
        const box = drawBox(drag.origin, page);
        setMarquee(box);
        const hits = doc.nodes
          .filter((n) => !n.locked && !n.hidden && boxesIntersect(aabb(frameOf(n)), box))
          .map((n) => n.id);
        setSelection([...new Set([...drag.base, ...hits])]);
        break;
      }

      // Each gesture reads the live document through `peek()` and hands back a
      // finished one. `update` then takes it verbatim, so the updater stays pure —
      // React is free to double-invoke it, and the result never depends on how
      // many pointermove events React chose to batch together.
      case 'move': {
        const useSnap = snapEnabled && !event.altKey;
        const { doc: next, guides: g, delta } = applyMoveGesture(history.peek(), drag, page, {
          axisLock: event.shiftKey,
          snapTargets: useSnap ? snapTargetsFor(new Set(Object.keys(drag.nodes))) : undefined,
          snapThreshold: SNAP_PX / viewport.zoom,
        });
        if (delta.x !== 0 || delta.y !== 0) drag.changed = true;
        setGuides(g);
        history.update(() => next);
        break;
      }

      case 'resize': {
        drag.changed = true;
        const { doc: next, size } = applyResizeGesture(history.peek(), drag, page, {
          fromCenter: event.altKey,
          lockAspect: event.shiftKey,
          // A group resize always scales its children's type and strokes: that is
          // the only reading of "make this whole block bigger".
          scaleMode: scaleMode || drag.isGroup,
        });
        setBadge(`${Math.round(size.width)} × ${Math.round(size.height)}`);
        history.update(() => next);
        break;
      }

      case 'rotate': {
        drag.changed = true;
        const { doc: next, angle } = applyRotateGesture(history.peek(), drag, page, {
          snap: event.shiftKey,
        });
        setBadge(`${Math.round(angle)}°`);
        history.update(() => next);
        break;
      }

      case 'draw': {
        const box = drawBox(drag.origin, page, event.shiftKey);
        history.update((d) => mapNodes(d, [drag.id], (n) => withFrame(n, { ...box, rotation: 0 })));
        setBadge(`${Math.round(box.width)} × ${Math.round(box.height)}`);
        break;
      }
    }
  };

  const onPointerUp = (event: React.PointerEvent) => {
    const drag = endDrag();
    if (!drag) return;
    (event.currentTarget as HTMLElement).releasePointerCapture?.(event.pointerId);

    if (drag.kind === 'draw') {
      const page = clientToPage(event);
      const tiny =
        Math.abs(page.x - drag.origin.x) < CLICK_SLOP && Math.abs(page.y - drag.origin.y) < CLICK_SLOP;

      history.update((d) =>
        mapNodes(d, [drag.id], (n) => {
          if (!tiny) return n;
          // A click, not a drag: drop the node at its default size, centred on the
          // click, the way every other editor does.
          const size = DEFAULT_SIZE[n.kind];
          return withFrame(n, {
            x: drag.origin.x - size.width / 2,
            y: drag.origin.y - size.height / 2,
            ...size,
            rotation: 0,
          });
        }),
      );
      history.pushSnapshot(drag.snapshot);
      setTool('select');
      return;
    }

    if ((drag.kind === 'move' || drag.kind === 'resize' || drag.kind === 'rotate') && drag.changed) {
      history.pushSnapshot(drag.snapshot);
    }
  };

  // ------------------------------------------------------------------ render

  const cursor =
    dragRef.current?.kind === 'pan'
      ? 'grabbing'
      : panning
        ? 'grab'
        : DRAW_TOOLS.includes(tool)
          ? 'crosshair'
          : 'default';

  const hoverNode = hoverId ? nodeById[hoverId] : null;

  return (
    <div
      ref={containerRef}
      data-testid="canvas-stage"
      className="relative flex-1 select-none overflow-hidden bg-slate-100 dark:bg-slate-900"
      style={{ cursor, touchAction: 'none' }}
      onPointerDown={onStagePointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Dot grid. Painted on the static container and offset by the camera, so it
          costs nothing to pan across and never blurs when zoomed. */}
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          backgroundImage: 'radial-gradient(circle, rgb(148 163 184 / 0.55) 1px, transparent 1px)',
          backgroundSize: `${24 * viewport.zoom}px ${24 * viewport.zoom}px`,
          backgroundPosition: `${viewport.x}px ${viewport.y}px`,
        }}
      />

      <div
        data-testid="canvas-transform"
        className="absolute left-0 top-0 origin-top-left"
        style={{
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
          willChange: 'transform',
        }}
      >
        <div
          data-testid="canvas-page"
          className="absolute left-0 top-0"
          style={{
            width: doc.page.width,
            height: doc.page.height,
            background: doc.page.background,
            // Counter-scaled so the drop shadow stays a constant size on screen
            // instead of ballooning as you zoom in.
            boxShadow: `0 ${10 / viewport.zoom}px ${40 / viewport.zoom}px rgb(15 23 42 / 0.18)`,
          }}
        />

        {doc.nodes.map((node) => (
          <NodeView
            key={node.id}
            node={node}
            editing={editingId === node.id}
            onPointerDown={onNodePointerDown}
            onCommitText={(id, text) => {
              setEditingId(null);
              history.commit((d) =>
                mapNodes(d, [id], (n) => (n.kind === 'text' && n.text !== text ? { ...n, text } : n)),
              );
            }}
            onCancelEdit={() => setEditingId(null)}
          />
        ))}

        <Overlay
          zoom={viewport.zoom}
          selection={selectionFrame}
          isGroup={isGroup}
          memberFrames={isGroup ? selectedNodes.map(frameOf) : []}
          hoverFrame={hoverNode ? frameOf(hoverNode) : null}
          guides={guides}
          marquee={marquee}
          interactive={editingId === null}
          onHandlePointerDown={onHandlePointerDown}
          onRotatePointerDown={onRotatePointerDown}
        />

        {badge && selectionBox && (
          <MeasurementBadge box={selectionBox} zoom={viewport.zoom}>
            {badge}
          </MeasurementBadge>
        )}
      </div>

      <ZoomIndicator zoom={viewport.zoom} />
    </div>
  );
}

function ZoomIndicator({ zoom }: { zoom: number }) {
  return (
    <div
      data-testid="zoom-indicator"
      data-zoom={zoom.toFixed(4)}
      className="pointer-events-none absolute bottom-3 left-3 rounded-md bg-white/90 px-2 py-1 text-xs font-medium tabular-nums text-slate-600 shadow-sm ring-1 ring-slate-900/5 backdrop-blur dark:bg-slate-800/90 dark:text-slate-300"
    >
      {Math.round(clamp(zoom, 0, 9999) * 100)}%
    </div>
  );
}
