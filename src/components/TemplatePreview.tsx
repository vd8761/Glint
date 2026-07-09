/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Read-only, self-scaling render of a certificate template.
 *
 * It mirrors the WYSIWYG canvas the editor and the public viewer draw, using
 * the same container-query (`cqw`) unit scale so the layout is faithful at any
 * width — a 200px card thumbnail and a 1120px export look identical. It carries
 * none of the editor's interaction chrome (drag handles, hover labels, snap
 * guides); it just paints the design.
 *
 * `{{name}}`, `{{program}}`, `{{id}}` and `{{date}}` placeholders are filled
 * with sample values so the preview reads like a real certificate.
 */
import { useEffect } from 'react';
import type { CertificateTemplate, CustomFontAsset, RichTextRun, TextElement } from '../types';
import { resolveRichTextRuns } from '../lib/richText';
import { elementTransform } from '../lib/transform';

interface TemplatePreviewProps {
  template: CertificateTemplate;
  /** Stable DOM id so callers can locate the node for rasterization/export. */
  domId?: string;
  className?: string;
  /** Brand name shown in the decorative corner tags. */
  brandName?: string;
}

const SAMPLE_REPLACEMENTS: Record<string, string> = {
  name: 'Alex Rivera',
  program: 'Professional Certification Program',
  id: 'GLNT-PREVIEW-0001',
  date: '2026-06-18',
};

const loadedPreviewFonts = new Set<string>();

/** Register a template's embedded `.ttf` fonts so the preview renders in them. */
async function ensureCustomFont(font: CustomFontAsset): Promise<void> {
  const key = `${font.family}:${font.dataUrl.length}`;
  if (loadedPreviewFonts.has(key)) return;
  try {
    const face = new FontFace(font.family, `url(${font.dataUrl}) format("truetype")`);
    const loaded = await face.load();
    (document.fonts as FontFaceSet).add(loaded);
    loadedPreviewFonts.add(key);
  } catch {
    // A bad font asset should never break the preview; fall back to system fonts.
  }
}

function toNumericWeight(weight: TextElement['fontWeight']): number | string {
  if (weight === 'bold') return 700;
  if (weight === 'medium') return 500;
  if (weight === 'normal') return 400;
  return weight;
}

function runStyle(run: RichTextRun): React.CSSProperties {
  return {
    color: run.color,
    fontWeight: run.fontWeight === 'bold' ? 700 : run.fontWeight === 'medium' ? 500 : run.fontWeight,
    fontStyle: run.fontStyle,
    textDecoration: run.textDecoration,
  };
}

function borderStyleFor(style: CertificateTemplate['borderStyle']): string {
  if (style === 'double') return 'double';
  if (style === 'dashed') return 'dashed';
  if (style === 'none') return 'none';
  return 'solid';
}

export function TemplatePreview({ template, domId, className, brandName }: TemplatePreviewProps) {
  useEffect(() => {
    template.customFonts?.forEach((font) => {
      void ensureCustomFont(font);
    });
  }, [template.customFonts]);

  const hasBackgroundImage = Boolean(template.backgroundImageUrl);

  return (
    <div
      id={domId}
      style={{
        background: hasBackgroundImage
          ? `url(${template.backgroundImageUrl})`
          : template.backgroundGradient || template.backgroundColor,
        backgroundSize: hasBackgroundImage ? 'cover' : undefined,
        backgroundPosition: hasBackgroundImage ? 'center' : undefined,
        backgroundRepeat: hasBackgroundImage ? 'no-repeat' : undefined,
        borderColor: template.borderColor,
        borderWidth: `${template.borderWidth}px`,
        borderStyle: borderStyleFor(template.borderStyle),
        borderRadius: `${template.borderRadius || 0}px`,
        containerType: 'inline-size',
      }}
      className={`aspect-[1.414/1] w-full relative overflow-hidden bg-white ${className || ''}`}
    >
      {/* Symmetrical corner accents */}
      {template.decorFlourish && template.decorFlourish !== 'none' && (
        <>
          <div style={{ borderColor: template.borderColor }} className="absolute top-2 left-2 w-[7%] h-[10%] border-t-2 border-l-2 pointer-events-none rounded-tl-sm opacity-60" />
          <div style={{ borderColor: template.borderColor }} className="absolute top-2 right-2 w-[7%] h-[10%] border-t-2 border-r-2 pointer-events-none rounded-tr-sm opacity-60" />
          <div style={{ borderColor: template.borderColor }} className="absolute bottom-2 left-2 w-[7%] h-[10%] border-b-2 border-l-2 pointer-events-none rounded-bl-sm opacity-60" />
          <div style={{ borderColor: template.borderColor }} className="absolute bottom-2 right-2 w-[7%] h-[10%] border-b-2 border-r-2 pointer-events-none rounded-br-sm opacity-60" />
        </>
      )}

      {/* Decorative corner watermark tags */}
      {template.showWatermarkTags !== false && (
        <>
          <div className="absolute top-[4%] left-[6%] pointer-events-none text-slate-400 font-mono tracking-widest uppercase" style={{ fontSize: '1.6cqw' }}>
            {(brandName || 'Glint') + ' Authorized Dispatch'}
          </div>
          <div className="absolute top-[4%] right-[6%] pointer-events-none text-slate-400 font-mono tracking-widest uppercase" style={{ fontSize: '1.6cqw' }}>
            Authentic_Ledger_Match
          </div>
        </>
      )}

      {/* Logo (uploaded image overrides only; vector monograms are editor-only) */}
      {template.logoUrl && (
        <div
          style={{ position: 'absolute', left: `${template.logoX}%`, top: `${template.logoY}%`, transform: elementTransform(template.logoRotation, template.logoFlipH, template.logoFlipV) }}
          className="z-30"
        >
          <img
            src={template.logoUrl}
            style={{ width: `${template.logoWidth * 0.125}cqw` }}
            className="pointer-events-none select-none max-h-[40%] object-contain"
            alt=""
          />
        </div>
      )}

      {/* Positioned text / image / redaction elements */}
      {template.textElements.map((el) => {
        if (el.type === 'redaction') {
          return (
            <div
              key={el.id}
              style={{
                position: 'absolute',
                left: `${el.xPercent}%`,
                top: `${el.yPercent}%`,
                transform: elementTransform(el.rotation, el.flipH, el.flipV),
                width: `${(el.width || 200) * 0.1125}cqw`,
                height: `${(el.height || 40) * 0.1125}cqw`,
                backgroundColor: el.color || '#FFFFFF',
                opacity: el.opacity !== undefined ? el.opacity : 1,
                zIndex: 15,
              }}
            />
          );
        }

        if (el.type === 'image' && el.imageUrl) {
          return (
            <div
              key={el.id}
              style={{
                position: 'absolute',
                left: `${el.xPercent}%`,
                top: `${el.yPercent}%`,
                transform: elementTransform(el.rotation, el.flipH, el.flipV),
                width: `${(el.width || 120) * 0.125}cqw`,
                zIndex: 20,
              }}
            >
              <img src={el.imageUrl} style={{ width: '100%', objectFit: 'contain' }} className="pointer-events-none select-none" alt="" />
            </div>
          );
        }

        const runs = resolveRichTextRuns(el, SAMPLE_REPLACEMENTS);
        return (
          <div
            key={el.id}
            style={{
              position: 'absolute',
              left: `${el.xPercent}%`,
              top: `${el.yPercent}%`,
              transform: elementTransform(el.rotation, el.flipH, el.flipV),
              color: el.color,
              fontSize: `${el.fontSize * 0.1125}cqw`,
              textAlign: el.align,
              width: el.width ? `${el.width * 0.1125}cqw` : undefined,
              maxWidth: el.width ? undefined : '80cqw',
              boxSizing: 'border-box',
              fontFamily: el.fontFamily,
              fontStyle: el.fontStyle || 'normal',
              fontWeight: toNumericWeight(el.fontWeight),
              textDecoration: el.textDecoration || 'none',
              letterSpacing: el.letterSpacing ? `${el.letterSpacing}px` : undefined,
              lineHeight: el.lineHeight || 'normal',
              whiteSpace: 'pre-wrap',
              overflowWrap: 'break-word',
              opacity: el.opacity !== undefined ? el.opacity : undefined,
              textTransform: el.textTransform || 'none',
              zIndex: 20,
            }}
          >
            {runs.map((run, index) => (
              <span key={`${index}-${run.text}`} style={runStyle(run)}>
                {run.text}
              </span>
            ))}
          </div>
        );
      })}

      {/* Primary signatory */}
      {(template.signatureUrl || template.signatoryName) && (
        <div
          style={{
            position: 'absolute',
            left: `${template.signatureX}%`,
            top: `${template.signatureY}%`,
            transform: elementTransform(template.signatureRotation, template.signatureFlipH, template.signatureFlipV),
            width: `${template.signatureWidth * 0.125}cqw`,
          }}
          className="z-30 text-center"
        >
          {template.signatureUrl ? (
            <img src={template.signatureUrl} style={{ width: '100%' }} className="object-contain mx-auto max-h-[18%]" alt="" />
          ) : (
            <div
              style={{ fontFamily: template.signatoryFontFamily || 'Playfair Display', fontSize: `${(template.signatoryFontSize || 18) * 0.1125}cqw` }}
              className="italic text-slate-800 leading-none"
            >
              {template.signatoryName}
            </div>
          )}
          <div style={{ borderColor: template.borderColor }} className="border-t mt-[6%] mx-auto w-[80%] opacity-40" />
          <p className="font-bold uppercase tracking-widest text-slate-400 leading-tight" style={{ fontSize: '1.4cqw', marginTop: '2%' }}>
            {template.signatoryTitle || 'Signatory Title'}
          </p>
        </div>
      )}

      {/* Secondary signatory */}
      {(template.secondarySignatureUrl || template.showSecondarySignatory) && (
        <div
          style={{
            position: 'absolute',
            left: `${template.secondarySignatureX || 70}%`,
            top: `${template.secondarySignatureY || 78}%`,
            transform: elementTransform(template.secondarySignatureRotation, template.secondarySignatureFlipH, template.secondarySignatureFlipV),
            width: `${(template.secondarySignatureWidth || 100) * 0.125}cqw`,
          }}
          className="z-30 text-center"
        >
          {template.secondarySignatureUrl ? (
            <img src={template.secondarySignatureUrl} style={{ width: '100%' }} className="object-contain mx-auto max-h-[18%]" alt="" />
          ) : (
            <div
              style={{ fontFamily: template.secondarySignatoryFontFamily || 'Playfair Display', fontSize: `${(template.secondarySignatoryFontSize || 18) * 0.1125}cqw` }}
              className="italic text-slate-800 leading-none"
            >
              {template.secondarySignatoryName}
            </div>
          )}
          <div style={{ borderColor: template.borderColor }} className="border-t mt-[6%] mx-auto w-[80%] opacity-40" />
          <p className="font-bold uppercase tracking-widest text-slate-400 leading-tight" style={{ fontSize: '1.4cqw', marginTop: '2%' }}>
            {template.secondarySignatoryTitle || 'Signatory Title'}
          </p>
        </div>
      )}

      {/* Seal + QR marker */}
      {(template.showQrCode || template.showSeal) && (
        <div
          style={{ position: 'absolute', left: `${template.qrCodeX}%`, top: `${template.qrCodeY}%`, transform: 'translate(-50%, -50%)' }}
          className="z-30 flex items-center gap-[1cqw]"
        >
          {template.showSeal && template.sealType !== 'none' && (
            <div
              style={{
                width: `${(template.sealWidth || 40) * 0.125}cqw`,
                height: `${(template.sealWidth || 40) * 0.125}cqw`,
                borderColor: template.borderColor,
              }}
              className="rounded-full border-2 flex items-center justify-center shrink-0 opacity-80"
            >
              <div style={{ borderColor: template.borderColor }} className="rounded-full border w-[70%] h-[70%] flex items-center justify-center">
                <span className="font-serif italic text-slate-500" style={{ fontSize: '1.6cqw' }}>
                  Seal
                </span>
              </div>
            </div>
          )}
          {template.showQrCode && (
            <div
              style={{
                width: `${(template.qrCodeWidth || 32) * 0.125}cqw`,
                height: `${(template.qrCodeWidth || 32) * 0.125}cqw`,
                backgroundImage:
                  'linear-gradient(45deg, #0f172a 25%, transparent 25%, transparent 75%, #0f172a 75%), linear-gradient(45deg, #0f172a 25%, transparent 25%, transparent 75%, #0f172a 75%)',
                backgroundSize: '33% 33%',
                backgroundPosition: '0 0, 16.5% 16.5%',
              }}
              className="shrink-0 border border-slate-900 bg-white"
            />
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Rasterize a rendered {@link TemplatePreview} node to a PNG data URL.
 *
 * The node is cloned into an off-screen 1120×792 box so the `cqw` units resolve
 * at print resolution rather than at the small on-page card width. Returns
 * `null` (never throws) if capture fails, so callers can export without a
 * thumbnail rather than aborting.
 */
export async function captureTemplatePreviewPng(node: HTMLElement): Promise<string | null> {
  let wrapper: HTMLDivElement | null = null;
  try {
    await document.fonts.ready;
    const { default: html2canvas } = await import('html2canvas-pro');

    wrapper = document.createElement('div');
    wrapper.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:1120px;height:792px;overflow:hidden';

    const clone = node.cloneNode(true) as HTMLElement;
    clone.style.cssText += ';width:1120px;height:792px;position:relative;left:0;top:0;margin:0';
    wrapper.appendChild(clone);
    document.body.appendChild(wrapper);

    const canvas = await html2canvas(clone, { scale: 1, useCORS: true, logging: false, backgroundColor: '#ffffff' });
    return canvas.toDataURL('image/png');
  } catch {
    return null;
  } finally {
    if (wrapper?.parentNode) wrapper.parentNode.removeChild(wrapper);
  }
}
