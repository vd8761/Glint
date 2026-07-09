import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { 
  Undo2, Redo2, Sliders, Plus, Trash2, Save, ArrowLeft, Sparkles,
  Layers, Type, QrCode, Award, Check, Grid, Image, Info, User,
  MousePointerClick, AlignLeft, AlignCenter, AlignRight, Bold, Italic, Underline, HelpCircle, Eye, EyeOff, Upload,
  ZoomIn, ZoomOut, Maximize2, GripVertical, ChevronUp, ChevronDown, RotateCw, FlipHorizontal2, FlipVertical2,
  X, LogOut
} from 'lucide-react';
import type { CertificateTemplate, CustomFontAsset, RichTextRun, TextElement } from '../types';
import { BEAUTIFUL_PRESETS } from '../presets';
import { useQrDataUrl } from '../lib/qr';
import { computeSnap, type Box, type Guide } from '../lib/canvasSnap';
import { elementTransform, elementTransformSuffix } from '../lib/transform';
import {
  applyRichTextStyleToRange,
  normalizeRichTextRuns,
  plainTextFromRuns,
  remapRichTextRuns,
  resolveRichTextRuns,
  runHasStyle,
  type RichTextStylePatch,
} from '../lib/richText';

const capitalizeWords = (str: string) => {
  return str.replace(/\b\w/g, char => char.toUpperCase());
};

export type HandlePos =
  | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  | 'left' | 'right' | 'top' | 'bottom';

/**
 * Placement and cursor for each resize handle, relative to the element box.
 * Each handle is centred on its anchor point (a corner or an edge midpoint)
 * with a translate, so the visible dot sits exactly on the box outline.
 */
const HANDLE_CURSORS: Record<HandlePos, string> = {
  'top-left': 'cursor-nwse-resize',
  'top-right': 'cursor-nesw-resize',
  'bottom-left': 'cursor-nesw-resize',
  'bottom-right': 'cursor-nwse-resize',
  left: 'cursor-ew-resize',
  right: 'cursor-ew-resize',
  top: 'cursor-ns-resize',
  bottom: 'cursor-ns-resize',
};

const HANDLE_ANCHORS: Record<HandlePos, { x: number; y: number }> = {
  'top-left': { x: 0, y: 0 },
  'top-right': { x: 1, y: 0 },
  'bottom-left': { x: 0, y: 1 },
  'bottom-right': { x: 1, y: 1 },
  left: { x: 0, y: 0.5 },
  right: { x: 1, y: 0.5 },
  top: { x: 0.5, y: 0 },
  bottom: { x: 0.5, y: 1 },
};

const handleAnchorValue = (ratio: number, outlineOffset: number) => {
  if (ratio === 0) return `-${outlineOffset}px`;
  if (ratio === 1) return `calc(100% + ${outlineOffset}px)`;
  return '50%';
};

/**
 * A resize handle.
 *
 * The hit area is an 18px transparent box; the visible dot is 9px inside it.
 * The old handles were bare 8px dots, which is far below the ~24px touch target
 * guidance and, on a mouse, easy to miss — a near miss landed on the element
 * body and started a drag instead. This is why "I can't resize by the dots".
 *
 * `touch-none` sets `touch-action: none` so a touch/pen drag on the handle does
 * not also scroll the page. Pointer capture (in the parent's onStart) does the
 * rest: once the handle is pressed it receives every subsequent move until
 * release, no matter how fast the pointer moves or what it passes over.
 */
function ResizeHandle({
  pos,
  onStart,
  outlineOffset = 2,
}: {
  pos: HandlePos;
  onStart: (e: React.PointerEvent, pos: HandlePos) => void;
  outlineOffset?: number;
}) {
  const anchor = HANDLE_ANCHORS[pos];
  return (
    <div
      onPointerDown={(e) => onStart(e, pos)}
      className={`absolute ${HANDLE_CURSORS[pos]} z-[55] flex items-center justify-center touch-none`}
      style={{
        left: handleAnchorValue(anchor.x, outlineOffset),
        top: handleAnchorValue(anchor.y, outlineOffset),
        width: 18,
        height: 18,
        transform: 'translate(-50%, -50%)',
      }}
      title="Drag to resize"
    >
      <span className="w-[9px] h-[9px] bg-indigo-600 rounded-full border-2 border-white shadow-md pointer-events-none transition-transform hover:scale-125" />
    </div>
  );
}

/**
 * The rotation grip. It sits on a short stem above the element's top edge, the
 * way PowerPoint / Canva place theirs. Because it lives inside the element box,
 * it rotates and mirrors together with the element, so it always reads as "the
 * top" of the current orientation.
 */
function RotateHandle({ onStart }: { onStart: (e: React.PointerEvent) => void }) {
  return (
    <div
      onPointerDown={onStart}
      className="absolute left-1/2 z-[56] flex flex-col items-center touch-none cursor-grab active:cursor-grabbing"
      style={{ top: -26, transform: 'translate(-50%, -50%)' }}
      title="Drag to rotate (hold Shift to snap to 15°)"
    >
      <span className="flex items-center justify-center w-[18px] h-[18px] rounded-full bg-indigo-600 border-2 border-white shadow-md pointer-events-none">
        <RotateCw className="w-2.5 h-2.5 text-white" />
      </span>
      <span className="w-px h-3 bg-indigo-400 pointer-events-none" />
    </div>
  );
}

const ALL_HANDLES: HandlePos[] = [
  'top-left', 'top-right', 'bottom-left', 'bottom-right', 'left', 'right', 'top', 'bottom',
];
const CORNER_HANDLES: HandlePos[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'left', 'right'];
const PATCH_HANDLES: HandlePos[] = ['right', 'bottom', 'bottom-right'];

/** Heading shown at the top of each floating tool panel. */
const PANEL_TITLES: Record<string, string> = {
  templates: 'Design Presets',
  ai: 'AI Design Agent',
  text: 'Text',
  uploads: 'Uploads',
  backdrop: 'Background',
  borders: 'Borders & Frame',
  seals: 'Stamps & QR',
  sign: 'Signatories',
  layers: 'Layers',
};

type HorizontalAlign = 'left' | 'center' | 'right';
type VerticalAlign = 'top' | 'middle' | 'bottom';

const POSITION_ALIGNMENTS: Array<{
  x: HorizontalAlign;
  y: VerticalAlign;
  title: string;
}> = [
  { x: 'left', y: 'top', title: 'Align top left' },
  { x: 'center', y: 'top', title: 'Align top center' },
  { x: 'right', y: 'top', title: 'Align top right' },
  { x: 'left', y: 'middle', title: 'Align middle left' },
  { x: 'center', y: 'middle', title: 'Align center' },
  { x: 'right', y: 'middle', title: 'Align middle right' },
  { x: 'left', y: 'bottom', title: 'Align bottom left' },
  { x: 'center', y: 'bottom', title: 'Align bottom center' },
  { x: 'right', y: 'bottom', title: 'Align bottom right' },
];

function PositionAlignmentGrid({
  onAlign,
}: {
  onAlign: (x: HorizontalAlign, y: VerticalAlign) => void;
}) {
  const dotPosition = (value: HorizontalAlign | VerticalAlign) => {
    if (value === 'left' || value === 'top') return '18%';
    if (value === 'right' || value === 'bottom') return '82%';
    return '50%';
  };

  return (
    <div className="grid grid-cols-3 gap-1.5">
      {POSITION_ALIGNMENTS.map((option) => (
        <button
          key={`${option.y}-${option.x}`}
          type="button"
          onClick={() => onAlign(option.x, option.y)}
          className="grid h-8 place-items-center rounded border border-slate-200 bg-white text-slate-500 transition-colors hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-600"
          title={option.title}
          aria-label={option.title}
        >
          <span className="relative block h-[18px] w-[18px] rounded-sm border border-current opacity-80">
            <span
              className="absolute h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-current"
              style={{
                left: dotPosition(option.x),
                top: dotPosition(option.y),
              }}
            />
          </span>
        </button>
      ))}
    </div>
  );
}

/**
 * Floating zoom cluster pinned to the bottom of the canvas viewport. Panning is
 * space-drag or middle-mouse; ctrl/⌘ + wheel zooms. These buttons are the
 * discoverable, mouse-only path to the same controls.
 */
function ViewportControls({
  zoom,
  onZoomIn,
  onZoomOut,
  onReset,
}: {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}) {
  const btn =
    'grid h-7 w-7 place-items-center rounded-md text-slate-600 hover:bg-slate-100 hover:text-indigo-600 transition-colors disabled:opacity-40 disabled:hover:bg-transparent';
  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      className="absolute bottom-3 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-0.5 rounded-lg border border-slate-200 bg-white/90 px-1 py-1 shadow-md backdrop-blur"
      title="Zoom · ctrl/⌘ + scroll · hold space to pan"
    >
      <button type="button" onClick={onZoomOut} disabled={zoom <= 0.25} className={btn} title="Zoom out" aria-label="Zoom out">
        <ZoomOut className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onReset}
        className="min-w-[3.25rem] rounded-md px-1.5 py-1 text-center text-xs font-semibold tabular-nums text-slate-700 hover:bg-slate-100"
        title="Reset view to 100%"
      >
        {Math.round(zoom * 100)}%
      </button>
      <button type="button" onClick={onZoomIn} disabled={zoom >= 4} className={btn} title="Zoom in" aria-label="Zoom in">
        <ZoomIn className="h-4 w-4" />
      </button>
      <span className="mx-0.5 h-5 w-px bg-slate-200" />
      <button type="button" onClick={onReset} className={btn} title="Fit / reset view" aria-label="Fit view">
        <Maximize2 className="h-4 w-4" />
      </button>
    </div>
  );
}

/**
 * In-place text editor mounted over a canvas text element on double-click.
 *
 * It edits *plain* text (styling isn't shown mid-edit) and inherits the host
 * element's font/color/alignment, so what you type sits exactly where the text
 * will render. Committing flows through the same path that re-maps rich-text
 * runs, so inline colors/bold survive the edit. Keyed by the caller for a fresh
 * mount per session, mirroring the contentEditable rebuild trick.
 */
function InlineTextEditor({
  initialText,
  onCommit,
  onCancel,
}: {
  initialText: string;
  onCommit: (text: string) => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const cancelled = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.innerText = initialText;
    const frame = requestAnimationFrame(() => {
      const cur = ref.current;
      if (!cur) return;
      cur.focus({ preventScroll: true });
      const range = document.createRange();
      range.selectNodeContents(cur);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    });
    return () => cancelAnimationFrame(frame);
    // Mount only — re-seeding each keystroke would fight the caret.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      role="textbox"
      tabIndex={0}
      style={{ width: '100%', outline: 'none', cursor: 'text', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
      className="ring-2 ring-indigo-500 rounded-[2px]"
      // Keep pointer input inside the editor from starting a drag on the host.
      onPointerDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      // Blur commits (unless Escape already cancelled). The editor opens from a
      // double-click, so focus is settled — there is no spurious pre-focus blur.
      onBlur={(e) => {
        if (cancelled.current) return;
        onCommit(e.currentTarget.innerText);
      }}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Escape') {
          e.preventDefault();
          cancelled.current = true;
          onCancel();
        }
      }}
    />
  );
}

interface CanvaEditorProps {
  template: CertificateTemplate;
  onSave: (updatedTemplate: CertificateTemplate) => void;
  onCancel: () => void;
  isSaving?: boolean;
  brandName?: string;
  primaryColor?: string;
  token?: string | null;
  programs?: any[];
}

// Beautiful Predefined Background Gradients list
const GRADIENT_OPTIONS = [
  { name: 'Pure White Space', value: '#FFFFFF', isGradient: false },
  { name: 'Warm Parchment', value: '#FAF8F5', isGradient: false },
  { name: 'Obsidian Slate', value: '#0A0F1D', isGradient: false },
  { name: 'Light Ivory Pearl', value: 'linear-gradient(135deg, #FAF8F5 0%, #EAE0D5 100%)', isGradient: true },
  { name: 'Deep Cosmic Marine', value: 'linear-gradient(135deg, #091E3A 0%, #2F80ED 50%, #2D9EE0 100%)', isGradient: true },
  { name: 'Royal Amethyst Pearl', value: 'radial-gradient(circle, #2E1065 0%, #0F051D 100%)', isGradient: true },
  { name: 'Emerald Forest Gold', value: 'radial-gradient(circle, #064E3B 0%, #022C22 100%)', isGradient: true },
  { name: 'Vibrant Warm Sunset', value: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 30%, #FDE68A 100%)', isGradient: true },
  { name: 'Minimal Cool Grid', value: 'linear-gradient(180deg, #F8FAFC 0%, #F1F5F9 100%)', isGradient: true },
  { name: 'Rosewood Petals', value: 'linear-gradient(135deg, #FAF5F5 0%, #FEE2E2 50%, #FCE7F3 100%)', isGradient: true },
];

const FONT_OPTIONS = [
  { value: 'Inter', label: 'Inter (Sans-Serif)' },
  { value: 'Space Grotesk', label: 'Space Grotesk (Tech)' },
  { value: 'Playfair Display', label: 'Playfair Display (Serif)' },
  { value: 'JetBrains Mono', label: 'JetBrains Mono (Mono)' },
  { value: 'Montserrat', label: 'Montserrat (Modern)' },
  { value: 'Poppins', label: 'Poppins (Geometric)' },
  { value: 'Lora', label: 'Lora (Classic Serif)' },
  { value: 'Cormorant Garamond', label: 'Cormorant Garamond (Elegant)' },
  { value: 'Libre Baskerville', label: 'Libre Baskerville (Bold)' },
  { value: 'Cinzel', label: 'Cinzel (Majestic)' },
  { value: 'Alex Brush', label: 'Alex Brush (Calligraphy)' },
  { value: 'Dancing Script', label: 'Dancing Script (Handwritten)' },
  { value: 'Great Vibes', label: 'Great Vibes (Flowing)' },
  { value: 'Parisienne', label: 'Parisienne (Classic Script)' }
];

const CUSTOM_FONT_MAX_BYTES = 5 * 1024 * 1024;
const POSITION_MIN = -50;
const POSITION_MAX = 150;

/**
 * Canvas-relative scale factors, shared with CertificateViewer so the editor is a
 * true WYSIWYG preview. A stored size of `S` renders at `S * SCALE` cqw (i.e.
 * `S * SCALE`% of the canvas width). Text and redaction boxes use TEXT_SCALE;
 * logos, signatures and uploaded images use ASSET_SCALE.
 */
const TEXT_SCALE = 0.1125;
const ASSET_SCALE = 0.125;

/** Generous logical-unit caps (well within the schema's width/height/fontSize limits). */
const RESIZE_MAX_WIDTH = 2400;
const RESIZE_MIN_WIDTH = 20;
const RESIZE_MAX_HEIGHT = 1600;
const RESIZE_MIN_HEIGHT = 10;
const RESIZE_MAX_FONT = 240;
const RESIZE_MIN_FONT = 6;

type ResizeKind = 'text' | 'redaction' | 'image' | 'asset';

const sanitizeFontName = (name: string) =>
  name
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-zA-Z0-9 _-]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 48) || 'Custom Font';

const uniqueFontFamily = (baseName: string, existing: Set<string>) => {
  let family = baseName;
  let i = 2;
  while (existing.has(family)) {
    family = `${baseName} ${i}`;
    i += 1;
  }
  return family;
};

export function CanvaEditor({ template, onSave, onCancel, isSaving = false, brandName = 'Workspace', primaryColor = '#0F172A', token, programs = [] }: CanvaEditorProps) {
  // Current active template editing state
  const [currentTemplate, setCurrentTemplate] = useState<CertificateTemplate>(JSON.parse(JSON.stringify(template)));
  
  // High quality History Stack for Undo/Redo (Think Advance)
  const [history, setHistory] = useState<CertificateTemplate[]>([JSON.parse(JSON.stringify(template))]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  
  // Active tool tab (opens its floating settings panel). Starts closed so the
  // canvas is unobstructed on entry — the distraction-free default.
  const [activeSideTab, setActiveSideTab] = useState<'templates' | 'text' | 'borders' | 'backdrop' | 'seals' | 'sign' | 'layers' | 'ai' | 'uploads' | null>(null);
  // Confirmation gate for leaving the editor without saving.
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Currently highlighted / selected element ID on visual canvas
  const [selectedElId, setSelectedElId] = useState<string | null>(null);
  // Text element currently being edited *in place* on the canvas (double-click).
  const [editingCanvasId, setEditingCanvasId] = useState<string | null>(null);
  const [textSelection, setTextSelection] = useState<{ id: string; start: number; end: number } | null>(null);

  // Ref to scroll sidebar to selected element editor
  const selectedElementPanelRef = useRef<HTMLDivElement>(null);
  const sidebarContentRef = useRef<HTMLDivElement>(null);

  // Helper: select element AND jump sidebar to the right editing panel
  const selectElementAndFocus = (id: string) => {
    setSelectedElId(id);
    // Route to the correct sidebar tab based on element type
    if (id === 'logo') {
      setActiveSideTab('sign');
      setTimeout(() => document.getElementById('logo-settings')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    } else if (id === 'signature' || id === 'secondarySignature') {
      setActiveSideTab('sign');
      setTimeout(() => document.getElementById(`${id}-settings`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    } else if (id === 'seal') {
      setActiveSideTab('seals');
    } else {
      // Regular text/image/redaction element → open text editing panel
      setActiveSideTab('text');
      setTimeout(() => {
        selectedElementPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 80);
    }
  };

  // AI Generator state
  const [aiPrompt, setAiPrompt] = useState<string>('');
  const [isGeneratingAi, setIsGeneratingAi] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSampleImage, setAiSampleImage] = useState<{ data: string; mimeType: string } | null>(null);
  const [isParsingSample, setIsParsingSample] = useState<boolean>(false);
  const [parsingProgress, setParsingProgress] = useState<string>('');

  // Selected program for field insertion helpers
  const [selectedProgramId, setSelectedProgramId] = useState<string>('');
  
  // Custom uploaded assets library
  const [uploadedAssets, setUploadedAssets] = useState<string[]>([]);

  // Interactive Canva Workspace helper tip state (one-time dismissible popup)
  const [showCanvaTip, setShowCanvaTip] = useState<boolean>(() => {
    return !localStorage.getItem('glint_canva_tip_dismissed');
  });

  useEffect(() => {
    if (showCanvaTip) {
      const timer = setTimeout(() => {
        setShowCanvaTip(false);
        localStorage.setItem('glint_canva_tip_dismissed', 'true');
      }, 10000); // Auto-dismiss after 10 seconds
      return () => clearTimeout(timer);
    }
  }, [showCanvaTip]);
  
  const getPlaceholderTags = () => {
    const baseTags = ['name', 'program', 'date', 'id'];
    if (!selectedProgramId || !programs) return baseTags;
    const selectedProg = programs.find(p => p.id === selectedProgramId);
    if (!selectedProg || !selectedProg.recipientFields) return baseTags;
    return [...baseTags, ...selectedProg.recipientFields];
  };

  /**
   * What the QR will encode, with sample values substituted. Generated locally
   * rather than fetched from api.qrserver.com — see src/lib/qr.ts.
   */
  const previewQrTarget = (currentTemplate.qrCodeCustomUrl || `${window.location.origin}/c/{{id}}`)
    .replaceAll('{{id}}', 'GLNT-SAMPLE-PREVIEW-0000-0000')
    .replaceAll('{{name}}', 'Alex Rivera')
    .replaceAll('{{program}}', 'Sample Program')
    .replaceAll('{{date}}', new Date().toISOString().slice(0, 10));
  const previewQrDataUrl = useQrDataUrl(currentTemplate.showQrCode ? previewQrTarget : null);
  const fontOptions = [
    ...FONT_OPTIONS,
    ...(currentTemplate.customFonts ?? []).map((font) => ({
      value: font.family,
      label: `${font.family} (Custom)`,
    })),
  ];

  const addUploadedImageToCanvas = (imageUrl: string) => {
    const id = `t-img-${Math.random().toString(36).substring(2, 7)}`;
    const newElement: TextElement = {
      id,
      type: 'image',
      imageUrl,
      text: '',
      xPercent: 50,
      yPercent: 50,
      width: 120,
      fontSize: 12, // default for framework resizing safety
      fontWeight: 'normal',
      fontFamily: 'Inter',
      color: '#000000',
      align: 'center'
    };
    
    const updated = {
      ...currentTemplate,
      textElements: [...currentTemplate.textElements, newElement]
    };
    setCurrentTemplate(updated);
    pushToHistory(updated);
    setSelectedElId(id);
  };

  const handleCustomImageElementUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Data = event.target?.result as string;
      if (base64Data) {
        setUploadedAssets(prev => [base64Data, ...prev]);
        addUploadedImageToCanvas(base64Data);
      }
    };
    reader.readAsDataURL(file);
  };

  type DragSession = {
    id: string;
    pointerId: number;
    startX: number;
    startY: number;
    startLeft: number;
    startTop: number;
    canvasWidth: number;
    canvasHeight: number;
    movingHw: number;
    movingHh: number;
    snapBoxes: Box[];
    element: HTMLElement;
    focusOnClick: boolean;
    moved: boolean;
    previousTransition: string;
    previousWillChange: string;
    previousTransform: string;
    /** Clean resting transform (`translate(-50%,-50%)` + rotate/flip) to restore on drop. */
    restingTransform: string;
    /** The rotate/flip part appended after the live drag translate. */
    transformSuffix: string;
    rafId: number | null;
    lastEvent: PointerEvent | null;
  };

  const canvasRef = useRef<HTMLDivElement>(null);
  const dragSessionRef = useRef<DragSession | null>(null);
  const sampleUploadRef = useRef<HTMLInputElement>(null);
  const directSampleUploadRef = useRef<HTMLInputElement>(null);
  const customFontUploadRef = useRef<HTMLInputElement>(null);
  const loadedCustomFontsRef = useRef<Set<string>>(new Set());

  // --- Free-roam viewport: pan + zoom over the fixed page ---------------------
  // Zoom scales the page; pan slides it in screen pixels. All drag/resize math
  // reads the *live* canvas rect, so both stay pixel-accurate at any zoom.
  const viewportRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef(1);
  const spaceHeldRef = useRef(false);
  const panSessionRef = useRef<{ pointerId: number; startX: number; startY: number; startPan: { x: number; y: number } } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [spaceHeld, setSpaceHeld] = useState(false);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);

  // Largest A4-landscape (1.414:1) box that fits the stage, so the page uses the
  // whole container instead of a small centred card. Recomputed on resize.
  const stageRef = useRef<HTMLDivElement>(null);
  const [stageFit, setStageFit] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const PAGE_RATIO = 1.414;
    const MARGIN = 24; // breathing room + drop shadow
    const measure = () => {
      const w = stage.clientWidth - MARGIN * 2;
      const h = stage.clientHeight - MARGIN * 2;
      if (w <= 0 || h <= 0) return;
      const width = Math.min(w, h * PAGE_RATIO);
      setStageFit({ width, height: width / PAGE_RATIO });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(stage);
    return () => ro.disconnect();
  }, []);

  const clampZoom = (z: number) => Math.min(4, Math.max(0.25, z));
  const resetView = () => { setZoom(1); setPan({ x: 0, y: 0 }); };
  const zoomByStep = (dir: 1 | -1) => setZoom((z) => clampZoom(Math.round((z + dir * 0.1) * 100) / 100));

  // Ctrl/Cmd + wheel zooms. A native, non-passive listener is required so we can
  // preventDefault the browser's own page-zoom.
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.08 : 1 / 1.08;
      setZoom((z) => clampZoom(z * factor));
    };
    vp.addEventListener('wheel', onWheel, { passive: false });
    return () => vp.removeEventListener('wheel', onWheel);
  }, []);

  // Hold space to pan (grab cursor), like every canvas tool.
  useEffect(() => {
    const isTyping = (t: EventTarget | null) => {
      const el = t as HTMLElement | null;
      return !!el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName));
    };
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isTyping(e.target)) {
        spaceHeldRef.current = true;
        setSpaceHeld(true);
        if (document.activeElement === document.body) e.preventDefault();
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space') { spaceHeldRef.current = false; setSpaceHeld(false); }
    };
    const blur = () => { spaceHeldRef.current = false; setSpaceHeld(false); };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    };
  }, []);

  // Pan starts on the viewport for middle-mouse anywhere, or space + left-drag.
  // Element drag/resize bail out early when space is held (see beginDrag/beginResize),
  // so a space-drag that begins over an element still bubbles here to pan.
  const handleViewportPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const wantPan = e.button === 1 || (e.button === 0 && spaceHeldRef.current);
    if (!wantPan) return;
    e.preventDefault();
    panSessionRef.current = { pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, startPan: pan };
    setIsPanning(true);
    try { viewportRef.current?.setPointerCapture(e.pointerId); } catch { /* best-effort */ }
  };
  const handleViewportPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const s = panSessionRef.current;
    if (!s || e.pointerId !== s.pointerId) return;
    setPan({ x: s.startPan.x + (e.clientX - s.startX), y: s.startPan.y + (e.clientY - s.startY) });
  };
  const handleViewportPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const s = panSessionRef.current;
    if (!s || e.pointerId !== s.pointerId) return;
    panSessionRef.current = null;
    setIsPanning(false);
    try { viewportRef.current?.releasePointerCapture(e.pointerId); } catch { /* best-effort */ }
  };

  // Alignment guides. The two lines are always mounted and hidden; the drag
  // handler shows and positions them directly on the DOM, so dragging never
  // triggers a React re-render (which would stutter at 60fps).
  const guideVRef = useRef<HTMLDivElement>(null);
  const guideHRef = useRef<HTMLDivElement>(null);
  // The last snap "key". When it changes to a new engagement we fire haptics.
  const snapEngagedRef = useRef<string>('');

  const renderGuides = (guideX: Guide | null, guideY: Guide | null) => {
    const v = guideVRef.current;
    const h = guideHRef.current;
    if (v) {
      if (guideX) {
        v.style.display = 'block';
        v.style.left = `${guideX.pos}%`;
        v.style.top = `${guideX.start}%`;
        v.style.height = `${guideX.end - guideX.start}%`;
      } else {
        v.style.display = 'none';
      }
    }
    if (h) {
      if (guideY) {
        h.style.display = 'block';
        h.style.top = `${guideY.pos}%`;
        h.style.left = `${guideY.start}%`;
        h.style.width = `${guideY.end - guideY.start}%`;
      } else {
        h.style.display = 'none';
      }
    }
  };

  const hideGuides = () => {
    if (guideVRef.current) guideVRef.current.style.display = 'none';
    if (guideHRef.current) guideHRef.current.style.display = 'none';
    snapEngagedRef.current = '';
  };

  const loadCustomFont = async (font: CustomFontAsset) => {
    const key = `${font.family}:${font.dataUrl.length}`;
    if (loadedCustomFontsRef.current.has(key)) return;

    const face = new FontFace(font.family, `url(${font.dataUrl}) format("truetype")`);
    const loaded = await face.load();
    document.fonts.add(loaded);
    loadedCustomFontsRef.current.add(key);
  };

  useEffect(() => {
    currentTemplate.customFonts?.forEach((font) => {
      loadCustomFont(font).catch(() => {
        toast.error(`Could not load font: ${font.fileName}`);
      });
    });
  }, [currentTemplate.customFonts]);

  const handleCustomFontUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.currentTarget.value = '';
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.ttf')) {
      toast.error('Please upload a .ttf font file.');
      return;
    }
    if (file.size > CUSTOM_FONT_MAX_BYTES) {
      toast.error('Font is too large. Please choose a .ttf smaller than 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string | undefined;
      if (!dataUrl) return;
      const commaIndex = dataUrl.indexOf(',');
      const normalizedDataUrl =
        commaIndex >= 0 ? `data:font/ttf;base64,${dataUrl.slice(commaIndex + 1)}` : dataUrl;

      const existingNames = new Set([
        ...FONT_OPTIONS.map((font) => font.value),
        ...(currentTemplate.customFonts ?? []).map((font) => font.family),
      ]);
      const family = uniqueFontFamily(sanitizeFontName(file.name), existingNames);
      const fontAsset: CustomFontAsset = {
        id: `font-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        family,
        fileName: file.name,
        dataUrl: normalizedDataUrl,
        format: 'truetype',
      };

      try {
        await loadCustomFont(fontAsset);
      } catch {
        toast.error('Could not load that font file.');
        return;
      }

      const canApplyToSelected =
        selectedElId &&
        currentTemplate.textElements.some(
          (el) => el.id === selectedElId && el.type !== 'image' && el.type !== 'redaction',
        );

      updateTemplateProperties({
        customFonts: [...(currentTemplate.customFonts ?? []), fontAsset],
        ...(canApplyToSelected
          ? {
              textElements: currentTemplate.textElements.map((el) =>
                el.id === selectedElId ? { ...el, fontFamily: family } : el,
              ),
            }
          : {}),
      });
      toast.success(`Imported ${family}`);
    };
    reader.readAsDataURL(file);
  };

  const snapshotSnapBoxes = (excludeId: string, canvasRect: DOMRect): Box[] => {
    if (canvasRect.width === 0 || canvasRect.height === 0) return [];

    const boxes: Box[] = [];
    canvasRef.current?.querySelectorAll<HTMLElement>('[id^="canvas-item-"]').forEach((node) => {
      const id = node.id.slice('canvas-item-'.length);
      if (id === excludeId) return;

      const rect = node.getBoundingClientRect();
      boxes.push({
        id,
        cx: ((rect.left + rect.width / 2 - canvasRect.left) / canvasRect.width) * 100,
        cy: ((rect.top + rect.height / 2 - canvasRect.top) / canvasRect.height) * 100,
        hw: (rect.width / 2 / canvasRect.width) * 100,
        hh: (rect.height / 2 / canvasRect.height) * 100,
      });
    });
    return boxes;
  };

  // Undo / Redo stack tracker pushes
  const pushToHistory = (newTemplateState: CertificateTemplate) => {
    const updatedHistory = history.slice(0, historyIndex + 1);
    setHistory([...updatedHistory, JSON.parse(JSON.stringify(newTemplateState))]);
    setHistoryIndex(updatedHistory.length);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      setHistoryIndex(prevIndex);
      setCurrentTemplate(JSON.parse(JSON.stringify(history[prevIndex])));
      // Reset selected element just in case
      setSelectedElId(null);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      setCurrentTemplate(JSON.parse(JSON.stringify(history[nextIndex])));
      setSelectedElId(null);
    }
  };

  // Resizing state manager
  const [resizingItem, setResizingItem] = useState<{
    id: string;
    kind: ResizeKind;
    handle: 'left' | 'right' | 'top' | 'bottom' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    startX: number;
    startY: number;
    startWidth: number;
    startFontSize?: number;
    startHeight?: number;
    /** The element's centre at grab time, so the opposite edge can stay pinned. */
    startXPercent: number;
    startYPercent: number;
    /** Orientation at grab time; preserved through the resize and needed for flip. */
    startRotation: number;
    startFlipH: boolean;
    startFlipV: boolean;
  } | null>(null);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    targetId: string | null;
  } | null>(null);

  // Snap to Grid & Layout guides state
  const [snapToGrid, setSnapToGrid] = useState<boolean>(false);
  const [gridVisible, setGridVisible] = useState<boolean>(false);

  // Preset search & category filter state
  const [presetSearchQuery, setPresetSearchQuery] = useState<string>('');
  const [presetActiveCategory, setPresetActiveCategory] = useState<string>('All');

  // Close context menu on click
  useEffect(() => {
    const closeMenu = () => setContextMenu(null);
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

  const handleContextMenu = (e: React.MouseEvent, id: string | null) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      targetId: id
    });
    if (id) {
      setSelectedElId(id);
    }
  };

  const getCanvasRelativeCoords = (clientX: number, clientY: number) => {
    if (!canvasRef.current) return { xPercent: 50, yPercent: 50 };
    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    return {
      xPercent: Math.round(Math.min(100, Math.max(0, x))),
      yPercent: Math.round(Math.min(100, Math.max(0, y)))
    };
  };

  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // While panning (space or middle-mouse), don't clear the selection — the press
    // is a pan gesture handled by the viewport.
    if (spaceHeldRef.current || e.button === 1) return;
    if (e.button !== 0 || e.target !== e.currentTarget) return;
    setSelectedElId(null);
    setContextMenu(null);
    hideGuides();
  };

  const insertTextAtCoords = (type: 'heading' | 'subheading' | 'body', xPercent: number, yPercent: number) => {
    const id = `t-custom-${Math.random().toString(36).substring(2, 7)}`;
    let text = 'New Custom Text Layer';
    let fontSize = 14;
    let fontWeight: 'normal' | 'medium' | 'bold' = 'medium';
    let fontFamily = 'Inter';
    let color = '#0F172A';
    
    if (type === 'heading') {
      text = 'DOUBLE CLICK TO EDIT HEADING';
      fontSize = 24;
      fontWeight = 'bold';
      fontFamily = 'Space Grotesk';
    } else if (type === 'subheading') {
      text = 'Custom subtitle template text';
      fontSize = 14;
      fontWeight = 'medium';
    }

    const newElement: TextElement = {
      id,
      text,
      fontSize,
      fontFamily,
      fontWeight,
      color,
      xPercent,
      yPercent,
      align: 'center'
    };

    updateTemplateProperties({
      textElements: [...currentTemplate.textElements, newElement]
    });
    setSelectedElId(id);
  };

  const bringToFront = (id: string) => {
    const el = currentTemplate.textElements.find(item => item.id === id);
    if (!el) return;
    const remains = currentTemplate.textElements.filter(item => item.id !== id);
    updateTemplateProperty('textElements', [...remains, el]);
  };

  const sendToBack = (id: string) => {
    const el = currentTemplate.textElements.find(item => item.id === id);
    if (!el) return;
    const remains = currentTemplate.textElements.filter(item => item.id !== id);
    updateTemplateProperty('textElements', [el, ...remains]);
  };

  // Layers panel drag-to-reorder. The paint/z-order is the textElements array
  // order (index 0 = bottom), so moving an item in the array restacks it.
  const [draggedLayerId, setDraggedLayerId] = useState<string | null>(null);
  const moveTextLayer = (fromId: string, toId: string) => {
    if (fromId === toId) return;
    const list = [...currentTemplate.textElements];
    const from = list.findIndex((e) => e.id === fromId);
    const to = list.findIndex((e) => e.id === toId);
    if (from === -1 || to === -1) return;
    const [moved] = list.splice(from, 1);
    list.splice(to, 0, moved);
    updateTemplateProperty('textElements', list);
  };
  const shiftTextLayer = (id: string, dir: -1 | 1) => {
    const list = [...currentTemplate.textElements];
    const i = list.findIndex((e) => e.id === id);
    const j = i + dir;
    if (i === -1 || j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    updateTemplateProperty('textElements', list);
  };

  const duplicateElement = (id: string) => {
    const el = currentTemplate.textElements.find(item => item.id === id);
    if (!el) return;
    const newId = `t-custom-${Math.random().toString(36).substring(2, 7)}`;
    const duplicated: TextElement = {
      ...el,
      id: newId,
      xPercent: Math.min(95, el.xPercent + 5),
      yPercent: Math.min(95, el.yPercent + 5)
    };
    updateTemplateProperties({
      textElements: [...currentTemplate.textElements, duplicated]
    });
    setSelectedElId(newId);
  };

  const alignCenterHorizontally = (id: string) => {
    if (id === 'logo') {
      updateTemplateProperty('logoX', 50);
    } else if (id === 'signature') {
      updateTemplateProperty('signatureX', 50);
    } else if (id === 'secondarySignature') {
      updateTemplateProperty('secondarySignatureX', 50);
    } else if (id === 'seal') {
      updateTemplateProperty('qrCodeX', 50);
    } else {
      const updated = currentTemplate.textElements.map(el => {
        if (el.id === id) return { ...el, xPercent: 50 };
        return el;
      });
      updateTemplateProperty('textElements', updated);
    }
  };

  const alignCenterVertically = (id: string) => {
    if (id === 'logo') {
      updateTemplateProperty('logoY', 50);
    } else if (id === 'signature') {
      updateTemplateProperty('signatureY', 50);
    } else if (id === 'secondarySignature') {
      updateTemplateProperty('secondarySignatureY', 50);
    } else if (id === 'seal') {
      updateTemplateProperty('qrCodeY', 50);
    } else {
      const updated = currentTemplate.textElements.map(el => {
        if (el.id === id) return { ...el, yPercent: 50 };
        return el;
      });
      updateTemplateProperty('textElements', updated);
    }
  };

  const getElementHalfExtentsPercent = (id: string) => {
    const canvas = canvasRef.current;
    const element = document.getElementById(`canvas-item-${id}`);
    if (!canvas || !element) return { hw: 0, hh: 0 };

    const canvasRect = canvas.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    if (canvasRect.width === 0 || canvasRect.height === 0) return { hw: 0, hh: 0 };

    return {
      hw: Math.min(50, (elementRect.width / 2 / canvasRect.width) * 100),
      hh: Math.min(50, (elementRect.height / 2 / canvasRect.height) * 100),
    };
  };

  const roundPercent = (value: number) => Math.round(Math.min(100, Math.max(0, value)) * 10) / 10;
  const clampFreePercent = (value: number) => Math.min(POSITION_MAX, Math.max(POSITION_MIN, value));
  const roundFreePercent = (value: number) =>
    Math.round(clampFreePercent(value) * 100) / 100;

  const alignElementTo = (id: string, xAlign: HorizontalAlign, yAlign: VerticalAlign) => {
    const { hw, hh } = getElementHalfExtentsPercent(id);
    const nextX = roundPercent(xAlign === 'left' ? hw : xAlign === 'right' ? 100 - hw : 50);
    const nextY = roundPercent(yAlign === 'top' ? hh : yAlign === 'bottom' ? 100 - hh : 50);

    setContextMenu(null);

    if (id === 'logo') {
      updateTemplateProperties({ logoX: nextX, logoY: nextY });
    } else if (id === 'signature') {
      updateTemplateProperties({ signatureX: nextX, signatureY: nextY });
    } else if (id === 'secondarySignature') {
      updateTemplateProperties({ secondarySignatureX: nextX, secondarySignatureY: nextY });
    } else if (id === 'seal') {
      updateTemplateProperties({ qrCodeX: nextX, qrCodeY: nextY });
    } else {
      updateTemplateProperties({
        textElements: currentTemplate.textElements.map((el) =>
          el.id === id ? { ...el, xPercent: nextX, yPercent: nextY } : el,
        ),
      });
    }
  };

  // Generic multiple properties batch update helper
  const updateTemplateProperties = (properties: Partial<CertificateTemplate>) => {
    const updated = {
      ...currentTemplate,
      ...properties
    };
    setCurrentTemplate(updated);
    pushToHistory(updated);
  };

  // Generic direct property updates
  const updateTemplateProperty = (property: keyof CertificateTemplate, value: any) => {
    updateTemplateProperties({ [property]: value });
  };

  // --- Rotation & flip -------------------------------------------------------

  /** Current rotation (deg) and mirror flags for any element by id. */
  const transformParamsFor = (id: string): { rotation: number; flipH: boolean; flipV: boolean } => {
    if (id === 'logo')
      return { rotation: currentTemplate.logoRotation || 0, flipH: !!currentTemplate.logoFlipH, flipV: !!currentTemplate.logoFlipV };
    if (id === 'signature')
      return { rotation: currentTemplate.signatureRotation || 0, flipH: !!currentTemplate.signatureFlipH, flipV: !!currentTemplate.signatureFlipV };
    if (id === 'secondarySignature')
      return { rotation: currentTemplate.secondarySignatureRotation || 0, flipH: !!currentTemplate.secondarySignatureFlipH, flipV: !!currentTemplate.secondarySignatureFlipV };
    const el = currentTemplate.textElements.find((t) => t.id === id);
    return { rotation: el?.rotation || 0, flipH: !!el?.flipH, flipV: !!el?.flipV };
  };

  /** Persist a rotation/flip change to whichever element `id` names. */
  const commitElementTransform = (
    id: string,
    changes: { rotation?: number; flipH?: boolean; flipV?: boolean },
  ) => {
    if (id === 'logo') {
      updateTemplateProperties({
        ...(changes.rotation !== undefined ? { logoRotation: changes.rotation } : {}),
        ...(changes.flipH !== undefined ? { logoFlipH: changes.flipH } : {}),
        ...(changes.flipV !== undefined ? { logoFlipV: changes.flipV } : {}),
      });
    } else if (id === 'signature') {
      updateTemplateProperties({
        ...(changes.rotation !== undefined ? { signatureRotation: changes.rotation } : {}),
        ...(changes.flipH !== undefined ? { signatureFlipH: changes.flipH } : {}),
        ...(changes.flipV !== undefined ? { signatureFlipV: changes.flipV } : {}),
      });
    } else if (id === 'secondarySignature') {
      updateTemplateProperties({
        ...(changes.rotation !== undefined ? { secondarySignatureRotation: changes.rotation } : {}),
        ...(changes.flipH !== undefined ? { secondarySignatureFlipH: changes.flipH } : {}),
        ...(changes.flipV !== undefined ? { secondarySignatureFlipV: changes.flipV } : {}),
      });
    } else {
      updateTemplateProperties({
        textElements: currentTemplate.textElements.map((el) =>
          el.id === id ? { ...el, ...changes } : el,
        ),
      });
    }
  };

  const toggleElementFlip = (id: string, axis: 'h' | 'v') => {
    const params = transformParamsFor(id);
    commitElementTransform(id, axis === 'h' ? { flipH: !params.flipH } : { flipV: !params.flipV });
    setContextMenu(null);
  };

  // Drag the rotation grip: the element spins to follow the pointer's angle
  // around its centre. Shift snaps to 15° increments, like PowerPoint.
  const beginRotate = (e: React.PointerEvent, id: string) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const element = document.getElementById(`canvas-item-${id}`);
    if (!element) return;
    const rect = element.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const params = transformParamsFor(id);
    const startAngle = (Math.atan2(e.clientY - cy, e.clientX - cx) * 180) / Math.PI;
    const flipSuffix = elementTransformSuffix(0, params.flipH, params.flipV);
    const previousTransition = element.style.transition;
    element.style.transition = 'none';

    let latest = params.rotation;
    const onMove = (ev: PointerEvent) => {
      const angle = (Math.atan2(ev.clientY - cy, ev.clientX - cx) * 180) / Math.PI;
      let next = params.rotation + (angle - startAngle);
      next = ev.shiftKey ? Math.round(next / 15) * 15 : Math.round(next);
      // Keep it in (-180, 180] so the stored value stays tidy.
      next = ((((next + 180) % 360) + 360) % 360) - 180;
      latest = next;
      element.style.transform =
        `translate(-50%, -50%) rotate(${next}deg)${flipSuffix ? ' ' + flipSuffix : ''}`;
    };
    const onUp = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      element.style.transition = previousTransition;
      try { element.releasePointerCapture(ev.pointerId); } catch { /* no capture */ }
      commitElementTransform(id, { rotation: latest });
    };
    try { element.setPointerCapture(e.pointerId); } catch { /* best effort */ }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  };

  const beginResize = (
    e: React.PointerEvent,
    id: string,
    handle: HandlePos,
    currentWidth: number,
    currentFontSize?: number,
    currentHeight?: number
  ) => {
    // Space-drag pans the canvas: let the event bubble to the viewport untouched.
    if (spaceHeldRef.current || e.button === 1) return;
    e.preventDefault();
    e.stopPropagation();

    // Capture the pointer on the handle so every subsequent move lands here,
    // even if the pointer outruns the 18px dot or crosses another element.
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      /* capture is best-effort; the document listeners are the fallback */
    }

    // Handles only render on the selected element, so it is already selected;
    // don't re-run selectElementAndFocus (it would jump the sidebar scroll).
    if (selectedElId !== id) setSelectedElId(id);

    // Which family of element this is decides both the on-screen scale factor and
    // whether a handle changes font size (text), height (redaction) or width only.
    const kind: ResizeKind =
      id === 'logo' || id === 'signature' || id === 'secondarySignature'
        ? 'asset'
        : currentHeight !== undefined
          ? 'redaction'
          : currentFontSize === undefined
            ? 'image'
            : 'text';

    // The element's centre, so we can pin the opposite edge while resizing.
    const textEl = currentTemplate.textElements.find((t) => t.id === id);
    const startXPercent =
      id === 'logo' ? currentTemplate.logoX
      : id === 'signature' ? currentTemplate.signatureX
      : id === 'secondarySignature' ? (currentTemplate.secondarySignatureX ?? 70)
      : textEl?.xPercent ?? 50;
    const startYPercent =
      id === 'logo' ? currentTemplate.logoY
      : id === 'signature' ? currentTemplate.signatureY
      : id === 'secondarySignature' ? (currentTemplate.secondarySignatureY ?? 78)
      : textEl?.yPercent ?? 50;

    // Measure the element's *actual* current size so resizing starts smoothly even
    // for auto-width text (which has no explicit width until first resized).
    // `offsetWidth/Height` is the untransformed layout box, so it is immune to the
    // canvas zoom and to the element's own rotation — unlike getBoundingClientRect.
    const scale = kind === 'asset' || kind === 'image' ? ASSET_SCALE : TEXT_SCALE;
    const canvas = canvasRef.current;
    const element = document.getElementById(`canvas-item-${id}`);
    let startWidth = currentWidth;
    let startHeight = currentHeight;
    if (canvas && element) {
      const contentW = canvas.clientWidth || 1;
      const pxPerUnit = (scale / 100) * contentW || 1;
      startWidth = element.offsetWidth / pxPerUnit;
      if (currentHeight !== undefined) startHeight = element.offsetHeight / pxPerUnit;
    }

    const orientation = transformParamsFor(id);

    setResizingItem({
      id,
      kind,
      handle,
      startX: e.clientX,
      startY: e.clientY,
      startWidth,
      startFontSize: currentFontSize,
      startHeight,
      startXPercent,
      startYPercent,
      startRotation: orientation.rotation,
      startFlipH: orientation.flipH,
      startFlipV: orientation.flipV,
    });
  };

  const resizingItemRef = useRef(resizingItem);
  useEffect(() => {
    resizingItemRef.current = resizingItem;
  }, [resizingItem]);

  const currentResizeWidthRef = useRef<number | null>(null);
  const currentResizeFontSizeRef = useRef<number | null>(null);
  const currentResizeHeightRef = useRef<number | null>(null);
  const currentResizeXPercentRef = useRef<number | null>(null);
  const currentResizeYPercentRef = useRef<number | null>(null);
  const currentResizeFlipHRef = useRef<boolean | null>(null);

  // Document level pointer listeners to ensure smooth resizing
  useEffect(() => {
    if (!resizingItem) return;

    let rafId: number;

    const handleGlobalMouseMove = (e: PointerEvent) => {
      const currentResize = resizingItemRef.current;
      if (!currentResize) return;

      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const deltaX = e.clientX - currentResize.startX;
        const deltaY = e.clientY - currentResize.startY;

        const elementDom = document.getElementById(`canvas-item-${currentResize.id}`);
        // Stored sizes are logical units rendered as `value * scale` cqw. Work in the
        // canvas's *own* (unzoomed) pixels — clientWidth/Height is exactly the cqw
        // reference — so the grabbed edge tracks the pointer at any zoom, and preview
        // in the same cqw the final render uses so there is no jump on release.
        const scale =
          currentResize.kind === 'asset' || currentResize.kind === 'image' ? ASSET_SCALE : TEXT_SCALE;
        const canvas = canvasRef.current;
        const contentW = canvas?.clientWidth || 800;
        const contentH = canvas?.clientHeight || 600;
        const z = zoomRef.current || 1;
        const pxPerUnit = (scale / 100) * contentW || 1;
        // Pointer delta in the canvas's own pixels, then projected onto the
        // element's local axes so a rotated element still resizes along the edge
        // the user grabbed rather than along the screen axes.
        const rot = ((currentResize.startRotation || 0) * Math.PI) / 180;
        const cos = Math.cos(rot);
        const sin = Math.sin(rot);
        const sdx = deltaX / z;
        const sdy = deltaY / z;
        const dxLocal = sdx * cos + sdy * sin;
        const dyLocal = -sdx * sin + sdy * cos;

        const clampWidth = (w: number) => Math.min(RESIZE_MAX_WIDTH, Math.max(RESIZE_MIN_WIDTH, w));
        const clampHeight = (h: number) => Math.min(RESIZE_MAX_HEIGHT, Math.max(RESIZE_MIN_HEIGHT, h));
        const clampFont = (f: number) => Math.min(RESIZE_MAX_FONT, Math.max(RESIZE_MIN_FONT, f));

        const { handle } = currentResize;
        const growsRight = handle === 'right' || handle === 'top-right' || handle === 'bottom-right';
        const growsLeft = handle === 'left' || handle === 'top-left' || handle === 'bottom-left';
        const growsBottom = handle === 'bottom' || handle === 'bottom-right' || handle === 'bottom-left';
        const growsTop = handle === 'top' || handle === 'top-right' || handle === 'top-left';

        const horizontal = growsLeft || growsRight;

        // Edge-anchored, with mirror support: the opposite edge stays pinned while
        // the grabbed edge follows the pointer. Track the grabbed edge as a *signed*
        // offset from the pinned edge — when it crosses over, the width flips sign,
        // which is exactly "drag the left side past the right side to mirror it".
        const startWidth = currentResize.startWidth;
        const grabSign = growsLeft ? -1 : 1; // which logical side the grabbed edge is on
        // A mirrored element draws its logical +x on screen -x, so undo that when
        // turning the (already local-projected) pointer delta into a logical move.
        const flipUnitH = currentResize.startFlipH ? -1 : 1;
        let newWidth = startWidth;
        let centreShiftXPx = 0;
        let centreShiftYPx = 0;
        let newFlipH = currentResize.startFlipH;
        if (horizontal) {
          const oppositeFromCentre = -grabSign * (startWidth / 2);
          const grabbedFromCentre = grabSign * (startWidth / 2) + (dxLocal / pxPerUnit) * flipUnitH;
          const signedSpan = grabbedFromCentre - oppositeFromCentre;
          newWidth = clampWidth(Math.abs(signedSpan));
          const spanSign = signedSpan >= 0 ? 1 : -1;
          const grabbedClamped = oppositeFromCentre + spanSign * newWidth;
          // Centre offset from the start centre, in logical units, then mapped back
          // to canvas px (undo the mirror, rotate into screen space).
          const centreLocalPx = ((grabbedClamped + oppositeFromCentre) / 2) * pxPerUnit * flipUnitH;
          centreShiftXPx = centreLocalPx * cos;
          centreShiftYPx = centreLocalPx * sin;
          // The mirror toggles the instant the grabbed edge crosses the pinned one.
          newFlipH = currentResize.startFlipH !== (spanSign !== grabSign);
        }

        // Height only matters for redaction blocks (vertical, no flip).
        let newHeight = currentResize.startHeight ?? 0;
        if (currentResize.kind === 'redaction') {
          let heightUnits = 0;
          if (growsBottom) heightUnits = dyLocal / pxPerUnit;
          else if (growsTop) heightUnits = -dyLocal / pxPerUnit;
          newHeight = clampHeight((currentResize.startHeight ?? 0) + heightUnits);
          const appliedHeightUnits = newHeight - (currentResize.startHeight ?? 0);
          const shiftLocalPx = (growsTop ? -1 : 1) * (appliedHeightUnits * pxPerUnit) / 2;
          centreShiftXPx += -shiftLocalPx * sin;
          centreShiftYPx += shiftLocalPx * cos;
        }
        const newXPercent = currentResize.startXPercent + (centreShiftXPx / contentW) * 100;
        const newYPercent = currentResize.startYPercent + (centreShiftYPx / contentH) * 100;

        // Preview keeps the element's rotation and (live) mirror while resizing, so
        // there is no snap-back on release.
        const orientationSuffix = elementTransformSuffix(
          currentResize.startRotation,
          newFlipH,
          currentResize.startFlipV,
        );
        const applyTransform = () => {
          if (!elementDom) return;
          elementDom.style.transform =
            `translate(-50%, -50%) translate(${centreShiftXPx}px, ${centreShiftYPx}px)${orientationSuffix ? ' ' + orientationSuffix : ''}`;
        };

        if (currentResize.kind === 'redaction') {
          currentResizeWidthRef.current = newWidth;
          currentResizeHeightRef.current = newHeight;
          currentResizeXPercentRef.current = newXPercent;
          currentResizeYPercentRef.current = newYPercent;
          if (horizontal) currentResizeFlipHRef.current = newFlipH;
          if (elementDom) {
            elementDom.style.width = `${newWidth * scale}cqw`;
            elementDom.style.height = `${newHeight * scale}cqw`;
            applyTransform();
          }
          return;
        }

        if (currentResize.kind === 'text') {
          // Top/bottom (and corners) scale the font; font is not a box edge, so it
          // uses a steady drag sensitivity rather than pointer tracking, and keeps
          // the box centred vertically.
          if (currentResize.startFontSize !== undefined && (growsTop || growsBottom)) {
            const newFontSize = clampFont(currentResize.startFontSize + (growsBottom ? dyLocal : -dyLocal) * 0.5);
            currentResizeFontSizeRef.current = newFontSize;
            if (elementDom) elementDom.style.fontSize = `${newFontSize * scale}cqw`;
          }

          // Left/right (and corners) adjust the wrap width, edge-anchored.
          if (horizontal) {
            currentResizeWidthRef.current = newWidth;
            currentResizeXPercentRef.current = newXPercent;
            currentResizeFlipHRef.current = newFlipH;
            if (elementDom) {
              elementDom.style.width = `${newWidth * scale}cqw`;
              elementDom.style.maxWidth = 'none';
              applyTransform();
            }
          } else if (elementDom) {
            // Font-only handle: repaint the (unchanged) orientation so a prior
            // frame's mirror preview can't linger.
            applyTransform();
          }
          return;
        }

        // image or asset (logo / signature): width only, from whichever handle. For
        // pure top/bottom handles use the vertical drag to drive width (no flip).
        if (!horizontal && (growsTop || growsBottom)) {
          const vUnits = growsBottom ? dyLocal / pxPerUnit : -dyLocal / pxPerUnit;
          newWidth = clampWidth(startWidth + vUnits);
        }
        currentResizeWidthRef.current = newWidth;
        // Keep the grabbed side edge under the pointer for left/right handles.
        if (horizontal) {
          currentResizeXPercentRef.current = newXPercent;
          currentResizeFlipHRef.current = newFlipH;
        }
        if (elementDom) {
          elementDom.style.width = `${newWidth * scale}cqw`;
          applyTransform();
          if (currentResize.kind === 'asset') {
            const imgDom = elementDom.querySelector('img');
            if (imgDom) (imgDom as HTMLElement).style.width = `${newWidth * scale}cqw`;
          }
        }
      });
    };

    const handleGlobalMouseUp = () => {
      const currentResize = resizingItemRef.current;
      const finalWidth = currentResizeWidthRef.current;
      const finalFontSize = currentResizeFontSizeRef.current;
      const finalHeight = currentResizeHeightRef.current;
      const finalX = currentResizeXPercentRef.current;
      const finalY = currentResizeYPercentRef.current;
      const finalFlipH = currentResizeFlipHRef.current;

      if (currentResize) {
        // Rewrite the DOM to the exact resting state React will render next. The
        // gesture mutated `transform`/`left`/`top` directly; React does not touch
        // `transform` (its declarative value is unchanged), so if we left the live
        // preview transform in place the element would keep the centre-shift and
        // appear to "teleport" on the next interaction. This is that fix.
        const committedFlipH = finalFlipH ?? currentResize.startFlipH;
        const elementDom = document.getElementById(`canvas-item-${currentResize.id}`);
        if (elementDom) {
          if (finalX !== null) elementDom.style.left = `${roundFreePercent(finalX)}%`;
          if (finalY !== null) elementDom.style.top = `${roundFreePercent(finalY)}%`;
          elementDom.style.transform = elementTransform(
            currentResize.startRotation,
            committedFlipH,
            currentResize.startFlipV,
          );
        }

        setCurrentTemplate(prev => {
          const updated = { ...prev };

          if (currentResize.id === 'logo') {
            if (finalWidth !== null) updated.logoWidth = finalWidth;
            if (finalX !== null) updated.logoX = roundFreePercent(finalX);
            if (finalFlipH !== null) updated.logoFlipH = finalFlipH;
          } else if (currentResize.id === 'signature') {
            if (finalWidth !== null) updated.signatureWidth = finalWidth;
            if (finalX !== null) updated.signatureX = roundFreePercent(finalX);
            if (finalFlipH !== null) updated.signatureFlipH = finalFlipH;
          } else if (currentResize.id === 'secondarySignature') {
            if (finalWidth !== null) updated.secondarySignatureWidth = finalWidth;
            if (finalX !== null) updated.secondarySignatureX = roundFreePercent(finalX);
            if (finalFlipH !== null) updated.secondarySignatureFlipH = finalFlipH;
          } else {
            updated.textElements = prev.textElements.map(el => {
              if (el.id === currentResize.id) {
                const updatedEl = { ...el };
                if (finalWidth !== null) updatedEl.width = finalWidth;
                if (finalFontSize !== null) updatedEl.fontSize = finalFontSize;
                if (finalHeight !== null) updatedEl.height = finalHeight;
                if (finalX !== null) updatedEl.xPercent = roundFreePercent(finalX);
                if (finalY !== null) updatedEl.yPercent = roundFreePercent(finalY);
                if (finalFlipH !== null) updatedEl.flipH = finalFlipH;
                return updatedEl;
              }
              return el;
            });
          }

          pushToHistory(updated);
          return updated;
        });
      }

      currentResizeWidthRef.current = null;
      currentResizeFontSizeRef.current = null;
      currentResizeHeightRef.current = null;
      currentResizeXPercentRef.current = null;
      currentResizeYPercentRef.current = null;
      currentResizeFlipHRef.current = null;
      setResizingItem(null);
    };

    document.addEventListener('pointermove', handleGlobalMouseMove);
    document.addEventListener('pointerup', handleGlobalMouseUp);
    document.addEventListener('pointercancel', handleGlobalMouseUp);

    return () => {
      cancelAnimationFrame(rafId);
      document.removeEventListener('pointermove', handleGlobalMouseMove);
      document.removeEventListener('pointerup', handleGlobalMouseUp);
      document.removeEventListener('pointercancel', handleGlobalMouseUp);
    };
  }, [resizingItem !== null]);

  // Helper to remove signature background (off-white to pure white pixels)
  // and make them transparent on client-side using Canvas.
  const removeSignatureBackground = (dataUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.src = dataUrl;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0);
        try {
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imgData.data;

          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            const brightness = (r + g + b) / 3;
            // Threshold of 210 for background stripping
            if (brightness > 210) {
              data[i + 3] = 0; // Transparent
            } else {
              // Increase contrast/darken ink slightly
              data[i] = Math.max(0, r - 30);
              data[i + 1] = Math.max(0, g - 30);
              data[i + 2] = Math.max(0, b - 30);
            }
          }
          ctx.putImageData(imgData, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        } catch (err) {
          console.error("Canvas pixel read failed: ", err);
          resolve(dataUrl);
        }
      };
      img.onerror = () => {
        resolve(dataUrl);
      };
    });
  };

  // Image Upload handler for Custom Assets (Base64)
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'signature' | 'secondarySignature' | 'backgroundImage') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3.5 * 1024 * 1024) {
      toast.error("Image is too large. Please select an image smaller than 3.5MB for fast database encoding.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Data = event.target?.result as string;
      if (type === 'logo') {
        const updated = {
          ...currentTemplate,
          logoUrl: base64Data,
          logoIconType: 'none' // Clear vector logo when custom image is uploaded
        };
        setCurrentTemplate(updated);
        pushToHistory(updated);
      } else if (type === 'signature') {
        removeSignatureBackground(base64Data).then(cleanedBase64 => {
          const updated = {
            ...currentTemplate,
            signatureUrl: cleanedBase64
          };
          setCurrentTemplate(updated);
          pushToHistory(updated);
        });
      } else if (type === 'secondarySignature') {
        removeSignatureBackground(base64Data).then(cleanedBase64 => {
          const updated = {
            ...currentTemplate,
            secondarySignatureUrl: cleanedBase64
          };
          setCurrentTemplate(updated);
          pushToHistory(updated);
        });
      } else if (type === 'backgroundImage') {
        const updated = {
          ...currentTemplate,
          backgroundImageUrl: base64Data
        };
        setCurrentTemplate(updated);
        pushToHistory(updated);
      }
    };
    reader.readAsDataURL(file);
  };

  // Text element specific updates
  const updateTextElementProperty = (id: string, property: keyof TextElement, value: any) => {
    const updatedElements = currentTemplate.textElements.map(el => {
      if (el.id === id) {
        const next = { ...el, [property]: value };
        // Editing the text must not wipe inline styling: re-map the runs onto the
        // new string so unchanged words keep their color/bold/italic/underline.
        if (property === 'text') {
          const remapped = remapRichTextRuns(el.richText, el.text, value as string);
          if (remapped.some(runHasStyle)) next.richText = remapped;
          else delete next.richText;
        }
        return next;
      }
      return el;
    });
    const updated = {
      ...currentTemplate,
      textElements: updatedElements
    };
    setCurrentTemplate(updated);
    pushToHistory(updated);
  };

  const updateTextAreaSelection = (id: string, target: HTMLTextAreaElement) => {
    setTextSelection({ id, start: target.selectionStart, end: target.selectionEnd });
  };

  const getTextSelectionRange = (
    id: string,
    textLength: number,
    explicitSelection?: { start: number; end: number },
  ) => {
    const selection = explicitSelection ?? (textSelection?.id === id ? textSelection : null);
    const start = Math.max(0, Math.min(textLength, selection?.start ?? 0));
    const end = Math.max(0, Math.min(textLength, selection?.end ?? textLength));
    if (start === end) return { start: 0, end: textLength };
    return { start: Math.min(start, end), end: Math.max(start, end) };
  };

  const runStyle = (run: RichTextRun): React.CSSProperties => ({
    color: run.color,
    fontWeight: run.fontWeight === 'bold' ? 700 : (run.fontWeight === 'medium' ? 500 : run.fontWeight),
    fontStyle: run.fontStyle,
    textDecoration: run.textDecoration,
  });

  const rangeRunsEvery = (
    el: TextElement,
    test: (run: RichTextRun) => boolean,
    explicitSelection?: { start: number; end: number },
  ) => {
    const { start, end } = getTextSelectionRange(el.id, el.text.length, explicitSelection);
    let cursor = 0;
    let touched = false;

    for (const run of normalizeRichTextRuns(el)) {
      const runStart = cursor;
      const runEnd = cursor + run.text.length;
      cursor = runEnd;
      if (Math.max(runStart, start) >= Math.min(runEnd, end)) continue;
      touched = true;
      if (!test(run)) return false;
    }

    return touched;
  };

  const getSelectionColor = (el: TextElement) => {
    const { start, end } = getTextSelectionRange(el.id, el.text.length);
    let cursor = 0;

    for (const run of normalizeRichTextRuns(el)) {
      const runStart = cursor;
      const runEnd = cursor + run.text.length;
      cursor = runEnd;
      if (Math.max(runStart, start) < Math.min(runEnd, end)) return run.color ?? el.color;
    }

    return el.color;
  };

  const updateSelectedTextStyle = (
    id: string,
    patch: RichTextStylePatch,
    explicitSelection?: { start: number; end: number },
  ) => {
    const updatedElements = currentTemplate.textElements.map(el => {
      if (el.id !== id) return el;
      const { start, end } = getTextSelectionRange(id, el.text.length, explicitSelection);
      return {
        ...el,
        richText: applyRichTextStyleToRange(el, start, end, patch),
      };
    });

    const updated = { ...currentTemplate, textElements: updatedElements };
    setCurrentTemplate(updated);
    pushToHistory(updated);
  };

  const toggleSelectedTextStyle = (
    el: TextElement,
    style: 'bold' | 'italic' | 'underline',
    explicitSelection?: { start: number; end: number },
  ) => {
    if (style === 'bold') {
      const selectedBold = rangeRunsEvery(el, (run) => (run.fontWeight ?? el.fontWeight) === 'bold', explicitSelection);
      updateSelectedTextStyle(el.id, { fontWeight: selectedBold ? 'normal' : 'bold' }, explicitSelection);
      return;
    }

    if (style === 'italic') {
      const selectedItalic = rangeRunsEvery(
        el,
        (run) => (run.fontStyle ?? el.fontStyle ?? 'normal') === 'italic',
        explicitSelection,
      );
      updateSelectedTextStyle(el.id, { fontStyle: selectedItalic ? 'normal' : 'italic' }, explicitSelection);
      return;
    }

    const selectedUnderline = rangeRunsEvery(
      el,
      (run) => (run.textDecoration ?? el.textDecoration ?? 'none') === 'underline',
      explicitSelection,
    );
    updateSelectedTextStyle(el.id, { textDecoration: selectedUnderline ? 'none' : 'underline' }, explicitSelection);
  };

  const handleTextAreaShortcut = (el: TextElement, e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!(e.ctrlKey || e.metaKey) || e.altKey) return;

    const key = e.key.toLowerCase();
    if (!['b', 'i', 'u'].includes(key)) return;

    e.preventDefault();
    e.stopPropagation();
    const selection = {
      start: e.currentTarget.selectionStart,
      end: e.currentTarget.selectionEnd,
    };
    setTextSelection({ id: el.id, ...selection });
    toggleSelectedTextStyle(el, key === 'b' ? 'bold' : key === 'i' ? 'italic' : 'underline', selection);
  };

  const renderRichText = (el: TextElement, replacements: Record<string, string>) => {
    const runs = resolveRichTextRuns(el, replacements);
    return runs.map((run, index) => (
      <span key={`${index}-${run.text}`} style={runStyle(run)}>
        {run.text}
      </span>
    ));
  };

  const prepareTemplateForSave = (): CertificateTemplate => ({
    ...currentTemplate,
    textElements: currentTemplate.textElements.map((el) => {
      if (el.type === 'redaction' || el.imageUrl) return el;

      const runs = normalizeRichTextRuns(el);
      const hasCustomRunStyle = runs.some(
        (run) => run.color || run.fontWeight || run.fontStyle || run.textDecoration,
      );

      if (!hasCustomRunStyle || plainTextFromRuns(runs) !== el.text) {
        const { richText, ...plainElement } = el;
        return plainElement;
      }

      return { ...el, richText: runs };
    }),
  });

  // Custom visual template preset applicator - fully replaces template, no overlapping
  const applyPresetDesign = (preset: (typeof BEAUTIFUL_PRESETS)[0]) => {
    if (!preset) return;
    // Deep-clone preset textElements to avoid reference sharing between templates
    const freshTextElements: TextElement[] = JSON.parse(JSON.stringify(preset.textElements));
    const updated: CertificateTemplate = {
      id: currentTemplate.id,
      workspaceId: currentTemplate.workspaceId,
      name: preset.name,
      layout: preset.layout || 'landscape',
      backgroundColor: preset.backgroundColor,
      borderColor: preset.borderColor,
      borderWidth: preset.borderWidth,
      borderRadius: preset.borderRadius ?? 0,
      borderStyle: preset.borderStyle || 'solid',
      backgroundGradient: preset.backgroundGradient,
      decorFlourish: preset.decorFlourish || 'none',
      showSeal: preset.showSeal,
      sealType: preset.sealType,
      showQrCode: preset.showQrCode,
      qrCodeX: preset.qrCodeX,
      qrCodeY: preset.qrCodeY,
      qrCodeWidth: preset.qrCodeWidth,
      qrCodeCustomUrl: preset.qrCodeCustomUrl,
      sealWidth: preset.sealWidth,
      logoUrl: preset.logoUrl || '',
      logoIconType: preset.logoIconType,
      logoX: preset.logoX,
      logoY: preset.logoY,
      logoWidth: preset.logoWidth,
      signatureUrl: preset.signatureUrl || '',
      secondarySignatureUrl: preset.secondarySignatureUrl || '',
      signatureX: preset.signatureX,
      signatureY: preset.signatureY,
      signatureWidth: preset.signatureWidth,
      signatoryName: preset.signatoryName,
      signatoryTitle: preset.signatoryTitle,
      showSecondarySignatory: preset.showSecondarySignatory,
      secondarySignatoryName: preset.secondarySignatoryName,
      secondarySignatoryTitle: preset.secondarySignatoryTitle,
      secondarySignatureX: preset.secondarySignatureX ?? 70,
      secondarySignatureY: preset.secondarySignatureY ?? 78,
      secondarySignatureWidth: preset.secondarySignatureWidth ?? 100,
      backgroundImageUrl: undefined, // clear any uploaded backdrop on template switch
      textElements: freshTextElements,
      customFonts: currentTemplate.customFonts,
    };
    setSelectedElId(null);
    setCurrentTemplate(updated);
    pushToHistory(updated);
  };

  const handleSampleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const commaIdx = result.indexOf(',');
      const data = result.substring(commaIdx + 1);
      const mimeType = file.type || 'image/png';
      setAiSampleImage({ data, mimeType });
    };
    reader.readAsDataURL(file);
  };

  const handleDirectSampleParsingUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
      toast.error("Image is too large. Please select an image smaller than 4MB.");
      return;
    }

    setIsParsingSample(true);
    setParsingProgress("Reading image data...");

    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const result = reader.result as string;
        const commaIdx = result.indexOf(',');
        const base64Data = result.substring(commaIdx + 1);
        const mimeType = file.type || 'image/png';

        setParsingProgress("Analyzing certificate with Gemini AI...");

        const res = await fetch('/api/ai/parse-sample', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            sampleImage: { data: base64Data, mimeType }
          })
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Server failed to analyze the certificate image');
        }

        const data = await res.json();
        setParsingProgress("Generating editable canvas layers...");

        // Build template from parsed response
        const detected = data.detectedElements || [];
        
        // 1. We keep the base64Data image as the backdrop background image
        const backgroundImageUrl = result; // base64 data url

        // 2. Convert detected elements into CanvaEditor TextElements (and redactions)
        const textElements: TextElement[] = [];

        // Track positions for other assets
        let logoX = 50;
        let logoY = 15;
        let logoWidth = 100;
        let hasLogo = false;

        let signatureX = 30;
        let signatureY = 80;
        let signatureWidth = 100;
        let hasSignature = false;

        let secondarySignatureX = 70;
        let secondarySignatureY = 80;
        let secondarySignatureWidth = 100;
        let hasSecondarySignature = false;

        let qrCodeX = 50;
        let qrCodeY = 80;
        let qrCodeWidth = 60;
        let hasQrCode = false;

        let sealX = 85;
        let sealY = 80;
        let sealWidth = 80;
        let hasSeal = false;

        detected.forEach((el: any, idx: number) => {
          const randomId = Math.random().toString(36).substring(2, 7);
          
          // Every element gets a redaction patch to hide the original pixels!
          textElements.push({
            id: `t-redaction-${idx}-${randomId}`,
            type: 'redaction',
            text: '',
            xPercent: el.xPercent,
            yPercent: el.yPercent,
            width: el.width || 120,
            height: el.height || 30,
            color: el.backgroundColor || '#FFFFFF',
            fontSize: 12,
            fontWeight: 'normal',
            fontFamily: 'Inter',
            align: 'center'
          });

          // If it's text, also create an editable text layer on top of the redaction patch
          if (el.type === 'text') {
            let processedText = el.text || '';
            textElements.push({
              id: `t-text-${idx}-${randomId}`,
              type: 'text',
              text: processedText,
              xPercent: el.xPercent,
              yPercent: el.yPercent,
              width: el.width || 512,
              fontSize: el.fontSize || 14,
              fontFamily: el.fontFamily || 'Inter',
              fontWeight: el.fontWeight || 'normal',
              color: el.textColor || '#000000',
              align: el.align || 'center',
              isPlaceholder: el.isPlaceholder || false
            });
          } else if (el.type === 'logo') {
            hasLogo = true;
            logoX = el.xPercent;
            logoY = el.yPercent;
            logoWidth = el.width || 100;
          } else if (el.type === 'signature') {
            if (!hasSignature) {
              hasSignature = true;
              signatureX = el.xPercent;
              signatureY = el.yPercent;
              signatureWidth = el.width || 100;
            } else {
              hasSecondarySignature = true;
              secondarySignatureX = el.xPercent;
              secondarySignatureY = el.yPercent;
              secondarySignatureWidth = el.width || 100;
            }
          } else if (el.type === 'seal') {
            hasSeal = true;
            sealX = el.xPercent;
            sealY = el.yPercent;
            sealWidth = el.width || 80;
          }
        });

        // 3. Construct a fully customized template from the sample
        const parsedTemplate: CertificateTemplate = {
          ...currentTemplate,
          name: `Parsed - ${file.name.split('.')[0]}`,
          backgroundImageUrl,
          backgroundColor: '#FFFFFF', // default white base
          borderColor: '#E2E8F0',
          borderWidth: 0, // border is part of the image
          decorFlourish: 'none',
          showSeal: hasSeal,
          sealType: hasSeal ? 'gold_medallion' : 'none',
          sealWidth: sealWidth,
          logoX,
          logoY,
          logoWidth,
          logoIconType: hasLogo ? 'tech' : 'none',
          signatureX,
          signatureY,
          signatureWidth,
          showSecondarySignatory: hasSecondarySignature,
          secondarySignatureX,
          secondarySignatureY,
          secondarySignatureWidth,
          textElements
        };

        setCurrentTemplate(parsedTemplate);
        pushToHistory(parsedTemplate);
        setSelectedElId(null);
        setParsingProgress("Successfully loaded design!");
        setTimeout(() => setIsParsingSample(false), 800);
      } catch (err: any) {
        console.error(err);
        toast.error(err.message || "Failed to analyze certificate sample. Please try another image.");
        setIsParsingSample(false);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const generateTemplateWithAi = async () => {
    if (!aiPrompt.trim()) return;
    setIsGeneratingAi(true);
    setAiError(null);
    try {
      const res = await fetch('/api/ai/generate-template', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ 
          prompt: aiPrompt,
          sampleImage: aiSampleImage
        })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Server error generating design');
      }
      const data = await res.json();
      applyAiGeneratedDesign(data);
      setAiPrompt('');
      setAiSampleImage(null);
    } catch (err: any) {
      console.error(err);
      setAiError(err.message || 'Error communicating with AI service');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const applyAiGeneratedDesign = (design: any) => {
    const updated: CertificateTemplate = {
      ...currentTemplate,
      backgroundColor: design.backgroundColor,
      borderColor: design.borderColor,
      borderWidth: design.borderWidth,
      backgroundImageUrl: design.backgroundImageUrl,
      textElements: design.textElements,
      // Logo settings
      ...(design.logoX !== undefined ? { logoX: design.logoX } : {}),
      ...(design.logoY !== undefined ? { logoY: design.logoY } : {}),
      ...(design.logoWidth !== undefined ? { logoWidth: design.logoWidth } : {}),
      // Signature settings
      ...(design.signatureX !== undefined ? { signatureX: design.signatureX } : {}),
      ...(design.signatureY !== undefined ? { signatureY: design.signatureY } : {}),
      ...(design.signatureWidth !== undefined ? { signatureWidth: design.signatureWidth } : {}),
      ...(design.signatoryName !== undefined ? { signatoryName: design.signatoryName } : {}),
      ...(design.signatoryTitle !== undefined ? { signatoryTitle: design.signatoryTitle } : {}),
      // Secondary signatory settings
      ...(design.showSecondarySignatory !== undefined ? { showSecondarySignatory: design.showSecondarySignatory } : {}),
      ...(design.secondarySignatureX !== undefined ? { secondarySignatureX: design.secondarySignatureX } : {}),
      ...(design.secondarySignatureY !== undefined ? { secondarySignatureY: design.secondarySignatureY } : {}),
      ...(design.secondarySignatureWidth !== undefined ? { secondarySignatureWidth: design.secondarySignatureWidth } : {}),
      ...(design.secondarySignatoryName !== undefined ? { secondarySignatoryName: design.secondarySignatoryName } : {}),
      ...(design.secondarySignatoryTitle !== undefined ? { secondarySignatoryTitle: design.secondarySignatoryTitle } : {}),
      // QR Code and Seal settings
      ...(design.showQrCode !== undefined ? { showQrCode: design.showQrCode } : {}),
      ...(design.qrCodeX !== undefined ? { qrCodeX: design.qrCodeX } : {}),
      ...(design.qrCodeY !== undefined ? { qrCodeY: design.qrCodeY } : {}),
      ...(design.qrCodeWidth !== undefined ? { qrCodeWidth: design.qrCodeWidth } : {}),
      ...(design.showSeal !== undefined ? { showSeal: design.showSeal } : {}),
      ...(design.sealType !== undefined ? { sealType: design.sealType } : {}),
      ...(design.sealWidth !== undefined ? { sealWidth: design.sealWidth } : {})
    };
    setCurrentTemplate(updated);
    pushToHistory(updated);
  };

  const nudgeSelectedElement = (direction: 'up' | 'down' | 'left' | 'right', shiftKey: boolean) => {
    if (!selectedElId) return;
    const canvas = canvasRef.current;
    const rect = canvas?.getBoundingClientRect();
    const stepPx = shiftKey ? 10 : 1;
    const stepX = rect?.width ? (stepPx / rect.width) * 100 : (shiftKey ? 1 : 0.1);
    const stepY = rect?.height ? (stepPx / rect.height) * 100 : (shiftKey ? 1 : 0.1);
    // Check if it's a text element
    const isTextEl = currentTemplate.textElements.some(el => el.id === selectedElId);
    
    if (isTextEl) {
      const updatedElements = currentTemplate.textElements.map(el => {
        if (el.id === selectedElId) {
          let newX = el.xPercent;
          let newY = el.yPercent;
          if (direction === 'left') newX = roundFreePercent(el.xPercent - stepX);
          else if (direction === 'right') newX = roundFreePercent(el.xPercent + stepX);
          else if (direction === 'up') newY = roundFreePercent(el.yPercent - stepY);
          else if (direction === 'down') newY = roundFreePercent(el.yPercent + stepY);
          return { ...el, xPercent: newX, yPercent: newY };
        }
        return el;
      });
      const updated = { ...currentTemplate, textElements: updatedElements };
      setCurrentTemplate(updated);
      pushToHistory(updated);
    } else {
      // Non-text elements: logo, signature, secondarySignature, seal
      const updated = { ...currentTemplate };
      if (selectedElId === 'logo') {
        if (direction === 'left') updated.logoX = roundFreePercent(updated.logoX - stepX);
        else if (direction === 'right') updated.logoX = roundFreePercent(updated.logoX + stepX);
        else if (direction === 'up') updated.logoY = roundFreePercent(updated.logoY - stepY);
        else if (direction === 'down') updated.logoY = roundFreePercent(updated.logoY + stepY);
      } else if (selectedElId === 'signature') {
        if (direction === 'left') updated.signatureX = roundFreePercent(updated.signatureX - stepX);
        else if (direction === 'right') updated.signatureX = roundFreePercent(updated.signatureX + stepX);
        else if (direction === 'up') updated.signatureY = roundFreePercent(updated.signatureY - stepY);
        else if (direction === 'down') updated.signatureY = roundFreePercent(updated.signatureY + stepY);
      } else if (selectedElId === 'secondarySignature') {
        const currentX = updated.secondarySignatureX ?? 70;
        const currentY = updated.secondarySignatureY ?? 78;
        if (direction === 'left') updated.secondarySignatureX = roundFreePercent(currentX - stepX);
        else if (direction === 'right') updated.secondarySignatureX = roundFreePercent(currentX + stepX);
        else if (direction === 'up') updated.secondarySignatureY = roundFreePercent(currentY - stepY);
        else if (direction === 'down') updated.secondarySignatureY = roundFreePercent(currentY + stepY);
      } else if (selectedElId === 'seal') {
        if (direction === 'left') updated.qrCodeX = roundFreePercent(updated.qrCodeX - stepX);
        else if (direction === 'right') updated.qrCodeX = roundFreePercent(updated.qrCodeX + stepX);
        else if (direction === 'up') updated.qrCodeY = roundFreePercent(updated.qrCodeY - stepY);
        else if (direction === 'down') updated.qrCodeY = roundFreePercent(updated.qrCodeY + stepY);
      } else {
        return;
      }
      setCurrentTemplate(updated);
      pushToHistory(updated);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is typing in input, textarea, select or contenteditable
      const activeEl = document.activeElement;
      if (
        activeEl && (
          activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.tagName === 'SELECT' ||
          activeEl.hasAttribute('contenteditable') ||
          (activeEl as HTMLElement).isContentEditable
        )
      ) {
        return;
      }

      // Ctrl+Z or Cmd+Z: Undo
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleUndo();
        return;
      }

      // Ctrl+Y or Cmd+Y: Redo
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
        return;
      }

      // Ctrl+D or Cmd+D: Duplicate
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        if (selectedElId && selectedElId.startsWith('t-')) {
          e.preventDefault();
          duplicateElement(selectedElId);
        }
        return;
      }

      // Backspace or Delete: Delete selected element
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedElId) {
          e.preventDefault();
          deleteSelectedElement(selectedElId);
        }
        return;
      }

      // Arrow Keys nudging
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        if (selectedElId) {
          e.preventDefault();
          const dirMap: Record<string, 'up' | 'down' | 'left' | 'right'> = {
            ArrowUp: 'up',
            ArrowDown: 'down',
            ArrowLeft: 'left',
            ArrowRight: 'right',
          };
          nudgeSelectedElement(dirMap[e.key], e.shiftKey);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedElId, currentTemplate, history, historyIndex]);

  const snapToGridRef = useRef(snapToGrid);
  useEffect(() => {
    snapToGridRef.current = snapToGrid;
  }, [snapToGrid]);

  const currentCoordsRef = useRef<{ x: number; y: number } | null>(null);

  // Native drag loop: no React state changes while the pointer is moving.
  const beginDrag = (e: React.PointerEvent, id: string, _startXPercent: number, _startYPercent: number) => {
    // Space-drag pans the canvas: let the event bubble to the viewport untouched.
    if (spaceHeldRef.current) return;
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    const canvas = canvasRef.current;
    const element = e.currentTarget as HTMLElement;
    if (!canvas) return;

    const canvasRect = canvas.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    if (canvasRect.width === 0 || canvasRect.height === 0) return;

    const startLeft = ((elementRect.left + elementRect.width / 2 - canvasRect.left) / canvasRect.width) * 100;
    const startTop = ((elementRect.top + elementRect.height / 2 - canvasRect.top) / canvasRect.height) * 100;

    const orientation = transformParamsFor(id);
    const transformSuffix = elementTransformSuffix(orientation.rotation, orientation.flipH, orientation.flipV);
    const restingTransform = elementTransform(orientation.rotation, orientation.flipH, orientation.flipV);

    const session: DragSession = {
      id,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startLeft,
      startTop,
      canvasWidth: canvasRect.width,
      canvasHeight: canvasRect.height,
      movingHw: (elementRect.width / 2 / canvasRect.width) * 100,
      movingHh: (elementRect.height / 2 / canvasRect.height) * 100,
      snapBoxes: snapshotSnapBoxes(id, canvasRect),
      element,
      focusOnClick: selectedElId !== id,
      moved: false,
      previousTransition: element.style.transition,
      previousWillChange: element.style.willChange,
      previousTransform: element.style.transform,
      restingTransform,
      transformSuffix,
      rafId: null,
      lastEvent: null,
    };

    dragSessionRef.current = session;
    currentCoordsRef.current = null;
    setContextMenu(null);
    if (session.focusOnClick) setSelectedElId(id);

    element.style.transition = 'none';
    element.style.willChange = 'transform';

    try {
      element.setPointerCapture(e.pointerId);
    } catch {
      /* pointer capture is best-effort; window listeners keep the drag alive */
    }

    const pulseSnap = (guideX: Guide | null, guideY: Guide | null) => {
      const key = `${guideX ? guideX.pos.toFixed(1) : ''}|${guideY ? guideY.pos.toFixed(1) : ''}`;
      if (key === snapEngagedRef.current) return;
      if (guideX || guideY) {
        try { navigator.vibrate?.(8); } catch { /* not supported */ }
      }
      snapEngagedRef.current = key;
    };

    const paint = () => {
      const active = dragSessionRef.current;
      const event = active?.lastEvent;
      if (!active || !event) return;
      active.rafId = null;

      const deltaX = event.clientX - active.startX;
      const deltaY = event.clientY - active.startY;
      if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) active.moved = true;

      let nextX = active.startLeft + (deltaX / active.canvasWidth) * 100;
      let nextY = active.startTop + (deltaY / active.canvasHeight) * 100;
      let guideX: Guide | null = null;
      let guideY: Guide | null = null;

      if (event.altKey) {
        hideGuides();
      } else {
        const tx = (6 / active.canvasWidth) * 100;
        const ty = (6 / active.canvasHeight) * 100;
        const moving = { x: nextX, y: nextY, hw: active.movingHw, hh: active.movingHh };
        const canvasSnap = computeSnap(moving, [], tx, ty, {
          includeCanvas: true,
          canvasLines: 'center',
          movingAnchors: 'center',
        });
        nextX = canvasSnap.x;
        nextY = canvasSnap.y;
        guideX = canvasSnap.guideX;
        guideY = canvasSnap.guideY;

        if (snapToGridRef.current) {
          const adjacentSnap = computeSnap(
            { x: nextX, y: nextY, hw: active.movingHw, hh: active.movingHh },
            active.snapBoxes,
            tx,
            ty,
            { includeCanvas: false },
          );
          if (adjacentSnap.snappedX) {
            nextX = adjacentSnap.x;
            guideX = adjacentSnap.guideX;
          }
          if (adjacentSnap.snappedY) {
            nextY = adjacentSnap.y;
            guideY = adjacentSnap.guideY;
          }
          if (!canvasSnap.snappedX && !adjacentSnap.snappedX) nextX = Math.round(nextX / 2.5) * 2.5;
          if (!canvasSnap.snappedY && !adjacentSnap.snappedY) nextY = Math.round(nextY / 2.5) * 2.5;
        }

        renderGuides(guideX, guideY);
        pulseSnap(guideX, guideY);
      }

      nextX = clampFreePercent(nextX);
      nextY = clampFreePercent(nextY);
      const commitX = roundFreePercent(nextX);
      const commitY = roundFreePercent(nextY);
      currentCoordsRef.current = { x: commitX, y: commitY };

      // The element lives inside the zoom-scaled canvas, so a local translate is
      // magnified by `zoom` on screen. Divide it back out so the preview tracks the
      // pointer 1:1 at any zoom; the committed percentage is already scale-correct.
      const z = zoomRef.current || 1;
      const visualDx = (((nextX - active.startLeft) / 100) * active.canvasWidth) / z;
      const visualDy = (((nextY - active.startTop) / 100) * active.canvasHeight) / z;
      // The rotate/flip suffix trails the live translate so a rotated element keeps
      // its orientation while it slides under the pointer.
      active.element.style.transform =
        `translate(-50%, -50%) translate3d(${visualDx}px, ${visualDy}px, 0)${active.transformSuffix ? ' ' + active.transformSuffix : ''}`;
    };

    const onPointerMove = (event: PointerEvent) => {
      const active = dragSessionRef.current;
      if (!active || event.pointerId !== active.pointerId) return;
      event.preventDefault();
      active.lastEvent = event;
      if (active.rafId === null) active.rafId = requestAnimationFrame(paint);
    };

    const endDrag = (event: PointerEvent) => {
      const active = dragSessionRef.current;
      if (!active || event.pointerId !== active.pointerId) return;
      event.preventDefault();

      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', endDrag);
      window.removeEventListener('pointercancel', endDrag);
      if (active.rafId !== null) cancelAnimationFrame(active.rafId);
      active.rafId = null;
      active.lastEvent = event;
      paint();

      hideGuides();
      const finalCoords = currentCoordsRef.current;
      if (finalCoords && active.moved) {
        active.element.style.left = `${finalCoords.x}%`;
        active.element.style.top = `${finalCoords.y}%`;
      }
      // Restore the clean resting transform (centre + rotate/flip), never the
      // captured `previousTransform`, which may carry a stale live-preview offset
      // from an earlier gesture that React had no reason to reconcile away.
      active.element.style.transform = active.restingTransform;
      active.element.style.willChange = active.previousWillChange;
      requestAnimationFrame(() => {
        active.element.style.transition = active.previousTransition;
      });

      try {
        active.element.releasePointerCapture(active.pointerId);
      } catch {
        /* no capture to release */
      }

      if (active.focusOnClick && !active.moved) {
        selectElementAndFocus(active.id);
      }

      if (active.moved && finalCoords) {
        setCurrentTemplate(prev => {
          const updated = { ...prev };
          const { x: newX, y: newY } = finalCoords;

          if (active.id === 'logo') {
            updated.logoX = newX;
            updated.logoY = newY;
          } else if (active.id === 'signature') {
            updated.signatureX = newX;
            updated.signatureY = newY;
          } else if (active.id === 'secondarySignature') {
            updated.secondarySignatureX = newX;
            updated.secondarySignatureY = newY;
          } else if (active.id === 'seal') {
            updated.qrCodeX = newX;
            updated.qrCodeY = newY;
          } else {
            updated.textElements = prev.textElements.map(el =>
              el.id === active.id ? { ...el, xPercent: newX, yPercent: newY } : el,
            );
          }
          pushToHistory(updated);
          return updated;
        });
      }

      currentCoordsRef.current = null;
      dragSessionRef.current = null;
    };

    window.addEventListener('pointermove', onPointerMove, { passive: false });
    window.addEventListener('pointerup', endDrag, { passive: false });
    window.addEventListener('pointercancel', endDrag, { passive: false });
  };

  // Insert custom placeholder tags into chosen text block
  const insertPlaceholderTag = (tag: string) => {
    if (!selectedElId) return;
    const activeTextEl = currentTemplate.textElements.find(el => el.id === selectedElId);
    if (!activeTextEl) return;
    
    const insertion = `{{${tag}}}`;
    const newTextValue = activeTextEl.text + ' ' + insertion;
    updateTextElementProperty(selectedElId, 'text', newTextValue);
  };

  // Add a brand new Canva text layer
  const addNewTextLayer = (type: 'heading' | 'subheading' | 'body' | 'meta') => {
    const id = `t-custom-${Math.random().toString(36).substring(2, 7)}`;
    let text = 'New Custom Text Layer';
    let fontSize = 14;
    let fontWeight: 'normal' | 'medium' | 'bold' = 'medium';
    let fontFamily = 'Inter';
    let color = '#0F172A';
    
    if (type === 'heading') {
      text = 'DOUBLE CLICK TO EDIT HEADING';
      fontSize = 24;
      fontWeight = 'bold';
      fontFamily = 'Space Grotesk';
    } else if (type === 'subheading') {
      text = 'Custom subtitle template text';
      fontSize = 14;
      fontWeight = 'medium';
    } else if (type === 'meta') {
      text = 'VERIFICATION NO: {{id}}';
      fontSize = 9;
      fontFamily = 'JetBrains Mono';
    }

    const newElement: TextElement = {
      id,
      text,
      fontSize,
      fontFamily,
      fontWeight,
      color,
      xPercent: 50,
      yPercent: 50,
      align: 'center'
    };

    const updated = {
      ...currentTemplate,
      textElements: [...currentTemplate.textElements, newElement]
    };
    setCurrentTemplate(updated);
    pushToHistory(updated);
    setSelectedElId(id);
  };

  const addNewRedactionPatch = () => {
    const id = `t-redaction-${Math.random().toString(36).substring(2, 7)}`;
    const newElement: TextElement = {
      id,
      type: 'redaction',
      text: '',
      xPercent: 50,
      yPercent: 45,
      width: 200,
      height: 40,
      fontSize: 12,
      fontWeight: 'normal',
      fontFamily: 'Inter',
      color: '#FFFFFF',
      align: 'center'
    };

    const updated = {
      ...currentTemplate,
      textElements: [...currentTemplate.textElements, newElement]
    };
    setCurrentTemplate(updated);
    pushToHistory(updated);
    setSelectedElId(id);
  };

  const deleteSelectedElement = (id?: string) => {
    const targetId = id || selectedElId;
    if (!targetId) return;
    
    // Check if it's text element
    const remains = currentTemplate.textElements.filter(el => el.id !== targetId);
    if (remains.length === currentTemplate.textElements.length) {
      // Trying to delete something else, like logo or signature or seal
      if (targetId === 'logo') {
        updateTemplateProperties({ logoIconType: 'none', logoUrl: '' });
      } else if (targetId === 'signature') {
        updateTemplateProperties({ signatoryName: '', signatureUrl: '' });
      } else if (targetId === 'secondarySignature') {
        updateTemplateProperties({ showSecondarySignatory: false, secondarySignatureUrl: '' });
      } else if (targetId === 'seal') {
        updateTemplateProperties({ showQrCode: false, showSeal: false });
      }
      setSelectedElId(null);
      return;
    }

    const updated = {
      ...currentTemplate,
      textElements: remains
    };
    setCurrentTemplate(updated);
    pushToHistory(updated);
    setSelectedElId(null);
  };

  const resetElementSize = (id: string) => {
    if (id === 'logo') {
      updateTemplateProperty('logoWidth', 100);
    } else if (id === 'signature') {
      updateTemplateProperty('signatureWidth', 90);
    } else if (id === 'secondarySignature') {
      updateTemplateProperty('secondarySignatureWidth', 100);
    } else if (id.startsWith('t-')) {
      const updated = currentTemplate.textElements.map(el => {
        if (el.id === id) return { ...el, width: undefined, fontSize: el.isPlaceholder ? 12 : 14 };
        return el;
      });
      updateTemplateProperty('textElements', updated);
    }
  };

  // Logo rendering vector styles
  const renderLogoVector = (type: string, width: number) => {
    if (!type || type === 'none') return null;
    return (
      <div style={{ width: `${width * 0.125}cqw` }} className="flex items-center justify-center pointer-events-none select-none">
        {type === 'tech' && (
          <div className="w-full aspect-square bg-gradient-to-tr from-cyan-500 to-indigo-500 rounded-lg p-2 shadow-sm flex items-center justify-center text-white">
            <Sparkles className="w-2/3 h-2/3" />
          </div>
        )}
        {type === 'edu' && (
          <div className="w-full aspect-square bg-gradient-to-tr from-amber-600 to-rose-700 rounded-full p-2 shadow-sm flex items-center justify-center text-white">
            <Award className="w-2/3 h-2/3" />
          </div>
        )}
        {type === 'corp' && (
          <div className="w-full aspect-square bg-slate-900 border border-slate-600 rounded-sm p-2 shadow-sm flex items-center justify-center text-white">
            <div className="w-5 h-5 border-2 border-white rounded-full flex items-center justify-center">â˜…</div>
          </div>
        )}
        {type === 'science' && (
          <div className="w-full aspect-square bg-indigo-950 border border-indigo-400 rounded-full p-2 flex items-center justify-center text-sky-400">
            <QrCode className="w-2/3 h-2/3" />
          </div>
        )}
        {type === 'art' && (
          <div className="w-full aspect-square bg-rose-50 border border-rose-200 rounded-xl p-2 flex items-center justify-center text-rose-500">
            <div className="text-xl">â€</div>
          </div>
        )}
      </div>
    );
  };

  // Simulated handwriting scripts
  const renderHandwrittenSignature = (name: string, fontFamily: string = 'Playfair Display', fontSize: number = 18) => {
    let style = { 
      fontFamily: fontFamily, 
      fontStyle: 'italic',
      fontSize: `${fontSize * 0.09}cqw`
    };
    return (
      <div 
        style={style}
        className="text-center tracking-wide border-b border-slate-400 pb-1 text-slate-800"
      >
        {name || 'Signature'}
      </div>
    );
  };

  // Ornate frame corner decorations
  const renderCornerFlourish = (style: string, color: string) => {
    if (!style || style === 'none') return null;
    return (
      <>
        {/* Top-Left */}
        <div style={{ borderColor: color }} className="absolute top-2 left-2 w-8 h-8 border-t-2 border-l-2 pointer-events-none rounded-tl-sm opacity-60"></div>
        {/* Top-Right */}
        <div style={{ borderColor: color }} className="absolute top-2 right-2 w-8 h-8 border-t-2 border-r-2 pointer-events-none rounded-tr-sm opacity-60"></div>
        {/* Bottom-Left */}
        <div style={{ borderColor: color }} className="absolute bottom-2 left-2 w-8 h-8 border-b-2 border-l-2 pointer-events-none rounded-bl-sm opacity-60"></div>
        {/* Bottom-Right */}
        <div style={{ borderColor: color }} className="absolute bottom-2 right-2 w-8 h-8 border-b-2 border-r-2 pointer-events-none rounded-br-sm opacity-60"></div>
      </>
    );
  };

  return (
    <div className="fixed inset-0 bg-[#E2E8F0] text-slate-800 overflow-hidden z-[60] font-sans">

      {/* Floating brand + template title (top-left) */}
      <div className="absolute top-3 left-3 z-40 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/90 pl-2 pr-3 py-1.5 shadow-lg backdrop-blur">
        <span className="grid h-7 w-7 place-items-center rounded-xl bg-slate-950 text-white shrink-0">
          <Award className="w-4 h-4" />
        </span>
        <input
          type="text"
          value={currentTemplate.name}
          onChange={(e) => updateTemplateProperty('name', capitalizeWords(e.target.value))}
          className="bg-transparent text-sm font-bold text-slate-900 w-28 sm:w-52 focus:outline-none focus:bg-slate-50 rounded px-1 py-0.5 transition-all"
          placeholder="Template title…"
        />
      </div>

      {/* Floating actions (top-right): history, view aids, save, exit */}
      <div className="absolute top-3 right-3 z-40 flex items-center gap-2">
        <div className="flex items-center gap-0.5 rounded-2xl border border-slate-200 bg-white/90 p-1 shadow-lg backdrop-blur">
          <button
            onClick={handleUndo}
            disabled={historyIndex === 0}
            className={`grid h-8 w-8 place-items-center rounded-xl transition-colors ${historyIndex === 0 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleRedo}
            disabled={historyIndex === history.length - 1}
            className={`grid h-8 w-8 place-items-center rounded-xl transition-colors ${historyIndex === history.length - 1 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-0.5 rounded-2xl border border-slate-200 bg-white/90 p-1 shadow-lg backdrop-blur">
          <button
            type="button"
            onClick={() => setGridVisible(!gridVisible)}
            className={`grid h-8 w-8 place-items-center rounded-xl transition-all ${gridVisible ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
            title="Toggle alignment grid"
          >
            <Grid className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setSnapToGrid(!snapToGrid)}
            className={`grid h-8 w-8 place-items-center rounded-xl transition-all ${snapToGrid ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
            title="Snap to grid"
          >
            <MousePointerClick className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => directSampleUploadRef.current?.click()}
            className="grid h-8 w-8 place-items-center rounded-xl text-emerald-600 hover:bg-emerald-50 transition-all"
            title="Upload sample certificate"
          >
            <Upload className="w-4 h-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => onSave(prepareTemplateForSave())}
          disabled={isSaving}
          className="bg-slate-950 hover:bg-slate-800 text-white text-xs px-4 py-2.5 rounded-2xl font-bold shadow-lg transition-all flex items-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
          title="Save Canva style"
        >
          {isSaving ? <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">{isSaving ? 'Saving…' : 'Save Canva Style'}</span>
        </button>

        <button
          type="button"
          onClick={() => setShowExitConfirm(true)}
          className="grid h-[38px] w-[38px] place-items-center rounded-2xl border border-slate-200 bg-white/90 text-slate-600 hover:text-rose-600 hover:border-rose-200 shadow-lg backdrop-blur transition-all"
          title="Exit editor"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
      <input
          type="file"
          accept="image/png, image/jpeg"
          ref={sampleUploadRef}
          style={{ display: 'none' }}
          onChange={handleSampleImageUpload}
        />
      <input
          type="file"
          accept="image/png, image/jpeg"
          ref={directSampleUploadRef}
          style={{ display: 'none' }}
          onChange={handleDirectSampleParsingUpload}
        />
      <input
          type="file"
          accept=".ttf,font/ttf"
          ref={customFontUploadRef}
          style={{ display: 'none' }}
          onChange={handleCustomFontUpload}
        />
        {/* Full-screen free-roam workspace; every control floats over the canvas */}
      <div className="absolute inset-0">

        {/* Floating tool rail (top-center): each button opens its settings panel */}
        <div
          className="absolute top-3 left-1/2 -translate-x-1/2 z-40 flex items-center gap-0.5 rounded-2xl border border-slate-200 bg-white/90 p-1 shadow-lg backdrop-blur max-w-[70vw] overflow-x-auto"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {[
            { id: 'templates', icon: Award, label: 'Presets' },
            { id: 'ai', icon: Sparkles, label: 'AI Agent' },
            { id: 'text', icon: Type, label: 'Text' },
            { id: 'uploads', icon: Upload, label: 'Uploads' },
            { id: 'backdrop', icon: Image, label: 'Background' },
            { id: 'borders', icon: Sliders, label: 'Borders' },
            { id: 'seals', icon: QrCode, label: 'Stamps' },
            { id: 'sign', icon: User, label: 'Signatories' },
            { id: 'layers', icon: Layers, label: 'Layers' },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeSideTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSideTab(activeSideTab === tab.id ? null : (tab.id as any))}
                className={`group flex items-center gap-1.5 rounded-xl px-2.5 py-2 transition-all outline-none shrink-0 ${
                  isActive ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                }`}
                title={tab.label}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className={`text-[11px] font-bold whitespace-nowrap ${isActive ? 'inline' : 'hidden xl:inline'}`}>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Floating settings panel for the active tool (left overlay) */}
        {activeSideTab && (
        <div className="absolute left-3 top-16 bottom-16 w-[92vw] sm:w-80 z-40 bg-white border border-slate-200 rounded-2xl flex flex-col overflow-hidden shadow-2xl text-xs leading-normal text-slate-700 font-sans animate-fade-in">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 shrink-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{PANEL_TITLES[activeSideTab] || 'Settings'}</span>
            <button
              onClick={() => setActiveSideTab(null)}
              className="grid h-6 w-6 place-items-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              title="Close panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-5 space-y-6">

            {/* TAB: TEMPLATES */}
            {activeSideTab === 'templates' && (() => {
              const filteredPresets = BEAUTIFUL_PRESETS.filter(preset => {
                const matchesCategory = presetActiveCategory === 'All' || preset.category === presetActiveCategory;
                const matchesSearch = preset.name.toLowerCase().includes(presetSearchQuery.toLowerCase()) ||
                                      preset.programName.toLowerCase().includes(presetSearchQuery.toLowerCase()) ||
                                      (preset.category && preset.category.toLowerCase().includes(presetSearchQuery.toLowerCase()));
                return matchesCategory && matchesSearch;
              });

              return (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-650" /> Pre-designed Presets
                    </h3>
                    <p className="text-[10px] text-slate-500">Search and select from 50+ professional MNC-grade certificate templates.</p>
                  </div>

                  {/* Search Input Box */}
                  <div className="relative">
                    <input
                      type="text"
                      value={presetSearchQuery}
                      onChange={(e) => setPresetSearchQuery(e.target.value)}
                      placeholder="Search templates..."
                      className="w-full text-xs border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 focus:border-indigo-500 outline-none text-slate-800 bg-white"
                    />
                    <div className="absolute left-2.5 top-2 text-slate-400">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    {presetSearchQuery && (
                      <button
                        onClick={() => setPresetSearchQuery('')}
                        className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                      >
                        âœ•
                      </button>
                    )}
                  </div>

                  {/* Category Pills List */}
                  <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-200">
                    {['All', 'Technology & MNC', 'Business & Consulting', 'Academic & University', 'Creative & Design', 'Health & Wellness', 'Professional Certifications'].map(cat => (
                      <button
                        key={cat}
                        onClick={() => setPresetActiveCategory(cat)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-medium whitespace-nowrap transition-colors cursor-pointer ${
                          presetActiveCategory === cat
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-650'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  {/* Results Count */}
                  <div className="text-[10px] text-slate-400 font-medium">
                    Showing {filteredPresets.length} of {BEAUTIFUL_PRESETS.length} designs
                  </div>
                  
                  <div className="space-y-2.5 pt-1">
                    {filteredPresets.length > 0 ? (
                      filteredPresets.map((it, idx) => (
                        <button
                          key={idx}
                          onClick={() => applyPresetDesign(it)}
                          className="w-full text-left text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-indigo-500 rounded-lg p-3 transition-all duration-200 flex flex-col gap-1.5 shadow-sm cursor-pointer"
                        >
                          <div className="flex justify-between items-center w-full gap-2">
                            <span className="font-bold text-slate-800 truncate">{it.name}</span>
                            <ChevronSign />
                          </div>
                          <p className="text-[9px] text-slate-500 font-mono line-clamp-1 italic">{it.programName}</p>
                          <div className="flex justify-between items-center text-[8px] text-slate-400 font-mono uppercase">
                            <span>{it.category}</span>
                            <span>{it.borderStyle || 'solid'} â€¢ {it.sealType || 'none'}</span>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="text-center py-6 text-slate-400 text-[11px] bg-slate-50 rounded-lg border border-dashed border-slate-200">
                        No certificate templates match your search.
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* TAB: AI Certificate Generator */}
            {activeSideTab === 'ai' && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-650 animate-pulse" /> AI Certificate Generator
                  </h3>
                  <p className="text-[10px] text-slate-500">
                    Use AI to automatically design a stunning vector certificate background and layout based on your prompt.
                  </p>
                </div>
                
                <div className="space-y-3 pt-2">
                  <textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="E.g., Cyber security award with neon green and dark slate theme..."
                    rows={4}
                    className="w-full text-xs border border-slate-200 rounded p-2 focus:indigo-500 outline-none resize-none text-slate-800"
                  />

                  {/* Certificate Style Sample Upload */}
                  <div className="space-y-1.5 border-t border-slate-100 pt-2.5">
                    <label className="text-[9px] font-bold text-slate-500 uppercase block">Guide AI with Sample Certificate Image (Optional)</label>
                    <input
                      id="ai-sample-upload-input"
                      type="file"
                      accept="image/*"
                      onChange={handleSampleImageUpload}
                      className="hidden"
                    />
                    {aiSampleImage ? (
                      <div className="bg-slate-50 border border-slate-200 p-2 rounded-lg flex flex-col items-center gap-1.5 relative">
                        <img
                          src={`data:${aiSampleImage.mimeType};base64,${aiSampleImage.data}`}
                          alt="Uploaded template preview"
                          className="max-h-24 object-contain rounded border border-white shadow-sm"
                        />
                        <button
                          type="button"
                          onClick={() => setAiSampleImage(null)}
                          className="absolute top-1 right-1 bg-rose-600 hover:bg-rose-700 text-white rounded-full p-1 shadow-sm transition-transform hover:scale-105"
                          title="Remove Sample Image"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                        <span className="text-[8px] font-mono text-slate-400 font-bold uppercase font-bold">Certificate Sample Attached</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => document.getElementById('ai-sample-upload-input')?.click()}
                        className="w-full bg-white hover:bg-slate-50 text-slate-700 p-2 border border-slate-200 rounded text-center text-[10px] font-semibold flex items-center justify-center gap-1.5"
                      >
                        <Upload className="w-3.5 h-3.5" /> Upload Sample Certificate Image
                      </button>
                    )}
                  </div>

                  <button
                    onClick={generateTemplateWithAi}
                    disabled={isGeneratingAi || !aiPrompt.trim()}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs py-2.5 rounded font-bold transition-all shadow flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {isGeneratingAi ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        AI Designing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" /> Generate Design
                      </>
                    )}
                  </button>
                  {aiError && (
                    <div className="text-[10px] text-red-500 bg-red-50 border border-red-200 rounded p-2 font-mono whitespace-pre-wrap">
                      {aiError}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB: TEXT */}
            {activeSideTab === 'text' && (
              <div className="space-y-5">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <Type className="w-4 h-4 text-indigo-650" /> Vector Text Elements
                  </h3>
                  <p className="text-[10px] text-slate-500">Add customizable dynamic typography layers on the canvas stage.</p>
                </div>

                {/* Program Selector for Dynamic Fields */}
                <div className="space-y-1.5 bg-slate-50 border border-slate-200 p-3 rounded-xl text-slate-700 shadow-sm">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Certificate Program Fields Context
                  </label>
                  <p className="text-[9px] text-slate-550 mb-1.5 leading-relaxed">
                    Select a program to load its custom spreadsheet mapping variables.
                  </p>
                  <select
                    value={selectedProgramId}
                    onChange={(e) => setSelectedProgramId(e.target.value)}
                    className="w-full bg-white border border-slate-200 p-1.5 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">None (Default Fields Only)</option>
                    {programs && programs.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    onClick={() => addNewTextLayer('heading')}
                    className="bg-slate-50 hover:bg-slate-100 p-3 rounded-lg text-center font-bold text-slate-800 border border-slate-200 hover:border-indigo-500 transition-colors shadow-sm cursor-pointer"
                  >
                    + Add Heading
                  </button>
                  <button
                    onClick={() => addNewTextLayer('subheading')}
                    className="bg-slate-50 hover:bg-slate-100 p-3 rounded-lg text-center font-semibold text-slate-700 border border-slate-200 hover:border-indigo-500 transition-colors shadow-sm cursor-pointer"
                  >
                    + Add Subtitle
                  </button>
                  <button
                    onClick={() => addNewTextLayer('body')}
                    className="bg-slate-50 hover:bg-slate-100 p-3 rounded-lg text-center text-slate-700 border border-slate-200 hover:border-indigo-500 transition-colors col-span-2 shadow-sm cursor-pointer"
                  >
                    + Add Body Paragraph Block
                  </button>
                  <button
                    onClick={() => addNewRedactionPatch()}
                    className="bg-slate-50 hover:bg-indigo-50 text-indigo-600 hover:text-indigo-700 p-3 rounded-lg text-center font-bold border border-slate-200 hover:border-indigo-500 transition-colors col-span-2 shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> + Add Eraser / Cover Patch
                  </button>
                </div>

                {/* Inline text element editor - scrolled to when element is selected from canvas */}
                {selectedElId && !['logo', 'signature', 'secondarySignature', 'seal'].includes(selectedElId) ? (
                  (() => {
                    const el = currentTemplate.textElements.find(item => item.id === selectedElId);
                    if (!el) return null;
                    const isRedaction = el.type === 'redaction';
                    const selectedBold = !isRedaction && rangeRunsEvery(el, (run) => (run.fontWeight ?? el.fontWeight) === 'bold');
                    const selectedItalic = !isRedaction && rangeRunsEvery(el, (run) => (run.fontStyle ?? el.fontStyle ?? 'normal') === 'italic');
                    const selectedUnderline = !isRedaction && rangeRunsEvery(el, (run) => (run.textDecoration ?? el.textDecoration ?? 'none') === 'underline');
                    const selectedTextColor = !isRedaction ? getSelectionColor(el) : el.color;
                    return (
                      <div ref={selectedElementPanelRef} className="bg-gradient-to-br from-indigo-50 to-slate-50 border-2 border-indigo-200 p-4 rounded-xl space-y-4 shadow-md animate-fade-in text-slate-800">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold uppercase text-indigo-600 flex items-center gap-1">
                            <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse inline-block"></span>
                            {isRedaction ? 'Eraser / Patch Controls' : `Editing: ${el.text.substring(0,20)}${el.text.length > 20 ? '…' : ''}`}
                          </span>
                          <button
                            onClick={() => deleteSelectedElement()}
                            className="bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 p-1.5 rounded transition-colors cursor-pointer"
                            title={isRedaction ? 'Delete cover patch' : 'Delete this text layer'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {isRedaction ? (
                          <div className="space-y-4">
                            <p className="text-[10px] text-slate-500">
                              Use this solid colored patch to hide existing text (e.g. names) on uploaded templates. Matches the card background to erase text seamlessly.
                            </p>
                            
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1 col-span-2">
                                <label className="text-[10px] uppercase text-slate-500 font-bold">Patch Color (Match Backdrop)</label>
                                <div className="flex gap-2 items-center">
                                  <input
                                    type="color"
                                    value={el.color || '#FFFFFF'}
                                    onChange={(e) => updateTextElementProperty(el.id, 'color', e.target.value)}
                                    className="w-12 h-8 bg-white rounded border border-slate-200 cursor-pointer p-0.5 focus:outline-none"
                                  />
                                  <input
                                    type="text"
                                    value={el.color || '#FFFFFF'}
                                    onChange={(e) => updateTextElementProperty(el.id, 'color', e.target.value)}
                                    className="w-full bg-white border border-slate-200 p-1.5 rounded text-xs text-slate-900 font-mono focus:outline-none"
                                    placeholder="#FFFFFF"
                                  />
                                </div>
                              </div>

                              <div className="space-y-1 col-span-2 pt-2 border-t border-slate-200">
                                <div className="flex justify-between items-center">
                                  <label className="text-[10px] uppercase text-slate-500 font-bold">Width: {el.width || 200}px</label>
                                </div>
                                <input
                                  type="range"
                                  min="10"
                                  max="1000"
                                  value={el.width || 200}
                                  onChange={(e) => updateTextElementProperty(el.id, 'width', parseInt(e.target.value))}
                                  className="w-full cursor-pointer mt-1"
                                />
                              </div>

                              <div className="space-y-1 col-span-2 pt-2 border-t border-slate-200">
                                <div className="flex justify-between items-center">
                                  <label className="text-[10px] uppercase text-slate-500 font-bold">Height: {el.height || 40}px</label>
                                </div>
                                <input
                                  type="range"
                                  min="5"
                                  max="600"
                                  value={el.height || 40}
                                  onChange={(e) => updateTextElementProperty(el.id, 'height', parseInt(e.target.value))}
                                  className="w-full cursor-pointer mt-1"
                                />
                              </div>
                              <div className="col-span-2 pt-2 border-t border-slate-200 space-y-1.5">
                                <label className="text-[10px] uppercase text-slate-500 font-bold block">Position Alignment</label>
                                <PositionAlignmentGrid onAlign={(x, y) => alignElementTo(el.id, x, y)} />
                                <div className="hidden">
                                  <button
                                    onClick={() => {
                                      const updated = currentTemplate.textElements.map(item => item.id === el.id ? { ...item, xPercent: 10 } : item);
                                      updateTemplateProperty('textElements', updated);
                                    }}
                                    className="flex-1 text-[9px] bg-white border border-slate-200 hover:bg-slate-50 text-slate-705 py-1 px-1.5 rounded font-medium cursor-pointer"
                                    title="Align Left Edge"
                                  >
                                    Left Edge
                                  </button>
                                  <button
                                    onClick={() => alignCenterHorizontally(el.id)}
                                    className="flex-1 text-[9px] bg-white border border-slate-200 hover:bg-slate-50 text-slate-705 py-1 px-1.5 rounded font-medium cursor-pointer"
                                    title="Center Horizontally"
                                  >
                                    H-Center
                                  </button>
                                  <button
                                    onClick={() => {
                                      const updated = currentTemplate.textElements.map(item => item.id === el.id ? { ...item, xPercent: 90 } : item);
                                      updateTemplateProperty('textElements', updated);
                                    }}
                                    className="flex-1 text-[9px] bg-white border border-slate-200 hover:bg-slate-50 text-slate-705 py-1 px-1.5 rounded font-medium cursor-pointer"
                                    title="Align Right Edge"
                                  >
                                    Right Edge
                                  </button>
                                  <button
                                    onClick={() => alignCenterVertically(el.id)}
                                    className="flex-1 text-[9px] bg-white border border-slate-200 hover:bg-slate-50 text-slate-705 py-1 px-1.5 rounded font-medium cursor-pointer"
                                    title="Center Vertically"
                                  >
                                    V-Center
                                  </button>
                                </div>
                                <span className="text-[10px] text-slate-400 font-mono italic block text-center pt-1">Coordinate: Left {el.xPercent}% • Top {el.yPercent}%</span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <>
                            {/* Text Editor Box */}
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-500 uppercase">Edit Text</label>
                              <textarea
                                value={el.text}
                                onChange={(e) => {
                                  updateTextElementProperty(el.id, 'text', e.target.value);
                                  updateTextAreaSelection(el.id, e.currentTarget);
                                }}
                                onSelect={(e) => updateTextAreaSelection(el.id, e.currentTarget)}
                                onKeyDown={(e) => handleTextAreaShortcut(el, e)}
                                onKeyUp={(e) => updateTextAreaSelection(el.id, e.currentTarget)}
                                onMouseUp={(e) => updateTextAreaSelection(el.id, e.currentTarget)}
                                onFocus={(e) => updateTextAreaSelection(el.id, e.currentTarget)}
                                className="w-full bg-white border border-slate-200 rounded p-2 text-slate-900 font-mono focus:outline-none focus:border-indigo-500 text-xs h-16"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-[10px] uppercase text-slate-500 font-bold">Selected Text Style</label>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => toggleSelectedTextStyle(el, 'bold')}
                                  className={`p-1.5 rounded border transition-colors cursor-pointer ${selectedBold ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100'}`}
                                  title="Bold selected text"
                                >
                                  <Bold className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => toggleSelectedTextStyle(el, 'italic')}
                                  className={`p-1.5 rounded border transition-colors cursor-pointer ${selectedItalic ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100'}`}
                                  title="Italic selected text"
                                >
                                  <Italic className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => toggleSelectedTextStyle(el, 'underline')}
                                  className={`p-1.5 rounded border transition-colors cursor-pointer ${selectedUnderline ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100'}`}
                                  title="Underline selected text"
                                >
                                  <Underline className="w-3.5 h-3.5" />
                                </button>
                                <input
                                  type="color"
                                  value={selectedTextColor}
                                  onChange={(e) => updateSelectedTextStyle(el.id, { color: e.target.value })}
                                  className="h-8 flex-1 min-w-0 bg-white rounded border border-slate-200 cursor-pointer p-0.5 focus:outline-none"
                                  title="Color selected text"
                                />
                              </div>
                            </div>

                            {/* Dynamic Tag Injector helpers */}
                            <div className="space-y-1.5">
                              <span className="text-[10px] font-bold text-slate-500 uppercase">Insert Spreadsheet Placeholder Fields</span>
                              <div className="flex flex-wrap gap-1.5">
                                {getPlaceholderTags().map(tag => (
                                  <button
                                    key={tag}
                                    onClick={() => insertPlaceholderTag(tag)}
                                    className="bg-white hover:bg-slate-100 text-slate-700 text-[9px] font-mono px-2 py-0.5 rounded transition-colors border border-slate-200 shadow-sm cursor-pointer animate-fade-in"
                                  >
                                    {"{{" + tag + "}}"}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Styling parameters */}
                            <div className="grid grid-cols-2 gap-3 pt-2">
                              <div className="space-y-1 col-span-2">
                                <label className="text-[10px] uppercase text-slate-500 font-bold">Typography</label>
                                <select
                                  value={el.fontFamily}
                                  onChange={(e) => updateTextElementProperty(el.id, 'fontFamily', e.target.value)}
                                  className="w-full bg-white border border-slate-200 p-1.5 rounded text-slate-900 focus:outline-none"
                                >
                                  {fontOptions.map(font => (
                                    <option key={font.value} value={font.value}>{font.label}</option>
                                  ))}
                                </select>
                                <button
                                  type="button"
                                  onClick={() => customFontUploadRef.current?.click()}
                                  className="mt-1.5 flex w-full items-center justify-center gap-1.5 rounded border border-dashed border-slate-300 bg-white px-2 py-1.5 text-[10px] font-bold uppercase text-slate-500 transition-colors hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-600"
                                >
                                  <Upload className="h-3.5 w-3.5" /> Import .ttf Font
                                </button>
                              </div>

                              <div className="space-y-1">
                                <label className="text-[10px] uppercase text-slate-500 font-bold">Size (pt)</label>
                                <input
                                  type="number"
                                  min="6"
                                  max="80"
                                  value={el.fontSize}
                                  onChange={(e) => updateTextElementProperty(el.id, 'fontSize', parseInt(e.target.value) || 12)}
                                  className="w-full bg-white border border-slate-200 p-1.5 rounded text-slate-900 focus:outline-none"
                                />
                              </div>

                              <div className="space-y-1">
                                <label className="text-[10px] uppercase text-slate-500 font-bold">Color</label>
                                <input
                                  type="color"
                                  value={el.color}
                                  onChange={(e) => updateTextElementProperty(el.id, 'color', e.target.value)}
                                  className="w-full h-8 bg-white rounded border border-slate-200 cursor-pointer p-0.5 focus:outline-none"
                                />
                              </div>

                              <div className="space-y-1">
                                <div className="flex justify-between items-center">
                                  <label className="text-[10px] uppercase text-slate-500 font-bold">Line Spacing</label>
                                  <span className="text-[10px] font-mono text-indigo-650">{Number(el.lineHeight ?? 1.2).toFixed(2)}</span>
                                </div>
                                <input
                                  type="range"
                                  min="0.8"
                                  max="3"
                                  step="0.05"
                                  value={el.lineHeight ?? 1.2}
                                  onChange={(e) => updateTextElementProperty(el.id, 'lineHeight', parseFloat(e.target.value))}
                                  className="w-full cursor-pointer mt-1 accent-indigo-600"
                                />
                              </div>

                              <div className="space-y-1">
                                <div className="flex justify-between items-center">
                                  <label className="text-[10px] uppercase text-slate-500 font-bold">Letter Spacing</label>
                                  <span className="text-[10px] font-mono text-indigo-650">{el.letterSpacing ?? 0}px</span>
                                </div>
                                <input
                                  type="range"
                                  min="-2"
                                  max="12"
                                  step="0.25"
                                  value={el.letterSpacing ?? 0}
                                  onChange={(e) => updateTextElementProperty(el.id, 'letterSpacing', parseFloat(e.target.value))}
                                  className="w-full cursor-pointer mt-1 accent-indigo-600"
                                />
                              </div>

                              <div className="space-y-1 col-span-2">
                                <label className="text-[10px] uppercase text-slate-500 font-bold">Weight &amp; Align</label>
                                <div className="flex gap-1.5">
                                  <button
                                    onClick={() => updateTextElementProperty(el.id, 'fontWeight', el.fontWeight === 'bold' ? 'normal' : 'bold')}
                                    className={`flex-1 p-1.5 rounded border transition-colors cursor-pointer ${el.fontWeight === 'bold' ? 'bg-indigo-600 text-white font-bold' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100'}`}
                                  >
                                    <strong>B</strong>
                                  </button>
                                  <button
                                    onClick={() => updateTextElementProperty(el.id, 'fontWeight', el.fontWeight === 'medium' ? 'normal' : 'medium')}
                                    className={`flex-1 p-1.5 rounded border transition-colors cursor-pointer ${el.fontWeight === 'medium' ? 'bg-indigo-600 text-white font-bold' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100'}`}
                                  >
                                    <strong>M</strong>
                                  </button>
                                  <button
                                    onClick={() => updateTextElementProperty(el.id, 'align', 'left')}
                                    className={`p-1.5 rounded border transition-colors cursor-pointer ${el.align === 'left' ? 'bg-indigo-600 text-white' : 'bg-white border-slate-200 text-slate-500'}`}
                                  >
                                    <AlignLeft className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => updateTextElementProperty(el.id, 'align', 'center')}
                                    className={`p-1.5 rounded border transition-colors cursor-pointer ${el.align === 'center' ? 'bg-indigo-600 text-white' : 'bg-white border-slate-200 text-slate-500'}`}
                                  >
                                    <AlignCenter className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => updateTextElementProperty(el.id, 'align', 'right')}
                                    className={`p-1.5 rounded border transition-colors cursor-pointer ${el.align === 'right' ? 'bg-indigo-600 text-white' : 'bg-white border-slate-200 text-slate-500'}`}
                                  >
                                    <AlignRight className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              <div className="space-y-1 col-span-2 pt-2 border-t border-slate-200">
                                <div className="flex justify-between items-center">
                                  <label className="text-[10px] uppercase text-slate-500 font-bold">Box Width: {el.width || 512}px</label>
                                  <button
                                    onClick={() => updateTextElementProperty(el.id, 'width', undefined)}
                                    className="text-[9px] text-indigo-600 font-bold hover:underline cursor-pointer"
                                  >
                                    Auto/Reset
                                  </button>
                                </div>
                                <input
                                  type="range"
                                  min="100"
                                  max="1000"
                                  value={el.width || 512}
                                  onChange={(e) => updateTextElementProperty(el.id, 'width', parseInt(e.target.value))}
                                  className="w-full cursor-pointer mt-1"
                                />
                              </div>

                              <div className="col-span-2 pt-2 border-t border-slate-200 space-y-1.5">
                                <label className="text-[10px] uppercase text-slate-500 font-bold block">Position Alignment</label>
                                <PositionAlignmentGrid onAlign={(x, y) => alignElementTo(el.id, x, y)} />
                                <div className="hidden">
                                  <button
                                    onClick={() => {
                                      const updated = currentTemplate.textElements.map(item => item.id === el.id ? { ...item, xPercent: 10 } : item);
                                      updateTemplateProperty('textElements', updated);
                                    }}
                                    className="flex-1 text-[9px] bg-white border border-slate-200 hover:bg-slate-50 text-slate-705 py-1 px-1.5 rounded font-medium cursor-pointer"
                                    title="Align Left Edge"
                                  >
                                    Left Edge
                                  </button>
                                  <button
                                    onClick={() => alignCenterHorizontally(el.id)}
                                    className="flex-1 text-[9px] bg-white border border-slate-200 hover:bg-slate-50 text-slate-705 py-1 px-1.5 rounded font-medium cursor-pointer"
                                    title="Center Horizontally"
                                  >
                                    H-Center
                                  </button>
                                  <button
                                    onClick={() => {
                                      const updated = currentTemplate.textElements.map(item => item.id === el.id ? { ...item, xPercent: 90 } : item);
                                      updateTemplateProperty('textElements', updated);
                                    }}
                                    className="flex-1 text-[9px] bg-white border border-slate-200 hover:bg-slate-50 text-slate-705 py-1 px-1.5 rounded font-medium cursor-pointer"
                                    title="Align Right Edge"
                                  >
                                    Right Edge
                                  </button>
                                  <button
                                    onClick={() => alignCenterVertically(el.id)}
                                    className="flex-1 text-[9px] bg-white border border-slate-200 hover:bg-slate-50 text-slate-705 py-1 px-1.5 rounded font-medium cursor-pointer"
                                    title="Center Vertically"
                                  >
                                    V-Center
                                  </button>
                                </div>
                                <span className="text-[10px] text-slate-400 font-mono italic block text-center pt-1">Coordinate: Left {el.xPercent}% • Top {el.yPercent}%</span>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })()
                ) : (
                  <div className="bg-slate-50 p-4 rounded-xl text-slate-500 text-center border border-slate-200 shadow-sm">
                    <p className="text-xs">Click on any text block on the live canvas to unlock full style properties!</p>
                  </div>
                )}
              </div>
            )}

            {/* TAB: UPLOADS */}
            {activeSideTab === 'uploads' && (
              <div className="space-y-5">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <Upload className="w-4 h-4 text-indigo-650" /> Uploaded Elements
                  </h3>
                  <p className="text-[10px] text-slate-500">Upload custom graphics, badges, or seals (PNG/JPG) to add them to your certificate template.</p>
                </div>

                <div className="pt-2">
                  <label
                    htmlFor="custom-element-upload-input"
                    className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl p-6 hover:bg-slate-50 hover:border-indigo-500 transition-all cursor-pointer shadow-sm group"
                  >
                    <Upload className="w-6 h-6 text-slate-400 group-hover:text-indigo-600 mb-2 transition-colors" />
                    <span className="text-[10px] font-bold text-slate-600 group-hover:text-indigo-600 transition-colors">
                      Upload Custom Graphic Element
                    </span>
                    <span className="text-[8px] text-slate-400 mt-1">PNG, JPG, or SVG max 2MB</span>
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleCustomImageElementUpload}
                    className="hidden"
                    id="custom-element-upload-input"
                  />
                </div>

                <div className="border-t border-slate-100 pt-4 space-y-3">
                  <div className="space-y-1">
                    <h4 className="text-[10px] font-bold uppercase text-slate-700 tracking-wider">
                      Upload Entire Certificate Design
                    </h4>
                    <p className="text-[10px] text-slate-500 leading-normal">
                      Use a complete pre-designed certificate image (JPEG/PNG) as your template background. Existing overlay placeholders will remain editable.
                    </p>
                  </div>
                  
                  <label
                    htmlFor="editor-backdrop-upload-input"
                    className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl p-5 hover:bg-slate-50 hover:border-indigo-500 transition-all cursor-pointer shadow-sm group"
                  >
                    <Image className="w-5 h-5 text-slate-400 group-hover:text-indigo-650 mb-1.5 transition-colors" />
                    <span className="text-[10px] font-bold text-slate-600 group-hover:text-indigo-650 transition-colors">
                      Select Backdrop Image
                    </span>
                    <span className="text-[8px] text-slate-400 mt-0.5">PNG or JPG max 3.5MB</span>
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, 'backgroundImage')}
                    className="hidden"
                    id="editor-backdrop-upload-input"
                  />
                  {currentTemplate.backgroundImageUrl && (
                    <div className="flex items-center justify-between bg-slate-50 border rounded-lg p-2 mt-1">
                      <span className="text-[9px] font-mono truncate max-w-[150px] text-slate-600">Backdrop is Active</span>
                      <button
                        type="button"
                        onClick={() => updateTemplateProperty('backgroundImageUrl', '')}
                        className="text-[9px] text-rose-600 hover:text-rose-800 font-bold underline"
                      >
                        Remove Backdrop
                      </button>
                    </div>
                  )}
                </div>

                {uploadedAssets.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Your Assets Library</h4>
                    <div className="grid grid-cols-3 gap-2">
                      {uploadedAssets.map((asset, idx) => (
                        <button
                          key={idx}
                          onClick={() => addUploadedImageToCanvas(asset)}
                          className="aspect-square bg-slate-50 border border-slate-200 hover:border-indigo-500 rounded-lg p-1.5 transition-all overflow-hidden flex items-center justify-center hover:scale-105 shadow-sm cursor-pointer"
                        >
                          <img src={asset} className="max-h-full max-w-full object-contain pointer-events-none" alt={`Asset ${idx}`} />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB: BACKDROP/THEME */}
            {activeSideTab === 'backdrop' && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <Image className="w-4 h-4 text-indigo-650" /> Canvas Backdrops
                  </h3>
                  <p className="text-[10px] text-slate-500">Adjust colors and render linear/radial master gradients under authority frames.</p>
                </div>

                {/* CUSTOM CERTIFICATE TEMPLATE BACKGROUND UPLOAD */}
                <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg space-y-3">
                  <span className="text-[9px] font-bold uppercase text-indigo-600">Custom Template Background Image</span>
                  <input 
                    id="bg-upload-input"
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, 'backgroundImage')}
                    className="hidden"
                  />
                  {currentTemplate.backgroundImageUrl ? (
                    <div className="space-y-2 border border-slate-200 bg-white p-2 rounded flex flex-col items-center">
                      <span className="text-[8px] font-bold text-slate-400 uppercase">Uploaded Template Preview</span>
                      <img 
                        src={currentTemplate.backgroundImageUrl} 
                        alt="Custom template background preview"
                        className="max-h-16 object-contain"
                      />
                      <button
                        type="button"
                        onClick={() => updateTemplateProperty('backgroundImageUrl', '')}
                        className="text-[9px] text-rose-600 hover:text-rose-800 font-bold underline"
                      >
                        Remove template image
                      </button>
                    </div>
                  ) : (
                    <div 
                      onClick={() => document.getElementById('bg-upload-input')?.click()}
                      className="border border-dashed border-slate-300 rounded p-4 text-center cursor-pointer hover:bg-slate-100/50 text-[10px] text-slate-500 bg-white font-semibold"
                    >
                      Click to upload custom template background image
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  {GRADIENT_OPTIONS.map((grad, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        if (grad.isGradient) {
                          updateTemplateProperties({
                            backgroundImageUrl: '',
                            backgroundGradient: grad.value,
                            backgroundColor: '#FFFFFF'
                          });
                        } else {
                          updateTemplateProperties({
                            backgroundImageUrl: '',
                            backgroundGradient: '',
                            backgroundColor: grad.value
                          });
                        }
                      }}
                      style={{
                        background: grad.isGradient ? grad.value : grad.value,
                        borderColor: (grad.isGradient && currentTemplate.backgroundGradient === grad.value) || (!grad.isGradient && !currentTemplate.backgroundGradient && currentTemplate.backgroundColor === grad.value) ? '#6366F1' : '#E2E8F0'
                      }}
                      className="h-16 rounded-lg text-left text-[9px] font-bold p-2 text-slate-800 flex flex-col justify-end border-2 hover:opacity-90 shadow transition-all"
                    >
                      <span className="bg-white/90 text-slate-800 px-1 py-0.5 rounded-sm truncate select-none scale-90 w-full block border shadow-sm">{grad.name}</span>
                    </button>
                  ))}
                </div>

                <div className="space-y-2 pt-4 border-t border-slate-200">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Background Color Hex</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={currentTemplate.backgroundColor}
                        onChange={(e) => {
                          updateTemplateProperties({
                            backgroundColor: e.target.value,
                            backgroundGradient: '',
                            backgroundImageUrl: ''
                          });
                        }}
                        className="w-10 h-8 rounded border border-slate-200 cursor-pointer focus:outline-none bg-white p-0.5"
                      />
                      <input
                        type="text"
                        value={currentTemplate.backgroundColor}
                        onChange={(e) => {
                          updateTemplateProperties({
                            backgroundColor: e.target.value,
                            backgroundGradient: '',
                            backgroundImageUrl: ''
                          });
                        }}
                        className="flex-1 bg-white border border-slate-200 rounded p-1.5 text-slate-900 font-mono uppercase focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: BORDERS */}
            {activeSideTab === 'borders' && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <Sliders className="w-4 h-4 text-indigo-650" /> Borders & Frames
                  </h3>
                  <p className="text-[10px] text-slate-500">Configure certificate perimeter layouts and aesthetics.</p>
                </div>

                <div className="space-y-4 pt-2">
                  <label className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5 cursor-pointer">
                    <span className="text-[11px] font-semibold text-slate-700">
                      Corner watermark tags
                      <span className="block text-[9px] font-normal text-slate-400">The "AUTHORIZED DISPATCH" editor guides</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={currentTemplate.showWatermarkTags !== false}
                      onChange={(e) => updateTemplateProperty('showWatermarkTags', e.target.checked)}
                      className="h-4 w-4 cursor-pointer accent-indigo-600"
                    />
                  </label>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Border style</label>
                    <select
                      value={currentTemplate.borderStyle || 'solid'}
                      onChange={(e) => updateTemplateProperty('borderStyle', e.target.value)}
                      className="w-full bg-white border border-slate-200 p-2 rounded text-slate-900 focus:outline-none"
                    >
                      <option value="solid">Single Solid Line</option>
                      <option value="double">Double Ornate Scroll Rim</option>
                      <option value="dashed">Modern Tech Dashed Outline</option>
                      <option value="ornate">Vintage Border Flourish</option>
                      <option value="none">No Border Frame</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Border Color</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={currentTemplate.borderColor}
                        onChange={(e) => updateTemplateProperty('borderColor', e.target.value)}
                        className="w-10 h-8 rounded border border-slate-200 cursor-pointer focus:outline-none bg-white p-0.5"
                      />
                      <input
                        type="text"
                        value={currentTemplate.borderColor}
                        onChange={(e) => updateTemplateProperty('borderColor', e.target.value)}
                        className="flex-1 bg-white border border-slate-200 rounded p-1.5 text-slate-900 font-mono uppercase focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase block">Border Width (px)</label>
                      <input
                        type="number"
                        min="0"
                        max="30"
                        value={currentTemplate.borderWidth}
                        onChange={(e) => updateTemplateProperty('borderWidth', parseInt(e.target.value) || 0)}
                        className="w-full bg-white border border-slate-200 p-1.5 rounded text-slate-900 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase block">Border Radius (px)</label>
                      <input
                        type="number"
                        min="0"
                        max="60"
                        value={currentTemplate.borderRadius || 0}
                        onChange={(e) => updateTemplateProperty('borderRadius', parseInt(e.target.value) || 0)}
                        className="w-full bg-white border border-slate-200 p-1.5 rounded text-slate-900 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Corner Ornaments</label>
                    <select
                      value={currentTemplate.decorFlourish || 'none'}
                      onChange={(e) => updateTemplateProperty('decorFlourish', e.target.value)}
                      className="w-full bg-white border border-slate-200 p-2 rounded text-slate-900 focus:outline-none"
                    >
                      <option value="none">No Corner Accents</option>
                      <option value="minimal">Minimal Corner Corner Blocks</option>
                      <option value="classic">Symmetrical Classic brackets</option>
                      <option value="ornate">Imperial Golden Scrolls</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: SEALS & CERT STAMPS */}
            {activeSideTab === 'seals' && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <QrCode className="w-4 h-4 text-indigo-650" /> Stamps & Seals
                  </h3>
                  <p className="text-[10px] text-slate-500">Configure trust verification elements, custom stamps, or dynamic QR codes.</p>
                </div>

                <div id="seal-settings" className="space-y-4 pt-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Verification Display Mode</label>
                    <select
                      value={
                        currentTemplate.showQrCode && currentTemplate.showSeal
                          ? 'both'
                          : currentTemplate.showQrCode
                          ? 'qrcode'
                          : currentTemplate.showSeal
                          ? 'seal'
                          : 'none'
                      }
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === 'both') {
                          updateTemplateProperties({ showQrCode: true, showSeal: true });
                        } else if (val === 'qrcode') {
                          updateTemplateProperties({ showQrCode: true, showSeal: false });
                        } else if (val === 'seal') {
                          updateTemplateProperties({ showQrCode: false, showSeal: true });
                        } else {
                          updateTemplateProperties({ showQrCode: false, showSeal: false });
                        }
                      }}
                      className="w-full bg-white border border-slate-200 p-2 rounded text-slate-900 focus:outline-none"
                    >
                      <option value="both">Both QR Code & Seal Badge</option>
                      <option value="qrcode">QR Code Only</option>
                      <option value="seal">Seal Badge Only</option>
                      <option value="none">Disabled (Hide both)</option>
                    </select>
                  </div>

                  {currentTemplate.showSeal && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase block">Seal Style Emblem</label>
                      <select
                        value={currentTemplate.sealType}
                        onChange={(e) => updateTemplateProperty('sealType', e.target.value)}
                        className="w-full bg-white border border-slate-200 p-2 rounded text-slate-900 focus:outline-none"
                      >
                        <option value="classic">Classic Seal</option>
                        <option value="stellar">Stellar Emblem</option>
                        <option value="modern">Modern Stamp</option>
                        <option value="crimson_wax">Imperial Crimson Wax</option>
                        <option value="emerald_shield">Emerald Shield</option>
                        <option value="gold_medallion">Gold Medallion</option>
                      </select>
                    </div>
                  )}

                  {currentTemplate.showQrCode && (
                    <>
                      <div className="space-y-1 pt-1">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">QR Code Size</label>
                          <span className="text-[10px] font-mono font-bold text-indigo-650">{currentTemplate.qrCodeWidth || 32}px</span>
                        </div>
                        <input
                          type="range"
                          min="16"
                          max="80"
                          value={currentTemplate.qrCodeWidth || 32}
                          onChange={(e) => updateTemplateProperty('qrCodeWidth', parseInt(e.target.value))}
                          className="w-full accent-indigo-600"
                        />
                      </div>

                      <div className="space-y-1 pt-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase block">Custom QR Link / Data</label>
                        <input
                          type="text"
                          value={currentTemplate.qrCodeCustomUrl || ''}
                          onChange={(e) => updateTemplateProperty('qrCodeCustomUrl', e.target.value)}
                          placeholder="e.g. https://yourdomain.com/verify/{{id}}"
                          className="w-full bg-white border border-slate-200 p-2 rounded text-slate-900 focus:outline-none text-xs"
                        />
                        <p className="text-[9px] text-slate-400 leading-normal">
                          Supports placeholders: <code>{"{{id}}"}</code>, <code>{"{{name}}"}</code>, <code>{"{{program}}"}</code>, <code>{"{{date}}"}</code>. Default: Glint verify page.
                        </p>
                      </div>
                    </>
                  )}

                  {currentTemplate.showSeal && (
                    <div className="space-y-1 pt-1">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Seal Badge Size</label>
                        <span className="text-[10px] font-mono font-bold text-indigo-650">{currentTemplate.sealWidth || 40}px</span>
                      </div>
                      <input
                        type="range"
                        min="20"
                        max="100"
                        value={currentTemplate.sealWidth || 40}
                        onChange={(e) => updateTemplateProperty('sealWidth', parseInt(e.target.value))}
                        className="w-full accent-indigo-600"
                      />
                    </div>
                  )}

                  <div className="space-y-1 border-t border-slate-200 pt-3">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Audit Ledger QR Code</span>
                    <label className="text-[10px] font-mono text-slate-500 flex items-center gap-1 leading-normal">
                      <Info className="w-3.5 h-3.5 text-indigo-650 shrink-0" />
                      Click on the QR Code / Seal elements in the visual canvas to drag position.
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: SIGNATURES */}
            {activeSideTab === 'sign' && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-indigo-650" /> Branding & Signatories
                  </h3>
                  <p className="text-[10px] text-slate-500">Configure organization custom logo branding and official signatory signatures.</p>
                </div>

                <div className="space-y-4 pt-2">
                  
                  {/* ORGANIZATIONAL LOGO BRANDING */}
                  <div id="logo-settings" className="bg-slate-50 border border-slate-200 p-3 rounded-lg space-y-3">
                    <span className="text-[9px] font-bold uppercase text-indigo-600">Organization Branding Logo</span>
                    
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase">Logo Asset Type</label>
                      <select
                        value={currentTemplate.logoUrl ? 'custom' : (currentTemplate.logoIconType || 'corp')}
                        onChange={(e) => {
                          if (e.target.value === 'custom') {
                            document.getElementById('logo-upload-input')?.click();
                          } else {
                            // Use preset vector shape
                            setCurrentTemplate(prev => ({
                              ...prev,
                              logoUrl: '',
                              logoIconType: e.target.value
                            }));
                          }
                        }}
                        className="w-full bg-white border border-slate-200 p-1.5 rounded text-slate-900 focus:outline-none"
                      >
                        <option value="custom">â˜… Custom Uploaded Logo Image</option>
                        <option value="corp">Standard Corporate Star Shield</option>
                        <option value="edu">Classical Academic Mortar Laurel</option>
                        <option value="tech">Modern Glowing Spark Tech</option>
                        <option value="science">Quantum Orbital Rings</option>
                        <option value="art">Fine Arts Floral Lotus</option>
                        <option value="none">No Logo Asset</option>
                      </select>
                    </div>

                    {/* Hidden file input */}
                    <input 
                      id="logo-upload-input"
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, 'logo')}
                      className="hidden"
                    />

                    {currentTemplate.logoUrl ? (
                      <div className="space-y-2 border border-slate-200 bg-white p-2 rounded flex flex-col items-center">
                        <span className="text-[8px] font-bold text-slate-400 uppercase">Uploaded Logo Preview</span>
                        <img 
                          src={currentTemplate.logoUrl} 
                          alt="Uploaded logo preview"
                          className="max-h-16 object-contain"
                        />
                        <button
                          type="button"
                          onClick={() => updateTemplateProperty('logoUrl', '')}
                          className="text-[9px] text-rose-600 hover:text-rose-800 font-bold underline"
                        >
                          Remove custom logo
                        </button>
                      </div>
                    ) : (
                      <div 
                        onClick={() => document.getElementById('logo-upload-input')?.click()}
                        className="border border-dashed border-slate-300 rounded p-4 text-center cursor-pointer hover:bg-slate-100/50 text-[10px] text-slate-500 bg-white"
                      >
                        Click to upload custom logo image
                      </div>
                    )}

                    {(currentTemplate.logoUrl || currentTemplate.logoIconType !== 'none') && (
                      <div className="pt-1">
                        <label className="text-[9px] text-slate-500 font-bold">Logo Width: {currentTemplate.logoWidth}px</label>
                        <input
                          type="range"
                          min="40"
                          max="160"
                          value={currentTemplate.logoWidth}
                          onChange={(e) => updateTemplateProperty('logoWidth', parseInt(e.target.value))}
                          className="w-full cursor-pointer mt-1"
                        />
                      </div>
                    )}
                  </div>

                  {/* SIGNATORY 1 BLOCK */}
                  <div id="signature-settings" className="bg-slate-50 border border-slate-200 p-3 rounded-lg space-y-3">
                    <span className="text-[9px] font-bold uppercase text-indigo-600">Primary Authority Signatory</span>
                    
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase">First Signatory Name</label>
                      <input
                        type="text"
                        value={currentTemplate.signatoryName || ''}
                        onChange={(e) => updateTemplateProperty('signatoryName', capitalizeWords(e.target.value))}
                        className="w-full bg-white border border-slate-200 rounded p-1.5 text-slate-900"
                        placeholder="John Doe"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase">First Signatory Title</label>
                      <input
                        type="text"
                        value={currentTemplate.signatoryTitle || ''}
                        onChange={(e) => updateTemplateProperty('signatoryTitle', capitalizeWords(e.target.value))}
                        className="w-full bg-white border border-slate-200 rounded p-1.5 text-slate-900"
                        placeholder="Chancellor"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/50 mt-2">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-500 uppercase">Typography</label>
                        <select
                          value={currentTemplate.signatoryFontFamily || 'Playfair Display'}
                          onChange={(e) => updateTemplateProperty('signatoryFontFamily', e.target.value)}
                          className="w-full bg-white border border-slate-200 p-1.5 rounded text-[9px] text-slate-900 focus:outline-none"
                        >
                          {fontOptions.map(font => (
                            <option key={font.value} value={font.value}>{font.label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-500 uppercase">Size (pt)</label>
                        <input
                          type="number"
                          min="6" max="80"
                          value={currentTemplate.signatoryFontSize || 18}
                          onChange={(e) => updateTemplateProperty('signatoryFontSize', parseInt(e.target.value) || 18)}
                          className="w-full bg-white border border-slate-200 p-1.5 rounded text-[9px] text-slate-900 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Signature Image Upload */}
                    <div className="space-y-2 pt-2 border-t border-slate-200/60">
                      <label className="text-[9px] font-bold text-slate-500 uppercase block">Signatory 1 Signature Image</label>
                      <input 
                        id="sig1-upload-input"
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, 'signature')}
                        className="hidden"
                      />
                      {currentTemplate.signatureUrl ? (
                        <div className="space-y-1 bg-white p-2 border border-slate-200 rounded flex flex-col items-center">
                          <img 
                            src={currentTemplate.signatureUrl} 
                            alt="Signature 1 preview"
                            className="max-h-12 object-contain"
                          />
                          <button
                            type="button"
                            onClick={() => updateTemplateProperty('signatureUrl', '')}
                            className="text-[8px] text-rose-600 hover:underline font-bold"
                          >
                            Remove uploaded signature
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => document.getElementById('sig1-upload-input')?.click()}
                          className="w-full bg-white hover:bg-slate-100 text-slate-700 p-2 border border-slate-200 rounded text-center text-[10px] font-semibold"
                        >
                          Upload Custom Signature Image
                        </button>
                      )}

                      {(currentTemplate.signatureUrl || currentTemplate.signatoryName) && (
                        <div className="pt-2">
                          <label className="text-[9px] text-slate-500 font-bold">Signature Width: {currentTemplate.signatureWidth}px</label>
                          <input
                            type="range"
                            min="40"
                            max="200"
                            value={currentTemplate.signatureWidth}
                            onChange={(e) => updateTemplateProperty('signatureWidth', parseInt(e.target.value))}
                            className="w-full cursor-pointer mt-1"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* DOUBLE SIGNATORY OPTION */}
                  <div id="secondarySignature-settings" className="bg-slate-50 border border-slate-200 p-3 rounded-lg space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-bold uppercase text-indigo-600">Secondary Signatory (Double)</span>
                      <button
                        onClick={() => updateTemplateProperty('showSecondarySignatory', !currentTemplate.showSecondarySignatory)}
                        className={`text-[8px] font-bold px-2 py-0.5 rounded border ${currentTemplate.showSecondarySignatory ? 'bg-indigo-650 border-indigo-650 text-white font-bold' : 'bg-white border-slate-200 text-slate-500 hover:text-slate-900'}`}
                      >
                        {currentTemplate.showSecondarySignatory ? 'ENABLED' : 'DISABLED'}
                      </button>
                    </div>

                    {currentTemplate.showSecondarySignatory && (
                      <div className="space-y-3 animate-fade-in">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-500 uppercase">Second Signatory Name</label>
                          <input
                            type="text"
                            value={currentTemplate.secondarySignatoryName || ''}
                            onChange={(e) => updateTemplateProperty('secondarySignatoryName', capitalizeWords(e.target.value))}
                            className="w-full bg-white border border-slate-200 rounded p-1.5 text-slate-900"
                            placeholder="Dr. Clara Masters"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-500 uppercase">Second Signatory Title</label>
                          <input
                            type="text"
                            value={currentTemplate.secondarySignatoryTitle || ''}
                            onChange={(e) => updateTemplateProperty('secondarySignatoryTitle', capitalizeWords(e.target.value))}
                            className="w-full bg-white border border-slate-200 rounded p-1.5 text-slate-900"
                            placeholder="Admissions Registrar"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/50 mt-2">
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-500 uppercase">Typography</label>
                            <select
                              value={currentTemplate.secondarySignatoryFontFamily || 'Playfair Display'}
                              onChange={(e) => updateTemplateProperty('secondarySignatoryFontFamily', e.target.value)}
                              className="w-full bg-white border border-slate-200 p-1.5 rounded text-[9px] text-slate-900 focus:outline-none"
                            >
                              {fontOptions.map(font => (
                                <option key={font.value} value={font.value}>{font.label}</option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-500 uppercase">Size (pt)</label>
                            <input
                              type="number"
                              min="6" max="80"
                              value={currentTemplate.secondarySignatoryFontSize || 18}
                              onChange={(e) => updateTemplateProperty('secondarySignatoryFontSize', parseInt(e.target.value) || 18)}
                              className="w-full bg-white border border-slate-200 p-1.5 rounded text-[9px] text-slate-900 focus:outline-none"
                            />
                          </div>
                        </div>

                        {/* Secondary Signature Image Upload */}
                        <div className="space-y-2 pt-2 border-t border-slate-200/60">
                          <label className="text-[9px] font-bold text-slate-500 uppercase block">Signatory 2 Signature Image</label>
                          <input 
                            id="sig2-upload-input"
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleImageUpload(e, 'secondarySignature')}
                            className="hidden"
                          />
                          {currentTemplate.secondarySignatureUrl ? (
                            <div className="space-y-1 bg-white p-2 border border-slate-200 rounded flex flex-col items-center">
                              <img 
                                src={currentTemplate.secondarySignatureUrl} 
                                alt="Signature 2 preview"
                                className="max-h-12 object-contain"
                              />
                              <button
                                type="button"
                                onClick={() => updateTemplateProperty('secondarySignatureUrl', '')}
                                className="text-[8px] text-rose-600 hover:underline font-bold"
                              >
                                Remove uploaded signature
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => document.getElementById('sig2-upload-input')?.click()}
                              className="w-full bg-white hover:bg-slate-100 text-slate-700 p-2 border border-slate-200 rounded text-center text-[10px] font-semibold"
                            >
                              Upload Custom Signature Image
                            </button>
                          )}

                          {(currentTemplate.secondarySignatureUrl || currentTemplate.secondarySignatoryName) && (
                            <div className="pt-2">
                              <label className="text-[9px] text-slate-500 font-bold">Signature Width: {currentTemplate.secondarySignatureWidth || 100}px</label>
                              <input
                                type="range"
                                min="40"
                                max="200"
                                value={currentTemplate.secondarySignatureWidth || 100}
                                onChange={(e) => updateTemplateProperty('secondarySignatureWidth', parseInt(e.target.value))}
                                className="w-full cursor-pointer mt-1"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Predefined Logo icon override */}
                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg space-y-2">
                    <span className="text-[9px] font-bold uppercase text-indigo-650">Predefined Template Logo Shapes</span>
                    <select
                      value={currentTemplate.logoIconType || 'corp'}
                      onChange={(e) => updateTemplateProperty('logoIconType', e.target.value)}
                      className="w-full bg-white border border-slate-200 p-1.5 rounded text-slate-800 focus:outline-none"
                    >
                      <option value="none">None (Hide)</option>
                      <option value="corp">Corporate Shield</option>
                      <option value="star">Academic Star</option>
                      <option value="leaf">Laurel Leaf</option>
                      <option value="medal">Excellence Medal</option>
                      <option value="stamp">Official Stamp</option>
                    </select>

                    {currentTemplate.logoIconType !== 'none' && (
                      <div className="pt-2">
                        <label className="text-[9px] text-slate-500 font-bold">Logo Width: {currentTemplate.logoWidth}px</label>
                        <input
                          type="range"
                          min="40"
                          max="160"
                          value={currentTemplate.logoWidth}
                          onChange={(e) => updateTemplateProperty('logoWidth', parseInt(e.target.value))}
                          className="w-full cursor-pointer mt-1"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: LAYERS MANAGEMENT */}
            {activeSideTab === 'layers' && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-indigo-650" /> Layers & Structure Map
                  </h3>
                  <p className="text-[10px] text-slate-500">Align elements, remove redundant blocks, or reset canvas items.</p>
                </div>

                <div className="space-y-2 pt-2">
                  
                  {/* Logo Layer Indicator */}
                  {(currentTemplate.logoUrl || (currentTemplate.logoIconType && currentTemplate.logoIconType !== 'none')) && (
                    <div
                      onClick={() => setSelectedElId('logo')}
                      className={`flex justify-between items-center p-2 rounded-lg cursor-pointer border transition-colors ${selectedElId === 'logo' ? 'bg-indigo-50 border-indigo-500 text-indigo-950' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'}`}
                    >
                      <span className="font-bold flex items-center gap-1.5 text-[11px]"><Sparkles className="w-3.5 h-3.5 text-sky-600" /> Organization Logo</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[8px] font-mono text-slate-400 font-bold font-bold font-bold font-bold font-bold font-bold font-bold">L: {currentTemplate.logoX}% T: {currentTemplate.logoY}%</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteSelectedElement('logo'); }}
                          className="text-slate-400 hover:text-rose-600 transition-colors"
                          title="Delete logo"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Text layers — drag to restack, or use the arrows. Rendered
                      top-of-list = front, so the visual matches the paint order. */}
                  {currentTemplate.textElements.length > 1 && (
                    <p className="text-[9px] text-slate-400 pl-0.5 flex items-center gap-1">
                      <GripVertical className="w-3 h-3" /> Drag to reorder stacking (top = front)
                    </p>
                  )}
                  {[...currentTemplate.textElements].reverse().map((el) => (
                    <div
                      key={el.id}
                      draggable
                      onDragStart={() => setDraggedLayerId(el.id)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => { e.preventDefault(); if (draggedLayerId) moveTextLayer(draggedLayerId, el.id); setDraggedLayerId(null); }}
                      onDragEnd={() => setDraggedLayerId(null)}
                      onClick={() => setSelectedElId(el.id)}
                      className={`flex justify-between items-center p-2 rounded-lg cursor-grab active:cursor-grabbing border transition-colors ${draggedLayerId === el.id ? 'opacity-40' : ''} ${selectedElId === el.id ? 'bg-indigo-50 border-indigo-500 text-indigo-955' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'}`}
                    >
                      <div className="truncate max-w-[130px] flex items-center gap-1.5 font-semibold text-[11px]">
                        <GripVertical className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <Type className="w-3.5 h-3.5 text-indigo-650 shrink-0" />
                        <span className="truncate">{el.text || '(empty)'}</span>
                      </div>
                      <div className="flex items-center gap-0.5">
                        <button
                          onClick={(e) => { e.stopPropagation(); shiftTextLayer(el.id, 1); }}
                          className="text-slate-400 hover:text-indigo-600 transition-colors p-0.5"
                          title="Bring forward"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); shiftTextLayer(el.id, -1); }}
                          className="text-slate-400 hover:text-indigo-600 transition-colors p-0.5"
                          title="Send backward"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteSelectedElement(el.id); }}
                          className="text-slate-400 hover:text-rose-600 transition-colors p-0.5"
                          title="Delete layer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Signatures */}
                  {(currentTemplate.signatureUrl || currentTemplate.signatoryName) && (
                    <div
                      onClick={() => setSelectedElId('signature')}
                      className={`flex justify-between items-center p-2 rounded-lg cursor-pointer border transition-colors ${selectedElId === 'signature' ? 'bg-indigo-50 border-indigo-500 text-indigo-955' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'}`}
                    >
                      <span className="font-bold flex items-center gap-1.5 text-[11px]">âœ Primary Signatory</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[8px] font-mono text-slate-400 font-bold font-bold font-bold font-bold font-bold font-bold font-bold font-bold font-bold font-bold font-bold">L: {currentTemplate.signatureX}% T: {currentTemplate.signatureY}%</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteSelectedElement('signature'); }}
                          className="text-slate-400 hover:text-rose-600 transition-colors"
                          title="Delete primary signature"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}

                  {(currentTemplate.secondarySignatureUrl || currentTemplate.showSecondarySignatory) && (
                    <div
                      onClick={() => setSelectedElId('secondarySignature')}
                      className={`flex justify-between items-center p-2 rounded-lg cursor-pointer border transition-colors ${selectedElId === 'secondarySignature' ? 'bg-indigo-50 border-indigo-500 text-indigo-955' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'}`}
                    >
                      <span className="font-bold flex items-center gap-1.5 text-[11px]">âœ Secondary Signatory</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[8px] font-mono text-slate-400 font-bold font-bold font-bold font-bold font-bold font-bold font-bold">L: {currentTemplate.secondarySignatureX || 70}% T: {currentTemplate.secondarySignatureY || 78}%</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteSelectedElement('secondarySignature'); }}
                          className="text-slate-400 hover:text-rose-600 transition-colors"
                          title="Delete secondary signature"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Audit Seals */}
                  {(currentTemplate.showQrCode || currentTemplate.showSeal) && (
                    <div
                      onClick={() => setSelectedElId('seal')}
                      className={`flex justify-between items-center p-2 rounded-lg cursor-pointer border transition-colors ${selectedElId === 'seal' ? 'bg-indigo-50 border-indigo-500 text-indigo-955' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'}`}
                    >
                      <span className="font-bold flex items-center gap-1.5 text-[11px]">ðŸ›¡ Audit Seals & QR Code</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[8px] font-mono text-slate-400 font-bold">L: {currentTemplate.qrCodeX}% T: {currentTemplate.qrCodeY}%</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteSelectedElement('seal'); }}
                          className="text-slate-400 hover:text-rose-600 transition-colors"
                          title="Delete audit seals"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            )}

          </div>
        </div>
        )}

        {/* Full-screen free-roam canvas (the pan/zoom stage sits behind all chrome) */}
        <div ref={stageRef} className="absolute inset-0 bg-[#E2E8F0] flex items-center justify-center overflow-hidden selection:bg-slate-200">

          {showCanvaTip && (
            <div className="hidden md:block absolute bottom-20 left-4 z-20 bg-white border border-slate-205 p-3 rounded-xl text-[10px] text-slate-500 max-w-xs space-y-1.5 shadow-lg transition-all duration-300">
              <div className="flex justify-between items-start gap-3">
                <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                  <MousePointerClick className="w-3.5 h-3.5 text-indigo-600" /> Interactive Canva Workspace
                </h4>
                <button
                  onClick={() => {
                    setShowCanvaTip(false);
                    localStorage.setItem('glint_canva_tip_dismissed', 'true');
                  }}
                  className="text-slate-400 hover:text-slate-650 transition-colors p-0.5"
                  title="Dismiss Tip"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="leading-relaxed">Click and drag <strong>ANY element</strong> (logos, signatures, seals, or text blocks) directly on the canvas to visually adjust their placement coordinates in real-time!</p>
            </div>
          )}

          {/* <div className="hidden sm:flex absolute top-4 right-4 flex gap-2 font-mono text-[9px] text-slate-500 bg-white border border-slate-200 p-2 rounded-lg select-none z-10 shadow-sm">
            <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> Vector precision lock: bound</span>
          </div> */}

          {/* Core Interactive visual frame — doubles as the pan/zoom viewport */}
          <div
            ref={viewportRef}
            onPointerDown={handleViewportPointerDown}
            onPointerMove={handleViewportPointerMove}
            onPointerUp={handleViewportPointerUp}
            onPointerCancel={handleViewportPointerUp}
            style={{ cursor: isPanning ? 'grabbing' : spaceHeld ? 'grab' : undefined }}
            className="relative w-full h-full flex items-center justify-center overflow-hidden"
          >
            <ViewportControls
              zoom={zoom}
              onZoomIn={() => zoomByStep(1)}
              onZoomOut={() => zoomByStep(-1)}
              onReset={resetView}
            />

            <div
              ref={canvasRef}
              onPointerDown={handleCanvasPointerDown}
              onContextMenu={(e) => handleContextMenu(e, null)}
              style={{
                background: currentTemplate.backgroundImageUrl
                  ? `url(${currentTemplate.backgroundImageUrl})`
                  : (currentTemplate.backgroundGradient || currentTemplate.backgroundColor),
                backgroundSize: currentTemplate.backgroundImageUrl ? 'cover' : undefined,
                backgroundPosition: currentTemplate.backgroundImageUrl ? 'center' : undefined,
                backgroundRepeat: currentTemplate.backgroundImageUrl ? 'no-repeat' : undefined,
                borderColor: currentTemplate.borderColor,
                borderWidth: `${currentTemplate.borderWidth}px`,
                borderStyle: currentTemplate.borderStyle === 'double' ? 'double' : (currentTemplate.borderStyle === 'dashed' ? 'dashed' : (currentTemplate.borderStyle === 'none' ? 'none' : 'solid')),
                borderRadius: `${currentTemplate.borderRadius || 0}px`,
                containerType: 'inline-size',
                // Pan slides the page in screen px; zoom scales it about its centre.
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: 'center center',
                transition: isPanning ? 'none' : undefined,
                willChange: 'transform',
                // Sized to the largest 1.414:1 box that fits the stage.
                width: stageFit.width || undefined,
                height: stageFit.height || undefined,
                // Pointer gestures on elements drive drag/resize; without this a
                // touch or pen drag would scroll the page instead.
                touchAction: 'none'
              }}
              className="aspect-[1.414/1] bg-white relative shadow-2xl transition-all duration-150 overflow-hidden select-none border-indigo-400 cursor-default"
            >
              
              {/* AI Sample Parsing Glassmorphism Overlay */}
              {isParsingSample && (
                <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center z-[50] text-white p-6 animate-fade-in">
                  <div className="flex flex-col items-center gap-4 max-w-sm text-center">
                    <div className="relative w-16 h-16">
                      <div className="absolute inset-0 rounded-full border-4 border-indigo-205/20 animate-pulse"></div>
                      <div className="absolute inset-0 rounded-full border-4 border-t-indigo-500 border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-extrabold tracking-wider uppercase text-indigo-400">AI Certificate Analyzer</h4>
                      <p className="text-[11px] text-slate-300 font-medium animate-pulse">{parsingProgress}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Symmetrical Corner Accents */}
              {renderCornerFlourish(currentTemplate.decorFlourish || 'none', currentTemplate.borderColor)}

              {/* Visible Alignment Grid Overlay */}
              {gridVisible && (
                <div 
                  className="absolute inset-0 pointer-events-none z-10 opacity-[0.22]" 
                  style={{
                    backgroundImage: 'radial-gradient(circle, #6366f1 1.2px, transparent 1.2px)',
                    backgroundSize: '2.5% 2.5%'
                  }}
                />
              )}
              
              {/*
                Alignment guides. Always mounted, hidden until a drag engages a
                snap; the drag handler positions and shows them directly on the
                DOM (renderGuides / hideGuides) so dragging never re-renders React.

                The previous version hardcoded these to the LOGO's position and
                wrote to element ids that were never rendered, so no guide ever
                actually appeared.
              */}
              <div
                ref={guideVRef}
                style={{ display: 'none', width: '1.5px' }}
                className="absolute bg-fuchsia-500 pointer-events-none z-[60] shadow-[0_0_4px_rgba(217,70,239,0.7)]"
              />
              <div
                ref={guideHRef}
                style={{ display: 'none', height: '1.5px' }}
                className="absolute bg-fuchsia-500 pointer-events-none z-[60] shadow-[0_0_4px_rgba(217,70,239,0.7)]"
              />

              {/* Watermark watermark background */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 opacity-[0.02] border border-slate-900 rounded-full flex items-center justify-center pointer-events-none">
                <Award className="w-24 h-24" />
              </div>

              {/* Decorative corner watermark tags (toggle in the Borders panel) */}
              {currentTemplate.showWatermarkTags !== false && (
                <>
                  <div className="absolute top-4 left-6 pointer-events-none text-slate-400 font-mono text-[6px] tracking-widest uppercase">
                    {brandName} AUTHORIZED DISPATCH
                  </div>
                  <div className="absolute top-4 right-6 pointer-events-none text-slate-400 font-mono text-[6px] tracking-widest uppercase">
                    AUTHENTIC_LEDGER_MATCH
                  </div>
                </>
              )}

              {/* DYNAMIC CANVAS LOGO ITEM */}
              {(currentTemplate.logoUrl || (currentTemplate.logoIconType && currentTemplate.logoIconType !== 'none')) && (
                <div
                  id="canvas-item-logo"
                  onPointerDown={(e) => beginDrag(e, 'logo', currentTemplate.logoX, currentTemplate.logoY)}
                  onContextMenu={(e) => handleContextMenu(e, 'logo')}
                  style={{
                    position: 'absolute',
                    left: `${currentTemplate.logoX}%`,
                    top: `${currentTemplate.logoY}%`,
                    transform: elementTransform(currentTemplate.logoRotation, currentTemplate.logoFlipH, currentTemplate.logoFlipV),
                  }}
                  className={`cursor-pointer group z-30 ${selectedElId === 'logo' ? 'outline border-dashed outline-2 outline-indigo-500 outline-offset-4 rounded px-1' : 'hover:outline hover:outline-dashed hover:outline-1 hover:outline-slate-350 hover:outline-offset-4'}`}
                >
                  {currentTemplate.logoUrl ? (
                    <img 
                      src={currentTemplate.logoUrl} 
                      style={{ width: `${currentTemplate.logoWidth * 0.125}cqw` }} 
                      className="pointer-events-none select-none max-h-32 object-contain"
                      alt="Uploaded Logo"
                    />
                  ) : (
                    renderLogoVector(currentTemplate.logoIconType, currentTemplate.logoWidth)
                  )}
                  
                  {/* Hover visual coordinates tag */}
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 font-mono text-[8px] bg-indigo-600 text-white px-1 py-0.2 rounded opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 select-none pointer-events-none">
                    <span>Logo (L:{currentTemplate.logoX}%, T:{currentTemplate.logoY}%)</span>
                  </div>

                  {selectedElId === 'logo' && (
                    <>
                      {/* Quick Delete Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          deleteSelectedElement();
                        }}
                        className="absolute right-[-14px] top-[-26px] bg-rose-600 hover:bg-rose-700 text-white rounded-full p-1 shadow-lg transition-transform hover:scale-110 z-[65] border border-white flex items-center justify-center pointer-events-auto"
                        title="Delete Logo"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>

                      <RotateHandle onStart={(e) => beginRotate(e, 'logo')} />
                      {ALL_HANDLES.map((h) => (
                        <ResizeHandle
                          key={h}
                          pos={h}
                          outlineOffset={4}
                          onStart={(ev, hp) => beginResize(ev, 'logo', hp, currentTemplate.logoWidth)}
                        />
                      ))}
                    </>
                  )}
                </div>
              )}

              {currentTemplate.textElements.map(el => {
                if (el.type === 'redaction') {
                  const isSelected = el.id === selectedElId;
                  return (
                    <div
                      key={el.id}
                      id={`canvas-item-${el.id}`}
                      onPointerDown={(e) => beginDrag(e, el.id, el.xPercent, el.yPercent)}
                      onContextMenu={(e) => handleContextMenu(e, el.id)}
                      style={{
                        position: 'absolute',
                        left: `${el.xPercent}%`,
                        top: `${el.yPercent}%`,
                        transform: elementTransform(el.rotation, el.flipH, el.flipV),
                        width: `${(el.width || 200) * 0.1125}cqw`,
                        height: `${(el.height || 40) * 0.1125}cqw`,
                        backgroundColor: el.color || '#FFFFFF',
                        zIndex: isSelected ? 45 : 15,
                        opacity: el.opacity !== undefined ? el.opacity : 1
                      }}
                      className={`cursor-pointer select-none transition-all ${
                        isSelected 
                          ? 'outline border-dashed outline-2 outline-indigo-500 outline-offset-2' 
                          : 'hover:outline hover:outline-dashed hover:outline-1 hover:outline-slate-400 hover:outline-offset-2'
                      }`}
                      title="Redaction Eraser Patch (Drag & Resize to cover text)"
                    >
                      <span className="absolute inset-0 flex items-center justify-center text-[8px] font-mono font-bold text-indigo-500/25 pointer-events-none uppercase tracking-wider select-none overflow-hidden truncate">
                        Eraser Patch
                      </span>

                      {isSelected && (
                        <>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              deleteSelectedElement();
                            }}
                            className="absolute right-[-14px] top-[-26px] bg-rose-600 hover:bg-rose-700 text-white rounded-full p-1 shadow-lg transition-transform hover:scale-110 z-[65] border border-white flex items-center justify-center pointer-events-auto cursor-pointer"
                            title="Delete Eraser"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>

                          <RotateHandle onStart={(e) => beginRotate(e, el.id)} />
                          {PATCH_HANDLES.map((h) => (
                            <ResizeHandle
                              key={h}
                              pos={h}
                              onStart={(ev, hp) => beginResize(ev, el.id, hp, el.width || 200, undefined, el.height || 40)}
                            />
                          ))}
                        </>
                      )}
                    </div>
                  );
                }

                if (el.imageUrl) {
                  const isSelected = el.id === selectedElId;
                  return (
                    <div
                      key={el.id}
                      id={`canvas-item-${el.id}`}
                      onPointerDown={(e) => beginDrag(e, el.id, el.xPercent, el.yPercent)}
                      onContextMenu={(e) => handleContextMenu(e, el.id)}
                      style={{
                        position: 'absolute',
                        left: `${el.xPercent}%`,
                        top: `${el.yPercent}%`,
                        transform: elementTransform(el.rotation, el.flipH, el.flipV),
                        width: `${(el.width || 120) * 0.125}cqw`,
                        zIndex: isSelected ? 40 : 20,
                      }}
                      className={`cursor-pointer group select-none border-box transition-all px-1 py-1 ${
                        isSelected ? 'outline border-dashed outline-2 outline-indigo-500 outline-offset-2 bg-indigo-500/5 rounded-md' : 'hover:outline hover:outline-dashed hover:outline-1 hover:outline-slate-400 hover:outline-offset-2'
                      }`}
                    >
                      <img
                        src={el.imageUrl}
                        style={{ width: '100%', maxHeight: '200px', objectFit: 'contain' }}
                        className="pointer-events-none select-none mx-auto"
                        alt="Uploaded Element"
                      />

                      {/* Floating context label */}
                      <div className="absolute -top-7 left-1/2 -translate-x-1/2 font-mono text-[7px] bg-slate-900 border border-slate-700 text-slate-300 px-1 py-0.2 rounded opacity-0 group-hover:opacity-100 transition-opacity shrink-0 pointer-events-none select-none flex items-center gap-1 whitespace-nowrap flex items-center gap-1">
                        <span>IMAGE (L:{el.xPercent}%, T:{el.yPercent}%)</span>
                      </div>

                      {isSelected && (
                        <>
                          {/* Quick Delete Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              deleteSelectedElement();
                            }}
                            className="absolute right-[-14px] top-[-26px] bg-rose-600 hover:bg-rose-700 text-white rounded-full p-1 shadow-lg transition-transform hover:scale-110 z-[65] border border-white flex items-center justify-center pointer-events-auto cursor-pointer"
                            title="Delete Element"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>

                          <RotateHandle onStart={(e) => beginRotate(e, el.id)} />
                          {CORNER_HANDLES.map((h) => (
                            <ResizeHandle
                              key={h}
                              pos={h}
                              onStart={(ev, hp) => beginResize(ev, el.id, hp, el.width || 120)}
                            />
                          ))}
                        </>
                      )}
                    </div>
                  );
                }

                const previewReplacements = {
                  name: 'Alex Rivera (Recipient Name)',
                  program: 'Gemini Developer Mastery Program',
                  id: 'GLNT-SAMPLE-PREVIEW',
                  date: '2026-06-18',
                };

                // Fonts mapping classes
                let fontClass = 'font-sans';
                if (el.fontFamily === 'Space Grotesk') fontClass = 'font-display tracking-tight';
                if (el.fontFamily === 'Playfair Display') fontClass = 'font-serif italic';
                if (el.fontFamily === 'JetBrains Mono') fontClass = 'font-mono uppercase tracking-wider text-[10px]';

                let weightClass = 'font-normal';
                if (el.fontWeight === 'medium') weightClass = 'font-medium';
                if (el.fontWeight === 'bold') weightClass = 'font-bold';

                const isSelected = el.id === selectedElId;

                return (
                  <div
                    key={el.id}
                    id={`canvas-item-${el.id}`}
                    onPointerDown={(e) => { if (editingCanvasId !== el.id) beginDrag(e, el.id, el.xPercent, el.yPercent); }}
                    onDoubleClick={(e) => { e.stopPropagation(); setSelectedElId(el.id); setEditingCanvasId(el.id); }}
                    onContextMenu={(e) => handleContextMenu(e, el.id)}
                    style={{
                      position: 'absolute',
                      left: `${el.xPercent}%`,
                      top: `${el.yPercent}%`,
                      transform: elementTransform(el.rotation, el.flipH, el.flipV),
                      cursor: editingCanvasId === el.id ? 'text' : undefined,
                      color: el.color,
                      // Same canvas-relative scale the viewer uses, so the editor
                      // is a true WYSIWYG preview of the delivered certificate.
                      fontSize: `${el.fontSize * 0.1125}cqw`,
                      textAlign: el.align as any,
                      zIndex: isSelected ? 40 : 20,
                      width: el.width ? `${el.width * 0.1125}cqw` : undefined,
                      maxWidth: el.width ? undefined : '57.6cqw',
                      boxSizing: 'border-box',
                      fontFamily: el.fontFamily,
                      fontStyle: el.fontStyle || 'normal',
                      fontWeight: el.fontWeight === 'bold' ? 700 : (el.fontWeight === 'medium' ? 500 : 400),
                      textDecoration: el.textDecoration || 'none',
                      letterSpacing: el.letterSpacing ? `${el.letterSpacing}px` : undefined,
                      lineHeight: el.lineHeight || 'normal',
                      whiteSpace: 'pre-wrap',
                      overflowWrap: 'break-word',
                      opacity: el.opacity !== undefined ? el.opacity : undefined,
                      textTransform: el.textTransform || 'none'
                    }}
                    className={`${fontClass} ${weightClass} cursor-pointer break-words leading-snug select-none group border-box transition-all px-2.5 py-1 ${
                      isSelected ? 'outline border-dashed outline-2 outline-indigo-500 outline-offset-2 bg-indigo-500/5 rounded-md' : 'hover:outline hover:outline-dashed hover:outline-1 hover:outline-slate-400 hover:outline-offset-2'
                    }`}
                  >
                    {editingCanvasId === el.id ? (
                      <InlineTextEditor
                        key="inline-edit"
                        initialText={el.text}
                        onCommit={(text) => { setEditingCanvasId(null); updateTextElementProperty(el.id, 'text', text); }}
                        onCancel={() => setEditingCanvasId(null)}
                      />
                    ) : (
                      renderRichText(el, previewReplacements)
                    )}

                    {/* Floating context label */}
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 font-mono text-[7px] bg-slate-900 border border-slate-700 text-slate-300 px-1 py-0.2 rounded opacity-0 group-hover:opacity-100 transition-opacity shrink-0 pointer-events-none select-none flex items-center gap-1 whitespace-nowrap">
                      <span>{el.fontWeight.toUpperCase()} (L:{el.xPercent}%, T:{el.yPercent}%)</span>
                    </div>

                    {isSelected && (
                      <>
                        {/* Quick Delete Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            deleteSelectedElement();
                          }}
                          className="absolute right-[-14px] top-[-26px] bg-rose-600 hover:bg-rose-700 text-white rounded-full p-1 shadow-lg transition-transform hover:scale-110 z-[65] border border-white flex items-center justify-center pointer-events-auto"
                          title="Delete Element"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>

                        {/*
                          Corners and the top/bottom edges scale the font size;
                          left/right scale the wrap width. `beginResize` gets the
                          font size for all handles — the move handler only applies
                          it for the handles that should change it.
                        */}
                        <RotateHandle onStart={(e) => beginRotate(e, el.id)} />
                        {ALL_HANDLES.map((h) => (
                          <ResizeHandle
                            key={h}
                            pos={h}
                            onStart={(ev, hp) => beginResize(ev, el.id, hp, el.width || 512, el.fontSize)}
                          />
                        ))}
                      </>
                    )}
                  </div>
                );
              })}

              {/* DYNAMIC PRIMARY SIGNATORY */}
              {(currentTemplate.signatureUrl || currentTemplate.signatoryName) && (
                <div
                  id="canvas-item-signature"
                  onPointerDown={(e) => beginDrag(e, 'signature', currentTemplate.signatureX, currentTemplate.signatureY)}
                  onContextMenu={(e) => handleContextMenu(e, 'signature')}
                  style={{
                    position: 'absolute',
                    left: `${currentTemplate.signatureX}%`,
                    top: `${currentTemplate.signatureY}%`,
                    transform: elementTransform(currentTemplate.signatureRotation, currentTemplate.signatureFlipH, currentTemplate.signatureFlipV),
                    width: `${currentTemplate.signatureWidth * 0.125}cqw`,
                  }}
                  className={`cursor-pointer group z-30 p-2 text-center select-none ${selectedElId === 'signature' ? 'outline border-dashed outline-2 outline-indigo-500 outline-offset-4 rounded' : 'hover:outline hover:outline-dashed hover:outline-1 hover:outline-slate-400'}`}
                >
                  {currentTemplate.signatureUrl ? (
                    <img 
                      src={currentTemplate.signatureUrl}
                      style={{ width: `${currentTemplate.signatureWidth * 0.125}cqw` }}
                      className="pointer-events-none select-none object-contain mx-auto max-h-16"
                      alt="Signature"
                    />
                  ) : (
                    renderHandwrittenSignature(currentTemplate.signatoryName || '', currentTemplate.signatoryFontFamily || 'Playfair Display', currentTemplate.signatoryFontSize || 18)
                  )}
                  <p 
                    style={{
                      fontFamily: currentTemplate.signatoryFontFamily || 'Inter',
                      fontSize: currentTemplate.signatoryFontSize ? `${(currentTemplate.signatoryFontSize * 0.4) * 0.09}cqw` : undefined
                    }}
                    className="font-bold uppercase tracking-widest text-slate-400 mt-1.5 leading-tight text-[7px]"
                  >
                    {currentTemplate.signatoryTitle || 'Signatory title'}
                  </p>
                  
                  {/* Coordinate Tag */}
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 font-mono text-[8px] bg-indigo-600 text-white px-1 py-0.2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none select-none shrink-0 whitespace-nowrap">
                    <span>Signature 1 (L:{currentTemplate.signatureX}%, T:{currentTemplate.signatureY}%)</span>
                  </div>

                  {selectedElId === 'signature' && (
                    <>
                      {/* Quick Delete Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          deleteSelectedElement();
                        }}
                        className="absolute right-[-14px] top-[-26px] bg-rose-600 hover:bg-rose-700 text-white rounded-full p-1 shadow-lg transition-transform hover:scale-110 z-[65] border border-white flex items-center justify-center pointer-events-auto"
                        title="Delete Signature"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>

                      <RotateHandle onStart={(e) => beginRotate(e, 'signature')} />
                      {ALL_HANDLES.map((h) => (
                        <ResizeHandle
                          key={h}
                          pos={h}
                          outlineOffset={4}
                          onStart={(ev, hp) => beginResize(ev, 'signature', hp, currentTemplate.signatureWidth)}
                        />
                      ))}
                    </>
                  )}
                </div>
              )}

              {/* DYNAMIC SECONDARY SIGNATORY */}
              {(currentTemplate.secondarySignatureUrl || currentTemplate.showSecondarySignatory) && (
                <div
                  id="canvas-item-secondarySignature"
                  onPointerDown={(e) => beginDrag(e, 'secondarySignature', currentTemplate.secondarySignatureX || 70, currentTemplate.secondarySignatureY || 78)}
                  onContextMenu={(e) => handleContextMenu(e, 'secondarySignature')}
                  style={{
                    position: 'absolute',
                    left: `${currentTemplate.secondarySignatureX || 70}%`,
                    top: `${currentTemplate.secondarySignatureY || 78}%`,
                    transform: elementTransform(currentTemplate.secondarySignatureRotation, currentTemplate.secondarySignatureFlipH, currentTemplate.secondarySignatureFlipV),
                    width: `${(currentTemplate.secondarySignatureWidth || 100) * 0.125}cqw`,
                  }}
                  className={`cursor-pointer group z-30 p-2 text-center select-none ${selectedElId === 'secondarySignature' ? 'outline border-dashed outline-2 outline-indigo-500 outline-offset-4 rounded' : 'hover:outline hover:outline-dashed hover:outline-1 hover:outline-slate-400'}`}
                >
                  {currentTemplate.secondarySignatureUrl ? (
                    <img 
                      src={currentTemplate.secondarySignatureUrl}
                      style={{ width: `${(currentTemplate.secondarySignatureWidth || 100) * 0.125}cqw` }}
                      className="pointer-events-none select-none object-contain mx-auto max-h-16"
                      alt="Secondary Signature"
                    />
                  ) : (
                    // Empty slots preview as the literal word "Signature". They used to
                    // preview as "Dr. Clara Masters, Admissions Registrar" — a person
                    // who does not exist, on a certificate about to be issued for real.
                    renderHandwrittenSignature(currentTemplate.secondarySignatoryName || '', currentTemplate.secondarySignatoryFontFamily || 'Playfair Display', currentTemplate.secondarySignatoryFontSize || 18)
                  )}
                  <p
                    style={{
                      fontFamily: currentTemplate.secondarySignatoryFontFamily || 'Inter',
                      fontSize: currentTemplate.secondarySignatoryFontSize ? `${(currentTemplate.secondarySignatoryFontSize * 0.4) * 0.09}cqw` : undefined
                    }}
                    className="font-bold uppercase tracking-widest text-slate-400 mt-1.5 leading-tight text-[7px]"
                  >
                    {currentTemplate.secondarySignatoryTitle || 'Signatory title'}
                  </p>
                  
                  {/* Coordinate Tag */}
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 font-mono text-[8px] bg-indigo-600 text-white px-1 py-0.2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none select-none shrink-0 whitespace-nowrap">
                    <span>Signature 2 (L:{currentTemplate.secondarySignatureX || 70}%, T:{currentTemplate.secondarySignatureY || 78}%)</span>
                  </div>

                  {selectedElId === 'secondarySignature' && (
                    <>
                      {/* Quick Delete Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          deleteSelectedElement();
                        }}
                        className="absolute right-[-14px] top-[-26px] bg-rose-600 hover:bg-rose-700 text-white rounded-full p-1 shadow-lg transition-transform hover:scale-110 z-[65] border border-white flex items-center justify-center pointer-events-auto"
                        title="Delete Signature"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>

                      <RotateHandle onStart={(e) => beginRotate(e, 'secondarySignature')} />
                      {ALL_HANDLES.map((h) => (
                        <ResizeHandle
                          key={h}
                          pos={h}
                          outlineOffset={4}
                          onStart={(ev, hp) => beginResize(ev, 'secondarySignature', hp, currentTemplate.secondarySignatureWidth || 100)}
                        />
                      ))}
                    </>
                  )}
                </div>
              )}

              {/* DYNAMIC STAMP / QR CODE */}
              {(currentTemplate.showQrCode || currentTemplate.showSeal) && (
                <div
                  id="canvas-item-seal"
                  onPointerDown={(e) => beginDrag(e, 'seal', currentTemplate.qrCodeX, currentTemplate.qrCodeY)}
                  onContextMenu={(e) => handleContextMenu(e, 'seal')}
                  style={{
                    position: 'absolute',
                    left: `${currentTemplate.qrCodeX}%`,
                    top: `${currentTemplate.qrCodeY}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                  className={`cursor-pointer group z-30 flex items-center gap-1.5 select-none ${selectedElId === 'seal' ? 'outline border-dashed outline-2 outline-indigo-500 outline-offset-4 rounded' : 'hover:outline hover:outline-dashed hover:outline-1 hover:outline-indigo-400 hover:outline-offset-2'}`}
                >
                  
                  {/* Elegant Simulated Stamp/Seal rendering */}
                  {currentTemplate.showSeal && (
                    <div 
                      style={{
                        width: `${(currentTemplate.sealWidth || 40) * 0.125}cqw`,
                        height: `${(currentTemplate.sealWidth || 40) * 0.125}cqw`,
                      }}
                      className="pointer-events-none select-none shrink-0"
                    >
                      {currentTemplate.sealType === 'classic' && (
                        <div className="w-full h-full rounded-full border-2 border-indigo-500/40 bg-indigo-500/5 text-indigo-500 flex items-center justify-center font-bold text-[1.2cqw] shadow-sm">
                          â˜…
                        </div>
                      )}
                      {currentTemplate.sealType === 'stellar' && (
                        <div className="w-full h-full bg-slate-900 border-2 border-dashed border-cyan-400 text-cyan-400 rounded-full flex items-center justify-center font-bold text-[1.2cqw] select-none">
                          âœ§
                        </div>
                      )}
                      {currentTemplate.sealType === 'modern' && (
                        <div className="w-full h-full bg-emerald-500 text-neutral-900 p-1 flex items-center justify-center text-[0.8cqw] font-bold border rounded w-full h-full select-none">
                          SEAL
                        </div>
                      )}
                      {currentTemplate.sealType === 'crimson_wax' && (
                        <div className="w-full h-full bg-rose-700/80 border border-amber-500/30 text-amber-300 rounded-full flex items-center justify-center font-serif font-bold text-[0.9cqw] shadow-md select-none">
                          SEAL
                        </div>
                      )}
                      {currentTemplate.sealType === 'emerald_shield' && (
                        <div className="w-full h-full bg-emerald-900 border-2 border-amber-400 text-amber-300 rounded-md flex items-center justify-center font-bold text-[1.2cqw] select-none shadow">
                          â›¨
                        </div>
                      )}
                      {currentTemplate.sealType === 'gold_medallion' && (
                        <div className="w-full h-full bg-gradient-to-tr from-yellow-600 via-amber-400 to-yellow-600 border border-yellow-300 rounded-full flex items-center justify-center text-yellow-950 font-serif font-bold text-[0.9cqw] shadow-lg select-none">
                          ðŸ†
                        </div>
                      )}
                    </div>
                  )}

                  {/* Trust QR — generated locally, previewing the sample values */}
                  {currentTemplate.showQrCode && previewQrDataUrl && (
                    <div
                      style={{
                        width: `${(currentTemplate.qrCodeWidth || 32) * 0.125}cqw`,
                        height: `${(currentTemplate.qrCodeWidth || 32) * 0.125}cqw`,
                      }}
                      className="bg-white p-0.5 rounded-sm border border-slate-200 shadow-sm flex items-center justify-center select-none shrink-0"
                    >
                      <img src={previewQrDataUrl} alt="Verification QR preview" className="w-full h-full object-contain" />
                    </div>
                  )}

                  {/* Coordinate Tag */}
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 font-mono text-[8px] bg-indigo-600 text-white px-1 py-0.2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none select-none shrink-0 whitespace-nowrap">
                    <span>Audit Seals (L:{currentTemplate.qrCodeX}%, T:{currentTemplate.qrCodeY}%)</span>
                  </div>

                  {selectedElId === 'seal' && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        deleteSelectedElement('seal');
                      }}
                      className="absolute right-[-14px] top-[-26px] bg-rose-600 hover:bg-rose-700 text-white rounded-full p-1 shadow-lg transition-transform hover:scale-110 z-[65] border border-white flex items-center justify-center pointer-events-auto"
                      title="Delete Audit Seals"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}

                </div>
              )}

            </div>
          </div>

        </div>

      </div>

      {/* Exit confirmation — the only way out is Save or a deliberate discard */}
      {showExitConfirm && (
        <div className="absolute inset-0 z-[80] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4" onPointerDown={() => setShowExitConfirm(false)}>
          <div
            className="w-full max-w-sm rounded-2xl bg-white shadow-2xl border border-slate-200 p-6 space-y-4 animate-fade-in"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900">Leave the editor?</h3>
              <p className="text-xs text-slate-500 leading-relaxed">Save your Canva style to keep this design, or exit without saving to discard changes made in this session.</p>
            </div>
            <div className="flex flex-col gap-2 pt-1">
              <button
                type="button"
                disabled={isSaving}
                onClick={() => { setShowExitConfirm(false); onSave(prepareTemplateForSave()); }}
                className="w-full bg-slate-950 hover:bg-slate-800 text-white text-sm px-4 py-2.5 rounded-xl font-bold shadow transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <Save className="w-4 h-4" /> Save Canva Style
              </button>
              <button
                type="button"
                onClick={() => { setShowExitConfirm(false); onCancel(); }}
                className="w-full bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 text-sm px-4 py-2.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" /> Exit Without Saving
              </button>
              <button
                type="button"
                onClick={() => setShowExitConfirm(false)}
                className="w-full text-slate-500 hover:text-slate-800 text-xs px-4 py-2 rounded-xl font-semibold transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom right-click context menu */}
      {contextMenu && (
        <div
          style={{
            position: 'fixed',
            top: `${contextMenu.y}px`,
            left: `${contextMenu.x}px`,
            zIndex: 1000,
          }}
          className="bg-white/95 backdrop-blur-md border border-slate-200 shadow-2xl rounded-xl p-1.5 min-w-[160px] animate-fade-in text-slate-800 text-xs font-semibold select-none flex flex-col pointer-events-auto"
        >
          {contextMenu.targetId ? (
            <>
              <div className="px-2.5 py-1 text-[9px] uppercase font-bold text-slate-400">
                Layer Operations
              </div>
              <div className="px-2.5 py-1.5">
                <PositionAlignmentGrid onAlign={(x, y) => alignElementTo(contextMenu.targetId!, x, y)} />
              </div>
              <button
                onClick={() => alignCenterHorizontally(contextMenu.targetId!)}
                className="hidden"
              >
                <AlignCenter className="w-3.5 h-3.5" /> Align Horizontally
              </button>
              <button
                onClick={() => alignCenterVertically(contextMenu.targetId!)}
                className="hidden"
              >
                <AlignCenter className="w-3.5 h-3.5 rotate-90" /> Align Vertically
              </button>
              <button
                onClick={() => resetElementSize(contextMenu.targetId!)}
                className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg text-left"
              >
                <Sliders className="w-3.5 h-3.5" /> Reset Size
              </button>

              <div className="h-px bg-slate-100 my-1" />
              <div className="px-2.5 py-1 text-[9px] uppercase font-bold text-slate-400">
                Rotate &amp; Flip
              </div>
              <button
                onClick={() => toggleElementFlip(contextMenu.targetId!, 'h')}
                className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg text-left"
              >
                <FlipHorizontal2 className="w-3.5 h-3.5" /> Flip Horizontal
              </button>
              <button
                onClick={() => toggleElementFlip(contextMenu.targetId!, 'v')}
                className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg text-left"
              >
                <FlipVertical2 className="w-3.5 h-3.5" /> Flip Vertical
              </button>
              <button
                onClick={() => { commitElementTransform(contextMenu.targetId!, { rotation: 0 }); setContextMenu(null); }}
                className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg text-left"
              >
                <RotateCw className="w-3.5 h-3.5" /> Reset Rotation
              </button>

              {contextMenu.targetId.startsWith('t-') && (
                <>
                  <div className="h-px bg-slate-100 my-1" />
                  <div className="px-2.5 py-1 text-[9px] uppercase font-bold text-slate-400">
                    Text Alignment
                  </div>
                  <button
                    onClick={() => {
                      updateTextElementProperty(contextMenu.targetId!, 'align', 'left');
                      setContextMenu(null);
                    }}
                    className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg text-left"
                  >
                    <AlignLeft className="w-3.5 h-3.5" /> Align Left
                  </button>
                  <button
                    onClick={() => {
                      updateTextElementProperty(contextMenu.targetId!, 'align', 'center');
                      setContextMenu(null);
                    }}
                    className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg text-left"
                  >
                    <AlignCenter className="w-3.5 h-3.5" /> Align Center
                  </button>
                  <button
                    onClick={() => {
                      updateTextElementProperty(contextMenu.targetId!, 'align', 'right');
                      setContextMenu(null);
                    }}
                    className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg text-left"
                  >
                    <AlignRight className="w-3.5 h-3.5" /> Align Right
                  </button>

                  <div className="h-px bg-slate-100 my-1" />
                  <button
                    onClick={() => bringToFront(contextMenu.targetId!)}
                    className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg text-left"
                  >
                    <Layers className="w-3.5 h-3.5" /> Bring to Front
                  </button>
                  <button
                    onClick={() => sendToBack(contextMenu.targetId!)}
                    className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg text-left"
                  >
                    <Layers className="w-3.5 h-3.5 opacity-60" /> Send to Back
                  </button>
                  <button
                    onClick={() => duplicateElement(contextMenu.targetId!)}
                    className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg text-left"
                  >
                    <Plus className="w-3.5 h-3.5" /> Duplicate Layer
                  </button>
                </>
              )}
              
              <div className="h-px bg-slate-100 my-1" />
              <button
                onClick={() => {
                  deleteSelectedElement(contextMenu.targetId!);
                  setContextMenu(null);
                }}
                className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-rose-50 hover:text-rose-600 text-rose-600 rounded-lg text-left"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete Element
              </button>
            </>
          ) : (
            <>
              <div className="px-2.5 py-1 text-[9px] uppercase font-bold text-slate-400">
                Insert Element
              </div>
              <button
                onClick={() => {
                  const { xPercent, yPercent } = getCanvasRelativeCoords(contextMenu.x, contextMenu.y);
                  insertTextAtCoords('heading', xPercent, yPercent);
                }}
                className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg text-left"
              >
                <Type className="w-3.5 h-3.5 font-bold" /> Add Heading
              </button>
              <button
                onClick={() => {
                  const { xPercent, yPercent } = getCanvasRelativeCoords(contextMenu.x, contextMenu.y);
                  insertTextAtCoords('subheading', xPercent, yPercent);
                }}
                className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg text-left flex"
              >
                <Type className="w-3.5 h-3.5" /> Add Subheading
              </button>
              <button
                onClick={() => {
                  const { xPercent, yPercent } = getCanvasRelativeCoords(contextMenu.x, contextMenu.y);
                  insertTextAtCoords('body', xPercent, yPercent);
                }}
                className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg text-left"
              >
                <Type className="w-3.5 h-3.5 opacity-60" /> Add Body Text
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// Internal SVG Helper Chevron arrow
function ChevronSign() {
  return (
    <svg className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
    </svg>
  );
}
