/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { buildCertPdfKeywords, parseCertPdfMarker, certIdFromInput } from '../certPdfMeta';

describe('certPdfMeta', () => {
  const id = 'GLNT-56855-25C65-37159-56662';
  const sig = '8230cb6d7d44001d9e7c316e8d48cbee7afe532450eba58c27e8e7cee3ffb18a';

  it('round-trips the marker through keywords → parse', () => {
    const keywords = buildCertPdfKeywords(id, sig);
    // Simulate the keywords living inside a PDF Info dictionary literal.
    const pdfText = `%PDF-1.3\n... /Keywords (${keywords}) /Creator (Glint) ...\n%%EOF`;
    expect(parseCertPdfMarker(pdfText)).toEqual({ id, signature: sig });
  });

  it('lower-cases the recovered signature', () => {
    const pdfText = `/Keywords (glint;id=${id};sig=${sig.toUpperCase()})`;
    expect(parseCertPdfMarker(pdfText)).toEqual({ id, signature: sig });
  });

  it('returns null when no marker is present (modified / printed PDF)', () => {
    expect(parseCertPdfMarker('%PDF-1.3\nno glint metadata here\n%%EOF')).toBeNull();
  });

  it('extracts an id from a certificate link', () => {
    expect(certIdFromInput(`https://glint.example/c/${id}`)).toBe(id);
    expect(certIdFromInput(`https://glint.example/c/${id}?ref=x#top`)).toBe(id);
  });

  it('passes a bare id through, trimmed', () => {
    expect(certIdFromInput(`  ${id}  `)).toBe(id);
  });
});
