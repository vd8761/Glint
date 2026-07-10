-- =============================================================================
--  Glint — email delivery tracking (Resend webhook)
-- =============================================================================
--  Target      : PostgreSQL 14+
--  Idempotent  : yes.
--  Applied via : npm run db:migrate
--
--  `status` on email_messages tracks OUR outbox lifecycle — did we hand the
--  message to the transport (pending → sending → sent / failed / simulated).
--  It says nothing about what happened afterwards. The Resend webhook reports
--  the post-send outcome: delivered, bounced, marked as spam, delayed, opened.
--
--  That outcome is recorded separately in `delivery_status` so both facts are
--  preserved: a message can be status='sent' (we handed it off) yet
--  delivery_status='bounced' (the recipient's server rejected it).
-- =============================================================================

BEGIN;

ALTER TABLE email_messages
  ADD COLUMN IF NOT EXISTS delivery_status     TEXT,
  ADD COLUMN IF NOT EXISTS delivery_detail     TEXT,
  ADD COLUMN IF NOT EXISTS delivery_updated_at TIMESTAMPTZ;

-- NULL means "no provider signal yet". Everything else is a known Resend event.
ALTER TABLE email_messages
  DROP CONSTRAINT IF EXISTS email_messages_delivery_status_check;
ALTER TABLE email_messages
  ADD CONSTRAINT email_messages_delivery_status_check
  CHECK (delivery_status IS NULL OR delivery_status IN (
    'scheduled', 'sent', 'delivery_delayed', 'delivered',
    'opened', 'clicked', 'bounced', 'complained', 'failed', 'suppressed'
  ));

-- A webhook is correlated back to its row by provider_message_id: the SMTP
-- Message-ID nodemailer set at send time, which Resend echoes as
-- `data.message_id`. That lookup needs an index.
CREATE INDEX IF NOT EXISTS idx_email_messages_provider_message_id
  ON email_messages (provider_message_id);

-- -----------------------------------------------------------------------------
-- email_webhook_events  (idempotency + raw audit)
-- -----------------------------------------------------------------------------
--  Svix delivers each event at least once and retries on any non-2xx response,
--  so the same svix-id can arrive repeatedly. The primary key makes replays a
--  no-op, and the stored payload is a durable record even when correlation to a
--  row misses (e.g. an event for a message another system sent).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS email_webhook_events (
  svix_id     TEXT PRIMARY KEY,
  event_type  TEXT        NOT NULL,
  email_id    TEXT,
  message_id  TEXT,
  payload     JSONB       NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_webhook_events_message_id
  ON email_webhook_events (message_id);

INSERT INTO schema_migrations (version)
VALUES ('0002_email_delivery')
ON CONFLICT (version) DO NOTHING;

COMMIT;
