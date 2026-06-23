/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Award, ShieldAlert, CheckCircle, Search, ExternalLink, ArrowRight, 
  Check, Zap, Layers, BarChart3, Globe, Lock, ShieldCheck, Sparkles, Star, Database 
} from 'lucide-react';

interface LandingPageProps {
  onStartFree: () => void;
  onViewSample: (id: string) => void;
  onSelectWorkspace: (id: string) => void;
}

// Custom hook to trigger animations when elements enter the viewport
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.05 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }
    return () => observer.disconnect();
  }, []);

  return [ref, revealed] as const;
}

export function LandingPage({ onStartFree, onViewSample, onSelectWorkspace }: LandingPageProps) {
  const [searchId, setSearchId] = useState('');
  const [previewName, setPreviewName] = useState('Dr. Elias Vance');
  const [previewLayout, setPreviewLayout] = useState<'google' | 'stellar'>('google');
  const [scrollY, setScrollY] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);
  const [hoverCard, setHoverCard] = useState({ x: 0, y: 0, hover: false });

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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = searchId.trim().toUpperCase();
    if (!cleanId) return;
    setIsVerifying(true);
    setTimeout(() => {
      onViewSample(cleanId);
      setIsVerifying(false);
    }, 800);
  };

  // Card Mouse Move for 3D Tilt Effect
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    setHoverCard({ x: x / 15, y: y / 15, hover: true });
  };

  const handleMouseLeave = () => {
    setHoverCard({ x: 0, y: 0, hover: false });
  };

  // Sections reveal hooks
  const [heroRef, heroRevealed] = useReveal();
  const [featuresRef, featuresRevealed] = useReveal();
  const [ledgerRef, ledgerRevealed] = useReveal();
  const [pricingRef, pricingRevealed] = useReveal();

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-slate-900 font-sans overflow-x-hidden relative selection:bg-indigo-500 selection:text-white">
      {/* Dynamic Embedded Styles for Custom Animations */}
      <style>{`
        @keyframes float {
          0% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(2deg); }
          100% { transform: translateY(0px) rotate(0deg); }
        }
        @keyframes float-reverse {
          0% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(12px) rotate(-2deg); }
          100% { transform: translateY(0px) rotate(0deg); }
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.65; transform: scale(1.08); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        .animate-float-delayed {
          animation: float-reverse 7s ease-in-out infinite;
          animation-delay: 1s;
        }
        .animate-glow {
          animation: pulse-slow 5s ease-in-out infinite;
        }
        .perspective-1000 {
          perspective: 1000px;
        }
        .reveal-on-scroll {
          opacity: 0;
          transform: translateY(35px);
          transition: opacity 1.2s cubic-bezier(0.16, 1, 0.3, 1), transform 1.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .reveal-on-scroll.revealed {
          opacity: 1;
          transform: translateY(0);
        }
      `}</style>

      {/* Grid Pattern Background with Scroll Parallax */}
      <div 
        style={{ 
          transform: `translateY(${scrollY * 0.2}px)`,
          backgroundImage: 'radial-gradient(rgba(99, 102, 241, 0.08) 1.5px, transparent 1.5px)',
          backgroundSize: '32px 32px'
        }}
        className="absolute top-0 left-0 w-full h-[120vh] pointer-events-none z-0"
      />

      {/* Ambient Color Blobs with Parallax */}
      <div 
        style={{ transform: `translateY(${scrollY * 0.12}px)` }}
        className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-gradient-to-br from-indigo-500/10 to-purple-500/10 blur-3xl pointer-events-none z-0 animate-glow"
      />
      <div 
        style={{ transform: `translateY(${scrollY * -0.08}px)` }}
        className="absolute top-[25%] left-[-15%] w-[500px] h-[500px] rounded-full bg-gradient-to-br from-blue-500/10 to-emerald-500/10 blur-3xl pointer-events-none z-0 animate-glow"
      />

      {/* Premium Sticky Navigation */}
      <header className="sticky top-0 z-50 bg-[#F8F9FA]/80 backdrop-blur-lg border-b border-[#E9ECEF]/50 h-16 flex items-center justify-between px-6 lg:px-16 transition-all duration-300">
        <div className="flex items-center gap-2.5">
          <svg className="w-8 h-8 shrink-0 hover:scale-105 transition-transform duration-300" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M23 16C23 19.866 19.866 23 16 23C12.134 23 9 19.866 9 16C9 12.134 12.134 9 16 9C18.6 9 20.9 10.4 22.1 12.5" stroke="#0F172A" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M15 16H23" stroke="#0F172A" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M24 7C24 9.2 25.2 10 27 10C25.2 10 24 10.8 24 13C24 10.8 22.8 10 21 10C22.8 10 24 9.2 24 7Z" fill="#F59E0B" />
          </svg>
          <span className="font-display font-bold tracking-tight text-slate-950 text-base">GLINT</span>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-xs font-medium text-slate-500">
          <a href="#features" className="hover:text-slate-950 transition-colors relative after:absolute after:bottom-[-20px] after:left-0 after:w-0 after:h-[2px] after:bg-slate-950 hover:after:w-full after:transition-all">Infrastructure</a>
          <a href="#preview" className="hover:text-slate-950 transition-colors relative after:absolute after:bottom-[-20px] after:left-0 after:w-0 after:h-[2px] after:bg-slate-950 hover:after:w-full after:transition-all">Instant Preview</a>
          <a href="#pricing" className="hover:text-slate-950 transition-colors relative after:absolute after:bottom-[-20px] after:left-0 after:w-0 after:h-[2px] after:bg-slate-950 hover:after:w-full after:transition-all">Pricing Levels</a>
        </nav>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => onSelectWorkspace('ws-google-infra')}
            className="text-xs font-medium text-slate-600 hover:text-slate-900 px-3.5 py-2 transition-all border border-[#E9ECEF]/85 hover:bg-white rounded-lg shadow-sm"
          >
            Sign In
          </button>
          <button 
            onClick={onStartFree}
            className="bg-slate-950 text-white text-xs px-5 py-2.5 rounded-full font-medium shadow-sm hover:bg-slate-800 transition-all flex items-center gap-1 group"
          >
            Start Free <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section ref={heroRef} className={`px-6 lg:px-16 pt-16 pb-12 grid grid-cols-1 lg:grid-cols-12 gap-12 max-w-7xl mx-auto items-center relative z-10 reveal-on-scroll ${heroRevealed ? 'revealed' : ''}`}>
        <div className="lg:col-span-6 space-y-8">
          {/* Subtle upper badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-slate-200 shadow-sm rounded-full animate-float">
            <Sparkles className="w-3 h-3 text-amber-500 fill-amber-500 animate-spin-slow" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Enterprise Credential Infrastructure</span>
          </div>

          <h1 className="font-serif text-5xl md:text-6.5xl italic text-slate-950 leading-[1.12]">
            Credential trust is <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-700 font-sans tracking-tight font-extrabold not-italic">
              an absolute standard.
            </span>
          </h1>

          <p className="text-slate-500 text-sm max-w-lg leading-relaxed font-sans">
            Create, bulk-issue, and instantly audit secure professional certificates at industrial scale. Supported by permanent cryptographic seals, custom branding overrides, and public-facing high-fidelity verification boards.
          </p>

          {/* Quick Direct Ledger Search */}
          <form onSubmit={handleSearch} className="bg-white p-2 rounded-2xl border border-[#E9ECEF] flex items-center shadow-md focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all max-w-md relative z-25">
            <Search className="text-slate-400 w-4 h-4 ml-2 mr-3 shrink-0" />
            <input 
              type="text" 
              placeholder="Verify code (e.g., CERT-2026-1014)" 
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              className="w-full bg-transparent border-none text-xs focus:outline-none placeholder-slate-400 text-slate-800"
            />
            <button 
              type="submit"
              disabled={isVerifying}
              className="bg-indigo-600 text-white text-xs px-5 py-2.5 rounded-xl font-medium hover:bg-indigo-700 transition-all shadow-sm shrink-0 flex items-center gap-1.5"
            >
              {isVerifying ? (
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              ) : 'Verify Ledger'}
            </button>
          </form>

          {/* Trust Actions & Quick Sandbox Seeds */}
          <div className="flex flex-col sm:flex-row gap-4 pt-2">
            <button 
              onClick={onStartFree}
              className="bg-slate-950 text-white text-xs px-6 py-3.5 rounded-full font-medium shadow-md hover:bg-slate-800 transition-all flex items-center justify-center gap-2 hover:shadow-lg"
            >
              Open Vendor Workspace
            </button>
            <button 
              onClick={() => onViewSample('CERT-2026-1014')}
              className="border border-[#E9ECEF] bg-white text-xs px-6 py-3.5 rounded-full font-medium text-slate-700 hover:bg-slate-50 transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <Award className="w-4 h-4 text-amber-500" />
              View Verified Sample Credential
            </button>
          </div>

          {/* Real Customer Trust Logos */}
          <div className="pt-6 space-y-3">
            <p className="text-[10px] uppercase tracking-widest text-[#9CA3AF] font-bold">Trusted by verification authorities</p>
            <div className="flex flex-wrap items-center gap-x-8 gap-y-4 opacity-50">
              <span className="font-display font-bold tracking-tight text-slate-950 text-sm">COLUMBIA UNIVERSITY</span>
              <span className="font-display font-mono text-slate-950 text-xs tracking-widest">GOOGLE.CLOUD.SECURE</span>
              <span className="font-sans font-semibold text-slate-950 text-sm italic">Stellar.Academy</span>
              <span className="font-serif font-black text-slate-950 text-sm">MIT_COGNITIVE</span>
            </div>
          </div>
        </div>

        {/* Hero Interactive Certificate Preview Card */}
        <div id="preview" className="lg:col-span-6 flex flex-col items-center relative perspective-1000">
          
          {/* Parallax Floating elements behind the preview card */}
          <div 
            style={{ transform: `translateY(${scrollY * -0.15}px)` }}
            className="absolute -top-6 -left-6 bg-white border border-[#E9ECEF] rounded-xl p-3.5 shadow-lg flex items-center gap-2.5 animate-float z-20 pointer-events-none"
          >
            <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-900">Cryptographically Sealed</p>
              <p className="text-[8px] text-slate-400">Verifiable Audit Protocol</p>
            </div>
          </div>

          <div 
            style={{ transform: `translateY(${scrollY * 0.1}px)` }}
            className="absolute -bottom-6 -right-6 bg-white border border-[#E9ECEF] rounded-xl p-3 shadow-lg flex items-center gap-2 animate-float-delayed z-20 pointer-events-none"
          >
            <Database className="w-4 h-4 text-indigo-600" />
            <span className="text-[9px] font-bold text-slate-800">Neon Ledger Connected</span>
          </div>

          <div 
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{
              transform: hoverCard.hover 
                ? `rotateY(${hoverCard.x}deg) rotateX(${-hoverCard.y}deg) scale(1.02)` 
                : 'rotateY(0deg) rotateX(0deg) scale(1)',
              transition: hoverCard.hover ? 'none' : 'all 0.5s ease'
            }}
            className="w-full max-w-xl bg-white border border-[#E9ECEF] rounded-2xl p-6 shadow-2xl relative overflow-hidden group cursor-pointer"
          >
            {/* Top Editor controls on preview */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setPreviewLayout('google'); }}
                  className={`text-[10px] font-bold px-3 py-1 rounded-lg transition-all uppercase tracking-wide ${previewLayout === 'google' ? 'bg-slate-950 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                >
                  Classic Minimalist
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setPreviewLayout('stellar'); }}
                  className={`text-[10px] font-bold px-3 py-1 rounded-lg transition-all uppercase tracking-wide ${previewLayout === 'stellar' ? 'bg-slate-950 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                >
                  Slate Modern
                </button>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100 animate-pulse">
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
                  <div className="text-right">
                    <p className="font-mono text-[6px] text-emerald-600 font-bold">● SECURE SEED</p>
                    <p className="font-mono text-[5px] text-slate-300">sha256:0edf88cf...</p>
                  </div>
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
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 mt-4 text-xs text-slate-500 flex items-start gap-2.5 group-hover:bg-indigo-50/30 group-hover:border-indigo-100 transition-colors">
              <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-800">Real-time Rendering & Variables:</span> Play around! This is an interactive sandbox simulation. Recipients receive high-fidelity vectors optimized perfectly for print.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Value Matrix */}
      <section ref={featuresRef} id="features" className={`bg-white border-y border-[#E9ECEF] py-24 px-6 lg:px-16 reveal-on-scroll relative z-10 ${featuresRevealed ? 'revealed' : ''}`}>
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="text-center max-w-2xl mx-auto space-y-4">
            <h2 className="font-serif text-3xl md:text-4xl italic text-slate-950">Industrial grade trust framework</h2>
            <p className="text-slate-500 text-sm">
              We design software for credentialing where security, speed, and beautiful layouts can exist within a single unified API pipeline.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <div className="space-y-5 p-8 bg-slate-50 rounded-2xl border border-slate-100 hover:shadow-lg hover:bg-white hover:border-indigo-50 hover:-translate-y-1.5 transition-all duration-300">
              <div className="w-11 h-11 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-sm shadow-indigo-200">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-950">Modular Drag-and-Drop Editor</h3>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Design custom certificates tailored exactly to your brand. Set layout alignments, signature vectors, seals, dynamically binding names, dates, custom scores, and participant roles.
              </p>
            </div>

            <div className="space-y-5 p-8 bg-slate-50 rounded-2xl border border-slate-100 hover:shadow-lg hover:bg-white hover:border-indigo-50 hover:-translate-y-1.5 transition-all duration-300">
              <div className="w-11 h-11 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-sm shadow-indigo-200">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-950">Massive CSV Mapping Engine</h3>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Upload recipient databases instantly. Dynamic columns coordinate to mapped certificate variables with strict formatting validators. Prevents duplicates, format anomalies, or spelling issues automatically.
              </p>
            </div>

            <div className="space-y-5 p-8 bg-slate-50 rounded-2xl border border-slate-100 hover:shadow-lg hover:bg-white hover:border-indigo-50 hover:-translate-y-1.5 transition-all duration-300">
              <div className="w-11 h-11 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-sm shadow-indigo-200">
                <Globe className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-950">Permanent Public Verifier</h3>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Every credential carries a permanent ledger UID and secure custom QR. Verification is live, public-accessible, and requires zero software, login, or registration from auditors.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* High-fidelity verification overview banner */}
      <section ref={ledgerRef} className={`bg-slate-950 text-white py-24 px-6 lg:px-16 overflow-hidden relative z-10 reveal-on-scroll ${ledgerRevealed ? 'revealed' : ''}`}>
        
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
            <p className="text-slate-400 text-xs leading-relaxed">
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

          <div className="lg:col-span-7 bg-white/5 border border-white/10 rounded-2xl p-6 relative hover:border-white/20 transition-colors shadow-2xl">
            <h4 className="font-serif italic text-lg text-white mb-4">Verification Audit Ledger</h4>
            <div className="space-y-3 font-mono text-[9px] text-[#9CA3AF]">
              <div className="p-3 bg-white/5 rounded-lg border border-white/5 flex justify-between items-center hover:bg-white/10 transition-colors">
                <span>[2026-06-12 10:00:00 UTC] WORKSPACE_BATCH_GENERATE</span>
                <span className="text-emerald-400 font-bold">SUCCESS</span>
              </div>
              <div className="p-3 bg-white/5 rounded-lg border border-white/5 flex justify-between items-center hover:bg-white/10 transition-colors">
                <span>[2026-06-12 10:01:15 UTC] DISPATCHED_VERIFICATION_MAIL - admissions@stellarworkshops.io</span>
                <span className="text-emerald-400 font-bold">SENT</span>
              </div>
              <div className="p-3 bg-white/5 rounded-lg border border-white/5 flex justify-between items-center hover:bg-white/10 transition-colors">
                <span>[2026-06-15 15:30:00 UTC] CRYPTOGRAPHIC_REHASH_LEDGER_AUDIT</span>
                <span className="text-indigo-400 font-bold">VERIFIED sha256:0edf88cf...</span>
              </div>
              <div className="p-3 bg-[#3F111E]/40 rounded-lg border border-rose-900/40 flex justify-between items-center text-rose-300">
                <span>[2026-06-16 11:24:10 UTC] REVOCATION_TRIGGER - Flagged Academic Integrity Non-compliance</span>
                <span className="text-rose-400 font-bold">REVOKED STATE</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Matrix */}
      <section ref={pricingRef} id="pricing" className={`py-24 px-6 lg:px-16 max-w-7xl mx-auto space-y-16 reveal-on-scroll relative z-10 ${pricingRevealed ? 'revealed' : ''}`}>
        <div className="text-center max-w-2xl mx-auto space-y-4">
          <p className="text-xs font-bold uppercase tracking-widest text-[#9CA3AF]">SaaS Plans for Every Scale</p>
          <h2 className="font-serif text-3xl md:text-4xl italic text-slate-950">Transparent, enterprise-ready options</h2>
          <p className="text-slate-500 text-sm">
            Self-serve onboarding in minutes, with clear visual feature limits. Upgrade dynamically as requirements expand.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Free Starter */}
          <div className="bg-white rounded-2xl border border-[#E9ECEF] p-8 space-y-6 flex flex-col justify-between hover:shadow-xl hover:border-slate-300/80 transition-all duration-300">
            <div className="space-y-4">
              <p className="text-xs font-bold uppercase tracking-widest text-[#9CA3AF]">Free Trial</p>
              <h3 className="text-2xl font-bold text-slate-950 font-sans">$0<span className="text-xs text-slate-400 font-normal"> / forever</span></h3>
              <p className="text-xs text-slate-500">Perfect to test layouts and seed sample program lists.</p>
              <ul className="space-y-2.5 pt-4 text-xs text-slate-600 border-t border-slate-100">
                <li className="flex gap-2 items-center"><Check className="w-3.5 h-3.5 text-emerald-500" /> up to 10 active certificates</li>
                <li className="flex gap-2 items-center"><Check className="w-3.5 h-3.5 text-emerald-500" /> Landscape & Portrait layouts</li>
                <li className="flex gap-2 items-center"><Check className="w-3.5 h-3.5 text-emerald-500" /> Default brand footer links</li>
                <li className="flex gap-2 text-slate-300 line-through items-center"><Check className="w-3.5 h-3.5" /> High-volume CSV loader</li>
                <li className="flex gap-2 text-slate-300 line-through items-center"><Check className="w-3.5 h-3.5" /> Custom domains & white-label</li>
              </ul>
            </div>
            <button 
              onClick={onStartFree}
              className="w-full bg-slate-50 text-slate-900 border border-[#E9ECEF] hover:bg-slate-100 py-3 rounded-xl text-xs font-bold transition-all text-center"
            >
              Start Instantly
            </button>
          </div>

          {/* Premium Professional */}
          <div className="bg-white rounded-2xl border-2 border-indigo-600 p-8 space-y-6 flex flex-col justify-between relative shadow-xl hover:scale-102 transition-all duration-300">
            <div className="absolute top-0 right-6 -translate-y-1/2 bg-indigo-600 text-white text-[9px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border border-white">
              RECOMMENDED
            </div>
            <div className="space-y-4">
              <p className="text-xs font-bold uppercase tracking-widest text-indigo-600 font-mono">Professional Tier</p>
              <h3 className="text-3xl font-bold text-slate-950 font-sans">$49<span className="text-xs text-slate-400 font-normal"> / month</span></h3>
              <p className="text-xs text-slate-500">Excellent for intensive conference teams & professional workshops.</p>
              <ul className="space-y-2.5 pt-4 text-xs text-slate-600 border-t border-slate-100">
                <li className="flex gap-2 items-center"><Check className="w-3.5 h-3.5 text-emerald-500" /> Unlimited active certs</li>
                <li className="flex gap-2 items-center"><Check className="w-3.5 h-3.5 text-emerald-500" /> Bulk CSV & excel mapper</li>
                <li className="flex gap-2 items-center"><Check className="w-3.5 h-3.5 text-emerald-500" /> Interactive stats & downloads</li>
                <li className="flex gap-2 items-center"><Check className="w-3.5 h-3.5 text-emerald-500" /> Sender email override</li>
                <li className="flex gap-2 text-slate-300 line-through items-center"><Check className="w-3.5 h-3.5" /> White-label domain proxy</li>
              </ul>
            </div>
            <button 
              onClick={() => onSelectWorkspace('ws-stellar')}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl text-xs font-bold transition-all text-center shadow-md shadow-indigo-100"
            >
              Upgrade & Onboard Workspace
            </button>
          </div>

          {/* Enterprise Scaler */}
          <div className="bg-white rounded-2xl border border-[#E9ECEF] p-8 space-y-6 flex flex-col justify-between hover:shadow-xl hover:border-slate-300/80 transition-all duration-300">
            <div className="space-y-4">
              <p className="text-xs font-bold uppercase tracking-widest text-[#9CA3AF]">Enterprise Scale</p>
              <h3 className="text-2xl font-bold text-slate-950 font-sans">$249<span className="text-xs text-slate-400 font-normal"> / month</span></h3>
              <p className="text-xs text-slate-500">For universities, massive bootcamps, and government programs.</p>
              <ul className="space-y-2.5 pt-4 text-xs text-slate-600 border-t border-slate-100">
                <li className="flex gap-2 items-center"><Check className="w-3.5 h-3.5 text-emerald-500" /> All Pro features included</li>
                <li className="flex gap-2 items-center"><Check className="w-3.5 h-3.5 text-emerald-500" /> Custom Domain (TLS automatic)</li>
                <li className="flex gap-2 items-center"><Check className="w-3.5 h-3.5 text-emerald-500" /> 100% white-label system footprint</li>
                <li className="flex gap-2 items-center"><Check className="w-3.5 h-3.5 text-emerald-500" /> L3 Integration & Webhook access</li>
                <li className="flex gap-2 items-center"><Check className="w-3.5 h-3.5 text-emerald-500" /> Priority 24/7 compliance engineer</li>
              </ul>
            </div>
            <button 
              onClick={() => onSelectWorkspace('ws-google-infra')}
              className="w-full bg-slate-50 text-slate-900 border border-[#E9ECEF] hover:bg-slate-100 py-3 rounded-xl text-xs font-bold transition-all text-center"
            >
              Configure Enterprise
            </button>
          </div>
        </div>
      </section>

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
            <a href="#" className="hover:text-white transition-colors">Security Architecture</a>
            <a href="#" className="hover:text-white transition-colors">API Reference</a>
            <a href="#" className="hover:text-white transition-colors">Compliance Standard</a>
            <a href="#" className="hover:text-white transition-colors">Legal Ledger</a>
          </div>
          <p>© 2026 Glint Inc. All rights reserved globally.</p>
        </div>
      </footer>
    </div>
  );
}
