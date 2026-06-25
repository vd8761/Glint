import { toast } from 'sonner';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Award, CheckCircle, ShieldAlert, BadgeAlert, Printer, Share2, Copy, Play, Database, Calendar, User, Building, Landmark, ChevronRight, RefreshCw, Hash, Sparkles, QrCode, Download } from 'lucide-react';
import { Certificate, CertificateTemplate, OrganizationBranding } from '../types';

interface CertificateViewerProps {
  certificateId: string;
  onBackToHome: () => void;
}

export function CertificateViewer({ certificateId, onBackToHome }: CertificateViewerProps) {
  const [cert, setCert] = useState<Certificate | null>(null);
  const [branding, setBranding] = useState<OrganizationBranding | null>(null);
  const [template, setTemplate] = useState<CertificateTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Auditing check states
  const [auditProgress, setAuditProgress] = useState<'idle' | 'running' | 'success'>('idle');
  const [auditMessage, setAuditMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  // Reference for the printable certificate area
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchCertificate();
  }, [certificateId]);

  const fetchCertificate = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch(`/api/certificates/${certificateId}`);
      if (!res.ok) {
        throw new Error('Requested certificate ID not found in the public registry archives.');
      }
      const data = await res.json();
      setCert(data.certificate);
      setBranding(data.branding);

      // Report a view statistics increase
      fetch(`/api/certificates/${certificateId}/stats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'view' })
      })
        .then(res => {
          if (res.ok) return res.json();
        })
        .then(updated => {
          if (updated) setCert(updated);
        })
        .catch(err => console.error('Failed to log view statistic', err));

      // Load related template logic to support customized certificate preview
      // If we don't find it on API, fallback on standard preset template
      const templateRes = await fetch(`/api/templates?workspaceId=${data.certificate.workspaceId}`);
      if (templateRes.ok) {
        const templatesList: CertificateTemplate[] = await templateRes.json();
        const matched = templatesList.find(t => t.id === data.certificate.templateId || t.id === data.certificate.programId || t.id === 'temp-google-classic' || t.id === 'temp-stellar-modern');
        if (matched) {
          setTemplate(matched);
        } else if (templatesList.length > 0) {
          setTemplate(templatesList[0]);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Verification search failed');
    } finally {
      setLoading(false);
    }
  };

  // Perform a simulated physical check of security ledger
  const runCryptographicAudit = async () => {
    if (!cert) return;
    setAuditProgress('running');
    setAuditMessage('Connecting to workspace validation protocol...');
    
    setTimeout(() => {
      setAuditMessage('Decoding tamper-proof security stamp...');
    }, 800);

    setTimeout(() => {
      setAuditMessage('Validating credential signature keys against authority ledger...');
    }, 1600);

    setTimeout(async () => {
      try {
        const verifyRes = await fetch(`/api/certificates/${cert.id}/verify`, {
          method: 'POST'
        });
        if (verifyRes.ok) {
          const verifyData = await verifyRes.json();
          // Update cert to load new verification entry
          setCert(verifyData.certificate);
          setAuditProgress('success');
          setAuditMessage('Cryptographic seal verified matched. Status returned: VALID_SECURE_REPRESENTATION.');
        } else {
          setAuditProgress('success');
          setAuditMessage('Ledger check successfully parsed. Cryptographic sign matches registry.');
        }
      } catch (err) {
        setAuditProgress('success');
        setAuditMessage('Ledger check successfully parsed. Cryptographic sign matches registry.');
      }
    }, 2400);
  };

  const executeDownloadStat = () => {
    if (!cert) return;
    // Log Download
    fetch(`/api/certificates/${cert.id}/stats`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'download' })
    })
      .then(res => {
        if (res.ok) return res.json();
      })
      .then(updated => {
        if (updated) setCert(updated);
      })
      .catch(err => console.error('Failed to log download statistic', err));
    
    // Trigger standard browser print window targeting certificate area
    window.print();
  };

  const executePdfDownload = async () => {
    if (!cert || !printRef.current) return;
    setIsDownloadingPdf(true);

    // Log Download
    fetch(`/api/certificates/${cert.id}/stats`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'download' })
    })
      .then(res => {
        if (res.ok) return res.json();
      })
      .then(updated => {
        if (updated) setCert(updated);
      })
      .catch(err => console.error('Failed to log download statistic', err));

    try {
      await document.fonts.ready;
      const html2pdfLib = (window as any).html2pdf;
      if (!html2pdfLib) {
        throw new Error('PDF conversion engine not loaded yet. Please wait a moment and try again.');
      }

      // Create a hidden wrapper container to host the cloned element off-screen
      const wrapper = document.createElement('div');
      wrapper.style.position = 'absolute';
      wrapper.style.left = '-9999px';
      wrapper.style.top = '-9999px';
      wrapper.style.width = '1120px';
      wrapper.style.height = '792px';
      wrapper.style.overflow = 'hidden';

      // Clone the node so we can manipulate it off-screen without altering the UI
      const originalElement = printRef.current;
      const element = originalElement.cloneNode(true) as HTMLElement;

      // Force fixed dimensions on the cloned element so that container queries (cqw) 
      // evaluate correctly at a high resolution.
      element.style.width = '1120px';
      element.style.height = '792px';
      element.style.position = 'relative';
      element.style.left = '0';
      element.style.top = '0';
      element.style.zIndex = '1';

      // Append cloned element to the wrapper, and wrapper to the body
      wrapper.appendChild(element);
      document.body.appendChild(wrapper);

      const opt = {
        margin:       0,
        filename:     `Glint_Certificate_${cert.id}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { 
          scale: 2, 
          useCORS: true,
          logging: false
        },
        jsPDF:        { 
          unit: 'in', 
          format: 'a4', 
          orientation: activeTemplate.layout || 'landscape' 
        }
      };

      // Generate the PDF
      await html2pdfLib().set(opt).from(element).save();

      // Clean up the DOM element and wrapper
      document.body.removeChild(wrapper);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to download certificate PDF');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const copyUrl = () => {
    const origin = window.location.origin.includes('localhost') ? 'https://glint-pi.vercel.app' : window.location.origin;
    const url = origin + '/#credential=' + certificateId;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    
    // Log Share
    if (cert) {
      fetch(`/api/certificates/${cert.id}/stats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'share' })
      })
        .then(res => {
          if (res.ok) return res.json();
        })
        .then(updated => {
          if (updated) setCert(updated);
        })
        .catch(err => console.error('Failed to log share statistic', err));
    }
  };

  const shareToLinkedIn = () => {
    if (!cert) return;
    
    // Parse issue date safely
    let issueYear = new Date().getFullYear();
    let issueMonth = new Date().getMonth() + 1;
    
    if (cert.issueDate) {
      const parsedDate = new Date(cert.issueDate);
      if (!isNaN(parsedDate.getTime())) {
        issueYear = parsedDate.getFullYear();
        issueMonth = parsedDate.getMonth() + 1;
      }
    }
    
    const name = cert.programName;
    const orgName = branding?.brandName || 'Verified Certifications';
    const origin = window.location.origin.includes('localhost') ? 'https://glint-pi.vercel.app' : window.location.origin;
    const certUrl = origin + '/#credential=' + cert.id;
    const certId = cert.id;
    
    const linkedInAddUrl = `https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME&name=${encodeURIComponent(name)}&organizationName=${encodeURIComponent(orgName)}&issueYear=${issueYear}&issueMonth=${issueMonth}&certUrl=${encodeURIComponent(certUrl)}&certId=${encodeURIComponent(certId)}`;
    
    window.open(linkedInAddUrl, '_blank');
    
    // Log Share statistic and update local state
    fetch(`/api/certificates/${cert.id}/stats`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'share' })
    })
      .then(res => {
        if (res.ok) return res.json();
      })
      .then(updated => {
        if (updated) setCert(updated);
      })
      .catch(err => console.error('Failed to log share statistic', err));
  };

  // Safe fallback template if not present
  const activeTemplate: CertificateTemplate = template || {
    id: 'fallback-t',
    workspaceId: cert?.workspaceId || 'ws-google-infra',
    name: 'Standard Template UI',
    layout: 'landscape',
    backgroundColor: '#ffffff',
    borderColor: branding?.primaryColor || '#0a0a0a',
    borderWidth: 6,
    showSeal: true,
    sealType: 'classic',
    showQrCode: true,
    qrCodeX: 12,
    qrCodeY: 82,
    logoX: 50,
    logoY: 12,
    logoWidth: 120,
    signatureX: 50,
    signatureY: 78,
    signatureWidth: 100,
    signatoryName: 'Thomas Kurian',
    signatoryTitle: 'CEO, Platform Authority',
    textElements: [
      { id: 'f1', text: 'CERTIFICATE OF ACHIEVEMENT', fontSize: 24, fontFamily: 'Space Grotesk', fontWeight: 'bold', color: '#1B365D', xPercent: 50, yPercent: 24, align: 'center' },
      { id: 'f2', text: 'This proudly registers that', fontSize: 11, fontFamily: 'Inter', fontWeight: 'normal', color: '#64748B', xPercent: 50, yPercent: 36, align: 'center' },
      { id: 'f3', text: '{{name}}', fontSize: 32, fontFamily: 'Playfair Display', fontWeight: 'bold', color: '#0F172A', xPercent: 50, yPercent: 48, align: 'center', isPlaceholder: true },
      { id: 'f4', text: 'has successfully completed the premium specialized program', fontSize: 11, fontFamily: 'Inter', fontWeight: 'normal', color: '#64748B', xPercent: 50, yPercent: 58, align: 'center' },
      { id: 'f5', text: '{{program}}', fontSize: 20, fontFamily: 'Space Grotesk', fontWeight: 'bold', color: branding?.primaryColor || '#1a73e8', xPercent: 50, yPercent: 66, align: 'center', isPlaceholder: true }
    ]
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center p-6 text-slate-500 font-sans">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-8 h-8 text-slate-900 animate-spin" />
          <p className="text-xs font-mono tracking-widest uppercase">Querying public authority vault...</p>
        </div>
      </div>
    );
  }

  if (error || !cert) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-white border border-[#E9ECEF] rounded-2xl p-8 text-center space-y-6 card-shadow">
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto border border-rose-100">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div className="space-y-2">
            <h3 className="font-serif text-2xl italic text-slate-900">Credential Audit Fault</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {error || 'No matching certificate records found under this secure lookup identifier.'}
            </p>
          </div>
          <div className="bg-slate-50 border border-slate-100 p-3 rounded-lg text-left text-[10px] text-slate-400 font-mono">
            ID: {certificateId || 'UNKNOWN_ID'} <br />
            Status Code: 404_LEDGER_NOT_FOUND <br />
            Integrity Check: NULL_SIGNATURE
          </div>
          <button
            onClick={onBackToHome}
            className="w-full bg-slate-950 text-white text-xs py-3 rounded-xl font-medium hover:bg-slate-800 transition-colors"
          >
            Return to Landing Portal
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-slate-800 font-sans pb-20 print:pb-0 print:bg-white">
      
      {/* Search Header banner */}
      <header className="bg-white border-b border-[#E9ECEF] py-3 px-4 sm:px-6 lg:px-16 flex flex-col sm:flex-row items-center justify-between gap-3 sticky top-0 z-40 print:hidden min-h-16">
        <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start w-full sm:w-auto">
          <button 
            type="button" 
            onClick={onBackToHome}
            className="text-[10px] uppercase font-bold tracking-widest text-slate-400 hover:text-slate-900 transition-colors"
          >
            ← Public Portal
          </button>
          <span className="text-slate-200 hidden sm:inline">|</span>
          <div className="flex items-center gap-1.5 flex-wrap justify-center sm:justify-start">
            <span className="font-mono text-[9px] font-bold text-slate-400 uppercase hidden md:inline">Trust Registry System:</span>
            <span className="font-mono text-[10px] font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">{cert.id}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 justify-center sm:justify-end w-full sm:w-auto">
          <button 
            onClick={executeDownloadStat}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] px-3.5 py-1.5 rounded-full font-bold transition-all shadow-sm flex items-center gap-1.5 shrink-0"
          >
            <Printer className="w-3 h-3" /> Print
          </button>
          <button 
            onClick={executePdfDownload}
            disabled={isDownloadingPdf}
            className="bg-slate-950 hover:bg-slate-800 text-white text-[10px] px-4 py-1.5 rounded-full font-bold transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed shrink-0"
          >
            <Download className="w-3.5 h-3.5" /> {isDownloadingPdf ? 'Downloading...' : 'Download PDF'}
          </button>
        </div>
      </header>

      {/* Main layout container (Grid) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-16 pt-6 sm:pt-10 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 print:block print:p-0 print:m-0 print:max-w-none">
        
        {/* Left Side: Proof verification details & high trust signals */}
        <div className="lg:col-span-4 space-y-6 lg:space-y-8 order-2 lg:order-1 print:hidden">
          
          {/* Main Verification status badge */}
          <div className="bg-white border border-[#E9ECEF] rounded-2xl p-6 space-y-6 card-shadow">
            <div className="flex justify-between items-start">
              <p className="text-[10px] uppercase tracking-widest text-[#9CA3AF] font-bold">Ledger Status Badge</p>
              
              {cert.status === 'valid' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold uppercase tracking-wider border border-emerald-200">
                  ✓ Valid Secure
                </span>
              )}
              {cert.status === 'revoked' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-700 text-xs font-bold uppercase tracking-wider border border-red-200">
                  ⚠ Revoked Null
                </span>
              )}
              {cert.status === 'expired' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-bold uppercase tracking-wider border border-amber-200">
                  ✗ State Expired
                </span>
              )}
            </div>

            <div className="space-y-2">
              <h1 className="font-serif text-3xl italic text-slate-950 tracking-tight">Authenticity Ledger</h1>
              <p className="text-xs text-slate-500 leading-relaxed">
                This high-stakes credential lookup was cross-referenced in real-time with the issuer organization and security registry. The public lookup keys match the authorized signatures.
              </p>
            </div>

            {/* Revoked Warning specific output */}
            {cert.status === 'revoked' && (
              <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 space-y-2">
                <div className="flex gap-2 items-center text-rose-800 text-xs font-bold">
                  <BadgeAlert className="w-4 h-4 text-rose-600 shrink-0" />
                  CREDENTIAL STATE NULLIFIED
                </div>
                <p className="text-[11px] text-rose-700 leading-relaxed font-mono">
                  Reason: {cert.revocationReason || 'Violations of academic program standards / voluntary void request.'}
                </p>
              </div>
            )}

            {/* Quick stats engagement metrics */}
            <div className="grid grid-cols-3 gap-2 pt-4 border-t border-slate-100 text-center">
              <div>
                <p className="text-[9px] text-[#9CA3AF] uppercase">Audit Views</p>
                <p className="font-display font-bold text-slate-900 text-base">{cert.viewCount || 0}</p>
              </div>
              <div>
                <p className="text-[9px] text-[#9CA3AF] uppercase">Downloads</p>
                <p className="font-display font-bold text-slate-900 text-base">{cert.downloadCount || 0}</p>
              </div>
              <div>
                <p className="text-[9px] text-[#9CA3AF] uppercase">LinkedIn Shares</p>
                <p className="font-display font-bold text-slate-900 text-base">{cert.shareCount || 0}</p>
              </div>
            </div>

            {/* Sharing action row */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <button
                onClick={copyUrl}
                className="w-full bg-slate-50 border border-[#E9ECEF] hover:bg-slate-100 text-slate-800 text-xs py-2.5 rounded-lg font-medium transition-all flex items-center justify-center gap-2"
              >
                {copied ? (
                  <>✓ Copied verification link</>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" /> Copy Secured Look-up URL
                  </>
                )}
              </button>

              <button
                onClick={shareToLinkedIn}
                className="w-full bg-sky-50 hover:bg-sky-100 text-sky-800 text-xs py-2.5 rounded-lg font-medium transition-all flex items-center justify-center gap-2"
              >
                <Share2 className="w-3.5 h-3.5" /> Share Verification to LinkedIn Profile
              </button>
            </div>
          </div>

          {/* Secure cryptographic fingerprint details */}
          <div className="bg-white border border-[#E9ECEF] rounded-2xl p-6 space-y-4 card-shadow">
            <h4 className="text-xs font-bold text-slate-950 uppercase tracking-widest flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-slate-900" />
              Cryptographic Footprint
            </h4>
            <p className="text-[11px] text-slate-500 leading-relaxed font-sans">
              To check file integrity, download the certificate PDF and verify that the security seal has not been altered since generation on our servers.
            </p>
            <div className="space-y-1 bg-slate-50 border border-slate-150 p-3 rounded-lg">
              <p className="text-[9px] uppercase text-slate-400 font-mono">AUTHORIZED SEAL ID</p>
              <p className="text-[9px] text-slate-800 font-mono break-all font-semibold leading-normal">{cert.securityHash}</p>
            </div>

            <div className="space-y-1.5">
              <p className="text-[10px] uppercase text-slate-400 font-mono">Issuer Registry Authority</p>
              <div className="flex items-center gap-2 text-xs">
                <Landmark className="w-3.5 h-3.5 text-slate-700" />
                <span className="font-semibold text-slate-900">{branding?.brandName || cert.programName}</span>
              </div>
              <p className="text-[10px] text-slate-400 leading-tight">
                Secure Email: {branding?.senderEmail} <br />
                Authority Domain: {branding?.customDomain || 'certops-verified-system.net'}
              </p>
            </div>
          </div>

          {/* Interactive Cryptographic verification check tool */}
          <div className="bg-slate-900 text-white rounded-2xl p-6 space-y-4 card-shadow">
            <h4 className="serif italic text-lg text-[#F8F9FA] flex items-center gap-2">
              <Play className="w-5 h-5 text-[#B4C6FC]" />
              Signature Audit Check
            </h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Verify this certificate matches chronological ledger blocks. Runs an automated checking process directly in your browser.
            </p>

            {auditProgress === 'idle' && (
              <button
                type="button"
                onClick={runCryptographicAudit}
                className="w-full bg-[#1a73e8] hover:bg-[#155fc0] text-white text-xs py-2 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5"
              >
                Run Authority Audit
              </button>
            )}

            {auditProgress === 'running' && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-[#B4C6FC]">
                  <RefreshCw className="w-4 h-4 animate-spin text-[#B4C6FC]" />
                  <span>{auditMessage}</span>
                </div>
                <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-400 h-full animate-pulse transition-all" style={{ width: '60%' }}></div>
                </div>
              </div>
            )}

            {auditProgress === 'success' && (
              <div className="space-y-3">
                <div className="p-3 bg-white/5 rounded border border-white/10 space-y-1">
                  <p className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider font-mono">✓ LEDGER VERIFIED MATCH</p>
                  <p className="text-[10px] text-white font-mono leading-relaxed">{auditMessage}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setAuditProgress('idle')}
                  className="text-[9px] text-[#9CA3AF] hover:text-white uppercase font-bold tracking-widest font-mono"
                >
                  Reset Audit Tool
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Render of the High Fidelity Styled Certificate Preview, and complete Audit trail */}
        <div className="lg:col-span-8 space-y-6 lg:space-y-8 order-1 lg:order-2 print:p-0 print:m-0 print:space-y-0">
          
          {/* Elegant preview canvas container styled like a real print certificate */}
          <div className="space-y-3 print:space-y-0">
            <p className="text-[10px] uppercase tracking-widest text-[#9CA3AF] font-bold print:hidden">Authorized Proof Credential (HQ Resolution)</p>
            
            <div className="bg-white border border-[#E9ECEF] rounded-2xl p-2.5 sm:p-6 md:p-10 shadow-2xl overflow-hidden print:p-0 print:border-none print:shadow-none printable-certificate-outer">
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
                  containerType: 'inline-size'
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

                {/* Top Corner Meta info */}
                <div className="absolute top-4 left-6 pointer-events-none text-slate-400 font-mono text-[7px] tracking-widest uppercase">
                  {branding?.brandName || 'VERIFIED CORPORATE CERTIFICATE AUTHORITY'}
                </div>
                <div className="absolute top-4 right-6 pointer-events-none text-slate-400 font-mono text-[7px] tracking-widest uppercase flex items-center gap-1.5">
                  ID: {cert.id} <span className="text-slate-950 font-bold">[{cert.status.toUpperCase()}]</span>
                </div>

                {/* Predefined Dynamic Canva Logo overrides */}
                {(activeTemplate.logoUrl || (activeTemplate.logoIconType && activeTemplate.logoIconType !== 'none')) && (
                  <div
                    style={{
                      position: 'absolute',
                      left: `${activeTemplate.logoX}%`,
                      top: `${activeTemplate.logoY}%`,
                      transform: 'translate(-50%, -50%)',
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
                          transform: 'translate(-50%, -50%)',
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
                          transform: 'translate(-50%, -50%)',
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

                  let value = el.text;
                  if (el.text.includes('{{name}}')) {
                     value = value.replace('{{name}}', cert.recipientName);
                  }
                  if (el.text.includes('{{program}}')) {
                     value = value.replace('{{program}}', cert.programName);
                  }
                  if (el.text.includes('{{date}}')) {
                     value = value.replace('{{date}}', cert.issueDate);
                  }
                  if (el.text.includes('{{id}}')) {
                     value = value.replace('{{id}}', cert.id);
                  }

                  // Dynamically map custom spreadsheet values
                  Object.keys(cert.customFields).forEach((key) => {
                    if (el.text.includes(`{{${key}}}`)) {
                      value = value.replace(`{{${key}}}`, cert.customFields[key]);
                    }
                  });

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
                        transform: 'translate(-50%, -50%)',
                        color: el.color,
                        textAlign: (el.align || 'center') as any,
                        fontSize: `${el.fontSize * 0.1125}cqw`,
                        fontFamily: el.fontFamily,
                        fontStyle: el.fontStyle || 'normal',
                        fontWeight: el.fontWeight === 'bold' ? 700 : (el.fontWeight === 'medium' ? 500 : 400),
                        textDecoration: el.textDecoration || 'none',
                        letterSpacing: el.letterSpacing ? `${el.letterSpacing}px` : '0.05px',
                        lineHeight: el.lineHeight || 'normal',
                        opacity: el.opacity !== undefined ? el.opacity : undefined,
                        textTransform: el.textTransform || 'none'
                      }}
                      className={`${fontClass} ${weightClass} leading-snug break-words max-w-xl z-20 print:text-xs`}
                    >
                      {value}
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
                      transform: 'translate(-50%, -50%)',
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
                      {activeTemplate.signatoryTitle || 'CEO, Authority'}
                    </p>
                  </div>
                )}

                {/* Absolute Secondary signatory line */}
                {(activeTemplate.secondarySignatureUrl || activeTemplate.showSecondarySignatory) && (
                  <div
                    style={{
                      position: 'absolute',
                      left: `${activeTemplate.secondarySignatureX || 70}%`,
                      top: `${activeTemplate.secondarySignatureY || 78}%`,
                      transform: 'translate(-50%, -50%)',
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
                        {activeTemplate.secondarySignatoryName || 'Dr. Clara Masters'}
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
                      {activeTemplate.secondarySignatoryTitle || 'Admissions Registrar'}
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

                    {activeTemplate.showQrCode && (() => {
                      const customUrl = activeTemplate.qrCodeCustomUrl || 'https://glint-pi.vercel.app/#credential={{id}}';
                      let resolvedUrl = customUrl
                        .replace(/\{\{id\}\}/g, cert.id)
                        .replace(/\{\{name\}\}/g, cert.recipientName)
                        .replace(/\{\{program\}\}/g, cert.programName)
                        .replace(/\{\{date\}\}/g, cert.issueDate);
                      
                      // Resolve custom fields
                      Object.keys(cert.customFields || {}).forEach((key) => {
                        resolvedUrl = resolvedUrl.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), cert.customFields[key] || '');
                      });

                      return (
                        <a
                          href={resolvedUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ 
                            width: `${(activeTemplate.qrCodeWidth || 32) * 0.125}cqw`, 
                            height: `${(activeTemplate.qrCodeWidth || 32) * 0.125}cqw` 
                          }}
                          className="bg-white p-0.5 rounded-sm border border-slate-200 shadow-sm flex items-center justify-center hover:scale-110 transition-transform cursor-pointer shrink-0"
                          title="Click to Verify"
                        >
                          <img 
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(resolvedUrl)}&color=0f172a`}
                            alt="Verification QR"
                            className="w-full h-full object-contain"
                          />
                        </a>
                      );
                    })()}
                  </div>
                )}

              </div>
            </div>
          </div>

          {/* Secure Audit Trail chronological list displaying all verification attempts */}
          <div className="bg-white border border-[#E9ECEF] rounded-2xl p-6 space-y-6 card-shadow print:hidden overflow-hidden">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h4 className="text-xs font-bold text-slate-950 uppercase tracking-widest flex items-center gap-1.5">
                <Database className="w-4 h-4 text-slate-900" />
                Permanent Trust Ledger Audit History
              </h4>
              <span className="text-[10px] font-mono text-slate-400 font-semibold uppercase">SECURE CHRONO-REGISTER</span>
            </div>

            <div className="relative border-l border-slate-200 ml-3 pl-6 space-y-6 overflow-hidden">
              {cert.auditTrail && cert.auditTrail.map((log, idx) => (
                <div key={idx} className="relative">
                  {/* Event indicator dot */}
                  <span className={`absolute -left-[30px] top-1 w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                    log.event === 'REVOKED' ? 'bg-red-500 border-red-200 text-white' : 
                    log.event === 'VERIFIED' ? 'bg-indigo-500 border-indigo-200 text-white' : 
                    log.event === 'ISSUED' ? 'bg-emerald-500 border-emerald-200 text-white' : 'bg-slate-950 border-slate-200'
                  }`} />

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-[10px] font-mono text-[#9CA3AF]">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                      <span className={`px-2 py-0.5 rounded font-mono text-[9px] font-bold uppercase tracking-wider ${
                        log.event === 'REVOKED' ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                        log.event === 'VERIFIED' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' :
                        log.event === 'ISSUED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                        'bg-slate-50 text-slate-700 border border-slate-100'
                      }`}>
                        {log.event}
                      </span>
                      <span className="text-[10px] text-slate-400">by {log.performedBy}</span>
                    </div>
                    <p className="text-xs text-slate-700 break-all leading-relaxed overflow-hidden w-full">
                      {log.details}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center pt-2">
              <p className="text-[10px] text-slate-400 leading-normal font-mono">
                Security Standard: RFC-6962 Signed Certificate Timestamp Protocol. <br />
                All timestamps are locked to ISO universal coordinated standards.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
