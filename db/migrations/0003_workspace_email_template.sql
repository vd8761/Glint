-- =============================================================================
--  Glint — per-workspace custom email template
-- =============================================================================
--  Target      : PostgreSQL 14+
--  Idempotent  : yes.
--  Applied via : npm run db:migrate
--
--  Stores the issuance-email design produced by the dashboard's email designer
--  as a JSONB document (see lib/emailTemplateHtml.ts for the shape). NULL means
--  "use the built-in default template". The mailer compiles this document to
--  email-safe HTML at send time.
-- =============================================================================

BEGIN;

ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS email_template JSONB;

ALTER TABLE workspaces
  DROP CONSTRAINT IF EXISTS workspaces_email_template_object;
ALTER TABLE workspaces
  ADD CONSTRAINT workspaces_email_template_object
  CHECK (email_template IS NULL OR jsonb_typeof(email_template) = 'object');

INSERT INTO schema_migrations (version)
VALUES ('0003_workspace_email_template')
ON CONFLICT (version) DO NOTHING;

COMMIT;
