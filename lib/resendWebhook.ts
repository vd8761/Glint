/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Resend delivery webhook.
 *
 * Sending only tells us a message was accepted by the provider; it says nothing
 * about whether it reached the recipient. Resend reports that afterwards via
 * webhooks (delivered, bounced, complained, delayed, opened, …). This module
 * verifies each event and folds it into the `email_messages` row it refers to,
 * so the outbox reflects real delivery instead of only "handed off".
 *
 * Correlation: we send through Resend's SMTP interface, so at send time we only
 * know the SMTP Message-ID (stored as `provider_message_id`). Resend echoes it
 * back as `data.message_id`, which is the join key — no change to the send path
 * and no dependency on Resend's own email_id.
 */

import crypto from 'crypto';
import { pool } from './db.js';
import { logger } from './logger.js';

// -----------------------------------------------------------------------------
// Signature verification (Svix scheme, as used by Resend)
// -----------------------------------------------------------------------------

export interface SvixHeaders {
  id?: string;
  timestamp?: string;
  signature?: string;
}

/** Svix tolerates a 5-minute clock skew; anything further is treated as replay. */
const TIMESTAMP_TOLERANCE_S = 5 * 60;

/**
 * Verifies a Svix-signed webhook against the RAW request body.
 *
 * The signature covers the exact bytes received. Parsing to JSON and
 * re-serialising changes them (key order, whitespace, unicode escaping) and
 * breaks verification, so the caller must pass the body as it arrived.
 *
 * Scheme: base64( HMAC-SHA256( key, `${id}.${timestamp}.${body}` ) ), where the
 * key is the base64-decoded portion of the secret after its `whsec_` prefix.
 * The `svix-signature` header is a space-separated list of `v1,<sig>` tokens;
 * a constant-time match against any one passes.
 */
export function verifyResendSignature(rawBody: string, headers: SvixHeaders, secret: string): boolean {
  const { id, timestamp, signature } = headers;
  if (!id || !timestamp || !signature) return false;

  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return false;
  if (Math.abs(Date.now() / 1000 - ts) > TIMESTAMP_TOLERANCE_S) {
    logger.warn('Rejected Resend webhook: timestamp outside tolerance');
    return false;
  }

  const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
  const expected = crypto
    .createHmac('sha256', key)
    .update(`${id}.${timestamp}.${rawBody}`, 'utf8')
    .digest();

  for (const token of signature.split(' ')) {
    const comma = token.indexOf(',');
    if (comma === -1) continue;
    const provided = Buffer.from(token.slice(comma + 1), 'base64');
    if (provided.length === expected.length && crypto.timingSafeEqual(provided, expected)) {
      return true;
    }
  }
  return false;
}

// -----------------------------------------------------------------------------
// Applying an event
// -----------------------------------------------------------------------------

export interface ResendEvent {
  type?: string;
  created_at?: string;
  data?: {
    email_id?: string;
    message_id?: string;
    to?: string[] | string;
    subject?: string;
    bounce?: { type?: string; subType?: string; message?: string };
  };
}

/** Resend event → the delivery_status we persist. Unknown events are ignored. */
const EVENT_STATUS: Record<string, string> = {
  'email.scheduled': 'scheduled',
  'email.sent': 'sent',
  'email.delivery_delayed': 'delivery_delayed',
  'email.delivered': 'delivered',
  'email.opened': 'opened',
  'email.clicked': 'clicked',
  'email.bounced': 'bounced',
  'email.complained': 'complained',
  'email.failed': 'failed',
  'email.suppressed': 'suppressed',
};

/**
 * Monotonic precedence. A status is only ever overwritten by one of equal or
 * higher rank, so out-of-order webhooks (a late `sent` after a `delivered`, an
 * `opened` after a `bounced`) never regress the record. The four terminal
 * negatives share the top rank so a bounce/complaint always wins and is never
 * downgraded.
 */
const STATUS_RANK: Record<string, number> = {
  bounced: 100,
  complained: 100,
  failed: 100,
  suppressed: 100,
  clicked: 70,
  opened: 60,
  delivered: 50,
  delivery_delayed: 30,
  sent: 20,
  scheduled: 10,
};

function describeDetail(event: ResendEvent): string | null {
  const b = event.data?.bounce;
  if (!b) return null;
  const parts = [b.type, b.subType, b.message].filter(Boolean).join(' · ');
  return parts ? parts.slice(0, 500) : null;
}

export interface ApplyResult {
  /** False when this svix-id was already processed (a Svix retry). */
  applied: boolean;
  /** The delivery_status folded in, if the event mapped to one. */
  status?: string;
  /** Whether a matching email_messages row was found. */
  matched?: boolean;
}

/**
 * Idempotently records a verified webhook event and folds it into its outbox
 * row. Safe to call twice with the same svix-id: the second call is a no-op.
 */
export async function applyResendEvent(svixId: string, event: ResendEvent): Promise<ApplyResult> {
  const messageId = event.data?.message_id ?? null;

  // Record first. The primary key turns a Svix retry into a no-op, and the row
  // is a durable audit trail even when correlation to an outbox row misses.
  const recorded = await pool.query(
    `INSERT INTO email_webhook_events (svix_id, event_type, email_id, message_id, payload)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (svix_id) DO NOTHING`,
    [svixId, event.type ?? 'unknown', event.data?.email_id ?? null, messageId, JSON.stringify(event)],
  );
  if (recorded.rowCount === 0) return { applied: false };

  const status = event.type ? EVENT_STATUS[event.type] : undefined;
  if (!status || !messageId) return { applied: true, matched: false };

  const detail = describeDetail(event);
  const rank = STATUS_RANK[status] ?? -1;

  const updated = await pool.query<{ certificate_id: string | null }>(
    `UPDATE email_messages m
        SET delivery_status = $2,
            delivery_detail = $3,
            delivery_updated_at = now()
      WHERE m.provider_message_id = $1
        AND $4::int >= CASE m.delivery_status
              WHEN 'bounced'          THEN 100
              WHEN 'complained'       THEN 100
              WHEN 'failed'           THEN 100
              WHEN 'suppressed'       THEN 100
              WHEN 'clicked'          THEN 70
              WHEN 'opened'           THEN 60
              WHEN 'delivered'        THEN 50
              WHEN 'delivery_delayed' THEN 30
              WHEN 'sent'             THEN 20
              WHEN 'scheduled'        THEN 10
              ELSE -1
            END
      RETURNING m.certificate_id`,
    [messageId, status, detail, rank],
  );

  const row = updated.rows[0];
  if (row?.certificate_id && (status === 'bounced' || status === 'complained')) {
    // Make the delivery failure visible in the certificate's own history.
    await pool
      .query(
        `INSERT INTO certificate_events (certificate_id, event, performed_by, details, is_public)
         VALUES ($1, 'EMAIL_FAILED', 'resend', $2, false)`,
        [row.certificate_id, `Delivery ${status}${detail ? `: ${detail}` : ''}`.slice(0, 500)],
      )
      .catch((err) => logger.error('Failed to record delivery certificate event', err));
  }

  return { applied: true, status, matched: updated.rowCount ? updated.rowCount > 0 : false };
}
