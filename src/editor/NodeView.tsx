/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { memo, useEffect, useRef } from 'react';
import type { EditorNode, ImageNode, ShapeNode, TextNode } from './types';

/** `{{recipientName}}` and friends. Captured so `split` keeps the delimiters. */
const PLACEHOLDER = /(\{\{\s*[\w.-]+\s*\}\})/g;

/** Render `{{token}}` runs as chips so a template's variables are visible at a glance. */
function renderText(text: string): React.ReactNode {
  return text.split(PLACEHOLDER).map((part, i) =>
    part.startsWith('{{') && part.endsWith('}}') ? (
      <span
        key={i}
        className="rounded-[0.15em] bg-sky-500/12 px-[0.12em] text-inherit ring-1 ring-sky-500/25 ring-inset"
      >
        {part}
      </span>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    ),
  );
}

const JUSTIFY = { top: 'flex-start', middle: 'center', bottom: 'flex-end' } as const;

const textStyle = (node: TextNode): React.CSSProperties => ({
  fontFamily: node.fontFamily,
  fontSize: node.fontSize,
  fontWeight: node.fontWeight,
  fontStyle: node.fontStyle,
  textDecoration: node.underline ? 'underline' : 'none',
  letterSpacing: node.letterSpacing,
  lineHeight: node.lineHeight,
  textAlign: node.align,
  textTransform: node.textTransform,
  color: node.color,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  width: '100%',
  outline: 'none',
});

interface TextEditorProps {
  node: TextNode;
  onCommitText: (text: string) => void;
  onCancelEdit: () => void;
}

/**
 * The editable text box, mounted only while editing.
 *
 * It is uncontrolled — React must not own the children while the browser's
 * editing machinery does — which is exactly why it is rendered under its own key,
 * as a sibling alternative to the read-only view rather than the same `<div>` with
 * `contentEditable` toggled. Toggling in place leaves React believing the element
 * has no children while the browser fills it with text nodes; on the way out React
 * appends the rendered spans *alongside* that orphaned text instead of replacing
 * it, and the node's content silently doubles. Keying it forces a real
 * unmount/mount, so the DOM is always rebuilt from the committed value.
 */
function TextEditor({ node, onCommitText, onCancelEdit }: TextEditorProps) {
  const ref = useRef<HTMLDivElement>(null);
  // Escape must discard. Removing a focused element can still fire `focusout`,
  // and that would otherwise commit the text Escape just threw away.
  const cancelled = useRef(false);
  // Blur is only meaningful once we have deliberately taken focus. See below.
  const focused = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.innerText = node.text;

    // Focus and select on the next frame, not now.
    //
    // This element was mounted from inside the `pointerdown` that opened it, which
    // means the browser has not yet run that event's default actions. Two of them
    // would undo anything we do here: focus resolution still points at the
    // read-only element React just detached, so it would blur us straight back to
    // <body>; and the `dblclick` that follows replaces any selection with a word
    // selection. Waiting a frame puts us last.
    const frame = requestAnimationFrame(() => {
      const current = ref.current;
      if (!current) return;
      current.focus({ preventScroll: true });

      const range = document.createRange();
      range.selectNodeContents(current);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      focused.current = true;
    });
    return () => cancelAnimationFrame(frame);
    // Mount only. The element is keyed, so every edit session is a fresh mount,
    // and re-seeding on each keystroke would fight the caret.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      role="textbox"
      aria-label={`Edit ${node.name}`}
      tabIndex={0}
      style={textStyle(node)}
      className="cursor-text ring-2 ring-sky-500"
      // Keep presses inside the text from reaching the stage, which would start a
      // marquee and steal the caret.
      onPointerDown={(e) => e.stopPropagation()}
      onBlur={(e) => {
        // Ignore the spurious blur the opening click produces before we have taken
        // focus; committing there would close the editor the instant it opened.
        if (cancelled.current || !focused.current) return;
        onCommitText(e.currentTarget.innerText);
      }}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Escape') {
          e.preventDefault();
          cancelled.current = true;
          onCancelEdit();
        }
      }}
    />
  );
}

function ImageBody({ node }: { node: ImageNode }) {
  if (!node.src) {
    return (
      <div
        className="flex h-full w-full items-center justify-center border-2 border-dashed border-slate-300 bg-slate-50 text-slate-400"
        style={{ borderRadius: node.radius }}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="m21 15-5-5L5 21" />
        </svg>
      </div>
    );
  }
  return (
    <img
      src={node.src}
      alt={node.name}
      draggable={false}
      className="h-full w-full select-none"
      style={{ objectFit: node.fit, borderRadius: node.radius }}
    />
  );
}

function ShapeBody({ node }: { node: ShapeNode }) {
  return (
    <div
      className="h-full w-full"
      style={{
        background: node.fill,
        border: node.strokeWidth > 0 ? `${node.strokeWidth}px solid ${node.stroke}` : undefined,
        borderRadius: node.kind === 'ellipse' ? '50%' : node.radius,
      }}
    />
  );
}

export interface NodeViewProps {
  node: EditorNode;
  editing: boolean;
  /**
   * Also carries double-click: the stage detects it from the press sequence.
   * A `dblclick` listener here would never fire, because the stage takes pointer
   * capture on press, and capture retargets the subsequent click to itself.
   */
  onPointerDown: (id: string, event: React.PointerEvent) => void;
  onCommitText: (id: string, text: string) => void;
  onCancelEdit: () => void;
}

/**
 * One node, positioned in page coordinates inside the zoomed layer.
 *
 * `rotate()` is applied about the element's own center, which is exactly the
 * convention `Frame.rotation` promises, so the DOM and the geometry module agree
 * without any correction term.
 */
export const NodeView = memo(function NodeView({
  node,
  editing,
  onPointerDown,
  onCommitText,
  onCancelEdit,
}: NodeViewProps) {
  if (node.hidden) return null;

  return (
    <div
      data-node-id={node.id}
      className="absolute flex"
      style={{
        left: node.x,
        top: node.y,
        width: node.width,
        height: node.height,
        transform: `rotate(${node.rotation}deg)`,
        transformOrigin: '50% 50%',
        opacity: node.opacity,
        alignItems: node.kind === 'text' ? JUSTIFY[node.verticalAlign] : 'stretch',
        // Locked nodes are scenery: visible, never grabbable.
        pointerEvents: node.locked ? 'none' : 'auto',
        cursor: editing ? 'text' : 'move',
      }}
      onPointerDown={(e) => !editing && onPointerDown(node.id, e)}
    >
      {node.kind === 'text' ? (
        // Distinct keys: see TextEditor. These must never reconcile onto the same
        // DOM element.
        editing ? (
          <TextEditor
            key="edit"
            node={node}
            onCommitText={(text) => onCommitText(node.id, text)}
            onCancelEdit={onCancelEdit}
          />
        ) : (
          <div key="view" style={textStyle(node)}>
            {renderText(node.text)}
          </div>
        )
      ) : node.kind === 'image' ? (
        <ImageBody node={node} />
      ) : (
        <ShapeBody node={node} />
      )}
    </div>
  );
});
