/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Durable email outbox.
 *
 * ── Why this exists ──────────────────────────────────────────────────────────
 * Bulk issuance used to COMMIT the certificates and then, still inside the HTTP
 * handler, `await sendVerificationEmail()` once per recipient before responding.
 * At ~600ms per SMTP round trip a 200-person batch held the request open for two
 * minutes; a 500-person batch exceeded the platform's function timeout. When it
 * died, the certificates existed but the emails were never sent and the failures
 * were only `logger.error`'d — there was no retry and no record.
 *
 * Now issuance writes rows into `email_messages` inside the same transaction as
 * the certificates and returns immediately. A drain worker claims rows with
 * `FOR UPDATE SKIP LOCKED` — so several workers, or several serverless
 * invocations, can drain concurrently without sending anything twice — and
 * retries with capped exponential backoff.
 */

import nodemailer from 'nodemailer';
import type { PoolClient } from 'pg';
import { waitUntil } from '@vercel/functions';
import { env } from './env.js';
import { pool } from './db.js';
import { logger } from './logger.js';
import { newId } from './security.js';

// -----------------------------------------------------------------------------
// Transport
// -----------------------------------------------------------------------------

const transporter = env.mailConfigured
  ? nodemailer.createTransport({
      host: env.RESEND_API_KEY ? 'smtp.resend.com' : env.SMTP_HOST!,
      port: Number(env.RESEND_API_KEY ? 465 : env.SMTP_PORT ?? 587),
      secure: env.RESEND_API_KEY ? true : env.SMTP_PORT === '465',
      auth: {
        user: env.RESEND_API_KEY ? 'resend' : env.SMTP_USER!,
        pass: env.RESEND_API_KEY ?? env.SMTP_PASS!,
      },
      // `rejectUnauthorized: false` was set here. It disables certificate
      // validation on the SMTP connection, which makes credentials and every
      // outbound message interceptable by anyone who can MITM the link.
      tls: { minVersion: 'TLSv1.2' },
    })
  : null;

if (!transporter) {
  logger.warn(
    'No SMTP transport configured. Issuance emails will be recorded with status=simulated and never delivered.',
  );
}

// -----------------------------------------------------------------------------
// Rendering
// -----------------------------------------------------------------------------

/**
 * Recipient names, program names, and workspace branding are all attacker- or
 * customer-controlled, and they were being interpolated raw into the email HTML.
 * A recipient named `<img src=x onerror=...>` is an injection into every mail
 * client that renders it.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Only absolute http(s) URLs may appear in an href or img src. */
function safeHref(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return '';
    return escapeHtml(parsed.toString());
  } catch {
    return '';
  }
}

export interface WorkspaceBranding {
  brandName: string;
  primaryColor: string;
  logoUrl: string | null;
  footerText: string | null;
  senderName: string | null;
  senderEmail: string | null;
}

export function renderIssuanceEmailText(params: {
  recipientName: string;
  programName: string;
  certificateId: string;
  verificationUrl: string;
  brandName: string;
}): string {
  return [
    `Hello ${params.recipientName},`,
    '',
    `Congratulations! Your credential for "${params.programName}" has been issued.`,
    '',
    `Certificate ID: ${params.certificateId}`,
    `Verification link: ${params.verificationUrl}`,
    '',
    'You can view, download, print, or add it to your LinkedIn profile.',
    '',
    'Warm regards,',
    `${params.brandName}`,
  ].join('\n');
}

function renderIssuanceEmailHtml(params: {
  recipientName: string;
  programName: string;
  certificateId: string;
  verificationUrl: string;
  branding: WorkspaceBranding;
}): string {
  const { branding } = params;
  const brand = escapeHtml(branding.brandName);
  const name = escapeHtml(params.recipientName);
  const program = escapeHtml(params.programName);
  const certId = escapeHtml(params.certificateId);
  const url = safeHref(params.verificationUrl);
  const accent = /^#[0-9a-fA-F]{3,6}$/.test(branding.primaryColor) ? branding.primaryColor : '#0f172a';

  const logo = branding.logoUrl && safeHref(branding.logoUrl)
    ? `<img src="${safeHref(branding.logoUrl)}" alt="${brand}" style="max-height:44px">`
    : `<span style="font:700 18px system-ui,sans-serif;color:#0f172a">${brand}</span>`;

  const footer = branding.footerText
    ? escapeHtml(branding.footerText)
    : `This is an automated message from ${brand}.`;

  return `<!doctype html>
<html><body style="margin:0;background:#f1f5f9;padding:24px;font-family:system-ui,-apple-system,'Segoe UI',sans-serif">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0">
    <div style="padding:24px;text-align:center;border-bottom:1px solid #e2e8f0">${logo}</div>
    <div style="padding:28px">
      <h1 style="margin:0 0 12px;font-size:20px;color:#0f172a">Congratulations, ${name}!</h1>
      <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#475569">
        Your credential for <strong>${program}</strong> has been issued and registered.
      </p>
      <table style="width:100%;font-size:13px;color:#334155;border-collapse:collapse;margin-bottom:24px">
        <tr><td style="padding:6px 0;color:#64748b">Recipient</td><td style="text-align:right;font-weight:600">${name}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b">Program</td><td style="text-align:right;font-weight:600">${program}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b">Credential ID</td><td style="text-align:right;font-family:monospace">${certId}</td></tr>
      </table>
      ${url ? `<div style="text-align:center"><a href="${url}" style="display:inline-block;background:${accent};color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px">View your certificate</a></div>` : ''}
      <p style="margin:20px 0 0;font-size:12px;color:#64748b;text-align:center">
        View, download, print, or add it to your LinkedIn profile.
      </p>
    </div>
    <div style="padding:16px 24px;background:#f8fafc;border-top:1px solid #e2e8f0">
      <p style="margin:0;font-size:11px;color:#94a3b8;text-align:center">${footer}</p>
    </div>
  </div>
</body></html>`;
}

/**
 * Resolves the envelope sender.
 *
 * A workspace can set any `sender_email` it likes in its branding tab. If that
 * domain is not the one verified with the mail provider, the provider rejects
 * the message — or worse, accepts it and it lands in spam. The local part is
 * kept and the domain is forced onto the verified one.
 *
 * The verified identity comes from MAIL_FROM. It used to fall back to a
 * hardcoded `no-reply@originbi.com`, so a misconfigured deployment would send
 * as somebody else's domain.
 */
function resolveSender(branding: WorkspaceBranding): { name: string; address: string } {
  const verified = env.mailFrom;
  const verifiedDomain = env.mailFromDomain;
  const name = branding.senderName?.trim() || env.mailFromName || branding.brandName;

  // Unreachable in practice: lib/env.ts refuses to boot with a transport and no
  // MAIL_FROM. Kept so the invariant is enforced at the point of use too.
  if (!verified || !verifiedDomain) {
    throw new Error('No verified sender address configured (set MAIL_FROM)');
  }

  if (env.mailForceFrom || !branding.senderEmail) {
    return { name, address: verified };
  }

  const [localPart, requestedDomain] = branding.senderEmail.split('@');
  if (!localPart || !requestedDomain) return { name, address: verified };

  if (requestedDomain.toLowerCase() === verifiedDomain) {
    return { name, address: branding.senderEmail };
  }
  return { name, address: `${localPart}@${verifiedDomain}` };
}

// -----------------------------------------------------------------------------
// Enqueue
// -----------------------------------------------------------------------------

export interface OutboundMessage {
  workspaceId: string;
  programId: string | null;
  programName: string;
  certificateId: string;
  recipientEmail: string;
  recipientName: string;
  subject: string;
  body: string;
  verificationUrl: string;
  kind?: 'issuance' | 'resend';
}

/**
 * Writes a message to the outbox. Pass the transaction client so the row is
 * committed atomically with the certificate it refers to — otherwise a crash
 * between the two commits leaves a certificate nobody is ever told about.
 */
export async function enqueueEmail(
  client: PoolClient | typeof pool,
  message: OutboundMessage,
): Promise<string> {
  const id = newId('eml');
  await client.query(
    `INSERT INTO email_messages
       (id, workspace_id, program_id, program_name, certificate_id, recipient_email, recipient_name,
        subject, body, verification_url, kind, status, next_attempt_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending', now())`,
    [
      id,
      message.workspaceId,
      message.programId,
      message.programName,
      message.certificateId,
      message.recipientEmail,
      message.recipientName,
      message.subject,
      message.body,
      message.verificationUrl,
      message.kind ?? 'issuance',
    ],
  );
  return id;
}

// -----------------------------------------------------------------------------
// Drain
// -----------------------------------------------------------------------------

interface ClaimedRow {
  id: string;
  workspace_id: string;
  certificate_id: string | null;
  recipient_email: string;
  recipient_name: string;
  program_name: string;
  subject: string;
  body: string;
  verification_url: string | null;
  program_id: string | null;
  attempts: number;
  max_attempts: number;
}

/** 30s, 60s, 2m, 4m, 8m … capped at one hour. */
function backoffSeconds(attempts: number): number {
  return Math.min(30 * 2 ** Math.max(0, attempts - 1), 3600);
}

/** Rows a worker abandoned mid-send are reclaimable after this long. */
const STUCK_AFTER = '5 minutes';

export interface DrainResult {
  claimed: number;
  sent: number;
  simulated: number;
  retried: number;
  failed: number;
}

/**
 * Claims up to `limit` messages and attempts delivery.
 *
 * `FOR UPDATE SKIP LOCKED` is what makes this safe to run from several workers
 * at once: each transaction takes a disjoint set of rows rather than blocking on
 * the same head-of-queue row. The `attempts` counter is incremented at claim
 * time, not at completion, so a worker that dies mid-send still burns an attempt
 * and cannot spin forever.
 */
export async function drainOutbox(limit = 25): Promise<DrainResult> {
  const workerId = newId('w');
  const result: DrainResult = { claimed: 0, sent: 0, simulated: 0, retried: 0, failed: 0 };

  const client = await pool.connect();
  let claimed: ClaimedRow[];
  try {
    await client.query('BEGIN');
    const claim = await client.query<ClaimedRow>(
      `WITH claimable AS (
         SELECT id
         FROM email_messages
         WHERE attempts < max_attempts
           AND (
             (status = 'pending' AND next_attempt_at <= now())
             OR (status = 'sending' AND locked_at < now() - interval '${STUCK_AFTER}')
           )
         ORDER BY next_attempt_at
         LIMIT $1
         FOR UPDATE SKIP LOCKED
       )
       UPDATE email_messages m
       SET status = 'sending',
           locked_at = now(),
           locked_by = $2,
           attempts = m.attempts + 1
       FROM claimable c
       WHERE m.id = c.id
       RETURNING m.id, m.workspace_id, m.certificate_id, m.recipient_email, m.recipient_name,
                 m.program_name, m.subject, m.body, m.verification_url, m.program_id,
                 m.attempts, m.max_attempts`,
      [limit, workerId],
    );
    await client.query('COMMIT');
    claimed = claim.rows;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    client.release();
    throw err;
  }
  client.release();

  result.claimed = claimed.length;
  if (claimed.length === 0) return result;

  for (const row of claimed) {
    try {
      const outcome = await deliver(row);
      if (outcome.simulated) {
        result.simulated += 1;
        await pool.query(
          `UPDATE email_messages SET status = 'simulated', sent_time = now(), locked_at = NULL, locked_by = NULL WHERE id = $1`,
          [row.id],
        );
      } else {
        result.sent += 1;
        await pool.query(
          `UPDATE email_messages
             SET status = 'sent', sent_time = now(), provider_message_id = $2,
                 locked_at = NULL, locked_by = NULL, last_error = NULL
           WHERE id = $1`,
          [row.id, outcome.messageId ?? null],
        );
      }
      if (row.certificate_id) {
        await recordCertificateEvent(row.certificate_id, 'EMAIL_DISPATCHED', `Sent to ${row.recipient_email}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const exhausted = row.attempts >= row.max_attempts;

      if (exhausted) {
        result.failed += 1;
        await pool.query(
          `UPDATE email_messages
             SET status = 'failed', last_error = $2, locked_at = NULL, locked_by = NULL
           WHERE id = $1`,
          [row.id, message.slice(0, 500)],
        );
        if (row.certificate_id) {
          await recordCertificateEvent(row.certificate_id, 'EMAIL_FAILED', `Delivery gave up after ${row.attempts} attempts`);
        }
        logger.error(`Email permanently failed for ${row.recipient_email}`, err, { id: row.id });
      } else {
        result.retried += 1;
        await pool.query(
          `UPDATE email_messages
             SET status = 'pending',
                 last_error = $2,
                 next_attempt_at = now() + make_interval(secs => $3),
                 locked_at = NULL, locked_by = NULL
           WHERE id = $1`,
          [row.id, message.slice(0, 500), backoffSeconds(row.attempts)],
        );
        logger.warn(`Email attempt ${row.attempts} failed, will retry`, { id: row.id });
      }
    }
  }

  return result;
}

// -----------------------------------------------------------------------------
// Scheduling the drain without a frequent platform cron
// -----------------------------------------------------------------------------
//
// On Vercel's Hobby plan crons fire at most once a day, so the outbox cannot
// rely on the scheduler to move mail promptly. Instead we drain from live
// traffic:
//
//   • Issuance / resend calls `scheduleDrain()`. Locally that just fires
//     `drainOutbox()` on the long-lived process. On Vercel it hands the work to
//     `waitUntil()`, which keeps the function warm past the HTTP response while
//     the first batch is sent.
//   • A single invocation only has one function's worth of time, so after each
//     batch we self-invoke the drain endpoint (`?async=1`) to continue with a
//     fresh time budget. Each link sends one batch and triggers the next, so the
//     whole queue clears in a chain of short invocations rather than one that
//     times out.
//   • The chain stops as soon as nothing is immediately claimable. Messages in
//     backoff are left for the next trigger, opportunistic drains, or the daily
//     cron backstop.

/** Batch size per drain link. Small enough to finish inside one function run. */
const DRAIN_BATCH = 20;

/** Minimum gap between opportunistic drains kicked off by ordinary reads. */
const OPPORTUNISTIC_INTERVAL_MS = 60_000;
let lastOpportunisticDrain = 0;

/**
 * Runs a background task past the HTTP response.
 *
 * `waitUntil` is the supported way to do post-response work on Vercel; a bare
 * un-awaited promise there is killed the moment the function freezes. Outside a
 * Vercel request context it throws, so we fall back to letting the promise run
 * on the (long-lived) local server.
 */
function backgroundRun(factory: () => Promise<unknown>): void {
  const task = factory().catch((err) => logger.error('Background email task failed', err));
  try {
    waitUntil(task);
  } catch {
    void task;
  }
}

/** True when at least one message is claimable right now (ignores backoff waits). */
export async function hasClaimableEmails(): Promise<boolean> {
  const result = await pool.query(
    `SELECT 1 FROM email_messages
     WHERE attempts < max_attempts
       AND (
         (status = 'pending' AND next_attempt_at <= now())
         OR (status = 'sending' AND locked_at < now() - interval '${STUCK_AFTER}')
       )
     LIMIT 1`,
  );
  return result.rows.length > 0;
}

/**
 * Spins up a fresh function invocation to continue draining. The endpoint
 * responds before it starts sending (`?async=1`), so this fetch returns quickly
 * and the *next* invocation owns the actual work — that is what gives each link
 * of the chain its own time budget.
 */
async function triggerRemoteDrain(limit: number): Promise<void> {
  if (!env.CRON_SECRET) return; // no way to authenticate the self-call
  try {
    await fetch(`${env.appUrl}/api/internal/email/drain?async=1&limit=${limit}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.CRON_SECRET}` },
    });
  } catch (err) {
    logger.error('Failed to trigger follow-up email drain', err);
  }
}

/** Drain one batch, then hand off to a fresh invocation if work remains. */
async function drainAndContinue(limit: number): Promise<void> {
  await drainOutbox(limit);
  if (await hasClaimableEmails()) await triggerRemoteDrain(limit);
}

/**
 * Kicks the outbox after enqueuing. Safe to call from any request handler —
 * locally it drains in-process, on Vercel it drains via `waitUntil` and chains.
 */
export function scheduleDrain(limit = DRAIN_BATCH): void {
  if (!env.isServerless) {
    void drainOutbox(limit).catch((err) => logger.error('Background drain failed', err));
    return;
  }
  backgroundRun(() => drainAndContinue(limit));
}

/**
 * Piggybacks a drain on ordinary read traffic, throttled per warm instance.
 * Catches messages whose backoff has elapsed between issuance chains without
 * waiting for the once-a-day cron.
 */
export function maybeOpportunisticDrain(): void {
  const now = Date.now();
  if (now - lastOpportunisticDrain < OPPORTUNISTIC_INTERVAL_MS) return;
  lastOpportunisticDrain = now;
  scheduleDrain();
}

async function recordCertificateEvent(certificateId: string, event: string, details: string): Promise<void> {
  await pool
    .query(
      `INSERT INTO certificate_events (certificate_id, event, performed_by, details, is_public)
       VALUES ($1, $2, 'system', $3, false)`,
      [certificateId, event, details],
    )
    .catch((err) => logger.error('Failed to record certificate event', err));
}

async function deliver(row: ClaimedRow): Promise<{ simulated: boolean; messageId?: string }> {
  const brandingResult = await pool.query<{
    brand_name: string;
    primary_color: string;
    logo_url: string | null;
    footer_text: string | null;
    sender_name: string | null;
    sender_email: string | null;
  }>(
    `SELECT brand_name, primary_color, logo_url, footer_text, sender_name, sender_email
     FROM workspaces WHERE id = $1`,
    [row.workspace_id],
  );

  const branding: WorkspaceBranding = brandingResult.rows[0]
    ? {
        brandName: brandingResult.rows[0].brand_name,
        primaryColor: brandingResult.rows[0].primary_color,
        logoUrl: brandingResult.rows[0].logo_url,
        footerText: brandingResult.rows[0].footer_text,
        senderName: brandingResult.rows[0].sender_name,
        senderEmail: brandingResult.rows[0].sender_email,
      }
    : {
        brandName: 'Glint',
        primaryColor: '#0f172a',
        logoUrl: null,
        footerText: null,
        senderName: null,
        senderEmail: null,
      };

  if (!transporter) {
    logger.info(`[mail simulated] ${row.recipient_email} — ${row.subject}`);
    return { simulated: true };
  }

  const from = resolveSender(branding);
  const html = renderIssuanceEmailHtml({
    recipientName: row.recipient_name,
    programName: row.program_name,
    certificateId: row.certificate_id ?? '',
    verificationUrl: row.verification_url ?? '',
    branding,
  });

  const info = await transporter.sendMail({
    from: { name: from.name, address: from.address },
    to: row.recipient_email,
    subject: row.subject,
    text: row.body,
    html,
    ...(env.MAIL_CC ? { cc: env.MAIL_CC } : {}),
  });

  return { simulated: false, messageId: info.messageId };
}
