/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Plan-enforcement UI. The server rejects over-limit actions with HTTP 403
 * `{ code: 'PLAN_LIMIT' }`; this is the visible half — it greys out the control
 * a plan does not allow, marks it with a superscript star, and offers an upgrade
 * path.
 *
 * `PlanLockButton` is a drop-in for a plain <button>. When `locked` is false it
 * renders the button unchanged. When true it renders the button disabled, adds a
 * superscript star right after the label, and exposes a keyboard-focusable
 * tooltip explaining the minimum plan required with an Upgrade action.
 *
 * The tooltip renders through a portal to <body> with fixed positioning, so it
 * is never clipped by an ancestor's `overflow` (a table's horizontal scroll, a
 * card's `overflow-hidden`) and always stacks above the surrounding UI.
 */

import { useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Star, X, Check, Minus, Sparkles } from 'lucide-react';
import {
  type Plan,
  PLAN_LABEL,
  PLAN_LIMITS,
  PLAN_ORDER,
  formatLimit,
} from '../../lib/plans';

interface PlanLockButtonProps {
  /** When true the control is disabled and the upgrade affordance is shown. */
  locked: boolean;
  /** Cheapest plan that unlocks the feature; drives the tooltip's first line. */
  minPlan: Plan | null;
  /** One short sentence explaining why the control is locked. */
  reason: string;
  /** Opens the upgrade modal. */
  onUpgrade: () => void;
  /** The real action, run only when the control is not locked. */
  onClick?: () => void;
  className?: string;
  /** Disabled state for the unlocked control (e.g. an in-flight request). */
  disabled?: boolean;
  title?: string;
  /** Which edge the tooltip aligns to, so it never pushes the page sideways. */
  align?: 'left' | 'right';
  children: ReactNode;
}

const TOOLTIP_WIDTH = 256; // w-64

export function PlanLockButton({
  locked,
  minPlan,
  reason,
  onUpgrade,
  onClick,
  className,
  disabled,
  title,
  align = 'left',
  children,
}: PlanLockButtonProps) {
  const wrapRef = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

  // Anchor the portalled tooltip to the trigger's on-screen box. Recomputed
  // every time it opens (and kept in sync while open) so scrolling a long table
  // does not leave the tooltip stranded.
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const el = wrapRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const rawLeft = align === 'right' ? r.right - TOOLTIP_WIDTH : r.left;
      const left = Math.max(12, Math.min(rawLeft, window.innerWidth - TOOLTIP_WIDTH - 12));
      setCoords({ top: r.bottom + 8, left });
    };
    place();
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [open, align]);

  if (!locked) {
    return (
      <button type="button" className={className} onClick={onClick} disabled={disabled} title={title}>
        {children}
      </button>
    );
  }

  const planName = minPlan ? PLAN_LABEL[minPlan] : null;

  return (
    <span
      ref={wrapRef}
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false);
      }}
    >
      {/* The visibly-disabled control, with the star as a superscript right after
          the label. `pointer-events-none` lets hovers reach the transparent
          trigger layered over it. */}
      <button type="button" className={`${className ?? ''} pointer-events-none`} disabled aria-disabled="true" tabIndex={-1}>
        {children}
        <sup className="ml-0.5 -mt-1 inline-flex leading-none">
          <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" />
        </sup>
      </button>

      {/* Transparent, focusable trigger: the keyboard/click entry point. */}
      <button
        type="button"
        onClick={onUpgrade}
        aria-label={planName ? `Locked — available on the ${planName} plan. Upgrade.` : 'Locked feature. Upgrade.'}
        className="absolute inset-0 cursor-not-allowed rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
      />

      {open && coords &&
        createPortal(
          <div
            className="fixed z-[200] w-64"
            style={{ top: coords.top, left: coords.left }}
            role="tooltip"
          >
            <div className="rounded-lg border border-slate-200 bg-white p-3 text-left shadow-xl">
              <div className="flex items-center gap-1.5">
                <Star className="h-3.5 w-3.5 shrink-0 fill-amber-500 text-amber-500" />
                <p className="text-[12px] font-semibold text-slate-900">
                  {planName ? `Available on the ${planName} plan` : 'Not available on your plan'}
                </p>
              </div>
              <p className="mt-1 text-[12px] leading-relaxed text-slate-500">{reason}</p>
              <button
                type="button"
                onClick={onUpgrade}
                className="mt-2.5 inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-2.5 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-blue-700"
              >
                <Sparkles className="h-3 w-3" /> Compare plans
              </button>
            </div>
          </div>,
          document.body,
        )}
    </span>
  );
}

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  /** The issuer's effective (account-wide) plan, highlighted in the comparison. */
  currentPlan: Plan;
}

/** One row of the comparison grid. `value` renders a plan's cell. */
interface FeatureRow {
  label: string;
  /** Cell content for a given plan. */
  value: (plan: Plan) => ReactNode;
  /** Does this plan include the feature at all? Drives the "not on your plan" star. */
  included: (plan: Plan) => boolean;
}

const yesNo = (on: boolean) =>
  on ? (
    <Check className="mx-auto h-4 w-4 text-emerald-500" />
  ) : (
    <Minus className="mx-auto h-4 w-4 text-slate-300" />
  );

const FEATURE_ROWS: FeatureRow[] = [
  {
    label: 'Certificate templates',
    value: (p) => formatLimit(PLAN_LIMITS[p].templates),
    included: () => true,
  },
  {
    label: 'Organizations',
    value: (p) => formatLimit(PLAN_LIMITS[p].organizations),
    included: (p) => PLAN_LIMITS[p].organizations > 1,
  },
  {
    label: 'Bulk issuance',
    value: (p) =>
      PLAN_LIMITS[p].bulkIssueMax === 1 ? (
        <span className="text-slate-400">Single only</span>
      ) : (
        `${formatLimit(PLAN_LIMITS[p].bulkIssueMax)} / batch`
      ),
    included: (p) => PLAN_LIMITS[p].bulkIssueMax > 1,
  },
  {
    label: 'Valid certificates',
    value: (p) => formatLimit(PLAN_LIMITS[p].validCertificates),
    included: () => true,
  },
  {
    label: 'Custom email designs',
    value: (p) => yesNo(PLAN_LIMITS[p].customEmailTemplate),
    included: (p) => PLAN_LIMITS[p].customEmailTemplate,
  },
  {
    label: 'Remove "Powered by Glint"',
    value: (p) => yesNo(!PLAN_LIMITS[p].glintEmailAttribution),
    included: (p) => !PLAN_LIMITS[p].glintEmailAttribution,
  },
];

/** A read-only comparison of the three tiers. Plans are set by an admin. */
export function UpgradeModal({ open, onClose, currentPlan }: UpgradeModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Compare plans"
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h3 className="text-[15px] font-semibold text-slate-900">Compare plans</h3>
            <p className="text-[12px] text-slate-500">
              You're on the <span className="font-medium text-slate-700">{PLAN_LABEL[currentPlan]}</span> plan.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-900"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Comparison grid */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Feature
                </th>
                {PLAN_ORDER.map((plan) => {
                  const isCurrent = plan === currentPlan;
                  return (
                    <th
                      key={plan}
                      className={`px-4 py-3 text-center ${isCurrent ? 'bg-blue-50/60' : ''}`}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-[13px] font-semibold text-slate-900">{PLAN_LABEL[plan]}</span>
                        {isCurrent && (
                          <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">
                            Current
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {FEATURE_ROWS.map((row) => (
                <tr key={row.label}>
                  <td className="px-5 py-2.5 text-[13px] font-medium text-slate-700">
                    {row.label}
                    {/* Star flags a feature the CURRENT plan does not include. */}
                    {!row.included(currentPlan) && (
                      <sup className="ml-0.5 -top-1 inline-flex">
                        <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" />
                      </sup>
                    )}
                  </td>
                  {PLAN_ORDER.map((plan) => {
                    const isCurrent = plan === currentPlan;
                    return (
                      <td
                        key={plan}
                        className={`px-4 py-2.5 text-center text-[13px] ${
                          isCurrent ? 'bg-blue-50/60 font-semibold text-slate-900' : 'text-slate-600'
                        }`}
                      >
                        {row.value(plan)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="space-y-2 border-t border-slate-200 px-5 py-4">
          <p className="flex items-center gap-1.5 text-[12px] text-slate-500">
            <Star className="h-3 w-3 shrink-0 fill-amber-500 text-amber-500" />
            Not included on your current plan.
          </p>
          <p className="text-[11px] leading-relaxed text-slate-400">
            Plans are assigned by a platform administrator — there is no self-serve billing. Contact your
            administrator to change your plan.
          </p>
        </div>
      </div>
    </div>
  );
}
