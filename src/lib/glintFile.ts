/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * The ".glint" template file format.
 *
 * A `.glint` file is a single, self-contained JSON envelope that captures a
 * certificate layout exactly the way the platform reads it: colours, borders,
 * seal/QR settings, positioned text elements, and every binary asset
 * (background image, logo, signatures, and uploaded `.ttf` fonts) inlined as
 * base64 data URLs. There are no external file references, so a single `.glint`
 * file is everything needed to reproduce a design on any Glint workspace.
 *
 * It is a Glint-proprietary format: the importer only accepts payloads carrying
 * the magic marker and a supported version, so an arbitrary `.json` renamed to
 * `.glint` (or a file from another tool) is rejected with a clear message.
 */
import type { CertificateTemplate } from '../types';

/** Marks a JSON blob as a Glint template file. Importer rejects anything else. */
export const GLINT_FILE_MAGIC = 'glint.template' as const;
/** Bump when the envelope shape changes in a backward-incompatible way. */
export const GLINT_FILE_VERSION = 1 as const;
export const GLINT_FILE_EXTENSION = '.glint';
export const GLINT_FILE_MIME = 'application/vnd.glint.template+json';

/**
 * A template as it travels inside a `.glint` file: everything a
 * `CertificateTemplate` holds except the identifiers that are specific to the
 * workspace it was exported from. On import a fresh id is minted and the file is
 * attached to the importing workspace.
 */
export type ExportableTemplate = Omit<CertificateTemplate, 'id' | 'workspaceId'>;

export interface GlintTemplateFile {
  magic: typeof GLINT_FILE_MAGIC;
  version: number;
  app: string;
  exportedAt: string;
  /** Human-facing template name, surfaced in the importer before it lands. */
  name: string;
  /** Optional rasterized thumbnail (PNG data URL) for quick inspection. */
  preview?: string;
  template: ExportableTemplate;
}

/** Strip the workspace-specific identifiers; keep every design field + asset. */
function toExportableTemplate(template: CertificateTemplate): ExportableTemplate {
  const { id: _id, workspaceId: _workspaceId, ...rest } = template;
  return rest;
}

/**
 * Serialize a template into the text content of a `.glint` file.
 *
 * `preview` (a PNG data URL) is embedded when supplied; it is purely a
 * convenience thumbnail and is never required to re-import the design.
 */
export function serializeGlintFile(template: CertificateTemplate, preview?: string): string {
  const file: GlintTemplateFile = {
    magic: GLINT_FILE_MAGIC,
    version: GLINT_FILE_VERSION,
    app: 'Glint Registry',
    exportedAt: new Date().toISOString(),
    name: template.name,
    ...(preview ? { preview } : {}),
    template: toExportableTemplate(template),
  };
  return JSON.stringify(file);
}

export interface ParsedGlintFile {
  name: string;
  template: ExportableTemplate;
  preview?: string;
}

/** Thrown when a file is not a valid, supported `.glint` document. */
export class GlintFileError extends Error {}

/**
 * Parse and validate the text content of a `.glint` file.
 *
 * Throws a `GlintFileError` with a user-facing message when the content is not
 * JSON, is missing the Glint marker, was produced by a newer format version, or
 * does not carry a template body.
 */
export function parseGlintFile(text: string): ParsedGlintFile {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new GlintFileError('This is not a valid .glint file (unreadable content).');
  }

  if (!data || typeof data !== 'object') {
    throw new GlintFileError('This is not a valid .glint file.');
  }

  const file = data as Partial<GlintTemplateFile>;

  if (file.magic !== GLINT_FILE_MAGIC) {
    throw new GlintFileError('This file was not created by Glint and cannot be imported.');
  }

  if (typeof file.version !== 'number' || file.version > GLINT_FILE_VERSION) {
    throw new GlintFileError(
      'This .glint file was created with a newer version of Glint. Please update to import it.',
    );
  }

  if (!file.template || typeof file.template !== 'object') {
    throw new GlintFileError('This .glint file does not contain a certificate design.');
  }

  const template = file.template as ExportableTemplate;
  const name =
    (typeof file.name === 'string' && file.name.trim()) ||
    (typeof template.name === 'string' && template.name.trim()) ||
    'Imported Design';

  return {
    name,
    template,
    preview: typeof file.preview === 'string' ? file.preview : undefined,
  };
}

/** True when a picked file looks like a Glint template file (by extension). */
export function isGlintFileName(fileName: string): boolean {
  return fileName.toLowerCase().endsWith(GLINT_FILE_EXTENSION);
}

/** Turn a template name into a safe `<name>.glint` download filename. */
export function glintFileNameFor(templateName: string): string {
  const base =
    templateName
      .trim()
      .replace(/[^a-z0-9._-]+/gi, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .slice(0, 80) || 'glint_template';
  return `${base}${GLINT_FILE_EXTENSION}`;
}

/** Trigger a browser download of arbitrary text as a file. */
export function downloadTextFile(fileName: string, content: string, mime = GLINT_FILE_MIME): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Revoke on the next tick so the download has a chance to start first.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
