/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The standard certificate template.
 *
 * ── Why there is exactly one ─────────────────────────────────────────────────
 * This file previously shipped 73 presets named "Google Cloud Professional",
 * "AWS Solutions Architect", "McKinsey Strategy Fellowship", "Harvard Business
 * Leadership", and so on — complete with invented signatory names attributed to
 * real executives. They were demo filler, and issuing a certificate that
 * presents itself as a Google or Harvard credential is a trademark problem
 * regardless of intent.
 *
 * One neutral, well-composed template. Everything an organisation needs to make
 * it theirs — logo, colours, signatures, footer — comes from workspace branding
 * or the editor. Additional designs can be imported later: `backgroundImageUrl`
 * accepts a finished artwork and keeps the text overlays editable, and the AI
 * template generator produces new layouts from a prompt or a sample image.
 *
 * ── Placeholders ─────────────────────────────────────────────────────────────
 * `{{name}}`, `{{program}}`, `{{date}}`, `{{id}}` are resolved at render time.
 * Any additional column in the recipient CSV becomes `{{thatColumn}}`.
 */

import { CertificateTemplate, TextElement } from './types';

const mkText = (
  id: string,
  text: string,
  fontSize: number,
  fontFamily: string,
  fontWeight: 'normal' | 'medium' | 'bold',
  color: string,
  xPercent: number,
  yPercent: number,
  opts: Partial<TextElement> = {},
): TextElement => ({
  id,
  text,
  fontSize,
  fontFamily,
  fontWeight,
  color,
  xPercent,
  yPercent,
  align: 'center',
  ...opts,
});

const INK = '#0F172A';
const MUTED = '#64748B';
const ACCENT = '#1A73E8';

/**
 * Layout slots, top to bottom. The vertical rhythm leaves room for a sponsor
 * strip between the body copy and the signature line — drop images in as
 * `type: 'image'` elements around y=74 once the assets arrive.
 */
export const STANDARD_TEMPLATE: Omit<CertificateTemplate, 'id' | 'workspaceId'> = {
  name: 'Standard Certificate',
  layout: 'landscape',

  backgroundColor: '#FFFFFF',
  backgroundGradient: undefined,
  backgroundImageUrl: undefined,

  borderColor: INK,
  borderWidth: 3,
  borderRadius: 4,
  borderStyle: 'solid',
  decorFlourish: 'classic',

  showSeal: true,
  sealType: 'classic',
  sealWidth: 44,

  showQrCode: true,
  qrCodeX: 12,
  qrCodeY: 82,
  qrCodeWidth: 34,

  // Empty: the workspace logo is used unless a template-specific one is set.
  logoUrl: '',
  logoX: 50,
  logoY: 13,
  logoWidth: 90,

  signatureUrl: '',
  signatureX: 30,
  signatureY: 80,
  signatureWidth: 95,
  signatoryName: '',
  signatoryTitle: '',

  showSecondarySignatory: true,
  secondarySignatureUrl: '',
  secondarySignatoryName: '',
  secondarySignatoryTitle: '',
  secondarySignatureX: 70,
  secondarySignatureY: 80,
  secondarySignatureWidth: 95,

  textElements: [
    mkText('t-title', 'CERTIFICATE OF PARTICIPATION', 24, 'Cinzel', 'bold', INK, 50, 27, {
      letterSpacing: 3,
    }),
    mkText('t-presented', 'This is to certify that', 11, 'Inter', 'normal', MUTED, 50, 39),

    mkText('t-name', '{{name}}', 34, 'Playfair Display', 'bold', INK, 50, 48, {
      isPlaceholder: true,
    }),

    mkText('t-body', 'has successfully participated in', 11, 'Inter', 'normal', MUTED, 50, 57),
    mkText('t-program', '{{program}}', 18, 'Space Grotesk', 'bold', ACCENT, 50, 63, {
      isPlaceholder: true,
    }),

    mkText('t-date', 'Issued on {{date}}', 10, 'Inter', 'normal', MUTED, 50, 69, {
      isPlaceholder: true,
    }),

    mkText('t-verify', 'Verification ID: {{id}}', 8, 'JetBrains Mono', 'normal', MUTED, 50, 93, {
      isPlaceholder: true,
    }),
  ],
};

/**
 * Kept as an array so the editor's "choose a starting point" list, which maps
 * over this, needs no change when more designs are added.
 */
export const BEAUTIFUL_PRESETS: (CertificateTemplate & { category: string; programName: string })[] = [
  {
    ...STANDARD_TEMPLATE,
    id: 'standard',
    workspaceId: '',
    category: 'Standard',
    programName: 'Certificate of Participation',
  },
];
