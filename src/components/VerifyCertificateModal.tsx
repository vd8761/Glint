/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useRef, useState } from 'react';
import { X, Upload, ShieldCheck, ShieldAlert, Clock, Search, FileText, RefreshCw, ArrowRight } from 'lucide-react';
import type { VerificationResult } from '../types';
import { certIdFromInput, extractCertMetaFromPdf } from '../lib/certPdfMeta';

interface VerifyCertificateModalProps {
  open: boolean;
  onClose: () => void;
}

const btnPrimary =
  'inline-flex items-center justify-center gap-1.5 rounded-md bg-blue-600 px-3.5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60';
const btnSecondary =
  'inline-flex items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-3.5 py-2 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60';
const inputBase =
  'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-[13px] text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500';

type Tone = 'success' | 'warning' | 'error';

interface Outcome {
  tone: Tone;
  title: string;
  message: string;
  /** When set, the result offers a link through to the certificate page. */
  cert?: { id: string; recipientName: string; programName: string };
  /** When true, the certificate-id field is highlighted as the way forward. */
  askForId?: boolean;
}

const TONE_STYLES: Record<Tone, { box: string; icon: string; Icon: typeof ShieldCheck }> = {
  success: { box: 'border-emerald-200 bg-emerald-50', icon: 'text-emerald-600', Icon: ShieldCheck },
  warning: { box: 'border-amber-200 bg-amber-50', icon: 'text-amber-600', Icon: Clock },
  error: { box: 'border-rose-200 bg-rose-50', icon: 'text-rose-600', Icon: ShieldAlert },
};

/** POST the verify endpoint. Resolves to the result, or a 404 marker. */
async function verifyById(id: string): Promise<{ ok: true; data: VerificationResult } | { ok: false; status: number }> {
  const res = await fetch(`/api/certificates/${encodeURIComponent(id)}/verify`, { method: 'POST' });
  if (!res.ok) return { ok: false, status: res.status };
  return { ok: true, data: await res.json() };
}

/** Turn a verify result into what the user sees. */
function outcomeFromResult(data: VerificationResult): Outcome {
  const cert = { id: data.certificate.id, recipientName: data.certificate.recipientName, programName: data.certificate.programName };
  if (!data.signatureValid) {
    return {
      tone: 'error',
      title: 'Signature does not match',
      message: 'This record does not match the registry. It was altered after issuance, or was not issued here.',
      cert,
    };
  }
  if (data.reasons.includes('revoked')) {
    return { tone: 'error', title: 'Revoked', message: 'The signature is valid, but the issuer has revoked this certificate.', cert };
  }
  if (data.reasons.includes('expired')) {
    return { tone: 'warning', title: 'Expired', message: 'The signature is valid, but this certificate has passed its expiry date.', cert };
  }
  return { tone: 'success', title: 'Authentic', message: 'The signature matches the registry and this certificate is currently valid.', cert };
}

export function VerifyCertificateModal({ open, onClose }: VerifyCertificateModalProps) {
  const [input, setInput] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [checking, setChecking] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const idInputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const reset = () => {
    setInput('');
    setFile(null);
    setOutcome(null);
    setChecking(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const close = () => {
    reset();
    onClose();
  };

  /** Resolve a bare id to an outcome via the registry. */
  const checkId = async (id: string): Promise<Outcome> => {
    const res = await verifyById(id);
    if (!res.ok) {
      return {
        tone: 'error',
        title: 'Not found',
        message: `No certificate is registered under “${id}”. Check the identifier and try again.`,
      };
    }
    return outcomeFromResult(res.data);
  };

  const handleVerify = async () => {
    setChecking(true);
    setOutcome(null);
    try {
      // A PDF, when provided, is the richer signal — verify it before any text.
      if (file) {
        const meta = await extractCertMetaFromPdf(file);
        if (!meta) {
          setOutcome({
            tone: 'warning',
            title: 'Could not read this PDF',
            message:
              'This PDF carries no Glint signature — it may have been modified, printed, or re-saved by another program. To check it, enter the certificate ID below and compare the certificate visually.',
            askForId: true,
          });
          idInputRef.current?.focus();
          return;
        }

        const res = await verifyById(meta.id);
        if (!res.ok) {
          setOutcome({
            tone: 'warning',
            title: 'Certificate not found',
            message:
              'The certificate referenced by this PDF is not in the registry. The file may have been modified or printed. Enter the certificate ID below to check it visually.',
            askForId: true,
          });
          idInputRef.current?.focus();
          return;
        }

        // The registry signature is the authority. If the PDF's embedded
        // signature no longer matches it, the file is stale or forged.
        if (meta.signature !== res.data.certificate.signature.toLowerCase()) {
          setOutcome({
            tone: 'warning',
            title: 'This PDF may have been modified',
            message:
              'The signature embedded in this PDF does not match the registry. It may have been edited, printed, or re-saved. Enter the certificate ID below and compare the certificate visually.',
            askForId: true,
          });
          idInputRef.current?.focus();
          return;
        }

        setOutcome(outcomeFromResult(res.data));
        return;
      }

      if (input.trim()) {
        setOutcome(await checkId(certIdFromInput(input)));
        return;
      }

      setOutcome({ tone: 'error', title: 'Nothing to verify', message: 'Enter a certificate ID or link, or choose a PDF file.' });
    } catch {
      setOutcome({ tone: 'error', title: 'Verification failed', message: 'Could not reach the verification service. Try again.' });
    } finally {
      setChecking(false);
    }
  };

  const toneStyle = outcome ? TONE_STYLES[outcome.tone] : null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
      onClick={close}
      role="dialog"
      aria-modal="true"
      aria-label="Verify a certificate"
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h3 className="text-[15px] font-semibold text-slate-900">Verify a certificate</h3>
            <p className="text-[12px] text-slate-500">Check any Glint certificate by ID, link, or PDF.</p>
          </div>
          <button onClick={close} className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-900" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 px-5 py-5">
          <div className="space-y-1.5">
            <label className="block text-[12px] font-medium text-slate-600">Certificate ID or link</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                ref={idInputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                placeholder="GLNT-XXXXX-XXXXX-XXXXX-XXXXX"
                className={`${inputBase} pl-9 ${outcome?.askForId ? 'border-amber-400 ring-1 ring-amber-400' : ''}`}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-slate-100" />
            <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">or</span>
            <span className="h-px flex-1 bg-slate-100" />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[12px] font-medium text-slate-600">Upload the certificate PDF</label>
            <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-[13px] text-slate-600 transition-colors hover:border-slate-400 hover:bg-slate-100">
              {file ? <FileText className="h-4 w-4 shrink-0 text-slate-500" /> : <Upload className="h-4 w-4 shrink-0 text-slate-400" />}
              <span className="min-w-0 flex-1 truncate">{file ? file.name : 'Choose a PDF file…'}</span>
              {file && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="shrink-0 text-slate-400 hover:text-slate-700"
                  aria-label="Remove file"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                onChange={(e) => {
                  setFile(e.target.files?.[0] ?? null);
                  setOutcome(null);
                }}
              />
            </label>
            <p className="text-[11px] text-slate-400">The file name is ignored — verification reads the certificate’s embedded signature.</p>
          </div>

          {/* Result */}
          {outcome && toneStyle && (
            <div className={`flex gap-2.5 rounded-md border p-3 ${toneStyle.box}`}>
              <toneStyle.Icon className={`h-4 w-4 shrink-0 ${toneStyle.icon}`} />
              <div className="min-w-0 space-y-1">
                <p className="text-[13px] font-semibold text-slate-900">{outcome.title}</p>
                <p className="text-[12px] leading-relaxed text-slate-600">{outcome.message}</p>
                {outcome.cert && (
                  <div className="pt-1">
                    <p className="text-[12px] font-medium text-slate-800">{outcome.cert.recipientName}</p>
                    <p className="text-[11px] text-slate-500">{outcome.cert.programName}</p>
                    <button
                      onClick={() => window.location.assign(`/c/${encodeURIComponent(outcome.cert!.id)}`)}
                      className="mt-1.5 inline-flex items-center gap-1 text-[12px] font-medium text-blue-600 hover:text-blue-800"
                    >
                      View certificate <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-4">
          <button onClick={close} className={btnSecondary}>Cancel</button>
          <button onClick={handleVerify} disabled={checking} className={btnPrimary}>
            {checking ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Verifying…</> : <>Verify</>}
          </button>
        </div>
      </div>
    </div>
  );
}
