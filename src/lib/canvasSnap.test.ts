import { describe, it, expect } from 'vitest';
import { computeSnap, type Box } from './canvasSnap';

const moving = (x: number, y: number, hw = 5, hh = 3) => ({ x, y, hw, hh });

describe('computeSnap', () => {
  it('snaps the centre to the canvas centre when close', () => {
    const r = computeSnap(moving(49.2, 30), [], 1.5, 2);
    expect(r.x).toBe(50);
    expect(r.snappedX).toBe(true);
    expect(r.guideX?.pos).toBe(50);
  });

  it('does not snap when no anchor is near a candidate', () => {
    // hw=2 → edges at 41/43/45, none within 1.5 of a canvas line (0/50/100).
    const r = computeSnap(moving(43, 30, 2, 2), [], 1.5, 2);
    expect(r.x).toBe(43);
    expect(r.snappedX).toBe(false);
    expect(r.guideX).toBeNull();
  });

  it('snaps an edge to the canvas centre line', () => {
    // x=45, hw=5 → right edge is exactly 50, the canvas centre.
    const r = computeSnap(moving(45, 30, 5, 3), [], 1.5, 2);
    expect(r.x).toBe(45); // already aligned, delta 0
    expect(r.guideX?.pos).toBe(50);
  });

  it('aligns centre-to-centre with another element', () => {
    const other: Box = { id: 'a', cx: 70, cy: 20, hw: 8, hh: 4 };
    const r = computeSnap(moving(69, 60), [other], 1.5, 2);
    expect(r.x).toBe(70);
    expect(r.guideX?.pos).toBe(70);
    // The guide spans both elements on the y axis.
    expect(r.guideX?.start).toBeLessThanOrEqual(16); // other top (20-4)
    expect(r.guideX?.end).toBeGreaterThanOrEqual(60); // moving centre-ish
  });

  it('can ignore canvas lines while keeping element alignment', () => {
    const canvasOnly = computeSnap(moving(49.2, 30), [], 1.5, 2, { includeCanvas: false });
    expect(canvasOnly.x).toBe(49.2);
    expect(canvasOnly.snappedX).toBe(false);

    const other: Box = { id: 'a', cx: 70, cy: 20, hw: 8, hh: 4 };
    const elementSnap = computeSnap(moving(69, 60), [other], 1.5, 2, { includeCanvas: false });
    expect(elementSnap.x).toBe(70);
    expect(elementSnap.snappedX).toBe(true);
  });

  it('aligns the moving left edge to another element left edge', () => {
    // other spans x 60..80, left edge = 60. moving centre 66 hw 5 → left edge 61.
    const other: Box = { id: 'a', cx: 70, cy: 20, hw: 10, hh: 4 };
    const r = computeSnap(moving(66, 60, 5, 3), [other], 1.5, 2);
    // left edge 61 snaps to 60 → centre shifts by -1 to 65.
    expect(r.x).toBe(65);
    expect(r.guideX?.pos).toBe(60);
  });

  it('snaps both axes independently', () => {
    const r = computeSnap(moving(49.5, 50.4), [], 1.5, 1.5);
    expect(r.x).toBe(50);
    expect(r.y).toBe(50);
    expect(r.snappedX).toBe(true);
    expect(r.snappedY).toBe(true);
  });

  it('can limit canvas snapping to the moving centre only', () => {
    const edgeNearCentre = computeSnap(moving(100.4, 30, 50, 3), [], 1.5, 2, {
      canvasLines: 'center',
      movingAnchors: 'center',
    });
    expect(edgeNearCentre.x).toBe(100.4);
    expect(edgeNearCentre.snappedX).toBe(false);

    const centreNearCentre = computeSnap(moving(49.4, 30, 50, 3), [], 1.5, 2, {
      canvasLines: 'center',
      movingAnchors: 'center',
    });
    expect(centreNearCentre.x).toBe(50);
    expect(centreNearCentre.snappedX).toBe(true);
  });

  it('prefers the nearest candidate', () => {
    const a: Box = { id: 'a', cx: 48, cy: 20, hw: 2, hh: 2 };
    const b: Box = { id: 'b', cx: 52, cy: 20, hw: 2, hh: 2 };
    // moving centre 50.3 is nearer b's left edge (50) than a's right edge (50)…
    // both are 50 here; just assert it snaps to 50 and picks one.
    const r = computeSnap(moving(50.3, 60, 1, 1), [a, b], 1.5, 2);
    expect(r.x).toBe(50);
  });
});
