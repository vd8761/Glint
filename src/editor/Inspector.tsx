/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The right-hand panel: exact numbers for the things you just did by hand.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignStartVertical,
  ArrowDownToLine,
  ArrowUpToLine,
  ChevronDown,
  ChevronUp,
  Copy,
  Eye,
  EyeOff,
  Lock,
  RotateCw,
  Trash2,
  Unlock,
} from 'lucide-react';
import { clamp, unionAabb } from './geometry';
import { frameOf } from './document';
import type { ReorderCommand } from './document';
import type { EditorNode, TextNode } from './types';

const Kbd = ({ children }: { children: React.ReactNode }) => (
  <kbd className="rounded border border-slate-300 bg-slate-50 px-1 py-px font-sans text-[9px] font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
    {children}
  </kbd>
);

const MIXED = Symbol('mixed');
type Maybe<T> = T | typeof MIXED;

/** One value if every selected node agrees, otherwise `MIXED`. */
function shared<T>(nodes: EditorNode[], read: (n: EditorNode) => T): Maybe<T> {
  if (nodes.length === 0) return MIXED;
  const first = read(nodes[0]);
  return nodes.every((n) => read(n) === first) ? first : MIXED;
}

// ------------------------------------------------------------------ controls

interface NumberFieldProps {
  label: string;
  value: Maybe<number>;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  icon?: React.ReactNode;
}

/**
 * A number input whose label is a scrub handle — drag it left/right to change the
 * value, the way every design tool works. Typing still works, and commits on
 * blur or Enter.
 */
function NumberField({ label, value, onChange, min, max, step = 1, suffix, icon }: NumberFieldProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const scrub = useRef<{ startX: number; startValue: number } | null>(null);

  const display = draft ?? (value === MIXED ? '' : String(round(value)));
  const placeholder = value === MIXED ? 'Mixed' : '';

  const commit = (raw: string) => {
    setDraft(null);
    const parsed = Number.parseFloat(raw);
    if (Number.isFinite(parsed)) onChange(clampTo(parsed, min, max));
  };

  return (
    <label className="flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-1.5 focus-within:ring-2 focus-within:ring-sky-500 dark:bg-slate-800">
      <span
        title={`${label} — drag to adjust`}
        className="cursor-ew-resize select-none text-[11px] font-medium text-slate-400 dark:text-slate-500"
        onPointerDown={(e) => {
          if (value === MIXED) return;
          e.preventDefault();
          e.currentTarget.setPointerCapture(e.pointerId);
          scrub.current = { startX: e.clientX, startValue: value };
        }}
        onPointerMove={(e) => {
          if (!scrub.current) return;
          const delta = (e.clientX - scrub.current.startX) * step * (e.shiftKey ? 10 : 1);
          onChange(clampTo(scrub.current.startValue + delta, min, max));
        }}
        onPointerUp={(e) => {
          scrub.current = null;
          e.currentTarget.releasePointerCapture?.(e.pointerId);
        }}
      >
        {icon ?? label}
      </span>
      <input
        type="text"
        inputMode="decimal"
        value={display}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            commit(e.currentTarget.value);
            e.currentTarget.blur();
          }
          if (e.key === 'Escape') setDraft(null);
          e.stopPropagation();
        }}
        className="w-full min-w-0 bg-transparent text-xs tabular-nums text-slate-800 outline-none dark:text-slate-100"
        aria-label={label}
      />
      {suffix && <span className="text-[11px] text-slate-400">{suffix}</span>}
    </label>
  );
}

const round = (n: number) => Math.round(n * 100) / 100;
const clampTo = (n: number, min?: number, max?: number) =>
  clamp(n, min ?? Number.NEGATIVE_INFINITY, max ?? Number.POSITIVE_INFINITY);

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-slate-200 px-3 py-3 dark:border-slate-800">
      <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
        {title}
      </h3>
      {children}
    </section>
  );
}

function MiniButton({
  title,
  onClick,
  active,
  children,
}: {
  title: string;
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      onClick={onClick}
      className={[
        'grid h-7 w-7 place-items-center rounded transition-colors',
        active
          ? 'bg-sky-500 text-white'
          : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

// ----------------------------------------------------------------- inspector

export type AlignCommand =
  | 'left'
  | 'center-x'
  | 'right'
  | 'top'
  | 'center-y'
  | 'bottom';

export interface InspectorProps {
  nodes: EditorNode[];
  pageWidth: number;
  pageHeight: number;
  /** Applied to every selected node, as one undo step. */
  onPatch: (patch: (node: EditorNode) => EditorNode) => void;
  onAlign: (command: AlignCommand) => void;
  onReorder: (command: ReorderCommand) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export function Inspector({
  nodes,
  pageWidth,
  pageHeight,
  onPatch,
  onAlign,
  onReorder,
  onDuplicate,
  onDelete,
}: InspectorProps) {
  if (nodes.length === 0) {
    return (
      <aside className="flex h-full w-64 shrink-0 border-l border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <p className="text-xs leading-relaxed text-slate-400">
          Nothing selected.
          <br />
          <br />
          Drag on the canvas to marquee-select. <Kbd>Ctrl</Kbd>+scroll to zoom, <Kbd>Space</Kbd>+drag
          or middle-drag to pan.
        </p>
      </aside>
    );
  }

  const single = nodes.length === 1 ? nodes[0] : null;
  const box = unionAabb(nodes.map(frameOf));
  const multi = nodes.length > 1;

  // X/Y of a multi-selection is meaningless as a single number; W/H still is not,
  // but "mixed" is the honest answer when they differ.
  const x = multi ? MIXED : shared(nodes, (n) => n.x);
  const y = multi ? MIXED : shared(nodes, (n) => n.y);
  const w = shared(nodes, (n) => n.width);
  const h = shared(nodes, (n) => n.height);
  const rotation = shared(nodes, (n) => n.rotation);
  const opacity = shared(nodes, (n) => n.opacity);
  const locked = shared(nodes, (n) => n.locked);
  const hidden = shared(nodes, (n) => n.hidden);

  return (
    <aside
      data-testid="inspector"
      className="flex h-full w-64 shrink-0 flex-col overflow-y-auto border-l border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex items-center justify-between px-3 py-2.5">
        <span className="truncate text-xs font-semibold text-slate-700 dark:text-slate-200">
          {single ? single.name : `${nodes.length} selected`}
        </span>
        <div className="flex items-center gap-0.5">
          <MiniButton title="Duplicate (Ctrl+D)" onClick={onDuplicate}>
            <Copy size={14} />
          </MiniButton>
          <MiniButton
            title={locked === true ? 'Unlock' : 'Lock'}
            onClick={() => onPatch((n) => ({ ...n, locked: locked !== true }))}
          >
            {locked === true ? <Lock size={14} /> : <Unlock size={14} />}
          </MiniButton>
          <MiniButton
            title={hidden === true ? 'Show' : 'Hide'}
            onClick={() => onPatch((n) => ({ ...n, hidden: hidden !== true }))}
          >
            {hidden === true ? <EyeOff size={14} /> : <Eye size={14} />}
          </MiniButton>
          <MiniButton title="Delete (Del)" onClick={onDelete}>
            <Trash2 size={14} />
          </MiniButton>
        </div>
      </div>

      <Section title="Align">
        <div className="flex items-center gap-0.5">
          <MiniButton title="Align left" onClick={() => onAlign('left')}>
            <AlignStartVertical size={14} />
          </MiniButton>
          <MiniButton title="Align horizontal centers" onClick={() => onAlign('center-x')}>
            <AlignCenterVertical size={14} />
          </MiniButton>
          <MiniButton title="Align right" onClick={() => onAlign('right')}>
            <AlignEndVertical size={14} />
          </MiniButton>
          <div className="mx-1 h-5 w-px bg-slate-200 dark:bg-slate-700" />
          <MiniButton title="Align top" onClick={() => onAlign('top')}>
            <AlignStartHorizontal size={14} />
          </MiniButton>
          <MiniButton title="Align vertical centers" onClick={() => onAlign('center-y')}>
            <AlignCenterHorizontal size={14} />
          </MiniButton>
          <MiniButton title="Align bottom" onClick={() => onAlign('bottom')}>
            <AlignEndHorizontal size={14} />
          </MiniButton>
        </div>
        <p className="mt-1.5 text-[10px] text-slate-400">
          {multi ? 'Relative to the selection' : 'Relative to the page'}
        </p>
      </Section>

      <Section title="Transform">
        <div className="grid grid-cols-2 gap-1.5">
          <NumberField
            label="X"
            value={x}
            onChange={(v) => onPatch((n) => ({ ...n, x: v }))}
            min={-pageWidth}
            max={pageWidth * 2}
          />
          <NumberField
            label="Y"
            value={y}
            onChange={(v) => onPatch((n) => ({ ...n, y: v }))}
            min={-pageHeight}
            max={pageHeight * 2}
          />
          <NumberField
            label="W"
            value={w}
            onChange={(v) => onPatch((n) => ({ ...n, width: Math.max(1, v) }))}
            min={1}
          />
          <NumberField
            label="H"
            value={h}
            onChange={(v) => onPatch((n) => ({ ...n, height: Math.max(1, v) }))}
            min={1}
          />
          <NumberField
            label="Rotation"
            icon={<RotateCw size={11} />}
            value={rotation}
            onChange={(v) => onPatch((n) => ({ ...n, rotation: ((v % 360) + 360) % 360 }))}
            suffix="°"
          />
          <NumberField
            label="Opacity"
            value={opacity === MIXED ? MIXED : Math.round(opacity * 100)}
            onChange={(v) => onPatch((n) => ({ ...n, opacity: clamp(v / 100, 0, 1) }))}
            min={0}
            max={100}
            suffix="%"
          />
        </div>
        <p className="mt-2 text-[10px] leading-relaxed text-slate-400">
          Rotation is about the shape&apos;s centre. Box position and size are unrotated.
        </p>
      </Section>

      <Section title="Order">
        <div className="flex items-center gap-0.5">
          <MiniButton title="Bring to front (Ctrl+Shift+])" onClick={() => onReorder('front')}>
            <ArrowUpToLine size={14} />
          </MiniButton>
          <MiniButton title="Bring forward (Ctrl+])" onClick={() => onReorder('forward')}>
            <ChevronUp size={14} />
          </MiniButton>
          <MiniButton title="Send backward (Ctrl+[)" onClick={() => onReorder('backward')}>
            <ChevronDown size={14} />
          </MiniButton>
          <MiniButton title="Send to back (Ctrl+Shift+[)" onClick={() => onReorder('back')}>
            <ArrowDownToLine size={14} />
          </MiniButton>
        </div>
      </Section>

      {single?.kind === 'text' && <TextSection node={single} onPatch={onPatch} />}
      {(single?.kind === 'rect' || single?.kind === 'ellipse') && (
        <Section title="Fill & stroke">
          <div className="space-y-1.5">
            <ColorRow
              label="Fill"
              value={single.fill}
              onChange={(fill) => onPatch((n) => (n.kind === 'rect' || n.kind === 'ellipse' ? { ...n, fill } : n))}
            />
            <ColorRow
              label="Stroke"
              value={single.stroke}
              onChange={(stroke) =>
                onPatch((n) => (n.kind === 'rect' || n.kind === 'ellipse' ? { ...n, stroke } : n))
              }
            />
            <div className="grid grid-cols-2 gap-1.5">
              <NumberField
                label="Width"
                value={single.strokeWidth}
                min={0}
                onChange={(v) =>
                  onPatch((n) =>
                    n.kind === 'rect' || n.kind === 'ellipse' ? { ...n, strokeWidth: v } : n,
                  )
                }
              />
              {single.kind === 'rect' && (
                <NumberField
                  label="Radius"
                  value={single.radius}
                  min={0}
                  onChange={(v) => onPatch((n) => (n.kind === 'rect' ? { ...n, radius: v } : n))}
                />
              )}
            </div>
          </div>
        </Section>
      )}
      {single?.kind === 'image' && <ImageSection node={single} onPatch={onPatch} />}

      <div className="px-3 py-2 text-[10px] leading-relaxed text-slate-400">
        <p className="font-medium text-slate-500 dark:text-slate-400">While dragging</p>
        <p>
          <Kbd>Shift</Kbd> lock axis / ratio / 15° &nbsp;·&nbsp; <Kbd>Alt</Kbd> from centre
          &nbsp;·&nbsp; <Kbd>Alt</Kbd> bypass snapping
        </p>
      </div>
      <div className="grow" />
      <p className="border-t border-slate-200 px-3 py-2 text-center text-[10px] text-slate-400 dark:border-slate-800">
        {box && `${Math.round(box.width)}×${Math.round(box.height)} bounding box`}
      </p>
    </aside>
  );
}

function ColorRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  // `transparent` is a real fill in this editor but not a value <input type=color>
  // can hold, so keep a text field alongside the swatch.
  const swatch = /^#[0-9a-f]{6}$/i.test(value) ? value : '#ffffff';
  return (
    <div className="flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-1 dark:bg-slate-800">
      <span className="w-12 shrink-0 text-[11px] font-medium text-slate-400">{label}</span>
      <input
        type="color"
        value={swatch}
        onChange={(e) => onChange(e.target.value)}
        aria-label={`${label} colour`}
        className="h-5 w-5 shrink-0 cursor-pointer rounded border border-slate-300 bg-transparent p-0 dark:border-slate-600"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.stopPropagation()}
        aria-label={`${label} value`}
        className="w-full min-w-0 bg-transparent text-xs text-slate-700 outline-none dark:text-slate-200"
      />
    </div>
  );
}

const FONTS = [
  'Playfair Display, Georgia, serif',
  'Inter, system-ui, sans-serif',
  'Cinzel, serif',
  'Cormorant Garamond, serif',
  'Great Vibes, cursive',
  'Dancing Script, cursive',
  'Montserrat, sans-serif',
  'JetBrains Mono, monospace',
];

function TextSection({
  node,
  onPatch,
}: {
  node: TextNode;
  onPatch: (patch: (node: EditorNode) => EditorNode) => void;
}) {
  const patchText = (fn: (t: TextNode) => TextNode) =>
    onPatch((n) => (n.kind === 'text' ? fn(n) : n));

  return (
    <Section title="Text">
      <div className="space-y-1.5">
        <select
          value={node.fontFamily}
          onChange={(e) => patchText((t) => ({ ...t, fontFamily: e.target.value }))}
          aria-label="Font family"
          className="w-full rounded-md bg-slate-100 px-2 py-1.5 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-sky-500 dark:bg-slate-800 dark:text-slate-200"
        >
          {FONTS.map((f) => (
            <option key={f} value={f}>
              {f.split(',')[0]}
            </option>
          ))}
        </select>

        <div className="grid grid-cols-2 gap-1.5">
          <NumberField
            label="Size"
            value={node.fontSize}
            min={1}
            onChange={(v) => patchText((t) => ({ ...t, fontSize: v }))}
          />
          <NumberField
            label="Weight"
            value={node.fontWeight}
            min={100}
            max={900}
            step={100}
            onChange={(v) => patchText((t) => ({ ...t, fontWeight: Math.round(v / 100) * 100 }))}
          />
          <NumberField
            label="Spacing"
            value={node.letterSpacing}
            step={0.1}
            onChange={(v) => patchText((t) => ({ ...t, letterSpacing: v }))}
          />
          <NumberField
            label="Line"
            value={node.lineHeight}
            min={0.5}
            max={4}
            step={0.05}
            onChange={(v) => patchText((t) => ({ ...t, lineHeight: v }))}
          />
        </div>

        <div className="flex items-center gap-0.5">
          {(['left', 'center', 'right'] as const).map((align) => (
            <MiniButton
              key={align}
              title={`Align ${align}`}
              active={node.align === align}
              onClick={() => patchText((t) => ({ ...t, align }))}
            >
              <span className="text-[10px] font-semibold uppercase">{align[0]}</span>
            </MiniButton>
          ))}
          <div className="mx-1 h-5 w-px bg-slate-200 dark:bg-slate-700" />
          {(['top', 'middle', 'bottom'] as const).map((v) => (
            <MiniButton
              key={v}
              title={`Vertical ${v}`}
              active={node.verticalAlign === v}
              onClick={() => patchText((t) => ({ ...t, verticalAlign: v }))}
            >
              <span className="text-[10px] font-semibold uppercase">{v[0]}</span>
            </MiniButton>
          ))}
        </div>

        <ColorRow label="Colour" value={node.color} onChange={(color) => patchText((t) => ({ ...t, color }))} />
      </div>
    </Section>
  );
}

function ImageSection({
  node,
  onPatch,
}: {
  node: Extract<EditorNode, { kind: 'image' }>;
  onPatch: (patch: (node: EditorNode) => EditorNode) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  // A blob URL leaks its backing file until revoked. Tie its lifetime to the
  // last one this panel created.
  useEffect(() => () => { if (objectUrl) URL.revokeObjectURL(objectUrl); }, [objectUrl]);

  return (
    <Section title="Image">
      <div className="space-y-1.5">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full rounded-md bg-slate-100 px-2 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          {node.src ? 'Replace image…' : 'Upload image…'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const url = URL.createObjectURL(file);
            setObjectUrl((prev) => {
              if (prev) URL.revokeObjectURL(prev);
              return url;
            });
            onPatch((n) => (n.kind === 'image' ? { ...n, src: url, name: file.name } : n));
          }}
        />
        <div className="flex items-center gap-0.5">
          {(['contain', 'cover'] as const).map((fit) => (
            <MiniButton
              key={fit}
              title={`Fit: ${fit}`}
              active={node.fit === fit}
              onClick={() => onPatch((n) => (n.kind === 'image' ? { ...n, fit } : n))}
            >
              <span className="text-[9px] font-semibold uppercase">{fit.slice(0, 3)}</span>
            </MiniButton>
          ))}
        </div>
      </div>
    </Section>
  );
}
