/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Formats the certificate issue date for the `{{date}}` placeholder.
 *
 * The stored value is a plain `YYYY-MM-DD`. We parse the parts directly rather
 * than going through `new Date(iso)`, which interprets a bare date as UTC
 * midnight and shifts it to the previous day west of Greenwich.
 */

export type CertificateDateFormat =
  | 'iso'       // 2026-07-10
  | 'long'      // July 10, 2026
  | 'medium'    // Jul 10, 2026
  | 'us'        // 07/10/2026
  | 'eu'        // 10/07/2026
  | 'dmy-long'  // 10 July 2026
  | 'dot';      // 10.07.2026

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTHS_SHORT = MONTHS.map((m) => m.slice(0, 3));

export const DEFAULT_DATE_FORMAT: CertificateDateFormat = 'iso';

/** Options for the editor's date-format dropdown. */
export const CERTIFICATE_DATE_FORMATS: { value: CertificateDateFormat; label: string; example: string }[] = [
  { value: 'iso', label: 'ISO (2026-07-10)', example: '2026-07-10' },
  { value: 'long', label: 'Long month (July 10, 2026)', example: 'July 10, 2026' },
  { value: 'medium', label: 'Short month (Jul 10, 2026)', example: 'Jul 10, 2026' },
  { value: 'dmy-long', label: 'Day month year (10 July 2026)', example: '10 July 2026' },
  { value: 'us', label: 'US (07/10/2026)', example: '07/10/2026' },
  { value: 'eu', label: 'EU (10/07/2026)', example: '10/07/2026' },
  { value: 'dot', label: 'Dotted (10.07.2026)', example: '10.07.2026' },
];

export function formatCertificateDate(iso: string | undefined, format?: CertificateDateFormat): string {
  const value = (iso ?? '').trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  // Anything that is not a plain ISO date (already-formatted, empty, etc.) is
  // returned untouched so a custom string a caller passed through survives.
  if (!match) return value;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return value;

  const dd = String(day).padStart(2, '0');
  const mm = String(month).padStart(2, '0');
  const monthName = MONTHS[month - 1];
  const monthShort = MONTHS_SHORT[month - 1];

  switch (format) {
    case 'long': return `${monthName} ${day}, ${year}`;
    case 'medium': return `${monthShort} ${day}, ${year}`;
    case 'dmy-long': return `${day} ${monthName} ${year}`;
    case 'us': return `${mm}/${dd}/${year}`;
    case 'eu': return `${dd}/${mm}/${year}`;
    case 'dot': return `${dd}.${mm}.${year}`;
    case 'iso':
    default: return `${match[1]}-${mm}-${dd}`;
  }
}
