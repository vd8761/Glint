/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Values whose contents must never reach a log line, matched by key name.
 * Logs are routinely shipped to third-party aggregators and read by people who
 * have no business seeing a password hash or a bearer token.
 */
const REDACT_KEYS =
  /^(password|password_hash|passwordHash|token|authorization|jwt|secret|signature|apiKey|api_key|smtp_pass|cookie)$/i;

function redact(value: unknown, depth = 0): unknown {
  if (depth > 4) return '[deep]';
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.slice(0, 20).map((v) => redact(v, depth + 1));

  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    out[key] = REDACT_KEYS.test(key) ? '[redacted]' : redact(val, depth + 1);
  }
  return out;
}

function format(level: string, message: string, context?: unknown): string {
  const ctx = context === undefined ? '' : ` | ${JSON.stringify(redact(context))}`;
  return `[${new Date().toISOString()}] [${level}] [glint] ${message}${ctx}`;
}

export const logger = {
  info: (message: string, context?: unknown) => console.log(format('INFO', message, context)),
  warn: (message: string, context?: unknown) => console.warn(format('WARN', message, context)),
  error: (message: string, error?: unknown, context?: unknown) => {
    const detail =
      error instanceof Error ? error.stack ?? error.message : error ? String(error) : '';
    console.error(format('ERROR', `${message}${detail ? ` | ${detail}` : ''}`, context));
  },
};
