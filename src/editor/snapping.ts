/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Alignment snapping: while you drag, nudge the selection so its edges and
 * centers line up with the page and with the shapes you aren't dragging.
 *
 * Everything here works on axis-aligned boxes. A rotated node contributes its
 * bounding box, which is what you actually want to align against visually.
 */

import type { Box, SnapGuide, Vec } from './types';

export interface SnapTarget {
  box: Box;
  /** Page edges get their own flag so callers can style that guide differently. */
  isPage?: boolean;
}

export interface SnapResult {
  /** Correction to add to the drag delta, in page units. */
  offset: Vec;
  guides: SnapGuide[];
}

const EMPTY: SnapResult = { offset: { x: 0, y: 0 }, guides: [] };

/** The three interesting x (or y) coordinates of a box: near edge, center, far edge. */
const linesX = (b: Box): number[] => [b.x, b.x + b.width / 2, b.x + b.width];
const linesY = (b: Box): number[] => [b.y, b.y + b.height / 2, b.y + b.height];

interface AxisMatch {
  delta: number;
  position: number;
  targetBox: Box;
}

/** Best single-axis match: the smallest correction that lands within `threshold`. */
function bestMatch(
  movingLines: number[],
  targets: SnapTarget[],
  lines: (b: Box) => number[],
  threshold: number,
): AxisMatch | null {
  let best: AxisMatch | null = null;
  for (const target of targets) {
    for (const t of lines(target.box)) {
      for (const m of movingLines) {
        const delta = t - m;
        if (Math.abs(delta) > threshold) continue;
        if (best === null || Math.abs(delta) < Math.abs(best.delta)) {
          best = { delta, position: t, targetBox: target.box };
        }
      }
    }
  }
  return best;
}

/**
 * Snap `moving` against `targets`.
 *
 * `threshold` is in page units — pass `SNAP_PIXELS / zoom` so the magnet feels
 * the same size on screen no matter how far you've zoomed in.
 */
export function computeSnap(moving: Box, targets: SnapTarget[], threshold: number): SnapResult {
  if (targets.length === 0 || threshold <= 0) return EMPTY;

  const mx = bestMatch(linesX(moving), targets, linesX, threshold);
  const my = bestMatch(linesY(moving), targets, linesY, threshold);

  const offset: Vec = { x: mx?.delta ?? 0, y: my?.delta ?? 0 };
  const snapped: Box = { ...moving, x: moving.x + offset.x, y: moving.y + offset.y };
  const guides: SnapGuide[] = [];

  // Draw each guide only across the two boxes it relates, the way Figma does —
  // a full-bleed line across an infinite canvas tells you nothing.
  if (mx) {
    guides.push({
      axis: 'x',
      position: mx.position,
      start: Math.min(snapped.y, mx.targetBox.y),
      end: Math.max(snapped.y + snapped.height, mx.targetBox.y + mx.targetBox.height),
    });
  }
  if (my) {
    guides.push({
      axis: 'y',
      position: my.position,
      start: Math.min(snapped.x, my.targetBox.x),
      end: Math.max(snapped.x + snapped.width, my.targetBox.x + my.targetBox.width),
    });
  }

  return { offset, guides };
}

/** Page edges, thirds-free: just the four edges and the two center lines. */
export function pageSnapTarget(width: number, height: number): SnapTarget {
  return { box: { x: 0, y: 0, width, height }, isPage: true };
}
