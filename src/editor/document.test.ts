/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from 'vitest';
import {
  createNode,
  createStarterDocument,
  duplicateNodes,
  frameOf,
  mapNodes,
  removeNodes,
  reorderNodes,
  scaleNodeProps,
  withFrame,
} from './document';
import {
  applyMoveGesture,
  applyResizeGesture,
  applyRotateGesture,
  drawBox,
} from './gestures';
import { pageSnapTarget } from './snapping';
import type { EditorDocument, EditorNode, TextNode, Vec } from './types';

const ids = (nodes: EditorNode[]) => nodes.map((n) => n.name);

describe('createNode', () => {
  it('returns a precisely typed node per kind', () => {
    const text = createNode('text', { x: 0, y: 0, width: 10, height: 10 });
    // Compiles only because `createNode` is generic over `NodeKind`.
    expect(text.fontSize).toBeGreaterThan(0);
    expect(createNode('rect', { x: 0, y: 0, width: 1, height: 1 }).radius).toBe(8);
    expect(createNode('ellipse', { x: 0, y: 0, width: 1, height: 1 }).fill).toBe('#e2e8f0');
    expect(createNode('image', { x: 0, y: 0, width: 1, height: 1 }).fit).toBe('contain');
  });

  it('starts unrotated, opaque and unlocked', () => {
    const n = createNode('rect', { x: 5, y: 6, width: 7, height: 8 });
    expect(n).toMatchObject({ x: 5, y: 6, width: 7, height: 8, rotation: 0, opacity: 1, locked: false });
  });

  it('mints unique ids', () => {
    const a = createNode('rect', { x: 0, y: 0, width: 1, height: 1 });
    const b = createNode('rect', { x: 0, y: 0, width: 1, height: 1 });
    expect(a.id).not.toBe(b.id);
  });
});

describe('withFrame', () => {
  it('normalizes the angle it stores', () => {
    const n = createNode('rect', { x: 0, y: 0, width: 1, height: 1 });
    expect(withFrame(n, { ...frameOf(n), rotation: -90 }).rotation).toBe(270);
    expect(withFrame(n, { ...frameOf(n), rotation: 450 }).rotation).toBe(90);
  });

  it('leaves non-frame properties alone', () => {
    const n = createNode('text', { x: 0, y: 0, width: 10, height: 10 });
    const moved = withFrame(n, { x: 9, y: 9, width: 10, height: 10, rotation: 0 });
    expect(moved.fontSize).toBe(n.fontSize);
    expect(moved.text).toBe(n.text);
  });
});

describe('scaleNodeProps', () => {
  it('scales type but not the frame', () => {
    const n = createNode('text', { x: 0, y: 0, width: 100, height: 20 });
    const scaled = scaleNodeProps({ ...n, fontSize: 20, letterSpacing: 2 }, 1.5);
    expect(scaled.fontSize).toBeCloseTo(30);
    expect(scaled.letterSpacing).toBeCloseTo(3);
    expect(scaled.width).toBe(100);
  });

  it('scales stroke and radius on shapes', () => {
    const n = createNode('rect', { x: 0, y: 0, width: 10, height: 10 });
    const scaled = scaleNodeProps({ ...n, strokeWidth: 4, radius: 8 }, 0.5);
    expect(scaled.strokeWidth).toBeCloseTo(2);
    expect(scaled.radius).toBeCloseTo(4);
  });

  it('is the identity for a factor of 1, and for nonsense factors', () => {
    const n = createNode('text', { x: 0, y: 0, width: 10, height: 10 });
    expect(scaleNodeProps(n, 1)).toBe(n);
    expect(scaleNodeProps(n, 0)).toBe(n);
    expect(scaleNodeProps(n, -2)).toBe(n);
    expect(scaleNodeProps(n, Number.NaN)).toBe(n);
  });

  it('never lets font size reach zero', () => {
    const n = createNode('text', { x: 0, y: 0, width: 10, height: 10 });
    expect(scaleNodeProps(n, 0.0001).fontSize).toBeGreaterThanOrEqual(1);
  });
});

/**
 * A drag arrives as dozens of `pointermove` events, every one of which runs the
 * same gesture function against the live document. The result must depend only on
 * the gesture's starting snapshot and the final pointer position — never on how
 * many events got there.
 *
 * Deriving from the live node instead compounds the scale factor once per event:
 * a 1.2x drag delivered over ten moves silently lands at 1.2^10 = 6.2x. That is a
 * real bug this editor shipped once; these tests replay a drag through the actual
 * gesture functions to keep it from coming back.
 */
describe('gestures are idempotent across pointermove events', () => {
  const startBox = { x: 0, y: 0, width: 200, height: 100 };

  const setup = () => {
    const node: TextNode = { ...createNode('text', startBox), fontSize: 20, letterSpacing: 2 };
    const doc: EditorDocument = {
      page: { width: 1000, height: 1000, background: '#fff' },
      nodes: [node],
    };
    return { node, doc, gestureNodes: { [node.id]: node as EditorNode } };
  };

  /** Replay a pointer path through a gesture, exactly as CanvasStage does. */
  const replayResize = (path: Vec[], isGroup: boolean) => {
    const { node, doc, gestureNodes } = setup();
    const gesture = { nodes: gestureNodes, groupBox: startBox, handle: 'se' as const, isGroup };
    let current = doc;
    for (const pointer of path) {
      current = applyResizeGesture(current, gesture, pointer, { scaleMode: true }).doc;
    }
    return { start: node, end: current.nodes[0] as TextNode };
  };

  const replayMove = (path: Vec[]) => {
    const { doc, gestureNodes } = setup();
    const gesture = { nodes: gestureNodes, groupBox: startBox, startPage: { x: 0, y: 0 } };
    let current = doc;
    for (const pointer of path) current = applyMoveGesture(current, gesture, pointer).doc;
    return current.nodes[0];
  };

  const path = (to: Vec, steps: number): Vec[] =>
    Array.from({ length: steps }, (_, i) => ({
      x: startBox.width + ((to.x - startBox.width) * (i + 1)) / steps,
      y: startBox.height + ((to.y - startBox.height) * (i + 1)) / steps,
    }));

  it.each([
    ['single node', false],
    ['group', true],
  ])('resize of a %s lands identically after 1 event or 40', (_label, isGroup) => {
    const destination = { x: 240, y: 120 };
    const oneShot = replayResize([destination], isGroup);
    const manyEvents = replayResize(path(destination, 40), isGroup);

    expect(manyEvents.end.width).toBeCloseTo(oneShot.end.width, 6);
    expect(manyEvents.end.height).toBeCloseTo(oneShot.end.height, 6);
    expect(manyEvents.end.fontSize).toBeCloseTo(oneShot.end.fontSize, 6);
    expect(manyEvents.end.letterSpacing).toBeCloseTo(oneShot.end.letterSpacing, 6);
  });

  it('scales font by the geometric mean exactly once, not once per event', () => {
    // 200x100 -> 240x120 is sx = sy = 1.2, so the geometric mean is exactly 1.2.
    const { end } = replayResize(path({ x: 240, y: 120 }, 10), true);
    expect(end.width).toBeCloseTo(240);
    expect(end.height).toBeCloseTo(120);
    expect(end.fontSize).toBeCloseTo(24); // 20 * 1.2 — and emphatically not 20 * 1.2^10
    expect(end.letterSpacing).toBeCloseTo(2.4);
  });

  it('never scales type on a single-node resize outside scale mode', () => {
    const { node, doc, gestureNodes } = setup();
    const gesture = { nodes: gestureNodes, groupBox: startBox, handle: 'se' as const, isGroup: false };
    const out = applyResizeGesture(doc, gesture, { x: 400, y: 300 }, { scaleMode: false }).doc;
    const end = out.nodes[0] as TextNode;
    expect(end.width).toBeCloseTo(400);
    expect(end.fontSize).toBe(node.fontSize);
  });

  it('move lands identically after 1 event or 40', () => {
    const destination = { x: 137, y: -42 };
    const oneShot = replayMove([destination]);
    const manyEvents = replayMove(
      Array.from({ length: 40 }, (_, i) => ({
        x: (destination.x * (i + 1)) / 40,
        y: (destination.y * (i + 1)) / 40,
      })),
    );
    expect(manyEvents.x).toBeCloseTo(oneShot.x, 9);
    expect(manyEvents.y).toBeCloseTo(oneShot.y, 9);
  });

  it('rotation of a group orbits from the snapshot, not from the last frame', () => {
    const { doc, gestureNodes } = setup();
    const gesture = { nodes: gestureNodes, pivot: { x: 100, y: 50 }, startPage: { x: 200, y: 50 } };
    // Swing a quarter turn, in one hop and in forty.
    const oneShot = applyRotateGesture(doc, gesture, { x: 100, y: 150 }).doc.nodes[0];
    let current = doc;
    for (let i = 1; i <= 40; i++) {
      const a = (Math.PI / 2) * (i / 40);
      current = applyRotateGesture(current, gesture, {
        x: 100 + 100 * Math.cos(a),
        y: 50 + 100 * Math.sin(a),
      }).doc;
    }
    expect(current.nodes[0].rotation).toBeCloseTo(oneShot.rotation, 6);
    expect(current.nodes[0].rotation).toBeCloseTo(90, 6);
  });
});

describe('applyMoveGesture snapping', () => {
  it('nudges the delta so the moving box lands on a guide', () => {
    const node = createNode('rect', { x: 0, y: 0, width: 100, height: 100 });
    const doc: EditorDocument = {
      page: { width: 1000, height: 600, background: '#fff' },
      nodes: [node],
    };
    const gesture = {
      nodes: { [node.id]: node as EditorNode },
      groupBox: { x: 0, y: 0, width: 100, height: 100 },
      startPage: { x: 0, y: 0 },
    };
    // Drag so the box centre lands 3px right of the page centre; the magnet takes it.
    const out = applyMoveGesture(doc, gesture, { x: 453, y: 250 }, {
      snapTargets: [pageSnapTarget(1000, 600)],
      snapThreshold: 8,
    });
    expect(out.doc.nodes[0].x + 50).toBeCloseTo(500);
    expect(out.guides.some((g) => g.axis === 'x' && g.position === 500)).toBe(true);
  });

  it('locks to the dominant axis when asked', () => {
    const node = createNode('rect', { x: 0, y: 0, width: 10, height: 10 });
    const doc: EditorDocument = {
      page: { width: 1000, height: 600, background: '#fff' },
      nodes: [node],
    };
    const gesture = {
      nodes: { [node.id]: node as EditorNode },
      groupBox: { x: 0, y: 0, width: 10, height: 10 },
      startPage: { x: 0, y: 0 },
    };
    const out = applyMoveGesture(doc, gesture, { x: 90, y: 12 }, { axisLock: true });
    expect(out.doc.nodes[0].x).toBeCloseTo(90);
    expect(out.doc.nodes[0].y).toBeCloseTo(0);
  });
});

describe('drawBox', () => {
  it('normalizes a drag in any direction', () => {
    expect(drawBox({ x: 100, y: 100 }, { x: 40, y: 30 })).toEqual({
      x: 40,
      y: 30,
      width: 60,
      height: 70,
    });
  });

  it('squares off when constrained', () => {
    expect(drawBox({ x: 0, y: 0 }, { x: 60, y: 20 }, true)).toEqual({
      x: 0,
      y: 0,
      width: 60,
      height: 60,
    });
  });
});

describe('mapNodes', () => {
  it('returns the same document reference when the id set is empty', () => {
    const doc = createStarterDocument();
    expect(mapNodes(doc, [], (n) => ({ ...n, x: 1 }))).toBe(doc);
  });

  it('leaves untouched nodes referentially identical', () => {
    const doc = createStarterDocument();
    const target = doc.nodes[1];
    const next = mapNodes(doc, [target.id], (n) => ({ ...n, x: n.x + 1 }));
    expect(next.nodes[0]).toBe(doc.nodes[0]);
    expect(next.nodes[1]).not.toBe(doc.nodes[1]);
  });
});

describe('removeNodes / duplicateNodes', () => {
  it('removes exactly the given ids', () => {
    const doc = createStarterDocument();
    const victim = doc.nodes[2].id;
    const next = removeNodes(doc, new Set([victim]));
    expect(next.nodes).toHaveLength(doc.nodes.length - 1);
    expect(next.nodes.find((n) => n.id === victim)).toBeUndefined();
  });

  it('duplicates with fresh ids, offset, and on top of the stack', () => {
    const doc = createStarterDocument();
    const source = doc.nodes[1];
    const { doc: next, newIds } = duplicateNodes(doc, new Set([source.id]), 16);
    expect(newIds).toHaveLength(1);
    const clone = next.nodes[next.nodes.length - 1];
    expect(clone.id).toBe(newIds[0]);
    expect(clone.id).not.toBe(source.id);
    expect(clone.x).toBe(source.x + 16);
    expect(clone.y).toBe(source.y + 16);
  });
});

describe('reorderNodes', () => {
  const doc = () => ({
    page: { width: 10, height: 10, background: '#fff' },
    nodes: (['a', 'b', 'c', 'd'] as const).map((name) => ({
      ...createNode('rect', { x: 0, y: 0, width: 1, height: 1 }),
      id: name,
      name,
    })),
  });

  it('brings to front and sends to back', () => {
    expect(ids(reorderNodes(doc(), new Set(['b']), 'front').nodes)).toEqual(['a', 'c', 'd', 'b']);
    expect(ids(reorderNodes(doc(), new Set(['c']), 'back').nodes)).toEqual(['c', 'a', 'b', 'd']);
  });

  it('steps one place forward and backward', () => {
    expect(ids(reorderNodes(doc(), new Set(['b']), 'forward').nodes)).toEqual(['a', 'c', 'b', 'd']);
    expect(ids(reorderNodes(doc(), new Set(['c']), 'backward').nodes)).toEqual(['a', 'c', 'b', 'd']);
  });

  it('does not push a node off either end', () => {
    expect(ids(reorderNodes(doc(), new Set(['d']), 'forward').nodes)).toEqual(['a', 'b', 'c', 'd']);
    expect(ids(reorderNodes(doc(), new Set(['a']), 'backward').nodes)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('keeps a multi-selection in its relative order and does not let members leapfrog', () => {
    expect(ids(reorderNodes(doc(), new Set(['a', 'b']), 'forward').nodes)).toEqual([
      'c',
      'a',
      'b',
      'd',
    ]);
    expect(ids(reorderNodes(doc(), new Set(['c', 'd']), 'backward').nodes)).toEqual([
      'a',
      'c',
      'd',
      'b',
    ]);
  });

  it('is a no-op for an empty selection', () => {
    const d = doc();
    expect(reorderNodes(d, new Set(), 'front')).toBe(d);
  });
});

describe('createStarterDocument', () => {
  it('locks the decorative border so it cannot be grabbed by accident', () => {
    const border = createStarterDocument().nodes.find((n) => n.name === 'Border');
    expect(border?.locked).toBe(true);
  });

  it('keeps every node inside the page', () => {
    const doc = createStarterDocument();
    for (const n of doc.nodes) {
      expect(n.x).toBeGreaterThanOrEqual(0);
      expect(n.y).toBeGreaterThanOrEqual(0);
      expect(n.x + n.width).toBeLessThanOrEqual(doc.page.width);
      expect(n.y + n.height).toBeLessThanOrEqual(doc.page.height);
    }
  });
});
