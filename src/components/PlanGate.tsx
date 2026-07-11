/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Plan-enforcement UI. The server rejects over-limit actions with HTTP 403
 * `{ code: 'PLAN_LIMIT' }`; this is the visible half — it greys out the control
 * a plan does not allow, marks it with a star, and offers an upgrade path.
 *
 * `PlanLockButton` is a drop-in for a plain <button>. When `locked` is false it
 * renders the button unchanged. When true it renders the button disabled, adds
 * a star badge, and exposes a keyboard-focusable tooltip explaining the minimum
 * plan required with an Upgrade action.
 */

import { useState } from 'react';
import type { ReactNode } from 'react';
import { Star, X, Check, Sparkles } from 'lucide-react';
import { type Plan, PLAN_LABEL, PLAN_LIMITS, PLAN_ORDER, formatLimit } from '../../lib/plans';

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
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);

  if (!locked) {
    return (
      <button type="button" className={className} onClick={onClick} disabled={disabled} title={title}>
        {children}
      </button>
    );
  }

  const open = hovered || focused;
  const planName = minPlan ? PLAN_LABEL[minPlan] : null;

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setFocused(false);
      }}
    >
      {/* The visibly-disabled control. `pointer-events-none` lets hovers reach
          the transparent trigger layered over it. */}
      <button type="button" className={`${className ?? ''} pointer-events-none`} disabled aria-disabled="true" tabIndex={-1}>
        {children}
      </button>

      {/* Transparent, focusable trigger: the keyboard/click entry point. */}
      <button
        type="button"
        onClick={onUpgrade}
        aria-label={planName ? `Locked — available on the ${planName} plan. Upgrade.` : 'Locked feature. Upgrade.'}
        className="absolute inset-0 cursor-not-allowed rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
      />

      {/* Star badge */}
      <span className="pointer-events-none absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-white ring-2 ring-white">
        <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
      </span>

      {open && (
        <div className={`absolute top-full z-50 mt-2 w-64 ${align === 'right' ? 'right-0' : 'left-0'}`} role="tooltip">
          <div className="rounded-lg border border-slate-200 bg-white p-3 text-left shadow-lg">
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
              <Sparkles className="h-3 w-3" /> Upgrade
            </button>
          </div>
        </div>
      )}
    </span>
  );
}

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  /** The issuer's effective (account-wide) plan, highlighted in the list. */
  currentPlan: Plan;
}

/** A read-only comparison of the three tiers. Plans are set by an admin. */
export function UpgradeModal({ open, onClose, currentPlan }: UpgradeModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Plans and limits"
    >
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h3 className="text-[15px] font-semibold text-slate-900">Plans &amp; limits</h3>
            <p className="text-[12px] text-slate-500">What each plan includes.</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-900"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tiers */}
        <div className="space-y-3 px-5 py-5">
          {PLAN_ORDER.map((plan) => {
            const limits = PLAN_LIMITS[plan];
            const isCurrent = plan === currentPlan;
            return (
              <div
                key={plan}
                className={`rounded-lg border p-4 ${isCurrent ? 'border-blue-300 bg-blue-50/50 ring-1 ring-blue-200' : 'border-slate-200 bg-white'}`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-[13px] font-semibold text-slate-900">{PLAN_LABEL[plan]}</p>
                  {isCurrent && (
                    <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                      Current
                    </span>
                  )}
                </div>
                <ul className="mt-2 space-y-1 text-[12px] text-slate-600">
                  <li className="flex items-center gap-1.5">
                    <Check className="h-3 w-3 shrink-0 text-emerald-500" /> {formatLimit(limits.templates)} templates per workspace
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Check className="h-3 w-3 shrink-0 text-emerald-500" /> {formatLimit(limits.organizations)} organizations
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Check className="h-3 w-3 shrink-0 text-emerald-500" />{' '}
                    {limits.bulkIssueMax === 1 ? 'Single issuance only' : `${formatLimit(limits.bulkIssueMax)} recipients per batch`}
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Check className="h-3 w-3 shrink-0 text-emerald-500" /> {formatLimit(limits.validCertificates)} valid certificates
                  </li>
                  <li className="flex items-center gap-1.5">
                    {limits.customEmailTemplate ? (
                      <Check className="h-3 w-3 shrink-0 text-emerald-500" />
                    ) : (
                      <X className="h-3 w-3 shrink-0 text-slate-300" />
                    )}{' '}
                    Custom email templates
                  </li>
                </ul>
              </div>
            );
          })}
          <p className="text-[11px] leading-relaxed text-slate-400">
            Plans are assigned by a platform administrator — there is no self-serve billing. Contact your administrator to
            change your plan.
          </p>
        </div>
      </div>
    </div>
  );
}
