/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from 'vitest';
import { extractInlineImages } from './inlineImages';

// 1x1 transparent PNG.
const PNG_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
const dataUri = `data:image/png;base64,${PNG_B64}`;

describe('extractInlineImages', () => {
  it('replaces a data-URI image with a cid reference and one attachment', () => {
    const { html, attachments } = extractInlineImages(`<img src="${dataUri}" width="100">`);
    expect(attachments).toHaveLength(1);
    expect(attachments[0].contentType).toBe('image/png');
    expect(attachments[0].contentDisposition).toBe('inline');
    expect(attachments[0].content).toBeInstanceOf(Buffer);
    expect(attachments[0].content.length).toBeGreaterThan(0);
    // The html now points at the attachment, not the data URI.
    expect(html).toContain(`src="cid:${attachments[0].cid}"`);
    expect(html).not.toContain('data:image');
  });

  it('attaches an identical image only once (dedupes by content)', () => {
    const { html, attachments } = extractInlineImages(
      `<img src="${dataUri}"><img src="${dataUri}">`,
    );
    expect(attachments).toHaveLength(1);
    // Both <img> now reference the same cid.
    const cid = attachments[0].cid;
    expect(html.match(new RegExp(`cid:${cid.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g'))).toHaveLength(2);
  });

  it('normalises jpg to jpeg content type and extension', () => {
    const { attachments } = extractInlineImages(`<img src="data:image/jpg;base64,${PNG_B64}">`);
    expect(attachments[0].contentType).toBe('image/jpeg');
    expect(attachments[0].filename.endsWith('.jpg')).toBe(true);
  });

  it('leaves https image sources untouched', () => {
    const html = '<img src="https://cdn.example.com/logo.png">';
    const result = extractInlineImages(html);
    expect(result.html).toBe(html);
    expect(result.attachments).toHaveLength(0);
  });

  it('returns html unchanged when there are no inline images', () => {
    const html = '<p>Hello</p>';
    expect(extractInlineImages(html)).toEqual({ html, attachments: [] });
  });
});
