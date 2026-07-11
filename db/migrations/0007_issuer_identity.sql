-- =============================================================================
--  Glint — issuer identity snapshot on certificates
-- =============================================================================
--  Target      : PostgreSQL 14+
--  Idempotent  : yes. Safe to run repeatedly; every object is guarded.
--  Applied via : npm run db:migrate
--
--  The public certificate page attributes each credential to the issuing
--  organization ("Issued by X"). That name used to be a LIVE lookup of
--  workspaces.brand_name, so renaming the organization silently rewrote the
--  attribution on every certificate ever issued — including ones printed,
--  shared, and verified under the old name.
--
--  certificates.issuer_name freezes the organization name AS IT WAS at issue
--  time. New certificates capture the current name; already-issued ones keep
--  the name they were issued under. A rename in the profile settings therefore
--  only affects certificates issued after it.
--
--  Existing rows are backfilled with their workspace's current brand name, so
--  the change is invisible until the first rename.
-- =============================================================================

BEGIN;

ALTER TABLE certificates ADD COLUMN IF NOT EXISTS issuer_name TEXT;

-- Freeze every existing certificate at its workspace's current brand name.
-- NULLIF guards against a blank brand_name; 'Glint' is the same last-resort
-- fallback the application uses.
UPDATE certificates c
   SET issuer_name = COALESCE(
     NULLIF((SELECT w.brand_name FROM workspaces w WHERE w.id = c.workspace_id), ''),
     'Glint'
   )
 WHERE c.issuer_name IS NULL;

INSERT INTO schema_migrations (version)
VALUES ('0007_issuer_identity')
ON CONFLICT (version) DO NOTHING;

COMMIT;
