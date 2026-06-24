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
}

export interface TextElement {
  id: string;
  text: string; // text with static or variable markers like {{name}}, {{program}}, {{id}}, {{date}}
  fontSize: number;
  fontFamily: 'Inter' | 'Space Grotesk' | 'Playfair Display' | 'JetBrains Mono';
  fontWeight: 'normal' | 'medium' | 'bold';
  color: string;
  xPercent: number; // Percent positioning from left (0 to 100)
  yPercent: number; // Percent positioning from top (0 to 100)
  align: 'left' | 'center' | 'right';
  isPlaceholder?: boolean;
  width?: number; // Optional box width for wrapping/resizing
  type?: 'text' | 'image';
  imageUrl?: string;
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
  showSecondarySignatory?: boolean;
  secondarySignatoryName?: string;
  secondarySignatoryTitle?: string;
  secondarySignatureX?: number;
  secondarySignatureY?: number;
  secondarySignatureWidth?: number;
  backgroundImageUrl?: string;
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
  id: string; // Trust payload verification UID
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
  securityHash: string; // Cryptographic hash simulating authenticity seal
  viewCount: number;
  downloadCount: number;
  shareCount: number;
  lastViewed?: string;
  auditTrail: AuditLogEntry[];
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

export interface EmailLog {
  id: string;
  workspaceId: string;
  recipientEmail: string;
  recipientName: string;
  subject: string;
  body: string;
  certificateId: string;
  sentTime: string;
}
