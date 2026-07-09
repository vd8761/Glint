/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Circle,
  Hand,
  Image as ImageIcon,
  Magnet,
  Maximize,
  Minus,
  MousePointer2,
  Plus,
  Redo2,
  Scaling,
  Square,
  Type,
  Undo2,
} from 'lucide-react';
import type { Tool } from './CanvasStage';

interface ToolSpec {
  id: Tool;
  icon: React.ComponentType<{ size?: number | string; strokeWidth?: number }>;
  label: string;
  key: string;
}

const TOOLS: ToolSpec[] = [
  { id: 'select', icon: MousePointer2, label: 'Select', key: 'V' },
  { id: 'hand', icon: Hand, label: 'Hand — pan the canvas', key: 'H' },
  { id: 'text', icon: Type, label: 'Text', key: 'T' },
  { id: 'rect', icon: Square, label: 'Rectangle', key: 'R' },
  { id: 'ellipse', icon: Circle, label: 'Ellipse', key: 'O' },
  { id: 'image', icon: ImageIcon, label: 'Image', key: 'I' },
];

function IconButton({
  active,
  disabled,
  title,
  onClick,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={[
        'grid h-9 w-9 place-items-center rounded-lg transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-35',
        active
          ? 'bg-sky-500 text-white shadow-sm'
          : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

const Divider = () => <div className="mx-1 h-6 w-px bg-slate-200 dark:bg-slate-700" />;

export interface ToolbarProps {
  tool: Tool;
  setTool: (tool: Tool) => void;
  scaleMode: boolean;
  setScaleMode: (on: boolean) => void;
  snapEnabled: boolean;
  setSnapEnabled: (on: boolean) => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomFit: () => void;
  onZoomReset: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

export function Toolbar({
  tool,
  setTool,
  scaleMode,
  setScaleMode,
  snapEnabled,
  setSnapEnabled,
  zoom,
  onZoomIn,
  onZoomOut,
  onZoomFit,
  onZoomReset,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: ToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-white px-2 py-1.5 dark:border-slate-800 dark:bg-slate-900">
      {TOOLS.map(({ id, icon: Icon, label, key }) => (
        <IconButton
          key={id}
          active={tool === id}
          title={`${label}  (${key})`}
          onClick={() => setTool(id)}
        >
          <Icon size={17} strokeWidth={1.9} />
        </IconButton>
      ))}

      <Divider />

      <IconButton
        active={scaleMode}
        title="Scale mode (K) — resizing also scales text, strokes and radii"
        onClick={() => setScaleMode(!scaleMode)}
      >
        <Scaling size={17} strokeWidth={1.9} />
      </IconButton>
      <IconButton
        active={snapEnabled}
        title="Snap to guides (hold Alt to bypass)"
        onClick={() => setSnapEnabled(!snapEnabled)}
      >
        <Magnet size={17} strokeWidth={1.9} />
      </IconButton>

      <Divider />

      <IconButton title="Undo (Ctrl+Z)" disabled={!canUndo} onClick={onUndo}>
        <Undo2 size={17} strokeWidth={1.9} />
      </IconButton>
      <IconButton title="Redo (Ctrl+Shift+Z)" disabled={!canRedo} onClick={onRedo}>
        <Redo2 size={17} strokeWidth={1.9} />
      </IconButton>

      <div className="ml-auto flex items-center gap-1">
        <IconButton title="Zoom out (Ctrl+-)" onClick={onZoomOut}>
          <Minus size={17} strokeWidth={1.9} />
        </IconButton>
        <button
          type="button"
          onClick={onZoomReset}
          title="Reset to 100% (Ctrl+0)"
          className="min-w-14 rounded-lg px-2 py-1.5 text-xs font-medium tabular-nums text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          {Math.round(zoom * 100)}%
        </button>
        <IconButton title="Zoom in (Ctrl++)" onClick={onZoomIn}>
          <Plus size={17} strokeWidth={1.9} />
        </IconButton>
        <IconButton title="Zoom to fit (Ctrl+1)" onClick={onZoomFit}>
          <Maximize size={17} strokeWidth={1.9} />
        </IconButton>
      </div>
    </div>
  );
}
