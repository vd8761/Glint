/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Everything drawn *on top of* the page: selection chrome, resize handles,
 * rotate targets, snap guides, the marquee.
 *
 * It all lives inside the zoomed layer, in page coordinates, so nothing has to
 * be kept in sync with the camera. The catch is that the camera's `scale()` also
 * scales the chrome — so every screen-constant length here is divided by `zoom`,
 * and every stroke uses `vector-effect="non-scaling-stroke"`.
 */

import React from 'react';
import {
  ALL_HANDLES,
  CORNER_HANDLES,
  HANDLE_VECTORS,
  localToWorld,
  resizeCursor,
} from './geometry';
import type { Box, Frame, HandleId, SnapGuide, Vec } from './types';

/** Screen-space sizes, in CSS pixels, before the 1/zoom correction. */
const HANDLE_PX = 9;
const ROTATE_RADIUS_PX = 13;
const ROTATE_INSET_PX = 3;
/** Below this on-screen size, edge handles are more nuisance than help. */
const EDGE_HANDLE_MIN_PX = 44;

const ACCENT = '#0ea5e9';

const ROTATE_CURSOR =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28'><g fill='none' stroke='%23ffffff' stroke-width='4.5' stroke-linecap='round' stroke-linejoin='round'><path d='M8 12a7 7 0 1 1 1.2 6'/><path d='M4.5 7.5 8 12l4.5-3'/></g><g fill='none' stroke='%23111827' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M8 12a7 7 0 1 1 1.2 6'/><path d='M4.5 7.5 8 12l4.5-3'/></g></svg>\") 14 14, crosshair";

const handlePoint = (f: Frame, h: HandleId): Vec =>
  localToWorld(f, {
    x: (HANDLE_VECTORS[h].x * f.width) / 2,
    y: (HANDLE_VECTORS[h].y * f.height) / 2,
  });

/** A corner's rotate target sits just outside the corner, along the diagonal. */
const rotatePoint = (f: Frame, h: HandleId, pad: number): Vec =>
  localToWorld(f, {
    x: HANDLE_VECTORS[h].x * (f.width / 2 + pad),
    y: HANDLE_VECTORS[h].y * (f.height / 2 + pad),
  });

export const boxToFrame = (b: Box): Frame => ({ ...b, rotation: 0 });

export interface OverlayProps {
  zoom: number;
  /** Frame of a lone selected node, or the axis-aligned box of a multi-selection. */
  selection: Frame | null;
  /** True when `selection` is a group box: only corner handles apply. */
  isGroup: boolean;
  /** Faint outlines for each member of a multi-selection. */
  memberFrames: Frame[];
  /** Nodes under the pointer but not selected. */
  hoverFrame: Frame | null;
  guides: SnapGuide[];
  marquee: Box | null;
  /** Suppressed while a drag is in flight, so handles don't fight the cursor. */
  interactive: boolean;
  onHandlePointerDown: (handle: HandleId, event: React.PointerEvent) => void;
  onRotatePointerDown: (handle: HandleId, event: React.PointerEvent) => void;
}

export function Overlay({
  zoom,
  selection,
  isGroup,
  memberFrames,
  hoverFrame,
  guides,
  marquee,
  interactive,
  onHandlePointerDown,
  onRotatePointerDown,
}: OverlayProps) {
  const px = (n: number) => n / zoom;
  const handleSize = px(HANDLE_PX);
  const rotateRadius = px(ROTATE_RADIUS_PX);
  const rotatePad = px(ROTATE_RADIUS_PX - ROTATE_INSET_PX);

  const showEdgeHandles =
    !isGroup &&
    selection !== null &&
    selection.width * zoom > EDGE_HANDLE_MIN_PX &&
    selection.height * zoom > EDGE_HANDLE_MIN_PX;

  const handles: HandleId[] = !selection
    ? []
    : isGroup
      ? CORNER_HANDLES
      : showEdgeHandles
        ? ALL_HANDLES
        : CORNER_HANDLES;

  const outline = (f: Frame, key: string, opacity: number) => (
    <rect
      key={key}
      x={f.x}
      y={f.y}
      width={f.width}
      height={f.height}
      transform={`rotate(${f.rotation} ${f.x + f.width / 2} ${f.y + f.height / 2})`}
      fill="none"
      stroke={ACCENT}
      strokeOpacity={opacity}
      strokeWidth={1.5}
      vectorEffect="non-scaling-stroke"
    />
  );

  return (
    <svg
      // No viewBox and no size: user units are page units, and `overflow: visible`
      // lets chrome spill past the page edge, which it must, since nodes can.
      className="pointer-events-none absolute left-0 top-0 overflow-visible"
      width={1}
      height={1}
      style={{ overflow: 'visible' }}
      aria-hidden
    >
      {guides.map((g, i) =>
        g.axis === 'x' ? (
          <line
            key={`g${i}`}
            x1={g.position}
            y1={g.start}
            x2={g.position}
            y2={g.end}
            stroke="#f43f5e"
            strokeWidth={1}
            strokeDasharray="4 3"
            vectorEffect="non-scaling-stroke"
          />
        ) : (
          <line
            key={`g${i}`}
            x1={g.start}
            y1={g.position}
            x2={g.end}
            y2={g.position}
            stroke="#f43f5e"
            strokeWidth={1}
            strokeDasharray="4 3"
            vectorEffect="non-scaling-stroke"
          />
        ),
      )}

      {hoverFrame && outline(hoverFrame, 'hover', 0.55)}
      {isGroup && memberFrames.map((f, i) => outline(f, `m${i}`, 0.35))}
      {selection && outline(selection, 'sel', 1)}

      {selection && interactive && (
        <>
          {/* Rotate targets first: the resize handle that overlaps each corner
              wins the hit test, so rotation lives in the ring just outside it. */}
          {CORNER_HANDLES.map((h) => {
            const p = rotatePoint(selection, h, rotatePad);
            return (
              <circle
                key={`r-${h}`}
                data-rotate={h}
                cx={p.x}
                cy={p.y}
                r={rotateRadius}
                fill="transparent"
                className="pointer-events-auto"
                style={{ cursor: ROTATE_CURSOR }}
                onPointerDown={(e) => onRotatePointerDown(h, e)}
              />
            );
          })}

          {handles.map((h) => {
            const p = handlePoint(selection, h);
            const isCorner = HANDLE_VECTORS[h].x !== 0 && HANDLE_VECTORS[h].y !== 0;
            const w = isCorner ? handleSize : Math.min(handleSize, px(7));
            return (
              <rect
                key={`h-${h}`}
                data-handle={h}
                x={p.x - w / 2}
                y={p.y - w / 2}
                width={w}
                height={w}
                rx={px(1.5)}
                transform={`rotate(${selection.rotation} ${p.x} ${p.y})`}
                fill="#ffffff"
                stroke={ACCENT}
                strokeWidth={1.5}
                vectorEffect="non-scaling-stroke"
                className="pointer-events-auto"
                style={{ cursor: resizeCursor(h, selection.rotation) }}
                onPointerDown={(e) => onHandlePointerDown(h, e)}
              />
            );
          })}
        </>
      )}

      {marquee && (
        <rect
          x={marquee.x}
          y={marquee.y}
          width={marquee.width}
          height={marquee.height}
          fill={ACCENT}
          fillOpacity={0.08}
          stroke={ACCENT}
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      )}
    </svg>
  );
}

/**
 * The little pill under the selection showing live dimensions or angle.
 * A plain div rather than SVG text so it can use the app's type styles.
 */
export function MeasurementBadge({
  box,
  zoom,
  children,
}: {
  box: Box;
  zoom: number;
  children: React.ReactNode;
}) {
  return (
    <div
      className="pointer-events-none absolute"
      style={{
        left: box.x + box.width / 2,
        top: box.y + box.height,
        width: 0,
        height: 0,
        transform: `scale(${1 / zoom})`,
        transformOrigin: '0 0',
      }}
    >
      <div className="absolute left-0 top-3 -translate-x-1/2 whitespace-nowrap rounded bg-sky-500 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-white shadow">
        {children}
      </div>
    </div>
  );
}
