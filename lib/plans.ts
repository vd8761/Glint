/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Plan definitions and limits — the single source of truth shared by the server
 * (which enforces them) and the dashboard (which greys out what a plan does not
 * allow and offers an upgrade). Keep this file free of Node- or DOM-specific
 * imports so both sides can use it.
 *
 * `Infinity` means "no limit". It never crosses the wire as JSON — both sides
 * import this module directly — so the non-finite value is safe here.
 */

export type Plan = 'free' | 'pro' | 'enterprise';

/** Cheapest → most capable. Used for "minimum plan required" messaging. */
export const PLAN_ORDER: Plan[] = ['free', 'pro', 'enterprise'];

export const PLAN_LABEL: Record<Plan, string> = {
  free: 'Free',
  pro: 'Pro',
  enterprise: 'Enterprise',
};

export interface PlanLimits {
  /** Certificate templates a single workspace may hold (each editable freely). */
  templates: number;
  /** Organizations (workspaces) a single issuer may own. */
  organizations: number;
  /** Recipients allowed in one issuance batch. 1 = bulk issuance disabled. */
  bulkIssueMax: number;
  /** Valid (non-revoked, non-expired) certificates a workspace may hold. */
  validCertificates: number;
  /** May the workspace send from a custom-designed email template? */
  customEmailTemplate: boolean;
  /** Do outgoing emails carry the "Powered by Glint" attribution? */
  glintEmailAttribution: boolean;
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free: {
    templates: 1,
    organizations: 1,
    bulkIssueMax: 1,
    validCertificates: 5,
    customEmailTemplate: false,
    glintEmailAttribution: true,
  },
  pro: {
    templates: 5,
    organizations: 2,
    bulkIssueMax: 10,
    validCertificates: 50,
    customEmailTemplate: true,
    glintEmailAttribution: true,
  },
  enterprise: {
    templates: Infinity,
    organizations: 5,
    bulkIssueMax: Infinity,
    validCertificates: Infinity,
    customEmailTemplate: true,
    glintEmailAttribution: false,
  },
};

/** Normalise an unknown/legacy plan string to a valid Plan (defaults to free). */
export function asPlan(value: string | null | undefined): Plan {
  return value === 'pro' || value === 'enterprise' ? value : 'free';
}

export function limitsFor(plan: string | null | undefined): PlanLimits {
  return PLAN_LIMITS[asPlan(plan)];
}

/** True when `a` is at least as capable as `b` (free < pro < enterprise). */
export function planAtLeast(a: string | null | undefined, b: Plan): boolean {
  return PLAN_ORDER.indexOf(asPlan(a)) >= PLAN_ORDER.indexOf(b);
}

/** The most capable plan among a set (e.g. all of an issuer's workspaces). */
export function highestPlan(plans: Array<string | null | undefined>): Plan {
  return plans.reduce<Plan>((best, p) => (planAtLeast(p, best) ? asPlan(p) : best), 'free');
}

/**
 * The cheapest plan whose limits satisfy `predicate`, or null if none do.
 * Drives the "Available on the Pro plan" tooltip on a disabled control.
 */
export function minPlanSatisfying(predicate: (limits: PlanLimits) => boolean): Plan | null {
  return PLAN_ORDER.find((p) => predicate(PLAN_LIMITS[p])) ?? null;
}

/** `Infinity` → "Unlimited"; otherwise the number as a string. */
export function formatLimit(n: number): string {
  return Number.isFinite(n) ? String(n) : 'Unlimited';
}
