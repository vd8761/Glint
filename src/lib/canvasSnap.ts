/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Alignment snapping for the certificate canvas editor.
 *
 * Pure geometry, no DOM and no React, so it can be reasoned about and unit
 * tested in isolation. Everything is in *percent of the canvas* (0–100), which
 * is how the editor stores element positions. Every element is centred on its
 * (x, y) via `translate(-50%, -50%)`, so an element's centre IS its stored
 * position and its box is `[cx ± hw, cy ± hh]`.
 *
 * The moving element snaps when one of its anchors — left edge, centre, or
 * right edge on the X axis; top, middle, or bottom on the Y axis — comes within
 * a threshold of a candidate line. Candidate lines are the canvas centre, the
 * canvas edges, and every other element's edges and centre. This is the
 * center-to-center / center-to-edge / edge-to-edge behaviour of Figma, Canva,
 * and Keynote.
 */

/** A measured element box, in percent of the canvas. */
export interface Box {
  id: string;
  cx: number;
  cy: number;
  /** Half width, percent. */
  hw: number;
  /** Half height, percent. */
  hh: number;
}

/** The moving element: a candidate centre plus its half-extents. */
export interface MovingBox {
  x: number;
  y: number;
  hw: number;
  hh: number;
}

/**
 * A guide line to draw.
 *
 * For a vertical guide (`axis: 'x'`) `pos` is the x coordinate and
 * `start`/`end` are the y range it spans. For a horizontal guide it is the
 * mirror. All values are percent of the canvas.
 */
export interface Guide {
  axis: 'x' | 'y';
  pos: number;
  start: number;
  end: number;
}

export interface SnapResult {
  x: number;
  y: number;
  guideX: Guide | null;
  guideY: Guide | null;
  /** True when x snapped this call. Used to decide whether to fire haptics. */
  snappedX: boolean;
  snappedY: boolean;
}

export interface SnapOptions {
  /** Include canvas edges and centre as snap candidates. */
  includeCanvas?: boolean;
  /** Which canvas guide lines are eligible when `includeCanvas` is true. */
  canvasLines?: 'center' | 'all';
  /** Which anchors of the moving element are eligible for snapping. */
  movingAnchors?: 'center' | 'all';
}

interface Candidate {
  /** The line position on the snapping axis. */
  line: number;
  /** The extent of the matched element on the other axis, to size the guide. */
  from: number;
  to: number;
}

/** Snap one axis. Returns the adjusted centre and the guide, or null. */
function snapAxis(
  /** The moving element's three anchors on this axis: [min edge, centre, max edge]. */
  anchors: [number, number, number],
  /** How far the moving element extends on the *other* axis, for guide length. */
  movingFrom: number,
  movingTo: number,
  candidates: Candidate[],
  threshold: number,
): { delta: number; guide: Guide | null } {
  let best: { dist: number; delta: number; cand: Candidate } | null = null;

  for (const anchor of anchors) {
    for (const cand of candidates) {
      const dist = Math.abs(anchor - cand.line);
      if (dist <= threshold && (best === null || dist < best.dist)) {
        best = { dist, delta: cand.line - anchor, cand };
      }
    }
  }

  if (best === null) return { delta: 0, guide: null };

  // The guide spans the union of the moving element and the matched target, so
  // the user sees the line connect the two things that lined up.
  return {
    delta: best.delta,
    guide: {
      axis: 'x', // overwritten by caller
      pos: best.cand.line,
      start: Math.min(movingFrom, best.cand.from),
      end: Math.max(movingTo, best.cand.to),
    },
  };
}

/**
 * Compute the snapped position and the guides to draw.
 *
 * `tx` / `ty` are the thresholds in percent for each axis. They differ because
 * a certificate canvas is wider than it is tall, so a given pixel tolerance is
 * a different percentage horizontally than vertically — the caller converts a
 * single pixel tolerance into the two values.
 */
export function computeSnap(
  moving: MovingBox,
  others: Box[],
  tx: number,
  ty: number,
  { includeCanvas = true, canvasLines = 'all', movingAnchors = 'all' }: SnapOptions = {},
): SnapResult {
  const movLeft = moving.x - moving.hw;
  const movRight = moving.x + moving.hw;
  const movTop = moving.y - moving.hh;
  const movBottom = moving.y + moving.hh;
  const xAnchors: [number, number, number] =
    movingAnchors === 'center' ? [moving.x, moving.x, moving.x] : [movLeft, moving.x, movRight];
  const yAnchors: [number, number, number] =
    movingAnchors === 'center' ? [moving.y, moving.y, moving.y] : [movTop, moving.y, movBottom];

  // ---- X axis (vertical guide lines) ----
  const xCandidates: Candidate[] = includeCanvas
    ? canvasLines === 'center'
      ? [{ line: 50, from: 0, to: 100 }] // canvas centre
      : [
          { line: 50, from: 0, to: 100 }, // canvas centre
          { line: 0, from: 0, to: 100 }, // canvas left
          { line: 100, from: 0, to: 100 }, // canvas right
        ]
    : [];
  for (const o of others) {
    const from = Math.min(o.cy - o.hh, movTop);
    const to = Math.max(o.cy + o.hh, movBottom);
    xCandidates.push({ line: o.cx, from, to });
    xCandidates.push({ line: o.cx - o.hw, from, to });
    xCandidates.push({ line: o.cx + o.hw, from, to });
  }
  const xResult = snapAxis(xAnchors, movTop, movBottom, xCandidates, tx);

  // ---- Y axis (horizontal guide lines) ----
  const yCandidates: Candidate[] = includeCanvas
    ? canvasLines === 'center'
      ? [{ line: 50, from: 0, to: 100 }]
      : [
          { line: 50, from: 0, to: 100 },
          { line: 0, from: 0, to: 100 },
          { line: 100, from: 0, to: 100 },
        ]
    : [];
  for (const o of others) {
    const from = Math.min(o.cx - o.hw, movLeft);
    const to = Math.max(o.cx + o.hw, movRight);
    yCandidates.push({ line: o.cy, from, to });
    yCandidates.push({ line: o.cy - o.hh, from, to });
    yCandidates.push({ line: o.cy + o.hh, from, to });
  }
  const yResult = snapAxis(yAnchors, movLeft, movRight, yCandidates, ty);

  const guideX = xResult.guide ? { ...xResult.guide, axis: 'x' as const } : null;
  const guideY = yResult.guide ? { ...yResult.guide, axis: 'y' as const } : null;

  return {
    x: moving.x + xResult.delta,
    y: moving.y + yResult.delta,
    guideX,
    guideY,
    snappedX: guideX !== null,
    snappedY: guideY !== null,
  };
}
