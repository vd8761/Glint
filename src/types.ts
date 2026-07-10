/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface OrganizationBranding {
  brandName: string;
  logoUrl?: string;
  primaryColor: string; // Hex color code
  accentColor: string;  // Hex color code
  customDomain?: string;
  senderName: string;
  senderEmail: string;
  whiteLabel: boolean;
  footerText?: string;
}

export interface OrganizationWorkspace {
  id: string;
  name: string;
  slug: string;
  createdTime: string;
  branding: OrganizationBranding;
  plan: 'free' | 'pro' | 'enterprise';
  /** Custom issuance-email design (lib/emailTemplateHtml.ts). Absent = default. */
  emailTemplate?: import('../lib/emailTemplateHtml').EmailTemplateDoc;
  /** Custom digest-email design (bulk list of links to one address). */
  digestEmailTemplate?: import('../lib/emailTemplateHtml').EmailTemplateDoc;
}

export type TextFontWeight = 'normal' | 'medium' | 'bold' | string;

export interface RichTextRun {
  text: string;
  color?: string;
  fontWeight?: TextFontWeight;
  fontStyle?: 'normal' | 'italic';
  textDecoration?: 'none' | 'underline';
}

export interface TextElement {
  id: string;
  text: string; // text with static or variable markers like {{name}}, {{program}}, {{id}}, {{date}}
  fontSize: number;
  fontFamily: string; // Dynamic Google Fonts support
  fontWeight: TextFontWeight;
  fontStyle?: 'normal' | 'italic';
  textDecoration?: 'none' | 'underline';
  richText?: RichTextRun[];
  letterSpacing?: number; // Letter spacing in pixels
  lineHeight?: number; // Line height multiplier
  opacity?: number; // Transparency multiplier (0 to 1);
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  color: string;
  xPercent: number; // Percent positioning from left (0 to 100)
  yPercent: number; // Percent positioning from top (0 to 100)
  align: 'left' | 'center' | 'right' | 'justify';
  isPlaceholder?: boolean;
  width?: number; // Optional box width for wrapping/resizing
  height?: number; // Optional height for shapes/redaction patches
  type?: 'text' | 'image' | 'redaction';
  imageUrl?: string;
  rotation?: number; // Clockwise rotation in degrees (default 0)
  flipH?: boolean;   // Mirror horizontally
  flipV?: boolean;   // Mirror vertically

}

export interface CustomFontAsset {
  id: string;
  family: string;
  fileName: string;
  dataUrl: string;
  format: 'truetype';
}

export interface CertificateTemplate {
  id: string;
  workspaceId: string;
  name: string;
  layout: 'landscape' | 'portrait';
  backgroundColor: string;
  borderColor: string;
  borderWidth: number; // in pixels
  showSeal: boolean;
  sealType: 'classic' | 'modern' | 'stellar' | 'none' | 'crimson_wax' | 'emerald_shield' | 'gold_medallion';
  showQrCode: boolean;
  qrCodeX: number; // percentage alignment
  qrCodeY: number;
  qrCodeWidth?: number;
  sealWidth?: number;
  logoUrl?: string; // override/specific template logo
  logoX: number;
  logoY: number;
  logoWidth: number;
  signatureUrl?: string;
  secondarySignatureUrl?: string;
  signatureX: number;
  signatureY: number;
  signatureWidth: number;
  signatoryName?: string;
  signatoryTitle?: string;
  textElements: TextElement[];
  
  // Extended Canva Editor design parameters (with backward compatibility)
  borderRadius?: number;
  borderStyle?: 'solid' | 'dashed' | 'double' | 'ornate' | 'none';
  backgroundGradient?: string;
  decorFlourish?: 'classic' | 'modern' | 'ornate' | 'minimal' | 'none';
  logoIconType?: string; // Predefined brand icons (Tech, Edu, Science, Art, Corporate)
  signatureStyle?: string; // Styled simulated script names
  
  signatoryFontFamily?: string;
  signatoryFontSize?: number;
  
  showSecondarySignatory?: boolean;
  secondarySignatoryName?: string;
  secondarySignatoryTitle?: string;
  secondarySignatureX?: number;
  secondarySignatureY?: number;
  secondarySignatureWidth?: number;
  secondarySignatoryFontFamily?: string;
  secondarySignatoryFontSize?: number;
  
  backgroundImageUrl?: string;
  qrCodeCustomUrl?: string;
  /** How the {{date}} placeholder is formatted (see lib/certificateDate.ts). */
  dateFormat?: 'iso' | 'long' | 'medium' | 'us' | 'eu' | 'dmy-long' | 'dot';
  customFonts?: CustomFontAsset[];
  /** Decorative corner watermark tags (e.g. "…AUTHORIZED DISPATCH"). Default on. */
  showWatermarkTags?: boolean;

  // Rotation (clockwise degrees) and mirror flags for the fixed assets.
  logoRotation?: number;
  logoFlipH?: boolean;
  logoFlipV?: boolean;
  signatureRotation?: number;
  signatureFlipH?: boolean;
  signatureFlipV?: boolean;
  secondarySignatureRotation?: number;
  secondarySignatureFlipH?: boolean;
  secondarySignatureFlipV?: boolean;
}

export type ProgramStatus = 'draft' | 'active' | 'archived';

export interface CertificateProgram {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  templateId: string;
  issueDate: string;
  expiryDate?: string;
  status: ProgramStatus;
  createdTime: string;
  recipientFields: string[]; // custom fields list, e.g. ["Grade", "Project Name", "Role"]
}

export interface Recipient {
  id: string;
  email: string;
  name: string;
  customFields: Record<string, string>; // e.g. {"Grade": "A+", "Role": "Lead Architect"}
  isValid: boolean;
  errors?: string[];
  status: 'pending' | 'issued' | 'failed';
  issuedCertificateId?: string;
}

export type CertificateStatus = 'valid' | 'revoked' | 'expired';

export interface AuditLogEntry {
  timestamp: string;
  event: string; // e.g. "CREATED", "ISSUED", "VERIFIED", "REVOKED", "METADATA_UPDATED"
  performedBy: string; // e.g. "Workspace Admin", "System (Automatic)"
  details: string;
}

export interface Certificate {
  id: string;
  workspaceId: string;
  programId: string;
  programName: string;
  recipientName: string;
  recipientEmail: string;
  customFields: Record<string, string>;
  issueDate: string;
  expiryDate?: string;
  status: CertificateStatus;
  revocationReason?: string;

  /**
   * Lowercase hex HMAC-SHA256 over the issuance facts, keyed by a server-side
   * secret. Replaces the old `securityHash`, which was `Math.random()` with the
   * string "sha256:" glued to the front and was never checked by anything.
   *
   * It commits to id, workspace, program, recipient, and dates — not to
   * `status`. Revoking does not break the signature; a verifier checks both.
   */
  signature: string;
  signatureAlg: string;
  signatureVersion: number;

  viewCount: number;
  downloadCount: number;
  shareCount: number;
  verifyCount: number;
  lastViewed?: string;
}

/** What `GET /api/certificates/:id` returns to an anonymous visitor. */
export interface PublicCertificate {
  id: string;
  programName: string;
  recipientName: string;
  /** `j******e@example.com`. The full address is never exposed publicly. */
  recipientEmailMasked: string;
  customFields: Record<string, string>;
  issueDate: string;
  expiryDate?: string;
  status: CertificateStatus;
  revocationReason?: string;
  signature: string;
  signatureAlg: string;
  signatureVersion: number;
  viewCount: number;
  downloadCount: number;
  shareCount: number;
  verifyCount: number;
}

export type VerificationFailure = 'signature_invalid' | 'revoked' | 'expired';

export interface VerificationResult {
  /** True only when the signature is intact AND the credential is neither revoked nor expired. */
  verified: boolean;
  signatureValid: boolean;
  status: CertificateStatus;
  reasons: VerificationFailure[];
  algorithm: string;
  certificate: PublicCertificate;
  verifiedAt: string;
}

export interface WorkspaceAnalytics {
  issuedCount: number;
  viewCount: number;
  downloadCount: number;
  shareCount: number;
  activePrograms: number;
  verificationCount: number;
  issuanceTrend: { date: string; count: number }[];
  verificationTrend: { date: string; count: number }[];
  shareTrend: { date: string; count: number }[];
  trafficSources: { source: string; count: number }[];
}

export type EmailStatus = 'pending' | 'sending' | 'sent' | 'failed' | 'simulated';

/** Post-send outcome reported by the mail provider's webhook (Resend). */
export type EmailDeliveryStatus =
  | 'scheduled' | 'sent' | 'delivery_delayed' | 'delivered'
  | 'opened' | 'clicked' | 'bounced' | 'complained' | 'failed' | 'suppressed';

export interface EmailLog {
  id: string;
  workspaceId: string;
  recipientEmail: string;
  recipientName: string;
  subject: string;
  body: string;
  certificateId: string;
  status: EmailStatus;
  attempts: number;
  lastError?: string;
  deliveryStatus?: EmailDeliveryStatus;
  deliveryDetail?: string;
  deliveryUpdatedAt?: string;
  sentTime: string;
}
