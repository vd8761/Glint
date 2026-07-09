/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Centralised, validated environment configuration.
 *
 * This module MUST be the first thing the server imports. It loads .env files
 * and validates every secret before any other module has a chance to read
 * `process.env` — ES module bodies evaluate in dependency order, so importing
 * this from `lib/security.ts` guarantees dotenv has run before secrets are read.
 *
 * There are deliberately NO fallback values for secrets. A missing JWT_SECRET
 * used to silently fall back to a hardcoded string that is committed to this
 * repository's git history; anyone with the repo could forge tokens for any
 * user. The process now refuses to start instead.
 */

import path from 'path';
import dotenv from 'dotenv';
import { z } from 'zod';

// dotenv never overwrites variables that are already set, so platform-provided
// values (Vercel, CI, systemd) always win over a stray local file.
dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config();

/**
 * Secrets that shipped as hardcoded fallbacks in earlier revisions of this
 * codebase, and are therefore recoverable from `git log`. Refuse them outright
 * rather than trusting that nobody copy-pasted one into a .env file.
 */
const COMPROMISED_SECRETS = new Set([
  'glint-super-secure-token-vault-key-2026',
  'glint-local-development-secret',
  'glint-local-admin-secret',
  'your_secure_random_jwt_secret_here',
  'your_secure_admin_key_here',
  'changeme',
  'secret',
]);

const secret = (minLength: number, label: string) =>
  z
    .string()
    .min(minLength, `${label} must be at least ${minLength} characters`)
    .refine((v) => !COMPROMISED_SECRETS.has(v.trim().toLowerCase()), {
      message: `${label} is a known-compromised default value. Generate a fresh one.`,
    });

const optionalNonEmpty = z
  .string()
  .trim()
  .min(1)
  .optional()
  // Treat `FOO=""` in a .env file the same as an absent variable — a .env file
  // has no way to express "absent", so unused keys are written as empty strings.
  .catch(undefined);

/**
 * Optional, but a typo fails at boot rather than at the first send attempt.
 *
 * `.catch(undefined)` is deliberately NOT used here: it would turn
 * `MAIL_FROM="no-reply@originbi"` into "mail is not configured" and the failure
 * would surface hours later as silently undelivered certificates. Only the
 * empty string means absent.
 */
const optionalEmail = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().trim().toLowerCase().pipe(z.email()).optional(),
);

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DATABASE_POOL_MAX: z.coerce.number().int().positive().max(50).default(10),

  /** Signs session JWTs. */
  JWT_SECRET: secret(32, 'JWT_SECRET'),
  /** Signs certificate issuance facts. Rotating this invalidates every signature. */
  CERT_SIGNING_KEY: secret(32, 'CERT_SIGNING_KEY'),
  /** Salts the one-way hash of visitor IPs in the audit log. */
  IP_HASH_SALT: secret(16, 'IP_HASH_SALT'),
  /** Bearer token for the internal email-drain endpoint. */
  CRON_SECRET: z.string().min(16).optional(),

  APP_URL: z.string().url().optional(),
  /** Comma-separated. Empty means same-origin only, which is the default. */
  ALLOWED_ORIGINS: optionalNonEmpty,

  JWT_TTL: z.string().default('8h'),
  BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),
  MAX_FAILED_LOGINS: z.coerce.number().int().min(3).max(20).default(8),
  LOCKOUT_MINUTES: z.coerce.number().int().min(1).max(1440).default(15),

  GEMINI_API_KEY: optionalNonEmpty,

  /**
   * The envelope sender for every outbound email.
   *
   * There is no fallback. Earlier revisions hardcoded `no-reply@originbi.com`
   * as the default in three places, so a deployment that forgot to configure
   * mail would silently send as a domain it did not own.
   *
   * Its domain must be the one verified with the mail provider — a workspace's
   * own `sender_email` is rewritten onto it (see lib/mailer.ts).
   */
  MAIL_FROM: optionalEmail,
  MAIL_FROM_NAME: optionalNonEmpty,
  MAIL_CC: optionalEmail,
  /** Ignore each workspace's configured sender and always send as MAIL_FROM. */
  MAIL_FORCE_FROM: optionalNonEmpty,

  SMTP_HOST: optionalNonEmpty,
  SMTP_PORT: optionalNonEmpty,
  SMTP_USER: optionalNonEmpty,
  SMTP_PASS: optionalNonEmpty,
  RESEND_API_KEY: optionalNonEmpty,

  VERCEL: optionalNonEmpty,
});

function describeFailure(issues: z.core.$ZodIssue[]): string {
  const lines = issues.map((i) => `  • ${i.path.join('.') || '(root)'}: ${i.message}`);
  return [
    '',
    '  Glint refused to start: the environment is not safely configured.',
    '',
    ...lines,
    '',
    '  Generate strong secrets with:',
    '    node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"',
    '',
    '  See .env.example for the full list.',
    '',
  ].join('\n');
}

const parsed = EnvSchema.safeParse(process.env);
if (!parsed.success) {
  throw new Error(describeFailure(parsed.error.issues));
}

const raw = parsed.data;

// Key separation: a single leaked secret must not compromise both the session
// layer and the certificate signing authority.
if (raw.JWT_SECRET === raw.CERT_SIGNING_KEY) {
  throw new Error(
    'Glint refused to start: JWT_SECRET and CERT_SIGNING_KEY must be different values.',
  );
}

const isProd = raw.NODE_ENV === 'production';

/** A transport can actually deliver mail. */
const mailConfigured = Boolean(
  (raw.SMTP_HOST && raw.SMTP_USER && raw.SMTP_PASS) || raw.RESEND_API_KEY,
);

// A transport with no sender identity would authenticate, then be rejected at
// RCPT time — or worse, accepted and delivered as whatever the provider felt
// like. Refuse at boot instead.
if (mailConfigured && !raw.MAIL_FROM) {
  throw new Error(
    '\n  Glint refused to start: a mail transport is configured but MAIL_FROM is not set.\n' +
      '  Set MAIL_FROM to an address on the domain you have verified with the provider.\n',
  );
}

if (isProd) {
  const missing: string[] = [];
  if (!raw.APP_URL) missing.push('APP_URL (required to build verification links)');
  if (!raw.CRON_SECRET) missing.push('CRON_SECRET (required to protect the email drain endpoint)');
  if (missing.length) {
    throw new Error(
      `\n  Glint refused to start in production. Missing:\n${missing
        .map((m) => `  • ${m}`)
        .join('\n')}\n`,
    );
  }
}

export const env = {
  ...raw,
  isProd,
  isTest: raw.NODE_ENV === 'test',
  isServerless: Boolean(raw.VERCEL),

  appUrl: raw.APP_URL ?? `http://localhost:${raw.PORT}`,

  allowedOrigins: raw.ALLOWED_ORIGINS
    ? raw.ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
    : [],

  mailConfigured,

  /** The single source of truth for the envelope sender. `undefined` when unset. */
  mailFrom: raw.MAIL_FROM,
  mailFromName: raw.MAIL_FROM_NAME ?? 'Glint',
  /** The verified domain. A workspace sender outside it is rewritten onto it. */
  mailFromDomain: raw.MAIL_FROM?.split('@')[1],
  mailForceFrom: raw.MAIL_FORCE_FROM === 'true',
} as const;

export type Env = typeof env;
