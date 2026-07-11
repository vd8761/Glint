/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Request validation. Every handler that reads `req.body` parses it through one
 * of these first. Previously the body was spread straight into SQL parameter
 * arrays and JSONB columns with no shape or size checks at all.
 */

import { z } from 'zod';
import { HttpError } from './http.js';

// -----------------------------------------------------------------------------
// Primitives
// -----------------------------------------------------------------------------

export const email = z
  .string()
  .trim()
  .toLowerCase()
  .max(254) // RFC 5321
  .pipe(z.email('Invalid email address'));

/**
 * NIST SP 800-63B: length is the dominant factor; composition rules push users
 * toward predictable substitutions. Twelve characters, no character-class
 * requirements, and a block list of the obvious.
 */
export const password = z
  .string()
  .min(12, 'Password must be at least 12 characters')
  .max(128, 'Password must be at most 128 characters')
  .refine((v) => !/^(password|passw0rd|12345678|qwerty|letmein|admin)/i.test(v), {
    message: 'Password is too predictable',
  });

const shortText = (max: number) => z.string().trim().min(1).max(max);
const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(''));

const hexColor = z
  .string()
  .regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Expected a hex colour like #1a73e8');

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');

/**
 * Data URIs and https URLs only. A bare `javascript:` or `data:text/html`
 * value here ends up in an `src`/`href` attribute on the public certificate
 * page.
 */
const safeUrl = z
  .string()
  .trim()
  .max(8_000_000) // certificate backgrounds/logos arrive as base64 data URIs
  .refine((v) => v === '' || /^https:\/\//i.test(v) || /^data:image\/(png|jpe?g|svg\+xml|webp|gif);base64,/i.test(v), {
    message: 'Must be an https URL or a base64 image data URI',
  })
  .optional();

// -----------------------------------------------------------------------------
// Auth
// -----------------------------------------------------------------------------

export const loginSchema = z.object({
  email,
  password: z.string().min(1).max(128), // never reveal policy on the login path
});

export const registerSchema = z.object({
  email,
  password,
  name: shortText(120),
  workspaceName: shortText(120),
});

/**
 * An admin (or super_admin) creating an issuer account. The password is held to
 * the same policy as self-registration. `workspaceId` is optional — an issuer
 * can be created unassigned and slotted into a workspace later.
 */
export const adminCreateUserSchema = z.object({
  email,
  password,
  name: shortText(120),
  workspaceId: shortText(64).optional().nullable(),
});

/** A super_admin setting a target account's password to a provided value. */
export const setPasswordSchema = z.object({
  password,
});

/**
 * A logged-in user setting their own recovery address. An empty string clears
 * it; any other value must be a valid email and is stored lowercased.
 */
export const recoveryEmailSchema = z.object({
  recoveryEmail: z.union([email, z.literal('')]),
});

/**
 * A logged-in user changing their own password. The current password is checked
 * against the stored hash before the change is applied; the new password is held
 * to the full registration policy. `currentPassword` is validated laxly (like
 * the login path) so this endpoint never reveals the policy for the old value.
 */
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: password,
});

/**
 * Start of the forgot-password flow. Uses a lax email (like the login path):
 * revealing the policy here would leak nothing useful and the response is
 * uniform regardless of validity.
 */
export const forgotPasswordSchema = z.object({
  email,
});

/**
 * Completing a reset. The token is the raw hex value from the emailed link; the
 * new password is held to the full registration policy.
 */
export const resetPasswordSchema = z.object({
  token: z.string().trim().min(16).max(256),
  password,
});

// -----------------------------------------------------------------------------
// Workspace
// -----------------------------------------------------------------------------

export const createWorkspaceSchema = z.object({
  name: shortText(120),
  brandName: optionalText(120),
  primaryColor: hexColor.optional(),
  accentColor: hexColor.optional(),
});

/**
 * The email designer's canvas document (see lib/emailTemplateHtml.ts). Every
 * numeric field is clamped and the block list is capped so a stored template
 * cannot be used to bloat the workspaces table or the rendered email.
 */
const emailBlockSchema = z.object({
  id: shortText(64),
  type: z.enum(['text', 'image', 'button', 'divider', 'certificateList']),
  x: z.number().min(-600).max(1200),
  y: z.number().min(-600).max(8000),
  width: z.number().min(1).max(600),
  height: z.number().min(1).max(4000),
  text: z.string().max(4000).optional(),
  fontSize: z.number().min(6).max(120).optional(),
  fontFamily: z.string().max(120).optional(),
  fontWeight: z.enum(['normal', 'bold']).optional(),
  fontStyle: z.enum(['normal', 'italic']).optional(),
  textDecoration: z.enum(['none', 'underline']).optional(),
  lineHeight: z.number().min(0.5).max(4).optional(),
  letterSpacing: z.number().min(-10).max(40).optional(),
  color: z.string().max(32).optional(),
  align: z.enum(['left', 'center', 'right']).optional(),
  backgroundColor: z.string().max(32).optional(),
  borderRadius: z.number().min(0).max(200).optional(),
  imageUrl: safeUrl,
  href: z.string().max(2000).optional(),
  linkLabel: z.string().max(200).optional(),
  showProgram: z.boolean().optional(),
  showDate: z.boolean().optional(),
  intro: z.string().max(2000).optional(),
});

export const emailTemplateSchema = z.object({
  version: z.literal(1),
  subject: shortText(300),
  canvas: z.object({
    backgroundColor: z.string().max(32),
    bodyColor: z.string().max(32),
    height: z.number().min(120).max(8000),
    borderRadius: z.number().min(0).max(64),
  }),
  blocks: z.array(emailBlockSchema).max(60),
});

export const updateWorkspaceSchema = z.object({
  name: shortText(120).optional(),
  plan: z.enum(['free', 'pro', 'enterprise']).optional(),
  branding: z
    .object({
      brandName: shortText(120).optional(),
      logoUrl: safeUrl,
      primaryColor: hexColor.optional(),
      accentColor: hexColor.optional(),
      senderName: optionalText(120),
      senderEmail: email.optional(),
      whiteLabel: z.boolean().optional(),
      footerText: optionalText(500),
      customDomain: optionalText(253),
    })
    .optional(),
  /** null clears the custom design and falls back to the built-in default. */
  emailTemplate: emailTemplateSchema.nullable().optional(),
  /** Digest email (list of links to one address). null clears it. */
  digestEmailTemplate: emailTemplateSchema.nullable().optional(),
});

// -----------------------------------------------------------------------------
// Template
// -----------------------------------------------------------------------------

const richTextRunSchema = z.object({
  text: z.string().max(2000),
  color: z.string().max(64).optional(),
  fontWeight: z.union([z.string().max(20), z.number()]).optional(),
  fontStyle: z.enum(['normal', 'italic']).optional(),
  textDecoration: z.enum(['none', 'underline']).optional(),
});

const textElementSchema = z.object({
  id: shortText(64),
  text: z.string().max(2000),
  fontSize: z.number().min(1).max(400),
  fontFamily: shortText(64),
  fontWeight: z.union([z.string().max(20), z.number()]),
  fontStyle: z.enum(['normal', 'italic']).optional(),
  textDecoration: z.enum(['none', 'underline']).optional(),
  richText: z.array(richTextRunSchema).max(200).optional(),
  letterSpacing: z.number().min(-50).max(200).optional(),
  lineHeight: z.number().min(0).max(10).optional(),
  opacity: z.number().min(0).max(1).optional(),
  textTransform: z.enum(['none', 'uppercase', 'lowercase', 'capitalize']).optional(),
  color: z.string().max(64),
  xPercent: z.number().min(-50).max(150),
  yPercent: z.number().min(-50).max(150),
  align: z.enum(['left', 'center', 'right', 'justify']),
  isPlaceholder: z.boolean().optional(),
  isNamePlaceholder: z.boolean().optional(),
  isProgramPlaceholder: z.boolean().optional(),
  width: z.number().min(0).max(4000).optional(),
  height: z.number().min(0).max(4000).optional(),
  type: z.enum(['text', 'image', 'redaction']).optional(),
  imageUrl: safeUrl,
  rotation: z.number().min(-360).max(360).optional(),
  flipH: z.boolean().optional(),
  flipV: z.boolean().optional(),
});

const customFontSchema = z.object({
  id: shortText(80),
  family: shortText(80),
  fileName: shortText(160),
  dataUrl: z
    .string()
    .max(7_000_000)
    .regex(
      /^data:(font\/ttf|application\/x-font-ttf|application\/octet-stream);base64,/i,
      'Expected a base64 .ttf font data URI',
    ),
  format: z.literal('truetype'),
});

/** Caps the JSONB blob so a single template cannot be used to bloat the table. */
export const templateBodySchema = z.object({
  workspaceId: shortText(64),
  name: shortText(150),
  layout: z.enum(['landscape', 'portrait']).optional(),
  backgroundColor: z.string().max(64).optional(),
  backgroundGradient: z.string().max(500).optional().nullable(),
  backgroundImageUrl: safeUrl,
  borderColor: z.string().max(64).optional(),
  borderWidth: z.number().int().min(0).max(64).optional(),
  borderRadius: z.number().int().min(0).max(128).optional(),
  borderStyle: z.enum(['solid', 'double', 'dashed', 'ornate', 'none']).optional(),
  decorFlourish: z.string().max(32).optional(),
  showSeal: z.boolean().optional(),
  sealType: z.string().max(32).optional(),
  sealWidth: z.number().min(0).max(400).optional(),
  showQrCode: z.boolean().optional(),
  qrCodeX: z.number().min(-50).max(150).optional(),
  qrCodeY: z.number().min(-50).max(150).optional(),
  qrCodeWidth: z.number().min(0).max(400).optional(),
  qrCodeCustomUrl: z.string().trim().max(500).optional().nullable(),
  logoUrl: safeUrl,
  logoIconType: z.string().max(64).optional().nullable(),
  logoX: z.number().min(-50).max(150).optional(),
  logoY: z.number().min(-50).max(150).optional(),
  logoWidth: z.number().min(0).max(1000).optional(),
  signatureUrl: safeUrl,
  signatureStyle: z.string().max(64).optional().nullable(),
  signatureX: z.number().min(-50).max(150).optional(),
  signatureY: z.number().min(-50).max(150).optional(),
  signatureWidth: z.number().min(0).max(1000).optional(),
  signatoryName: optionalText(120),
  signatoryTitle: optionalText(120),
  signatoryFontFamily: z.string().max(80).optional(),
  signatoryFontSize: z.number().min(1).max(200).optional(),
  showSecondarySignatory: z.boolean().optional(),
  secondarySignatureUrl: safeUrl,
  secondarySignatoryName: optionalText(120),
  secondarySignatoryTitle: optionalText(120),
  secondarySignatoryFontFamily: z.string().max(80).optional(),
  secondarySignatoryFontSize: z.number().min(1).max(200).optional(),
  secondarySignatureX: z.number().min(-50).max(150).optional().nullable(),
  secondarySignatureY: z.number().min(-50).max(150).optional().nullable(),
  secondarySignatureWidth: z.number().min(0).max(1000).optional().nullable(),
  textElements: z.array(textElementSchema).max(60).optional(),
  customFonts: z.array(customFontSchema).max(12).optional(),
  dateFormat: z.enum(['iso', 'long', 'medium', 'us', 'eu', 'dmy-long', 'dot']).optional(),
  showWatermarkTags: z.boolean().optional(),
  logoRotation: z.number().min(-360).max(360).optional(),
  logoFlipH: z.boolean().optional(),
  logoFlipV: z.boolean().optional(),
  signatureRotation: z.number().min(-360).max(360).optional(),
  signatureFlipH: z.boolean().optional(),
  signatureFlipV: z.boolean().optional(),
  secondarySignatureRotation: z.number().min(-360).max(360).optional(),
  secondarySignatureFlipH: z.boolean().optional(),
  secondarySignatureFlipV: z.boolean().optional(),
});

// -----------------------------------------------------------------------------
// Program
// -----------------------------------------------------------------------------

export const createProgramSchema = z.object({
  workspaceId: shortText(64),
  name: shortText(200),
  description: optionalText(1000),
  templateId: shortText(64).optional().nullable(),
  issueDate: isoDate.optional(),
  expiryDate: isoDate.optional().nullable(),
  status: z.enum(['draft', 'active', 'archived']).optional(),
  recipientFields: z.array(shortText(64)).max(30).optional(),
});

export const updateProgramSchema = createProgramSchema.partial().omit({ workspaceId: true });

// -----------------------------------------------------------------------------
// Issuance
// -----------------------------------------------------------------------------

/**
 * A single bulk import is capped at 1,000 recipients. The whole batch is written
 * in one transaction, and an unbounded array here is a trivial way to hold a
 * database connection open for minutes.
 */
export const issueSchema = z.object({
  recipients: z
    .array(
      z.object({
        name: shortText(200),
        email,
        customFields: z.record(z.string().max(64), z.string().max(500)).optional(),
      }),
    )
    .min(1, 'At least one recipient is required')
    .max(1000, 'A single batch may not exceed 1000 recipients'),
  /**
   * Whether to queue notification emails now. Defaults to true to preserve the
   * historic behaviour; the dashboard passes false for "issue now, send later".
   */
  sendEmail: z.boolean().optional(),
});

/**
 * Manual bulk send from the issued registry.
 *   individual — each certificate's recipient gets its own email.
 *   digest     — one email listing every selected certificate's link goes to a
 *                single manually-entered address.
 */
export const sendCertificateEmailsSchema = z
  .object({
    certificateIds: z.array(shortText(80)).min(1, 'Select at least one certificate').max(2000),
    mode: z.enum(['individual', 'digest']),
    digestEmail: email.optional(),
    digestName: optionalText(120),
  })
  .refine((v) => v.mode !== 'digest' || !!v.digestEmail, {
    message: 'A recipient email is required for a digest send',
    path: ['digestEmail'],
  });

export const certificateStatusSchema = z.object({
  status: z.enum(['valid', 'revoked']),
  reason: optionalText(500),
});

export const statsSchema = z.object({
  action: z.enum(['view', 'download', 'share']),
});

// -----------------------------------------------------------------------------
// AI
// -----------------------------------------------------------------------------

/** Bare base64 (no `data:` prefix) plus a mime type, as the editor sends it. */
const sampleImageSchema = z.object({
  data: z
    .string()
    .max(8_000_000, 'Sample image is too large')
    .regex(/^[A-Za-z0-9+/]+={0,2}$/, 'Expected raw base64'),
  mimeType: z.enum(['image/png', 'image/jpeg', 'image/jpg', 'image/webp']),
});

export const generateTemplateSchema = z.object({
  prompt: shortText(1000),
  sampleImage: sampleImageSchema.optional().nullable(),
});

export const parseSampleSchema = z.object({
  sampleImage: sampleImageSchema,
});

// -----------------------------------------------------------------------------
// Helper
// -----------------------------------------------------------------------------

/**
 * Parses `body` or throws a 400 carrying the first validation message. The
 * message describes the caller's own input, so it is safe to return.
 */
export function parseBody<T extends z.ZodType>(schema: T, body: unknown): z.infer<T> {
  const result = schema.safeParse(body);
  if (!result.success) {
    const issue = result.error.issues[0];
    const field = issue.path.join('.');
    throw new HttpError(400, field ? `${field}: ${issue.message}` : issue.message, 'VALIDATION');
  }
  return result.data;
}
