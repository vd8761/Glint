/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from 'vitest';
import {
  aabb,
  applyGroupScale,
  centerOf,
  corners,
  groupResizeTransform,
  hitTest,
  localToWorld,
  normalizeAngle,
  resizeCursor,
  resizeFrame,
  rotate,
  rotateFrame,
  rotateFrameAbout,
  unionAabb,
  worldToLocal,
} from './geometry';
import type { Frame } from './types';

const frame = (x: number, y: number, width: number, height: number, rotation = 0): Frame => ({
  x,
  y,
  width,
  height,
  rotation,
});

/** Frames are floats; compare them the way a human would. */
const expectFrame = (actual: Frame, expected: Partial<Frame>) => {
  for (const [key, value] of Object.entries(expected)) {
    expect(actual[key as keyof Frame], key).toBeCloseTo(value as number, 6);
  }
};

describe('rotate', () => {
  it('is the identity at 0 degrees', () => {
    expect(rotate({ x: 3, y: 7 }, 0)).toEqual({ x: 3, y: 7 });
  });

  it('turns +x into +y at 90 degrees (y-down clockwise)', () => {
    const r = rotate({ x: 1, y: 0 }, 90);
    expect(r.x).toBeCloseTo(0);
    expect(r.y).toBeCloseTo(1);
  });

  it('round-trips through the inverse angle', () => {
    const v = { x: 12.5, y: -3.25 };
    const back = rotate(rotate(v, 37), -37);
    expect(back.x).toBeCloseTo(v.x);
    expect(back.y).toBeCloseTo(v.y);
  });
});

describe('normalizeAngle', () => {
  it.each([
    [0, 0],
    [360, 0],
    [-90, 270],
    [450, 90],
    [-450, 270],
  ])('normalizeAngle(%s) === %s', (input, expected) => {
    expect(normalizeAngle(input)).toBeCloseTo(expected);
  });
});

describe('worldToLocal / localToWorld', () => {
  it('are inverses for a rotated frame', () => {
    const f = frame(100, 50, 200, 80, 33);
    const world = { x: 137, y: 91 };
    const back = localToWorld(f, worldToLocal(f, world));
    expect(back.x).toBeCloseTo(world.x);
    expect(back.y).toBeCloseTo(world.y);
  });

  it('maps the frame center to the local origin', () => {
    const f = frame(10, 20, 100, 60, 47);
    const local = worldToLocal(f, centerOf(f));
    expect(local.x).toBeCloseTo(0);
    expect(local.y).toBeCloseTo(0);
  });
});

describe('aabb', () => {
  it('equals the box itself when unrotated', () => {
    expect(aabb(frame(10, 20, 100, 60))).toEqual({ x: 10, y: 20, width: 100, height: 60 });
  });

  it('swaps width and height at 90 degrees', () => {
    const b = aabb(frame(0, 0, 100, 60, 90));
    expect(b.width).toBeCloseTo(60);
    expect(b.height).toBeCloseTo(100);
    // Center is preserved: rotation is about the center.
    expect(b.x + b.width / 2).toBeCloseTo(50);
    expect(b.y + b.height / 2).toBeCloseTo(30);
  });

  it('grows to the diagonal at 45 degrees on a square', () => {
    const b = aabb(frame(0, 0, 100, 100, 45));
    expect(b.width).toBeCloseTo(Math.SQRT2 * 100);
    expect(b.height).toBeCloseTo(Math.SQRT2 * 100);
  });
});

describe('unionAabb', () => {
  it('returns null for no frames', () => {
    expect(unionAabb([])).toBeNull();
  });

  it('covers every frame', () => {
    const u = unionAabb([frame(0, 0, 10, 10), frame(90, 40, 10, 10)])!;
    expect(u).toEqual({ x: 0, y: 0, width: 100, height: 50 });
  });
});

describe('hitTest', () => {
  it('accepts the center and rejects a far corner of a rotated square', () => {
    const f = frame(0, 0, 100, 20, 45);
    expect(hitTest(f, centerOf(f))).toBe(true);
    // (0, 0) is the unrotated top-left, which the 45deg rotation vacates.
    expect(hitTest(f, { x: 0, y: 0 })).toBe(false);
  });

  it('accepts a point that is inside only once rotation is accounted for', () => {
    const f = frame(0, 0, 100, 20, 90);
    // After rotating 90deg about (50, 10) the tall sliver covers (50, 55).
    expect(hitTest(f, { x: 50, y: 55 })).toBe(true);
    expect(hitTest(f, { x: 95, y: 10 })).toBe(false);
  });
});

describe('resizeFrame — unrotated', () => {
  it('drags the SE handle without moving the NW corner', () => {
    const next = resizeFrame(frame(0, 0, 100, 100), 'se', { x: 150, y: 130 });
    expectFrame(next, { x: 0, y: 0, width: 150, height: 130 });
  });

  it('drags the NW handle without moving the SE corner', () => {
    const next = resizeFrame(frame(0, 0, 100, 100), 'nw', { x: -50, y: -20 });
    expectFrame(next, { x: -50, y: -20, width: 150, height: 120 });
  });

  it('leaves the cross axis alone for an edge handle', () => {
    const next = resizeFrame(frame(10, 20, 100, 60), 'e', { x: 200, y: 999 });
    expectFrame(next, { x: 10, y: 20, width: 190, height: 60 });
  });

  it('clamps at minSize instead of flipping when dragged past the anchor', () => {
    const next = resizeFrame(frame(0, 0, 100, 100), 'se', { x: -500, y: -500 }, { minSize: 4 });
    expectFrame(next, { x: 0, y: 0, width: 4, height: 4 });
  });
});

describe('resizeFrame — rotated', () => {
  it('keeps the anchor corner pinned in world space at 30 degrees', () => {
    const start = frame(100, 100, 200, 120, 30);
    // World position of the NW corner before the drag.
    const anchorBefore = corners(start)[0];
    const next = resizeFrame(start, 'se', { x: 400, y: 300 });
    const anchorAfter = corners(next)[0];
    expect(anchorAfter.x).toBeCloseTo(anchorBefore.x, 6);
    expect(anchorAfter.y).toBeCloseTo(anchorBefore.y, 6);
  });

  it.each([15, 45, 90, 137, 250, 359])(
    'pins the anchor for every handle at %s degrees',
    (rotation) => {
      const start = frame(40, 60, 180, 90, rotation);
      const handles = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as const;
      const cornerIndex = { nw: 0, ne: 1, se: 2, sw: 3 } as const;

      for (const handle of handles) {
        const next = resizeFrame(start, handle, { x: 260, y: 240 });
        expect(next.rotation).toBe(rotation);

        // For corner handles the opposite corner must not budge.
        const opposite = { nw: 'se', ne: 'sw', se: 'nw', sw: 'ne' } as const;
        if (handle in opposite) {
          const key = opposite[handle as keyof typeof opposite];
          const before = corners(start)[cornerIndex[key]];
          const after = corners(next)[cornerIndex[key]];
          expect(after.x, `${handle}@${rotation} anchor x`).toBeCloseTo(before.x, 6);
          expect(after.y, `${handle}@${rotation} anchor y`).toBeCloseTo(before.y, 6);
        }
      }
    },
  );

  it('grows a 90deg-rotated node along the world Y axis when dragging E', () => {
    // Local +x points world-down at 90deg, so the "east" handle drags downward.
    const start = frame(0, 0, 100, 50, 90);
    const next = resizeFrame(start, 'e', { x: 50, y: 75 });
    expectFrame(next, { width: 100, height: 50, rotation: 90 });
    // The west edge (local -x, world up) stayed put.
    const before = localToWorld(start, { x: -start.width / 2, y: 0 });
    const after = localToWorld(next, { x: -next.width / 2, y: 0 });
    expect(after.x).toBeCloseTo(before.x);
    expect(after.y).toBeCloseTo(before.y);
  });

  it('does not translate the center when resizing from center', () => {
    const start = frame(100, 100, 200, 120, 63);
    const before = centerOf(start);
    const next = resizeFrame(start, 'se', { x: 400, y: 380 }, { fromCenter: true });
    const after = centerOf(next);
    expect(after.x).toBeCloseTo(before.x);
    expect(after.y).toBeCloseTo(before.y);
    expect(next.width).toBeGreaterThan(start.width);
  });
});

describe('resizeFrame — aspect lock', () => {
  it('preserves the starting ratio on a corner drag', () => {
    const start = frame(0, 0, 200, 100);
    const next = resizeFrame(start, 'se', { x: 400, y: 120 }, { lockAspect: true });
    expect(next.width / next.height).toBeCloseTo(2);
    // Dominant axis wins: x pulled to 400, so width is 400.
    expect(next.width).toBeCloseTo(400);
  });

  it('mirrors an edge drag onto the other axis', () => {
    const start = frame(0, 0, 200, 100);
    const next = resizeFrame(start, 'e', { x: 300, y: 0 }, { lockAspect: true });
    expect(next.width).toBeCloseTo(300);
    expect(next.height).toBeCloseTo(150);
  });

  it('still pins the anchor while locked and rotated', () => {
    const start = frame(10, 10, 120, 80, 22);
    const before = corners(start)[0];
    const next = resizeFrame(start, 'se', { x: 300, y: 250 }, { lockAspect: true });
    const after = corners(next)[0];
    expect(after.x).toBeCloseTo(before.x, 6);
    expect(after.y).toBeCloseTo(before.y, 6);
  });
});

describe('rotateFrame', () => {
  it('follows the pointer around the center', () => {
    const start = frame(0, 0, 100, 100, 0);
    // Pointer starts due north of the center and swings due east: +90deg.
    const next = rotateFrame(start, { x: 50, y: -50 }, { x: 150, y: 50 });
    expect(next.rotation).toBeCloseTo(90);
  });

  it('snaps to 15 degree increments when asked', () => {
    const start = frame(0, 0, 100, 100, 0);
    const next = rotateFrame(start, { x: 50, y: -50 }, { x: 60, y: -50 }, { snap: true });
    expect(next.rotation % 15).toBeCloseTo(0);
  });

  it('never leaves [0, 360)', () => {
    const start = frame(0, 0, 100, 100, 10);
    const next = rotateFrame(start, { x: 50, y: -50 }, { x: -50, y: 40 });
    expect(next.rotation).toBeGreaterThanOrEqual(0);
    expect(next.rotation).toBeLessThan(360);
  });

  it('leaves size untouched', () => {
    const start = frame(3, 4, 100, 50, 12);
    const next = rotateFrame(start, { x: 0, y: 0 }, { x: 80, y: 90 });
    expect(next.width).toBe(100);
    expect(next.height).toBe(50);
  });
});

describe('rotateFrameAbout', () => {
  it('orbits the center about an external pivot', () => {
    const start = frame(90, -10, 20, 20, 0); // center (100, 0)
    const next = rotateFrameAbout(start, { x: 0, y: 0 }, 90);
    const c = centerOf(next);
    expect(c.x).toBeCloseTo(0);
    expect(c.y).toBeCloseTo(100);
    expect(next.rotation).toBeCloseTo(90);
  });
});

describe('group resize', () => {
  it('scales children about the anchor corner', () => {
    const box = { x: 0, y: 0, width: 100, height: 100 };
    const { anchor, sx, sy } = groupResizeTransform(box, 'se', { x: 200, y: 300 });
    expect(anchor).toEqual({ x: 0, y: 0 });
    expect(sx).toBeCloseTo(2);
    expect(sy).toBeCloseTo(3);

    const child = applyGroupScale(frame(50, 50, 50, 50, 20), anchor, sx, sy);
    expectFrame(child, { width: 100, height: 150, rotation: 20 });
    expect(centerOf(child).x).toBeCloseTo(150);
    expect(centerOf(child).y).toBeCloseTo(225);
  });

  it('uses the NW corner as anchor when dragging SE, and vice versa', () => {
    const box = { x: 10, y: 20, width: 100, height: 100 };
    expect(groupResizeTransform(box, 'se', { x: 0, y: 0 }).anchor).toEqual({ x: 10, y: 20 });
    expect(groupResizeTransform(box, 'nw', { x: 0, y: 0 }).anchor).toEqual({ x: 110, y: 120 });
  });

  it('is the identity when the pointer sits exactly on the handle', () => {
    const box = { x: 10, y: 20, width: 100, height: 60 };
    const { sx, sy } = groupResizeTransform(box, 'se', { x: 110, y: 80 });
    expect(sx).toBeCloseTo(1);
    expect(sy).toBeCloseTo(1);
  });
});

describe('resizeCursor', () => {
  it('reads straight off the compass when unrotated', () => {
    expect(resizeCursor('e', 0)).toBe('ew-resize');
    expect(resizeCursor('se', 0)).toBe('nwse-resize');
    expect(resizeCursor('n', 0)).toBe('ns-resize');
    expect(resizeCursor('ne', 0)).toBe('nesw-resize');
  });

  it('rotates with the node', () => {
    expect(resizeCursor('e', 90)).toBe('ns-resize');
    expect(resizeCursor('n', 90)).toBe('ew-resize');
    expect(resizeCursor('se', 90)).toBe('nesw-resize');
  });

  it('is stable across a full turn', () => {
    expect(resizeCursor('e', 360)).toBe(resizeCursor('e', 0));
  });
});
