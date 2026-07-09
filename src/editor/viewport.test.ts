/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from 'vitest';
import {
  MAX_ZOOM,
  MIN_ZOOM,
  centerOn,
  fitToRect,
  nextZoomStop,
  normalizeWheelDelta,
  pageToScreen,
  panBy,
  screenToPage,
  wheelZoomFactor,
  zoomAt,
  zoomBy,
} from './viewport';
import { computeSnap, pageSnapTarget } from './snapping';
import type { Viewport } from './types';

const vp = (x: number, y: number, zoom: number): Viewport => ({ x, y, zoom });

describe('screenToPage / pageToScreen', () => {
  it('are inverses', () => {
    const v = vp(-320, 88, 2.75);
    const screen = { x: 411, y: -92 };
    const back = pageToScreen(v, screenToPage(v, screen));
    expect(back.x).toBeCloseTo(screen.x);
    expect(back.y).toBeCloseTo(screen.y);
  });

  it('matches the CSS transform it stands for', () => {
    // translate(100, 50) scale(2) with origin 0 0 puts page (10, 10) at (120, 70).
    expect(pageToScreen(vp(100, 50, 2), { x: 10, y: 10 })).toEqual({ x: 120, y: 70 });
  });
});

describe('zoomAt', () => {
  it('keeps the focused page point under the cursor', () => {
    const before = vp(37, -14, 0.8);
    const focus = { x: 300, y: 220 };
    const pageUnderCursor = screenToPage(before, focus);

    const after = zoomAt(before, focus, 3.2);
    const stillThere = pageToScreen(after, pageUnderCursor);

    expect(stillThere.x).toBeCloseTo(focus.x, 6);
    expect(stillThere.y).toBeCloseTo(focus.y, 6);
    expect(after.zoom).toBe(3.2);
  });

  it('clamps to the zoom range without losing the focus point', () => {
    const focus = { x: 100, y: 100 };
    const zoomedOut = zoomAt(vp(0, 0, 1), focus, 0.00001);
    expect(zoomedOut.zoom).toBe(MIN_ZOOM);
    expect(pageToScreen(zoomedOut, screenToPage(vp(0, 0, 1), focus)).x).toBeCloseTo(focus.x);

    expect(zoomAt(vp(0, 0, 1), focus, 9999).zoom).toBe(MAX_ZOOM);
  });

  it('zooming in then out by the same factor returns to the start', () => {
    const start = vp(12, 34, 1.3);
    const focus = { x: 250, y: 180 };
    const round = zoomBy(zoomBy(start, focus, 1.25), focus, 1 / 1.25);
    expect(round.zoom).toBeCloseTo(start.zoom);
    expect(round.x).toBeCloseTo(start.x);
    expect(round.y).toBeCloseTo(start.y);
  });
});

describe('wheelZoomFactor', () => {
  it('zooms in on negative delta (scroll up) and out on positive', () => {
    expect(wheelZoomFactor(-100)).toBeGreaterThan(1);
    expect(wheelZoomFactor(100)).toBeLessThan(1);
  });

  it('is exactly reversible', () => {
    expect(wheelZoomFactor(-120) * wheelZoomFactor(120)).toBeCloseTo(1, 10);
  });

  it('clamps a flung trackpad delta so the camera cannot teleport', () => {
    expect(wheelZoomFactor(100000)).toBe(wheelZoomFactor(400));
  });
});

describe('normalizeWheelDelta', () => {
  it('passes pixels through and scales lines and pages up', () => {
    expect(normalizeWheelDelta(53, 0)).toBe(53);
    expect(normalizeWheelDelta(3, 1)).toBe(48);
    expect(normalizeWheelDelta(1, 2)).toBe(400);
  });
});

describe('nextZoomStop', () => {
  it('steps up and down through the stops', () => {
    expect(nextZoomStop(1, 1)).toBe(1.5);
    expect(nextZoomStop(1, -1)).toBe(0.75);
  });

  it('jumps to the next stop from an off-stop zoom', () => {
    expect(nextZoomStop(1.2, 1)).toBe(1.5);
    expect(nextZoomStop(1.2, -1)).toBe(1);
  });

  it('saturates at the ends', () => {
    expect(nextZoomStop(MAX_ZOOM, 1)).toBe(MAX_ZOOM);
    expect(nextZoomStop(MIN_ZOOM, -1)).toBe(MIN_ZOOM);
  });
});

describe('fitToRect', () => {
  it('centers the page and respects padding', () => {
    const v = fitToRect({ x: 0, y: 0, width: 1000, height: 500 }, 1200, 800, 50);
    // Width is the binding constraint: (1200 - 100) / 1000 = 1.1, capped at maxZoom 1.
    expect(v.zoom).toBe(1);
    expect(pageToScreen(v, { x: 500, y: 250 })).toEqual({ x: 600, y: 400 });
  });

  it('scales down a page larger than the viewport', () => {
    const v = fitToRect({ x: 0, y: 0, width: 2000, height: 1000 }, 600, 600, 20);
    expect(v.zoom).toBeCloseTo(560 / 2000);
    const center = pageToScreen(v, { x: 1000, y: 500 });
    expect(center.x).toBeCloseTo(300);
    expect(center.y).toBeCloseTo(300);
  });

  it('degrades to identity on a zero-sized viewport rather than dividing by zero', () => {
    expect(fitToRect({ x: 0, y: 0, width: 100, height: 100 }, 0, 0)).toEqual({
      x: 0,
      y: 0,
      zoom: 1,
    });
  });

  it('allows zooming past 1 when maxZoom permits', () => {
    const v = fitToRect({ x: 0, y: 0, width: 100, height: 100 }, 600, 600, 0, 4);
    expect(v.zoom).toBe(4);
  });
});

describe('centerOn / panBy', () => {
  it('centerOn keeps the zoom and centers the rect', () => {
    const v = centerOn({ x: 0, y: 0, width: 200, height: 100 }, 800, 600, 2);
    expect(v.zoom).toBe(2);
    expect(pageToScreen(v, { x: 100, y: 50 })).toEqual({ x: 400, y: 300 });
  });

  it('panBy translates in screen pixels, not page units', () => {
    expect(panBy(vp(10, 10, 4), 5, -5)).toEqual({ x: 15, y: 5, zoom: 4 });
  });
});

describe('computeSnap', () => {
  const page = pageSnapTarget(1000, 600);

  it('returns no offset when nothing is within the threshold', () => {
    // Box lines are x: 400/425/450 and y: 333/358/383. The page offers
    // x: 0/500/1000 and y: 0/300/600 — every pair is more than 6 apart.
    const r = computeSnap({ x: 400, y: 333, width: 50, height: 50 }, [page], 6);
    expect(r.offset).toEqual({ x: 0, y: 0 });
    expect(r.guides).toEqual([]);
  });

  it('snaps with a zero offset when an edge already sits on a guide', () => {
    // Top edge is exactly on the page center line: no movement, but the guide
    // still shows, which is what tells the user why the drag stopped there.
    const r = computeSnap({ x: 400, y: 300, width: 50, height: 50 }, [page], 6);
    expect(r.offset).toEqual({ x: 0, y: 0 });
    expect(r.guides).toEqual([{ axis: 'y', position: 300, start: 0, end: 1000 }]);
  });

  it('snaps a box center to the page center', () => {
    // Center is at (503, 302); page center is (500, 300).
    const r = computeSnap({ x: 478, y: 277, width: 50, height: 50 }, [page], 8);
    expect(r.offset.x).toBeCloseTo(-3);
    expect(r.offset.y).toBeCloseTo(-2);
    expect(r.guides).toHaveLength(2);
    expect(r.guides.find((g) => g.axis === 'x')!.position).toBe(500);
    expect(r.guides.find((g) => g.axis === 'y')!.position).toBe(300);
  });

  it('snaps a left edge to a neighbour left edge', () => {
    const neighbour = { box: { x: 200, y: 0, width: 100, height: 40 } };
    const r = computeSnap({ x: 203, y: 500, width: 50, height: 50 }, [neighbour], 6);
    expect(r.offset.x).toBeCloseTo(-3);
  });

  it('prefers the smallest correction when several targets are in range', () => {
    const near = { box: { x: 101, y: 0, width: 10, height: 10 } };
    const far = { box: { x: 104, y: 0, width: 10, height: 10 } };
    const r = computeSnap({ x: 100, y: 300, width: 10, height: 10 }, [near, far], 10);
    expect(r.offset.x).toBeCloseTo(1);
  });

  it('spans the guide across both the moving box and its target', () => {
    const neighbour = { box: { x: 200, y: 0, width: 100, height: 40 } };
    const r = computeSnap({ x: 200, y: 500, width: 50, height: 50 }, [neighbour], 6);
    const guide = r.guides.find((g) => g.axis === 'x')!;
    expect(guide.start).toBeCloseTo(0);
    expect(guide.end).toBeCloseTo(550);
  });

  it('does nothing with no targets or a zero threshold', () => {
    expect(computeSnap({ x: 0, y: 0, width: 1, height: 1 }, [], 10).guides).toEqual([]);
    expect(computeSnap({ x: 0, y: 0, width: 1, height: 1 }, [page], 0).guides).toEqual([]);
  });
});
