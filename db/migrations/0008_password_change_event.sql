-- =============================================================================
--  Glint — self-service password change audit event
-- =============================================================================
--  Target      : PostgreSQL 14+
--  Idempotent  : yes. Safe to run repeatedly; the constraint is dropped and
--                recreated.
--  Applied via : npm run db:migrate
--
--  0006 added the recovery/reset lifecycle events. A logged-in issuer changing
--  their own password from profile settings is a distinct, security-relevant
--  action — kept separate from PASSWORD_RESET (token flow) and
--  PASSWORD_SET_BY_ADMIN (operator flow) so the audit trail says who did it.
-- =============================================================================

BEGIN;

ALTER TABLE auth_events DROP CONSTRAINT IF EXISTS auth_events_event_check;
ALTER TABLE auth_events
  ADD CONSTRAINT auth_events_event_check CHECK (event IN (
    'LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOCKED_OUT',
    'REGISTERED', 'TOKEN_REJECTED',
    'FORGOT_PASSWORD_REQUEST', 'PASSWORD_RESET',
    'PASSWORD_SET_BY_ADMIN', 'PASSWORD_CHANGED', 'RECOVERY_EMAIL_UPDATED',
    'ISSUER_CREATED_BY_ADMIN'
  ));

INSERT INTO schema_migrations (version)
VALUES ('0008_password_change_event')
ON CONFLICT (version) DO NOTHING;

COMMIT;
