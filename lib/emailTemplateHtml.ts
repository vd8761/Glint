/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Workspace email template — shared between the browser designer and the
 * server-side mailer. This module is intentionally dependency-free (no env, no
 * db, no DOM) so both sides can import it.
 *
 * ── Why the layout is "compiled" ─────────────────────────────────────────────
 * The designer is a freeform canvas: blocks carry absolute x/y/width/height.
 * Email clients cannot render that — Gmail strips `position` entirely. So the
 * renderer sorts blocks top-to-bottom and emits a fixed-width column where each
 * block is placed with margins (margin-top = gap to the previous block,
 * margin-left = x). Margins and widths survive every major client, so what the
 * issuer sees in the preview is what the recipient receives.
 */

export const EMAIL_CANVAS_WIDTH = 600;

export type EmailBlockType = 'text' | 'image' | 'button' | 'divider' | 'certificateList';

export interface EmailBlock {
  id: string;
  type: EmailBlockType;
  x: number;
  y: number;
  width: number;
  height: number;

  /** text / button */
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  textDecoration?: 'none' | 'underline';
  lineHeight?: number;
  letterSpacing?: number;
  color?: string;
  align?: 'left' | 'center' | 'right';

  /** text / button / divider chrome */
  backgroundColor?: string;
  borderRadius?: number;

  /** image */
  imageUrl?: string;

  /** button — defaults to the {{link}} placeholder */
  href?: string;

  /** certificateList (digest) — everything about each list card is editable. */
  linkLabel?: string;      // link text on each card; default "View certificate →"
  showProgram?: boolean;   // include the program name line (default true)
  showDate?: boolean;      // include the issue date (default true)
  intro?: string;          // optional line shown above the list
}

export interface EmailTemplateDoc {
  version: 1;
  /** Subject line; supports the same {{placeholders}} as block text. */
  subject: string;
  canvas: {
    /** Card behind the blocks. */
    backgroundColor: string;
    /** Page behind the card. */
    bodyColor: string;
    height: number;
    borderRadius: number;
  };
  blocks: EmailBlock[];
}

/** Placeholders resolved at send time for the per-recipient issuance email. */
export const EMAIL_PLACEHOLDERS = [
  { token: '{{name}}', label: 'Recipient name' },
  { token: '{{email}}', label: 'Recipient email' },
  { token: '{{program}}', label: 'Program name' },
  { token: '{{id}}', label: 'Certificate ID' },
  { token: '{{link}}', label: 'Verification link' },
  { token: '{{date}}', label: 'Issue date' },
  { token: '{{brand}}', label: 'Workspace brand name' },
] as const;

/** Placeholders for the digest email (a list of links sent to one address). */
export const DIGEST_PLACEHOLDERS = [
  { token: '{{brand}}', label: 'Workspace brand name' },
  { token: '{{count}}', label: 'Number of certificates' },
  { token: '{{date}}', label: "Today's date" },
] as const;

/** One row in a digest email's certificate list. */
export interface DigestCertificate {
  name: string;
  program: string;
  id: string;
  link: string;
  date: string;
}

export interface EmailTemplateVars {
  name: string;
  email: string;
  program: string;
  id: string;
  link: string;
  date: string;
  brand: string;
  /** Digest only: how many certificates the list contains. */
  count?: string;
  /** Digest only: the certificates a `certificateList` block expands into. */
  certificates?: DigestCertificate[];
}

/** Font stacks that render consistently across mail clients. */
export const EMAIL_FONT_STACKS = [
  { label: 'Sans (Helvetica)', value: "'Helvetica Neue', Helvetica, Arial, sans-serif" },
  { label: 'System UI', value: "-apple-system, 'Segoe UI', Roboto, sans-serif" },
  { label: 'Georgia (serif)', value: "Georgia, 'Times New Roman', serif" },
  { label: 'Times (serif)', value: "'Times New Roman', Times, serif" },
  { label: 'Verdana', value: 'Verdana, Geneva, sans-serif' },
  { label: 'Trebuchet', value: "'Trebuchet MS', Helvetica, sans-serif" },
  { label: 'Courier (mono)', value: "'Courier New', Courier, monospace" },
] as const;

let idCounter = 0;
export function newBlockId(): string {
  idCounter += 1;
  return `blk-${Date.now().toString(36)}-${idCounter.toString(36)}`;
}

/**
 * The stock issuance email as a template document, so a workspace that has
 * never customised anything starts from the exact design the mailer used to
 * hardcode — and can then move every piece of it.
 */
export function defaultEmailTemplate(brandColor = '#0f172a'): EmailTemplateDoc {
  const sans = EMAIL_FONT_STACKS[0].value;
  return {
    version: 1,
    subject: 'Your certificate for {{program}} is ready',
    canvas: { backgroundColor: '#ffffff', bodyColor: '#f1f5f9', height: 560, borderRadius: 12 },
    blocks: [
      {
        id: 'blk-brand', type: 'text', x: 40, y: 36, width: 520, height: 32,
        text: '{{brand}}', fontSize: 20, fontFamily: sans, fontWeight: 'bold',
        color: '#0f172a', align: 'center',
      },
      { id: 'blk-rule', type: 'divider', x: 40, y: 84, width: 520, height: 1, backgroundColor: '#e2e8f0' },
      {
        id: 'blk-title', type: 'text', x: 40, y: 116, width: 520, height: 34,
        text: 'Congratulations, {{name}}!', fontSize: 22, fontFamily: sans, fontWeight: 'bold',
        color: '#0f172a', align: 'left',
      },
      {
        id: 'blk-body', type: 'text', x: 40, y: 162, width: 520, height: 48,
        text: 'Your certificate for {{program}} has been issued and registered.',
        fontSize: 14, fontFamily: sans, fontWeight: 'normal', lineHeight: 1.6,
        color: '#475569', align: 'left',
      },
      {
        id: 'blk-meta', type: 'text', x: 40, y: 226, width: 520, height: 76,
        text: 'Recipient: {{name}}\nProgram: {{program}}\nCertificate ID: {{id}}',
        fontSize: 13, fontFamily: sans, fontWeight: 'normal', lineHeight: 1.8,
        color: '#334155', align: 'left', backgroundColor: '#f8fafc', borderRadius: 8,
      },
      {
        id: 'blk-cta', type: 'button', x: 185, y: 334, width: 230, height: 46,
        text: 'View your certificate', href: '{{link}}',
        fontSize: 14, fontFamily: sans, fontWeight: 'bold',
        color: '#ffffff', backgroundColor: brandColor, borderRadius: 8, align: 'center',
      },
      {
        id: 'blk-hint', type: 'text', x: 40, y: 404, width: 520, height: 22,
        text: 'View, download, print, or add it to your LinkedIn profile.',
        fontSize: 12, fontFamily: sans, fontWeight: 'normal',
        color: '#64748b', align: 'center',
      },
      { id: 'blk-rule2', type: 'divider', x: 40, y: 452, width: 520, height: 1, backgroundColor: '#e2e8f0' },
      {
        id: 'blk-footer', type: 'text', x: 40, y: 476, width: 520, height: 24,
        text: 'This is an automated message from {{brand}}.',
        fontSize: 11, fontFamily: sans, fontWeight: 'normal',
        color: '#94a3b8', align: 'center',
      },
    ],
  };
}

// -----------------------------------------------------------------------------
// Rendering
// -----------------------------------------------------------------------------

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Only http(s) URLs or (for images) inline data URIs may reach an attribute. */
function safeUrl(url: string, allowData = false): string {
  const trimmed = url.trim();
  if (allowData && /^data:image\/(png|jpe?g|gif|webp);base64,/i.test(trimmed)) return trimmed;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') return escapeHtml(parsed.toString());
  } catch { /* fall through */ }
  return '';
}

/** Substitute placeholders in already-escaped text with escaped values. */
function substitute(escapedText: string, vars: EmailTemplateVars): string {
  return escapedText.replace(/\{\{\s*(name|email|program|id|link|date|brand|count)\s*\}\}/g, (_, key) =>
    escapeHtml(String(vars[key as keyof EmailTemplateVars] ?? '')),
  );
}

/** Subject line: plain-text substitution, no escaping (headers are not HTML). */
export function renderEmailSubject(subject: string, vars: EmailTemplateVars): string {
  return subject.replace(/\{\{\s*(name|email|program|id|link|date|brand|count)\s*\}\}/g, (_, key) =>
    String(vars[key as keyof EmailTemplateVars] ?? ''),
  );
}

const px = (n: number) => `${Math.round(n)}px`;

function sanitizeColor(value: string | undefined, fallback: string): string {
  if (value && /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(value.trim())) return value.trim();
  return fallback;
}

function sanitizeFont(value: string | undefined): string {
  const fallback = EMAIL_FONT_STACKS[0].value;
  if (!value) return fallback;
  // Font stacks are chosen from a fixed list, but a stored doc is data — strip
  // anything that could escape the style attribute.
  const cleaned = value.replace(/["<>;{}]/g, "'");
  return cleaned.trim() || fallback;
}

function textStyles(block: EmailBlock): string {
  const styles = [
    `font-family:${sanitizeFont(block.fontFamily)}`,
    `font-size:${px(block.fontSize ?? 14)}`,
    `font-weight:${block.fontWeight === 'bold' ? 700 : 400}`,
    `color:${sanitizeColor(block.color, '#0f172a')}`,
    `text-align:${block.align ?? 'left'}`,
    `line-height:${block.lineHeight ?? 1.4}`,
  ];
  if (block.fontStyle === 'italic') styles.push('font-style:italic');
  if (block.textDecoration === 'underline') styles.push('text-decoration:underline');
  if (block.letterSpacing) styles.push(`letter-spacing:${block.letterSpacing}px`);
  return styles.join(';');
}

function renderBlock(block: EmailBlock, vars: EmailTemplateVars): string {
  const radius = block.borderRadius ? `border-radius:${px(block.borderRadius)};` : '';

  switch (block.type) {
    case 'text': {
      const content = substitute(escapeHtml(block.text ?? ''), vars).replace(/\n/g, '<br>');
      const bg = block.backgroundColor && block.backgroundColor !== 'transparent'
        ? `background:${sanitizeColor(block.backgroundColor, 'transparent')};padding:10px 14px;`
        : '';
      return `<div style="${textStyles(block)};${bg}${radius}word-break:break-word">${content}</div>`;
    }
    case 'button': {
      const href = safeUrl(substituteRaw(block.href ?? '{{link}}', vars));
      const label = substitute(escapeHtml(block.text ?? 'Open'), vars);
      const bg = sanitizeColor(block.backgroundColor, '#0f172a');
      const style = [
        'display:block',
        `${textStyles(block)}`,
        `background:${bg}`,
        `${radius}`,
        `line-height:${px(block.height)}`,
        'text-align:center',
        'text-decoration:none',
      ].join(';');
      if (!href) return `<div style="${style}">${label}</div>`;
      return `<a href="${href}" target="_blank" style="${style}">${label}</a>`;
    }
    case 'image': {
      const src = safeUrl(block.imageUrl ?? '', true);
      if (!src) return '';
      return `<img src="${src}" alt="" width="${Math.round(block.width)}" style="display:block;width:${px(block.width)};height:${px(block.height)};object-fit:cover;${radius}">`;
    }
    case 'divider': {
      const color = sanitizeColor(block.backgroundColor, '#e2e8f0');
      return `<div style="height:${px(Math.max(1, block.height))};background:${color};${radius}"></div>`;
    }
    case 'certificateList': {
      // Digest only: expand `vars.certificates` into a stacked list of link
      // cards. Everything is editable: `color` styles the recipient name,
      // `backgroundColor` is the link accent, `linkLabel` is the link text, and
      // showProgram/showDate toggle the metadata line.
      const certs = vars.certificates ?? [];
      const font = sanitizeFont(block.fontFamily);
      const nameColor = sanitizeColor(block.color, '#0f172a');
      const accent = sanitizeColor(block.backgroundColor, '#2563eb');
      const linkLabel = substitute(escapeHtml(block.linkLabel ?? 'View certificate →'), vars);
      const showProgram = block.showProgram !== false;
      const showDate = block.showDate !== false;
      const introHtml = block.intro
        ? `<div style="font-family:${font};font-size:13px;color:#475569;margin-bottom:10px">${substitute(escapeHtml(block.intro), vars)}</div>`
        : '';
      if (certs.length === 0) {
        return `<div>${introHtml}<div style="font-family:${font};font-size:13px;color:#94a3b8">No certificates in this batch.</div></div>`;
      }
      const rows = certs
        .map((c) => {
          const name = escapeHtml(c.name || 'Recipient');
          const metaParts: string[] = [];
          if (showProgram && c.program) metaParts.push(c.program);
          if (showDate && c.date) metaParts.push(c.date);
          const meta = metaParts.length
            ? `<div style="font-family:${font};font-size:12px;color:#64748b;margin:2px 0 6px">${escapeHtml(metaParts.join(' · '))}</div>`
            : '<div style="height:4px"></div>';
          const href = safeUrl(c.link);
          const link = href
            ? `<a href="${href}" target="_blank" style="font-family:${font};font-size:13px;font-weight:600;color:${accent};text-decoration:none">${linkLabel}</a>`
            : '';
          return `<div style="border:1px solid #e2e8f0;${radius || 'border-radius:8px;'}padding:12px 14px;margin-bottom:8px">
        <div style="font-family:${font};font-size:14px;font-weight:600;color:${nameColor}">${name}</div>
        ${meta}
        ${link}
      </div>`;
        })
        .join('');
      return `<div>${introHtml}${rows}</div>`;
    }
  }
}

/** Placeholder substitution on a raw (non-HTML) string — used for hrefs. */
function substituteRaw(value: string, vars: EmailTemplateVars): string {
  return value.replace(/\{\{\s*(name|email|program|id|link|date|brand|count)\s*\}\}/g, (_, key) =>
    String(vars[key as keyof EmailTemplateVars] ?? ''),
  );
}

/**
 * Compile the canvas into a fixed-width email column.
 *
 * Blocks are sorted by y then x. Each block keeps its width and horizontal
 * offset (margin-left) and is pushed down by the gap to the previous block's
 * bottom edge (margin-top). Overlapping blocks stack — the designer's preview
 * shows exactly this, so there is no drift between design and delivery.
 */
export function renderEmailHtml(doc: EmailTemplateDoc, vars: EmailTemplateVars): string {
  const sorted = [...doc.blocks].sort((a, b) => (a.y - b.y) || (a.x - b.x));
  const cardBg = sanitizeColor(doc.canvas.backgroundColor, '#ffffff');
  const bodyBg = sanitizeColor(doc.canvas.bodyColor, '#f1f5f9');
  const cardRadius = doc.canvas.borderRadius ?? 12;

  let cursor = 0;
  const rows: string[] = [];
  for (const block of sorted) {
    const marginTop = Math.max(0, Math.round(block.y - cursor));
    const marginLeft = Math.max(0, Math.round(block.x));
    const width = Math.min(Math.round(block.width), EMAIL_CANVAS_WIDTH - marginLeft);
    const inner = renderBlock(block, vars);
    if (!inner) continue;
    rows.push(
      `<div style="margin:${px(marginTop)} 0 0 ${px(marginLeft)};width:${px(width)}">${inner}</div>`,
    );
    cursor = Math.max(cursor, block.y + block.height);
  }
  const bottomPad = Math.max(24, Math.round(doc.canvas.height - cursor));

  return `<!doctype html>
<html><body style="margin:0;background:${bodyBg};padding:24px 8px">
  <div style="max-width:${EMAIL_CANVAS_WIDTH}px;margin:0 auto;background:${cardBg};border-radius:${px(cardRadius)};border:1px solid #e2e8f0;overflow:hidden">
    ${rows.join('\n    ')}
    <div style="height:${px(bottomPad)};line-height:${px(bottomPad)};font-size:1px">&nbsp;</div>
  </div>
</body></html>`;
}

/** Sample values used by the designer preview. */
export function sampleEmailVars(brand: string): EmailTemplateVars {
  return {
    name: 'Alex Rivera',
    email: 'alex.rivera@example.com',
    program: 'Advanced Data Architecture',
    id: 'CERT-8F2K-D91A',
    link: 'https://example.com/c/CERT-8F2K-D91A',
    date: new Date().toISOString().slice(0, 10),
    brand,
  };
}

/**
 * Default digest template — the email sent to ONE address carrying a list of
 * certificate links. Uses the `certificateList` block, which the per-recipient
 * template never contains.
 */
export function defaultDigestTemplate(brandColor = '#0f172a'): EmailTemplateDoc {
  const sans = EMAIL_FONT_STACKS[0].value;
  return {
    version: 1,
    subject: '{{count}} certificates from {{brand}}',
    canvas: { backgroundColor: '#ffffff', bodyColor: '#f1f5f9', height: 520, borderRadius: 12 },
    blocks: [
      {
        id: 'dg-brand', type: 'text', x: 40, y: 36, width: 520, height: 32,
        text: '{{brand}}', fontSize: 20, fontFamily: sans, fontWeight: 'bold',
        color: '#0f172a', align: 'center',
      },
      { id: 'dg-rule', type: 'divider', x: 40, y: 84, width: 520, height: 1, backgroundColor: '#e2e8f0' },
      {
        id: 'dg-title', type: 'text', x: 40, y: 112, width: 520, height: 30,
        text: '{{count}} certificates are ready', fontSize: 20, fontFamily: sans, fontWeight: 'bold',
        color: '#0f172a', align: 'left',
      },
      {
        id: 'dg-intro', type: 'text', x: 40, y: 152, width: 520, height: 40,
        text: 'The certificates below were issued by {{brand}}. Open each link to view or download it.',
        fontSize: 14, fontFamily: sans, fontWeight: 'normal', lineHeight: 1.6, color: '#475569', align: 'left',
      },
      {
        id: 'dg-list', type: 'certificateList', x: 40, y: 208, width: 520, height: 200,
        fontFamily: sans, color: '#0f172a', backgroundColor: brandColor, borderRadius: 8,
        linkLabel: 'View certificate →', showProgram: true, showDate: true,
      },
      { id: 'dg-rule2', type: 'divider', x: 40, y: 440, width: 520, height: 1, backgroundColor: '#e2e8f0' },
      {
        id: 'dg-footer', type: 'text', x: 40, y: 462, width: 520, height: 24,
        text: 'This is an automated message from {{brand}}.',
        fontSize: 11, fontFamily: sans, fontWeight: 'normal', color: '#94a3b8', align: 'center',
      },
    ],
  };
}

/** Sample values used by the digest designer preview. */
export function sampleDigestVars(brand: string): EmailTemplateVars {
  const certificates: DigestCertificate[] = [
    { name: 'Alex Rivera', program: 'Advanced Data Architecture', id: 'CERT-8F2K-D91A', link: 'https://example.com/c/CERT-8F2K-D91A', date: '2026-07-10' },
    { name: 'Jordan Vance', program: 'Advanced Data Architecture', id: 'CERT-1Q7M-B44C', link: 'https://example.com/c/CERT-1Q7M-B44C', date: '2026-07-10' },
    { name: 'Keiko Tanaka', program: 'Cloud Security Foundations', id: 'CERT-5H2P-Z09X', link: 'https://example.com/c/CERT-5H2P-Z09X', date: '2026-07-10' },
  ];
  return {
    name: 'Program Office',
    email: 'office@example.com',
    program: '',
    id: '',
    link: '',
    date: new Date().toISOString().slice(0, 10),
    brand,
    count: String(certificates.length),
    certificates,
  };
}
