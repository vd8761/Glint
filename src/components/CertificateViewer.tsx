import { toast } from 'sonner';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Award, ShieldCheck, ShieldAlert, BadgeAlert, Printer, Share2, Copy, Check, Database, Landmark, RefreshCw, Sparkles, QrCode, Download, ArrowLeft, Clock } from 'lucide-react';
import type {
  AuditLogEntry,
  CertificateTemplate,
  CustomFontAsset,
  OrganizationBranding,
  PublicCertificate,
  RichTextRun,
} from '../types';
import { resolveRichTextRuns } from '../lib/richText';
import { elementTransform } from '../lib/transform';
import { formatCertificateDate } from '../lib/certificateDate';
import { buildCertPdfKeywords } from '../lib/certPdfMeta';
import { VerifyCertificateModal } from './VerifyCertificateModal';

interface CertificateViewerProps {
  certificateId: string;
  onBackToHome: () => void;
}

/** Certificate links are `/c/<id>`. The origin is wherever this page is served from. */
const certificateUrl = (id: string) => `${window.location.origin}/c/${id}`;

/**
 * Defense in depth: the server already scopes the public `auditTrail` to
 * ISSUED/REVOKED/RESTORED/EXPIRED and swaps `performedBy` for the org name,
 * but the timeline is public-facing, so it's filtered again here rather than
 * trusting the response shape to stay that way forever.
 */
const PUBLIC_HISTORY_EVENTS = new Set(['ISSUED', 'REVOKED', 'RESTORED', 'EXPIRED']);

/* ── Shared design tokens, matching the dashboard shell (Cloudflare-flat) ──── */
const cardCls = 'rounded-lg border border-slate-200 bg-white';
const btnPrimaryCls =
  'inline-flex items-center justify-center gap-1.5 rounded-md bg-blue-600 px-3.5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60';
const btnSecondaryCls =
  'inline-flex items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-3.5 py-2 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60';
const sectionLabelCls = 'text-[11px] font-semibold uppercase tracking-wide text-slate-400';

/** Certificate status → its badge presentation on the public page. */
const STATUS_BADGE = {
  valid: { label: 'Valid', cls: 'border-emerald-200 bg-emerald-50 text-emerald-700', Icon: ShieldCheck },
  revoked: { label: 'Revoked', cls: 'border-rose-200 bg-rose-50 text-rose-700', Icon: ShieldAlert },
  expired: { label: 'Expired', cls: 'border-amber-200 bg-amber-50 text-amber-700', Icon: Clock },
} as const;

/** The Glint wordmark, identical to the one in the dashboard sidebar. */
function GlintMark() {
  return (
    <div className="flex items-center gap-2">
      <svg className="h-7 w-7 shrink-0" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M23 16C23 19.866 19.866 23 16 23C12.134 23 9 19.866 9 16C9 12.134 12.134 9 16 9C18.6 9 20.9 10.4 22.1 12.5" stroke="#0F172A" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M15 16H23" stroke="#0F172A" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M24 7C24 9.2 25.2 10 27 10C25.2 10 24 10.8 24 13C24 10.8 22.8 10 21 10C22.8 10 24 9.2 24 7Z" fill="#F59E0B" />
      </svg>
      <span className="text-[15px] font-semibold tracking-tight text-slate-900">Glint</span>
    </div>
  );
}

const richTextRunStyle = (run: RichTextRun): React.CSSProperties => ({
  color: run.color,
  fontWeight: run.fontWeight === 'bold' ? 700 : (run.fontWeight === 'medium' ? 500 : run.fontWeight),
  fontStyle: run.fontStyle,
  textDecoration: run.textDecoration,
});

export function CertificateViewer({ certificateId, onBackToHome }: CertificateViewerProps) {
  const [cert, setCert] = useState<PublicCertificate | null>(null);
  const [branding, setBranding] = useState<OrganizationBranding | null>(null);
  const [template, setTemplate] = useState<CertificateTemplate | null>(null);
  const [auditTrail, setAuditTrail] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [copied, setCopied] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [showVerify, setShowVerify] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);
  const loadedCustomFontsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    fetchCertificate();
  }, [certificateId]);

  const loadCustomFont = async (font: CustomFontAsset) => {
    const key = `${font.family}:${font.dataUrl.length}`;
    if (loadedCustomFontsRef.current.has(key)) return;

    const face = new FontFace(font.family, `url(${font.dataUrl}) format("truetype")`);
    const loaded = await face.load();
    document.fonts.add(loaded);
    loadedCustomFontsRef.current.add(key);
  };

  useEffect(() => {
    template?.customFonts?.forEach((font) => {
      loadCustomFont(font).catch(() => {
        /* The browser will fall back to the next available family. */
      });
    });
  }, [template?.customFonts]);

  /**
   * One request. The template arrives with the certificate.
   *
   * This used to make a second call to `GET /api/templates`, which requires a
   * bearer token — so for the recipient it returned 401, the error was
   * swallowed, and the page silently rendered a hardcoded fallback template
   * signed by "Thomas Kurian, CEO, Platform Authority". Nobody ever saw the
   * design they had made.
   */
  const fetchCertificate = async () => {
    try {
      setLoading(true);
      setError('');

      const res = await fetch(`/api/certificates/${encodeURIComponent(certificateId)}`);
      if (!res.ok) {
        throw new Error(
          res.status === 404
            ? 'No certificate is registered under this identifier.'
            : 'The verification registry could not be reached.',
        );
      }

      const data = await res.json();
      setCert(data.certificate);
      setBranding(data.branding);
      setTemplate(data.template);
      setAuditTrail(data.auditTrail ?? []);

      // Counters only — the endpoint no longer echoes the whole record back.
      fetch(`/api/certificates/${encodeURIComponent(certificateId)}/stats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'view' }),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((counters) => counters && setCert((prev) => (prev ? { ...prev, ...counters } : prev)))
        .catch(() => {
          /* a view counter is not worth surfacing */
        });
    } catch (err: any) {
      setError(err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  /** Fire-and-forget counter bump. Merges the returned counters into local state. */
  const recordAction = (action: 'download' | 'share') => {
    if (!cert) return;
    fetch(`/api/certificates/${encodeURIComponent(cert.id)}/stats`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((counters) => counters && setCert((prev) => (prev ? { ...prev, ...counters } : prev)))
      .catch(() => {
        /* counters are best-effort */
      });
  };

  const executeDownloadStat = () => {
    if (!cert || cert.status === 'revoked') return;
    recordAction('download');
    window.print();
  };

  /**
   * jsPDF and html2canvas-pro are bundled and imported on demand, rather than
   * pulled from cdnjs and jsdelivr as unpinned global <script> tags on every
   * page load. They add ~500kB, so the import happens on click, not at boot.
   */
  const executePdfDownload = async () => {
    if (!cert || !printRef.current || !template || cert.status === 'revoked') return;
    setIsDownloadingPdf(true);
    recordAction('download');

    let wrapper: HTMLDivElement | null = null;
    try {
      await document.fonts.ready;

      const [{ jsPDF }, { default: html2canvas }] = await Promise.all([
        import('jspdf'),
        import('html2canvas-pro'),
      ]);

      // Render off-screen at a fixed size so the container-query units (cqw) the
      // template uses resolve at print resolution rather than at whatever width
      // the viewport happens to be.
      wrapper = document.createElement('div');
      wrapper.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:1120px;height:792px;overflow:hidden';

      const element = printRef.current.cloneNode(true) as HTMLElement;
      element.style.cssText += ';width:1120px;height:792px;position:relative;left:0;top:0';
      wrapper.appendChild(element);
      document.body.appendChild(wrapper);

      const canvas = await html2canvas(element, { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' });

      const landscape = (template.layout ?? 'landscape') === 'landscape';
      const pdf = new jsPDF({ unit: 'pt', format: 'a4', orientation: landscape ? 'landscape' : 'portrait' });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      // Preserve aspect ratio and centre; stretching to the page corners
      // distorted every certificate that was not exactly A4-proportioned.
      const scale = Math.min(pageWidth / canvas.width, pageHeight / canvas.height);
      const width = canvas.width * scale;
      const height = canvas.height * scale;

      pdf.addImage(
        canvas.toDataURL('image/jpeg', 0.98),
        'JPEG',
        (pageWidth - width) / 2,
        (pageHeight - height) / 2,
        width,
        height,
      );
      // Embed the id + signature so "Verify a certificate" can recognise this
      // file no matter what it is later renamed to. See lib/certPdfMeta.
      pdf.setProperties({
        title: `${cert.recipientName} — ${cert.programName}`,
        subject: `Glint certificate ${cert.id}`,
        author: branding?.brandName || cert.programName,
        keywords: buildCertPdfKeywords(cert.id, cert.signature),
        creator: 'Glint',
      });

      const safeName = cert.recipientName.trim().replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'Certificate';
      pdf.save(`${safeName}_${cert.id}.pdf`);
    } catch (err: any) {
      console.error(err);
      toast.error('Could not generate the PDF. Try the Print option instead.');
    } finally {
      if (wrapper?.parentNode) wrapper.parentNode.removeChild(wrapper);
      setIsDownloadingPdf(false);
    }
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(certificateUrl(certificateId));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    recordAction('share');
  };

  const shareToLinkedIn = () => {
    if (!cert) return;

    // `issueDate` is a plain YYYY-MM-DD. `new Date(...)` on it parses as UTC
    // midnight, which is the previous day west of Greenwich. Split the string.
    const [year, month] = cert.issueDate.split('-');

    const params = new URLSearchParams({
      startTask: 'CERTIFICATION_NAME',
      name: cert.programName,
      organizationName: branding?.brandName || 'Glint',
      issueYear: year || String(new Date().getFullYear()),
      issueMonth: month ? String(Number(month)) : String(new Date().getMonth() + 1),
      certUrl: certificateUrl(cert.id),
      certId: cert.id,
    });

    window.open(`https://www.linkedin.com/profile/add?${params}`, '_blank', 'noopener,noreferrer');
    recordAction('share');
  };

  /**
   * The QR code target. Resolved from the template's custom URL if it has one,
   * otherwise the certificate's own page.
   */
  const qrTargetUrl = (() => {
    if (!cert) return '';
    const pattern = template?.qrCodeCustomUrl || certificateUrl(cert.id);
    let resolved = pattern
      .replaceAll('{{id}}', cert.id)
      .replaceAll('{{name}}', cert.recipientName)
      .replaceAll('{{program}}', cert.programName)
      .replaceAll('{{date}}', cert.issueDate);
    for (const [key, value] of Object.entries(cert.customFields ?? {})) {
      resolved = resolved.replaceAll(`{{${key}}}`, value ?? '');
    }
    return resolved;
  })();

  /**
   * Generated locally.
   *
   * The QR image used to be an <img> pointing at `api.qrserver.com` — a third
   * party that saw the identifier of every certificate anybody opened, and that
   * controlled what the code on a "tamper-proof" certificate actually encoded.
   * It also tainted the html2canvas capture, so it could not appear in the PDF.
   */
  useEffect(() => {
    if (!qrTargetUrl || !template?.showQrCode) {
      setQrDataUrl('');
      return;
    }
    let cancelled = false;
    import('qrcode')
      .then((QRCode) =>
        QRCode.toDataURL(qrTargetUrl, { margin: 0, width: 240, color: { dark: '#0f172a', light: '#ffffff' } }),
      )
      .then((url) => !cancelled && setQrDataUrl(url))
      .catch(() => !cancelled && setQrDataUrl(''));
    return () => {
      cancelled = true;
    };
  }, [qrTargetUrl, template?.showQrCode]);

  const activeTemplate = template;
  const publicHistory = auditTrail.filter((log) => PUBLIC_HISTORY_EVENTS.has(log.event));

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#f6f7f9] p-6 font-sans text-slate-500">
        <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
        <p className="text-[13px]">Loading certificate…</p>
      </div>
    );
  }

  // `!activeTemplate` is a real, visible failure now. Rendering a stand-in
  // template and passing it off as the issuer's design is what this page used to
  // do, and it meant nobody noticed the template was never loading at all.
  if (error || !cert || !activeTemplate) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#f6f7f9] p-6 font-sans">
        <div className={`${cardCls} w-full max-w-md space-y-5 p-8 text-center`}>
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full border border-rose-100 bg-rose-50 text-rose-600">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-[16px] font-semibold text-slate-900">Certificate unavailable</h3>
            <p className="text-[13px] leading-relaxed text-slate-500">
              {error ||
                (cert
                  ? 'This certificate exists, but the template it was issued against is missing. The issuer needs to restore it.'
                  : 'No certificate is registered under this identifier.')}
            </p>
          </div>
          <p className="break-all rounded-md border border-slate-200 bg-slate-50 p-3 text-left font-mono text-[11px] text-slate-400">
            ID: {certificateId || 'unknown'}
          </p>
          <button onClick={onBackToHome} className={`${btnPrimaryCls} w-full`}>
            Return home
          </button>
        </div>
      </div>
    );
  }

  const statusBadge = STATUS_BADGE[cert.status] ?? STATUS_BADGE.valid;
  const StatusIcon = statusBadge.Icon;
  // Prefer the organization name frozen onto the certificate at issue time, so a
  // later rename never rewrites this credential's attribution. Live brand name is
  // only a fallback for legacy certificates issued before the snapshot existed.
  const issuerName = cert.issuerName || branding?.brandName || cert.programName;

  return (
    <div className="min-h-screen bg-[#f6f7f9] font-sans text-slate-800 pb-16 print:bg-white print:pb-0">

      {/* Top bar — matches the dashboard shell */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 md:px-8 print:hidden">
        <div className="flex items-center gap-3">
          <GlintMark />
          <span className="hidden h-4 w-px bg-slate-200 sm:block" />
          <span className="hidden text-[12px] text-slate-500 sm:block">Certificate verification</span>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setShowVerify(true)} className={btnPrimaryCls}>
            <ShieldCheck className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Verify a certificate</span><span className="sm:hidden">Verify</span>
          </button>
          <button type="button" onClick={onBackToHome} className={btnSecondaryCls}>
            <ArrowLeft className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Home</span>
          </button>
        </div>
      </header>

      <VerifyCertificateModal open={showVerify} onClose={() => setShowVerify(false)} />

      {/* Main layout */}
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 pt-6 sm:px-6 md:px-8 lg:grid-cols-12 lg:gap-8 print:block print:m-0 print:max-w-none print:p-0">

        {/* Left: certificate details */}
        <div className="order-2 space-y-6 lg:order-1 lg:col-span-4 print:hidden">

          {/* Status + identity */}
          <div className={`${cardCls} space-y-5 p-5`}>
            <div className="flex items-center justify-between gap-3">
              <span className={sectionLabelCls}>Status</span>
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${statusBadge.cls}`}>
                <StatusIcon className="h-3.5 w-3.5" /> {statusBadge.label}
              </span>
            </div>

            <div className="space-y-1">
              <h1 className="text-[17px] font-semibold leading-tight tracking-tight text-slate-900">{cert.recipientName}</h1>
              <p className="text-[13px] text-slate-500">{cert.programName}</p>
            </div>

            <dl className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
              <div className="space-y-0.5">
                <dt className="text-[11px] text-slate-400">Issued</dt>
                <dd className="text-[13px] font-medium text-slate-900">{formatCertificateDate(cert.issueDate, activeTemplate.dateFormat)}</dd>
              </div>
              <div className="space-y-0.5">
                <dt className="text-[11px] text-slate-400">Expires</dt>
                <dd className="text-[13px] font-medium text-slate-900">
                  {cert.expiryDate ? formatCertificateDate(cert.expiryDate, activeTemplate.dateFormat) : 'No expiry'}
                </dd>
              </div>
            </dl>

            {cert.status === 'revoked' && (
              <div className="flex gap-2 rounded-md border border-rose-200 bg-rose-50 p-3">
                <BadgeAlert className="h-4 w-4 shrink-0 text-rose-600" />
                <div className="space-y-0.5">
                  <p className="text-[12px] font-semibold text-rose-800">This certificate has been revoked</p>
                  <p className="text-[12px] leading-relaxed text-rose-700">{cert.revocationReason || 'Revoked by the issuer.'}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
              <div className="space-y-0.5">
                <p className="text-[11px] text-slate-400">Views</p>
                <p className="text-lg font-semibold tracking-tight text-slate-900">{cert.viewCount || 0}</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[11px] text-slate-400">Downloads</p>
                <p className="text-lg font-semibold tracking-tight text-slate-900">{cert.downloadCount || 0}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-4">
              <button onClick={copyUrl} className={btnSecondaryCls}>
                {copied ? <><Check className="h-3.5 w-3.5" /> Copied</> : <><Copy className="h-3.5 w-3.5" /> Copy link</>}
              </button>
              <button onClick={shareToLinkedIn} disabled={cert.status === 'revoked'} className={btnSecondaryCls}>
                <Share2 className="h-3.5 w-3.5" /> Share
              </button>
            </div>
          </div>

          {/* Signature */}
          <div className={`${cardCls} space-y-4 p-5`}>
            <div className="flex items-center justify-between">
              <span className={sectionLabelCls}>Signature</span>
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">{cert.signatureAlg}</span>
            </div>
            <p className="text-[12px] leading-relaxed text-slate-500">
              Signed by the issuer over the recipient, program, and dates — this is what a verifier recomputes to confirm the record is authentic.
            </p>
            <p className="break-all rounded-md border border-slate-200 bg-slate-50 p-3 font-mono text-[11px] leading-relaxed text-slate-700">{cert.signature}</p>
            <div className="space-y-1 border-t border-slate-100 pt-4">
              <p className="text-[11px] text-slate-400">Issued by</p>
              <div className="flex items-center gap-2">
                <Landmark className="h-3.5 w-3.5 text-slate-600" />
                <span className="text-[13px] font-medium text-slate-900">{issuerName}</span>
              </div>
              {branding?.customDomain && <p className="text-[11px] text-slate-400">{branding.customDomain}</p>}
            </div>
          </div>
        </div>

        {/* Right: certificate preview + history */}
        <div className="order-1 space-y-6 lg:order-2 lg:col-span-8 print:m-0 print:space-y-0 print:p-0">

          {/* Certificate preview */}
          <div className="print:space-y-0">
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white p-1 sm:p-6 md:p-10 print:border-none print:p-0 printable-certificate-outer">
              <div 
                ref={printRef}
                style={{
                  background: activeTemplate.backgroundImageUrl 
                    ? `url(${activeTemplate.backgroundImageUrl})` 
                    : (activeTemplate.backgroundGradient || activeTemplate.backgroundColor),
                  backgroundSize: activeTemplate.backgroundImageUrl ? 'cover' : undefined,
                  backgroundPosition: activeTemplate.backgroundImageUrl ? 'center' : undefined,
                  backgroundRepeat: activeTemplate.backgroundImageUrl ? 'no-repeat' : undefined,
                  borderColor: activeTemplate.borderColor,
                  borderWidth: `${activeTemplate.borderWidth}px`,
                  borderStyle: activeTemplate.borderStyle === 'double' ? 'double' : (activeTemplate.borderStyle === 'dashed' ? 'dashed' : (activeTemplate.borderStyle === 'none' ? 'none' : 'solid')),
                  borderRadius: `${activeTemplate.borderRadius || 0}px`,
                  position: 'relative',
                  containerType: 'inline-size',
                  filter: cert.status === 'revoked' ? 'grayscale(50%) contrast(90%)' : undefined
                }}
                className="aspect-[1.414/1] w-full rounded-lg relative transition-all duration-300 shadow-sm overflow-hidden p-6 lg:p-12 print:aspect-[1.414/1] printable-certificate"
              >
                
                {/* Vintage Corner Ornaments */}
                {activeTemplate.decorFlourish && activeTemplate.decorFlourish !== 'none' && (
                  <>
                    {/* Top-Left */}
                    <div style={{ borderColor: activeTemplate.borderColor }} className="absolute top-2 left-2 w-8 h-8 lg:w-12 lg:h-12 border-t-2 border-l-2 pointer-events-none rounded-tl-sm opacity-60"></div>
                    {/* Top-Right */}
                    <div style={{ borderColor: activeTemplate.borderColor }} className="absolute top-2 right-2 w-8 h-8 lg:w-12 lg:h-12 border-t-2 border-r-2 pointer-events-none rounded-tr-sm opacity-60"></div>
                    {/* Bottom-Left */}
                    <div style={{ borderColor: activeTemplate.borderColor }} className="absolute bottom-2 left-2 w-8 h-8 lg:w-12 lg:h-12 border-b-2 border-l-2 pointer-events-none rounded-bl-sm opacity-60"></div>
                    {/* Bottom-Right */}
                    <div style={{ borderColor: activeTemplate.borderColor }} className="absolute bottom-2 right-2 w-8 h-8 lg:w-12 lg:h-12 border-b-2 border-r-2 pointer-events-none rounded-tr-sm opacity-60"></div>
                  </>
                )}

                {/* Organization background watermark pattern */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[85%] h-[85%] opacity-[0.02] border border-slate-900 rounded-full pointer-events-none flex items-center justify-center">
                  <Landmark className="w-[45%]" />
                </div>

                {/* Predefined Dynamic Canva Logo overrides */}
                {(activeTemplate.logoUrl || (activeTemplate.logoIconType && activeTemplate.logoIconType !== 'none')) && (
                  <div
                    style={{
                      position: 'absolute',
                      left: `${activeTemplate.logoX}%`,
                      top: `${activeTemplate.logoY}%`,
                      transform: elementTransform(activeTemplate.logoRotation, activeTemplate.logoFlipH, activeTemplate.logoFlipV),
                    }}
                    className="flex justify-center items-center pointer-events-none select-none z-30"
                  >
                    {activeTemplate.logoUrl ? (
                      <img 
                        src={activeTemplate.logoUrl} 
                        style={{ width: `${(activeTemplate.logoWidth || 70) * 0.125}cqw` }} 
                        className="max-h-32 object-contain"
                        alt="Logo"
                      />
                    ) : (() => {
                      const width = activeTemplate.logoWidth || 70;
                      const type = activeTemplate.logoIconType;
                      return (
                        <div style={{ width: `${width * 0.125}cqw` }} className="flex items-center justify-center">
                          {type === 'tech' && (
                            <div className="w-full aspect-square bg-gradient-to-tr from-cyan-500 to-indigo-500 rounded-lg p-2 shadow-sm flex items-center justify-center text-white">
                              <Sparkles className="w-2/3 h-2/3" />
                            </div>
                          )}
                          {type === 'edu' && (
                            <div className="w-full aspect-square bg-gradient-to-tr from-amber-600 to-rose-700 rounded-full p-2 shadow-sm flex items-center justify-center text-white">
                              <Award className="w-2/3 h-2/3" />
                            </div>
                          )}
                          {type === 'corp' && (
                            <div className="w-full aspect-square bg-slate-900 border border-slate-600 rounded-sm p-2 shadow-sm flex items-center justify-center text-white">
                              <div className="w-4 h-4 border border-white rounded-full flex items-center justify-center text-[7px]">★</div>
                            </div>
                          )}
                          {type === 'science' && (
                            <div className="w-full aspect-square bg-indigo-950 border border-indigo-400 rounded-full p-2 flex items-center justify-center text-sky-400">
                              <QrCode className="w-2/3 h-2/3" />
                            </div>
                          )}
                          {type === 'art' && (
                            <div className="w-full aspect-square bg-rose-50 border border-rose-200 rounded-xl p-2 flex items-center justify-center text-rose-500">
                              <div className="text-sm">❀</div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Absolute Canvas Custom Text Layers */}
                {activeTemplate.textElements.map((el) => {
                  if (el.type === 'redaction') {
                    const leftPct = el.xPercent !== undefined ? el.xPercent : 50;
                    const topPct = el.yPercent !== undefined ? el.yPercent : 50;
                    return (
                      <div
                        key={el.id}
                        style={{
                          position: 'absolute',
                          left: `${leftPct}%`,
                          top: `${topPct}%`,
                          transform: elementTransform(el.rotation, el.flipH, el.flipV),
                          width: `${(el.width || 200) * 0.1125}cqw`,
                          height: `${(el.height || 40) * 0.1125}cqw`,
                          backgroundColor: el.color || '#FFFFFF',
                          zIndex: 15,
                          opacity: el.opacity !== undefined ? el.opacity : 1
                        }}
                        className="select-none pointer-events-none"
                      />
                    );
                  }

                  if (el.imageUrl) {
                    const leftPct = el.xPercent !== undefined ? el.xPercent : 50;
                    const topPct = el.yPercent !== undefined ? el.yPercent : 50;
                    return (
                      <div
                        key={el.id}
                        style={{
                          position: 'absolute',
                          left: `${leftPct}%`,
                          top: `${topPct}%`,
                          transform: elementTransform(el.rotation, el.flipH, el.flipV),
                          width: `${(el.width || 120) * 0.125}cqw`,
                          zIndex: 20
                        }}
                        className="select-none z-20 pointer-events-none"
                      >
                        <img 
                          src={el.imageUrl}
                          style={{ width: '100%', maxHeight: '200px', objectFit: 'contain' }}
                          className="pointer-events-none select-none mx-auto"
                          alt="Custom Element"
                        />
                      </div>
                    );
                  }

                  const replacements = {
                    name: cert.recipientName,
                    program: cert.programName,
                    date: formatCertificateDate(cert.issueDate, activeTemplate.dateFormat),
                    id: cert.id,
                    ...(cert.customFields ?? {}),
                  };
                  const richText = resolveRichTextRuns(el, replacements);

                  // Font details
                  let fontClass = 'font-sans';
                  if (el.fontFamily === 'Space Grotesk') fontClass = 'font-display select-none';
                  if (el.fontFamily === 'Playfair Display') fontClass = 'font-serif italic select-none';
                  if (el.fontFamily === 'JetBrains Mono') fontClass = 'font-mono text-[9px] uppercase tracking-widest';

                  let weightClass = 'font-normal';
                  if (el.fontWeight === 'medium') weightClass = 'font-medium';
                  if (el.fontWeight === 'bold') weightClass = 'font-bold';

                  const leftPct = el.xPercent !== undefined ? el.xPercent : 50;
                  const topPct = el.yPercent !== undefined ? el.yPercent : 50;

                  return (
                    <div 
                      key={el.id}
                      style={{
                        position: 'absolute',
                        left: `${leftPct}%`,
                        top: `${topPct}%`,
                        transform: elementTransform(el.rotation, el.flipH, el.flipV),
                        color: el.color,
                        textAlign: (el.align || 'center') as any,
                        fontSize: `${el.fontSize * 0.1125}cqw`,
                        fontFamily: el.fontFamily,
                        fontStyle: el.fontStyle || 'normal',
                        fontWeight: el.fontWeight === 'bold' ? 700 : (el.fontWeight === 'medium' ? 500 : 400),
                        textDecoration: el.textDecoration || 'none',
                        letterSpacing: el.letterSpacing ? `${el.letterSpacing}px` : '0.05px',
                        lineHeight: el.lineHeight || 'normal',
                        width: el.width ? `${el.width * 0.1125}cqw` : undefined,
                        maxWidth: el.width ? undefined : '57.6cqw',
                        boxSizing: 'border-box',
                        whiteSpace: 'pre-wrap',
                        overflowWrap: 'break-word',
                        opacity: el.opacity !== undefined ? el.opacity : undefined,
                        textTransform: el.textTransform || 'none'
                      }}
                      className={`${fontClass} ${weightClass} leading-snug break-words z-20 print:text-xs`}
                    >
                      {richText.map((run, index) => (
                        <span key={`${index}-${run.text}`} style={richTextRunStyle(run)}>
                          {run.text}
                        </span>
                      ))}
                    </div>
                  );
                })}

                {/* Absolute Primay signatory line */}
                {(activeTemplate.signatureUrl || activeTemplate.signatoryName) && (
                  <div
                    style={{
                      position: 'absolute',
                      left: `${activeTemplate.signatureX}%`,
                      top: `${activeTemplate.signatureY}%`,
                      transform: elementTransform(activeTemplate.signatureRotation, activeTemplate.signatureFlipH, activeTemplate.signatureFlipV),
                      width: `${activeTemplate.signatureWidth * 0.125}cqw`,
                    }}
                    className="text-center select-none z-30"
                  >
                    {activeTemplate.signatureUrl ? (
                      <img 
                        src={activeTemplate.signatureUrl}
                        style={{ width: `${activeTemplate.signatureWidth * 0.125}cqw` }}
                        className="pointer-events-none select-none object-contain mx-auto max-h-16"
                        alt="Signature"
                      />
                    ) : (
                      <div 
                        style={{ 
                          fontFamily: activeTemplate.signatoryFontFamily || (activeTemplate.signatureStyle === 'bold_brush' ? 'sans-serif' : (activeTemplate.signatureStyle === 'executive' ? '"JetBrains Mono", monospace' : '"Playfair Display", serif')),
                          fontStyle: 'italic',
                          fontSize: activeTemplate.signatoryFontSize ? `${activeTemplate.signatoryFontSize * 0.09}cqw` : undefined,
                          letterSpacing: '0.05px'
                        }}
                        className="text-center border-b border-slate-300 pb-0.5 text-slate-800"
                      >
                        {activeTemplate.signatoryName}
                      </div>
                    )}
                    <p 
                      style={{
                        fontFamily: activeTemplate.signatoryFontFamily || 'Inter',
                        fontSize: activeTemplate.signatoryFontSize ? `${(activeTemplate.signatoryFontSize * 0.4) * 0.09}cqw` : undefined,
                        letterSpacing: '0.05px'
                      }}
                      className="font-bold uppercase tracking-widest text-[#64748B] mt-1 leading-tight text-[7px]"
                    >
                      {activeTemplate.signatoryTitle}
                    </p>
                  </div>
                )}

                {/*
                  Only draw a second signature line when there is actually
                  something to draw. `showSecondarySignatory` alone used to be
                  enough, and the empty name fell back to "Dr. Clara Masters,
                  Admissions Registrar" — an invented person, signing a real
                  certificate.
                */}
                {(activeTemplate.secondarySignatureUrl ||
                  (activeTemplate.showSecondarySignatory && activeTemplate.secondarySignatoryName)) && (
                  <div
                    style={{
                      position: 'absolute',
                      left: `${activeTemplate.secondarySignatureX || 70}%`,
                      top: `${activeTemplate.secondarySignatureY || 78}%`,
                      transform: elementTransform(activeTemplate.secondarySignatureRotation, activeTemplate.secondarySignatureFlipH, activeTemplate.secondarySignatureFlipV),
                      width: `${(activeTemplate.secondarySignatureWidth || 100) * 0.125}cqw`,
                    }}
                    className="text-center select-none z-30"
                  >
                    {activeTemplate.secondarySignatureUrl ? (
                      <img 
                        src={activeTemplate.secondarySignatureUrl}
                        style={{ width: `${(activeTemplate.secondarySignatureWidth || 100) * 0.125}cqw` }}
                        className="pointer-events-none select-none object-contain mx-auto max-h-16"
                        alt="Secondary Signature"
                      />
                    ) : (
                      <div 
                        style={{ 
                          fontFamily: activeTemplate.secondarySignatoryFontFamily || (activeTemplate.signatureStyle === 'bold_brush' ? 'sans-serif' : (activeTemplate.signatureStyle === 'executive' ? '"JetBrains Mono", monospace' : '"Playfair Display", serif')),
                          fontStyle: 'italic',
                          fontSize: activeTemplate.secondarySignatoryFontSize ? `${activeTemplate.secondarySignatoryFontSize * 0.09}cqw` : undefined,
                          letterSpacing: '0.05px'
                        }}
                        className="text-center border-b border-slate-300 pb-0.5 text-slate-800"
                      >
                        {activeTemplate.secondarySignatoryName}
                      </div>
                    )}
                    <p 
                      style={{
                        fontFamily: activeTemplate.secondarySignatoryFontFamily || 'Inter',
                        fontSize: activeTemplate.secondarySignatoryFontSize ? `${(activeTemplate.secondarySignatoryFontSize * 0.4) * 0.09}cqw` : undefined,
                        letterSpacing: '0.05px'
                      }}
                      className="font-bold uppercase tracking-widest text-[#64748B] mt-1 leading-tight text-[7px]"
                    >
                      {activeTemplate.secondarySignatoryTitle}
                    </p>
                  </div>
                )}

                {/* Absolute Stamp and Secure QR blocks combo */}
                {(activeTemplate.showQrCode || activeTemplate.showSeal) && (
                  <div
                    style={{
                      position: 'absolute',
                      left: `${activeTemplate.qrCodeX}%`,
                      top: `${activeTemplate.qrCodeY}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                    className="flex items-center gap-2 select-none z-30"
                  >
                    {activeTemplate.showSeal && (
                      <div 
                        style={{ 
                          width: `${(activeTemplate.sealWidth || 40) * 0.125}cqw`, 
                          height: `${(activeTemplate.sealWidth || 40) * 0.125}cqw` 
                        }} 
                        className="inline-flex items-center justify-center rounded-full border border-amber-500/30 shrink-0"
                      >
                        {activeTemplate.sealType === 'classic' && (
                          <div className="w-full h-full rounded-full border border-dashed border-amber-500 flex items-center justify-center text-amber-600 font-bold text-[1.2cqw] bg-amber-50/10">🏆</div>
                        )}
                        {activeTemplate.sealType === 'stellar' && (
                          <div className="w-full h-full rounded-full bg-slate-900 border border-cyan-400 text-cyan-400 flex items-center justify-center font-bold text-[1.2cqw]">✧</div>
                        )}
                        {activeTemplate.sealType === 'modern' && (
                          <div className="w-full h-full rounded-full bg-indigo-500 text-white flex items-center justify-center text-[0.7cqw] font-bold">VERIFIED</div>
                        )}
                        {activeTemplate.sealType === 'crimson_wax' && (
                          <div className="w-full h-full bg-rose-700 text-amber-300 rounded-full flex items-center justify-center font-serif font-bold text-[0.8cqw] border border-amber-500/20 shadow">SEAL</div>
                        )}
                        {activeTemplate.sealType === 'emerald_shield' && (
                          <div className="w-full h-full bg-emerald-900 text-amber-300 rounded flex items-center justify-center font-bold text-[1.2cqw] shadow">⛨</div>
                        )}
                        {activeTemplate.sealType === 'gold_medallion' && (
                          <div className="w-full h-full bg-gradient-to-tr from-yellow-600 via-amber-400 to-yellow-600 border border-yellow-300 rounded-full flex items-center justify-center text-yellow-950 font-serif font-bold text-[0.8cqw] shadow">🏅</div>
                        )}
                      </div>
                    )}

                    {activeTemplate.showQrCode && qrDataUrl && (
                      <a
                        href={qrTargetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          width: `${(activeTemplate.qrCodeWidth || 32) * 0.125}cqw`,
                          height: `${(activeTemplate.qrCodeWidth || 32) * 0.125}cqw`,
                        }}
                        className="bg-white p-0.5 rounded-sm border border-slate-200 shadow-sm flex items-center justify-center hover:scale-110 transition-transform cursor-pointer shrink-0"
                        title="Verify this certificate"
                      >
                        <img src={qrDataUrl} alt="Verification QR code" className="w-full h-full object-contain" />
                      </a>
                    )}
                  </div>
                )}

                {/* Diagonal professional Revoked/Void overlay stamp */}
                {cert.status === 'revoked' && (
                  <div className="absolute inset-0 bg-rose-50/10 backdrop-blur-[0.5px] flex items-center justify-center z-40 select-none pointer-events-none">
                    <div className="border-[0.5cqw] border-rose-600/70 rounded-[1.5cqw] px-[4cqw] py-[2cqw] transform -rotate-[15deg] bg-white/95 shadow-xl flex flex-col items-center justify-center gap-[0.5cqw] max-w-[80%]">
                      <span className="text-rose-600 font-serif font-extrabold tracking-widest text-[3.5cqw] uppercase leading-none">
                        REVOKED / VOID
                      </span>
                      <span className="text-[1.2cqw] text-rose-500 font-mono uppercase tracking-[0.2cqw] font-bold">
                        Certificate Nullified
                      </span>
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>

          {/* Certificate ID + actions, anchored under the preview */}
          <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center print:hidden">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400">Certificate ID</span>
              <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[12px] font-medium text-slate-700">{cert.id}</span>
            </div>

            <div className="flex items-center gap-2">
              {cert.status !== 'revoked' && (
                <button onClick={executeDownloadStat} className={btnSecondaryCls}>
                  <Printer className="h-3.5 w-3.5" /> Print
                </button>
              )}
              <button
                onClick={executePdfDownload}
                disabled={isDownloadingPdf || cert.status === 'revoked'}
                className={btnPrimaryCls}
              >
                <Download className="h-3.5 w-3.5" /> {cert.status === 'revoked' ? 'Unavailable' : (isDownloadingPdf ? 'Downloading…' : 'Download PDF')}
              </button>
            </div>
          </div>

          {/* Certificate history */}
          <div className={`${cardCls} space-y-5 p-5 print:hidden`}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-900">
                <Database className="h-4 w-4 text-slate-400" /> Certificate history
              </h4>
              <span className="text-[11px] text-slate-400">
                {publicHistory.length} {publicHistory.length === 1 ? 'event' : 'events'}
              </span>
            </div>

            <ol>
              {publicHistory.map((log, idx) => {
                const isLast = idx === publicHistory.length - 1;
                const dotCls =
                  log.event === 'REVOKED' ? 'bg-rose-500' :
                  log.event === 'EXPIRED' ? 'bg-amber-500' :
                  log.event === 'RESTORED' ? 'bg-sky-500' :
                  log.event === 'ISSUED' ? 'bg-emerald-500' : 'bg-slate-400';
                const badgeCls =
                  log.event === 'REVOKED' ? 'border-rose-200 bg-rose-50 text-rose-700' :
                  log.event === 'EXPIRED' ? 'border-amber-200 bg-amber-50 text-amber-700' :
                  log.event === 'RESTORED' ? 'border-sky-200 bg-sky-50 text-sky-700' :
                  log.event === 'ISSUED' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' :
                  'border-slate-200 bg-slate-50 text-slate-600';
                return (
                  <li key={idx} className="grid grid-cols-[12px_1fr] gap-x-3">
                    {/* Marker column: dot + connector share one centered axis, so they always line up */}
                    <div className="flex flex-col items-center">
                      <span className={`mt-1 h-3 w-3 shrink-0 rounded-full ${dotCls}`} />
                      {!isLast && <span className="mt-1 w-px grow bg-slate-200" />}
                    </div>
                    <div className={`space-y-1 ${isLast ? '' : 'pb-5'}`}>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${badgeCls}`}>
                          {log.event}
                        </span>
                        <span className="text-[11px] text-slate-400">{new Date(log.timestamp).toLocaleString()}</span>
                      </div>
                      {log.details && <p className="text-[12px] leading-relaxed text-slate-600">{log.details}</p>}
                      {/*
                        Attribution is always the issuing organization, never a
                        person. The server already maps this to the org name, but
                        the public page never renders `log.performedBy` directly —
                        that field can be a staff email, which must never surface
                        here even if a stale/older backend leaves it unmapped.
                      */}
                      <p className="text-[11px] text-slate-400">{issuerName}</p>
                    </div>
                  </li>
                );
              })}
            </ol>

            <p className="border-t border-slate-100 pt-3 text-[11px] text-slate-400">
              Timestamps are recorded in UTC by the issuer.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
