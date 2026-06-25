import { CertificateTemplate, TextElement } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Helper to build a fully-specified CertificateTemplate from a compact definition
// ─────────────────────────────────────────────────────────────────────────────

interface PresetDef {
  id: string;
  name: string;
  programName: string;
  category: 'Technology & MNC' | 'Business & Consulting' | 'Academic & University' | 'Creative & Design' | 'Health & Wellness' | 'Professional Certifications';
  // Visual system
  backgroundColor: string;
  backgroundGradient: string;
  borderColor: string;
  borderWidth: number;
  borderRadius?: number;
  borderStyle?: 'solid' | 'double' | 'dashed' | 'ornate' | 'none';
  decorFlourish?: 'classic' | 'modern' | 'ornate' | 'minimal' | 'none';
  // Seal & QR
  sealType: 'classic' | 'modern' | 'stellar' | 'none' | 'crimson_wax' | 'emerald_shield' | 'gold_medallion';
  sealWidth?: number;
  showQrCode?: boolean;
  qrCodeX?: number;
  qrCodeY?: number;
  qrCodeWidth?: number;
  // Logo
  logoIconType?: string;
  logoX?: number;
  logoY?: number;
  logoWidth?: number;
  // Signatories
  signatory1: string;
  title1: string;
  signX1?: number;
  signY1?: number;
  signWidth1?: number;
  signatory2?: string;
  title2?: string;
  signX2?: number;
  signY2?: number;
  signWidth2?: number;
  // Text elements
  texts: TextElement[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared text element builders
// ─────────────────────────────────────────────────────────────────────────────
const mkText = (
  id: string, text: string, fontSize: number, fontFamily: string,
  fontWeight: 'normal' | 'bold' | 'medium',
  color: string, x: number, y: number,
  align: 'left' | 'center' | 'right' = 'center',
  opts: Partial<TextElement> = {}
): TextElement => ({
  id, text, fontSize, fontFamily, fontWeight, color, xPercent: x, yPercent: y, align,
  ...opts
});

// ─────────────────────────────────────────────────────────────────────────────
// PRESET DEFINITIONS — 53 unique professional designs
// ─────────────────────────────────────────────────────────────────────────────
const PRESET_DEFINITIONS: PresetDef[] = [

  // ════════════════════════════════════════
  // TECHNOLOGY & MNC (15)
  // ════════════════════════════════════════
  {
    id: 'p-01', name: 'Google Cloud Professional', programName: 'Google Cloud Certified Professional Cloud Architect',
    category: 'Technology & MNC',
    backgroundColor: '#FFFFFF', backgroundGradient: 'linear-gradient(145deg, #FFFFFF 0%, #F0F7FF 60%, #E8F2FF 100%)',
    borderColor: '#4285F4', borderWidth: 6, borderRadius: 6, borderStyle: 'solid', decorFlourish: 'minimal',
    sealType: 'gold_medallion', sealWidth: 42, showQrCode: true, qrCodeX: 50, qrCodeY: 87, qrCodeWidth: 30,
    logoIconType: 'tech', logoX: 50, logoY: 12, logoWidth: 72,
    signatory1: 'Sundar Pichai', title1: 'CEO, Google LLC', signX1: 25, signY1: 78, signWidth1: 90,
    signatory2: 'Thomas Kurian', title2: 'CEO, Google Cloud', signX2: 75, signY2: 78, signWidth2: 90,
    texts: [
      mkText('t1', 'GOOGLE CLOUD', 11, 'Space Grotesk', 'bold', '#4285F4', 50, 22, 'center', { letterSpacing: 4 }),
      mkText('t2', 'Certificate of Professional Achievement', 9, 'Inter', 'normal', '#5F6368', 50, 28, 'center', { letterSpacing: 1 }),
      mkText('t3', 'This is to certify that', 9, 'Inter', 'normal', '#80868B', 50, 35, 'center'),
      mkText('t4', '{{name}}', 34, 'Playfair Display', 'bold', '#1A1A2E', 50, 45, 'center', { isPlaceholder: true }),
      mkText('t5', 'has successfully completed all requirements and is hereby recognized as a', 8.5, 'Inter', 'normal', '#5F6368', 50, 54, 'center'),
      mkText('t6', '{{program}}', 16, 'Space Grotesk', 'bold', '#1A73E8', 50, 61, 'center', { isPlaceholder: true }),
      mkText('t7', 'Issued: {{date}}', 7.5, 'JetBrains Mono', 'normal', '#9AA0A6', 14, 88, 'left'),
      mkText('t8', 'Credential ID: {{id}}', 7.5, 'JetBrains Mono', 'normal', '#9AA0A6', 86, 88, 'right'),
    ]
  },

  {
    id: 'p-02', name: 'Microsoft Azure Expert', programName: 'Microsoft Certified Solutions Expert (MCSE)',
    category: 'Technology & MNC',
    backgroundColor: '#F3F9FF', backgroundGradient: 'linear-gradient(160deg, #F3F9FF 0%, #FFFFFF 50%, #EBF5FF 100%)',
    borderColor: '#0078D4', borderWidth: 5, borderStyle: 'solid', decorFlourish: 'minimal',
    sealType: 'stellar', sealWidth: 40, showQrCode: true, qrCodeX: 88, qrCodeY: 85, qrCodeWidth: 28,
    logoIconType: 'tech', logoX: 50, logoY: 11, logoWidth: 68,
    signatory1: 'Satya Nadella', title1: 'Chairman & CEO, Microsoft', signX1: 30, signY1: 77, signWidth1: 95,
    texts: [
      mkText('t1', 'MICROSOFT CORPORATION', 10.5, 'Space Grotesk', 'bold', '#0078D4', 50, 21, 'center', { letterSpacing: 3 }),
      mkText('t2', '─── Certificate of Expertise ───', 9, 'Inter', 'normal', '#00A4EF', 50, 27, 'center'),
      mkText('t3', 'This document certifies that', 9, 'Inter', 'normal', '#616161', 50, 34, 'center'),
      mkText('t4', '{{name}}', 36, 'Montserrat', 'bold', '#0F172A', 50, 44, 'center', { isPlaceholder: true }),
      mkText('t5', 'has demonstrated technical excellence and mastery in', 8.5, 'Inter', 'normal', '#757575', 50, 53, 'center'),
      mkText('t6', '{{program}}', 16, 'Space Grotesk', 'bold', '#0078D4', 50, 60, 'center', { isPlaceholder: true }),
      mkText('t7', 'Certificate No: {{id}}', 7.5, 'JetBrains Mono', 'normal', '#BDBDBD', 12, 88, 'left'),
      mkText('t8', 'Valid From: {{date}}', 7.5, 'JetBrains Mono', 'normal', '#BDBDBD', 88, 88, 'right'),
    ]
  },

  {
    id: 'p-03', name: 'AWS Solutions Architect', programName: 'AWS Certified Solutions Architect – Professional',
    category: 'Technology & MNC',
    backgroundColor: '#0F1923', backgroundGradient: 'linear-gradient(155deg, #0F1923 0%, #1A2C3D 50%, #0D1B2A 100%)',
    borderColor: '#FF9900', borderWidth: 3, borderStyle: 'solid', decorFlourish: 'minimal',
    sealType: 'gold_medallion', sealWidth: 44, showQrCode: true, qrCodeX: 50, qrCodeY: 87, qrCodeWidth: 28,
    logoIconType: 'tech', logoX: 50, logoY: 12, logoWidth: 74,
    signatory1: 'Andy Jassy', title1: 'CEO, Amazon Web Services', signX1: 28, signY1: 77, signWidth1: 92,
    texts: [
      mkText('t1', 'AMAZON WEB SERVICES', 11, 'Montserrat', 'bold', '#FF9900', 50, 21, 'center', { letterSpacing: 3 }),
      mkText('t2', 'Official Certification of Achievement', 9, 'Inter', 'normal', '#8B9BAA', 50, 27, 'center'),
      mkText('t3', 'This certifies that', 8.5, 'Inter', 'normal', '#6B7C8D', 50, 34, 'center'),
      mkText('t4', '{{name}}', 34, 'Montserrat', 'bold', '#FFFFFF', 50, 44, 'center', { isPlaceholder: true }),
      mkText('t5', 'has achieved professional-level certification in cloud architecture for', 8.5, 'Inter', 'normal', '#8B9BAA', 50, 53, 'center'),
      mkText('t6', '{{program}}', 16, 'Space Grotesk', 'bold', '#FF9900', 50, 61, 'center', { isPlaceholder: true }),
      mkText('t7', 'Issue Date: {{date}}', 7.5, 'JetBrains Mono', 'normal', '#4A5568', 12, 88, 'left'),
      mkText('t8', 'Cert ID: {{id}}', 7.5, 'JetBrains Mono', 'normal', '#4A5568', 88, 88, 'right'),
    ]
  },

  {
    id: 'p-04', name: 'Apple Certified Developer', programName: 'Apple Certified iOS Application Developer',
    category: 'Technology & MNC',
    backgroundColor: '#FFFFFF', backgroundGradient: 'linear-gradient(180deg, #FFFFFF 0%, #F5F5F7 100%)',
    borderColor: '#E5E5EA', borderWidth: 1, borderStyle: 'solid', borderRadius: 16, decorFlourish: 'none',
    sealType: 'none', showQrCode: true, qrCodeX: 88, qrCodeY: 85, qrCodeWidth: 26,
    logoIconType: 'tech', logoX: 50, logoY: 11, logoWidth: 64,
    signatory1: 'Tim Cook', title1: 'CEO, Apple Inc.', signX1: 30, signY1: 78, signWidth1: 88,
    texts: [
      mkText('t1', 'Apple', 20, 'Inter', 'normal', '#1D1D1F', 50, 22, 'center'),
      mkText('t2', 'Developer Certification', 12, 'Inter', 'normal', '#86868B', 50, 29, 'center'),
      mkText('t3', '—', 12, 'Inter', 'normal', '#D1D1D6', 50, 34, 'center'),
      mkText('t4', '{{name}}', 32, 'Inter', 'bold', '#1D1D1F', 50, 44, 'center', { isPlaceholder: true }),
      mkText('t5', 'has completed the certification program for', 9, 'Inter', 'normal', '#6E6E73', 50, 53, 'center'),
      mkText('t6', '{{program}}', 14, 'Inter', 'bold', '#0071E3', 50, 60, 'center', { isPlaceholder: true }),
      mkText('t7', '{{date}}', 8, 'Inter', 'normal', '#AEAEB2', 20, 88, 'left'),
      mkText('t8', '{{id}}', 8, 'Inter', 'normal', '#AEAEB2', 80, 88, 'right'),
    ]
  },

  {
    id: 'p-05', name: 'IBM AI Solutions Expert', programName: 'IBM AI & Cognitive Solutions Specialist',
    category: 'Technology & MNC',
    backgroundColor: '#001141', backgroundGradient: 'radial-gradient(ellipse at 30% 20%, #0F2560 0%, #001141 60%, #00082A 100%)',
    borderColor: '#0F62FE', borderWidth: 4, borderStyle: 'solid', decorFlourish: 'none',
    sealType: 'classic', sealWidth: 40, showQrCode: true, qrCodeX: 50, qrCodeY: 87, qrCodeWidth: 28,
    logoIconType: 'tech', logoX: 50, logoY: 12, logoWidth: 70,
    signatory1: 'Arvind Krishna', title1: 'Chairman & CEO, IBM', signX1: 27, signY1: 77, signWidth1: 90,
    signatory2: 'Dr. John Kelly III', title2: 'SVP, Cognitive Solutions', signX2: 73, signY2: 77, signWidth2: 90,
    texts: [
      mkText('t1', 'IBM', 22, 'Montserrat', 'bold', '#0F62FE', 50, 21, 'center', { letterSpacing: 6 }),
      mkText('t2', 'CERTIFICATE OF ACHIEVEMENT', 9.5, 'Montserrat', 'bold', '#4589FF', 50, 27, 'center', { letterSpacing: 2 }),
      mkText('t3', 'This is to certify that', 8.5, 'Inter', 'normal', '#8BA4C8', 50, 34, 'center'),
      mkText('t4', '{{name}}', 33, 'Montserrat', 'bold', '#FFFFFF', 50, 44, 'center', { isPlaceholder: true }),
      mkText('t5', 'has demonstrated expertise and proficiency in', 8.5, 'Inter', 'normal', '#8BA4C8', 50, 53, 'center'),
      mkText('t6', '{{program}}', 15, 'Montserrat', 'bold', '#4589FF', 50, 61, 'center', { isPlaceholder: true }),
      mkText('t7', 'Issued: {{date}}', 7.5, 'JetBrains Mono', 'normal', '#4A607A', 12, 88, 'left'),
      mkText('t8', 'Reference: {{id}}', 7.5, 'JetBrains Mono', 'normal', '#4A607A', 88, 88, 'right'),
    ]
  },

  {
    id: 'p-06', name: 'Salesforce Technical Architect', programName: 'Salesforce Certified Technical Architect (CTA)',
    category: 'Technology & MNC',
    backgroundColor: '#FFFFFF', backgroundGradient: 'linear-gradient(135deg, #FFFFFF 0%, #F0FAFF 100%)',
    borderColor: '#00A1E0', borderWidth: 5, borderStyle: 'solid', decorFlourish: 'none',
    sealType: 'modern', sealWidth: 38, showQrCode: true, qrCodeX: 88, qrCodeY: 86, qrCodeWidth: 26,
    logoIconType: 'tech', logoX: 50, logoY: 11, logoWidth: 68,
    signatory1: 'Marc Benioff', title1: 'Chair & CEO, Salesforce', signX1: 28, signY1: 77, signWidth1: 90,
    texts: [
      mkText('t1', 'SALESFORCE', 14, 'Space Grotesk', 'bold', '#00A1E0', 50, 21, 'center', { letterSpacing: 2 }),
      mkText('t2', 'Certificate of Technical Architecture', 9.5, 'Inter', 'normal', '#5B5FC7', 50, 27, 'center'),
      mkText('t3', 'This is to formally certify that', 9, 'Inter', 'normal', '#888', 50, 34, 'center'),
      mkText('t4', '{{name}}', 34, 'Poppins', 'bold', '#032D60', 50, 44, 'center', { isPlaceholder: true }),
      mkText('t5', 'has achieved the highest level of technical expertise for', 8.5, 'Inter', 'normal', '#777', 50, 53, 'center'),
      mkText('t6', '{{program}}', 16, 'Space Grotesk', 'bold', '#00A1E0', 50, 61, 'center', { isPlaceholder: true }),
      mkText('t7', 'Date: {{date}}', 7.5, 'JetBrains Mono', 'normal', '#B0B0B0', 12, 88, 'left'),
      mkText('t8', 'ID: {{id}}', 7.5, 'JetBrains Mono', 'normal', '#B0B0B0', 88, 88, 'right'),
    ]
  },

  {
    id: 'p-07', name: 'Netflix Engineering Excellence', programName: 'Netflix Advanced Microservices Infrastructure Certification',
    category: 'Technology & MNC',
    backgroundColor: '#141414', backgroundGradient: 'linear-gradient(180deg, #141414 0%, #1A0000 100%)',
    borderColor: '#E50914', borderWidth: 3, borderStyle: 'solid', decorFlourish: 'minimal',
    sealType: 'modern', sealWidth: 40, showQrCode: true, qrCodeX: 50, qrCodeY: 87, qrCodeWidth: 28,
    logoIconType: 'tech', logoX: 50, logoY: 12, logoWidth: 76,
    signatory1: 'Ted Sarandos', title1: 'Co-CEO, Netflix Inc.', signX1: 28, signY1: 78, signWidth1: 90,
    texts: [
      mkText('t1', 'NETFLIX', 18, 'Montserrat', 'bold', '#E50914', 50, 21, 'center', { letterSpacing: 5 }),
      mkText('t2', 'Engineering Certification', 10, 'Inter', 'normal', '#888', 50, 27, 'center'),
      mkText('t3', 'This document certifies that', 8.5, 'Inter', 'normal', '#666', 50, 34, 'center'),
      mkText('t4', '{{name}}', 34, 'Montserrat', 'bold', '#FFFFFF', 50, 44, 'center', { isPlaceholder: true }),
      mkText('t5', 'has successfully completed and passed certification for', 8.5, 'Inter', 'normal', '#888', 50, 53, 'center'),
      mkText('t6', '{{program}}', 15, 'Montserrat', 'bold', '#E50914', 50, 61, 'center', { isPlaceholder: true }),
      mkText('t7', 'Issued: {{date}}', 7.5, 'JetBrains Mono', 'normal', '#444', 12, 88, 'left'),
      mkText('t8', 'Cert: {{id}}', 7.5, 'JetBrains Mono', 'normal', '#444', 88, 88, 'right'),
    ]
  },

  {
    id: 'p-08', name: 'Meta Platforms Engineering', programName: 'Meta Certified Systems Engineering Specialist',
    category: 'Technology & MNC',
    backgroundColor: '#F0F2F5', backgroundGradient: 'linear-gradient(135deg, #F0F2F5 0%, #E7EBF0 100%)',
    borderColor: '#0064E0', borderWidth: 5, borderStyle: 'solid', borderRadius: 8, decorFlourish: 'none',
    sealType: 'stellar', sealWidth: 40, showQrCode: true, qrCodeX: 88, qrCodeY: 86, qrCodeWidth: 26,
    logoIconType: 'tech', logoX: 50, logoY: 11, logoWidth: 68,
    signatory1: 'Mark Zuckerberg', title1: 'Founder & CEO, Meta Platforms', signX1: 28, signY1: 78, signWidth1: 92,
    texts: [
      mkText('t1', 'Meta', 20, 'Inter', 'bold', '#0064E0', 50, 21, 'center'),
      mkText('t2', 'Certificate of Engineering Excellence', 9.5, 'Inter', 'normal', '#65676B', 50, 27, 'center'),
      mkText('t3', 'This certifies that', 8.5, 'Inter', 'normal', '#8A8D91', 50, 34, 'center'),
      mkText('t4', '{{name}}', 34, 'Inter', 'bold', '#1C1E21', 50, 44, 'center', { isPlaceholder: true }),
      mkText('t5', 'has successfully completed the program for', 8.5, 'Inter', 'normal', '#65676B', 50, 53, 'center'),
      mkText('t6', '{{program}}', 16, 'Inter', 'bold', '#0064E0', 50, 61, 'center', { isPlaceholder: true }),
      mkText('t7', 'Date: {{date}}', 7.5, 'JetBrains Mono', 'normal', '#B0B3B8', 12, 88, 'left'),
      mkText('t8', 'ID: {{id}}', 7.5, 'JetBrains Mono', 'normal', '#B0B3B8', 88, 88, 'right'),
    ]
  },

  {
    id: 'p-09', name: 'Oracle Java Enterprise Architect', programName: 'Oracle Certified Enterprise Architect Java EE',
    category: 'Technology & MNC',
    backgroundColor: '#FFFFFF', backgroundGradient: 'linear-gradient(160deg, #FFF8F8 0%, #FFFFFF 100%)',
    borderColor: '#C74634', borderWidth: 6, borderStyle: 'double', decorFlourish: 'classic',
    sealType: 'classic', sealWidth: 42, showQrCode: true, qrCodeX: 50, qrCodeY: 87, qrCodeWidth: 28,
    logoIconType: 'tech', logoX: 50, logoY: 12, logoWidth: 70,
    signatory1: 'Safra Catz', title1: 'CEO, Oracle Corporation', signX1: 28, signY1: 77, signWidth1: 90,
    texts: [
      mkText('t1', 'ORACLE CORPORATION', 11, 'Inter', 'bold', '#C74634', 50, 21, 'center', { letterSpacing: 3 }),
      mkText('t2', 'Certificate of Architecture Excellence', 9.5, 'Inter', 'normal', '#888', 50, 27, 'center'),
      mkText('t3', 'This is to certify that', 9, 'Inter', 'normal', '#777', 50, 34, 'center'),
      mkText('t4', '{{name}}', 33, 'Poppins', 'bold', '#1A1A1A', 50, 44, 'center', { isPlaceholder: true }),
      mkText('t5', 'has achieved expert-level certification in', 8.5, 'Inter', 'normal', '#888', 50, 53, 'center'),
      mkText('t6', '{{program}}', 16, 'Inter', 'bold', '#C74634', 50, 61, 'center', { isPlaceholder: true }),
      mkText('t7', 'Issue Date: {{date}}', 7.5, 'JetBrains Mono', 'normal', '#CCC', 12, 88, 'left'),
      mkText('t8', 'Cert ID: {{id}}', 7.5, 'JetBrains Mono', 'normal', '#CCC', 88, 88, 'right'),
    ]
  },

  {
    id: 'p-10', name: 'Cisco Network Professional', programName: 'Cisco Certified Network Professional (CCNP)',
    category: 'Technology & MNC',
    backgroundColor: '#FFFFFF', backgroundGradient: 'linear-gradient(135deg, #F5FAFF 0%, #FFFFFF 100%)',
    borderColor: '#049FD9', borderWidth: 5, borderStyle: 'solid', decorFlourish: 'none',
    sealType: 'classic', sealWidth: 40, showQrCode: true, qrCodeX: 88, qrCodeY: 86, qrCodeWidth: 26,
    logoIconType: 'tech', logoX: 50, logoY: 11, logoWidth: 70,
    signatory1: 'Chuck Robbins', title1: 'CEO, Cisco Systems', signX1: 28, signY1: 78, signWidth1: 88,
    texts: [
      mkText('t1', 'CISCO SYSTEMS', 12, 'Space Grotesk', 'bold', '#049FD9', 50, 21, 'center', { letterSpacing: 3 }),
      mkText('t2', 'Network Certification of Achievement', 9.5, 'Inter', 'normal', '#666', 50, 27, 'center'),
      mkText('t3', 'This is to certify that', 9, 'Inter', 'normal', '#888', 50, 34, 'center'),
      mkText('t4', '{{name}}', 33, 'Poppins', 'bold', '#0D2C54', 50, 44, 'center', { isPlaceholder: true }),
      mkText('t5', 'has successfully passed and achieved certification for', 8.5, 'Inter', 'normal', '#888', 50, 53, 'center'),
      mkText('t6', '{{program}}', 16, 'Space Grotesk', 'bold', '#049FD9', 50, 61, 'center', { isPlaceholder: true }),
      mkText('t7', 'Date: {{date}}', 7.5, 'JetBrains Mono', 'normal', '#CCC', 12, 88, 'left'),
      mkText('t8', 'Reference: {{id}}', 7.5, 'JetBrains Mono', 'normal', '#CCC', 88, 88, 'right'),
    ]
  },

  {
    id: 'p-11', name: 'Vercel Frontend Specialist', programName: 'Vercel Certified Edge Computing & NextJS Engineer',
    category: 'Technology & MNC',
    backgroundColor: '#000000', backgroundGradient: 'linear-gradient(180deg, #000000 0%, #111111 100%)',
    borderColor: '#FFFFFF', borderWidth: 1, borderStyle: 'solid', borderRadius: 12, decorFlourish: 'none',
    sealType: 'stellar', sealWidth: 36, showQrCode: true, qrCodeX: 88, qrCodeY: 86, qrCodeWidth: 24,
    logoIconType: 'tech', logoX: 50, logoY: 11, logoWidth: 62,
    signatory1: 'Guillermo Rauch', title1: 'CEO, Vercel Inc.', signX1: 28, signY1: 78, signWidth1: 88,
    texts: [
      mkText('t1', '▲ VERCEL', 15, 'Inter', 'bold', '#FFFFFF', 50, 21, 'center', { letterSpacing: 4 }),
      mkText('t2', 'Developer Certification', 9.5, 'Inter', 'normal', '#888', 50, 27, 'center'),
      mkText('t3', 'This certifies that', 8.5, 'Inter', 'normal', '#666', 50, 34, 'center'),
      mkText('t4', '{{name}}', 32, 'Inter', 'bold', '#FFFFFF', 50, 44, 'center', { isPlaceholder: true }),
      mkText('t5', 'has completed all requirements for', 8.5, 'Inter', 'normal', '#888', 50, 53, 'center'),
      mkText('t6', '{{program}}', 15, 'Inter', 'bold', '#FFFFFF', 50, 61, 'center', { isPlaceholder: true }),
      mkText('t7', '{{date}}', 7.5, 'JetBrains Mono', 'normal', '#444', 12, 88, 'left'),
      mkText('t8', '{{id}}', 7.5, 'JetBrains Mono', 'normal', '#444', 88, 88, 'right'),
    ]
  },

  {
    id: 'p-12', name: 'Slack Admin & Architect', programName: 'Slack Certified Administrator & Architect',
    category: 'Technology & MNC',
    backgroundColor: '#FAF0FF', backgroundGradient: 'linear-gradient(145deg, #FAF0FF 0%, #F5E6FF 100%)',
    borderColor: '#4A154B', borderWidth: 5, borderStyle: 'solid', decorFlourish: 'none',
    sealType: 'modern', sealWidth: 38, showQrCode: true, qrCodeX: 88, qrCodeY: 86, qrCodeWidth: 26,
    logoIconType: 'tech', logoX: 50, logoY: 11, logoWidth: 66,
    signatory1: 'Lidiane Jones', title1: 'CEO, Slack Technologies', signX1: 28, signY1: 78, signWidth1: 88,
    texts: [
      mkText('t1', 'SLACK', 16, 'Space Grotesk', 'bold', '#4A154B', 50, 21, 'center', { letterSpacing: 4 }),
      mkText('t2', 'Certified Platform Expert', 9.5, 'Inter', 'normal', '#611F69', 50, 27, 'center'),
      mkText('t3', 'This certificate is awarded to', 8.5, 'Inter', 'normal', '#888', 50, 34, 'center'),
      mkText('t4', '{{name}}', 33, 'Poppins', 'bold', '#1A1A2E', 50, 44, 'center', { isPlaceholder: true }),
      mkText('t5', 'in recognition of expertise achieved in', 8.5, 'Inter', 'normal', '#888', 50, 53, 'center'),
      mkText('t6', '{{program}}', 16, 'Space Grotesk', 'bold', '#4A154B', 50, 61, 'center', { isPlaceholder: true }),
      mkText('t7', 'Issued: {{date}}', 7.5, 'JetBrains Mono', 'normal', '#CCC', 12, 88, 'left'),
      mkText('t8', 'ID: {{id}}', 7.5, 'JetBrains Mono', 'normal', '#CCC', 88, 88, 'right'),
    ]
  },

  {
    id: 'p-13', name: 'Shopify Liquid Developer', programName: 'Shopify Certified Liquid Developer',
    category: 'Technology & MNC',
    backgroundColor: '#F6FFF8', backgroundGradient: 'linear-gradient(145deg, #F6FFF8 0%, #EBF9EF 100%)',
    borderColor: '#008060', borderWidth: 5, borderStyle: 'solid', borderRadius: 8, decorFlourish: 'none',
    sealType: 'modern', sealWidth: 38, showQrCode: true, qrCodeX: 88, qrCodeY: 86, qrCodeWidth: 26,
    logoIconType: 'tech', logoX: 50, logoY: 11, logoWidth: 66,
    signatory1: 'Tobias Lütke', title1: 'CEO, Shopify Inc.', signX1: 28, signY1: 78, signWidth1: 88,
    texts: [
      mkText('t1', 'SHOPIFY', 15, 'Space Grotesk', 'bold', '#008060', 50, 21, 'center', { letterSpacing: 3 }),
      mkText('t2', 'Partner Certification Program', 9.5, 'Inter', 'normal', '#2C6E49', 50, 27, 'center'),
      mkText('t3', 'This certifies that', 8.5, 'Inter', 'normal', '#888', 50, 34, 'center'),
      mkText('t4', '{{name}}', 33, 'Poppins', 'bold', '#1A1A2E', 50, 44, 'center', { isPlaceholder: true }),
      mkText('t5', 'has completed and passed all requirements for', 8.5, 'Inter', 'normal', '#888', 50, 53, 'center'),
      mkText('t6', '{{program}}', 16, 'Space Grotesk', 'bold', '#008060', 50, 61, 'center', { isPlaceholder: true }),
      mkText('t7', 'Date: {{date}}', 7.5, 'JetBrains Mono', 'normal', '#CCC', 12, 88, 'left'),
      mkText('t8', 'ID: {{id}}', 7.5, 'JetBrains Mono', 'normal', '#CCC', 88, 88, 'right'),
    ]
  },

  {
    id: 'p-14', name: 'AWS DevOps Professional', programName: 'AWS Certified DevOps Engineer – Professional',
    category: 'Technology & MNC',
    backgroundColor: '#FFFDF7', backgroundGradient: 'linear-gradient(145deg, #FFFDF7 0%, #FFF8E8 100%)',
    borderColor: '#FF9900', borderWidth: 5, borderStyle: 'solid', decorFlourish: 'minimal',
    sealType: 'gold_medallion', sealWidth: 42, showQrCode: true, qrCodeX: 50, qrCodeY: 87, qrCodeWidth: 28,
    logoIconType: 'tech', logoX: 50, logoY: 12, logoWidth: 72,
    signatory1: 'Adam Selipsky', title1: 'CEO, Amazon Web Services', signX1: 27, signY1: 77, signWidth1: 90,
    texts: [
      mkText('t1', 'AMAZON WEB SERVICES', 11, 'Space Grotesk', 'bold', '#232F3E', 50, 21, 'center', { letterSpacing: 2 }),
      mkText('t2', 'DevOps Professional Certification', 9.5, 'Inter', 'normal', '#FF9900', 50, 27, 'center'),
      mkText('t3', 'This is to certify that', 9, 'Inter', 'normal', '#888', 50, 34, 'center'),
      mkText('t4', '{{name}}', 33, 'Space Grotesk', 'bold', '#232F3E', 50, 44, 'center', { isPlaceholder: true }),
      mkText('t5', 'has demonstrated DevOps engineering excellence in', 8.5, 'Inter', 'normal', '#888', 50, 53, 'center'),
      mkText('t6', '{{program}}', 16, 'Space Grotesk', 'bold', '#FF9900', 50, 61, 'center', { isPlaceholder: true }),
      mkText('t7', 'Issue Date: {{date}}', 7.5, 'JetBrains Mono', 'normal', '#CCC', 12, 88, 'left'),
      mkText('t8', 'Cert ID: {{id}}', 7.5, 'JetBrains Mono', 'normal', '#CCC', 88, 88, 'right'),
    ]
  },

  {
    id: 'p-15', name: 'Zoom Enterprise Administrator', programName: 'Zoom Certified Enterprise Administrator',
    category: 'Technology & MNC',
    backgroundColor: '#F0F7FF', backgroundGradient: 'linear-gradient(145deg, #F0F7FF 0%, #E4F0FF 100%)',
    borderColor: '#2D8CFF', borderWidth: 5, borderStyle: 'solid', borderRadius: 6, decorFlourish: 'minimal',
    sealType: 'modern', sealWidth: 38, showQrCode: true, qrCodeX: 88, qrCodeY: 86, qrCodeWidth: 26,
    logoIconType: 'tech', logoX: 50, logoY: 11, logoWidth: 66,
    signatory1: 'Eric Yuan', title1: 'CEO, Zoom Video Communications', signX1: 28, signY1: 78, signWidth1: 88,
    texts: [
      mkText('t1', 'ZOOM', 20, 'Inter', 'bold', '#2D8CFF', 50, 21, 'center', { letterSpacing: 4 }),
      mkText('t2', 'Enterprise Certification', 9.5, 'Inter', 'normal', '#0B5ED7', 50, 27, 'center'),
      mkText('t3', 'This is to certify that', 8.5, 'Inter', 'normal', '#888', 50, 34, 'center'),
      mkText('t4', '{{name}}', 33, 'Inter', 'bold', '#0B3C5D', 50, 44, 'center', { isPlaceholder: true }),
      mkText('t5', 'has completed all requirements for', 8.5, 'Inter', 'normal', '#888', 50, 53, 'center'),
      mkText('t6', '{{program}}', 16, 'Inter', 'bold', '#2D8CFF', 50, 61, 'center', { isPlaceholder: true }),
      mkText('t7', '{{date}}', 7.5, 'JetBrains Mono', 'normal', '#B0C8E8', 12, 88, 'left'),
      mkText('t8', '{{id}}', 7.5, 'JetBrains Mono', 'normal', '#B0C8E8', 88, 88, 'right'),
    ]
  },

  // ════════════════════════════════════════
  // BUSINESS & CONSULTING (10)
  // ════════════════════════════════════════
  {
    id: 'p-16', name: 'McKinsey Strategy Fellowship', programName: 'McKinsey Global Strategic Leadership Fellow',
    category: 'Business & Consulting',
    backgroundColor: '#0A0A0A', backgroundGradient: 'radial-gradient(ellipse at center, #1A1400 0%, #0A0A0A 100%)',
    borderColor: '#C5A452', borderWidth: 4, borderStyle: 'solid', decorFlourish: 'classic',
    sealType: 'gold_medallion', sealWidth: 44, showQrCode: true, qrCodeX: 50, qrCodeY: 87, qrCodeWidth: 28,
    logoIconType: 'corporate', logoX: 50, logoY: 12, logoWidth: 74,
    signatory1: 'Bob Sternfels', title1: 'Global Managing Partner, McKinsey & Co.', signX1: 28, signY1: 78, signWidth1: 92,
    texts: [
      mkText('t1', 'McKINSEY & COMPANY', 11, 'Playfair Display', 'bold', '#C5A452', 50, 21, 'center', { letterSpacing: 2 }),
      mkText('t2', '— Global Leadership Fellowship —', 9, 'Inter', 'normal', '#8B7355', 50, 27, 'center'),
      mkText('t3', 'This is to certify that', 8.5, 'Inter', 'normal', '#6B6B6B', 50, 34, 'center'),
      mkText('t4', '{{name}}', 33, 'Playfair Display', 'bold', '#FFFFFF', 50, 44, 'center', { isPlaceholder: true }),
      mkText('t5', 'has been awarded the distinguished fellowship for', 8.5, 'Inter', 'normal', '#6B6B6B', 50, 53, 'center'),
      mkText('t6', '{{program}}', 15, 'Playfair Display', 'bold', '#C5A452', 50, 61, 'center', { isPlaceholder: true }),
      mkText('t7', 'Issued: {{date}}', 7.5, 'JetBrains Mono', 'normal', '#444', 12, 88, 'left'),
      mkText('t8', 'Ref: {{id}}', 7.5, 'JetBrains Mono', 'normal', '#444', 88, 88, 'right'),
    ]
  },

  {
    id: 'p-17', name: 'Goldman Sachs Investment Fellow', programName: 'Goldman Sachs Senior Investment Banking Specialist',
    category: 'Business & Consulting',
    backgroundColor: '#F8F6F0', backgroundGradient: 'linear-gradient(160deg, #F8F6F0 0%, #F0EBE0 100%)',
    borderColor: '#9B8C6E', borderWidth: 8, borderStyle: 'double', decorFlourish: 'classic',
    sealType: 'gold_medallion', sealWidth: 46, showQrCode: true, qrCodeX: 50, qrCodeY: 87, qrCodeWidth: 28,
    logoIconType: 'corporate', logoX: 50, logoY: 12, logoWidth: 74,
    signatory1: 'David Solomon', title1: 'Chairman & CEO, Goldman Sachs', signX1: 27, signY1: 77, signWidth1: 90,
    texts: [
      mkText('t1', 'GOLDMAN SACHS', 12, 'Playfair Display', 'bold', '#1A1A1A', 50, 21, 'center', { letterSpacing: 2 }),
      mkText('t2', 'Investment Excellence Certification', 9.5, 'Lora', 'normal', '#6B5E44', 50, 27, 'center'),
      mkText('t3', 'This is to solemnly certify that', 9, 'Lora', 'normal', '#888', 50, 34, 'center'),
      mkText('t4', '{{name}}', 34, 'Playfair Display', 'bold', '#1A1A1A', 50, 44, 'center', { isPlaceholder: true }),
      mkText('t5', 'has achieved distinguished recognition in financial excellence for', 8.5, 'Lora', 'normal', '#888', 50, 53, 'center'),
      mkText('t6', '{{program}}', 16, 'Playfair Display', 'bold', '#6B5E44', 50, 61, 'center', { isPlaceholder: true }),
      mkText('t7', 'Dated: {{date}}', 7.5, 'JetBrains Mono', 'normal', '#C0B090', 12, 88, 'left'),
      mkText('t8', 'Reference: {{id}}', 7.5, 'JetBrains Mono', 'normal', '#C0B090', 88, 88, 'right'),
    ]
  },

  {
    id: 'p-18', name: 'Deloitte Digital Consultant', programName: 'Deloitte Digital Transformation Senior Consultant',
    category: 'Business & Consulting',
    backgroundColor: '#FFFFFF', backgroundGradient: 'linear-gradient(135deg, #FFFFFF 0%, #F5F9F0 100%)',
    borderColor: '#86BC25', borderWidth: 5, borderStyle: 'solid', decorFlourish: 'none',
    sealType: 'modern', sealWidth: 38, showQrCode: true, qrCodeX: 88, qrCodeY: 86, qrCodeWidth: 26,
    logoIconType: 'corporate', logoX: 50, logoY: 11, logoWidth: 68,
    signatory1: 'Joe Ucuzoglu', title1: 'Global CEO, Deloitte', signX1: 28, signY1: 78, signWidth1: 88,
    texts: [
      mkText('t1', 'DELOITTE', 16, 'Inter', 'bold', '#000000', 50, 21, 'center', { letterSpacing: 3 }),
      mkText('t2', 'Digital Transformation Certificate', 9.5, 'Inter', 'normal', '#86BC25', 50, 27, 'center'),
      mkText('t3', 'This is to certify that', 8.5, 'Inter', 'normal', '#888', 50, 34, 'center'),
      mkText('t4', '{{name}}', 33, 'Poppins', 'bold', '#1A1A1A', 50, 44, 'center', { isPlaceholder: true }),
      mkText('t5', 'has successfully completed the program in', 8.5, 'Inter', 'normal', '#888', 50, 53, 'center'),
      mkText('t6', '{{program}}', 16, 'Inter', 'bold', '#86BC25', 50, 61, 'center', { isPlaceholder: true }),
      mkText('t7', 'Date: {{date}}', 7.5, 'JetBrains Mono', 'normal', '#CCC', 12, 88, 'left'),
      mkText('t8', 'ID: {{id}}', 7.5, 'JetBrains Mono', 'normal', '#CCC', 88, 88, 'right'),
    ]
  },

  {
    id: 'p-19', name: 'KPMG Financial Audit Specialist', programName: 'KPMG International Financial Audit & Assurance Expert',
    category: 'Business & Consulting',
    backgroundColor: '#FFFFFF', backgroundGradient: 'linear-gradient(145deg, #F0F4FF 0%, #FFFFFF 100%)',
    borderColor: '#00338D', borderWidth: 6, borderStyle: 'solid', decorFlourish: 'classic',
    sealType: 'classic', sealWidth: 42, showQrCode: true, qrCodeX: 50, qrCodeY: 87, qrCodeWidth: 28,
    logoIconType: 'corporate', logoX: 50, logoY: 12, logoWidth: 70,
    signatory1: 'Bill Thomas', title1: 'Global Chairman, KPMG', signX1: 27, signY1: 77, signWidth1: 88,
    texts: [
      mkText('t1', 'KPMG', 18, 'Inter', 'bold', '#00338D', 50, 21, 'center', { letterSpacing: 4 }),
      mkText('t2', 'Financial Audit Certification', 9.5, 'Inter', 'normal', '#0050C8', 50, 27, 'center'),
      mkText('t3', 'This is to certify that', 8.5, 'Inter', 'normal', '#888', 50, 34, 'center'),
      mkText('t4', '{{name}}', 33, 'Poppins', 'bold', '#00338D', 50, 44, 'center', { isPlaceholder: true }),
      mkText('t5', 'has demonstrated exceptional expertise in', 8.5, 'Inter', 'normal', '#888', 50, 53, 'center'),
      mkText('t6', '{{program}}', 16, 'Inter', 'bold', '#00338D', 50, 61, 'center', { isPlaceholder: true }),
      mkText('t7', 'Date: {{date}}', 7.5, 'JetBrains Mono', 'normal', '#CCC', 12, 88, 'left'),
      mkText('t8', 'Reference: {{id}}', 7.5, 'JetBrains Mono', 'normal', '#CCC', 88, 88, 'right'),
    ]
  },

  {
    id: 'p-20', name: 'Accenture Strategy Consultant', programName: 'Accenture Strategy Leadership & Industry 4.0',
    category: 'Business & Consulting',
    backgroundColor: '#FFFFFF', backgroundGradient: 'linear-gradient(145deg, #FAF5FF 0%, #FFFFFF 100%)',
    borderColor: '#A100FF', borderWidth: 5, borderStyle: 'solid', borderRadius: 4, decorFlourish: 'none',
    sealType: 'stellar', sealWidth: 40, showQrCode: true, qrCodeX: 88, qrCodeY: 86, qrCodeWidth: 26,
    logoIconType: 'corporate', logoX: 50, logoY: 11, logoWidth: 68,
    signatory1: 'Julie Sweet', title1: 'CEO, Accenture', signX1: 28, signY1: 78, signWidth1: 88,
    texts: [
      mkText('t1', 'ACCENTURE', 15, 'Inter', 'bold', '#A100FF', 50, 21, 'center', { letterSpacing: 3 }),
      mkText('t2', 'Strategy & Consulting Certificate', 9.5, 'Inter', 'normal', '#7400BA', 50, 27, 'center'),
      mkText('t3', 'This is to certify that', 8.5, 'Inter', 'normal', '#888', 50, 34, 'center'),
      mkText('t4', '{{name}}', 33, 'Poppins', 'bold', '#1D1D1D', 50, 44, 'center', { isPlaceholder: true }),
      mkText('t5', 'has demonstrated strategic leadership competency in', 8.5, 'Inter', 'normal', '#888', 50, 53, 'center'),
      mkText('t6', '{{program}}', 16, 'Inter', 'bold', '#A100FF', 50, 61, 'center', { isPlaceholder: true }),
      mkText('t7', 'Issued: {{date}}', 7.5, 'JetBrains Mono', 'normal', '#CCC', 12, 88, 'left'),
      mkText('t8', 'Cert ID: {{id}}', 7.5, 'JetBrains Mono', 'normal', '#CCC', 88, 88, 'right'),
    ]
  },

  {
    id: 'p-21', name: 'BCG Strategic Growth Specialist', programName: 'BCG Strategy Academy Senior Analyst Program',
    category: 'Business & Consulting',
    backgroundColor: '#F5FFFC', backgroundGradient: 'linear-gradient(145deg, #F5FFFC 0%, #E8F9F2 100%)',
    borderColor: '#00875A', borderWidth: 5, borderStyle: 'solid', decorFlourish: 'none',
    sealType: 'emerald_shield', sealWidth: 42, showQrCode: true, qrCodeX: 50, qrCodeY: 87, qrCodeWidth: 28,
    logoIconType: 'corporate', logoX: 50, logoY: 11, logoWidth: 68,
    signatory1: 'Christoph Schweizer', title1: 'CEO, Boston Consulting Group', signX1: 28, signY1: 77, signWidth1: 88,
    texts: [
      mkText('t1', 'BOSTON CONSULTING GROUP', 10, 'Inter', 'bold', '#00875A', 50, 21, 'center', { letterSpacing: 2 }),
      mkText('t2', 'Strategy Academy Certification', 9.5, 'Inter', 'normal', '#005C3C', 50, 27, 'center'),
      mkText('t3', 'This is to certify that', 8.5, 'Inter', 'normal', '#888', 50, 34, 'center'),
      mkText('t4', '{{name}}', 33, 'Poppins', 'bold', '#002C1B', 50, 44, 'center', { isPlaceholder: true }),
      mkText('t5', 'has successfully completed the strategic program in', 8.5, 'Inter', 'normal', '#888', 50, 53, 'center'),
      mkText('t6', '{{program}}', 16, 'Inter', 'bold', '#00875A', 50, 61, 'center', { isPlaceholder: true }),
      mkText('t7', 'Date: {{date}}', 7.5, 'JetBrains Mono', 'normal', '#B0D5C5', 12, 88, 'left'),
      mkText('t8', 'Ref: {{id}}', 7.5, 'JetBrains Mono', 'normal', '#B0D5C5', 88, 88, 'right'),
    ]
  },

  {
    id: 'p-22', name: 'JP Morgan Corporate Finance', programName: 'JPMorgan Chase Corporate Treasury & Asset Manager',
    category: 'Business & Consulting',
    backgroundColor: '#F8F8F4', backgroundGradient: 'linear-gradient(160deg, #F8F8F4 0%, #F0EEE8 100%)',
    borderColor: '#1F2937', borderWidth: 8, borderStyle: 'double', decorFlourish: 'classic',
    sealType: 'classic', sealWidth: 44, showQrCode: true, qrCodeX: 50, qrCodeY: 87, qrCodeWidth: 28,
    logoIconType: 'corporate', logoX: 50, logoY: 12, logoWidth: 72,
    signatory1: 'Jamie Dimon', title1: 'CEO, JPMorgan Chase', signX1: 27, signY1: 77, signWidth1: 88,
    texts: [
      mkText('t1', 'JPMORGAN CHASE & CO.', 11, 'Playfair Display', 'bold', '#1F2937', 50, 21, 'center', { letterSpacing: 1 }),
      mkText('t2', 'Corporate Finance Certification', 9.5, 'Lora', 'normal', '#B5A642', 50, 27, 'center'),
      mkText('t3', 'This is to certify that', 9, 'Lora', 'normal', '#888', 50, 34, 'center'),
      mkText('t4', '{{name}}', 33, 'Playfair Display', 'bold', '#1F2937', 50, 44, 'center', { isPlaceholder: true }),
      mkText('t5', 'has demonstrated exemplary financial expertise in', 8.5, 'Lora', 'normal', '#888', 50, 53, 'center'),
      mkText('t6', '{{program}}', 16, 'Playfair Display', 'bold', '#1F2937', 50, 61, 'center', { isPlaceholder: true }),
      mkText('t7', 'Dated: {{date}}', 7.5, 'JetBrains Mono', 'normal', '#C0B070', 12, 88, 'left'),
      mkText('t8', 'Reference: {{id}}', 7.5, 'JetBrains Mono', 'normal', '#C0B070', 88, 88, 'right'),
    ]
  },

  {
    id: 'p-23', name: 'PwC Risk Assurance Expert', programName: 'PwC Risk Assurance & Cybersecurity Audit Master',
    category: 'Business & Consulting',
    backgroundColor: '#FFFFFF', backgroundGradient: 'linear-gradient(145deg, #FFFBF8 0%, #FFF5EE 100%)',
    borderColor: '#D85604', borderWidth: 5, borderStyle: 'solid', decorFlourish: 'none',
    sealType: 'classic', sealWidth: 40, showQrCode: true, qrCodeX: 88, qrCodeY: 86, qrCodeWidth: 26,
    logoIconType: 'corporate', logoX: 50, logoY: 11, logoWidth: 68,
    signatory1: 'Bob Moritz', title1: 'Global Chairman, PwC Network', signX1: 28, signY1: 78, signWidth1: 88,
    texts: [
      mkText('t1', 'PRICEWATERHOUSECOOPERS', 9.5, 'Inter', 'bold', '#D85604', 50, 21, 'center', { letterSpacing: 1 }),
      mkText('t2', 'Risk & Assurance Certification', 9.5, 'Inter', 'normal', '#EB8C00', 50, 27, 'center'),
      mkText('t3', 'This is to certify that', 8.5, 'Inter', 'normal', '#888', 50, 34, 'center'),
      mkText('t4', '{{name}}', 33, 'Poppins', 'bold', '#1A1A1A', 50, 44, 'center', { isPlaceholder: true }),
      mkText('t5', 'has demonstrated expert-level proficiency in', 8.5, 'Inter', 'normal', '#888', 50, 53, 'center'),
      mkText('t6', '{{program}}', 16, 'Inter', 'bold', '#D85604', 50, 61, 'center', { isPlaceholder: true }),
      mkText('t7', 'Date: {{date}}', 7.5, 'JetBrains Mono', 'normal', '#CCC', 12, 88, 'left'),
      mkText('t8', 'ID: {{id}}', 7.5, 'JetBrains Mono', 'normal', '#CCC', 88, 88, 'right'),
    ]
  },

  {
    id: 'p-24', name: 'Bain Management Consultant', programName: 'Bain Management Consultant & Strategy Specialization',
    category: 'Business & Consulting',
    backgroundColor: '#FFFFFF', backgroundGradient: 'linear-gradient(145deg, #FFF5F5 0%, #FFFFFF 100%)',
    borderColor: '#CC0000', borderWidth: 5, borderStyle: 'solid', decorFlourish: 'none',
    sealType: 'stellar', sealWidth: 40, showQrCode: true, qrCodeX: 88, qrCodeY: 86, qrCodeWidth: 26,
    logoIconType: 'corporate', logoX: 50, logoY: 11, logoWidth: 66,
    signatory1: 'Manny Maceda', title1: 'Worldwide Managing Partner, Bain & Co.', signX1: 28, signY1: 78, signWidth1: 90,
    texts: [
      mkText('t1', 'BAIN & COMPANY', 13, 'Inter', 'bold', '#CC0000', 50, 21, 'center', { letterSpacing: 2 }),
      mkText('t2', 'Management Consulting Certification', 9.5, 'Inter', 'normal', '#990000', 50, 27, 'center'),
      mkText('t3', 'This is to certify that', 8.5, 'Inter', 'normal', '#888', 50, 34, 'center'),
      mkText('t4', '{{name}}', 33, 'Poppins', 'bold', '#1A1A1A', 50, 44, 'center', { isPlaceholder: true }),
      mkText('t5', 'has demonstrated strategic consulting excellence in', 8.5, 'Inter', 'normal', '#888', 50, 53, 'center'),
      mkText('t6', '{{program}}', 16, 'Inter', 'bold', '#CC0000', 50, 61, 'center', { isPlaceholder: true }),
      mkText('t7', 'Issued: {{date}}', 7.5, 'JetBrains Mono', 'normal', '#CCC', 12, 88, 'left'),
      mkText('t8', 'Ref: {{id}}', 7.5, 'JetBrains Mono', 'normal', '#CCC', 88, 88, 'right'),
    ]
  },

  {
    id: 'p-25', name: 'EY Transaction Advisory', programName: 'EY Transactions & Capital Advisory Specialist',
    category: 'Business & Consulting',
    backgroundColor: '#1C1C24', backgroundGradient: 'linear-gradient(145deg, #1C1C24 0%, #2E2E38 100%)',
    borderColor: '#FFE600', borderWidth: 3, borderStyle: 'solid', decorFlourish: 'none',
    sealType: 'modern', sealWidth: 40, showQrCode: true, qrCodeX: 50, qrCodeY: 87, qrCodeWidth: 28,
    logoIconType: 'corporate', logoX: 50, logoY: 12, logoWidth: 70,
    signatory1: 'Carmine Di Sibio', title1: 'Global Chairman & CEO, EY', signX1: 28, signY1: 77, signWidth1: 88,
    texts: [
      mkText('t1', 'ERNST & YOUNG', 13, 'Montserrat', 'bold', '#FFE600', 50, 21, 'center', { letterSpacing: 3 }),
      mkText('t2', 'Advisory Certification', 9.5, 'Inter', 'normal', '#AAA', 50, 27, 'center'),
      mkText('t3', 'This is to certify that', 8.5, 'Inter', 'normal', '#777', 50, 34, 'center'),
      mkText('t4', '{{name}}', 33, 'Montserrat', 'bold', '#FFFFFF', 50, 44, 'center', { isPlaceholder: true }),
      mkText('t5', 'has achieved advisory excellence in', 8.5, 'Inter', 'normal', '#888', 50, 53, 'center'),
      mkText('t6', '{{program}}', 16, 'Montserrat', 'bold', '#FFE600', 50, 61, 'center', { isPlaceholder: true }),
      mkText('t7', 'Date: {{date}}', 7.5, 'JetBrains Mono', 'normal', '#555', 12, 88, 'left'),
      mkText('t8', 'ID: {{id}}', 7.5, 'JetBrains Mono', 'normal', '#555', 88, 88, 'right'),
    ]
  },

  // ════════════════════════════════════════
  // ACADEMIC & UNIVERSITY (10)
  // ════════════════════════════════════════
  {
    id: 'p-26', name: 'Harvard Business Leadership', programName: 'Harvard Business Administration Leadership Certification',
    category: 'Academic & University',
    backgroundColor: '#FAF8F5', backgroundGradient: 'linear-gradient(160deg, #FAF8F5 0%, #F5EEE8 100%)',
    borderColor: '#A51C30', borderWidth: 10, borderStyle: 'double', decorFlourish: 'ornate',
    sealType: 'crimson_wax', sealWidth: 46, showQrCode: true, qrCodeX: 50, qrCodeY: 87, qrCodeWidth: 26,
    logoIconType: 'edu', logoX: 50, logoY: 12, logoWidth: 72,
    signatory1: 'Prof. Lawrence S. Bacow', title1: 'President of the University', signX1: 25, signY1: 77, signWidth1: 92,
    signatory2: 'Dean Srikant Datar', title2: 'Dean, Harvard Business School', signX2: 75, signY2: 77, signWidth2: 92,
    texts: [
      mkText('t1', 'HARVARD UNIVERSITY', 12, 'Playfair Display', 'bold', '#A51C30', 50, 21, 'center', { letterSpacing: 2 }),
      mkText('t2', '❦ Business Administration ❦', 9.5, 'Cormorant Garamond', 'normal', '#8B6958', 50, 27, 'center'),
      mkText('t3', 'This is to solemnly certify that', 9, 'Lora', 'normal', '#8B7355', 50, 34, 'center'),
      mkText('t4', '{{name}}', 33, 'Playfair Display', 'bold', '#1A0A00', 50, 44, 'center', { isPlaceholder: true }),
      mkText('t5', 'has fulfilled all requirements and meritoriously completed the program in', 8.5, 'Lora', 'normal', '#8B7355', 50, 53, 'center'),
      mkText('t6', '{{program}}', 16, 'Playfair Display', 'bold', '#A51C30', 50, 61, 'center', { isPlaceholder: true }),
      mkText('t7', 'Dated this {{date}}', 8, 'Lora', 'normal', '#C0A880', 12, 88, 'left'),
      mkText('t8', 'Credential No: {{id}}', 8, 'JetBrains Mono', 'normal', '#C0A880', 88, 88, 'right'),
    ]
  },

  {
    id: 'p-27', name: 'MIT Research Fellowship', programName: 'MIT Advanced Computer Science Research Fellowship',
    category: 'Academic & University',
    backgroundColor: '#F8F5F5', backgroundGradient: 'linear-gradient(160deg, #F8F5F5 0%, #F2EEEE 100%)',
    borderColor: '#8A1B3B', borderWidth: 8, borderStyle: 'solid', decorFlourish: 'classic',
    sealType: 'classic', sealWidth: 44, showQrCode: true, qrCodeX: 88, qrCodeY: 86, qrCodeWidth: 26,
    logoIconType: 'edu', logoX: 50, logoY: 12, logoWidth: 72,
    signatory1: 'Sally Kornbluth', title1: 'President, Massachusetts Institute of Technology', signX1: 28, signY1: 77, signWidth1: 92,
    texts: [
      mkText('t1', 'MASSACHUSETTS INSTITUTE OF TECHNOLOGY', 8.5, 'Playfair Display', 'bold', '#8A1B3B', 50, 20, 'center', { letterSpacing: 1 }),
      mkText('t2', 'Research Excellence Fellowship', 9.5, 'Lora', 'normal', '#666', 50, 26, 'center'),
      mkText('t3', 'This is to certify that', 9, 'Lora', 'normal', '#888', 50, 33, 'center'),
      mkText('t4', '{{name}}', 33, 'Playfair Display', 'bold', '#0D0D0D', 50, 43, 'center', { isPlaceholder: true }),
      mkText('t5', 'has successfully completed all requirements for the program in', 8.5, 'Lora', 'normal', '#888', 50, 52, 'center'),
      mkText('t6', '{{program}}', 16, 'Playfair Display', 'bold', '#8A1B3B', 50, 60, 'center', { isPlaceholder: true }),
      mkText('t7', 'Awarded: {{date}}', 8, 'Lora', 'normal', '#BBB', 12, 88, 'left'),
      mkText('t8', 'Credential: {{id}}', 8, 'JetBrains Mono', 'normal', '#BBB', 88, 88, 'right'),
    ]
  },

  {
    id: 'p-28', name: 'Oxford Jurisprudence Cert', programName: 'Oxford Advanced Certification in Jurisprudence Studies',
    category: 'Academic & University',
    backgroundColor: '#F5F0E8', backgroundGradient: 'linear-gradient(160deg, #F5F0E8 0%, #EEE8DC 100%)',
    borderColor: '#002147', borderWidth: 10, borderStyle: 'ornate', decorFlourish: 'ornate',
    sealType: 'crimson_wax', sealWidth: 46, showQrCode: true, qrCodeX: 50, qrCodeY: 87, qrCodeWidth: 26,
    logoIconType: 'edu', logoX: 50, logoY: 12, logoWidth: 72,
    signatory1: 'Prof. Irene Tracey', title1: 'Vice-Chancellor, University of Oxford', signX1: 27, signY1: 77, signWidth1: 90,
    texts: [
      mkText('t1', 'UNIVERSITY OF OXFORD', 12, 'Playfair Display', 'bold', '#002147', 50, 21, 'center', { letterSpacing: 2 }),
      mkText('t2', '✦ Established 1096 ✦', 8.5, 'Cormorant Garamond', 'normal', '#8B7355', 50, 27, 'center'),
      mkText('t3', 'This is to solemnly attest that', 9, 'Lora', 'normal', '#8B7355', 50, 34, 'center'),
      mkText('t4', '{{name}}', 33, 'Playfair Display', 'bold', '#1A0D00', 50, 44, 'center', { isPlaceholder: true }),
      mkText('t5', 'has completed all academic requirements and been awarded the distinction for', 8.5, 'Lora', 'normal', '#8B7355', 50, 53, 'center'),
      mkText('t6', '{{program}}', 16, 'Playfair Display', 'bold', '#002147', 50, 61, 'center', { isPlaceholder: true }),
      mkText('t7', 'Dated: {{date}}', 8, 'Cormorant Garamond', 'normal', '#B0956A', 12, 88, 'left'),
      mkText('t8', 'Certificate No: {{id}}', 8, 'JetBrains Mono', 'normal', '#B0956A', 88, 88, 'right'),
    ]
  },

  {
    id: 'p-29', name: 'Cambridge Mathematical Honors', programName: 'Cambridge Mathematical Tripos Honors Certification',
    category: 'Academic & University',
    backgroundColor: '#F0F4FC', backgroundGradient: 'linear-gradient(160deg, #F0F4FC 0%, #E8EEF8 100%)',
    borderColor: '#002F6C', borderWidth: 8, borderStyle: 'double', decorFlourish: 'ornate',
    sealType: 'gold_medallion', sealWidth: 46, showQrCode: true, qrCodeX: 50, qrCodeY: 87, qrCodeWidth: 26,
    logoIconType: 'edu', logoX: 50, logoY: 12, logoWidth: 72,
    signatory1: 'Prof. Deborah Prentice', title1: 'Vice-Chancellor, Cambridge University', signX1: 27, signY1: 77, signWidth1: 90,
    texts: [
      mkText('t1', 'UNIVERSITY OF CAMBRIDGE', 11, 'Playfair Display', 'bold', '#002F6C', 50, 21, 'center', { letterSpacing: 2 }),
      mkText('t2', '✦ Mathematical Tripos Honors ✦', 9, 'Cormorant Garamond', 'normal', '#D4AF37', 50, 27, 'center'),
      mkText('t3', 'This is to certify that', 9, 'Lora', 'normal', '#888', 50, 34, 'center'),
      mkText('t4', '{{name}}', 33, 'Playfair Display', 'bold', '#0A0A2E', 50, 44, 'center', { isPlaceholder: true }),
      mkText('t5', 'has distinguished themselves and completed the full program for', 8.5, 'Lora', 'normal', '#888', 50, 53, 'center'),
      mkText('t6', '{{program}}', 16, 'Playfair Display', 'bold', '#002F6C', 50, 61, 'center', { isPlaceholder: true }),
      mkText('t7', 'Awarded: {{date}}', 8, 'Lora', 'normal', '#D4AF37', 12, 88, 'left'),
      mkText('t8', 'Reference: {{id}}', 8, 'JetBrains Mono', 'normal', '#D4AF37', 88, 88, 'right'),
    ]
  },

  {
    id: 'p-30', name: 'Stanford Design Thinking', programName: 'Stanford d.school Design Thinking Expert Certification',
    category: 'Academic & University',
    backgroundColor: '#FFFAF7', backgroundGradient: 'linear-gradient(160deg, #FFFAF7 0%, #FFF3EC 100%)',
    borderColor: '#8C1515', borderWidth: 6, borderStyle: 'solid', decorFlourish: 'ornate',
    sealType: 'crimson_wax', sealWidth: 44, showQrCode: true, qrCodeX: 88, qrCodeY: 86, qrCodeWidth: 26,
    logoIconType: 'edu', logoX: 50, logoY: 12, logoWidth: 70,
    signatory1: 'Marc Tessier-Lavigne', title1: 'President, Stanford University', signX1: 28, signY1: 77, signWidth1: 90,
    texts: [
      mkText('t1', 'STANFORD UNIVERSITY', 12, 'Playfair Display', 'bold', '#8C1515', 50, 21, 'center', { letterSpacing: 2 }),
      mkText('t2', 'd.school Design Excellence Certification', 9.5, 'Lora', 'normal', '#B83A4B', 50, 27, 'center'),
      mkText('t3', 'This is to certify that', 9, 'Lora', 'normal', '#888', 50, 34, 'center'),
      mkText('t4', '{{name}}', 33, 'Playfair Display', 'bold', '#1A0000', 50, 44, 'center', { isPlaceholder: true }),
      mkText('t5', 'has completed the immersive design program for', 8.5, 'Lora', 'normal', '#888', 50, 53, 'center'),
      mkText('t6', '{{program}}', 16, 'Playfair Display', 'bold', '#8C1515', 50, 61, 'center', { isPlaceholder: true }),
      mkText('t7', 'Date: {{date}}', 8, 'Lora', 'normal', '#C09080', 12, 88, 'left'),
      mkText('t8', 'Credential: {{id}}', 8, 'JetBrains Mono', 'normal', '#C09080', 88, 88, 'right'),
    ]
  },

  {
    id: 'p-31', name: 'Yale Creative Writing Excellence', programName: 'Yale Literary & Creative Writing Fellowship Master',
    category: 'Academic & University',
    backgroundColor: '#F0F5FF', backgroundGradient: 'linear-gradient(160deg, #F0F5FF 0%, #E8EFFF 100%)',
    borderColor: '#00356B', borderWidth: 8, borderStyle: 'solid', decorFlourish: 'ornate',
    sealType: 'emerald_shield', sealWidth: 44, showQrCode: true, qrCodeX: 50, qrCodeY: 87, qrCodeWidth: 26,
    logoIconType: 'edu', logoX: 50, logoY: 12, logoWidth: 70,
    signatory1: 'Peter Salovey', title1: 'President, Yale University', signX1: 28, signY1: 77, signWidth1: 88,
    texts: [
      mkText('t1', 'YALE UNIVERSITY', 13, 'Playfair Display', 'bold', '#00356B', 50, 21, 'center', { letterSpacing: 2 }),
      mkText('t2', 'Fellowship of Creative Arts', 9.5, 'Cormorant Garamond', 'normal', '#2A5FAC', 50, 27, 'center'),
      mkText('t3', 'It is a privilege to certify that', 9, 'Lora', 'normal', '#888', 50, 34, 'center'),
      mkText('t4', '{{name}}', 33, 'Playfair Display', 'bold', '#00356B', 50, 44, 'center', { isPlaceholder: true }),
      mkText('t5', 'has distinguished themselves and completed the fellowship for', 8.5, 'Lora', 'normal', '#888', 50, 53, 'center'),
      mkText('t6', '{{program}}', 16, 'Playfair Display', 'bold', '#00356B', 50, 61, 'center', { isPlaceholder: true }),
      mkText('t7', 'Dated: {{date}}', 8, 'Lora', 'normal', '#A0B8D8', 12, 88, 'left'),
      mkText('t8', 'Reference: {{id}}', 8, 'JetBrains Mono', 'normal', '#A0B8D8', 88, 88, 'right'),
    ]
  },

  {
    id: 'p-32', name: 'Wharton Executive MBA', programName: 'Executive Master of Business Administration Fellowship',
    category: 'Academic & University',
    backgroundColor: '#F5F0F8', backgroundGradient: 'linear-gradient(160deg, #F5F0F8 0%, #EDE6F5 100%)',
    borderColor: '#013C7B', borderWidth: 8, borderStyle: 'solid', decorFlourish: 'classic',
    sealType: 'gold_medallion', sealWidth: 46, showQrCode: true, qrCodeX: 50, qrCodeY: 87, qrCodeWidth: 26,
    logoIconType: 'edu', logoX: 50, logoY: 12, logoWidth: 70,
    signatory1: 'Dean Erika James', title1: 'Dean of the Wharton School', signX1: 28, signY1: 77, signWidth1: 88,
    texts: [
      mkText('t1', 'THE WHARTON SCHOOL', 12, 'Playfair Display', 'bold', '#013C7B', 50, 21, 'center', { letterSpacing: 2 }),
      mkText('t2', 'University of Pennsylvania', 9, 'Lora', 'normal', '#9E1B32', 50, 27, 'center'),
      mkText('t3', 'This is to solemnly certify that', 9, 'Lora', 'normal', '#888', 50, 34, 'center'),
      mkText('t4', '{{name}}', 33, 'Playfair Display', 'bold', '#0A0A2E', 50, 44, 'center', { isPlaceholder: true }),
      mkText('t5', 'having fulfilled all academic requirements, is awarded the', 8.5, 'Lora', 'normal', '#888', 50, 53, 'center'),
      mkText('t6', '{{program}}', 16, 'Playfair Display', 'bold', '#013C7B', 50, 61, 'center', { isPlaceholder: true }),
      mkText('t7', 'Awarded: {{date}}', 8, 'Lora', 'normal', '#C0A8C8', 12, 88, 'left'),
      mkText('t8', 'Degree No: {{id}}', 8, 'JetBrains Mono', 'normal', '#C0A8C8', 88, 88, 'right'),
    ]
  },

  {
    id: 'p-33', name: 'Berkeley Physics Research Award', programName: 'UC Berkeley Physics Research & Laboratory Honors',
    category: 'Academic & University',
    backgroundColor: '#FFFBF0', backgroundGradient: 'linear-gradient(160deg, #FFFBF0 0%, #FFF5D8 100%)',
    borderColor: '#003262', borderWidth: 8, borderStyle: 'solid', decorFlourish: 'classic',
    sealType: 'stellar', sealWidth: 44, showQrCode: true, qrCodeX: 50, qrCodeY: 87, qrCodeWidth: 26,
    logoIconType: 'edu', logoX: 50, logoY: 12, logoWidth: 70,
    signatory1: 'Carol T. Christ', title1: 'Chancellor, UC Berkeley', signX1: 28, signY1: 77, signWidth1: 88,
    texts: [
      mkText('t1', 'UNIVERSITY OF CALIFORNIA', 11, 'Playfair Display', 'bold', '#003262', 50, 20, 'center', { letterSpacing: 1 }),
      mkText('t2', 'Berkeley — Physics Research Excellence Award', 9.5, 'Lora', 'normal', '#FDB515', 50, 26, 'center'),
      mkText('t3', 'This is to certify that', 9, 'Lora', 'normal', '#888', 50, 33, 'center'),
      mkText('t4', '{{name}}', 33, 'Playfair Display', 'bold', '#003262', 50, 43, 'center', { isPlaceholder: true }),
      mkText('t5', 'has distinguished themselves in advanced research and completed', 8.5, 'Lora', 'normal', '#888', 50, 52, 'center'),
      mkText('t6', '{{program}}', 16, 'Playfair Display', 'bold', '#003262', 50, 60, 'center', { isPlaceholder: true }),
      mkText('t7', 'Conferred: {{date}}', 8, 'Lora', 'normal', '#FDB515', 12, 88, 'left'),
      mkText('t8', 'Reference: {{id}}', 8, 'JetBrains Mono', 'normal', '#FDB515', 88, 88, 'right'),
    ]
  },

  {
    id: 'p-34', name: 'Princeton Advanced Mathematics', programName: 'Princeton University Advanced Mathematics Fellowship',
    category: 'Academic & University',
    backgroundColor: '#FFFEF8', backgroundGradient: 'linear-gradient(160deg, #FFFEF8 0%, #FFF9E6 100%)',
    borderColor: '#EE7F2D', borderWidth: 8, borderStyle: 'solid', decorFlourish: 'ornate',
    sealType: 'classic', sealWidth: 44, showQrCode: true, qrCodeX: 50, qrCodeY: 87, qrCodeWidth: 26,
    logoIconType: 'edu', logoX: 50, logoY: 12, logoWidth: 70,
    signatory1: 'Christopher L. Eisgruber', title1: 'President, Princeton University', signX1: 28, signY1: 77, signWidth1: 88,
    texts: [
      mkText('t1', 'PRINCETON UNIVERSITY', 12, 'Playfair Display', 'bold', '#000000', 50, 21, 'center', { letterSpacing: 2 }),
      mkText('t2', 'Mathematics Fellowship Award', 9.5, 'Lora', 'normal', '#EE7F2D', 50, 27, 'center'),
      mkText('t3', 'This is to certify that', 9, 'Lora', 'normal', '#888', 50, 34, 'center'),
      mkText('t4', '{{name}}', 33, 'Playfair Display', 'bold', '#1A1A00', 50, 44, 'center', { isPlaceholder: true }),
      mkText('t5', 'has met all advanced requirements and is hereby awarded', 8.5, 'Lora', 'normal', '#888', 50, 53, 'center'),
      mkText('t6', '{{program}}', 16, 'Playfair Display', 'bold', '#EE7F2D', 50, 61, 'center', { isPlaceholder: true }),
      mkText('t7', 'Dated: {{date}}', 8, 'Lora', 'normal', '#EE7F2D', 12, 88, 'left'),
      mkText('t8', 'Award ID: {{id}}', 8, 'JetBrains Mono', 'normal', '#EE7F2D', 88, 88, 'right'),
    ]
  },

  {
    id: 'p-35', name: 'Columbia Journalism Fellowship', programName: 'Columbia Journalism School Master Fellowship Program',
    category: 'Academic & University',
    backgroundColor: '#F5F8FF', backgroundGradient: 'linear-gradient(160deg, #F5F8FF 0%, #EEF3FF 100%)',
    borderColor: '#1D3B5C', borderWidth: 8, borderStyle: 'solid', decorFlourish: 'classic',
    sealType: 'classic', sealWidth: 44, showQrCode: true, qrCodeX: 88, qrCodeY: 86, qrCodeWidth: 26,
    logoIconType: 'edu', logoX: 50, logoY: 12, logoWidth: 70,
    signatory1: 'Minouche Shafik', title1: 'President, Columbia University', signX1: 28, signY1: 77, signWidth1: 88,
    texts: [
      mkText('t1', 'COLUMBIA UNIVERSITY', 12, 'Playfair Display', 'bold', '#1D3B5C', 50, 21, 'center', { letterSpacing: 2 }),
      mkText('t2', 'Graduate School of Journalism', 9.5, 'Lora', 'normal', '#75AADB', 50, 27, 'center'),
      mkText('t3', 'This is to certify that', 9, 'Lora', 'normal', '#888', 50, 34, 'center'),
      mkText('t4', '{{name}}', 33, 'Playfair Display', 'bold', '#1D3B5C', 50, 44, 'center', { isPlaceholder: true }),
      mkText('t5', 'has completed the distinguished journalism fellowship for', 8.5, 'Lora', 'normal', '#888', 50, 53, 'center'),
      mkText('t6', '{{program}}', 16, 'Playfair Display', 'bold', '#1D3B5C', 50, 61, 'center', { isPlaceholder: true }),
      mkText('t7', 'Awarded: {{date}}', 8, 'Lora', 'normal', '#75AADB', 12, 88, 'left'),
      mkText('t8', 'Reference: {{id}}', 8, 'JetBrains Mono', 'normal', '#75AADB', 88, 88, 'right'),
    ]
  },

  // ════════════════════════════════════════
  // CREATIVE & DESIGN (8)
  // ════════════════════════════════════════
  {
    id: 'p-36', name: 'International Design Awards', programName: 'International Creative Design Gold Medallist Award',
    category: 'Creative & Design',
    backgroundColor: '#FFFDF9', backgroundGradient: 'linear-gradient(135deg, #FFFDF9 0%, #FAF6EE 100%)',
    borderColor: '#E11D48', borderWidth: 4, borderStyle: 'solid', decorFlourish: 'classic',
    sealType: 'gold_medallion', sealWidth: 44, showQrCode: true, qrCodeX: 88, qrCodeY: 86, qrCodeWidth: 26,
    logoIconType: 'art', logoX: 50, logoY: 12, logoWidth: 70,
    signatory1: 'Jonathan Ive', title1: 'Head of Jury, International Creative Design Committee', signX1: 28, signY1: 77, signWidth1: 92,
    texts: [
      mkText('t1', 'INTERNATIONAL DESIGN AWARDS', 9.5, 'Cinzel', 'bold', '#E11D48', 50, 21, 'center', { letterSpacing: 2 }),
      mkText('t2', '✦ Gold Medallist Recognition ✦', 9, 'Cormorant Garamond', 'normal', '#D4AF37', 50, 27, 'center'),
      mkText('t3', 'This award is proudly presented to', 9, 'Lora', 'normal', '#888', 50, 34, 'center'),
      mkText('t4', '{{name}}', 34, 'Cormorant Garamond', 'bold', '#1A0A00', 50, 44, 'center', { isPlaceholder: true }),
      mkText('t5', 'in recognition of outstanding creative achievement for', 8.5, 'Lora', 'normal', '#888', 50, 53, 'center'),
      mkText('t6', '{{program}}', 17, 'Cinzel', 'bold', '#E11D48', 50, 61, 'center', { isPlaceholder: true }),
      mkText('t7', '{{date}}', 8, 'Cormorant Garamond', 'normal', '#D4AF37', 12, 88, 'left'),
      mkText('t8', 'Award No: {{id}}', 7.5, 'JetBrains Mono', 'normal', '#D4AF37', 88, 88, 'right'),
    ]
  },

  {
    id: 'p-37', name: 'Milan Fashion Design Cert', programName: 'Milan Fashion Academy Certified Apparel Designer Master',
    category: 'Creative & Design',
    backgroundColor: '#FFF0F5', backgroundGradient: 'linear-gradient(135deg, #FFF0F5 0%, #FFE4EF 100%)',
    borderColor: '#BE185D', borderWidth: 3, borderStyle: 'solid', borderRadius: 4, decorFlourish: 'none',
    sealType: 'modern', sealWidth: 38, showQrCode: true, qrCodeX: 88, qrCodeY: 86, qrCodeWidth: 24,
    logoIconType: 'art', logoX: 50, logoY: 11, logoWidth: 66,
    signatory1: 'Giorgio Armani', title1: 'Director, Milan Fashion Institute', signX1: 28, signY1: 78, signWidth1: 88,
    texts: [
      mkText('t1', 'MILAN FASHION INSTITUTE', 11, 'Cormorant Garamond', 'bold', '#BE185D', 50, 21, 'center', { letterSpacing: 3 }),
      mkText('t2', 'Maison de Couture Certification', 9, 'Lora', 'normal', '#DB2777', 50, 27, 'center'),
      mkText('t3', 'With great honor, this certifies that', 8.5, 'Lora', 'normal', '#888', 50, 34, 'center'),
      mkText('t4', '{{name}}', 32, 'Cormorant Garamond', 'bold', '#1A0010', 50, 44, 'center', { isPlaceholder: true }),
      mkText('t5', 'has mastered the art of fashion design for', 8.5, 'Lora', 'normal', '#888', 50, 53, 'center'),
      mkText('t6', '{{program}}', 15, 'Cormorant Garamond', 'bold', '#BE185D', 50, 61, 'center', { isPlaceholder: true }),
      mkText('t7', '{{date}}', 7.5, 'JetBrains Mono', 'normal', '#E9B0C8', 12, 88, 'left'),
      mkText('t8', '{{id}}', 7.5, 'JetBrains Mono', 'normal', '#E9B0C8', 88, 88, 'right'),
    ]
  },

  {
    id: 'p-38', name: 'Master Photography Academy', programName: 'Certified Studio & Portrait Photography Master',
    category: 'Creative & Design',
    backgroundColor: '#0A0A0A', backgroundGradient: 'linear-gradient(180deg, #0A0A0A 0%, #1A1A1A 100%)',
    borderColor: '#334155', borderWidth: 1, borderStyle: 'solid', borderRadius: 8, decorFlourish: 'none',
    sealType: 'none', showQrCode: true, qrCodeX: 88, qrCodeY: 86, qrCodeWidth: 24,
    logoIconType: 'art', logoX: 50, logoY: 11, logoWidth: 64,
    signatory1: 'Annie Leibovitz', title1: 'President, Master Photography Academy', signX1: 28, signY1: 78, signWidth1: 88,
    texts: [
      mkText('t1', 'MASTER PHOTOGRAPHY ACADEMY', 9.5, 'Montserrat', 'bold', '#FFFFFF', 50, 21, 'center', { letterSpacing: 2 }),
      mkText('t2', '— Studio Excellence Certification —', 8.5, 'Inter', 'normal', '#64748B', 50, 27, 'center'),
      mkText('t3', 'This certifies that', 8.5, 'Inter', 'normal', '#555', 50, 34, 'center'),
      mkText('t4', '{{name}}', 32, 'Montserrat', 'bold', '#FFFFFF', 50, 44, 'center', { isPlaceholder: true }),
      mkText('t5', 'has demonstrated mastery in', 8.5, 'Inter', 'normal', '#666', 50, 53, 'center'),
      mkText('t6', '{{program}}', 15, 'Montserrat', 'bold', '#FFFFFF', 50, 61, 'center', { isPlaceholder: true }),
      mkText('t7', '{{date}}', 7.5, 'JetBrains Mono', 'normal', '#374151', 12, 88, 'left'),
      mkText('t8', '{{id}}', 7.5, 'JetBrains Mono', 'normal', '#374151', 88, 88, 'right'),
    ]
  },

  {
    id: 'p-39', name: 'Royal Music Academy Violin', programName: 'Royal Music Academy Violin Master Excellence Diploma',
    category: 'Creative & Design',
    backgroundColor: '#FDF8F0', backgroundGradient: 'linear-gradient(135deg, #FDF8F0 0%, #F5ECD8 100%)',
    borderColor: '#854D0E', borderWidth: 5, borderStyle: 'ornate', decorFlourish: 'ornate',
    sealType: 'classic', sealWidth: 44, showQrCode: true, qrCodeX: 50, qrCodeY: 87, qrCodeWidth: 26,
    logoIconType: 'art', logoX: 50, logoY: 12, logoWidth: 70,
    signatory1: 'Itzhak Perlman', title1: 'Director, Royal Violin Faculty', signX1: 28, signY1: 77, signWidth1: 88,
    texts: [
      mkText('t1', 'ROYAL MUSIC ACADEMY', 12, 'Cinzel', 'bold', '#854D0E', 50, 21, 'center', { letterSpacing: 2 }),
      mkText('t2', '✦ Violin Master Excellence Diploma ✦', 8.5, 'Cormorant Garamond', 'normal', '#A16207', 50, 27, 'center'),
      mkText('t3', 'With greatest honor, this diploma is bestowed upon', 9, 'Lora', 'normal', '#888', 50, 34, 'center'),
      mkText('t4', '{{name}}', 32, 'Cormorant Garamond', 'bold', '#3B1A00', 50, 44, 'center', { isPlaceholder: true }),
      mkText('t5', 'in recognition of exemplary mastery achieved for', 8.5, 'Lora', 'normal', '#888', 50, 53, 'center'),
      mkText('t6', '{{program}}', 15, 'Cinzel', 'bold', '#854D0E', 50, 61, 'center', { isPlaceholder: true }),
      mkText('t7', 'Conferred: {{date}}', 8, 'Cormorant Garamond', 'normal', '#C8A060', 12, 88, 'left'),
      mkText('t8', 'Diploma No: {{id}}', 7.5, 'JetBrains Mono', 'normal', '#C8A060', 88, 88, 'right'),
    ]
  },

  {
    id: 'p-40', name: 'Culinary Arts Master Chef Honors', programName: 'Culinary Arts Academy Professional Master Chef Diploma',
    category: 'Creative & Design',
    backgroundColor: '#FFFDF7', backgroundGradient: 'linear-gradient(145deg, #FFFDF7 0%, #FFF8E0 100%)',
    borderColor: '#064E3B', borderWidth: 5, borderStyle: 'solid', decorFlourish: 'minimal',
    sealType: 'gold_medallion', sealWidth: 44, showQrCode: true, qrCodeX: 88, qrCodeY: 86, qrCodeWidth: 26,
    logoIconType: 'art', logoX: 50, logoY: 11, logoWidth: 68,
    signatory1: 'Gordon Ramsay', title1: 'Head of Jury, Culinary Arts Academy', signX1: 28, signY1: 78, signWidth1: 88,
    texts: [
      mkText('t1', 'CULINARY ARTS ACADEMY', 11, 'Cinzel', 'bold', '#064E3B', 50, 21, 'center', { letterSpacing: 2 }),
      mkText('t2', 'Master Chef Excellence Diploma', 9.5, 'Lora', 'normal', '#F59E0B', 50, 27, 'center'),
      mkText('t3', 'This diploma is awarded with distinction to', 9, 'Lora', 'normal', '#888', 50, 34, 'center'),
      mkText('t4', '{{name}}', 33, 'Cormorant Garamond', 'bold', '#064E3B', 50, 44, 'center', { isPlaceholder: true }),
      mkText('t5', 'in recognition of culinary mastery demonstrated in', 8.5, 'Lora', 'normal', '#888', 50, 53, 'center'),
      mkText('t6', '{{program}}', 16, 'Cinzel', 'bold', '#064E3B', 50, 61, 'center', { isPlaceholder: true }),
      mkText('t7', '{{date}}', 8, 'Cormorant Garamond', 'normal', '#F59E0B', 12, 88, 'left'),
      mkText('t8', '{{id}}', 7.5, 'JetBrains Mono', 'normal', '#F59E0B', 88, 88, 'right'),
    ]
  },

  {
    id: 'p-41', name: 'Global UI/UX Design Expert', programName: 'Certified Advanced UI/UX Product Design Master',
    category: 'Creative & Design',
    backgroundColor: '#0F0A1E', backgroundGradient: 'linear-gradient(145deg, #0F0A1E 0%, #1A0F3A 50%, #0D0820 100%)',
    borderColor: '#7C3AED', borderWidth: 3, borderStyle: 'solid', borderRadius: 8, decorFlourish: 'modern',
    sealType: 'stellar', sealWidth: 40, showQrCode: true, qrCodeX: 50, qrCodeY: 87, qrCodeWidth: 28,
    logoIconType: 'art', logoX: 50, logoY: 12, logoWidth: 68,
    signatory1: 'Don Norman', title1: 'Head Instructor, UX Design Boot Camp', signX1: 28, signY1: 77, signWidth1: 88,
    texts: [
      mkText('t1', 'UI / UX DESIGN ACADEMY', 11, 'Space Grotesk', 'bold', '#A78BFA', 50, 21, 'center', { letterSpacing: 3 }),
      mkText('t2', 'Certificate of Design Excellence', 9.5, 'Inter', 'normal', '#6D28D9', 50, 27, 'center'),
      mkText('t3', 'This certifies that', 8.5, 'Inter', 'normal', '#6B7280', 50, 34, 'center'),
      mkText('t4', '{{name}}', 33, 'Space Grotesk', 'bold', '#FFFFFF', 50, 44, 'center', { isPlaceholder: true }),
      mkText('t5', 'has demonstrated product design mastery for', 8.5, 'Inter', 'normal', '#6B7280', 50, 53, 'center'),
      mkText('t6', '{{program}}', 16, 'Space Grotesk', 'bold', '#A78BFA', 50, 61, 'center', { isPlaceholder: true }),
      mkText('t7', 'Issued: {{date}}', 7.5, 'JetBrains Mono', 'normal', '#3B2A5A', 12, 88, 'left'),
      mkText('t8', 'Cert: {{id}}', 7.5, 'JetBrains Mono', 'normal', '#3B2A5A', 88, 88, 'right'),
    ]
  },

  {
    id: 'p-42', name: 'Literary Novel Writing Fellowship', programName: 'Global Literary Novel Writing Fellowship Award',
    category: 'Creative & Design',
    backgroundColor: '#F5F0E8', backgroundGradient: 'linear-gradient(135deg, #F5F0E8 0%, #EDE5D8 100%)',
    borderColor: '#78350F', borderWidth: 5, borderStyle: 'ornate', decorFlourish: 'ornate',
    sealType: 'crimson_wax', sealWidth: 44, showQrCode: true, qrCodeX: 88, qrCodeY: 86, qrCodeWidth: 26,
    logoIconType: 'art', logoX: 50, logoY: 12, logoWidth: 68,
    signatory1: 'Margaret Atwood', title1: 'President, Novelists Fellowship Society', signX1: 28, signY1: 77, signWidth1: 88,
    texts: [
      mkText('t1', 'GLOBAL LITERARY FELLOWSHIP', 10, 'Cinzel', 'bold', '#78350F', 50, 21, 'center', { letterSpacing: 2 }),
      mkText('t2', '✦ Novel Writing Excellence ✦', 9, 'Cormorant Garamond', 'normal', '#92400E', 50, 27, 'center'),
      mkText('t3', 'This Fellowship is bestowed with honour upon', 9, 'Lora', 'normal', '#888', 50, 34, 'center'),
      mkText('t4', '{{name}}', 32, 'Cormorant Garamond', 'bold', '#2D1000', 50, 44, 'center', { isPlaceholder: true }),
      mkText('t5', 'for exceptional literary achievement and completion of', 8.5, 'Lora', 'normal', '#888', 50, 53, 'center'),
      mkText('t6', '{{program}}', 15, 'Cinzel', 'bold', '#78350F', 50, 61, 'center', { isPlaceholder: true }),
      mkText('t7', '{{date}}', 8, 'Cormorant Garamond', 'normal', '#C8A060', 12, 88, 'left'),
      mkText('t8', 'Ref: {{id}}', 7.5, 'JetBrains Mono', 'normal', '#C8A060', 88, 88, 'right'),
    ]
  },

  {
    id: 'p-43', name: 'Fine Arts Studio Master', programName: 'Fine Arts Studio Master of Creative Painting & Sketching',
    category: 'Creative & Design',
    backgroundColor: '#FCF8FF', backgroundGradient: 'linear-gradient(135deg, #FCF8FF 0%, #F5ECFF 100%)',
    borderColor: '#A21CAF', borderWidth: 4, borderStyle: 'solid', decorFlourish: 'ornate',
    sealType: 'classic', sealWidth: 42, showQrCode: true, qrCodeX: 88, qrCodeY: 86, qrCodeWidth: 26,
    logoIconType: 'art', logoX: 50, logoY: 12, logoWidth: 68,
    signatory1: 'David Hockney', title1: 'Dean, Creative Painting Alliance', signX1: 28, signY1: 77, signWidth1: 88,
    texts: [
      mkText('t1', 'FINE ARTS ALLIANCE', 13, 'Cinzel', 'bold', '#A21CAF', 50, 21, 'center', { letterSpacing: 2 }),
      mkText('t2', 'Studio Excellence Certification', 9.5, 'Cormorant Garamond', 'normal', '#F472B6', 50, 27, 'center'),
      mkText('t3', 'This award is presented with pride to', 9, 'Lora', 'normal', '#888', 50, 34, 'center'),
      mkText('t4', '{{name}}', 32, 'Cormorant Garamond', 'bold', '#2D0035', 50, 44, 'center', { isPlaceholder: true }),
      mkText('t5', 'for exceptional creative excellence demonstrated in', 8.5, 'Lora', 'normal', '#888', 50, 53, 'center'),
      mkText('t6', '{{program}}', 16, 'Cinzel', 'bold', '#A21CAF', 50, 61, 'center', { isPlaceholder: true }),
      mkText('t7', '{{date}}', 8, 'Cormorant Garamond', 'normal', '#D08AD8', 12, 88, 'left'),
      mkText('t8', '{{id}}', 7.5, 'JetBrains Mono', 'normal', '#D08AD8', 88, 88, 'right'),
    ]
  },

  // ════════════════════════════════════════
  // HEALTH & WELLNESS (6)
  // ════════════════════════════════════════
  {
    id: 'p-44', name: 'Yoga Alliance 200 Hour RYT', programName: 'Registered Yoga Teacher – 200 Hour (RYT-200)',
    category: 'Health & Wellness',
    backgroundColor: '#F0FDF8', backgroundGradient: 'linear-gradient(135deg, #F0FDF8 0%, #E0F8F0 100%)',
    borderColor: '#0D9488', borderWidth: 6, borderStyle: 'solid', borderRadius: 8, decorFlourish: 'classic',
    sealType: 'gold_medallion', sealWidth: 42, showQrCode: true, qrCodeX: 50, qrCodeY: 87, qrCodeWidth: 26,
    logoIconType: 'health', logoX: 50, logoY: 12, logoWidth: 68,
    signatory1: 'Sadhguru Jaggi', title1: 'Director, Yoga Alliance Council', signX1: 28, signY1: 77, signWidth1: 88,
    texts: [
      mkText('t1', 'YOGA ALLIANCE', 14, 'Playfair Display', 'bold', '#0D9488', 50, 21, 'center', { letterSpacing: 2 }),
      mkText('t2', '✦ Registered Yoga Teacher Certification ✦', 8.5, 'Lora', 'normal', '#14B8A6', 50, 27, 'center'),
      mkText('t3', 'This is to certify that', 8.5, 'Lora', 'normal', '#888', 50, 34, 'center'),
      mkText('t4', '{{name}}', 33, 'Playfair Display', 'bold', '#042F2E', 50, 44, 'center', { isPlaceholder: true }),
      mkText('t5', 'has successfully completed all training hours for', 8.5, 'Lora', 'normal', '#888', 50, 53, 'center'),
      mkText('t6', '{{program}}', 16, 'Playfair Display', 'bold', '#0D9488', 50, 61, 'center', { isPlaceholder: true }),
      mkText('t7', 'Registered: {{date}}', 8, 'Lora', 'normal', '#A7F3D0', 12, 88, 'left'),
      mkText('t8', 'Registration: {{id}}', 7.5, 'JetBrains Mono', 'normal', '#A7F3D0', 88, 88, 'right'),
    ]
  },

  {
    id: 'p-45', name: 'CrossFit Level 1 Coach', programName: 'CrossFit Level 1 Coach Certification (CF-L1)',
    category: 'Health & Wellness',
    backgroundColor: '#0A0A0A', backgroundGradient: 'linear-gradient(145deg, #0A0A0A 0%, #1A0505 100%)',
    borderColor: '#DC2626', borderWidth: 4, borderStyle: 'solid', decorFlourish: 'none',
    sealType: 'modern', sealWidth: 40, showQrCode: true, qrCodeX: 88, qrCodeY: 86, qrCodeWidth: 26,
    logoIconType: 'health', logoX: 50, logoY: 12, logoWidth: 66,
    signatory1: 'Greg Glassman', title1: 'President, CrossFit Certification Board', signX1: 28, signY1: 78, signWidth1: 88,
    texts: [
      mkText('t1', 'CROSSFIT', 20, 'Montserrat', 'bold', '#DC2626', 50, 21, 'center', { letterSpacing: 4 }),
      mkText('t2', 'Coach Level 1 Certification', 9.5, 'Inter', 'normal', '#888', 50, 27, 'center'),
      mkText('t3', 'This certifies that', 8.5, 'Inter', 'normal', '#666', 50, 34, 'center'),
      mkText('t4', '{{name}}', 33, 'Montserrat', 'bold', '#FFFFFF', 50, 44, 'center', { isPlaceholder: true }),
      mkText('t5', 'has completed all training requirements for', 8.5, 'Inter', 'normal', '#888', 50, 53, 'center'),
      mkText('t6', '{{program}}', 16, 'Montserrat', 'bold', '#DC2626', 50, 61, 'center', { isPlaceholder: true }),
      mkText('t7', '{{date}}', 7.5, 'JetBrains Mono', 'normal', '#444', 12, 88, 'left'),
      mkText('t8', '{{id}}', 7.5, 'JetBrains Mono', 'normal', '#444', 88, 88, 'right'),
    ]
  },

  {
    id: 'p-46', name: 'Boston Marathon Finisher Elite', programName: 'Boston Marathon Finisher & Qualifying Runner Credentials',
    category: 'Health & Wellness',
    backgroundColor: '#F0F5FF', backgroundGradient: 'linear-gradient(145deg, #F0F5FF 0%, #E8EFFF 100%)',
    borderColor: '#1E3A8A', borderWidth: 6, borderStyle: 'solid', decorFlourish: 'minimal',
    sealType: 'gold_medallion', sealWidth: 44, showQrCode: true, qrCodeX: 50, qrCodeY: 87, qrCodeWidth: 26,
    logoIconType: 'health', logoX: 50, logoY: 12, logoWidth: 68,
    signatory1: 'Thomas Grilk', title1: 'CEO, Boston Athletic Association', signX1: 28, signY1: 77, signWidth1: 88,
    texts: [
      mkText('t1', 'BOSTON ATHLETIC ASSOCIATION', 9.5, 'Inter', 'bold', '#1E3A8A', 50, 21, 'center', { letterSpacing: 2 }),
      mkText('t2', '⬡ Marathon Finisher Credentials ⬡', 9, 'Inter', 'normal', '#FBBF24', 50, 27, 'center'),
      mkText('t3', 'This is to certify that', 8.5, 'Inter', 'normal', '#888', 50, 34, 'center'),
      mkText('t4', '{{name}}', 33, 'Inter', 'bold', '#1E3A8A', 50, 44, 'center', { isPlaceholder: true }),
      mkText('t5', 'has completed the full distance and qualified for', 8.5, 'Inter', 'normal', '#888', 50, 53, 'center'),
      mkText('t6', '{{program}}', 16, 'Inter', 'bold', '#1E3A8A', 50, 61, 'center', { isPlaceholder: true }),
      mkText('t7', 'Date: {{date}}', 8, 'Inter', 'normal', '#BFDBFE', 12, 88, 'left'),
      mkText('t8', 'Bib/ID: {{id}}', 7.5, 'JetBrains Mono', 'normal', '#BFDBFE', 88, 88, 'right'),
    ]
  },

  {
    id: 'p-47', name: 'Nutrition Science Specialist', programName: 'Certified Sports Nutritionist & Diet Planning Specialist',
    category: 'Health & Wellness',
    backgroundColor: '#F0FFF4', backgroundGradient: 'linear-gradient(145deg, #F0FFF4 0%, #E0F8EA 100%)',
    borderColor: '#15803D', borderWidth: 5, borderStyle: 'solid', borderRadius: 8, decorFlourish: 'minimal',
    sealType: 'emerald_shield', sealWidth: 42, showQrCode: true, qrCodeX: 88, qrCodeY: 86, qrCodeWidth: 26,
    logoIconType: 'health', logoX: 50, logoY: 11, logoWidth: 66,
    signatory1: 'Dr. Michael Greger', title1: 'Director, Nutrition Science Academy', signX1: 28, signY1: 78, signWidth1: 88,
    texts: [
      mkText('t1', 'NUTRITION SCIENCE ACADEMY', 10, 'Inter', 'bold', '#15803D', 50, 21, 'center', { letterSpacing: 2 }),
      mkText('t2', 'Sports Nutrition Certification', 9.5, 'Inter', 'normal', '#166534', 50, 27, 'center'),
      mkText('t3', 'This is to certify that', 8.5, 'Inter', 'normal', '#888', 50, 34, 'center'),
      mkText('t4', '{{name}}', 33, 'Poppins', 'bold', '#052E16', 50, 44, 'center', { isPlaceholder: true }),
      mkText('t5', 'has completed all requirements and earned certification in', 8.5, 'Inter', 'normal', '#888', 50, 53, 'center'),
      mkText('t6', '{{program}}', 16, 'Inter', 'bold', '#15803D', 50, 61, 'center', { isPlaceholder: true }),
      mkText('t7', 'Issued: {{date}}', 7.5, 'JetBrains Mono', 'normal', '#A7D7B8', 12, 88, 'left'),
      mkText('t8', 'Reg No: {{id}}', 7.5, 'JetBrains Mono', 'normal', '#A7D7B8', 88, 88, 'right'),
    ]
  },

  {
    id: 'p-48', name: 'Red Cross First Aid Responder', programName: 'Emergency First Aid, CPR & AED Responder Certification',
    category: 'Health & Wellness',
    backgroundColor: '#FFFFFF', backgroundGradient: 'linear-gradient(145deg, #FFF5F5 0%, #FFFFFF 100%)',
    borderColor: '#B91C1C', borderWidth: 6, borderStyle: 'solid', decorFlourish: 'none',
    sealType: 'emerald_shield', sealWidth: 42, showQrCode: true, qrCodeX: 88, qrCodeY: 86, qrCodeWidth: 26,
    logoIconType: 'health', logoX: 50, logoY: 11, logoWidth: 68,
    signatory1: 'Gail McGovern', title1: 'CEO, International Red Cross', signX1: 28, signY1: 78, signWidth1: 88,
    texts: [
      mkText('t1', 'INTERNATIONAL RED CROSS', 10.5, 'Inter', 'bold', '#B91C1C', 50, 21, 'center', { letterSpacing: 2 }),
      mkText('t2', 'Emergency Responder Certification', 9.5, 'Inter', 'normal', '#991B1B', 50, 27, 'center'),
      mkText('t3', 'This is to certify that', 8.5, 'Inter', 'normal', '#888', 50, 34, 'center'),
      mkText('t4', '{{name}}', 33, 'Poppins', 'bold', '#1A0000', 50, 44, 'center', { isPlaceholder: true }),
      mkText('t5', 'has completed life-saving training and certification in', 8.5, 'Inter', 'normal', '#888', 50, 53, 'center'),
      mkText('t6', '{{program}}', 16, 'Inter', 'bold', '#B91C1C', 50, 61, 'center', { isPlaceholder: true }),
      mkText('t7', 'Certified: {{date}}', 7.5, 'JetBrains Mono', 'normal', '#FCA5A5', 12, 88, 'left'),
      mkText('t8', 'Cert ID: {{id}}', 7.5, 'JetBrains Mono', 'normal', '#FCA5A5', 88, 88, 'right'),
    ]
  },

  {
    id: 'p-49', name: 'Zen Mindfulness Instructor', programName: 'Registered Mindfulness & Vipassana Meditation Instructor',
    category: 'Health & Wellness',
    backgroundColor: '#F5F8FC', backgroundGradient: 'linear-gradient(145deg, #F5F8FC 0%, #EEF3FA 100%)',
    borderColor: '#94A3B8', borderWidth: 3, borderStyle: 'solid', borderRadius: 12, decorFlourish: 'none',
    sealType: 'none', showQrCode: true, qrCodeX: 88, qrCodeY: 86, qrCodeWidth: 24,
    logoIconType: 'health', logoX: 50, logoY: 11, logoWidth: 62,
    signatory1: 'Jon Kabat-Zinn', title1: 'Director, Zen Mindfulness Academy', signX1: 28, signY1: 78, signWidth1: 88,
    texts: [
      mkText('t1', 'ZEN MINDFULNESS ACADEMY', 10, 'Inter', 'normal', '#1E293B', 50, 21, 'center', { letterSpacing: 4 }),
      mkText('t2', 'Meditation Instructor Certification', 9, 'Inter', 'normal', '#94A3B8', 50, 27, 'center'),
      mkText('t3', 'This certifies that', 8.5, 'Inter', 'normal', '#888', 50, 34, 'center'),
      mkText('t4', '{{name}}', 32, 'Inter', 'normal', '#1E293B', 50, 44, 'center', { isPlaceholder: true }),
      mkText('t5', 'has completed the required hours and is certified in', 8.5, 'Inter', 'normal', '#888', 50, 53, 'center'),
      mkText('t6', '{{program}}', 15, 'Inter', 'normal', '#475569', 50, 61, 'center', { isPlaceholder: true }),
      mkText('t7', '{{date}}', 7.5, 'Inter', 'normal', '#CBD5E1', 12, 88, 'left'),
      mkText('t8', '{{id}}', 7.5, 'JetBrains Mono', 'normal', '#CBD5E1', 88, 88, 'right'),
    ]
  },

  // ════════════════════════════════════════
  // PROFESSIONAL CERTIFICATIONS (4)
  // ════════════════════════════════════════
  {
    id: 'p-50', name: 'PMP Project Management Professional', programName: 'Project Management Professional (PMP) Credential',
    category: 'Professional Certifications',
    backgroundColor: '#FFFFFF', backgroundGradient: 'linear-gradient(145deg, #F5FAFF 0%, #FFFFFF 100%)',
    borderColor: '#0A3B5C', borderWidth: 6, borderStyle: 'solid', decorFlourish: 'minimal',
    sealType: 'stellar', sealWidth: 42, showQrCode: true, qrCodeX: 50, qrCodeY: 87, qrCodeWidth: 28,
    logoIconType: 'corporate', logoX: 50, logoY: 12, logoWidth: 70,
    signatory1: 'Pierre Le Manh', title1: 'President & CEO, Project Management Institute', signX1: 27, signY1: 77, signWidth1: 90,
    texts: [
      mkText('t1', 'PROJECT MANAGEMENT INSTITUTE', 9.5, 'Space Grotesk', 'bold', '#0A3B5C', 50, 21, 'center', { letterSpacing: 2 }),
      mkText('t2', 'Professional Certification Program', 9.5, 'Inter', 'normal', '#E87722', 50, 27, 'center'),
      mkText('t3', 'This is to certify that', 8.5, 'Inter', 'normal', '#888', 50, 34, 'center'),
      mkText('t4', '{{name}}', 33, 'Poppins', 'bold', '#0A3B5C', 50, 44, 'center', { isPlaceholder: true }),
      mkText('t5', 'has demonstrated project management expertise and earned the', 8.5, 'Inter', 'normal', '#888', 50, 53, 'center'),
      mkText('t6', '{{program}}', 16, 'Space Grotesk', 'bold', '#E87722', 50, 61, 'center', { isPlaceholder: true }),
      mkText('t7', 'Certified: {{date}}', 7.5, 'JetBrains Mono', 'normal', '#B0C8D8', 12, 88, 'left'),
      mkText('t8', 'PMI ID: {{id}}', 7.5, 'JetBrains Mono', 'normal', '#B0C8D8', 88, 88, 'right'),
    ]
  },

  {
    id: 'p-51', name: 'Certified ScrumMaster (CSM)', programName: 'Certified ScrumMaster (CSM) Program',
    category: 'Professional Certifications',
    backgroundColor: '#F0FFF8', backgroundGradient: 'linear-gradient(145deg, #F0FFF8 0%, #E0FAF0 100%)',
    borderColor: '#0F766E', borderWidth: 5, borderStyle: 'solid', borderRadius: 6, decorFlourish: 'minimal',
    sealType: 'gold_medallion', sealWidth: 42, showQrCode: true, qrCodeX: 50, qrCodeY: 87, qrCodeWidth: 28,
    logoIconType: 'corporate', logoX: 50, logoY: 12, logoWidth: 68,
    signatory1: 'Howard Sublett', title1: 'Chief Product Owner, Scrum Alliance', signX1: 25, signY1: 77, signWidth1: 90,
    signatory2: 'Melissa Boggs', title2: 'Chief Agile Officer', signX2: 75, signY2: 77, signWidth2: 90,
    texts: [
      mkText('t1', 'SCRUM ALLIANCE', 14, 'Space Grotesk', 'bold', '#0F766E', 50, 21, 'center', { letterSpacing: 2 }),
      mkText('t2', 'Certified Practitioner Program', 9.5, 'Inter', 'normal', '#0F766E', 50, 27, 'center'),
      mkText('t3', 'This is to certify that', 8.5, 'Inter', 'normal', '#888', 50, 34, 'center'),
      mkText('t4', '{{name}}', 33, 'Poppins', 'bold', '#042F2E', 50, 44, 'center', { isPlaceholder: true }),
      mkText('t5', 'has completed all requirements and been certified as', 8.5, 'Inter', 'normal', '#888', 50, 53, 'center'),
      mkText('t6', '{{program}}', 16, 'Space Grotesk', 'bold', '#0F766E', 50, 61, 'center', { isPlaceholder: true }),
      mkText('t7', 'Issued: {{date}}', 7.5, 'JetBrains Mono', 'normal', '#99F6E4', 12, 88, 'left'),
      mkText('t8', 'Cert ID: {{id}}', 7.5, 'JetBrains Mono', 'normal', '#99F6E4', 88, 88, 'right'),
    ]
  },

  {
    id: 'p-52', name: 'CISSP Security Professional', programName: 'Certified Information Systems Security Professional (CISSP)',
    category: 'Professional Certifications',
    backgroundColor: '#050B14', backgroundGradient: 'radial-gradient(ellipse at center, #0F1E35 0%, #050B14 100%)',
    borderColor: '#D4AF37', borderWidth: 4, borderStyle: 'solid', decorFlourish: 'minimal',
    sealType: 'emerald_shield', sealWidth: 44, showQrCode: true, qrCodeX: 50, qrCodeY: 87, qrCodeWidth: 28,
    logoIconType: 'corporate', logoX: 50, logoY: 12, logoWidth: 70,
    signatory1: 'Clar Rosso', title1: 'CEO, ISC2 Organization', signX1: 27, signY1: 77, signWidth1: 90,
    texts: [
      mkText('t1', 'ISC² CYBERSECURITY', 11, 'Montserrat', 'bold', '#D4AF37', 50, 21, 'center', { letterSpacing: 3 }),
      mkText('t2', 'Certified Information Security Professional', 9, 'Inter', 'normal', '#8B9BAA', 50, 27, 'center'),
      mkText('t3', 'This is to certify that', 8.5, 'Inter', 'normal', '#6B7C8D', 50, 34, 'center'),
      mkText('t4', '{{name}}', 33, 'Montserrat', 'bold', '#FFFFFF', 50, 44, 'center', { isPlaceholder: true }),
      mkText('t5', 'has passed all examination requirements and earned the', 8.5, 'Inter', 'normal', '#8B9BAA', 50, 53, 'center'),
      mkText('t6', '{{program}}', 16, 'Montserrat', 'bold', '#D4AF37', 50, 61, 'center', { isPlaceholder: true }),
      mkText('t7', 'Certified: {{date}}', 7.5, 'JetBrains Mono', 'normal', '#3A4E62', 12, 88, 'left'),
      mkText('t8', 'ISC2 ID: {{id}}', 7.5, 'JetBrains Mono', 'normal', '#3A4E62', 88, 88, 'right'),
    ]
  },

  {
    id: 'p-53', name: 'CFA Chartered Financial Analyst', programName: 'Chartered Financial Analyst (CFA) Charterholder',
    category: 'Professional Certifications',
    backgroundColor: '#F8F5FF', backgroundGradient: 'linear-gradient(145deg, #F8F5FF 0%, #EEE8FF 100%)',
    borderColor: '#0B2B5C', borderWidth: 7, borderStyle: 'double', decorFlourish: 'classic',
    sealType: 'classic', sealWidth: 44, showQrCode: true, qrCodeX: 50, qrCodeY: 87, qrCodeWidth: 28,
    logoIconType: 'corporate', logoX: 50, logoY: 12, logoWidth: 70,
    signatory1: 'Marg Franklin', title1: 'President & CEO, CFA Institute', signX1: 27, signY1: 77, signWidth1: 88,
    texts: [
      mkText('t1', 'CFA INSTITUTE', 15, 'Playfair Display', 'bold', '#0B2B5C', 50, 21, 'center', { letterSpacing: 2 }),
      mkText('t2', 'Chartered Financial Analyst Program', 9.5, 'Lora', 'normal', '#3B5FA0', 50, 27, 'center'),
      mkText('t3', 'This is to solemnly certify that', 9, 'Lora', 'normal', '#888', 50, 34, 'center'),
      mkText('t4', '{{name}}', 33, 'Playfair Display', 'bold', '#0B2B5C', 50, 44, 'center', { isPlaceholder: true }),
      mkText('t5', 'having passed all three levels of examination, is designated as', 8.5, 'Lora', 'normal', '#888', 50, 53, 'center'),
      mkText('t6', '{{program}}', 16, 'Playfair Display', 'bold', '#0B2B5C', 50, 61, 'center', { isPlaceholder: true }),
      mkText('t7', 'Awarded: {{date}}', 8, 'Lora', 'normal', '#A0A8D8', 12, 88, 'left'),
      mkText('t8', 'Charterholder: {{id}}', 8, 'JetBrains Mono', 'normal', '#A0A8D8', 88, 88, 'right'),
    ]
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// Build full CertificateTemplate objects from compact preset definitions
// ─────────────────────────────────────────────────────────────────────────────
const buildTemplate = (def: PresetDef): CertificateTemplate => ({
  id: `preset-${def.id}`,
  workspaceId: '',
  name: def.name,
  layout: 'landscape',
  backgroundColor: def.backgroundColor,
  backgroundGradient: def.backgroundGradient,
  borderColor: def.borderColor,
  borderWidth: def.borderWidth,
  borderRadius: def.borderRadius ?? 0,
  borderStyle: def.borderStyle ?? 'solid',
  decorFlourish: def.decorFlourish ?? 'none',
  showSeal: def.sealType !== 'none',
  sealType: def.sealType,
  sealWidth: def.sealWidth ?? 40,
  showQrCode: def.showQrCode ?? true,
  qrCodeX: def.qrCodeX ?? 50,
  qrCodeY: def.qrCodeY ?? 87,
  qrCodeWidth: def.qrCodeWidth ?? 28,
  logoUrl: '',
  logoIconType: def.logoIconType,
  logoX: def.logoX ?? 50,
  logoY: def.logoY ?? 12,
  logoWidth: def.logoWidth ?? 70,
  signatureUrl: '',
  secondarySignatureUrl: '',
  signatureX: def.signX1 ?? 27,
  signatureY: def.signY1 ?? 77,
  signatureWidth: def.signWidth1 ?? 90,
  signatoryName: def.signatory1,
  signatoryTitle: def.title1,
  showSecondarySignatory: !!def.signatory2,
  secondarySignatoryName: def.signatory2,
  secondarySignatoryTitle: def.title2,
  secondarySignatureX: def.signX2 ?? 73,
  secondarySignatureY: def.signY2 ?? 77,
  secondarySignatureWidth: def.signWidth2 ?? 90,
  textElements: def.texts
});

// ─────────────────────────────────────────────────────────────────────────────
// Export: 53 fully-specified, professional certificate templates
// ─────────────────────────────────────────────────────────────────────────────
export const BEAUTIFUL_PRESETS: (CertificateTemplate & { category: string; programName: string })[] =
  PRESET_DEFINITIONS.map(def => ({
    ...buildTemplate(def),
    category: def.category,
    programName: def.programName
  }));
