/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Braces,
  Check,
  CheckCircle2,
  ChevronRight,
  Download,
  Eye,
  FileCheck2,
  FileText,
  Image as ImageIcon,
  Layers3,
  Link2,
  Mail,
  MailCheck,
  MousePointer2,
  Palette,
  PenLine,
  QrCode,
  RefreshCw,
  RotateCw,
  ScanLine,
  Send,
  ShieldCheck,
  Sparkles,
  Upload,
  UsersRound,
} from 'lucide-react';
import {
  MotionConfig,
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from 'framer-motion';
import { PLAN_LABEL, PLAN_LIMITS, PLAN_ORDER, type Plan } from '../../lib/plans';
import { VerifyCertificateModal } from './VerifyCertificateModal';
import { LifecycleStory } from './landing/LifecycleStory';

interface LandingPageProps {
  onStartFree: () => void;
  onSignIn: () => void;
}

const EASE = [0.16, 1, 0.3, 1] as const;

const reveal = {
  hidden: { opacity: 0, y: 26 },
  visible: { opacity: 1, y: 0 },
};

const studioFeatures = [
  {
    icon: MousePointer2,
    title: 'Place with intent',
    body: 'Snap, align, pan, zoom, rotate, flip, resize, undo and redo with precise canvas controls.',
  },
  {
    icon: Palette,
    title: 'Build your identity in layers',
    body: 'Add logos, uploaded imagery, signatures, frames, backgrounds, seals and verification QR codes.',
  },
  {
    icon: Braces,
    title: 'Design once. Personalize every issue.',
    body: 'Place recipient, program, certificate ID, date and custom program fields anywhere in the layout.',
  },
  {
    icon: Upload,
    title: 'Keep designs portable',
    body: 'Import and export .glint templates with their assets and fonts, then reuse them across organizations.',
  },
];

const operationCards = [
  {
    icon: BarChart3,
    title: 'See the signal',
    body: 'Follow issuance and verification activity alongside page views, downloads and shares.',
  },
  {
    icon: FileCheck2,
    title: 'Find any certificate',
    body: 'Search the registry by recipient, email, certificate ID or program.',
  },
  {
    icon: MailCheck,
    title: 'Follow delivery',
    body: 'Review send attempts and delivery outcomes, then resend when needed.',
  },
  {
    icon: RefreshCw,
    title: 'Keep status current',
    body: 'Revoke with a reason, restore when appropriate and reflect the state publicly.',
  },
];

const planBullets: Record<Plan, string[]> = {
  free: [
    '1 organization and 1 template',
    'Up to 5 valid certificates',
    'One recipient per issuance',
    'Workspace-branded default emails',
  ],
  pro: [
    'Up to 2 organizations',
    '5 templates and 50 valid certificates per workspace',
    'Up to 10 recipients per batch',
    'Custom templates for issuance and digest emails',
  ],
  enterprise: [
    'Up to 5 organizations',
    'No plan limit on templates or valid certificates per workspace',
    'Up to 1,000 recipients per batch',
    'No Powered by Glint attribution on Enterprise-workspace emails',
  ],
};

function Brand({ inverse = false }: { inverse?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <img src="/favicon.svg" alt="" aria-hidden="true" className="h-8 w-8 rounded-[9px]" />
      <span className={`font-display text-[15px] font-semibold tracking-[-0.02em] ${inverse ? 'text-white' : 'text-[#0B1020]'}`}>
        Glint
      </span>
    </span>
  );
}

function SectionEyebrow({ children, light = false }: { children: React.ReactNode; light?: boolean }) {
  return (
    <div className={`inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] ${light ? 'text-[#F5C96A]' : 'text-[#3157E5]'}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${light ? 'bg-[#F2B84B]' : 'bg-[#3157E5]'}`} />
      {children}
    </div>
  );
}

function HeroCredential() {
  return (
    <div className="relative mx-auto w-full max-w-[690px] [perspective:1400px]" aria-hidden="true">
      <motion.div
        initial={{ opacity: 0, y: 38, rotateX: 7, rotateY: -5 }}
        animate={{ opacity: 1, y: 0, rotateX: 0, rotateY: 0 }}
        transition={{ duration: 1.05, delay: 0.22, ease: EASE }}
        className="relative overflow-hidden rounded-[28px] border border-white/80 bg-white/80 p-2 shadow-[0_40px_100px_-45px_rgba(11,16,32,0.5)] backdrop-blur-xl"
      >
        <div className="overflow-hidden rounded-[22px] border border-[#DDE1EA] bg-[#EEF1F6]">
          <div className="flex h-11 items-center justify-between border-b border-[#DDE1EA] bg-white px-4">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#F2B84B]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#DBE2F3]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#DBE2F3]" />
              <span className="ml-2 text-[10px] font-semibold text-slate-500">Certificate studio</span>
            </div>
            <div className="flex items-center gap-2 text-[9px] font-medium text-slate-400">
              <span className="rounded-md bg-slate-100 px-2 py-1">92%</span>
              <span className="rounded-md bg-[#0B1020] px-2 py-1 text-white">Saved</span>
            </div>
          </div>

          <div className="grid min-h-[420px] grid-cols-[48px_1fr] sm:grid-cols-[56px_1fr_132px]">
            <div className="flex flex-col items-center gap-4 border-r border-[#DDE1EA] bg-white py-4 text-slate-400">
              {[MousePointer2, PenLine, ImageIcon, Layers3].map((Icon, index) => (
                <span key={index} className={`flex h-8 w-8 items-center justify-center rounded-lg ${index === 0 ? 'bg-[#3157E5] text-white shadow-md shadow-blue-200' : ''}`}>
                  <Icon className="h-3.5 w-3.5" />
                </span>
              ))}
            </div>

            <div className="relative flex items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_center,rgba(49,87,229,0.08),transparent_66%)] p-5 sm:p-8">
              <div className="absolute inset-0 opacity-35 [background-image:radial-gradient(#98A2B8_1px,transparent_1px)] [background-size:20px_20px]" />
              <motion.div
                initial={{ scale: 0.94, y: 14 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ duration: 0.9, delay: 0.45, ease: EASE }}
                className="relative aspect-[1.414/1] w-full max-w-[440px] overflow-hidden bg-[#FFFDF8] shadow-[0_20px_45px_-25px_rgba(15,23,42,0.45)] ring-1 ring-[#D6B553]"
              >
                <div className="absolute inset-3 border border-[#D6B553]/65" />
                <div className="absolute left-5 top-5 flex items-center gap-1.5 text-[5px] font-semibold uppercase tracking-[0.2em] text-[#3157E5] sm:text-[7px]">
                  <span className="h-1 w-1 rounded-full bg-[#F2B84B]" /> Sample Learning Studio
                </div>
                <div className="absolute inset-x-[12%] top-[24%] text-center">
                  <p className="text-[5px] font-semibold uppercase tracking-[0.32em] text-slate-400 sm:text-[7px]">Certificate of completion</p>
                  <p className="glint-display mt-2 text-[19px] font-semibold leading-none text-[#0B1020] sm:text-[28px]">Alex Rivera</p>
                  <p className="mx-auto mt-3 max-w-[75%] text-[5px] leading-relaxed text-slate-500 sm:text-[7px]">
                    has completed the Product Leadership intensive
                  </p>
                </div>
                <div className="absolute inset-x-[10%] bottom-[14%] flex items-end justify-between">
                  <div className="text-left text-[5px] text-slate-400 sm:text-[7px]">
                    <span className="block uppercase tracking-wider">Issued</span>
                    <span className="font-medium text-slate-700">11 Jul 2026</span>
                  </div>
                  <div className="text-center text-[5px] text-slate-400 sm:text-[7px]">
                    <span className="glint-display block text-[10px] text-[#0B1020] sm:text-[13px]">Sample Signatory</span>
                    Programme Director
                  </div>
                  <div className="flex h-7 w-7 items-center justify-center border border-slate-200 bg-white text-slate-700 sm:h-9 sm:w-9">
                    <QrCode className="h-5 w-5 sm:h-7 sm:w-7" />
                  </div>
                </div>

                <motion.div
                  animate={{ opacity: [0.72, 1, 0.72], scale: [1, 1.015, 1] }}
                  transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute left-[24%] top-[39%] h-[22%] w-[50%] border border-[#3157E5] bg-blue-50/20"
                >
                  <span className="absolute -left-1 -top-1 h-2 w-2 border border-[#3157E5] bg-white" />
                  <span className="absolute -right-1 -top-1 h-2 w-2 border border-[#3157E5] bg-white" />
                  <span className="absolute -bottom-1 -left-1 h-2 w-2 border border-[#3157E5] bg-white" />
                  <span className="absolute -bottom-1 -right-1 h-2 w-2 border border-[#3157E5] bg-white" />
                </motion.div>
              </motion.div>
            </div>

            <div className="hidden border-l border-[#DDE1EA] bg-white p-3 sm:block">
              <p className="text-[9px] font-semibold text-[#0B1020]">Recipient name</p>
              <div className="mt-4 space-y-3">
                <div>
                  <p className="text-[7px] uppercase tracking-wider text-slate-400">Placeholder</p>
                  <div className="mt-1 rounded-md border border-[#DDE1EA] bg-slate-50 px-2 py-1.5 font-mono text-[8px] text-[#3157E5]">{'{{name}}'}</div>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <div className="rounded-md bg-slate-50 p-2 text-[7px] text-slate-500">X&nbsp; 50%</div>
                  <div className="rounded-md bg-slate-50 p-2 text-[7px] text-slate-500">Y&nbsp; 42%</div>
                </div>
                <div className="h-px bg-slate-100" />
                <div className="space-y-1.5">
                  {['Font', 'Size', 'Colour', 'Alignment'].map((label) => (
                    <div key={label} className="flex items-center justify-between rounded-md border border-slate-100 px-2 py-1.5 text-[7px] text-slate-500">
                      {label}<ChevronRight className="h-2.5 w-2.5" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 24, y: 12 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ duration: 0.75, delay: 1, ease: EASE }}
        className="absolute -bottom-5 right-2 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-white px-4 py-3 shadow-[0_18px_45px_-22px_rgba(16,185,129,0.7)] sm:-right-5"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <BadgeCheck className="h-5 w-5" />
        </span>
        <span>
          <span className="block text-[11px] font-semibold text-[#0B1020]">Ready to verify</span>
          <span className="block text-[9px] text-slate-500">Protected fields · Live status check</span>
        </span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, delay: 0.8, ease: EASE }}
        className="absolute -left-2 top-[22%] hidden rounded-xl border border-[#E6D5A8] bg-[#FFF9E8] px-3 py-2 text-[9px] font-semibold text-[#74530A] shadow-lg sm:block"
      >
        <span className="flex items-center gap-1.5"><Braces className="h-3 w-3" /> Custom fields connected</span>
      </motion.div>
    </div>
  );
}

function StudioScene() {
  return (
    <div className="relative min-h-[470px] overflow-hidden rounded-[28px] border border-[#DDE1EA] bg-[#EDF0F5] p-3 shadow-[0_35px_90px_-55px_rgba(11,16,32,0.55)]" aria-hidden="true">
      <div className="flex h-11 items-center justify-between rounded-t-[20px] border border-[#DDE1EA] bg-white px-4">
        <div className="flex items-center gap-2 text-[10px] font-semibold text-[#0B1020]"><Layers3 className="h-3.5 w-3.5 text-[#3157E5]" /> Leadership credential</div>
        <div className="flex items-center gap-2 text-[9px] text-slate-400"><RotateCw className="h-3 w-3" /> Undo <span className="rounded-md bg-[#0B1020] px-2 py-1 text-white">Save</span></div>
      </div>
      <div className="grid min-h-[395px] grid-cols-1 overflow-hidden rounded-b-[20px] border-x border-b border-[#DDE1EA] bg-[#E8ECF2] sm:grid-cols-[148px_1fr_138px]">
        <div className="hidden border-r border-[#DDE1EA] bg-white p-3 sm:block">
          <p className="text-[8px] font-semibold uppercase tracking-wider text-slate-400">Dynamic fields</p>
          <div className="mt-3 space-y-2">
            {['{{name}}', '{{program}}', '{{date}}', '{{credential_id}}'].map((field, i) => (
              <motion.div
                key={field}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 font-mono text-[8px] text-[#3157E5]"
              >{field}</motion.div>
            ))}
          </div>
          <div className="mt-5 border-t border-slate-100 pt-4">
            <p className="text-[8px] font-semibold uppercase tracking-wider text-slate-400">Layers</p>
            <div className="mt-2 space-y-2 text-[8px] text-slate-500">
              <div className="flex items-center gap-2"><Eye className="h-3 w-3" /> Recipient</div>
              <div className="flex items-center gap-2"><Eye className="h-3 w-3" /> Program</div>
              <div className="flex items-center gap-2"><Eye className="h-3 w-3" /> Signature</div>
            </div>
          </div>
        </div>
        <div className="relative flex items-center justify-center overflow-hidden p-5">
          <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(#98A2B8_1px,transparent_1px)] [background-size:18px_18px]" />
          <motion.div
            initial={{ rotate: -2, scale: 0.92 }}
            whileInView={{ rotate: 0, scale: 1 }}
            viewport={{ once: true, amount: 0.45 }}
            transition={{ duration: 0.8, ease: EASE }}
            className="relative aspect-[1.414/1] w-full max-w-[430px] bg-[#FFFDF8] shadow-xl ring-1 ring-[#D6B553]"
          >
            <div className="absolute inset-3 border border-[#D6B553]/60" />
            <div className="absolute inset-x-0 top-[18%] text-center">
              <p className="text-[6px] font-semibold uppercase tracking-[0.26em] text-[#3157E5] sm:text-[8px]">Advanced facilitation</p>
              <p className="glint-display mt-3 text-[20px] font-semibold text-[#0B1020] sm:text-[29px]">Alex Rivera</p>
                  <p className="mt-2 text-[6px] text-slate-500 sm:text-[8px]">Sample Learning Studio · Cohort 07</p>
            </div>
            <motion.div
              initial={{ opacity: 0, scaleX: 0.8 }}
              whileInView={{ opacity: 1, scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.35, duration: 0.55 }}
              className="absolute left-[24%] top-[38%] h-[22%] w-[52%] border border-[#3157E5]"
            >
              {['-left-1 -top-1', '-right-1 -top-1', '-bottom-1 -left-1', '-bottom-1 -right-1'].map((pos) => <span key={pos} className={`absolute ${pos} h-2 w-2 border border-[#3157E5] bg-white`} />)}
            </motion.div>
            <div className="absolute inset-x-[12%] bottom-[14%] flex items-end justify-between text-[5px] text-slate-400 sm:text-[7px]">
              <span>ISSUED 11 JUL 2026</span><span className="glint-display text-[10px] text-[#0B1020] sm:text-[13px]">Sample Signatory</span><QrCode className="h-7 w-7 text-[#0B1020]" />
            </div>
          </motion.div>
        </div>
        <div className="hidden border-l border-[#DDE1EA] bg-white p-3 sm:block">
          <p className="text-[9px] font-semibold text-[#0B1020]">Typography</p>
          <div className="mt-4 space-y-2">
            <div className="rounded-md border border-slate-200 px-2 py-2 text-[8px] text-slate-500">Cormorant Garamond</div>
            <div className="grid grid-cols-2 gap-1.5"><span className="rounded-md bg-slate-50 p-2 text-[8px] text-slate-500">28 px</span><span className="rounded-md bg-slate-50 p-2 text-[8px] text-slate-500">600</span></div>
            <div className="flex h-8 items-center gap-2 rounded-md border border-slate-200 px-2 text-[8px] text-slate-500"><span className="h-3 w-3 rounded-sm bg-[#0B1020]" /> #0B1020</div>
          </div>
          <div className="mt-5 border-t border-slate-100 pt-4">
            <p className="text-[8px] font-semibold uppercase tracking-wider text-slate-400">Position</p>
            <div className="mt-2 grid grid-cols-2 gap-1.5 text-[8px] text-slate-500"><span className="rounded bg-slate-50 p-2">X 50%</span><span className="rounded bg-slate-50 p-2">Y 41%</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DeliveryScene() {
  const rows = [
    ['Alex Rivera', 'alex@example.org', 'Ready'],
    ['Jordan Lee', 'jordan@example.org', 'Ready'],
    ['Priya Shah', 'priya@example.org', 'Ready'],
  ];

  return (
    <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.06] p-4 shadow-2xl" aria-hidden="true">
      <div className="overflow-hidden rounded-[20px] border border-white/10 bg-[#11182A]">
        <div className="flex h-12 items-center justify-between border-b border-white/10 px-4">
          <div className="flex items-center gap-2 text-[10px] font-semibold text-white"><UsersRound className="h-3.5 w-3.5 text-[#F2B84B]" /> Product Leadership · Cohort 07</div>
          <span className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-[8px] font-semibold text-emerald-300">3 valid rows</span>
        </div>
        <div className="p-4">
          <div className="overflow-hidden rounded-xl border border-white/10">
            <div className="grid grid-cols-[1fr_1.4fr_62px] bg-white/[0.06] px-3 py-2 text-[8px] font-semibold uppercase tracking-wider text-slate-400">
              <span>Recipient</span><span>Email</span><span>Status</span>
            </div>
            {rows.map((row, i) => (
              <motion.div
                key={row[1]}
                initial={{ opacity: 0, x: -12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.15 + i * 0.12 }}
                className="grid grid-cols-[1fr_1.4fr_62px] border-t border-white/10 px-3 py-3 text-[9px] text-slate-300"
              >
                <span className="font-medium text-white">{row[0]}</span><span className="truncate">{row[1]}</span><span className="text-emerald-300">{row[2]}</span>
              </motion.div>
            ))}
          </div>
          <div className="mt-4 flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.035] p-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[9px] font-semibold text-white">Choose the delivery moment</p>
              <p className="mt-1 text-[8px] text-slate-400">Issue only, send now, or deliver later from the registry.</p>
            </div>
            <div className="flex gap-2">
              <span className="rounded-lg border border-white/10 px-3 py-2 text-[8px] font-semibold text-slate-300">Issue only</span>
              <span className="flex items-center gap-1.5 rounded-lg bg-[#3157E5] px-3 py-2 text-[8px] font-semibold text-white"><Send className="h-3 w-3" /> Issue &amp; send</span>
            </div>
          </div>
        </div>
      </div>
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.55, duration: 0.65, ease: EASE }}
        className="absolute -bottom-2 right-7 flex items-center gap-2 rounded-xl border border-emerald-400/25 bg-[#0D281F] px-3 py-2 text-[8px] font-semibold text-emerald-300 shadow-lg"
      >
        <MailCheck className="h-3.5 w-3.5" /> Delivery activity recorded
      </motion.div>
    </div>
  );
}

function VerificationScene({ onOpen }: { onOpen: () => void }) {
  return (
    <div className="relative mx-auto w-full max-w-[590px]" aria-label="Example of an authentic Glint verification result">
      <div className="relative overflow-hidden rounded-[30px] border border-[#DDE1EA] bg-white p-3 shadow-[0_35px_90px_-50px_rgba(11,16,32,0.5)]">
        <div className="rounded-[22px] bg-[#F7F8FA] p-5 sm:p-7">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <Brand />
            <span className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[9px] font-semibold text-emerald-700"><BadgeCheck className="h-3 w-3" /> Authentic</span>
          </div>
          <div className="py-7 text-center">
            <motion.div
              initial={{ scale: 0.75, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ type: 'spring', stiffness: 180, damping: 18 }}
              className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"
            >
              <ShieldCheck className="h-8 w-8" />
            </motion.div>
            <h3 className="mt-5 text-xl font-semibold tracking-[-0.03em] text-[#0B1020]">Glint’s integrity check passes.</h3>
            <p className="mx-auto mt-2 max-w-sm text-[12px] leading-relaxed text-slate-500">The protected issuance fields match, and this credential is neither expired nor revoked.</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[9px] sm:grid-cols-4">
            {[
              ['Recipient', 'Alex Rivera'],
              ['Program', 'Product Leadership'],
              ['Issued', '11 Jul 2026'],
              ['Status', 'Valid'],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-slate-200 bg-white p-3">
                <span className="block text-slate-400">{label}</span><span className="mt-1 block truncate font-semibold text-[#0B1020]">{value}</span>
              </div>
            ))}
          </div>
          <button type="button" onClick={onOpen} className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#0B1020] px-4 py-3 text-[12px] font-semibold text-white transition-colors hover:bg-[#3157E5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3157E5] focus-visible:ring-offset-2">
            Try the real verifier <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className="absolute -left-4 top-24 hidden rounded-2xl border border-[#E6D5A8] bg-[#FFF9E8] p-3 shadow-lg sm:block" aria-hidden="true">
        <QrCode className="h-8 w-8 text-[#0B1020]" />
      </div>
      <div className="absolute -right-5 bottom-24 hidden rounded-2xl border border-blue-100 bg-white px-3 py-2 text-[9px] font-semibold text-[#3157E5] shadow-lg sm:flex sm:items-center sm:gap-2" aria-hidden="true">
        <ScanLine className="h-3.5 w-3.5" /> ID · Link · PDF
      </div>
    </div>
  );
}

export function LandingPage({ onStartFree, onSignIn }: LandingPageProps) {
  const [verifierOpen, setVerifierOpen] = useState(false);
  const heroRef = useRef<HTMLElement>(null);
  const reducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const rawHeroY = useTransform(scrollYProgress, [0, 1], [0, reducedMotion ? 0 : 110]);
  const rawHeroOpacity = useTransform(scrollYProgress, [0, 0.82], [1, reducedMotion ? 1 : 0]);
  const heroY = useSpring(rawHeroY, { stiffness: 90, damping: 24, mass: 0.35 });

  const openVerifier = () => setVerifierOpen(true);

  return (
    <MotionConfig reducedMotion="user">
    <div className="glint-landing min-h-screen overflow-x-clip bg-[#F8F6F1] text-[#0B1020] selection:bg-[#F2B84B] selection:text-[#0B1020]">
      <a href="#main-content" className="fixed left-4 top-3 z-[100] -translate-y-20 rounded-lg bg-[#0B1020] px-4 py-2 text-sm font-semibold text-white transition-transform focus:translate-y-0">Skip to content</a>

      <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-5">
        <nav aria-label="Main navigation" className="mx-auto flex h-14 max-w-[1240px] items-center justify-between rounded-2xl border border-white/80 bg-white/78 px-3 shadow-[0_12px_40px_-25px_rgba(11,16,32,0.32)] backdrop-blur-xl sm:px-5">
          <a href="#top" aria-label="Glint home" className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3157E5]"><Brand /></a>
          <div className="hidden items-center gap-1 lg:flex">
            {[
              ['Workflow', '#workflow'],
              ['Certificate studio', '#studio'],
              ['Verification', '#verification'],
              ['Plans', '#plans'],
            ].map(([label, href]) => (
              <a key={href} href={href} className="rounded-lg px-3 py-2 text-[12px] font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-[#0B1020] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3157E5]">{label}</a>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={openVerifier} className="hidden min-h-10 rounded-xl px-3 text-[12px] font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-[#0B1020] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3157E5] md:block">Verify</button>
            <button type="button" onClick={onSignIn} className="hidden min-h-10 rounded-xl px-3 text-[12px] font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-[#0B1020] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3157E5] sm:block">Sign in</button>
            <button type="button" onClick={onStartFree} className="group flex min-h-10 items-center gap-1.5 rounded-xl bg-[#0B1020] px-4 text-[11px] font-semibold text-white transition-all hover:bg-[#3157E5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3157E5] focus-visible:ring-offset-2 sm:text-[12px]">
              Start free <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </button>
          </div>
        </nav>
      </header>

      <main id="main-content">
        <section ref={heroRef} id="top" className="relative flex min-h-[960px] items-center overflow-hidden px-5 pb-24 pt-28 sm:px-8 lg:min-h-[900px] lg:pt-32">
          <motion.div style={{ y: heroY, opacity: rawHeroOpacity }} className="absolute inset-0" aria-hidden="true">
            <div className="absolute -left-24 top-24 h-[420px] w-[420px] rounded-full bg-[#3157E5]/10 blur-[110px]" />
            <div className="absolute -right-20 top-8 h-[380px] w-[380px] rounded-full bg-[#F2B84B]/15 blur-[100px]" />
            <div className="absolute inset-x-0 top-[62%] h-[520px] -skew-y-6 bg-[#EEE9DF]" />
            <div className="absolute left-[8%] top-[26%] h-2 w-2 rounded-full bg-[#F2B84B] shadow-[0_0_24px_7px_rgba(242,184,75,0.5)]" />
          </motion.div>

          <div className="relative mx-auto grid w-full max-w-[1240px] grid-cols-1 items-center gap-16 lg:grid-cols-[0.88fr_1.12fr] lg:gap-12">
            <motion.div initial="hidden" animate="visible" transition={{ staggerChildren: 0.1 }} className="max-w-[590px]">
              <motion.div variants={reveal} transition={{ duration: 0.65, ease: EASE }}>
                <SectionEyebrow>Credential operations, end to end</SectionEyebrow>
              </motion.div>
              <motion.h1 variants={reveal} transition={{ duration: 0.75, ease: EASE }} className="glint-display mt-6 text-[clamp(3.8rem,7vw,6.7rem)] font-semibold leading-[0.82] tracking-[-0.055em] text-[#0B1020]">
                Design it.<br />
                <span className="text-[#3157E5]">Issue it.</span><br />
                <span className="relative italic">Prove it.<motion.span initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.75, duration: 0.8, ease: EASE }} className="absolute -bottom-1 left-0 h-[3px] w-full origin-left bg-[#F2B84B]" /></span>
              </motion.h1>
              <motion.p variants={reveal} transition={{ duration: 0.7, ease: EASE }} className="mt-7 max-w-[540px] text-[15px] leading-7 text-slate-600 sm:text-[17px]">
                Create branded certificates, personalize them for one recipient or an entire cohort, deliver them by email, and give every credential a live page anyone can verify.
              </motion.p>
              <motion.div variants={reveal} transition={{ duration: 0.7, ease: EASE }} className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button type="button" onClick={onStartFree} className="group flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#0B1020] px-6 text-[13px] font-semibold text-white shadow-[0_15px_35px_-18px_rgba(11,16,32,0.7)] transition-all hover:-translate-y-0.5 hover:bg-[#3157E5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3157E5] focus-visible:ring-offset-2">
                  Create free workspace <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </button>
                <button type="button" onClick={openVerifier} className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-[#CCD2DE] bg-white/75 px-6 text-[13px] font-semibold text-[#0B1020] transition-all hover:-translate-y-0.5 hover:border-[#3157E5] hover:text-[#3157E5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3157E5] focus-visible:ring-offset-2">
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" /> Verify a certificate
                </button>
              </motion.div>
              <motion.div variants={reveal} transition={{ duration: 0.65, ease: EASE }} className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] font-medium text-slate-500">
                {['Free workspace', 'No card required', 'Public verification'].map((item) => (
                  <span key={item} className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-[#3157E5]" aria-hidden="true" /> {item}</span>
                ))}
              </motion.div>
            </motion.div>

            <HeroCredential />
          </div>
        </section>

        <section aria-label="Core Glint capabilities" className="relative z-10 border-y border-[#DCD8CF] bg-[#F2EEE5] px-5 py-5 sm:px-8">
          <div className="mx-auto grid max-w-[1240px] grid-cols-2 gap-4 text-[11px] font-semibold text-slate-600 md:grid-cols-4">
            {[
              [Layers3, 'Visual certificate studio'],
              [UsersRound, 'Single & batch issuance'],
              [MailCheck, 'Branded email delivery'],
              [ShieldCheck, 'Live public verification'],
            ].map(([Icon, label]) => {
              const CapabilityIcon = Icon as typeof Layers3;
              return <div key={label as string} className="flex min-h-11 items-center gap-2.5"><CapabilityIcon className="h-4 w-4 text-[#3157E5]" aria-hidden="true" /><span>{label as string}</span></div>;
            })}
          </div>
        </section>

        <LifecycleStory id="workflow" />

        <section id="studio" className="glint-anchor bg-white px-5 py-24 sm:px-8 sm:py-32">
          <div className="mx-auto max-w-[1240px]">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-90px' }} transition={{ staggerChildren: 0.08 }} className="grid items-end gap-8 lg:grid-cols-[0.92fr_1.08fr]">
              <div>
                <motion.div variants={reveal} transition={{ duration: 0.65, ease: EASE }}><SectionEyebrow>Certificate studio</SectionEyebrow></motion.div>
                <motion.h2 variants={reveal} transition={{ duration: 0.7, ease: EASE }} className="glint-display mt-5 max-w-[620px] text-5xl font-semibold leading-[0.95] tracking-[-0.045em] sm:text-6xl">A serious canvas for a meaningful artifact.</motion.h2>
              </div>
              <motion.p variants={reveal} transition={{ duration: 0.7, ease: EASE }} className="max-w-[540px] text-[15px] leading-7 text-slate-600 lg:justify-self-end">Drag, resize, rotate, align and layer every detail. Format selected text, upload fonts and brand assets, and preview dynamic fields before a certificate is issued.</motion.p>
            </motion.div>

            <div className="mt-14 grid gap-10 lg:grid-cols-[1.18fr_0.82fr] lg:items-center">
              <StudioScene />
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                {studioFeatures.map((feature, index) => (
                  <motion.div key={feature.title} initial={{ opacity: 0, x: 18 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: '-45px' }} transition={{ delay: index * 0.08, duration: 0.55, ease: EASE }} className="group rounded-2xl border border-[#E0E3EA] bg-[#FAFAF9] p-5 transition-colors hover:border-[#B7C4F5] hover:bg-[#F7F9FF]">
                    <div className="flex gap-4">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#3157E5] shadow-sm ring-1 ring-slate-200"><feature.icon className="h-4 w-4" aria-hidden="true" /></span>
                      <div><h3 className="text-[14px] font-semibold text-[#0B1020]">{feature.title}</h3><p className="mt-1.5 text-[12px] leading-5 text-slate-500">{feature.body}</p></div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="delivery" className="glint-anchor relative overflow-hidden bg-[#0B1020] px-5 py-24 text-white sm:px-8 sm:py-32">
          <div className="absolute inset-0 opacity-25 [background-image:radial-gradient(rgba(255,255,255,0.18)_1px,transparent_1px)] [background-size:30px_30px]" aria-hidden="true" />
          <div className="absolute -right-40 top-0 h-[480px] w-[480px] rounded-full bg-[#3157E5]/20 blur-[120px]" aria-hidden="true" />
          <div className="relative mx-auto grid max-w-[1240px] gap-16 lg:grid-cols-[0.84fr_1.16fr] lg:items-center">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-90px' }} transition={{ staggerChildren: 0.08 }}>
              <motion.div variants={reveal} transition={{ duration: 0.65, ease: EASE }}><SectionEyebrow light>Programs &amp; delivery</SectionEyebrow></motion.div>
              <motion.h2 variants={reveal} transition={{ duration: 0.7, ease: EASE }} className="glint-display mt-5 text-5xl font-semibold leading-[0.94] tracking-[-0.045em] sm:text-6xl">Recipient data in. Ready-to-share credentials out.</motion.h2>
              <motion.p variants={reveal} transition={{ duration: 0.7, ease: EASE }} className="mt-6 max-w-[530px] text-[15px] leading-7 text-slate-300">Build each program around a template, issue and expiry dates, and the fields that matter. Validate recipient rows, issue carefully, and choose whether to send immediately or later from the registry.</motion.p>
              <motion.div variants={reveal} transition={{ duration: 0.65, ease: EASE }} className="mt-8 grid gap-3 sm:grid-cols-2">
                {[
                  ['Custom program fields', Braces],
                  ['Validated CSV rows', FileText],
                  ['Issue now or send later', Send],
                  ['Individual or digest email', Mail],
                ].map(([label, Icon]) => {
                  const ItemIcon = Icon as typeof Braces;
                  return <div key={label as string} className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.045] px-3 py-3 text-[11px] font-medium text-slate-200"><ItemIcon className="h-3.5 w-3.5 text-[#F2B84B]" aria-hidden="true" />{label as string}</div>;
                })}
              </motion.div>
            </motion.div>
            <DeliveryScene />
          </div>
        </section>

        <section id="verification" className="glint-anchor relative overflow-hidden bg-[#F1EBDD] px-5 py-24 sm:px-8 sm:py-32">
          <div className="absolute left-[9%] top-20 h-2 w-2 rounded-full bg-[#F2B84B] shadow-[0_0_24px_8px_rgba(242,184,75,0.42)]" aria-hidden="true" />
          <div className="mx-auto grid max-w-[1240px] gap-16 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-90px' }} transition={{ staggerChildren: 0.08 }}>
              <motion.div variants={reveal} transition={{ duration: 0.65, ease: EASE }}><SectionEyebrow>Public verification</SectionEyebrow></motion.div>
              <motion.h2 variants={reveal} transition={{ duration: 0.7, ease: EASE }} className="glint-display mt-5 text-5xl font-semibold leading-[0.94] tracking-[-0.045em] sm:text-6xl">Proof, without the back-and-forth.</motion.h2>
              <motion.p variants={reveal} transition={{ duration: 0.7, ease: EASE }} className="mt-6 max-w-[550px] text-[15px] leading-7 text-slate-600">A recipient, employer or auditor can check a Glint credential by certificate ID, public link or a PDF downloaded from Glint. Glint validates its protected issuance fields, then checks expiry and revocation.</motion.p>
              <motion.div variants={reveal} transition={{ duration: 0.65, ease: EASE }} className="mt-8 space-y-3">
                {[
                  [Link2, 'Three ways in', 'ID, public link or a PDF downloaded from Glint.'],
                  [RefreshCw, 'Status stays current', 'Expiry and revocation are checked at verification time.'],
                  [Download, 'Made to travel', 'Recipients can print, download, copy or share the public page.'],
                ].map(([Icon, title, body]) => {
                  const RowIcon = Icon as typeof Link2;
                  return <div key={title as string} className="flex gap-3 rounded-2xl border border-[#DDD5C6] bg-white/55 p-4"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#3157E5] shadow-sm"><RowIcon className="h-4 w-4" aria-hidden="true" /></span><span><span className="block text-[13px] font-semibold text-[#0B1020]">{title as string}</span><span className="mt-0.5 block text-[11px] leading-5 text-slate-500">{body as string}</span></span></div>;
                })}
              </motion.div>
            </motion.div>
            <VerificationScene onOpen={openVerifier} />
          </div>
        </section>

        <section id="operations" className="glint-anchor bg-white px-5 py-24 sm:px-8 sm:py-32">
          <div className="mx-auto max-w-[1240px]">
            <div className="mx-auto max-w-[760px] text-center">
              <SectionEyebrow>Workspace operations</SectionEyebrow>
              <h2 className="glint-display mt-5 text-5xl font-semibold leading-[0.94] tracking-[-0.045em] sm:text-6xl">Know what happened after issue.</h2>
              <p className="mx-auto mt-6 max-w-[650px] text-[15px] leading-7 text-slate-600">Track certificate activity, inspect history and signature details, follow email delivery, and manage status from one workspace.</p>
            </div>
            <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {operationCards.map((card, index) => (
                <motion.article key={card.title} initial={{ opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-55px' }} transition={{ delay: index * 0.08, duration: 0.6, ease: EASE }} className="relative min-h-[250px] overflow-hidden rounded-[24px] border border-[#E0E3EA] bg-[#F8F8F6] p-6">
                  <div className="absolute -right-7 -top-7 h-28 w-28 rounded-full bg-[#3157E5]/[0.06]" aria-hidden="true" />
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[#3157E5] shadow-sm ring-1 ring-slate-200"><card.icon className="h-5 w-5" aria-hidden="true" /></span>
                  <h3 className="mt-12 text-[16px] font-semibold tracking-[-0.02em] text-[#0B1020]">{card.title}</h3>
                  <p className="mt-2 text-[12px] leading-5 text-slate-500">{card.body}</p>
                </motion.article>
              ))}
            </div>
          </div>
        </section>

        <section id="plans" className="glint-anchor border-y border-[#DCD8CF] bg-[#F2EEE5] px-5 py-24 sm:px-8 sm:py-32">
          <div className="mx-auto max-w-[1240px]">
            <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
              <div><SectionEyebrow>Plans</SectionEyebrow><h2 className="glint-display mt-5 text-5xl font-semibold leading-[0.94] tracking-[-0.045em] sm:text-6xl">Start small. Expand when the work does.</h2></div>
              <p className="max-w-[560px] text-[15px] leading-7 text-slate-600 lg:justify-self-end">Every plan includes the core design, issuance, public-page and verification workflow. Capacity and delivery controls scale with your operation.</p>
            </div>
            <div className="mt-14 grid gap-4 lg:grid-cols-3">
              {PLAN_ORDER.map((plan, index) => {
                const featured = plan === 'pro';
                return (
                  <motion.article key={plan} initial={{ opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ delay: index * 0.08, duration: 0.6, ease: EASE }} className={`relative rounded-[26px] border p-6 sm:p-7 ${featured ? 'border-[#3157E5] bg-[#0B1020] text-white shadow-[0_28px_70px_-42px_rgba(49,87,229,0.75)]' : 'border-[#DCD8CF] bg-white text-[#0B1020]'}`}>
                    {featured && <span className="absolute right-5 top-5 rounded-full bg-[#F2B84B] px-2.5 py-1 text-[8px] font-bold uppercase tracking-wider text-[#0B1020]">For repeat programs</span>}
                    <p className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${featured ? 'text-[#F5C96A]' : 'text-[#3157E5]'}`}>{PLAN_LABEL[plan]}</p>
                    <p className={`mt-4 text-[12px] leading-5 ${featured ? 'text-slate-300' : 'text-slate-500'}`}>{plan === 'free' ? 'Learn the workflow with a small live set.' : plan === 'pro' ? 'Run recurring programs and smaller cohorts.' : 'Coordinate larger operations across organizations.'}</p>
                    <ul className="mt-8 space-y-3">
                      {planBullets[plan].map((item) => <li key={item} className={`flex gap-2.5 text-[11px] leading-5 ${featured ? 'text-slate-200' : 'text-slate-600'}`}><Check className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${featured ? 'text-[#F2B84B]' : 'text-[#3157E5]'}`} aria-hidden="true" />{item}</li>)}
                    </ul>
                    {plan === 'free' && <button type="button" onClick={onStartFree} className="mt-8 flex min-h-11 w-full items-center justify-center rounded-xl bg-[#0B1020] px-4 text-[12px] font-semibold text-white transition-colors hover:bg-[#3157E5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3157E5] focus-visible:ring-offset-2">Start with Free</button>}
                    {plan !== 'free' && <div className={`mt-8 rounded-xl px-3 py-3 text-[9px] leading-4 ${featured ? 'bg-white/[0.07] text-slate-300' : 'bg-[#F5F5F2] text-slate-500'}`}>Plan access is assigned by a platform administrator.</div>}
                    <span className="sr-only">Configured limit: {PLAN_LIMITS[plan].organizations} organizations.</span>
                  </motion.article>
                );
              })}
            </div>
            <p className="mt-5 text-center text-[10px] leading-5 text-slate-500">Valid-certificate limits exclude revoked and expired credentials. Self-serve checkout is not currently available.</p>
          </div>
        </section>

        <section className="relative overflow-hidden bg-[#3157E5] px-5 py-24 text-white sm:px-8 sm:py-28">
          <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(rgba(255,255,255,0.5)_1px,transparent_1px)] [background-size:26px_26px]" aria-hidden="true" />
          <div className="absolute -bottom-40 -left-24 h-[440px] w-[440px] rounded-full bg-[#0B1020]/35 blur-[110px]" aria-hidden="true" />
          <div className="relative mx-auto max-w-[900px] text-center">
            <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-100"><Sparkles className="h-3.5 w-3.5 text-[#F2B84B]" aria-hidden="true" /> Ready when the achievement is</div>
            <h2 className="glint-display mt-5 text-5xl font-semibold leading-[0.92] tracking-[-0.045em] sm:text-7xl">Turn achievement into proof people can check.</h2>
            <p className="mx-auto mt-6 max-w-[620px] text-[15px] leading-7 text-blue-100">Create your workspace, design your first template, and issue a certificate with a live verification page behind it.</p>
            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
              <button type="button" onClick={onStartFree} className="group flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-white px-6 text-[13px] font-semibold text-[#0B1020] transition-all hover:-translate-y-0.5 hover:bg-[#FFF6DA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2B84B] focus-visible:ring-offset-2 focus-visible:ring-offset-[#3157E5]">Create free workspace <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" /></button>
              <button type="button" onClick={openVerifier} className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/30 bg-white/10 px-6 text-[13px] font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#3157E5]"><ShieldCheck className="h-4 w-4" aria-hidden="true" /> Verify a certificate</button>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-[#0B1020] px-5 py-12 text-white sm:px-8">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-10 sm:flex-row sm:items-end sm:justify-between">
          <div><Brand inverse /><p className="mt-4 max-w-[430px] text-[11px] leading-5 text-slate-400">Design, issue, deliver, verify and manage professional certificates from one connected workspace.</p></div>
          <div className="flex flex-wrap gap-x-6 gap-y-3 text-[11px] font-medium text-slate-400">
            <a href="#workflow" className="transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2B84B]">Workflow</a>
            <a href="#studio" className="transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2B84B]">Studio</a>
            <a href="#verification" className="transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2B84B]">Verification</a>
            <button type="button" onClick={onStartFree} className="transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2B84B]">Create account</button>
            <button type="button" onClick={onSignIn} className="transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2B84B]">Sign in</button>
          </div>
        </div>
        <div className="mx-auto mt-10 flex max-w-[1240px] flex-col gap-2 border-t border-white/10 pt-5 text-[9px] leading-4 text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Glint. Certificate status remains subject to issuer expiry and revocation decisions.</p>
          <button type="button" onClick={openVerifier} className="w-fit transition-colors hover:text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2B84B]">Public verification requires no account.</button>
        </div>
      </footer>

      <VerifyCertificateModal open={verifierOpen} onClose={() => setVerifierOpen(false)} />
    </div>
    </MotionConfig>
  );
}
