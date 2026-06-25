/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Award, ShieldAlert, CheckCircle, Search, ArrowRight, 
  Check, Zap, Layers, Sparkles, Star, RefreshCw,
  Terminal, Copy, Globe, Cpu, Server, Database, Activity
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
  const [activeFeatureTab, setActiveFeatureTab] = useState(0);

  // Cryptographic Trust Sandbox State
  const [sandboxInput, setSandboxInput] = useState('Recipient: John Doe\nCredential: B.S. Cybersecurity\nSecurity Seal: VERIFIED\nPlatform: Glint Ledger');
  const [sandboxHash, setSandboxHash] = useState('');
  const [copied, setCopied] = useState(false);
  const [ledgerLogs, setLedgerLogs] = useState([
    { id: 894012, hash: 'a1b2c3d4e5f67890abcdef1234567890abcdef1234567890abcdef1234567890', node: 'Oregon', time: '16:56:12' },
    { id: 894013, hash: 'f7e6d5c4b3a2918070605040302010abcdef0f1e2d3c4b5a69788796a5b4c3d2', node: 'Tokyo', time: '16:56:15' },
    { id: 894014, hash: '3e4d5c6b7a892010f0e0d0c0b0a0908070605040302010abcdef0123456789ab', node: 'Frankfurt', time: '16:56:19' }
  ]);

  // SHA-256 Cryptographic Sandbox Calculator
  useEffect(() => {
    const calculateHash = async () => {
      if (!sandboxInput) {
        setSandboxHash('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
        return;
      }
      try {
        const msgBuffer = new TextEncoder().encode(sandboxInput);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        setSandboxHash(hashHex);
      } catch (err) {
        let hash = 0;
        for (let i = 0; i < sandboxInput.length; i++) {
          hash = (hash << 5) - hash + sandboxInput.charCodeAt(i);
          hash |= 0;
        }
        setSandboxHash('simulated_hash_' + Math.abs(hash).toString(16).padStart(16, '0'));
      }
    };
    calculateHash();
  }, [sandboxInput]);

  // Dynamic Ledger Log update
  useEffect(() => {
    const nodes = ['Oregon', 'Tokyo', 'Frankfurt', 'London'];
    const interval = setInterval(() => {
      setLedgerLogs(prev => {
        const nextId = prev[prev.length - 1].id + 1;
        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
        const randomNode = nodes[Math.floor(Math.random() * nodes.length)];
        
        // Generate a random mock SHA-256 hex string
        const chars = '0123456789abcdef';
        let randomHash = '';
        for (let i = 0; i < 64; i++) {
          randomHash += chars[Math.floor(Math.random() * 16)];
        }

        const newLog = {
          id: nextId,
          hash: randomHash,
          node: randomNode,
          time: timeStr
        };
        return [...prev.slice(1), newLog];
      });
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  const handleCopyHash = () => {
    navigator.clipboard.writeText(sandboxHash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
      <header className={`sticky top-0 z-50 flex items-center justify-between px-4 sm:px-6 lg:px-16 transition-all duration-500 ${
        scrollY > 20 
          ? "h-14 bg-white/75 backdrop-blur-2xl border-b border-white/50 shadow-[0_10px_35px_rgba(0,0,0,0.03)] glossy-glow" 
          : "h-16 bg-white/45 backdrop-blur-xl border-b border-white/20 shadow-none"
      }`}>
        <div className="flex items-center gap-2">
          <svg className="w-6 h-6 sm:w-8 sm:h-8 shrink-0 hover:scale-105 transition-transform duration-300" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M23 16C23 19.866 19.866 23 16 23C12.134 23 9 19.866 9 16C9 12.134 12.134 9 16 9C18.6 9 20.9 10.4 22.1 12.5" stroke="#0F172A" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M15 16H23" stroke="#0F172A" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M24 7C24 9.2 25.2 10 27 10C25.2 10 24 10.8 24 13C24 10.8 22.8 10 21 10C22.8 10 24 9.2 24 7Z" fill="#F59E0B" />
          </svg>
          <span className="font-display font-extrabold tracking-wider text-slate-950 text-xs sm:text-sm md:text-base uppercase">GLINT REGISTRY</span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-3">
          <button 
            onClick={() => onSelectWorkspace('ws-google-infra')}
            className="text-[10px] sm:text-xs font-semibold text-slate-700 hover:text-slate-950 px-2.5 sm:px-3.5 py-1.5 sm:py-2 transition-all border border-[#E9ECEF]/85 hover:bg-white rounded-lg shadow-[0_1px_2px_rgba(0,0,0,0.02)] whitespace-nowrap"
          >
            Sign In
          </button>
          <button 
            onClick={onStartFree}
            className="bg-slate-950 text-white text-[10px] sm:text-xs px-3 sm:px-5 py-2 sm:py-2.5 rounded-full font-semibold shadow-[0_4px_12px_rgba(0,0,0,0.05)] hover:bg-indigo-650 hover:shadow-indigo-100 transition-all duration-300 flex items-center gap-1 group whitespace-nowrap"
          >
            Start Free <ArrowRight className="w-3 sm:w-3.5 h-3 sm:h-3.5 group-hover:translate-x-1 transition-transform" />
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
                borderWidth: previewLayout === 'google' ? '0.6cqw' : '0.8cqw',
                borderColor: previewLayout === 'google' ? '#1a73e8' : '#0F172A',
                containerType: 'inline-size'
              }}
              className="aspect-[1.414/1] rounded-lg p-[4cqw] relative flex flex-col justify-between transition-all duration-500 border-double overflow-hidden shadow-inner"
            >
              {/* Top Banner Branding */}
              <div className="flex justify-between items-start">
                <div>
                  <p style={{ color: previewLayout === 'google' ? '#1a73e8' : '#ec4899' }} className="font-mono text-[1.8cqw] uppercase tracking-widest font-bold">
                    {previewLayout === 'google' ? 'Google Cloud Credentials' : 'Stellar Tech Academy'}
                  </p>
                  <p className="text-[1.4cqw] text-[#9CA3AF] tracking-tight">VERIFIED ID: CERT-2026-XPREV</p>
                </div>
                <div className="w-[11cqw] h-[4.8cqw] border bg-white/60 p-[0.2cqw] rounded flex items-center justify-center text-[1.4cqw] font-bold border-slate-200 uppercase truncate">
                  {previewLayout === 'google' ? '★ GOOGLE' : 'STELLAR'}
                </div>
              </div>

              {/* Title Center */}
              <div className="text-center space-y-[0.3cqw] py-[0.2cqw]">
                <p style={{ color: previewLayout === 'google' ? '#1B365D' : '#0F172A' }} className="font-display font-bold text-[2.2cqw] uppercase tracking-widest">
                  {previewLayout === 'google' ? 'CERTIFICATE OF ACHIEVEMENT' : 'CREDENTIAL OF RECOGNITION'}
                </p>
                <p className="text-[1.4cqw] text-[#64748B] italic max-w-[80cqw] mx-auto">
                  Acknowledging the successful validation and mastery of industrial design and infrastructure services.
                </p>
                
                {/* Dynamic Input in-frame */}
                <div className="relative inline-block mt-[1.5cqw] px-[1cqw]">
                  <input
                    type="text"
                    value={previewName}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => setPreviewName(e.target.value)}
                    style={{ fontSize: '3.5cqw', width: '40cqw' }}
                    className="serif text-center font-bold text-[#0F172A] border-b border-dashed border-slate-300 focus:border-slate-800 bg-transparent py-[0.1cqw] focus:outline-none min-w-[120px]"
                    placeholder="Recipient Name"
                  />
                  <div className="text-[1.2cqw] text-slate-400 mt-[0.2cqw] uppercase tracking-widest font-mono">Click above to type your own name</div>
                </div>

                <p className="text-[1.4cqw] text-[#64748B] px-[0.5cqw] pt-[0.2cqw]">
                  for expert architectural integration of the <span className="font-medium text-slate-900">Advanced API & Platform Ledger System</span>
                </p>
              </div>

              {/* Bottom Row Footer */}
              <div className="flex justify-between items-end pt-[1cqw] border-t border-slate-100">
                <div className="text-left">
                  <p className="font-mono text-[1.4cqw] text-slate-400 uppercase">ISSUED ON</p>
                  <p className="font-mono text-[1.6cqw] font-bold text-slate-700">2026-06-17</p>
                </div>
                <div className="text-center">
                  <div className="h-[4.8cqw] w-[11cqw] border-b border-slate-900 mx-auto"></div>
                  <p className="font-sans text-[1.2cqw] font-bold text-slate-700 mt-[0.2cqw]">Thomas Kurian</p>
                  <p className="font-sans text-[1cqw] text-slate-400">Chief Authority Officer</p>
                </div>
                <div className="text-right flex items-center gap-[0.2cqw]">
                  <div className="w-[4.8cqw] h-[4.8cqw] bg-white p-[0.1cqw] rounded-sm border border-slate-200 shadow-sm flex items-center justify-center">
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

      {/* Interactive Cryptographic Hash Sandbox & Registry Node Explorer */}
      <motion.section 
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-120px" }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        id="sandbox" 
        className="py-24 px-6 lg:px-16 bg-white border-y border-slate-200/50 relative z-10 overflow-hidden"
      >
        {/* Subtle backdrop glows */}
        <div className="absolute top-1/4 -left-1/4 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 -right-1/4 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-7xl mx-auto space-y-12">
          {/* Header */}
          <div className="text-center max-w-2xl mx-auto space-y-4">
            <span className="text-xs font-bold uppercase tracking-widest text-indigo-600 bg-indigo-50 px-3.5 py-1.5 rounded-full border border-indigo-100">
              Interactive Trust Ledger
            </span>
            <h2 className="font-serif text-3xl md:text-4.5xl italic text-slate-950">
              Cryptographic Sandbox & Node Explorer
            </h2>
            <p className="text-slate-500 text-sm">
              Type any credential data payload to see real-time SHA-256 integrity fingerprinting and visualize validation across global ledger registry nodes.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
            {/* Left Column: SHA-256 Sandbox Console */}
            <div className="lg:col-span-6 flex flex-col">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between flex-1 relative overflow-hidden">
                {/* Header of Console */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-5">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-indigo-400" />
                    <span className="font-mono text-xs font-bold text-slate-200">hashing_console.exe</span>
                  </div>
                  <div className="flex gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                  </div>
                </div>

                <div className="space-y-4 flex-1 flex flex-col justify-between">
                  <div>
                    <label className="block text-[10px] uppercase font-mono tracking-wider text-indigo-400 mb-2 font-bold">
                      INPUT PAYLOAD (STRING DATA)
                    </label>
                    <textarea 
                      value={sandboxInput}
                      onChange={(e) => setSandboxInput(e.target.value)}
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 placeholder-slate-600 resize-none min-h-[110px]"
                      placeholder="Type credential details to compute cryptographic hash..."
                    />
                  </div>

                  {/* Flow arrow/visual connector */}
                  <div className="flex items-center justify-center gap-3 py-1">
                    <div className="h-[1px] bg-gradient-to-r from-transparent via-slate-700 to-transparent flex-1" />
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-mono text-[9px] uppercase tracking-wider animate-pulse">
                      <RefreshCw className="w-2.5 h-2.5 animate-spin" /> SHA-256 Engine
                    </div>
                    <div className="h-[1px] bg-gradient-to-r from-transparent via-slate-700 to-transparent flex-1" />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-mono tracking-wider text-emerald-400 mb-2 font-bold">
                      SHA-256 CRYPTOGRAPHIC DIGEST
                    </label>
                    <div className="relative group/hash">
                      <div className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-100 pr-12 break-all min-h-[72px] leading-relaxed select-all">
                        {sandboxHash}
                      </div>
                      <button 
                        onClick={handleCopyHash}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-all border border-slate-700/50 cursor-pointer"
                        title="Copy cryptographic signature"
                      >
                        {copied ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Console Metadata Footer */}
                <div className="grid grid-cols-3 gap-4 border-t border-slate-800/80 pt-4 mt-6 text-center">
                  <div>
                    <span className="block text-[8px] text-slate-500 uppercase font-mono">HASH LENGTH</span>
                    <span className="font-mono text-xs font-bold text-slate-300">256 Bits</span>
                  </div>
                  <div>
                    <span className="block text-[8px] text-slate-500 uppercase font-mono">LATENCY</span>
                    <span className="font-mono text-xs font-bold text-emerald-400 flex items-center justify-center gap-1">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" /> &lt; 0.1ms
                    </span>
                  </div>
                  <div>
                    <span className="block text-[8px] text-slate-500 uppercase font-mono">SECURITY</span>
                    <span className="font-mono text-xs font-bold text-indigo-400 font-bold">AES-HMAC</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Global Registry Explorer & Live Ledger */}
            <div className="lg:col-span-6 flex flex-col justify-between space-y-6">
              {/* Trust Nodes Status Dashboard */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between flex-1">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-indigo-600" />
                    <span className="font-sans text-xs font-bold text-slate-900">Distributed Registry Nodes</span>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-100">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> 4 Nodes Connected
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 py-4">
                  {[
                    { name: 'Tokyo Registry Node', latency: '14ms', icon: Cpu },
                    { name: 'Frankfurt Ledger Node', latency: '28ms', icon: Server },
                    { name: 'Oregon Validator Node', latency: '42ms', icon: Database },
                    { name: 'London Authority Node', latency: '21ms', icon: Activity },
                  ].map((node, i) => (
                    <div key={i} className="bg-white border border-slate-100 p-3 rounded-xl shadow-xs flex items-center justify-between hover:shadow-sm transition-all duration-200">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                          <node.icon className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-800 leading-none mb-0.5">{node.name}</p>
                          <p className="text-[8px] text-slate-400 font-mono">Ping: {node.latency}</p>
                        </div>
                      </div>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                    </div>
                  ))}
                </div>

                {/* Ledger Activity Stream */}
                <div className="flex-1 flex flex-col justify-end mt-2">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 font-mono">
                    <Activity className="w-3.5 h-3.5 text-indigo-500 animate-pulse" /> Live Trust Validation Feed
                  </div>
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-[9px] text-slate-400 space-y-2 max-h-[140px] overflow-hidden shadow-inner flex flex-col justify-end">
                    <AnimatePresence initial={false}>
                      {ledgerLogs.map((log) => (
                        <motion.div 
                          key={log.id} 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.3 }}
                          className="flex items-start justify-between border-b border-slate-800/40 pb-1.5 last:border-0 last:pb-0"
                        >
                          <div className="flex items-center gap-1.5 text-slate-300">
                            <span className="text-emerald-500">✔</span>
                            <span>BLOCK #{log.id}</span>
                            <span className="text-indigo-400 font-bold">[{log.node}]</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-slate-500 text-[8.5px] truncate max-w-[110px] xl:max-w-[180px]" title={log.hash}>
                              {log.hash.substring(0, 8)}...{log.hash.substring(56)}
                            </span>
                            <span className="text-slate-600 text-[8px] font-medium">{log.time}</span>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
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
            <span className="font-display font-extrabold tracking-wider text-white uppercase text-xs">GLINT REGISTRY</span>
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
