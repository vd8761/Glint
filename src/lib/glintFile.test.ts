import { describe, expect, it } from 'vitest';
import type { CertificateTemplate } from '../types';
import {
  GLINT_FILE_MAGIC,
  GLINT_FILE_VERSION,
  GlintFileError,
  glintFileNameFor,
  isGlintFileName,
  parseGlintFile,
  serializeGlintFile,
} from './glintFile';

const sampleTemplate: CertificateTemplate = {
  id: 'tpl-abc123',
  workspaceId: 'ws-xyz789',
  name: 'One Month Industry Program V1',
  layout: 'landscape',
  backgroundColor: '#FFFFFF',
  borderColor: '#0a0a0a',
  borderWidth: 6,
  showSeal: true,
  sealType: 'classic',
  showQrCode: true,
  qrCodeX: 10,
  qrCodeY: 85,
  logoX: 50,
  logoY: 10,
  logoWidth: 100,
  signatureX: 50,
  signatureY: 75,
  signatureWidth: 90,
  signatoryName: 'Jane Doe',
  signatoryTitle: 'Chancellor',
  backgroundImageUrl: 'data:image/png;base64,BG_ASSET',
  logoUrl: 'data:image/png;base64,LOGO_ASSET',
  signatureUrl: 'data:image/png;base64,SIG_ASSET',
  secondarySignatureUrl: 'data:image/png;base64,SIG2_ASSET',
  customFonts: [
    { id: 'f1', family: 'Custom One', fileName: 'one.ttf', dataUrl: 'data:font/ttf;base64,BBBB', format: 'truetype' },
  ],
  textElements: [
    { id: 'et1', text: 'CERTIFICATE', fontSize: 24, fontFamily: 'Inter', fontWeight: 'bold', color: '#0F172A', xPercent: 50, yPercent: 25, align: 'center' },
    { id: 'et3', text: '{{name}}', fontSize: 34, fontFamily: 'Playfair Display', fontWeight: 'bold', color: '#1a73e8', xPercent: 50, yPercent: 48, align: 'center', isPlaceholder: true },
    { id: 'img1', type: 'image', imageUrl: 'data:image/png;base64,INLINE_IMG', text: '', fontSize: 12, fontFamily: 'Inter', fontWeight: 'normal', color: '#000', xPercent: 20, yPercent: 70, align: 'center' },
  ],
};

describe('.glint file format', () => {
  it('round-trips a template, dropping workspace-specific identifiers', () => {
    const text = serializeGlintFile(sampleTemplate);
    const parsed = parseGlintFile(text);

    expect(parsed.name).toBe(sampleTemplate.name);
    // Identity fields are stripped so the import can be re-homed into any workspace.
    expect('id' in parsed.template).toBe(false);
    expect('workspaceId' in parsed.template).toBe(false);
    // Everything else — including inlined assets and fonts — survives intact.
    expect(parsed.template.backgroundImageUrl).toBe(sampleTemplate.backgroundImageUrl);
    expect(parsed.template.customFonts).toEqual(sampleTemplate.customFonts);
    expect(parsed.template.textElements).toEqual(sampleTemplate.textElements);
    expect(parsed.template.borderWidth).toBe(6);
  });

  it('embeds every image asset (background, logo, signatures, inline images) as data URLs', () => {
    const parsed = parseGlintFile(serializeGlintFile(sampleTemplate));
    expect(parsed.template.backgroundImageUrl).toBe('data:image/png;base64,BG_ASSET');
    expect(parsed.template.logoUrl).toBe('data:image/png;base64,LOGO_ASSET');
    expect(parsed.template.signatureUrl).toBe('data:image/png;base64,SIG_ASSET');
    expect(parsed.template.secondarySignatureUrl).toBe('data:image/png;base64,SIG2_ASSET');
    // Fonts and images embedded inside text elements travel too.
    expect(parsed.template.customFonts?.[0].dataUrl).toBe('data:font/ttf;base64,BBBB');
    const inlineImage = parsed.template.textElements.find((el) => el.type === 'image');
    expect(inlineImage?.imageUrl).toBe('data:image/png;base64,INLINE_IMG');
  });

  it('embeds a preview thumbnail only when supplied', () => {
    const withPreview = parseGlintFile(serializeGlintFile(sampleTemplate, 'data:image/png;base64,CCCC'));
    expect(withPreview.preview).toBe('data:image/png;base64,CCCC');

    const withoutPreview = parseGlintFile(serializeGlintFile(sampleTemplate));
    expect(withoutPreview.preview).toBeUndefined();
  });

  it('carries the current magic marker and version in the serialized envelope', () => {
    const envelope = JSON.parse(serializeGlintFile(sampleTemplate));
    expect(envelope.magic).toBe(GLINT_FILE_MAGIC);
    expect(envelope.version).toBe(GLINT_FILE_VERSION);
  });

  it('rejects content that is not JSON', () => {
    expect(() => parseGlintFile('not json at all')).toThrow(GlintFileError);
  });

  it('rejects JSON that lacks the Glint magic marker', () => {
    expect(() => parseGlintFile(JSON.stringify({ template: {} }))).toThrow(/not created by Glint/i);
  });

  it('rejects files from a newer format version', () => {
    const future = JSON.stringify({ magic: GLINT_FILE_MAGIC, version: GLINT_FILE_VERSION + 1, template: {} });
    expect(() => parseGlintFile(future)).toThrow(/newer version/i);
  });

  it('rejects a marker-only file with no template body', () => {
    const empty = JSON.stringify({ magic: GLINT_FILE_MAGIC, version: GLINT_FILE_VERSION });
    expect(() => parseGlintFile(empty)).toThrow(/does not contain a certificate design/i);
  });

  it('recognises .glint filenames case-insensitively', () => {
    expect(isGlintFileName('My Design.glint')).toBe(true);
    expect(isGlintFileName('DESIGN.GLINT')).toBe(true);
    expect(isGlintFileName('photo.png')).toBe(false);
  });

  it('derives a safe download filename from the template name', () => {
    expect(glintFileNameFor('One Month / Program V1')).toBe('One_Month_Program_V1.glint');
    expect(glintFileNameFor('   ')).toBe('glint_template.glint');
  });
});
