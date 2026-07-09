/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Top-level composition: document + selection + keyboard. Everything that needs
 * to know about more than one panel lives here; everything else is a leaf.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { PanelRight } from 'lucide-react';
import { CanvasStage, type Tool } from './CanvasStage';
import { Inspector, type AlignCommand } from './Inspector';
import { Toolbar } from './Toolbar';
import { aabb, unionAabb } from './geometry';
import {
  createStarterDocument,
  duplicateNodes,
  frameOf,
  mapNodes,
  removeNodes,
  reorderNodes,
  type ReorderCommand,
} from './document';
import { useHistory } from './useHistory';
import { useViewport } from './useViewport';
import type { Box, EditorDocument, EditorNode } from './types';

const NUDGE = 1;
const NUDGE_LARGE = 10;

const isTypingTarget = (target: EventTarget | null): boolean => {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName);
};

const TOOL_KEYS: Record<string, Tool> = {
  v: 'select',
  h: 'hand',
  t: 'text',
  r: 'rect',
  o: 'ellipse',
  i: 'image',
};

export interface CertificateEditorProps {
  initialDocument?: EditorDocument;
  /** Fires on every committed edit — debounce before persisting. */
  onChange?: (document: EditorDocument) => void;
  className?: string;
}

export function CertificateEditor({
  initialDocument,
  onChange,
  className = '',
}: CertificateEditorProps) {
  const [initial] = useState(() => initialDocument ?? createStarterDocument());
  const history = useHistory<EditorDocument>(initial);
  const doc = history.present;

  const [selection, setSelection] = useState<string[]>([]);
  const [tool, setTool] = useState<Tool>('select');
  const [scaleMode, setScaleMode] = useState(false);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [spaceDown, setSpaceDown] = useState(false);
  // Only meaningful below `md`, where the panel overlays the canvas. From `md` up
  // the panel is always in the flow and this is ignored.
  const [panelOpen, setPanelOpen] = useState(false);

  const pageBox: Box = useMemo(
    () => ({ x: 0, y: 0, width: doc.page.width, height: doc.page.height }),
    [doc.page.width, doc.page.height],
  );
  const vp = useViewport(pageBox);

  useEffect(() => {
    onChange?.(doc);
  }, [doc, onChange]);

  const selectedNodes = useMemo(() => {
    const set = new Set(selection);
    return doc.nodes.filter((n) => set.has(n.id));
  }, [doc.nodes, selection]);

  const selectionIds = useMemo(() => new Set(selection), [selection]);

  // ------------------------------------------------------------------ actions

  const patch = useCallback(
    (fn: (node: EditorNode) => EditorNode) => {
      history.commit((d) => mapNodes(d, selectionIds, fn));
    },
    [history, selectionIds],
  );

  const remove = useCallback(() => {
    if (selectionIds.size === 0) return;
    history.commit((d) => removeNodes(d, selectionIds));
    setSelection([]);
    setEditingId(null);
  }, [history, selectionIds]);

  const duplicate = useCallback(() => {
    if (selectionIds.size === 0) return;
    const { doc: next, newIds } = duplicateNodes(history.peek(), selectionIds);
    history.commit(() => next);
    setSelection(newIds);
  }, [history, selectionIds]);

  const reorder = useCallback(
    (command: ReorderCommand) => history.commit((d) => reorderNodes(d, selectionIds, command)),
    [history, selectionIds],
  );

  const nudge = useCallback(
    (dx: number, dy: number) => {
      if (selectionIds.size === 0) return;
      history.commit((d) => mapNodes(d, selectionIds, (n) => ({ ...n, x: n.x + dx, y: n.y + dy })));
    },
    [history, selectionIds],
  );

  /**
   * Align against the page when one node is selected, and against the selection's
   * own bounding box when several are. Uses each node's *rotated* bounding box,
   * so a tilted signature lines up by what you can see, not by its unrotated box.
   */
  const align = useCallback(
    (command: AlignCommand) => {
      const nodes = doc.nodes.filter((n) => selectionIds.has(n.id));
      if (nodes.length === 0) return;
      const target = nodes.length > 1 ? unionAabb(nodes.map(frameOf))! : pageBox;

      history.commit((d) =>
        mapNodes(d, selectionIds, (n) => {
          const b = aabb(frameOf(n));
          switch (command) {
            case 'left':
              return { ...n, x: n.x + (target.x - b.x) };
            case 'right':
              return { ...n, x: n.x + (target.x + target.width - (b.x + b.width)) };
            case 'center-x':
              return { ...n, x: n.x + (target.x + target.width / 2 - (b.x + b.width / 2)) };
            case 'top':
              return { ...n, y: n.y + (target.y - b.y) };
            case 'bottom':
              return { ...n, y: n.y + (target.y + target.height - (b.y + b.height)) };
            case 'center-y':
              return { ...n, y: n.y + (target.y + target.height / 2 - (b.y + b.height / 2)) };
          }
        }),
      );
    },
    [doc.nodes, history, pageBox, selectionIds],
  );

  const zoomToSelection = useCallback(() => {
    const box = unionAabb(selectedNodes.map(frameOf));
    if (box) vp.zoomToBox(box, 4);
    else vp.zoomToFit();
  }, [selectedNodes, vp]);

  // ----------------------------------------------------------------- keyboard

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === ' ' && !isTypingTarget(event.target)) {
        event.preventDefault();
        setSpaceDown(true);
        return;
      }
      if (isTypingTarget(event.target)) return;

      const mod = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();

      if (mod) {
        switch (key) {
          case 'z':
            event.preventDefault();
            event.shiftKey ? history.redo() : history.undo();
            return;
          case 'y':
            event.preventDefault();
            history.redo();
            return;
          case 'd':
            event.preventDefault();
            duplicate();
            return;
          case 'a':
            event.preventDefault();
            setSelection(doc.nodes.filter((n) => !n.locked && !n.hidden).map((n) => n.id));
            return;
          case '0':
            event.preventDefault();
            vp.zoomTo(1);
            return;
          case '1':
            event.preventDefault();
            vp.zoomToFit();
            return;
          case '2':
            event.preventDefault();
            zoomToSelection();
            return;
          case '=':
          case '+':
            event.preventDefault();
            vp.stepZoom(1);
            return;
          case '-':
            event.preventDefault();
            vp.stepZoom(-1);
            return;
          case ']':
            event.preventDefault();
            reorder(event.shiftKey ? 'front' : 'forward');
            return;
          case '[':
            event.preventDefault();
            reorder(event.shiftKey ? 'back' : 'backward');
            return;
        }
        return;
      }

      switch (event.key) {
        case 'Escape':
          if (editingId) setEditingId(null);
          else setSelection([]);
          return;
        case 'Delete':
        case 'Backspace':
          event.preventDefault();
          remove();
          return;
        case 'ArrowLeft':
          event.preventDefault();
          nudge(-(event.shiftKey ? NUDGE_LARGE : NUDGE), 0);
          return;
        case 'ArrowRight':
          event.preventDefault();
          nudge(event.shiftKey ? NUDGE_LARGE : NUDGE, 0);
          return;
        case 'ArrowUp':
          event.preventDefault();
          nudge(0, -(event.shiftKey ? NUDGE_LARGE : NUDGE));
          return;
        case 'ArrowDown':
          event.preventDefault();
          nudge(0, event.shiftKey ? NUDGE_LARGE : NUDGE);
          return;
      }

      if (key === 'k') {
        setScaleMode((s) => !s);
        return;
      }
      if (TOOL_KEYS[key]) setTool(TOOL_KEYS[key]);
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === ' ') setSpaceDown(false);
    };
    // Alt-Tabbing away with space held would otherwise strand the hand tool on.
    const onBlur = () => setSpaceDown(false);

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [doc.nodes, duplicate, editingId, history, nudge, remove, reorder, vp, zoomToSelection]);

  // ------------------------------------------------------------------- render

  return (
    <div
      className={`relative flex h-full min-h-0 w-full flex-col bg-white dark:bg-slate-950 ${className}`}
    >
      <Toolbar
        tool={tool}
        setTool={setTool}
        scaleMode={scaleMode}
        setScaleMode={setScaleMode}
        snapEnabled={snapEnabled}
        setSnapEnabled={setSnapEnabled}
        zoom={vp.viewport.zoom}
        onZoomIn={() => vp.stepZoom(1)}
        onZoomOut={() => vp.stepZoom(-1)}
        onZoomFit={vp.zoomToFit}
        onZoomReset={() => vp.zoomTo(1)}
        canUndo={history.canUndo}
        canRedo={history.canRedo}
        onUndo={history.undo}
        onRedo={history.redo}
      />

      <div className="relative flex min-h-0 flex-1">
        <CanvasStage
          history={history}
          vp={vp}
          selection={selection}
          setSelection={setSelection}
          tool={tool}
          setTool={setTool}
          scaleMode={scaleMode}
          snapEnabled={snapEnabled}
          editingId={editingId}
          setEditingId={setEditingId}
          spaceDown={spaceDown}
        />

        <button
          type="button"
          onClick={() => setPanelOpen((v) => !v)}
          title={panelOpen ? 'Hide panel' : 'Show panel'}
          aria-label={panelOpen ? 'Hide panel' : 'Show panel'}
          aria-expanded={panelOpen}
          className="absolute right-3 top-3 z-30 grid h-9 w-9 place-items-center rounded-lg bg-white/90 text-slate-600 shadow-sm ring-1 ring-slate-900/5 backdrop-blur transition-colors hover:bg-white md:hidden dark:bg-slate-800/90 dark:text-slate-300"
        >
          <PanelRight size={17} strokeWidth={1.9} />
        </button>

        {/* Overlays the canvas on narrow screens, sits beside it from `md` up. */}
        <div
          className={[
            panelOpen ? 'flex' : 'hidden',
            'absolute inset-y-0 right-0 z-20 shadow-2xl',
            'md:static md:flex md:shadow-none',
          ].join(' ')}
        >
          <Inspector
            nodes={selectedNodes}
            pageWidth={doc.page.width}
            pageHeight={doc.page.height}
            onPatch={patch}
            onAlign={align}
            onReorder={reorder}
            onDuplicate={duplicate}
            onDelete={remove}
          />
        </div>
      </div>
    </div>
  );
}
