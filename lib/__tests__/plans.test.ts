/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import {
  PLAN_LIMITS,
  asPlan,
  limitsFor,
  planAtLeast,
  highestPlan,
  minPlanSatisfying,
  formatLimit,
} from '../plans.js';

describe('plans', () => {
  it('encodes the documented per-plan limits', () => {
    expect(PLAN_LIMITS.free).toMatchObject({ templates: 1, organizations: 1, bulkIssueMax: 1, validCertificates: 5, customEmailTemplate: false, glintEmailAttribution: true });
    expect(PLAN_LIMITS.pro).toMatchObject({ templates: 5, organizations: 2, bulkIssueMax: 10, validCertificates: 50, customEmailTemplate: true, glintEmailAttribution: true });
    expect(PLAN_LIMITS.enterprise).toMatchObject({ organizations: 5, customEmailTemplate: true, glintEmailAttribution: false });
    for (const k of ['templates', 'bulkIssueMax', 'validCertificates'] as const) {
      expect(PLAN_LIMITS.enterprise[k]).toBe(Infinity);
    }
  });

  it('normalises unknown/legacy plan strings to free', () => {
    expect(asPlan('pro')).toBe('pro');
    expect(asPlan('enterprise')).toBe('enterprise');
    expect(asPlan('legacy')).toBe('free');
    expect(asPlan(null)).toBe('free');
    expect(asPlan(undefined)).toBe('free');
    expect(limitsFor('nope')).toBe(PLAN_LIMITS.free);
  });

  it('orders plans free < pro < enterprise', () => {
    expect(planAtLeast('pro', 'free')).toBe(true);
    expect(planAtLeast('free', 'pro')).toBe(false);
    expect(planAtLeast('enterprise', 'enterprise')).toBe(true);
  });

  it('takes the most capable plan across an issuer’s workspaces', () => {
    expect(highestPlan(['free', 'free'])).toBe('free');
    expect(highestPlan(['free', 'pro'])).toBe('pro');
    expect(highestPlan(['pro', 'enterprise', 'free'])).toBe('enterprise');
    expect(highestPlan([])).toBe('free');
  });

  it('finds the cheapest plan satisfying a capability', () => {
    expect(minPlanSatisfying((l) => l.customEmailTemplate)).toBe('pro');
    expect(minPlanSatisfying((l) => !l.glintEmailAttribution)).toBe('enterprise');
    expect(minPlanSatisfying((l) => l.bulkIssueMax > 1)).toBe('pro');
    expect(minPlanSatisfying((l) => l.organizations > 5)).toBeNull();
  });

  it('formats unlimited as a word', () => {
    expect(formatLimit(5)).toBe('5');
    expect(formatLimit(Infinity)).toBe('Unlimited');
  });
});
