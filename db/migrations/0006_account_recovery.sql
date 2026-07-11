-- =============================================================================
--  Glint — account recovery & security (super_admin, recovery email, reset tokens)
-- =============================================================================
--  Target      : PostgreSQL 14+
--  Idempotent  : yes. Safe to run repeatedly; every object is guarded.
--  Applied via : npm run db:migrate
--
--  Three capabilities land here:
--    * A 'super_admin' tier above 'admin'. The single platform operator that
--      0001 seeded as 'admin' is promoted so there is a working super admin that
--      can reset any issuer's password.
--    * users.recovery_email — an alternate address an issuer can use to start a
--      "forgot password" flow, stored lowercased like users.email.
--    * password_reset_tokens — single-use, expiring, HASHED reset tokens. The
--      raw token is emailed and never stored; only its SHA-256 hash lives here,
--      so a database leak cannot be replayed into an account takeover.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- users.role — admit 'super_admin'
-- -----------------------------------------------------------------------------
-- 0001 defined the CHECK inline, so Postgres named it users_role_check.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users
  ADD CONSTRAINT users_role_check CHECK (role IN ('super_admin', 'admin', 'issuer'));

-- -----------------------------------------------------------------------------
-- users.recovery_email — nullable, stored lowercased when set
-- -----------------------------------------------------------------------------
ALTER TABLE users ADD COLUMN IF NOT EXISTS recovery_email TEXT;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_recovery_email_check;
ALTER TABLE users
  ADD CONSTRAINT users_recovery_email_check
  CHECK (recovery_email IS NULL OR (recovery_email = lower(recovery_email) AND recovery_email LIKE '%@%'));

-- Lets forgot-password resolve an account by its recovery address.
CREATE INDEX IF NOT EXISTS idx_users_recovery_email ON users (recovery_email);

-- -----------------------------------------------------------------------------
-- Promote the seeded platform admin to super_admin
-- -----------------------------------------------------------------------------
-- 0001 expects exactly one 'admin'. Promote it so the deployment retains a
-- working top-tier operator. If none exists this is simply a no-op.
UPDATE users SET role = 'super_admin' WHERE role = 'admin';

-- Parity with the idx_users_role_admin invariant index: exactly one super admin
-- is expected, and an accidental mass-promotion should be visible.
CREATE INDEX IF NOT EXISTS idx_users_role_super_admin
  ON users (role) WHERE role = 'super_admin';

-- -----------------------------------------------------------------------------
-- password_reset_tokens
-- -----------------------------------------------------------------------------
--  token_hash — SHA-256 hex of the raw token. The raw token is delivered by
--  email and NEVER persisted; a leak of this table cannot be replayed.
--  used_at    — set the moment a token is consumed, making every token single
--               use. A row is valid only while used_at IS NULL AND now() < expires_at.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id          TEXT PRIMARY KEY,
  user_id     TEXT        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token_hash  TEXT        NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user
  ON password_reset_tokens (user_id);

-- The lookup path for reset-password: find the row by the hash of the presented
-- token. A hash lookup, never a raw-token lookup.
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_hash
  ON password_reset_tokens (token_hash);

-- -----------------------------------------------------------------------------
-- auth_events — admit the recovery lifecycle events
-- -----------------------------------------------------------------------------
--  The forgot/reset/admin-set-password flows are security-relevant and belong
--  in the same audit trail as logins. FORGOT_PASSWORD_REQUEST is logged for an
--  existing account only — never for a miss, which would reintroduce the
--  enumeration oracle the uniform HTTP response is designed to close.
ALTER TABLE auth_events DROP CONSTRAINT IF EXISTS auth_events_event_check;
ALTER TABLE auth_events
  ADD CONSTRAINT auth_events_event_check CHECK (event IN (
    'LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOCKED_OUT',
    'REGISTERED', 'TOKEN_REJECTED',
    'FORGOT_PASSWORD_REQUEST', 'PASSWORD_RESET',
    'PASSWORD_SET_BY_ADMIN', 'RECOVERY_EMAIL_UPDATED',
    'ISSUER_CREATED_BY_ADMIN'
  ));

INSERT INTO schema_migrations (version)
VALUES ('0006_account_recovery')
ON CONFLICT (version) DO NOTHING;

COMMIT;
