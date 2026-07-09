/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * A self-contained certificate canvas editor.
 *
 *   import { CertificateEditor } from '@/src/editor';
 *   <div className="h-[80vh]"><CertificateEditor onChange={save} /></div>
 *
 * The host must give it a bounded height — it fills its container and manages
 * its own scrolling and zoom.
 */

export { CertificateEditor } from './CertificateEditor';
export type { CertificateEditorProps } from './CertificateEditor';
export { CanvasStage } from './CanvasStage';
export type { Tool } from './CanvasStage';
export { Inspector } from './Inspector';
export { Toolbar } from './Toolbar';
export { Overlay } from './Overlay';
export { NodeView } from './NodeView';

export {
  PAGE_PRESETS,
  createNode,
  createStarterDocument,
  duplicateNodes,
  frameOf,
  mapNodes,
  removeNodes,
  reorderNodes,
  scaleNodeProps,
  uid,
  withFrame,
} from './document';
export type { PagePresetId, ReorderCommand } from './document';

export * from './geometry';
export * from './viewport';
export * from './snapping';
export { useHistory } from './useHistory';
export type { History } from './useHistory';
export { useViewport } from './useViewport';
export type { ViewportController } from './useViewport';
export type * from './types';
