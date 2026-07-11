/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Glint embeds the certificate id and its signature into the downloaded PDF's
 * document metadata (the `/Keywords` entry of the Info dictionary). That lets
 * the "Verify a certificate" tool recognise an uploaded PDF regardless of what
 * the user renamed the file to — the filename carries no authority, the
 * embedded signature does.
 *
 * The marker is a flat, delimiter-separated token so it survives as a literal
 * string inside the PDF and can be recovered by a byte scan without a full PDF
 * parser. It deliberately uses only characters that never need escaping inside
 * a PDF literal string: the id is `GLNT-...` and the signature is lowercase hex.
 *
 * If the PDF is re-saved by another tool, printed, or scanned, this metadata is
 * usually lost — which is the exact case the UI falls back on ("the PDF may
 * have been modified or printed; enter the certificate ID to compare visually").
 */

const MARKER_RE = /glint;id=([A-Za-z0-9-]+);sig=([0-9a-fA-F]+)/;

export interface CertPdfMeta {
  id: string;
  signature: string;
}

/** The value written to the PDF's `keywords` metadata field at download time. */
export function buildCertPdfKeywords(id: string, signature: string): string {
  return `glint;id=${id};sig=${signature}`;
}

/** Recover `{ id, signature }` from raw PDF text, or null if the marker is absent. */
export function parseCertPdfMarker(pdfText: string): CertPdfMeta | null {
  const m = pdfText.match(MARKER_RE);
  return m ? { id: m[1], signature: m[2].toLowerCase() } : null;
}

/**
 * Read an uploaded PDF and pull out the Glint marker. The file is decoded as
 * latin1 so every byte maps to one character and the parenthesised `/Keywords`
 * literal survives intact for the regex; we are matching an ASCII token, not
 * interpreting text, so the encoding only has to be lossless.
 */
export async function extractCertMetaFromPdf(file: File): Promise<CertPdfMeta | null> {
  const buf = await file.arrayBuffer();
  const text = new TextDecoder('latin1').decode(new Uint8Array(buf));
  return parseCertPdfMarker(text);
}

/**
 * Accepts a certificate id or a certificate link and returns the bare id.
 * `https://host/c/GLNT-...` → `GLNT-...`; a plain id is returned trimmed.
 */
export function certIdFromInput(input: string): string {
  const trimmed = input.trim();
  const linkMatch = trimmed.match(/\/c\/([^/?#\s]+)/i);
  return linkMatch ? decodeURIComponent(linkMatch[1]) : trimmed;
}
