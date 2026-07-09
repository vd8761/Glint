/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/** A point, or a size, or a delta. Whatever two numbers you need. */
export interface Vec {
  x: number;
  y: number;
}

/** An axis-aligned rectangle. `x`/`y` are the top-left corner. */
export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * A box plus a rotation, in degrees, clockwise, about the box's *center*.
 *
 * Every node in the document has a frame. Because rotation is about the
 * center, `x`/`y`/`width`/`height` always describe the node's unrotated
 * geometry — they never change when you rotate. This is the single most
 * important invariant in the editor: everything else (resize, snapping,
 * hit-testing) is derived from it.
 */
export interface Frame extends Box {
  /** Degrees, clockwise. Normalized to [0, 360). */
  rotation: number;
}

/** The eight resize handles, named by compass direction on the unrotated box. */
export type HandleId = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

export type NodeKind = 'text' | 'image' | 'rect' | 'ellipse';

export interface BaseNode extends Frame {
  id: string;
  kind: NodeKind;
  name: string;
  /** 0..1 */
  opacity: number;
  /** Locked nodes ignore pointer input and cannot be selected on the canvas. */
  locked: boolean;
  hidden: boolean;
}

export interface TextNode extends BaseNode {
  kind: 'text';
  /** May contain `{{placeholder}}` markers, which render as chips in the editor. */
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  fontStyle: 'normal' | 'italic';
  underline: boolean;
  letterSpacing: number;
  /** Multiplier, not px. */
  lineHeight: number;
  align: 'left' | 'center' | 'right';
  verticalAlign: 'top' | 'middle' | 'bottom';
  textTransform: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  color: string;
}

export interface ImageNode extends BaseNode {
  kind: 'image';
  src: string;
  fit: 'contain' | 'cover';
  radius: number;
}

interface ShapeBase extends BaseNode {
  fill: string;
  stroke: string;
  strokeWidth: number;
  radius: number;
}

/**
 * Rect and ellipse are separate interfaces rather than one with a union `kind`,
 * so that `Extract<EditorNode, { kind: 'rect' }>` resolves to something useful.
 * A single interface with `kind: 'rect' | 'ellipse'` extracts to `never`.
 */
export interface RectNode extends ShapeBase {
  kind: 'rect';
}

export interface EllipseNode extends ShapeBase {
  kind: 'ellipse';
  /** Unused: an ellipse is already fully round. Kept so shapes share one shape. */
  radius: number;
}

export type ShapeNode = RectNode | EllipseNode;

export type EditorNode = TextNode | ImageNode | RectNode | EllipseNode;

/** The concrete node type for a given `kind`. */
export type NodeOfKind<K extends NodeKind> = Extract<EditorNode, { kind: K }>;

export interface PageSpec {
  width: number;
  height: number;
  background: string;
}

export interface EditorDocument {
  page: PageSpec;
  /** Paint order: index 0 is the bottom of the stack. */
  nodes: EditorNode[];
}

/**
 * The camera. Maps page coordinates to screen coordinates as
 * `screen = page * zoom + offset`, i.e. CSS `translate(x, y) scale(zoom)`
 * with `transform-origin: 0 0`.
 */
export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

/** A snap line, in page coordinates, with the span it should be drawn across. */
export interface SnapGuide {
  axis: 'x' | 'y';
  /** Page coordinate of the line: an x for vertical guides, a y for horizontal ones. */
  position: number;
  /** Extent along the *other* axis, so the guide only spans the shapes it relates. */
  start: number;
  end: number;
}
