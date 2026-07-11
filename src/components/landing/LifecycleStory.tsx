import { useEffect, useRef, useState } from 'react';
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from 'framer-motion';
import {
  AlignCenter,
  BadgeCheck,
  Check,
  ChevronRight,
  FileSpreadsheet,
  Image,
  Layers3,
  Link2,
  Mail,
  MousePointer2,
  Move,
  Palette,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  Type,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';

type LifecycleStage = {
  number: string;
  label: string;
  eyebrow: string;
  title: string;
  body: string;
  detail: string;
  icon: LucideIcon;
};

const STAGES: LifecycleStage[] = [
  {
    number: '01',
    label: 'Design',
    eyebrow: 'Start with the canvas',
    title: 'Make the credential unmistakably yours.',
    body: 'Compose a polished certificate with type, imagery, signatures, QR codes, and precise layer controls.',
    detail: 'Drag, resize, rotate, align, and save the finished design as a reusable Glint template.',
    icon: Palette,
  },
  {
    number: '02',
    label: 'Personalize',
    eyebrow: 'Move from one to many',
    title: 'Turn recipient data into ready-to-issue proof.',
    body: 'Connect dynamic fields to recipient and program data, then validate recipient rows before issuing.',
    detail: 'Issue individually or prepare a cohort from CSV without rebuilding the design.',
    icon: UsersRound,
  },
  {
    number: '03',
    label: 'Deliver',
    eyebrow: 'Send with context',
    title: 'Put the credential in the right inbox.',
    body: 'Shape the issuance email, deliver from the workspace, and keep delivery activity attached to the credential.',
    detail: 'Retry or resend when needed, without losing the issuance trail.',
    icon: Send,
  },
  {
    number: '04',
    label: 'Verify',
    eyebrow: 'Keep proof within reach',
    title: 'Give every credential a live answer.',
    body: 'Recipients and reviewers can verify by credential ID, verification link, or a PDF downloaded from Glint.',
    detail: 'The public result reflects current validity, including expiry or revocation.',
    icon: BadgeCheck,
  },
];

export interface LifecycleStoryProps {
  /** Anchor used by landing-page navigation. */
  id?: string;
  /** Optional utility classes for layout integration. */
  className?: string;
}

interface SceneProps {
  phase: number;
  reduceMotion: boolean;
  compact?: boolean;
}

function useDesktopViewport() {
  const [isDesktop, setIsDesktop] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 1024);

  useEffect(() => {
    const update = () => setIsDesktop(window.innerWidth >= 1024);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return isDesktop;
}

function ToolButton({ icon: Icon, active = false }: { icon: LucideIcon; active?: boolean }) {
  return (
    <span
      className={`grid size-7 place-items-center rounded-lg border sm:size-8 ${
        active
          ? 'border-[#3157E5]/30 bg-[#3157E5] text-white shadow-[0_7px_18px_rgba(49,87,229,0.28)]'
          : 'border-white/8 bg-white/[0.045] text-white/45'
      }`}
    >
      <Icon className="size-3.5" strokeWidth={1.8} />
    </span>
  );
}

function WindowBar({ label, icon: Icon }: { label: string; icon: LucideIcon }) {
  return (
    <div className="flex h-10 items-center justify-between border-b border-white/8 px-3 sm:h-11 sm:px-4">
      <div className="flex items-center gap-2">
        <span className="size-1.5 rounded-full bg-[#F2B84B] shadow-[0_0_10px_rgba(242,184,75,0.7)]" />
        <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/58 sm:text-[10px]">
          {label}
        </span>
      </div>
      <Icon className="size-3.5 text-white/35" strokeWidth={1.7} />
    </div>
  );
}

function DesignScene({ reduceMotion }: { reduceMotion: boolean }) {
  return (
    <div className="grid h-full grid-cols-[40px_1fr] sm:grid-cols-[50px_1fr]">
      <div className="flex flex-col items-center gap-2 border-r border-white/8 bg-white/[0.025] py-3 sm:gap-2.5">
        <ToolButton icon={MousePointer2} active />
        <ToolButton icon={Type} />
        <ToolButton icon={Image} />
        <ToolButton icon={Layers3} />
      </div>

      <div className="flex min-w-0 flex-col">
        <WindowBar label="Certificate studio" icon={Move} />
        <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-[#11172A] p-4 sm:p-7">
          <div
            className="absolute inset-0 opacity-35"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.045) 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />

          <motion.div
            layout
            className="relative aspect-[1.42/1] w-full max-w-[450px] bg-[#F4EFE5] p-2 shadow-[0_26px_70px_rgba(0,0,0,0.4)] sm:p-3"
            transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 180, damping: 24 }}
          >
            <div className="flex h-full flex-col items-center justify-between border border-[#0B1020]/14 px-5 py-4 text-center sm:px-8 sm:py-6">
              <div className="flex w-full items-center justify-between">
                <span className="h-px w-8 bg-[#0B1020]/20 sm:w-14" />
                <Sparkles className="size-3.5 text-[#F2B84B] sm:size-4" fill="#F2B84B" />
                <span className="h-px w-8 bg-[#0B1020]/20 sm:w-14" />
              </div>

              <div className="w-full">
                <p className="text-[7px] font-semibold uppercase tracking-[0.28em] text-[#0B1020]/48 sm:text-[9px]">
                  Certificate of completion
                </p>
                <p className="mt-2 font-serif text-[12px] italic text-[#0B1020]/55 sm:text-base">
                  Presented to
                </p>
                <motion.div
                  animate={
                    reduceMotion
                      ? undefined
                      : {
                          boxShadow: [
                            '0 0 0 0 rgba(49,87,229,0)',
                            '0 0 0 4px rgba(49,87,229,.12)',
                            '0 0 0 0 rgba(49,87,229,0)',
                          ],
                        }
                  }
                  transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                  className="relative mx-auto mt-1.5 w-fit border border-[#3157E5] px-2 py-0.5 font-serif text-sm font-semibold text-[#0B1020] sm:text-xl"
                >
                  {'{{name}}'}
                  <span className="absolute -left-1 -top-1 size-1.5 bg-[#3157E5]" />
                  <span className="absolute -right-1 -top-1 size-1.5 bg-[#3157E5]" />
                  <span className="absolute -bottom-1 -left-1 size-1.5 bg-[#3157E5]" />
                  <span className="absolute -bottom-1 -right-1 size-1.5 bg-[#3157E5]" />
                </motion.div>
              </div>

              <div className="grid w-full grid-cols-2 gap-8">
                <div>
                  <div className="mx-auto h-px w-12 bg-[#0B1020]/28 sm:w-20" />
                  <p className="mt-1 text-[6px] uppercase tracking-wider text-[#0B1020]/42 sm:text-[7px]">Signature</p>
                </div>
                <div>
                  <div className="mx-auto h-px w-12 bg-[#0B1020]/28 sm:w-20" />
                  <p className="mt-1 text-[6px] uppercase tracking-wider text-[#0B1020]/42 sm:text-[7px]">Issue date</p>
                </div>
              </div>
            </div>
          </motion.div>

          <div className="absolute bottom-2 right-3 flex items-center gap-1.5 rounded-full border border-white/10 bg-[#0B1020]/80 px-2.5 py-1 text-[8px] font-medium text-white/58 backdrop-blur sm:bottom-4 sm:right-5 sm:text-[9px]">
            <AlignCenter className="size-3 text-[#F2B84B]" />
            Snap &amp; align
          </div>
        </div>
      </div>
    </div>
  );
}

function PersonalizeScene() {
  const rows = ['Recipient 01', 'Recipient 02', 'Recipient 03'];

  return (
    <div className="flex h-full min-w-0 flex-col">
      <WindowBar label="Cohort issuance" icon={FileSpreadsheet} />
      <div className="grid min-h-0 flex-1 grid-cols-[1.06fr_.94fr] gap-2 p-2.5 sm:gap-4 sm:p-5">
        <div className="min-w-0 overflow-hidden rounded-xl border border-white/9 bg-white/[0.035] sm:rounded-2xl">
          <div className="flex items-center justify-between border-b border-white/8 px-2.5 py-2.5 sm:px-4 sm:py-3">
            <div className="flex items-center gap-1.5 text-[8px] font-semibold uppercase tracking-[0.16em] text-white/55 sm:text-[9px]">
              <FileSpreadsheet className="size-3 text-[#F2B84B]" />
              Recipients.csv
            </div>
            <span className="rounded-full bg-[#3157E5]/18 px-1.5 py-0.5 text-[7px] font-semibold text-[#AFC0FF] sm:px-2 sm:text-[8px]">
              Fields mapped
            </span>
          </div>

          <div className="grid grid-cols-[1.15fr_.85fr] border-b border-white/7 bg-white/[0.02] px-2.5 py-2 text-[7px] font-medium text-white/30 sm:px-4 sm:text-[8px]">
            <span>name</span>
            <span>program</span>
          </div>

          {rows.map((row, index) => (
            <div
              key={row}
              className="grid grid-cols-[1.15fr_.85fr] items-center border-b border-white/[0.055] px-2.5 py-2.5 text-[8px] text-white/67 last:border-0 sm:px-4 sm:py-3.5 sm:text-[10px]"
            >
              <span className="flex min-w-0 items-center gap-1.5 truncate">
                <span className="grid size-4 shrink-0 place-items-center rounded-full bg-white/7 text-[6px] text-white/45 sm:size-5 sm:text-[7px]">
                  {index + 1}
                </span>
                <span className="truncate">{row}</span>
              </span>
              <span className="truncate text-white/40">Program title</span>
            </div>
          ))}
        </div>

        <div className="relative min-w-0 overflow-hidden rounded-xl border border-white/9 bg-[#11172A] p-2 sm:rounded-2xl sm:p-4">
          <p className="relative z-20 text-[7px] font-semibold uppercase tracking-[0.17em] text-white/35 sm:text-[9px]">
            Personalized output
          </p>

          <div className="absolute inset-x-2 bottom-3 top-8 sm:inset-x-4 sm:bottom-5 sm:top-11">
            {[2, 1, 0].map((cardIndex) => (
              <motion.div
                key={cardIndex}
                layout
                initial={false}
                animate={{
                  y: cardIndex * -8,
                  x: cardIndex * 4,
                  rotate: cardIndex === 2 ? 2.4 : cardIndex === 1 ? -1.4 : 0,
                  scale: 1 - cardIndex * 0.035,
                }}
                transition={{ type: 'spring', stiffness: 180, damping: 24 }}
                className="absolute inset-x-0 bottom-0 aspect-[1.42/1] origin-bottom rounded-[2px] bg-[#F4EFE5] p-2 shadow-[0_16px_34px_rgba(0,0,0,.34)] sm:p-3"
                style={{ zIndex: 5 - cardIndex }}
              >
                <div className="flex h-full flex-col items-center justify-center border border-[#0B1020]/12 text-center">
                  <Sparkles className="mb-1 size-2.5 text-[#F2B84B] sm:mb-2 sm:size-3.5" fill="#F2B84B" />
                  <p className="text-[5px] font-semibold uppercase tracking-[0.22em] text-[#0B1020]/42 sm:text-[7px]">
                    Certificate
                  </p>
                  <p className="mt-1 font-serif text-[9px] font-semibold text-[#0B1020] sm:text-sm">
                    {rows[cardIndex]}
                  </p>
                  <p className="mt-0.5 text-[5px] text-[#0B1020]/45 sm:mt-1 sm:text-[7px]">Program title</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DeliverScene() {
  return (
    <div className="flex h-full min-w-0 flex-col">
      <WindowBar label="Issuance email" icon={Mail} />
      <div className="flex min-h-0 flex-1 items-center justify-center p-3 sm:p-6">
        <div className="grid h-full max-h-[390px] w-full max-w-[580px] grid-rows-[auto_auto_1fr_auto] overflow-hidden rounded-xl border border-white/10 bg-[#F9F7F2] text-[#0B1020] shadow-[0_28px_70px_rgba(0,0,0,.36)] sm:rounded-2xl">
          <div className="flex items-center justify-between border-b border-[#0B1020]/8 px-3 py-2.5 sm:px-5 sm:py-3.5">
            <div>
              <p className="text-[7px] font-semibold uppercase tracking-[0.18em] text-[#0B1020]/38 sm:text-[8px]">New message</p>
              <p className="mt-0.5 text-[9px] font-semibold sm:text-[11px]">Credential delivery</p>
            </div>
            <Mail className="size-3.5 text-[#3157E5] sm:size-4" />
          </div>

          <div className="border-b border-[#0B1020]/8 px-3 py-2 sm:px-5 sm:py-3">
            <div className="flex gap-2 text-[8px] sm:text-[10px]">
              <span className="w-9 shrink-0 text-[#0B1020]/35">To</span>
              <span className="font-medium">recipient@email</span>
            </div>
            <div className="mt-1.5 flex gap-2 text-[8px] sm:mt-2 sm:text-[10px]">
              <span className="w-9 shrink-0 text-[#0B1020]/35">Subject</span>
              <span className="font-medium">Your credential is ready</span>
            </div>
          </div>

          <div className="min-h-0 px-3 py-3 sm:px-5 sm:py-4">
            <p className="text-[8px] leading-relaxed text-[#0B1020]/64 sm:text-[10px]">
              Hello {'{{name}}'},
            </p>
            <p className="mt-1.5 max-w-sm text-[8px] leading-relaxed text-[#0B1020]/52 sm:mt-2 sm:text-[10px]">
              Your credential has been issued. Open it to view, download, share, or verify the current status.
            </p>

            <div className="mt-3 flex items-center gap-2 rounded-lg border border-[#0B1020]/8 bg-white px-2.5 py-2 sm:mt-4 sm:gap-3 sm:px-3 sm:py-2.5">
              <span className="grid size-7 shrink-0 place-items-center rounded-md bg-[#3157E5]/10 text-[#3157E5] sm:size-8">
                <Link2 className="size-3.5 sm:size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[8px] font-semibold sm:text-[10px]">Open certificate</p>
                <p className="text-[6px] text-[#0B1020]/38 sm:text-[8px]">Live verification page</p>
              </div>
              <Link2 className="size-3 text-[#0B1020]/28 sm:size-3.5" />
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-[#0B1020]/8 px-3 py-2.5 sm:px-5 sm:py-3">
            <span className="flex items-center gap-1 text-[7px] text-[#0B1020]/38 sm:text-[8px]">
              <RefreshCw className="size-2.5" />
              Resend when needed
            </span>
            <span className="flex items-center gap-1.5 rounded-full bg-[#3157E5] px-3 py-1.5 text-[7px] font-semibold text-white shadow-[0_8px_18px_rgba(49,87,229,.25)] sm:px-4 sm:py-2 sm:text-[9px]">
              Send credential
              <ChevronRight className="size-2.5 sm:size-3" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function VerifyScene({ reduceMotion }: { reduceMotion: boolean }) {
  return (
    <div className="flex h-full min-w-0 flex-col">
      <WindowBar label="Public verification" icon={ShieldCheck} />
      <div className="grid min-h-0 flex-1 grid-rows-[auto_1fr] gap-2.5 p-2.5 sm:gap-4 sm:p-5">
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.045] p-1.5 pl-3 sm:rounded-2xl sm:p-2 sm:pl-4">
          <Link2 className="size-3.5 shrink-0 text-white/35 sm:size-4" />
          <span className="min-w-0 flex-1 truncate text-[8px] text-white/38 sm:text-[10px]">
            Credential ID, verification link, or PDF
          </span>
          <span className="rounded-lg bg-white px-2.5 py-1.5 text-[7px] font-semibold text-[#0B1020] sm:px-3 sm:py-2 sm:text-[9px]">
            Verify
          </span>
        </div>

        <div className="grid min-h-0 grid-cols-[.82fr_1.18fr] overflow-hidden rounded-xl border border-white/10 bg-white/[0.035] sm:rounded-2xl">
          <div className="relative flex flex-col items-center justify-center border-r border-white/8 p-3 text-center sm:p-5">
            <motion.div
              initial={false}
              animate={reduceMotion ? undefined : { scale: [1, 1.06, 1] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
              className="relative grid size-14 place-items-center rounded-full border border-[#F2B84B]/30 bg-[#F2B84B]/10 text-[#F2B84B] sm:size-20"
            >
              <span className="absolute inset-1.5 rounded-full border border-[#F2B84B]/18" />
              <ShieldCheck className="size-6 sm:size-8" strokeWidth={1.6} />
            </motion.div>
            <p className="mt-3 text-[10px] font-semibold text-white sm:mt-4 sm:text-sm">Credential valid</p>
            <p className="mt-1 text-[7px] leading-relaxed text-white/38 sm:text-[9px]">Example verification result</p>
            <div className="mt-3 flex flex-wrap justify-center gap-1 sm:mt-4">
              {['ID', 'Link', 'PDF'].map((source) => (
                <span key={source} className="rounded-full border border-white/9 px-1.5 py-0.5 text-[6px] text-white/40 sm:px-2 sm:text-[8px]">
                  {source}
                </span>
              ))}
            </div>
          </div>

          <div className="flex min-w-0 flex-col justify-center p-3 sm:p-6">
            <p className="text-[7px] font-semibold uppercase tracking-[0.18em] text-white/30 sm:text-[8px]">Issuance facts</p>
            <dl className="mt-2 divide-y divide-white/[0.065] sm:mt-3">
              {[
                ['Recipient', 'Recipient name'],
                ['Program', 'Program title'],
                ['Issuer', 'Your organization'],
                ['Status', 'Valid'],
              ].map(([term, value]) => (
                <div key={term} className="grid grid-cols-[.8fr_1.2fr] gap-2 py-1.5 text-[7px] sm:py-2.5 sm:text-[9px]">
                  <dt className="text-white/32">{term}</dt>
                  <dd className="min-w-0 truncate font-medium text-white/72">{value}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-2 flex items-center gap-1.5 text-[7px] text-[#F2B84B] sm:mt-3 sm:text-[9px]">
              <Check className="size-3" strokeWidth={2} />
              Expiry and revocation checked on verification
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LifecycleScene({ phase, reduceMotion, compact = false }: SceneProps) {
  const sceneTransition = reduceMotion
    ? { duration: 0 }
    : { type: 'spring' as const, stiffness: 150, damping: 23, mass: 0.85 };

  return (
    <div
      className={`relative isolate overflow-hidden border border-white/10 bg-[#0B1020] shadow-[0_36px_100px_rgba(11,16,32,0.28)] ${
        compact ? 'h-[330px] rounded-[22px]' : 'h-[clamp(430px,55vh,570px)] rounded-[30px]'
      }`}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{ background: 'radial-gradient(circle at 75% 8%, rgba(49,87,229,.24), transparent 38%)' }}
      />
      <div
        className="pointer-events-none absolute -bottom-24 -left-16 size-64 rounded-full blur-3xl"
        style={{ backgroundColor: 'rgba(242,184,75,.07)' }}
      />

      <AnimatePresence initial={false} mode="wait">
        <motion.div
          key={phase}
          initial={reduceMotion ? false : { opacity: 0, scale: 0.965, y: 24, filter: 'blur(8px)' }}
          animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 1.025, y: -18, filter: 'blur(7px)' }}
          transition={sceneTransition}
          className="absolute inset-2 overflow-hidden rounded-[16px] border border-white/[0.065] bg-[#0D1324] sm:inset-3 sm:rounded-[20px]"
        >
          {phase === 0 && <DesignScene reduceMotion={reduceMotion} />}
          {phase === 1 && <PersonalizeScene />}
          {phase === 2 && <DeliverScene />}
          {phase === 3 && <VerifyScene reduceMotion={reduceMotion} />}
        </motion.div>
      </AnimatePresence>

      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[#F2B84B]/55 to-transparent" />
    </div>
  );
}

function MobileLifecycle({ showDesktop = false }: { showDesktop?: boolean }) {
  return (
    <ol className={`mx-auto mt-12 grid gap-14 px-5 pb-24 sm:px-8 ${showDesktop ? 'max-w-7xl lg:grid-cols-2 lg:gap-x-10' : 'max-w-2xl lg:hidden'}`}>
      {STAGES.map((stage, index) => {
        const Icon = stage.icon;
        return (
          <li key={stage.label}>
            <article aria-labelledby={`lifecycle-mobile-${index}`}>
              <div className="mb-5 flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-full border border-[#0B1020]/12 bg-white/55 text-[#3157E5]">
                  <Icon className="size-4" strokeWidth={1.8} />
                </span>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#0B1020]/65">{stage.number}</p>
                  <p className="text-sm font-semibold text-[#0B1020]">{stage.label}</p>
                </div>
              </div>

              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#3157E5]">{stage.eyebrow}</p>
              <h3 id={`lifecycle-mobile-${index}`} className="mt-3 max-w-xl font-serif text-3xl leading-[1.08] text-[#0B1020] sm:text-4xl">
                {stage.title}
              </h3>
              <p className="mt-4 max-w-xl text-sm leading-6 text-[#0B1020]/62">{stage.body}</p>
              <p className="mb-6 mt-3 flex items-start gap-2 text-xs leading-5 text-[#0B1020]/68">
                <Check className="mt-0.5 size-3.5 shrink-0 text-[#F2B84B]" strokeWidth={2.2} />
                {stage.detail}
              </p>

              <div aria-hidden="true">
                <LifecycleScene phase={index} reduceMotion compact />
              </div>
            </article>
          </li>
        );
      })}
    </ol>
  );
}

export function LifecycleStory({ id = 'credential-journey', className = '' }: LifecycleStoryProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const reduceMotion = Boolean(prefersReducedMotion);
  const isDesktop = useDesktopViewport();
  const showDesktopStory = isDesktop && !reduceMotion;
  const [activeStage, setActiveStage] = useState(0);

  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ['start start', 'end end'],
  });
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 92,
    damping: 28,
    mass: 0.26,
    restDelta: 0.001,
  });
  const progress = reduceMotion ? scrollYProgress : smoothProgress;

  useMotionValueEvent(progress, 'change', (latest) => {
    if (!showDesktopStory) return;
    const nextStage = Math.min(STAGES.length - 1, Math.floor(latest * STAGES.length));
    setActiveStage((current) => (current === nextStage ? current : nextStage));
  });

  const glintY = useTransform(progress, [0, 1], reduceMotion ? [0, 0] : [-110, 150]);
  const sceneY = useTransform(progress, [0, 0.34, 0.68, 1], reduceMotion ? [0, 0, 0, 0] : [6, -8, 10, -4]);
  const sceneRotate = useTransform(progress, [0, 0.36, 0.7, 1], reduceMotion ? [0, 0, 0, 0] : [-0.7, 0.45, -0.35, 0.55]);
  const progressLeft = useTransform(progress, [0, 1], ['0%', '100%']);

  const stage = STAGES[activeStage];
  const StageIcon = stage.icon;
  const textTransition = reduceMotion ? { duration: 0 } : { duration: 0.42, ease: [0.22, 1, 0.36, 1] as const };

  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className={`relative isolate overflow-clip bg-[#F4EFE5] text-[#0B1020] ${className}`}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-55"
        style={{
          backgroundImage:
            'radial-gradient(rgba(11,16,32,.1) .7px, transparent .7px), linear-gradient(180deg, rgba(255,255,255,.45), transparent 28%)',
          backgroundSize: '18px 18px, 100% 100%',
          maskImage: 'linear-gradient(to bottom, black, transparent 34%)',
        }}
      />
      {showDesktopStory && <motion.div
        aria-hidden="true"
        style={{ y: glintY }}
        className="pointer-events-none absolute right-[8%] top-48 hidden size-44 rounded-full bg-[#F2B84B]/15 blur-[70px] lg:block"
      />}

      <header className="relative mx-auto max-w-7xl px-5 pb-4 pt-24 sm:px-8 sm:pt-32 lg:px-10 lg:pt-40">
        <div className="grid gap-8 lg:grid-cols-[.7fr_1.3fr] lg:items-end">
          <div>
            <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#3157E5]">
              <span className="h-px w-7 bg-[#3157E5]" />
              One credential, four moments
            </p>
          </div>
          <div>
            <h2 id={`${id}-title`} className="max-w-3xl font-serif text-4xl leading-[1.02] tracking-[-0.025em] sm:text-5xl lg:text-[64px]">
              From blank canvas to<br className="hidden sm:block" /> verifiable proof.
            </h2>
            <p className="mt-5 max-w-2xl text-sm leading-6 text-[#0B1020]/58 sm:text-base sm:leading-7">
              Follow the same credential as it moves through Glint—from design and recipient data to delivery and a public status anyone can check.
            </p>
          </div>
        </div>
      </header>

      {showDesktopStory && <ol className="sr-only">
        {STAGES.map((item) => (
          <li key={item.label}>
            <h3>{item.label}: {item.title}</h3>
            <p>{item.body} {item.detail}</p>
          </li>
        ))}
      </ol>}

      <div ref={trackRef} className={showDesktopStory ? 'relative mt-2 h-[390vh]' : 'sr-only'} aria-hidden="true">
        {showDesktopStory && (
        <div className="sticky top-0 flex h-[100svh] items-center py-8">
          <div className="mx-auto w-full max-w-7xl px-10">
            <div className="mb-7 grid grid-cols-4 gap-4 border-b border-[#0B1020]/12 pb-4">
              {STAGES.map((item, index) => {
                const Icon = item.icon;
                const isActive = index === activeStage;
                const isComplete = index < activeStage;

                return (
                  <motion.div
                    key={item.label}
                    animate={{ opacity: isActive ? 1 : isComplete ? 0.54 : 0.3 }}
                    transition={{ duration: reduceMotion ? 0 : 0.28 }}
                    className="flex items-center gap-2.5"
                  >
                    <span
                      className={`grid size-7 place-items-center rounded-full border text-[8px] font-semibold ${
                        isActive
                          ? 'border-[#3157E5] bg-[#3157E5] text-white'
                          : isComplete
                            ? 'border-[#0B1020]/22 bg-[#0B1020] text-white'
                            : 'border-[#0B1020]/20 text-[#0B1020]/60'
                      }`}
                    >
                      {isComplete ? <Check className="size-3" /> : <Icon className="size-3" />}
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.18em]">{item.label}</span>
                  </motion.div>
                );
              })}
            </div>

            <div className="grid grid-cols-[.72fr_1.28fr] items-center gap-14 xl:gap-20">
              <div className="relative min-h-[390px]">
                <AnimatePresence initial={false} mode="wait">
                  <motion.div
                    key={activeStage}
                    initial={reduceMotion ? false : { opacity: 0, y: 28, filter: 'blur(6px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -24, filter: 'blur(5px)' }}
                    transition={textTransition}
                    className="absolute inset-x-0 top-1/2 -translate-y-1/2"
                  >
                    <div className="flex items-center gap-3">
                      <span className="grid size-10 place-items-center rounded-full border border-[#0B1020]/12 bg-white/45 text-[#3157E5]">
                        <StageIcon className="size-4" strokeWidth={1.8} />
                      </span>
                      <div>
                        <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#0B1020]/65">{stage.number} / 04</p>
                        <p className="text-sm font-semibold">{stage.label}</p>
                      </div>
                    </div>

                    <p className="mt-8 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#3157E5]">{stage.eyebrow}</p>
                    <h3 className="mt-3 max-w-[470px] font-serif text-[42px] leading-[1.04] tracking-[-0.02em] xl:text-[48px]">
                      {stage.title}
                    </h3>
                    <p className="mt-5 max-w-[450px] text-sm leading-6 text-[#0B1020]/62 xl:text-[15px] xl:leading-7">{stage.body}</p>
                    <p className="mt-4 flex max-w-[450px] items-start gap-2 text-xs leading-5 text-[#0B1020]/68">
                      <Check className="mt-0.5 size-3.5 shrink-0 text-[#F2B84B]" strokeWidth={2.2} />
                      {stage.detail}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>

              <motion.div style={{ y: sceneY, rotate: sceneRotate }}>
                <LifecycleScene phase={activeStage} reduceMotion={reduceMotion} />
              </motion.div>
            </div>

            <div className="mt-7 flex items-center gap-4">
              <span className="text-[9px] font-medium tabular-nums tracking-[0.16em] text-[#0B1020]/65">{stage.number}</span>
              <div className="relative h-px flex-1 overflow-visible bg-[#0B1020]/12">
                <motion.div
                  style={{ scaleX: progress, transformOrigin: 'left center' }}
                  className="absolute inset-y-0 left-0 right-0 bg-[#3157E5]"
                />
                <motion.span
                  style={{ left: progressLeft }}
                  className="absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#F2B84B] shadow-[0_0_0_4px_rgba(242,184,75,.14),0_0_16px_rgba(242,184,75,.55)]"
                />
              </div>
              <span className="text-[9px] font-medium tracking-[0.16em] text-[#0B1020]/65">04</span>
            </div>
          </div>
        </div>
        )}
      </div>

      {!showDesktopStory && <MobileLifecycle showDesktop={isDesktop} />}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-white/20" />
    </section>
  );
}

export default LifecycleStory;
