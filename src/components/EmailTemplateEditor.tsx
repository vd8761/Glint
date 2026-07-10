/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Freeform email designer. The issuer arranges text, image, button, and divider
 * blocks on a 600px artboard — drag to move, handles to resize, inspector for
 * typography and colour — and the same document is compiled to email-safe HTML
 * by lib/emailTemplateHtml.ts for both the live preview and the real send.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlignCenter, AlignLeft, AlignRight, Bold, Copy, Eye, Image as ImageIcon, Italic,
  LayoutTemplate, List, Minus, MousePointer2, PenLine, RotateCcw, Trash2, Type,
  Underline, Upload, X,
} from 'lucide-react';
import {
  EMAIL_CANVAS_WIDTH, EMAIL_FONT_STACKS, EMAIL_PLACEHOLDERS, DIGEST_PLACEHOLDERS,
  defaultEmailTemplate, defaultDigestTemplate, newBlockId, renderEmailHtml, renderEmailSubject,
  sampleEmailVars, sampleDigestVars,
  type EmailBlock, type EmailTemplateDoc,
} from '../../lib/emailTemplateHtml';

type EditorMode = 'issuance' | 'digest';

interface EmailTemplateEditorProps {
  initial: EmailTemplateDoc | undefined;
  brandName: string;
  primaryColor: string;
  isSaving: boolean;
  /** 'issuance' = per-recipient email; 'digest' = list of links to one address. */
  mode?: EditorMode;
  onSave: (doc: EmailTemplateDoc) => void;
  onCancel: () => void;
}

type DragState =
  | { kind: 'move'; id: string; startX: number; startY: number; origX: number; origY: number }
  | {
      kind: 'resize'; id: string; handle: string; startX: number; startY: number;
      orig: { x: number; y: number; width: number; height: number };
    }
  | null;

const MIN_W = 20;
const SNAP = 6;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

function makeBlock(type: EmailBlock['type'], accent: string): EmailBlock {
  const base = { id: newBlockId(), x: 40, y: 40, fontFamily: EMAIL_FONT_STACKS[0].value };
  switch (type) {
    case 'text':
      return {
        ...base, type, width: 520, height: 24, text: 'New text block',
        fontSize: 14, fontWeight: 'normal', color: '#334155', align: 'left', lineHeight: 1.5,
      };
    case 'button':
      return {
        ...base, type, x: 185, width: 230, height: 44, text: 'Open certificate', href: '{{link}}',
        fontSize: 14, fontWeight: 'bold', color: '#ffffff', backgroundColor: accent,
        borderRadius: 8, align: 'center',
      };
    case 'image':
      return { ...base, type, width: 200, height: 120, imageUrl: '', borderRadius: 0 };
    case 'divider':
      return { ...base, type, width: 520, height: 1, backgroundColor: '#e2e8f0' };
    case 'certificateList':
      return {
        ...base, type, width: 520, height: 200,
        color: '#0f172a', backgroundColor: accent, borderRadius: 8,
      };
  }
}

/* ── Small labelled controls, Cloudflare-flat ─────────────────────────────── */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="block text-[11px] font-medium text-slate-500">{label}</label>
      {children}
    </div>
  );
}

function NumberInput({ value, onChange, min = 0, max = 8000, step = 1 }: {
  value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number;
}) {
  return (
    <input
      type="number"
      value={Math.round(value)}
      min={min} max={max} step={step}
      onChange={(e) => {
        const parsed = Number(e.target.value);
        if (!Number.isNaN(parsed)) onChange(clamp(parsed, min, max));
      }}
      className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[13px] text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
    />
  );
}

function ColorInput({ value, onChange, allowClear }: {
  value: string; onChange: (v: string) => void; allowClear?: boolean;
}) {
  const isColor = /^#/.test(value);
  return (
    <div className="flex items-center gap-1.5">
      <input
        type="color"
        value={isColor ? value : '#ffffff'}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 w-9 shrink-0 cursor-pointer rounded-md border border-slate-300 bg-white p-0.5"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 font-mono text-[12px] text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
      {allowClear && (
        <button
          type="button"
          title="No fill"
          onClick={() => onChange('transparent')}
          className="rounded-md border border-slate-300 p-1.5 text-slate-500 hover:bg-slate-50 hover:text-slate-900"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

function ToggleButton({ active, onClick, title, children }: {
  active: boolean; onClick: () => void; title: string; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`flex h-8 flex-1 items-center justify-center rounded-md border text-slate-700 transition-colors ${
        active ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-300 bg-white hover:bg-slate-50'
      }`}
    >
      {children}
    </button>
  );
}

/* ── Block rendering on the design canvas (mirrors the compiled HTML) ─────── */

function CanvasBlock({ block }: { block: EmailBlock }) {
  const common: React.CSSProperties = {
    width: '100%',
    height: '100%',
    borderRadius: block.borderRadius ?? 0,
  };
  if (block.type === 'divider') {
    return <div style={{ ...common, background: block.backgroundColor ?? '#e2e8f0' }} />;
  }
  if (block.type === 'image') {
    if (!block.imageUrl) {
      return (
        <div style={common} className="flex items-center justify-center border border-dashed border-slate-300 bg-slate-50 text-slate-400">
          <ImageIcon className="h-6 w-6" />
        </div>
      );
    }
    return <img src={block.imageUrl} alt="" style={{ ...common, objectFit: 'cover', display: 'block' }} draggable={false} />;
  }
  if (block.type === 'certificateList') {
    // Preview: two sample link cards so the issuer sees the shape of the list.
    const accent = block.backgroundColor && block.backgroundColor !== 'transparent' ? block.backgroundColor : '#2563eb';
    const showProgram = block.showProgram !== false;
    const showDate = block.showDate !== false;
    const linkLabel = block.linkLabel ?? 'View certificate →';
    const samples = [
      { name: 'Alex Rivera', program: 'Advanced Data Architecture', date: '2026-07-10' },
      { name: 'Jordan Vance', program: 'Advanced Data Architecture', date: '2026-07-10' },
    ];
    return (
      <div style={{ ...common, overflow: 'hidden', fontFamily: block.fontFamily }}>
        {block.intro && <div style={{ fontSize: 13, color: '#475569', marginBottom: 8 }}>{block.intro}</div>}
        {samples.map((s, i) => {
          const meta = [showProgram ? s.program : '', showDate ? s.date : ''].filter(Boolean).join(' · ');
          return (
            <div key={i} style={{ border: '1px solid #e2e8f0', borderRadius: block.borderRadius ?? 8, padding: '10px 12px', marginBottom: 8 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: block.color ?? '#0f172a' }}>{s.name}</div>
              {meta && <div style={{ fontSize: 12, color: '#64748b', margin: '2px 0 4px' }}>{meta}</div>}
              <span style={{ fontSize: 13, fontWeight: 600, color: accent }}>{linkLabel}</span>
            </div>
          );
        })}
        <div style={{ fontSize: 11, color: '#94a3b8' }}>…one card per selected certificate</div>
      </div>
    );
  }
  const textStyle: React.CSSProperties = {
    ...common,
    fontFamily: block.fontFamily,
    fontSize: block.fontSize ?? 14,
    fontWeight: block.fontWeight === 'bold' ? 700 : 400,
    fontStyle: block.fontStyle ?? 'normal',
    textDecoration: block.textDecoration ?? 'none',
    color: block.color ?? '#0f172a',
    textAlign: block.align ?? 'left',
    lineHeight: block.lineHeight ?? 1.4,
    letterSpacing: block.letterSpacing ? `${block.letterSpacing}px` : undefined,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    overflow: 'hidden',
  };
  if (block.type === 'button') {
    return (
      <div style={{
        ...textStyle,
        background: block.backgroundColor ?? '#0f172a',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        lineHeight: 1,
      }}>
        {block.text}
      </div>
    );
  }
  const hasBg = block.backgroundColor && block.backgroundColor !== 'transparent';
  return (
    <div style={{ ...textStyle, background: hasBg ? block.backgroundColor : undefined, padding: hasBg ? '10px 14px' : undefined }}>
      {block.text}
    </div>
  );
}

const HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as const;
const HANDLE_POS: Record<string, React.CSSProperties> = {
  nw: { top: -4, left: -4, cursor: 'nwse-resize' },
  n: { top: -4, left: 'calc(50% - 4px)', cursor: 'ns-resize' },
  ne: { top: -4, right: -4, cursor: 'nesw-resize' },
  e: { top: 'calc(50% - 4px)', right: -4, cursor: 'ew-resize' },
  se: { bottom: -4, right: -4, cursor: 'nwse-resize' },
  s: { bottom: -4, left: 'calc(50% - 4px)', cursor: 'ns-resize' },
  sw: { bottom: -4, left: -4, cursor: 'nesw-resize' },
  w: { top: 'calc(50% - 4px)', left: -4, cursor: 'ew-resize' },
};

/* ── The editor ───────────────────────────────────────────────────────────── */

export function EmailTemplateEditor({
  initial, brandName, primaryColor, isSaving, mode: editorMode = 'issuance', onSave, onCancel,
}: EmailTemplateEditorProps) {
  const isDigest = editorMode === 'digest';
  const buildDefault = () => (isDigest ? defaultDigestTemplate(primaryColor) : defaultEmailTemplate(primaryColor));
  const placeholders = isDigest ? DIGEST_PLACEHOLDERS : EMAIL_PLACEHOLDERS;

  const [doc, setDoc] = useState<EmailTemplateDoc>(() => initial ?? buildDefault());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<'design' | 'preview'>('design');
  const [drag, setDrag] = useState<DragState>(null);
  const [snapLines, setSnapLines] = useState<{ v?: number; h?: number }>({});
  const canvasRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selected = doc.blocks.find((b) => b.id === selectedId) ?? null;

  const updateBlock = useCallback((id: string, patch: Partial<EmailBlock>) => {
    setDoc((d) => ({ ...d, blocks: d.blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)) }));
  }, []);

  const updateCanvas = (patch: Partial<EmailTemplateDoc['canvas']>) =>
    setDoc((d) => ({ ...d, canvas: { ...d.canvas, ...patch } }));

  const addBlock = (type: EmailBlock['type']) => {
    const block = makeBlock(type, primaryColor);
    // Drop new blocks below the current content so they never hide under others.
    const bottom = doc.blocks.reduce((acc, b) => Math.max(acc, b.y + b.height), 24);
    block.y = clamp(bottom + 16, 0, doc.canvas.height - block.height);
    setDoc((d) => ({
      ...d,
      canvas: { ...d.canvas, height: Math.max(d.canvas.height, block.y + block.height + 40) },
      blocks: [...d.blocks, block],
    }));
    setSelectedId(block.id);
    setMode('design');
  };

  const removeBlock = (id: string) => {
    setDoc((d) => ({ ...d, blocks: d.blocks.filter((b) => b.id !== id) }));
    setSelectedId((cur) => (cur === id ? null : cur));
  };

  const duplicateBlock = (id: string) => {
    const src = doc.blocks.find((b) => b.id === id);
    if (!src) return;
    const copy: EmailBlock = { ...src, id: newBlockId(), x: clamp(src.x + 16, 0, EMAIL_CANVAS_WIDTH - src.width), y: clamp(src.y + 16, 0, doc.canvas.height - src.height) };
    setDoc((d) => ({ ...d, blocks: [...d.blocks, copy] }));
    setSelectedId(copy.id);
  };

  const insertPlaceholder = (token: string) => {
    if (selected && (selected.type === 'text' || selected.type === 'button')) {
      updateBlock(selected.id, { text: `${selected.text ?? ''}${selected.text ? ' ' : ''}${token}` });
      contentRef.current?.focus();
      return;
    }
    const block = makeBlock('text', primaryColor);
    block.text = token;
    const bottom = doc.blocks.reduce((acc, b) => Math.max(acc, b.y + b.height), 24);
    block.y = clamp(bottom + 16, 0, doc.canvas.height - block.height);
    setDoc((d) => ({ ...d, blocks: [...d.blocks, block] }));
    setSelectedId(block.id);
  };

  /* ── Pointer interactions ── */

  // Pointer capture keeps fast drags glued to the block, but capture is not
  // available for every pointer type — losing it must not abort the drag.
  const tryCapture = (e: React.PointerEvent) => {
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch { /* drag still works via the canvas-level move handler */ }
  };

  const beginMove = (e: React.PointerEvent, block: EmailBlock) => {
    if (mode !== 'design') return;
    e.preventDefault();
    tryCapture(e);
    setSelectedId(block.id);
    setDrag({ kind: 'move', id: block.id, startX: e.clientX, startY: e.clientY, origX: block.x, origY: block.y });
  };

  const beginResize = (e: React.PointerEvent, block: EmailBlock, handle: string) => {
    e.preventDefault();
    e.stopPropagation();
    tryCapture(e);
    setDrag({
      kind: 'resize', id: block.id, handle,
      startX: e.clientX, startY: e.clientY,
      orig: { x: block.x, y: block.y, width: block.width, height: block.height },
    });
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    const block = doc.blocks.find((b) => b.id === drag.id);
    if (!block) return;

    if (drag.kind === 'move') {
      let x = clamp(drag.origX + dx, 0, EMAIL_CANVAS_WIDTH - block.width);
      let y = clamp(drag.origY + dy, 0, doc.canvas.height - block.height);
      const lines: { v?: number; h?: number } = {};
      // Snap to horizontal centre and the default 40px gutters.
      const centerX = (EMAIL_CANVAS_WIDTH - block.width) / 2;
      if (Math.abs(x - centerX) < SNAP) { x = centerX; lines.v = EMAIL_CANVAS_WIDTH / 2; }
      else if (Math.abs(x - 40) < SNAP) { x = 40; lines.v = 40; }
      else if (Math.abs(x + block.width - (EMAIL_CANVAS_WIDTH - 40)) < SNAP) { x = EMAIL_CANVAS_WIDTH - 40 - block.width; lines.v = EMAIL_CANVAS_WIDTH - 40; }
      setSnapLines(lines);
      updateBlock(block.id, { x: Math.round(x), y: Math.round(y) });
      return;
    }

    const { orig, handle } = drag;
    let { x, y, width, height } = orig;
    const minH = block.type === 'divider' ? 1 : 12;
    if (handle.includes('e')) width = clamp(orig.width + dx, MIN_W, EMAIL_CANVAS_WIDTH - orig.x);
    if (handle.includes('s')) height = clamp(orig.height + dy, minH, doc.canvas.height - orig.y);
    if (handle.includes('w')) {
      width = clamp(orig.width - dx, MIN_W, orig.x + orig.width);
      x = orig.x + orig.width - width;
    }
    if (handle.includes('n')) {
      height = clamp(orig.height - dy, minH, orig.y + orig.height);
      y = orig.y + orig.height - height;
    }
    updateBlock(block.id, {
      x: Math.round(x), y: Math.round(y), width: Math.round(width), height: Math.round(height),
    });
  };

  const endDrag = () => {
    setDrag(null);
    setSnapLines({});
  };

  /* ── Keyboard ── */

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      if (e.key === 'Escape') {
        if (mode === 'preview') setMode('design');
        else setSelectedId(null);
        return;
      }
      if (typing || !selectedId) return;
      const block = doc.blocks.find((b) => b.id === selectedId);
      if (!block) return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        removeBlock(selectedId);
        return;
      }
      const step = e.shiftKey ? 10 : 1;
      const nudge: Record<string, Partial<EmailBlock>> = {
        ArrowLeft: { x: clamp(block.x - step, 0, EMAIL_CANVAS_WIDTH - block.width) },
        ArrowRight: { x: clamp(block.x + step, 0, EMAIL_CANVAS_WIDTH - block.width) },
        ArrowUp: { y: clamp(block.y - step, 0, doc.canvas.height - block.height) },
        ArrowDown: { y: clamp(block.y + step, 0, doc.canvas.height - block.height) },
      };
      if (nudge[e.key]) {
        e.preventDefault();
        updateBlock(selectedId, nudge[e.key]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedId, doc, mode, updateBlock]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !selected) return;
    if (file.size > 1024 * 1024) {
      alert('Please keep inline email images under 1MB — better yet, host the image and paste an https URL.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => updateBlock(selected.id, { imageUrl: String(reader.result) });
    reader.readAsDataURL(file);
  };

  const previewHtml = useMemo(
    () => renderEmailHtml(doc, isDigest ? sampleDigestVars(brandName) : sampleEmailVars(brandName)),
    [doc, brandName, isDigest],
  );

  const insertButtons: { type: EmailBlock['type']; label: string; icon: React.ReactNode }[] = [
    { type: 'text', label: 'Text', icon: <Type className="h-4 w-4" /> },
    { type: 'button', label: 'Button', icon: <MousePointer2 className="h-4 w-4" /> },
    { type: 'image', label: 'Image', icon: <ImageIcon className="h-4 w-4" /> },
    { type: 'divider', label: 'Divider', icon: <Minus className="h-4 w-4" /> },
    ...(isDigest ? [{ type: 'certificateList' as const, label: 'Cert list', icon: <List className="h-4 w-4" /> }] : []),
  ];

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-slate-100">
      {/* Top bar */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-[13px] font-medium text-slate-700 hover:bg-slate-50"
          >
            ← Back
          </button>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-600 text-white">
              <PenLine className="h-3.5 w-3.5" />
            </span>
            <div className="leading-tight">
              <p className="text-[13px] font-semibold text-slate-900">{isDigest ? 'Digest email designer' : 'Email designer'}</p>
              <p className="text-[11px] text-slate-500">{brandName} · {isDigest ? 'bulk list to one address' : 'issuance notification'}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center rounded-md border border-slate-300 bg-white p-0.5">
          <button
            type="button"
            onClick={() => setMode('design')}
            className={`flex items-center gap-1.5 rounded px-3 py-1 text-[13px] font-medium ${mode === 'design' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <LayoutTemplate className="h-3.5 w-3.5" /> Design
          </button>
          <button
            type="button"
            onClick={() => setMode('preview')}
            className={`flex items-center gap-1.5 rounded px-3 py-1 text-[13px] font-medium ${mode === 'preview' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <Eye className="h-3.5 w-3.5" /> Preview
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (confirm('Replace the current design with the default template?')) {
                setDoc(buildDefault());
                setSelectedId(null);
              }
            }}
            className="flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-[13px] font-medium text-slate-700 hover:bg-slate-50"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={() => onSave(doc)}
            className="rounded-md bg-blue-600 px-4 py-1.5 text-[13px] font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {isSaving ? 'Saving…' : 'Save template'}
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Left rail — insert & placeholders */}
        <aside className="flex w-56 shrink-0 flex-col gap-6 overflow-y-auto border-r border-slate-200 bg-white p-4">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Insert block</p>
            <div className="grid grid-cols-2 gap-2">
              {insertButtons.map((b) => (
                <button
                  key={b.type}
                  type="button"
                  onClick={() => addBlock(b.type)}
                  className="flex flex-col items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 py-3 text-[12px] font-medium text-slate-600 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700"
                >
                  {b.icon}
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Placeholders</p>
            <p className="text-[11px] leading-relaxed text-slate-500">
              {isDigest
                ? 'Click to insert. Values are filled when the digest is sent.'
                : 'Click to insert. Values are filled per recipient when the email is sent.'}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {placeholders.map((p) => (
                <button
                  key={p.token}
                  type="button"
                  title={p.label}
                  onClick={() => insertPlaceholder(p.token)}
                  className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[11px] text-slate-700 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700"
                >
                  {p.token}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Layers</p>
            <div className="space-y-1">
              {[...doc.blocks].sort((a, b) => a.y - b.y).map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => { setSelectedId(b.id); setMode('design'); }}
                  className={`flex w-full items-center gap-2 truncate rounded-md px-2 py-1.5 text-left text-[12px] ${
                    selectedId === b.id ? 'bg-blue-50 font-medium text-blue-700' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {b.type === 'text' && <Type className="h-3 w-3 shrink-0" />}
                  {b.type === 'button' && <MousePointer2 className="h-3 w-3 shrink-0" />}
                  {b.type === 'image' && <ImageIcon className="h-3 w-3 shrink-0" />}
                  {b.type === 'divider' && <Minus className="h-3 w-3 shrink-0" />}
                  {b.type === 'certificateList' && <List className="h-3 w-3 shrink-0" />}
                  <span className="truncate">
                    {b.type === 'divider' ? 'Divider' : b.type === 'image' ? 'Image' : b.type === 'certificateList' ? 'Certificate list' : (b.text || 'Empty').slice(0, 28)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Canvas / preview */}
        <main className="relative min-w-0 flex-1 overflow-auto" style={{ background: mode === 'design' ? doc.canvas.bodyColor : '#f1f5f9' }}>
          {mode === 'design' ? (
            <div className="flex justify-center px-8 py-10" onPointerDown={() => setSelectedId(null)}>
              <div
                ref={canvasRef}
                className="relative shrink-0 border border-slate-200 shadow-sm"
                style={{
                  width: EMAIL_CANVAS_WIDTH,
                  height: doc.canvas.height,
                  background: doc.canvas.backgroundColor,
                  borderRadius: doc.canvas.borderRadius,
                }}
                onPointerMove={onPointerMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                onPointerDown={(e) => e.stopPropagation()}
              >
                {snapLines.v !== undefined && (
                  <div className="pointer-events-none absolute inset-y-0 z-30 w-px bg-blue-500" style={{ left: snapLines.v }} />
                )}

                {doc.blocks.map((block) => {
                  const isSelected = block.id === selectedId;
                  return (
                    <div
                      key={block.id}
                      onPointerDown={(e) => { e.stopPropagation(); beginMove(e, block); }}
                      onPointerMove={onPointerMove}
                      onPointerUp={endDrag}
                      className="absolute select-none"
                      style={{
                        left: block.x, top: block.y, width: block.width, height: block.height,
                        cursor: drag?.kind === 'move' ? 'grabbing' : 'grab',
                        outline: isSelected ? '1.5px solid #2563eb' : undefined,
                        outlineOffset: 1,
                        zIndex: isSelected ? 20 : 10,
                      }}
                    >
                      <CanvasBlock block={block} />
                      {isSelected && HANDLES.map((h) => (
                        <div
                          key={h}
                          onPointerDown={(e) => beginResize(e, block, h)}
                          onPointerMove={onPointerMove}
                          onPointerUp={endDrag}
                          className="absolute z-30 h-2 w-2 rounded-sm border border-blue-600 bg-white"
                          style={HANDLE_POS[h]}
                        />
                      ))}
                      {isSelected && (
                        <div className="absolute -top-6 left-0 z-30 whitespace-nowrap rounded bg-blue-600 px-1.5 py-0.5 font-mono text-[10px] text-white">
                          {Math.round(block.x)}, {Math.round(block.y)} · {Math.round(block.width)}×{Math.round(block.height)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-[720px] px-8 py-10">
              <div className="mb-3 rounded-md border border-slate-200 bg-white px-4 py-3">
                <p className="text-[11px] font-medium text-slate-400">Subject</p>
                <p className="text-[14px] font-medium text-slate-900">
                  {renderEmailSubject(doc.subject, isDigest ? sampleDigestVars(brandName) : sampleEmailVars(brandName))}
                </p>
              </div>
              <iframe
                title="Email preview"
                sandbox=""
                srcDoc={previewHtml}
                className="h-[75vh] w-full rounded-md border border-slate-200 bg-white"
              />
              <p className="mt-2 text-center text-[11px] text-slate-500">
                {isDigest
                  ? 'Rendered with sample certificates — this exact HTML is what the recipient receives.'
                  : 'Rendered with sample recipient data — this exact HTML is what recipients receive.'}
              </p>
            </div>
          )}
        </main>

        {/* Right inspector */}
        <aside className="flex w-72 shrink-0 flex-col gap-5 overflow-y-auto border-l border-slate-200 bg-white p-4">
          {!selected ? (
            <>
              <div className="space-y-1">
                <p className="text-[13px] font-semibold text-slate-900">Email settings</p>
                <p className="text-[11px] text-slate-500">Select a block on the canvas to edit it.</p>
              </div>
              <Field label="Subject line">
                <textarea
                  value={doc.subject}
                  onChange={(e) => setDoc((d) => ({ ...d, subject: e.target.value }))}
                  rows={2}
                  className="w-full resize-none rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[13px] text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Canvas height">
                  <NumberInput value={doc.canvas.height} min={120} max={8000} onChange={(v) => updateCanvas({ height: v })} />
                </Field>
                <Field label="Corner radius">
                  <NumberInput value={doc.canvas.borderRadius} min={0} max={64} onChange={(v) => updateCanvas({ borderRadius: v })} />
                </Field>
              </div>
              <Field label="Card background">
                <ColorInput value={doc.canvas.backgroundColor} onChange={(v) => updateCanvas({ backgroundColor: v })} />
              </Field>
              <Field label="Page background">
                <ColorInput value={doc.canvas.bodyColor} onChange={(v) => updateCanvas({ bodyColor: v })} />
              </Field>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-[13px] font-semibold capitalize text-slate-900">{selected.type} block</p>
                <div className="flex gap-1">
                  <button
                    type="button" title="Duplicate"
                    onClick={() => duplicateBlock(selected.id)}
                    className="rounded-md border border-slate-300 p-1.5 text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button" title="Delete"
                    onClick={() => removeBlock(selected.id)}
                    className="rounded-md border border-slate-300 p-1.5 text-slate-500 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {(selected.type === 'text' || selected.type === 'button') && (
                <>
                  <Field label={selected.type === 'button' ? 'Button label' : 'Content'}>
                    <textarea
                      ref={contentRef}
                      value={selected.text ?? ''}
                      onChange={(e) => updateBlock(selected.id, { text: e.target.value })}
                      rows={selected.type === 'button' ? 2 : 4}
                      className="w-full resize-y rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[13px] text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </Field>

                  {selected.type === 'button' && (
                    <Field label="Link URL">
                      <input
                        type="text"
                        value={selected.href ?? '{{link}}'}
                        onChange={(e) => updateBlock(selected.id, { href: e.target.value })}
                        className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 font-mono text-[12px] text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </Field>
                  )}

                  <Field label="Font">
                    <select
                      value={selected.fontFamily ?? EMAIL_FONT_STACKS[0].value}
                      onChange={(e) => updateBlock(selected.id, { fontFamily: e.target.value })}
                      className="w-full cursor-pointer rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[13px] text-slate-900 focus:border-blue-500 focus:outline-none"
                    >
                      {EMAIL_FONT_STACKS.map((f) => (
                        <option key={f.label} value={f.value}>{f.label}</option>
                      ))}
                    </select>
                  </Field>

                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Size">
                      <NumberInput value={selected.fontSize ?? 14} min={6} max={120} onChange={(v) => updateBlock(selected.id, { fontSize: v })} />
                    </Field>
                    <Field label="Line height">
                      <NumberInput value={(selected.lineHeight ?? 1.4) * 10} min={5} max={40}
                        onChange={(v) => updateBlock(selected.id, { lineHeight: v / 10 })} />
                    </Field>
                  </div>

                  <div className="flex gap-1.5">
                    <ToggleButton
                      title="Bold"
                      active={selected.fontWeight === 'bold'}
                      onClick={() => updateBlock(selected.id, { fontWeight: selected.fontWeight === 'bold' ? 'normal' : 'bold' })}
                    >
                      <Bold className="h-3.5 w-3.5" />
                    </ToggleButton>
                    <ToggleButton
                      title="Italic"
                      active={selected.fontStyle === 'italic'}
                      onClick={() => updateBlock(selected.id, { fontStyle: selected.fontStyle === 'italic' ? 'normal' : 'italic' })}
                    >
                      <Italic className="h-3.5 w-3.5" />
                    </ToggleButton>
                    <ToggleButton
                      title="Underline"
                      active={selected.textDecoration === 'underline'}
                      onClick={() => updateBlock(selected.id, { textDecoration: selected.textDecoration === 'underline' ? 'none' : 'underline' })}
                    >
                      <Underline className="h-3.5 w-3.5" />
                    </ToggleButton>
                    <ToggleButton title="Align left" active={(selected.align ?? 'left') === 'left'} onClick={() => updateBlock(selected.id, { align: 'left' })}>
                      <AlignLeft className="h-3.5 w-3.5" />
                    </ToggleButton>
                    <ToggleButton title="Align centre" active={selected.align === 'center'} onClick={() => updateBlock(selected.id, { align: 'center' })}>
                      <AlignCenter className="h-3.5 w-3.5" />
                    </ToggleButton>
                    <ToggleButton title="Align right" active={selected.align === 'right'} onClick={() => updateBlock(selected.id, { align: 'right' })}>
                      <AlignRight className="h-3.5 w-3.5" />
                    </ToggleButton>
                  </div>

                  <Field label="Text colour">
                    <ColorInput value={selected.color ?? '#0f172a'} onChange={(v) => updateBlock(selected.id, { color: v })} />
                  </Field>
                  <Field label={selected.type === 'button' ? 'Button colour' : 'Background'}>
                    <ColorInput
                      value={selected.backgroundColor ?? (selected.type === 'button' ? primaryColor : 'transparent')}
                      onChange={(v) => updateBlock(selected.id, { backgroundColor: v })}
                      allowClear={selected.type === 'text'}
                    />
                  </Field>
                </>
              )}

              {selected.type === 'image' && (
                <>
                  <Field label="Image URL (https recommended)">
                    <input
                      type="text"
                      placeholder="https://…"
                      value={selected.imageUrl?.startsWith('data:') ? '(uploaded image)' : selected.imageUrl ?? ''}
                      onChange={(e) => updateBlock(selected.id, { imageUrl: e.target.value })}
                      className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 font-mono text-[12px] text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </Field>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-[13px] font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <Upload className="h-3.5 w-3.5" /> Upload image
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={handleImageUpload} />
                  <p className="text-[11px] leading-relaxed text-slate-500">
                    Uploaded images are sent as inline attachments, so they display in Gmail, Outlook, and most clients. Keep them small (under ~1MB) for reliable delivery.
                  </p>
                </>
              )}

              {selected.type === 'divider' && (
                <Field label="Line colour">
                  <ColorInput value={selected.backgroundColor ?? '#e2e8f0'} onChange={(v) => updateBlock(selected.id, { backgroundColor: v })} />
                </Field>
              )}

              {selected.type === 'certificateList' && (
                <>
                  <p className="rounded-md bg-slate-50 px-3 py-2 text-[11px] leading-relaxed text-slate-500">
                    This block expands into one card per selected certificate when the digest is sent.
                  </p>
                  <Field label="Intro line (optional)">
                    <textarea
                      value={selected.intro ?? ''}
                      onChange={(e) => updateBlock(selected.id, { intro: e.target.value })}
                      rows={2}
                      placeholder="e.g. Your team earned these certificates:"
                      className="w-full resize-y rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[13px] text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </Field>
                  <Field label="Link label">
                    <input
                      type="text"
                      value={selected.linkLabel ?? 'View certificate →'}
                      onChange={(e) => updateBlock(selected.id, { linkLabel: e.target.value })}
                      className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[13px] text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </Field>
                  <div className="flex gap-2">
                    <ToggleButton
                      title="Show program name"
                      active={selected.showProgram !== false}
                      onClick={() => updateBlock(selected.id, { showProgram: selected.showProgram === false })}
                    >
                      Program
                    </ToggleButton>
                    <ToggleButton
                      title="Show issue date"
                      active={selected.showDate !== false}
                      onClick={() => updateBlock(selected.id, { showDate: selected.showDate === false })}
                    >
                      Date
                    </ToggleButton>
                  </div>
                  <Field label="Font">
                    <select
                      value={selected.fontFamily ?? EMAIL_FONT_STACKS[0].value}
                      onChange={(e) => updateBlock(selected.id, { fontFamily: e.target.value })}
                      className="w-full cursor-pointer rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[13px] text-slate-900 focus:border-blue-500 focus:outline-none"
                    >
                      {EMAIL_FONT_STACKS.map((f) => (
                        <option key={f.label} value={f.value}>{f.label}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Name colour">
                    <ColorInput value={selected.color ?? '#0f172a'} onChange={(v) => updateBlock(selected.id, { color: v })} />
                  </Field>
                  <Field label="Link colour">
                    <ColorInput value={selected.backgroundColor ?? primaryColor} onChange={(v) => updateBlock(selected.id, { backgroundColor: v })} />
                  </Field>
                </>
              )}

              <div className="space-y-3 border-t border-slate-100 pt-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Position & size</p>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="X">
                    <NumberInput value={selected.x} min={0} max={EMAIL_CANVAS_WIDTH - selected.width} onChange={(v) => updateBlock(selected.id, { x: v })} />
                  </Field>
                  <Field label="Y">
                    <NumberInput value={selected.y} min={0} max={doc.canvas.height - selected.height} onChange={(v) => updateBlock(selected.id, { y: v })} />
                  </Field>
                  <Field label="Width">
                    <NumberInput value={selected.width} min={MIN_W} max={EMAIL_CANVAS_WIDTH} onChange={(v) => updateBlock(selected.id, { width: v })} />
                  </Field>
                  <Field label="Height">
                    <NumberInput value={selected.height} min={selected.type === 'divider' ? 1 : 12} max={doc.canvas.height} onChange={(v) => updateBlock(selected.id, { height: v })} />
                  </Field>
                </div>
                <Field label="Corner radius">
                  <NumberInput value={selected.borderRadius ?? 0} min={0} max={200} onChange={(v) => updateBlock(selected.id, { borderRadius: v })} />
                </Field>
              </div>
            </>
          )}
        </aside>
      </div>

    </div>
  );
}
