/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Document construction and immutable edits. Nothing here knows about React.
 */

import { normalizeAngle } from './geometry';
import type {
  EditorDocument,
  EditorNode,
  Frame,
  NodeKind,
  NodeOfKind,
  PageSpec,
} from './types';

/** A4 at 96 dpi, the size a certificate actually prints at. */
export const PAGE_PRESETS = {
  'a4-landscape': { width: 1123, height: 794, background: '#ffffff' },
  'a4-portrait': { width: 794, height: 1123, background: '#ffffff' },
  'letter-landscape': { width: 1056, height: 816, background: '#ffffff' },
  'letter-portrait': { width: 816, height: 1056, background: '#ffffff' },
} satisfies Record<string, PageSpec>;

export type PagePresetId = keyof typeof PAGE_PRESETS;

let counter = 0;
export const uid = (prefix = 'n'): string =>
  `${prefix}_${Date.now().toString(36)}_${(counter++).toString(36)}`;

const BASE = {
  rotation: 0,
  opacity: 1,
  locked: false,
  hidden: false,
} as const;

/**
 * Build a node of the requested kind at the requested box.
 *
 * The single cast on the way out is unavoidable: the switch is exhaustive and
 * every arm returns the node matching its own `kind`, but TypeScript cannot
 * correlate the narrowed literal inside the switch with the generic `K` outside
 * it. Everything downstream gets a precisely typed node.
 */
export function createNode<K extends NodeKind>(
  kind: K,
  frame: Omit<Frame, 'rotation'>,
): NodeOfKind<K> {
  const shared = { ...BASE, ...frame, id: uid(kind[0]) };
  const shapeDefaults = { fill: '#e2e8f0', stroke: '#94a3b8', strokeWidth: 0 };

  let node: EditorNode;
  switch (kind) {
    case 'text':
      node = {
        ...shared,
        kind: 'text',
        name: 'Text',
        text: 'Double-click to edit',
        fontFamily: 'Playfair Display, Georgia, serif',
        fontSize: 40,
        fontWeight: 600,
        fontStyle: 'normal',
        underline: false,
        letterSpacing: 0,
        lineHeight: 1.25,
        align: 'center',
        verticalAlign: 'middle',
        textTransform: 'none',
        color: '#0f172a',
      };
      break;
    case 'image':
      node = { ...shared, kind: 'image', name: 'Image', src: '', fit: 'contain', radius: 0 };
      break;
    case 'ellipse':
      node = { ...shared, kind: 'ellipse', name: 'Ellipse', ...shapeDefaults, radius: 0 };
      break;
    default:
      node = { ...shared, kind: 'rect', name: 'Rectangle', ...shapeDefaults, radius: 8 };
  }
  return node as NodeOfKind<K>;
}

/** Default size for a tool used with a click rather than a drag. */
export const DEFAULT_SIZE: Record<NodeKind, { width: number; height: number }> = {
  text: { width: 420, height: 60 },
  image: { width: 200, height: 200 },
  rect: { width: 220, height: 140 },
  ellipse: { width: 160, height: 160 },
};

export const frameOf = (n: EditorNode): Frame => ({
  x: n.x,
  y: n.y,
  width: n.width,
  height: n.height,
  rotation: n.rotation,
});

export const withFrame = <T extends EditorNode>(node: T, frame: Frame): T => ({
  ...node,
  x: frame.x,
  y: frame.y,
  width: frame.width,
  height: frame.height,
  rotation: normalizeAngle(frame.rotation),
});

/**
 * Scale the properties that are measured in page units but are *not* part of the
 * frame: font size, letter spacing, stroke, corner radius.
 *
 * This is what separates "resize" from "scale". A plain resize reflows the text
 * inside a bigger box; a scale enlarges the type along with it.
 */
export function scaleNodeProps<T extends EditorNode>(node: T, factor: number): T {
  if (!Number.isFinite(factor) || factor <= 0 || factor === 1) return node;

  if (node.kind === 'text') {
    return {
      ...node,
      fontSize: Math.max(1, node.fontSize * factor),
      letterSpacing: node.letterSpacing * factor,
    };
  }
  if (node.kind === 'rect' || node.kind === 'ellipse') {
    return {
      ...node,
      strokeWidth: node.strokeWidth * factor,
      radius: node.radius * factor,
    };
  }
  if (node.kind === 'image') {
    return { ...node, radius: node.radius * factor };
  }
  return node;
}

/** Replace nodes by id. Nodes not in `ids` are returned by reference. */
export function mapNodes(
  doc: EditorDocument,
  ids: Iterable<string>,
  fn: (node: EditorNode) => EditorNode,
): EditorDocument {
  const set = ids instanceof Set ? ids : new Set(ids);
  if (set.size === 0) return doc;
  return { ...doc, nodes: doc.nodes.map((n) => (set.has(n.id) ? fn(n) : n)) };
}

export const removeNodes = (doc: EditorDocument, ids: Set<string>): EditorDocument => ({
  ...doc,
  nodes: doc.nodes.filter((n) => !ids.has(n.id)),
});

export function duplicateNodes(
  doc: EditorDocument,
  ids: Set<string>,
  offset = 16,
): { doc: EditorDocument; newIds: string[] } {
  const clones = doc.nodes
    .filter((n) => ids.has(n.id))
    .map((n) => ({ ...n, id: uid(n.kind[0]), x: n.x + offset, y: n.y + offset }));
  return {
    doc: { ...doc, nodes: [...doc.nodes, ...clones] },
    newIds: clones.map((c) => c.id),
  };
}

export type ReorderCommand = 'front' | 'forward' | 'backward' | 'back';

/**
 * Move the selected nodes through the paint order.
 *
 * `forward`/`backward` walk one step at a time and keep the selection's relative
 * order intact, which is why this is a scan rather than a swap.
 */
export function reorderNodes(
  doc: EditorDocument,
  ids: Set<string>,
  command: ReorderCommand,
): EditorDocument {
  if (ids.size === 0) return doc;
  const selected = doc.nodes.filter((n) => ids.has(n.id));
  const rest = doc.nodes.filter((n) => !ids.has(n.id));

  if (command === 'front') return { ...doc, nodes: [...rest, ...selected] };
  if (command === 'back') return { ...doc, nodes: [...selected, ...rest] };

  const nodes = [...doc.nodes];
  const step = command === 'forward' ? 1 : -1;
  // Walk from the edge we're moving toward, so nodes never leapfrog each other.
  const order = step === 1 ? [...nodes.keys()].reverse() : [...nodes.keys()];
  for (const i of order) {
    const target = i + step;
    if (!ids.has(nodes[i].id)) continue;
    if (target < 0 || target >= nodes.length) continue;
    if (ids.has(nodes[target].id)) continue;
    [nodes[i], nodes[target]] = [nodes[target], nodes[i]];
  }
  return { ...doc, nodes };
}

/** A starter certificate so the canvas is never an empty void. */
export function createStarterDocument(): EditorDocument {
  const page = PAGE_PRESETS['a4-landscape'];
  const center = (width: number) => (page.width - width) / 2;

  const border = createNode('rect', { x: 40, y: 40, width: page.width - 80, height: page.height - 80 });
  const title = createNode('text', { x: center(700), y: 150, width: 700, height: 70 });
  const subtitle = createNode('text', { x: center(600), y: 236, width: 600, height: 34 });
  const name = createNode('text', { x: center(800), y: 300, width: 800, height: 90 });
  const rule = createNode('rect', { x: center(520), y: 400, width: 520, height: 2 });
  const body = createNode('text', { x: center(680), y: 424, width: 680, height: 70 });
  const seal = createNode('ellipse', { x: page.width / 2 - 60, y: 560, width: 120, height: 120 });
  const signature = createNode('text', { x: 180, y: 630, width: 300, height: 40 });
  const date = createNode('text', { x: page.width - 480, y: 630, width: 300, height: 40 });

  return {
    page,
    nodes: [
      {
        ...border,
        name: 'Border',
        fill: 'transparent',
        stroke: '#c9a227',
        strokeWidth: 3,
        radius: 4,
        locked: true,
      },
      {
        ...title,
        name: 'Title',
        text: 'Certificate of Achievement',
        fontSize: 52,
        fontWeight: 700,
        letterSpacing: 1,
        color: '#0f172a',
      },
      {
        ...subtitle,
        name: 'Subtitle',
        text: 'This is to certify that',
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 20,
        fontWeight: 400,
        color: '#64748b',
        textTransform: 'uppercase',
        letterSpacing: 3,
      },
      {
        ...name,
        name: 'Recipient',
        text: '{{recipientName}}',
        fontFamily: 'Great Vibes, cursive',
        fontSize: 72,
        fontWeight: 400,
        color: '#0f172a',
      },
      {
        ...rule,
        name: 'Rule',
        fill: '#c9a227',
        strokeWidth: 0,
        radius: 0,
      },
      {
        ...body,
        name: 'Body',
        text: 'has successfully completed {{programName}}\non {{issueDate}}',
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 20,
        fontWeight: 400,
        lineHeight: 1.6,
        color: '#475569',
      },
      {
        ...seal,
        name: 'Seal',
        fill: '#fef3c7',
        stroke: '#c9a227',
        strokeWidth: 4,
      },
      {
        ...signature,
        name: 'Signature',
        text: '{{signatoryName}}',
        fontFamily: 'Dancing Script, cursive',
        fontSize: 30,
        color: '#0f172a',
      },
      {
        ...date,
        name: 'Date',
        text: '{{issueDate}}',
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 18,
        fontWeight: 400,
        color: '#475569',
      },
    ],
  };
}
