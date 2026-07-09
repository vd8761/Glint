-- =============================================================================
--  Glint — consolidated initial schema
-- =============================================================================
--  Target      : PostgreSQL 14+
--  Idempotent  : yes. Safe to run repeatedly; every object is guarded.
--  Applied via : npm run db:migrate  (scripts/db-migrate.ts)
--
--  This file replaces the ad-hoc db/schema.sql that shipped previously. It is
--  the single source of truth for a first-time database setup.
--
--  Notable differences from the legacy schema:
--    * users.role            — admin is a role, not a hardcoded email string.
--    * users.token_version   — lets us invalidate every JWT a user holds.
--    * certificates.signature — a real HMAC-SHA256 over the issuance facts,
--                              replacing the Math.random() "security_hash".
--    * certificate_events    — append-only audit log, replacing the unbounded
--                              audit_trail JSONB column.
--    * email_messages        — durable outbox so bulk issuance can return
--                              immediately instead of sending mail inline.
--    * auth_events           — login/lockout audit trail.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- Migration bookkeeping
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS schema_migrations (
  version    TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- Shared helpers
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_time()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_time = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- workspaces
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS workspaces (
  id               TEXT PRIMARY KEY,
  name             TEXT        NOT NULL CHECK (length(btrim(name)) > 0),
  slug             TEXT        NOT NULL UNIQUE,
  plan             TEXT        NOT NULL DEFAULT 'free'
                     CHECK (plan IN ('free', 'pro', 'enterprise')),

  -- Branding
  brand_name       TEXT        NOT NULL,
  logo_url         TEXT,
  primary_color    TEXT        NOT NULL DEFAULT '#0F172A',
  accent_color     TEXT        NOT NULL DEFAULT '#F59E0B',
  sender_name      TEXT,
  sender_email     TEXT,
  white_label      BOOLEAN     NOT NULL DEFAULT FALSE,
  footer_text      TEXT,
  custom_domain    TEXT,

  -- Ownership. Always stored lowercased so lookups are unambiguous.
  created_by_email TEXT        NOT NULL
                     CHECK (created_by_email = lower(created_by_email)),

  created_time     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_time     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workspaces_created_by_email
  ON workspaces (created_by_email);

DROP TRIGGER IF EXISTS trg_workspaces_updated_time ON workspaces;
CREATE TRIGGER trg_workspaces_updated_time
  BEFORE UPDATE ON workspaces
  FOR EACH ROW EXECUTE FUNCTION set_updated_time();

-- -----------------------------------------------------------------------------
-- users
-- -----------------------------------------------------------------------------
--  role
--    'admin'  — platform operator. Sees every workspace.
--    'issuer' — ordinary tenant user, scoped to their workspace.
--
--  token_version
--    Bumped to invalidate every JWT previously handed to this user (password
--    change, forced logout, suspected compromise). The value is embedded in
--    the token and compared on every authenticated request.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id                    TEXT PRIMARY KEY,
  email                 TEXT        NOT NULL UNIQUE
                          CHECK (email = lower(email) AND email LIKE '%@%'),
  password_hash         TEXT        NOT NULL,
  name                  TEXT        NOT NULL CHECK (length(btrim(name)) > 0),
  role                  TEXT        NOT NULL DEFAULT 'issuer'
                          CHECK (role IN ('admin', 'issuer')),
  workspace_id          TEXT        REFERENCES workspaces (id) ON DELETE SET NULL,

  token_version         INTEGER     NOT NULL DEFAULT 0,

  -- Brute-force throttling. Reset on any successful authentication.
  failed_login_attempts SMALLINT    NOT NULL DEFAULT 0 CHECK (failed_login_attempts >= 0),
  locked_until          TIMESTAMPTZ,
  last_login_at         TIMESTAMPTZ,

  created_time          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_time          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_workspace_id ON users (workspace_id);

DROP TRIGGER IF EXISTS trg_users_updated_time ON users;
CREATE TRIGGER trg_users_updated_time
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_time();

-- Exactly one platform admin is expected. This does not forbid a second one,
-- but it does make an accidental mass-promotion visible.
CREATE INDEX IF NOT EXISTS idx_users_role_admin
  ON users (role) WHERE role = 'admin';

-- -----------------------------------------------------------------------------
-- templates
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS templates (
  id                         TEXT PRIMARY KEY,
  workspace_id               TEXT        NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
  name                       TEXT        NOT NULL CHECK (length(btrim(name)) > 0),
  layout                     TEXT        NOT NULL DEFAULT 'landscape'
                               CHECK (layout IN ('landscape', 'portrait')),

  background_color           TEXT        NOT NULL DEFAULT '#ffffff',
  background_gradient        TEXT,
  background_image_url       TEXT,

  border_color               TEXT        NOT NULL DEFAULT '#000000',
  border_width               INTEGER     NOT NULL DEFAULT 2 CHECK (border_width BETWEEN 0 AND 64),
  border_radius              INTEGER     NOT NULL DEFAULT 0 CHECK (border_radius BETWEEN 0 AND 128),
  border_style               TEXT        NOT NULL DEFAULT 'solid'
                               CHECK (border_style IN ('solid', 'double', 'dashed', 'ornate', 'none')),
  decor_flourish             TEXT        NOT NULL DEFAULT 'none',

  show_seal                  BOOLEAN     NOT NULL DEFAULT TRUE,
  seal_type                  TEXT        NOT NULL DEFAULT 'classic',
  seal_width                 NUMERIC     NOT NULL DEFAULT 40,

  show_qr_code               BOOLEAN     NOT NULL DEFAULT TRUE,
  qr_code_x                  NUMERIC     NOT NULL DEFAULT 10,
  qr_code_y                  NUMERIC     NOT NULL DEFAULT 85,
  qr_code_width              NUMERIC     NOT NULL DEFAULT 32,
  qr_code_custom_url         TEXT,

  logo_url                   TEXT,
  logo_icon_type             TEXT,
  logo_x                     NUMERIC     NOT NULL DEFAULT 50,
  logo_y                     NUMERIC     NOT NULL DEFAULT 10,
  logo_width                 NUMERIC     NOT NULL DEFAULT 100,

  signature_url              TEXT,
  signature_style            TEXT,
  signature_x                NUMERIC     NOT NULL DEFAULT 50,
  signature_y                NUMERIC     NOT NULL DEFAULT 75,
  signature_width            NUMERIC     NOT NULL DEFAULT 90,
  signatory_name             TEXT,
  signatory_title            TEXT,

  show_secondary_signatory   BOOLEAN     NOT NULL DEFAULT FALSE,
  secondary_signature_url    TEXT,
  secondary_signatory_name   TEXT,
  secondary_signatory_title  TEXT,
  secondary_signature_x      NUMERIC,
  secondary_signature_y      NUMERIC,
  secondary_signature_width  NUMERIC,

  text_elements              JSONB       NOT NULL DEFAULT '[]'::jsonb
                               CHECK (jsonb_typeof(text_elements) = 'array'),

  created_time               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_time               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_templates_workspace_id ON templates (workspace_id);

DROP TRIGGER IF EXISTS trg_templates_updated_time ON templates;
CREATE TRIGGER trg_templates_updated_time
  BEFORE UPDATE ON templates
  FOR EACH ROW EXECUTE FUNCTION set_updated_time();

-- -----------------------------------------------------------------------------
-- programs
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS programs (
  id               TEXT PRIMARY KEY,
  workspace_id     TEXT        NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
  name             TEXT        NOT NULL CHECK (length(btrim(name)) > 0),
  description      TEXT,
  template_id      TEXT        REFERENCES templates (id) ON DELETE SET NULL,
  issue_date       DATE,
  expiry_date      DATE,
  status           TEXT        NOT NULL DEFAULT 'draft'
                     CHECK (status IN ('draft', 'active', 'archived')),

  -- Column names the CSV importer maps onto {{placeholders}}.
  recipient_fields JSONB       NOT NULL DEFAULT '[]'::jsonb
                     CHECK (jsonb_typeof(recipient_fields) = 'array'),

  created_time     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_time     TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT programs_dates_ordered
    CHECK (expiry_date IS NULL OR issue_date IS NULL OR expiry_date >= issue_date)
);

CREATE INDEX IF NOT EXISTS idx_programs_workspace_id ON programs (workspace_id);
CREATE INDEX IF NOT EXISTS idx_programs_template_id  ON programs (template_id);

DROP TRIGGER IF EXISTS trg_programs_updated_time ON programs;
CREATE TRIGGER trg_programs_updated_time
  BEFORE UPDATE ON programs
  FOR EACH ROW EXECUTE FUNCTION set_updated_time();

-- -----------------------------------------------------------------------------
-- certificates
-- -----------------------------------------------------------------------------
--  signature
--    Lowercase hex HMAC-SHA256 over a canonical, unit-separator-joined encoding
--    of the issuance facts (see lib/signature.ts). Keyed by CERT_SIGNING_KEY,
--    which never leaves the server. Verification recomputes and compares in
--    constant time.
--
--    The signature covers issuance facts only — NOT `status`. Revoking a
--    certificate does not invalidate its signature; revocation is a separate,
--    mutable assertion. A verifier must check BOTH.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS certificates (
  id                TEXT PRIMARY KEY CHECK (length(id) BETWEEN 8 AND 80),
  workspace_id      TEXT        NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
  program_id        TEXT        REFERENCES programs (id) ON DELETE SET NULL,

  -- Denormalised so a certificate stays readable after its program is deleted.
  program_name      TEXT        NOT NULL,

  recipient_name    TEXT        NOT NULL CHECK (length(btrim(recipient_name)) > 0),
  recipient_email   TEXT        NOT NULL
                      CHECK (recipient_email = lower(recipient_email) AND recipient_email LIKE '%@%'),

  custom_fields     JSONB       NOT NULL DEFAULT '{}'::jsonb
                      CHECK (jsonb_typeof(custom_fields) = 'object'),

  issue_date        DATE        NOT NULL,
  expiry_date       DATE,

  status            TEXT        NOT NULL DEFAULT 'valid'
                      CHECK (status IN ('valid', 'revoked', 'expired')),
  revocation_reason TEXT,

  signature         TEXT        NOT NULL CHECK (signature ~ '^[0-9a-f]{64}$'),
  signature_alg     TEXT        NOT NULL DEFAULT 'HMAC-SHA256',
  signature_version SMALLINT    NOT NULL DEFAULT 1,
  signed_at         TIMESTAMPTZ NOT NULL DEFAULT now(),

  view_count        INTEGER     NOT NULL DEFAULT 0 CHECK (view_count >= 0),
  download_count    INTEGER     NOT NULL DEFAULT 0 CHECK (download_count >= 0),
  share_count       INTEGER     NOT NULL DEFAULT 0 CHECK (share_count >= 0),
  verify_count      INTEGER     NOT NULL DEFAULT 0 CHECK (verify_count >= 0),
  last_viewed       TIMESTAMPTZ,

  created_time      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_time      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT certificates_dates_ordered
    CHECK (expiry_date IS NULL OR expiry_date >= issue_date),
  CONSTRAINT certificates_revocation_reason_present
    CHECK (status <> 'revoked' OR revocation_reason IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_certificates_workspace_id ON certificates (workspace_id);
CREATE INDEX IF NOT EXISTS idx_certificates_program_id   ON certificates (program_id);
CREATE INDEX IF NOT EXISTS idx_certificates_recipient    ON certificates (recipient_email);
CREATE INDEX IF NOT EXISTS idx_certificates_issue_date   ON certificates (issue_date);

-- Guards against double-issuing the same program to the same person, which is
-- what happens when a bulk import is retried after a timeout. Revoked rows are
-- excluded so a certificate can be legitimately reissued after revocation.
CREATE UNIQUE INDEX IF NOT EXISTS uq_certificates_program_recipient
  ON certificates (program_id, recipient_email)
  WHERE status <> 'revoked';

DROP TRIGGER IF EXISTS trg_certificates_updated_time ON certificates;
CREATE TRIGGER trg_certificates_updated_time
  BEFORE UPDATE ON certificates
  FOR EACH ROW EXECUTE FUNCTION set_updated_time();

-- -----------------------------------------------------------------------------
-- certificate_events  (append-only audit log)
-- -----------------------------------------------------------------------------
--  Replaces the certificates.audit_trail JSONB column, which grew without
--  bound on every public download and verification.
--
--  actor_ip_hash is HMAC(IP_HASH_SALT, ip) — enough to spot abuse from a single
--  source, not enough to recover the address.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS certificate_events (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  certificate_id TEXT        NOT NULL REFERENCES certificates (id) ON DELETE CASCADE,
  event          TEXT        NOT NULL CHECK (event IN (
                   'CREATED', 'ISSUED', 'EMAIL_QUEUED', 'EMAIL_DISPATCHED',
                   'EMAIL_FAILED', 'VERIFIED', 'REVOKED', 'RESTORED',
                   'VIEWED', 'DOWNLOADED', 'SHARED', 'METADATA_UPDATED'
                 )),
  performed_by   TEXT        NOT NULL DEFAULT 'system',
  details        TEXT,
  actor_ip_hash  TEXT,
  is_public      BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_certificate_events_cert
  ON certificate_events (certificate_id, created_at DESC);

-- Supports the "has this IP verified this certificate in the last hour?"
-- de-duplication check that stops the audit log from being spammed.
CREATE INDEX IF NOT EXISTS idx_certificate_events_verify_dedupe
  ON certificate_events (certificate_id, actor_ip_hash, created_at DESC)
  WHERE event = 'VERIFIED';

-- -----------------------------------------------------------------------------
-- email_messages  (durable outbox + delivery log, one table)
-- -----------------------------------------------------------------------------
--  Bulk issuance writes rows here inside the issuance transaction and returns
--  immediately. A separate drain worker claims rows with FOR UPDATE SKIP LOCKED
--  and hands them to the mail transport, with capped exponential backoff.
--
--  'simulated' is a terminal state used when no SMTP transport is configured,
--  so local development never silently looks like a successful send.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS email_messages (
  id                  TEXT PRIMARY KEY,
  workspace_id        TEXT        NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
  program_id          TEXT        REFERENCES programs (id) ON DELETE SET NULL,
  certificate_id      TEXT        REFERENCES certificates (id) ON DELETE CASCADE,

  recipient_email     TEXT        NOT NULL,
  recipient_name      TEXT        NOT NULL,
  -- Denormalised: the HTML body is rendered at send time, which may be long
  -- after the program row was renamed or deleted.
  program_name        TEXT        NOT NULL DEFAULT '',
  subject             TEXT        NOT NULL,
  body                TEXT        NOT NULL,
  verification_url    TEXT,

  kind                TEXT        NOT NULL DEFAULT 'issuance'
                        CHECK (kind IN ('issuance', 'resend')),
  status              TEXT        NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'sending', 'sent', 'failed', 'simulated')),

  attempts            SMALLINT    NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  max_attempts        SMALLINT    NOT NULL DEFAULT 5 CHECK (max_attempts > 0),
  next_attempt_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  locked_at           TIMESTAMPTZ,
  locked_by           TEXT,
  last_error          TEXT,
  provider_message_id TEXT,

  created_time        TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_time           TIMESTAMPTZ,

  CONSTRAINT email_messages_sent_has_time
    CHECK (status <> 'sent' OR sent_time IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_email_messages_workspace
  ON email_messages (workspace_id, created_time DESC);
CREATE INDEX IF NOT EXISTS idx_email_messages_certificate
  ON email_messages (certificate_id);

-- The drain worker's hot path.
CREATE INDEX IF NOT EXISTS idx_email_messages_claimable
  ON email_messages (next_attempt_at)
  WHERE status IN ('pending', 'sending');

-- -----------------------------------------------------------------------------
-- auth_events  (authentication audit trail)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auth_events (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email         TEXT        NOT NULL,
  user_id       TEXT,
  event         TEXT        NOT NULL CHECK (event IN (
                  'LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOCKED_OUT',
                  'REGISTERED', 'TOKEN_REJECTED'
                )),
  actor_ip_hash TEXT,
  user_agent    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auth_events_email ON auth_events (email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_events_time  ON auth_events (created_at DESC);

-- -----------------------------------------------------------------------------
-- Done
-- -----------------------------------------------------------------------------
INSERT INTO schema_migrations (version)
VALUES ('0001_init')
ON CONFLICT (version) DO NOTHING;

COMMIT;
