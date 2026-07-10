-- =============================================================================
--  Glint — deferred sending, manual bulk email, and digest-to-one-address
-- =============================================================================
--  Target      : PostgreSQL 14+
--  Idempotent  : yes.
--  Applied via : npm run db:migrate
--
--  Adds:
--    * workspaces.digest_email_template — a second designer document used when a
--      batch of certificate links is emailed to ONE manually-entered address
--      (see lib/emailTemplateHtml.ts, digest mode).
--    * email_messages.kind = 'digest' — one outbox row that fans a list of
--      certificate links into a single message.
--    * email_messages.digest_certificate_ids — the certificates that digest row
--      links to (a JSONB array of ids; not FK-enforced so a later deletion just
--      drops the row from the rendered list rather than cascading the email).
-- =============================================================================

BEGIN;

ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS digest_email_template JSONB;

ALTER TABLE workspaces
  DROP CONSTRAINT IF EXISTS workspaces_digest_email_template_object;
ALTER TABLE workspaces
  ADD CONSTRAINT workspaces_digest_email_template_object
  CHECK (digest_email_template IS NULL OR jsonb_typeof(digest_email_template) = 'object');

ALTER TABLE email_messages
  ADD COLUMN IF NOT EXISTS digest_certificate_ids JSONB;

ALTER TABLE email_messages
  DROP CONSTRAINT IF EXISTS email_messages_digest_ids_array;
ALTER TABLE email_messages
  ADD CONSTRAINT email_messages_digest_ids_array
  CHECK (digest_certificate_ids IS NULL OR jsonb_typeof(digest_certificate_ids) = 'array');

-- Broaden the outbox `kind` to include the manual digest send.
ALTER TABLE email_messages
  DROP CONSTRAINT IF EXISTS email_messages_kind_check;
ALTER TABLE email_messages
  ADD CONSTRAINT email_messages_kind_check
  CHECK (kind IN ('issuance', 'resend', 'digest'));

INSERT INTO schema_migrations (version)
VALUES ('0004_bulk_email')
ON CONFLICT (version) DO NOTHING;

COMMIT;
