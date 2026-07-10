/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Email clients — Gmail most notably — refuse to render `data:` image URIs, so
 * a base64 image a designer embedded shows up as a broken box. This turns each
 * inline data-URI image in a rendered email into a real MIME attachment
 * referenced by `cid:`, which every major client displays. Identical images are
 * attached once.
 *
 * Kept dependency-free so it is trivially unit-testable.
 */

import { randomUUID } from 'crypto';

export interface InlineImageAttachment {
  filename: string;
  content: Buffer;
  cid: string;
  contentType: string;
  contentDisposition: 'inline';
}

export function extractInlineImages(html: string): { html: string; attachments: InlineImageAttachment[] } {
  const attachments: InlineImageAttachment[] = [];
  const byData = new Map<string, string>(); // dedupe identical images -> cid

  const out = html.replace(
    /src="data:image\/(png|jpe?g|gif|webp);base64,([^"]+)"/gi,
    (match: string, ext: string, b64: string) => {
      const key = `${ext}:${b64}`;
      let cid = byData.get(key);
      if (!cid) {
        let content: Buffer;
        try {
          content = Buffer.from(b64, 'base64');
        } catch {
          return match; // leave the data URI in place if it will not decode
        }
        if (content.length === 0) return match;

        const norm = ext.toLowerCase() === 'jpg' ? 'jpeg' : ext.toLowerCase();
        cid = `${randomUUID()}@glint`;
        attachments.push({
          filename: `image-${attachments.length + 1}.${norm === 'jpeg' ? 'jpg' : norm}`,
          content,
          cid,
          contentType: `image/${norm}`,
          contentDisposition: 'inline',
        });
        byData.set(key, cid);
      }
      return `src="cid:${cid}"`;
    },
  );

  return { html: out, attachments };
}
