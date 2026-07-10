/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from 'vitest';
import { formatCertificateDate } from './certificateDate';

describe('formatCertificateDate', () => {
  const iso = '2026-07-09';

  it('defaults to ISO when no format given', () => {
    expect(formatCertificateDate(iso)).toBe('2026-07-09');
    expect(formatCertificateDate(iso, 'iso')).toBe('2026-07-09');
  });

  it('formats long / medium / dmy-long', () => {
    expect(formatCertificateDate(iso, 'long')).toBe('July 9, 2026');
    expect(formatCertificateDate(iso, 'medium')).toBe('Jul 9, 2026');
    expect(formatCertificateDate(iso, 'dmy-long')).toBe('9 July 2026');
  });

  it('formats us / eu / dot with zero padding', () => {
    expect(formatCertificateDate(iso, 'us')).toBe('07/09/2026');
    expect(formatCertificateDate(iso, 'eu')).toBe('09/07/2026');
    expect(formatCertificateDate(iso, 'dot')).toBe('09.07.2026');
  });

  it('does not shift across timezones (parses parts, not Date)', () => {
    // 2026-01-01 must never become 2025-12-31 regardless of the host TZ.
    expect(formatCertificateDate('2026-01-01', 'long')).toBe('January 1, 2026');
  });

  it('returns non-ISO input untouched', () => {
    expect(formatCertificateDate('', 'long')).toBe('');
    expect(formatCertificateDate('Graduation Day', 'us')).toBe('Graduation Day');
    expect(formatCertificateDate(undefined, 'us')).toBe('');
  });
});
