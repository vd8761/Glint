/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Award, ShieldAlert, CheckCircle, Search, ArrowRight, 
  Check, Zap, Layers, Sparkles, Star, RefreshCw
} from 'lucide-react';
import { HeroScrollDemo } from './ui/demo';
import { motion, AnimatePresence } from 'framer-motion';

interface LandingPageProps {
  onStartFree: () => void;
  onViewSample: (id: string) => void;
  onSelectWorkspace: (id: string) => void;
}

export function LandingPage({ onStartFree, onViewSample, onSelectWorkspace }: LandingPageProps) {
  const [previewName, setPreviewName] = useState('Dr. Elias Vance');
  const [previewLayout, setPreviewLayout] = useState<'google' | 'stellar'>('google');
  const [scrollY, setScrollY] = useState(0);
  const [hoverCard, setHoverCard] = useState({ x: 0, y: 0, hover: false });

  // Verification Simulator State
  const [certCode, setCertCode] = useState('');
  const [scanState, setScanState] = useState<'idle' | 'scanning' | 'success' | 'failed'>('idle');
  const [scanLogs, setScanLogs] = useState<string[]>([]);
  const [scannedCert, setScannedCert] = useState<any>(null);

  // Interactive Feature Explorer State
  const [activeFeatureTab, setActiveFeatureTab] = useState(0);

  // Parallax Scroll listener
  useEffect(() => {
    const handleScroll = () => {
      window.requestAnimationFrame(() => {
        setScrollY(window.scrollY);
      });
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Card Mouse Move for 3D Tilt Effect
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    setHoverCard({ x: x / 20, y: y / 20, hover: true });
  };

  const handleMouseLeave = () => {
    setHoverCard({ x: 0, y: 0, hover: false });
  };

  // Triggering the Verification Simulator
  const handleVerifyScan = (e: React.FormEvent) => {
    e.preventDefault();
    const code = certCode.trim().toUpperCase();
    if (!code) return;

    setScanState('scanning');
    setScanLogs([]);
    setScannedCert(null);

    const logs = [
      "Establishing secure connection to Neon cloud cluster...",
      "Querying distributed public registry for hash matching...",
      "Validating digital signature integrity seal...",
      "Cryptographic SHA256 integrity: 100% SECURE MATCH.",
      "Sync complete. Loading verified ledger page receipt..."
    ];

    logs.forEach((log, idx) => {
      setTimeout(() => {
        setScanLogs(prev => [...prev, log]);
      }, (idx + 1) * 450);
    });

    setTimeout(() => {
      setScanState('success');
      setScannedCert({
        id: code.includes('CERT') ? code : 'CERT-2026-1014',
        recipient: "Dr. Elias Vance",
        program: "Advanced API & Platform Ledger System",
        date: "2026-06-17",
        status: "VALID"
      });
    }, 2500);
  };

  // Reset simulator
  const handleResetScan = () => {
    setScanState('idle');
    setCertCode('');
    setScanLogs([]);
    setScannedCert(null);
  };

  return (
    <div className="min-h-screen bg-[#F9FBFC] text-slate-900 font-sans overflow-x-hidden relative selection:bg-indigo-500 selection:text-white">
      {/* Dynamic Embedded Styles for Custom Animations */}
      <style>{`
        @keyframes scan-line {
          0% { top: 0%; opacity: 0.7; }
          50% { top: 100%; opacity: 1; }
          100% { top: 0%; opacity: 0.7; }
        }
        .animate-scan {
          animation: scan-line 3s ease-in-out infinite;
        }
        .perspective-1000 {
          perspective: 1000px;
        }
        .glossy-glow {
          box-shadow: 0 0 30px rgba(99, 102, 241, 0.05), inset 0 1px 1px rgba(255,255,255,0.8);
        }
      `}</style>

      {/* Grid Pattern Background with Scroll Parallax */}
      <div 
        style={{ 
          transform: `translateY(${scrollY * 0.15}px)`,
          backgroundImage: 'radial-gradient(rgba(99, 102, 241, 0.06) 1.5px, transparent 1.5px)',
          backgroundSize: '32px 32px'
        }}
        className="absolute top-0 left-0 w-full h-[150vh] pointer-events-none z-0"
      />

      {/* Ambient Color Blobs with Dynamic Framer Motion Animations */}
      <motion.div 
        animate={{
          x: [0, 40, -20, 0],
          y: [0, -35, 25, 0],
          scale: [1, 1.05, 0.95, 1],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-gradient-to-br from-indigo-500/10 to-purple-500/10 blur-[120px] pointer-events-none z-0"
      />
      <motion.div 
        animate={{
          x: [0, -30, 25, 0],
          y: [0, 40, -20, 0],
          scale: [1, 0.95, 1.05, 1],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute top-[25%] left-[-15%] w-[500px] h-[500px] rounded-full bg-gradient-to-br from-blue-500/10 to-emerald-500/10 blur-[100px] pointer-events-none z-0"
      />

      {/* Premium Sticky Navigation with Glossy Glassmorphism Effect */}
      <header className={`sticky top-0 z-50 flex items-center justify-between px-6 lg:px-16 transition-all duration-500 ${
        scrollY > 20 
          ? "h-14 bg-white/75 backdrop-blur-2xl border-b border-white/50 shadow-[0_10px_35px_rgba(0,0,0,0.03)] glossy-glow" 
          : "h-16 bg-white/45 backdrop-blur-xl border-b border-white/20 shadow-none"
      }`}>
        <div className="flex items-center gap-2.5">
          <svg className="w-8 h-8 shrink-0 hover:scale-105 transition-transform duration-300" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M23 16C23 19.866 19.866 23 16 23C12.134 23 9 19.866 9 16C9 12.134 12.134 9 16 9C18.6 9 20.9 10.4 22.1 12.5" stroke="#0F172A" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M15 16H23" stroke="#0F172A" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M24 7C24 9.2 25.2 10 27 10C25.2 10 24 10.8 24 13C24 10.8 22.8 10 21 10C22.8 10 24 9.2 24 7Z" fill="#F59E0B" />
          </svg>
          <span className="font-display font-bold tracking-tight text-slate-950 text-base">GLINT</span>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => onSelectWorkspace('ws-google-infra')}
            className="text-xs font-semibold text-slate-700 hover:text-slate-950 px-3.5 py-2 transition-all border border-[#E9ECEF]/85 hover:bg-white rounded-lg shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
          >
            Sign In
          </button>
          <button 
            onClick={onStartFree}
            className="bg-slate-950 text-white text-xs px-5 py-2.5 rounded-full font-semibold shadow-[0_4px_12px_rgba(0,0,0,0.05)] hover:bg-indigo-650 hover:shadow-indigo-100 transition-all duration-300 flex items-center gap-1 group"
          >
            Start Free <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="px-6 lg:px-16 pt-16 pb-12 grid grid-cols-1 lg:grid-cols-12 gap-12 max-w-7xl mx-auto items-center relative z-10">
        <motion.div 
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { staggerChildren: 0.12 } }
          }}
          className="lg:col-span-6 space-y-8"
        >
          {/* Subtle upper badge */}
          <motion.div 
            variants={{
              hidden: { y: 15, opacity: 0 },
              visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100 } }
            }}
            className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] rounded-full hover:border-indigo-200 transition-colors cursor-default"
          >
            <Sparkles className="w-3 h-3 text-amber-500 fill-amber-500" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-650">Enterprise Credential Infrastructure</span>
          </motion.div>

          <motion.h1 
            variants={{
              hidden: { y: 25, opacity: 0 },
              visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 80, damping: 14 } }
            }}
            className="font-serif text-5xl md:text-6.5xl italic text-slate-950 leading-[1.12]"
          >
            Credential trust is <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-750 font-sans tracking-tight font-extrabold not-italic">
              an absolute standard.
            </span>
          </motion.h1>

          <motion.p 
            variants={{
              hidden: { y: 15, opacity: 0 },
              visible: { y: 0, opacity: 1, transition: { duration: 0.6 } }
            }}
            className="text-slate-500 text-sm max-w-lg leading-relaxed font-sans"
          >
            Create, bulk-issue, and instantly audit secure professional certificates at industrial scale. Supported by permanent cryptographic seals, custom branding overrides, and public-facing high-fidelity verification boards.
          </motion.p>

          {/* Professional Action Buttons */}
          <motion.div 
            variants={{
              hidden: { y: 15, opacity: 0 },
              visible: { y: 0, opacity: 1, transition: { duration: 0.6 } }
            }}
            className="flex flex-col sm:flex-row gap-4 pt-4"
          >
            <button 
              onClick={onStartFree}
              className="relative group overflow-hidden bg-slate-950 text-white text-xs px-8 py-4 rounded-xl font-bold shadow-lg hover:shadow-indigo-600/10 transition-all flex items-center justify-center gap-2"
            >
              <span className="relative z-10 flex items-center gap-1.5">
                Launch Console <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </span>
              <div className="absolute inset-0 bg-indigo-600 scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-350" />
            </button>
            <button 
              onClick={() => {
                document.getElementById('sandbox')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="group border border-slate-200 bg-white text-xs px-8 py-4 rounded-xl font-bold text-slate-700 hover:text-indigo-600 hover:bg-indigo-50/20 hover:border-indigo-200 transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <Award className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" />
              Explore Ledger Verifier
            </button>
          </motion.div>

          {/* Real Customer Trust Logos */}
          <motion.div 
            variants={{
              hidden: { opacity: 0 },
              visible: { opacity: 0.55, transition: { delay: 0.5 } }
            }}
            className="pt-6 space-y-3"
          >
            <p className="text-[10px] uppercase tracking-widest text-[#9CA3AF] font-bold">Trusted by verification authorities</p>
            <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
              <span className="font-display font-bold tracking-tight text-slate-950 text-sm">COLUMBIA UNIVERSITY</span>
              <span className="font-display font-mono text-slate-950 text-xs tracking-widest">GOOGLE.CLOUD.SECURE</span>
              <span className="font-sans font-semibold text-slate-950 text-sm italic">Stellar.Academy</span>
              <span className="font-serif font-black text-slate-950 text-sm">MIT_COGNITIVE</span>
            </div>
          </motion.div>
        </motion.div>

        {/* Hero Interactive Certificate Preview Card */}
        <motion.div 
          initial={{ opacity: 0, x: 50, rotateY: 10 }}
          animate={{ opacity: 1, x: 0, rotateY: 0 }}
          transition={{ type: "spring", stiffness: 70, damping: 15, delay: 0.25 }}
          id="preview" 
          className="lg:col-span-6 flex flex-col items-center relative perspective-1000"
        >
          <div 
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{
              transform: hoverCard.hover 
                ? `rotateY(${hoverCard.x}deg) rotateX(${-hoverCard.y}deg) scale(1.025)` 
                : 'rotateY(0deg) rotateX(0deg) scale(1)',
              transition: hoverCard.hover ? 'none' : 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
            className="w-full max-w-xl bg-white border border-[#E9ECEF] rounded-2xl p-6 shadow-2xl relative overflow-hidden group cursor-pointer"
          >
            {/* Top Editor controls on preview */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setPreviewLayout('google'); }}
                  className={`text-[10px] font-bold px-3 py-1 rounded-lg transition-all uppercase tracking-wide cursor-pointer ${previewLayout === 'google' ? 'bg-slate-950 text-white shadow-sm' : 'bg-slate-105 text-slate-500 hover:bg-slate-200'}`}
                >
                  Classic Minimalist
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setPreviewLayout('stellar'); }}
                  className={`text-[10px] font-bold px-3 py-1 rounded-lg transition-all uppercase tracking-wide cursor-pointer ${previewLayout === 'stellar' ? 'bg-slate-950 text-white shadow-sm' : 'bg-slate-105 text-slate-500 hover:bg-slate-200'}`}
                >
                  Slate Modern
                </button>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-650 bg-emerald-50/70 px-2.5 py-1 rounded-lg border border-emerald-100 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 inline-block"></span>
                LIVE BUILD PREVIEW
              </div>
            </div>

            {/* Simulated Live Renderer */}
            <div 
              style={{
                backgroundColor: previewLayout === 'google' ? '#ffffff' : '#F8FAFC',
                borderWidth: previewLayout === 'google' ? '6px' : '8px',
                borderColor: previewLayout === 'google' ? '#1a73e8' : '#0F172A'
              }}
              className="aspect-[1.414/1] rounded-lg p-5 relative flex flex-col justify-between transition-all duration-500 border-double overflow-hidden shadow-inner"
            >
              {/* Top Banner Branding */}
              <div className="flex justify-between items-start">
                <div>
                  <p style={{ color: previewLayout === 'google' ? '#1a73e8' : '#ec4899' }} className="font-mono text-[9px] uppercase tracking-widest font-bold">
                    {previewLayout === 'google' ? 'Google Cloud Credentials' : 'Stellar Tech Academy'}
                  </p>
                  <p className="text-[7px] text-[#9CA3AF] tracking-tight">VERIFIED ID: CERT-2026-XPREV</p>
                </div>
                <div className="w-14 h-6 border bg-white/60 p-1 rounded flex items-center justify-center text-[7px] font-bold border-slate-200 uppercase truncate">
                  {previewLayout === 'google' ? '★ GOOGLE' : 'STELLAR'}
                </div>
              </div>

              {/* Title Center */}
              <div className="text-center space-y-1.5 py-1">
                <p style={{ color: previewLayout === 'google' ? '#1B365D' : '#0F172A' }} className="font-display font-bold text-xs uppercase tracking-widest">
                  {previewLayout === 'google' ? 'CERTIFICATE OF ACHIEVEMENT' : 'CREDENTIAL OF RECOGNITION'}
                </p>
                <p className="text-[7px] text-[#64748B] italic max-w-xs mx-auto">
                  Acknowledging the successful validation and mastery of industrial design and infrastructure services.
                </p>
                
                {/* Dynamic Input in-frame */}
                <div className="relative inline-block mt-3 px-2">
                  <input
                    type="text"
                    value={previewName}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => setPreviewName(e.target.value)}
                    className="serif text-center text-lg md:text-xl font-bold text-[#0F172A] border-b border-dashed border-slate-300 focus:border-slate-800 bg-transparent py-0.5 focus:outline-none min-w-[200px]"
                    placeholder="Recipient Name"
                  />
                  <div className="text-[6px] text-slate-400 mt-0.5 uppercase tracking-widest font-mono">Click above to type your own name</div>
                </div>

                <p className="text-[7px] text-[#64748B] px-1 pt-1">
                  for expert architectural integration of the <span className="font-medium text-slate-900">Advanced API & Platform Ledger System</span>
                </p>
              </div>

              {/* Bottom Row Footer */}
              <div className="flex justify-between items-end pt-2 border-t border-slate-100">
                <div className="text-left">
                  <p className="font-mono text-[7px] text-slate-400 uppercase">ISSUED ON</p>
                  <p className="font-mono text-[8px] font-bold text-slate-700">2026-06-17</p>
                </div>
                <div className="text-center">
                  <div className="h-6 w-14 border-b border-slate-900 mx-auto"></div>
                  <p className="font-sans text-[6px] font-bold text-slate-700 mt-1">Thomas Kurian</p>
                  <p className="font-sans text-[5px] text-slate-400">Chief Authority Officer</p>
                </div>
                <div className="text-right flex items-center gap-1">
                  <div className="w-6 h-6 bg-white p-0.5 rounded-sm border border-slate-200 shadow-sm flex items-center justify-center">
                    <img 
                      src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=https://credentials.os/%23preview&color=0f172a" 
                      alt="Verification QR"
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Helper Explainer */}
            <div className="bg-slate-50 border border-slate-105 rounded-xl p-3 mt-4 text-xs text-slate-505 flex items-start gap-2.5 group-hover:bg-indigo-50/20 group-hover:border-indigo-100 transition-colors duration-300">
              <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-800">Real-time Rendering & Variables:</span> Play around! This is an interactive sandbox simulation. Recipients receive high-fidelity vectors optimized perfectly for print.
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Scroll Showcase Section */}
      <section className="relative z-10 w-full overflow-hidden">
        <HeroScrollDemo />
      </section>

      {/* Interactive Verification Simulator Sandbox */}
      <motion.section 
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-120px" }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        id="sandbox" 
        className="py-24 px-6 lg:px-16 bg-white border-y border-slate-200/50 relative z-10"
      >
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Text details */}
          <div className="lg:col-span-5 space-y-6">
            <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100">
              Platform Registry Verification
            </span>
            <h2 className="font-serif text-3xl md:text-4.5xl italic text-slate-950 leading-tight">
              Test the cryptographic verifier simulator
            </h2>
            <p className="text-slate-500 text-sm leading-relaxed">
              Verify actual issued credentials dynamically. Try typing code <span className="font-mono bg-slate-100 px-1 py-0.5 rounded text-indigo-600 text-xs font-bold">CERT-2026-1014</span> inside the terminal scanner and see how the ledger resolves cryptographic data, signatures, and timestamps.
            </p>
            
            {/* Input Form */}
            {scanState === 'idle' && (
              <form onSubmit={handleVerifyScan} className="bg-slate-50 p-2 rounded-2xl border border-[#E9ECEF] flex items-center shadow-sm max-w-md focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all duration-300">
                <Search className="text-slate-400 w-4 h-4 ml-2 mr-3 shrink-0" />
                <input 
                  type="text" 
                  placeholder="Verify code (e.g. CERT-2026-1014)" 
                  value={certCode}
                  onChange={(e) => setCertCode(e.target.value)}
                  className="w-full bg-transparent border-none text-xs focus:outline-none placeholder-slate-400 text-slate-800"
                />
                <button 
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-755 text-white text-xs px-5 py-2.5 rounded-xl font-bold transition-all shadow-sm shrink-0 cursor-pointer"
                >
                  Verify Ledger
                </button>
              </form>
            )}

            {scanState === 'scanning' && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 max-w-md shadow-lg space-y-4 font-mono text-[10px] text-slate-400 min-h-[160px] flex flex-col justify-center relative overflow-hidden">
                <div className="absolute top-0 left-0 h-1 bg-indigo-500 animate-pulse w-full" />
                <div className="flex items-center gap-2 text-indigo-400 font-semibold">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>RESOLVING CREDENTIAL HASH...</span>
                </div>
                <div className="space-y-1.5 border-t border-slate-800/80 pt-3">
                  <AnimatePresence>
                    {scanLogs.map((log, i) => (
                      <motion.p 
                        key={i} 
                        initial={{ opacity: 0, x: -5 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="text-slate-300 flex items-start gap-1.5"
                      >
                        <span className="text-indigo-500">▶</span> {log}
                      </motion.p>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {scanState === 'success' && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-5 max-w-md shadow-sm space-y-4"
              >
                <div className="flex items-center gap-2.5 text-emerald-700">
                  <CheckCircle className="w-5 h-5 fill-emerald-50 text-emerald-600" />
                  <span className="text-xs font-bold uppercase tracking-wider">Ledger Match Confirmed</span>
                </div>
                <div className="space-y-1.5 text-xs text-slate-600 border-t border-emerald-100 pt-3">
                  <p><strong>Certificate ID:</strong> {scannedCert.id}</p>
                  <p><strong>Recipient:</strong> {scannedCert.recipient}</p>
                  <p><strong>Program:</strong> {scannedCert.program}</p>
                  <p><strong>Issue Date:</strong> {scannedCert.date}</p>
                </div>
                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={() => onViewSample(scannedCert.id)}
                    className="bg-emerald-600 hover:bg-emerald-705 text-white text-xs px-4 py-2 rounded-lg font-bold transition-all shadow-sm cursor-pointer"
                  >
                    View Official Ledger Page
                  </button>
                  <button 
                    onClick={handleResetScan}
                    className="border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs px-4 py-2 rounded-lg font-bold transition-all cursor-pointer"
                  >
                    Reset
                  </button>
                </div>
              </motion.div>
            )}
          </div>

          {/* Right Visual Simulator Card with Laser Line */}
          <div className="lg:col-span-7 flex justify-center relative">
            <div className="relative w-full max-w-lg bg-slate-50 border border-slate-205 rounded-2xl p-6 overflow-hidden shadow-inner flex items-center justify-center min-h-[300px]">
              
              {/* Laser Scanning Animation Overlay */}
              {scanState === 'scanning' && (
                <div className="absolute left-0 w-full h-[3px] bg-indigo-500 shadow-[0_0_18px_rgba(99,102,241,1)] z-30 animate-scan pointer-events-none" />
              )}
              
              {/* Mock Certificate inside scanner */}
              <div className={`w-[85%] aspect-[1.414/1] bg-white border-4 border-slate-300 rounded shadow-md p-4 flex flex-col justify-between transition-all duration-500 relative z-10 ${scanState === 'scanning' ? 'opacity-40 blur-[0.8px]' : ''}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-[6px] font-bold text-slate-400 uppercase tracking-widest">OFFICIAL PUBLIC REGISTRY</h4>
                    <p className="text-[5px] text-slate-300">TRUST ROOT SHA256:0edf88cf...</p>
                  </div>
                  <div className="w-8 h-3 border border-slate-200 bg-slate-50 rounded flex items-center justify-center text-[4px] font-bold">
                    ★ SECURED
                  </div>
                </div>

                <div className="text-center space-y-1">
                  <h5 className="text-[7.5px] font-bold tracking-widest text-slate-700">CERTIFICATE OF ACHIEVEMENT</h5>
                  <p className="text-[10px] font-serif italic font-bold text-slate-900 border-b border-dashed border-slate-200 w-24 mx-auto pb-0.5">
                    Dr. Elias Vance
                  </p>
                  <p className="text-[5px] text-slate-400 max-w-[200px] mx-auto">
                    for demonstrating complete mastery of advanced cryptographic database indexing architectures.
                  </p>
                </div>

                <div className="flex justify-between items-end pt-1 border-t border-slate-100">
                  <div>
                    <p className="text-[4px] text-slate-400 uppercase">ISSUED</p>
                    <p className="text-[5px] font-bold text-slate-600">2026-06-17</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[5px] font-bold text-slate-700">Thomas Kurian</p>
                    <p className="text-[3.5px] text-slate-400">Chief Officer</p>
                  </div>
                  <div className="w-5 h-5 bg-white border border-slate-200 rounded p-0.5 flex items-center justify-center">
                    <img 
                      src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=https://credentials.os/%23preview&color=0f172a" 
                      alt="Verifier QR"
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Interactive Feature Explorer Section */}
      <motion.section 
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-120px" }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        id="features" 
        className="py-24 px-6 lg:px-16 bg-[#F9FBFC] relative z-10"
      >
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="text-center max-w-2xl mx-auto space-y-4">
            <span className="text-xs font-bold uppercase tracking-widest text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100">
              Interactive Explorer
            </span>
            <h2 className="font-serif text-3xl md:text-4.5xl italic text-slate-950">Industrial grade platform features</h2>
            <p className="text-slate-500 text-sm">
              Explore the core mechanics that make Glint the leading engine for bulk digital credential operations.
            </p>
          </div>

          {/* Interactive Explorer Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-stretch">
            {/* Left selector tabs with sliding glow background */}
            <div className="lg:col-span-5 flex flex-col justify-center space-y-3 relative">
              {[
                {
                  title: "1. Canva-Style Designer",
                  desc: "Design custom certificates dynamically using drag-and-drop vectors, customizable seals, custom text elements, and signatory logos.",
                  icon: Layers
                },
                {
                  title: "2. Bulk CSV Dispatch Mapper",
                  desc: "Import large recipient databases. Automatically validate emails and map dynamic fields (like grades, roles, or dates) dynamically.",
                  icon: Zap
                },
                {
                  title: "3. Cryptographic Verification Ledger",
                  desc: "Provide public-facing lookup portals with immutable check logs, dynamic verification QR codes, and custom domain white-labeling.",
                  icon: Search
                }
              ].map((tab, idx) => {
                const IconComponent = tab.icon;
                const isActive = activeFeatureTab === idx;
                return (
                  <button
                    key={idx}
                    onClick={() => setActiveFeatureTab(idx)}
                    className="relative text-left p-6 rounded-2xl transition-all duration-350 flex items-start gap-4 cursor-pointer focus:outline-none w-full border border-transparent"
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeFeatureGlow"
                        className="absolute inset-0 bg-white border border-indigo-100/70 rounded-2xl shadow-[0_12px_30px_rgba(99,102,241,0.03)] -z-10"
                        transition={{ type: "spring", stiffness: 350, damping: 28 }}
                      />
                    )}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${isActive ? 'bg-indigo-600 text-white' : 'bg-slate-200/60 text-slate-600'}`}>
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className={`text-sm font-bold transition-colors duration-200 ${isActive ? 'text-indigo-950' : 'text-slate-700'}`}>{tab.title}</h3>
                      <p className="text-xs text-slate-500 leading-relaxed mt-1.5">{tab.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Right visual showcase box */}
            <div className="lg:col-span-7 border border-slate-200/60 bg-white rounded-3xl p-6 shadow-xl flex items-center justify-center min-h-[350px] relative overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeFeatureTab}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.28, ease: "easeInOut" }}
                  className="w-full"
                >
                  {/* Feature Tab 0: Canvas Designer Preview */}
                  {activeFeatureTab === 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3 text-xs text-slate-400">
                        <span className="font-bold text-slate-800">Visual Layout Editor</span>
                        <span>Layers (5)</span>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-4">
                        <div className="flex flex-wrap gap-2">
                          <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-1 rounded border border-indigo-100 font-bold font-mono">RecipientName [Dynamic]</span>
                          <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-1 rounded border border-indigo-100 font-bold font-mono">ProgramTitle [Dynamic]</span>
                          <span className="text-[10px] bg-slate-205 text-slate-600 px-2 py-1 rounded font-bold font-mono">SignatorySeal [Static]</span>
                        </div>
                        {/* Mock editor guides */}
                        <div className="border border-indigo-400/30 rounded bg-white p-6 relative flex flex-col items-center justify-center aspect-[1.618/1] shadow-sm">
                          {/* Interactive outline boxes */}
                          <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-indigo-500" />
                          <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-indigo-500" />
                          <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-indigo-500" />
                          <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-indigo-500" />
                          
                          <div className="border border-dashed border-indigo-450 px-4 py-2 text-xs font-bold text-indigo-600 bg-indigo-50/5">
                            Drag & Position Element: {"{{name}}"}
                          </div>
                          <p className="text-[9px] text-slate-400 mt-2">X: 50% | Y: 45% (Center Align)</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Feature Tab 1: CSV Mapper Preview */}
                  {activeFeatureTab === 1 && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3 text-xs text-slate-400">
                        <span className="font-bold text-slate-800">CSV Column Mapping</span>
                        <span className="text-emerald-600 font-bold">✓ 3 Dynamic columns mapped</span>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-3 font-mono text-[10px]">
                        <table className="w-full border-collapse bg-white border border-slate-200 shadow-sm rounded-lg overflow-hidden">
                          <thead>
                            <tr className="bg-slate-100 border-b border-slate-202">
                              <th className="p-2 text-left text-slate-600 font-bold border-r border-slate-200">CSV Header</th>
                              <th className="p-2 text-left text-slate-600 font-bold border-r border-slate-200">Mapped Template Field</th>
                              <th className="p-2 text-left text-slate-600 font-bold">Status</th>
                            </tr>
                          </thead>
                          <tbody className="text-slate-700">
                            <tr className="border-b border-slate-100">
                              <td className="p-2 border-r border-slate-200 font-bold">full_name</td>
                              <td className="p-2 border-r border-slate-200 text-indigo-600 font-bold">{"{{name}}"}</td>
                              <td className="p-2 text-emerald-650 font-bold">OK</td>
                            </tr>
                            <tr className="border-b border-slate-100">
                              <td className="p-2 border-r border-slate-200 font-bold">email_address</td>
                              <td className="p-2 border-r border-slate-200 text-indigo-600 font-bold">RecipientEmail</td>
                              <td className="p-2 text-emerald-655 font-bold">OK</td>
                            </tr>
                            <tr>
                              <td className="p-2 border-r border-slate-200 font-bold">score_grade</td>
                              <td className="p-2 border-r border-slate-200 text-indigo-600 font-bold">{"{{customFields.Grade}}"}</td>
                              <td className="p-2 text-emerald-650 font-bold">OK</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Feature Tab 2: Ledger Audit Preview */}
                  {activeFeatureTab === 2 && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3 text-xs text-slate-400">
                        <span className="font-bold text-slate-800">Stateful Cryptographic Audit Logs</span>
                        <span>Audit Matches (248)</span>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-3 font-mono text-[9px] text-[#64748B]">
                        <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-sm flex items-center justify-between">
                          <span className="flex items-center gap-1.5"><Check className="text-emerald-500 w-3.5 h-3.5" /> [2026-06-20] VIEW_ATTEMPT - Verified</span>
                          <span className="text-slate-405">IP: 198.162.1.4</span>
                        </div>
                        <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-sm flex items-center justify-between">
                          <span className="flex items-center gap-1.5"><Check className="text-emerald-500 w-3.5 h-3.5" /> [2026-06-21] PDF_DOWNLOAD - Verified</span>
                          <span className="text-slate-405">IP: 72.44.15.110</span>
                        </div>
                        <div className="p-3 bg-rose-50/50 border border-rose-100 text-rose-700 rounded-lg flex items-center justify-between">
                          <span className="flex items-center gap-1.5"><ShieldAlert className="text-rose-550 w-3.5 h-3.5" /> [2026-06-23] STATUS_REVOKED - Academic Violation</span>
                          <span className="text-rose-400">By Admin</span>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </motion.section>

      {/* High-fidelity verification overview banner */}
      <motion.section 
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-120px" }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="bg-slate-955 text-white py-24 px-6 lg:px-16 overflow-hidden relative z-10 bg-slate-950"
      >
        {/* Parallax elements inside the dark section */}
        <div 
          style={{ transform: `translateY(${scrollY * 0.05}px)` }}
          className="absolute top-[-30%] right-[-10%] w-[600px] h-[600px] bg-indigo-600/10 blur-[130px] rounded-full pointer-events-none"
        />

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
          <div className="lg:col-span-5 space-y-6">
            <p className="text-xs font-mono uppercase tracking-widest text-[#B4C6FC] flex items-center gap-2">
              <Star className="w-3.5 h-3.5 text-[#B4C6FC] fill-[#B4C6FC]" /> Tamper-Proof Audit Trails
            </p>
            <h2 className="font-serif text-4.5xl italic leading-tight">Verification is <br />the true product.</h2>
            <p className="text-slate-400 text-xs leading-relaxed font-sans">
              A certificate is only as valuable as its verification capacity. Glint features stateful revocation registers, tamper-evident hash indicators, and public blockchain-style check logs ensuring zero credential forgery.
            </p>
            <div className="space-y-4 pt-4 border-t border-white/10">
              <div className="flex gap-3 text-xs">
                <Check className="text-emerald-400 w-4 h-4 shrink-0 mt-0.5" />
                <span><strong className="text-white">White-Label Domains:</strong> Host lookup registries entirely on your school or workshop custom subdomains.</span>
              </div>
              <div className="flex gap-3 text-xs">
                <Check className="text-emerald-400 w-4 h-4 shrink-0 mt-0.5" />
                <span><strong className="text-white">Ledger Status Index:</strong> Update, audit, inspect, suspend, or revoke credentials instantly.</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 bg-white/5 border border-white/10 rounded-2xl p-6 relative hover:border-white/20 transition-colors duration-300 shadow-2xl">
            <h4 className="font-serif italic text-lg text-white mb-4">Verification Audit Ledger</h4>
            <div className="space-y-3 font-mono text-[9px] text-[#9CA3AF]">
              <div className="p-3 bg-white/5 rounded-lg border border-white/5 flex justify-between items-center hover:bg-white/10 transition-colors duration-200">
                <span>[2026-06-12 10:00:00 UTC] WORKSPACE_BATCH_GENERATE</span>
                <span className="text-emerald-400 font-bold">SUCCESS</span>
              </div>
              <div className="p-3 bg-white/5 rounded-lg border border-white/5 flex justify-between items-center hover:bg-white/10 transition-colors duration-200">
                <span>[2026-06-12 10:01:15 UTC] DISPATCHED_VERIFICATION_MAIL - admissions@stellarworkshops.io</span>
                <span className="text-emerald-400 font-bold">SENT</span>
              </div>
              <div className="p-3 bg-white/5 rounded-lg border border-white/5 flex justify-between items-center hover:bg-white/10 transition-colors duration-200">
                <span>[2026-06-15 15:30:00 UTC] CRYPTOGRAPHIC_REHASH_LEDGER_AUDIT</span>
                <span className="text-indigo-400 font-bold">VERIFIED sha256:0edf88cf...</span>
              </div>
              <div className="p-3 bg-[#3F111E]/40 rounded-lg border border-rose-900/30 flex justify-between items-center text-rose-300">
                <span>[2026-06-16 11:24:10 UTC] REVOCATION_TRIGGER - Flagged Academic Integrity Non-compliance</span>
                <span className="text-rose-455 font-bold text-rose-400">REVOKED STATE</span>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Pricing Matrix */}
      <motion.section 
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-120px" }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        id="pricing" 
        className="py-24 px-6 lg:px-16 max-w-7xl mx-auto space-y-16 relative z-10"
      >
        <div className="text-center max-w-2xl mx-auto space-y-4">
          <p className="text-xs font-bold uppercase tracking-widest text-[#9CA3AF]">SaaS Plans for Every Scale</p>
          <h2 className="font-serif text-3xl md:text-4xl italic text-slate-950">Transparent, enterprise-ready options</h2>
          <p className="text-slate-500 text-sm">
            Self-serve onboarding in minutes, with clear visual feature limits. Upgrade dynamically as requirements expand.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Free Starter */}
          <div className="bg-white rounded-2xl border border-[#E9ECEF] p-8 space-y-6 flex flex-col justify-between hover:shadow-xl hover:border-slate-300/60 transition-all duration-300">
            <div className="space-y-4">
              <p className="text-xs font-bold uppercase tracking-widest text-[#9CA3AF]">Free Trial</p>
              <h3 className="text-2xl font-bold text-slate-950 font-sans">$0<span className="text-xs text-slate-400 font-normal"> / forever</span></h3>
              <p className="text-xs text-slate-500 font-sans">Perfect to test layouts and seed sample program lists.</p>
              <ul className="space-y-2.5 pt-4 text-xs text-slate-650 border-t border-slate-100">
                <li className="flex gap-2 items-center"><Check className="w-3.5 h-3.5 text-emerald-500" /> up to 10 active certificates</li>
                <li className="flex gap-2 items-center"><Check className="w-3.5 h-3.5 text-emerald-500" /> Landscape & Portrait layouts</li>
                <li className="flex gap-2 items-center"><Check className="w-3.5 h-3.5 text-emerald-500" /> Default brand footer links</li>
                <li className="flex gap-2 text-slate-300 line-through items-center"><Check className="w-3.5 h-3.5 text-slate-300" /> High-volume CSV loader</li>
                <li className="flex gap-2 text-slate-300 line-through items-center"><Check className="w-3.5 h-3.5 text-slate-300" /> Custom domains & white-label</li>
              </ul>
            </div>
            <button 
              onClick={onStartFree}
              className="w-full bg-slate-50 text-slate-900 border border-[#E9ECEF] hover:bg-slate-100 py-3 rounded-xl text-xs font-bold transition-all text-center cursor-pointer"
            >
              Start Instantly
            </button>
          </div>

          {/* Premium Professional */}
          <div className="bg-white rounded-2xl border-2 border-indigo-650 p-8 space-y-6 flex flex-col justify-between relative shadow-xl hover:scale-102 border-indigo-600 transition-all duration-300">
            <div className="absolute top-0 right-6 -translate-y-1/2 bg-indigo-600 text-white text-[9px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border border-white">
              RECOMMENDED
            </div>
            <div className="space-y-4">
              <p className="text-xs font-bold uppercase tracking-widest text-indigo-600 font-mono">Professional Tier</p>
              <h3 className="text-3xl font-bold text-slate-950 font-sans">$49<span className="text-xs text-slate-400 font-normal"> / month</span></h3>
              <p className="text-xs text-slate-500 font-sans">Excellent for intensive conference teams & professional workshops.</p>
              <ul className="space-y-2.5 pt-4 text-xs text-slate-650 border-t border-slate-100">
                <li className="flex gap-2 items-center"><Check className="w-3.5 h-3.5 text-emerald-500" /> Unlimited active certs</li>
                <li className="flex gap-2 items-center"><Check className="w-3.5 h-3.5 text-emerald-500" /> Bulk CSV & excel mapper</li>
                <li className="flex gap-2 items-center"><Check className="w-3.5 h-3.5 text-emerald-500" /> Interactive stats & downloads</li>
                <li className="flex gap-2 items-center"><Check className="w-3.5 h-3.5 text-emerald-500" /> Sender email override</li>
                <li className="flex gap-2 text-slate-300 line-through items-center"><Check className="w-3.5 h-3.5 text-slate-300" /> White-label domain proxy</li>
              </ul>
            </div>
            <button 
              onClick={() => onSelectWorkspace('ws-stellar')}
              className="w-full bg-indigo-600 hover:bg-indigo-705 text-white py-3 rounded-xl text-xs font-bold transition-all text-center shadow-md shadow-indigo-100 cursor-pointer"
            >
              Upgrade & Onboard Workspace
            </button>
          </div>

          {/* Enterprise Scaler */}
          <div className="bg-white rounded-2xl border border-[#E9ECEF] p-8 space-y-6 flex flex-col justify-between hover:shadow-xl hover:border-slate-300/60 transition-all duration-300">
            <div className="space-y-4">
              <p className="text-xs font-bold uppercase tracking-widest text-[#9CA3AF]">Enterprise Scale</p>
              <h3 className="text-2xl font-bold text-slate-950 font-sans">$249<span className="text-xs text-slate-400 font-normal"> / month</span></h3>
              <p className="text-xs text-slate-500 font-sans">For universities, massive bootcamps, and government programs.</p>
              <ul className="space-y-2.5 pt-4 text-xs text-slate-655 border-t border-slate-100">
                <li className="flex gap-2 items-center"><Check className="w-3.5 h-3.5 text-emerald-500" /> All Pro features included</li>
                <li className="flex gap-2 items-center"><Check className="w-3.5 h-3.5 text-emerald-500" /> Custom Domain (TLS automatic)</li>
                <li className="flex gap-2 items-center"><Check className="w-3.5 h-3.5 text-emerald-500" /> 100% white-label system footprint</li>
                <li className="flex gap-2 items-center"><Check className="w-3.5 h-3.5 text-emerald-500" /> L3 Integration & Webhook access</li>
                <li className="flex gap-2 items-center"><Check className="w-3.5 h-3.5 text-emerald-500" /> Priority 24/7 compliance engineer</li>
              </ul>
            </div>
            <button 
              onClick={() => onSelectWorkspace('ws-google-infra')}
              className="w-full bg-slate-50 text-slate-900 border border-[#E9ECEF] hover:bg-slate-100 py-3 rounded-xl text-xs font-bold transition-all text-center cursor-pointer"
            >
              Configure Enterprise
            </button>
          </div>
        </div>
      </motion.section>

      {/* Modern minimal footer */}
      <footer className="bg-slate-900 text-slate-400 py-16 px-6 lg:px-16 border-t border-slate-800 text-xs relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <svg className="w-6 h-6 shrink-0" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M23 16C23 19.866 19.866 23 16 23C12.134 23 9 19.866 9 16C9 12.134 12.134 9 16 9C18.6 9 20.9 10.4 22.1 12.5" stroke="#FFFFFF" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M15 16H23" stroke="#FFFFFF" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M24 7C24 9.2 25.2 10 27 10C25.2 10 24 10.8 24 13C24 10.8 22.8 10 21 10C22.8 10 24 9.2 24 7Z" fill="#F59E0B" />
            </svg>
            <span className="font-display font-bold tracking-tight text-white">GLINT</span>
          </div>
          <div className="flex gap-8">
            <a href="#" className="hover:text-white transition-colors duration-200">Security Architecture</a>
            <a href="#" className="hover:text-white transition-colors duration-200">API Reference</a>
            <a href="#" className="hover:text-white transition-colors duration-200">Compliance Standard</a>
            <a href="#" className="hover:text-white transition-colors duration-200">Legal Ledger</a>
          </div>
          <p>© 2026 Glint Inc. All rights reserved globally.</p>
        </div>
      </footer>
    </div>
  );
}
