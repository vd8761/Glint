-- =============================================================================
--  Glint — per-IP dedupe index for public view/download counters
-- =============================================================================
--  Target      : PostgreSQL 14+
--  Idempotent  : yes.
--  Applied via : npm run db:migrate
--
--  POST /api/certificates/:id/stats now checks "has this IP already been
--  counted for this certificate in the last hour?" before bumping
--  view_count/download_count, the same way the VERIFIED dedupe check already
--  did. Without an index that check is a sequential scan of the whole
--  certificate_events table on every page view.
-- =============================================================================

BEGIN;

CREATE INDEX IF NOT EXISTS idx_certificate_events_view_download_dedupe
  ON certificate_events (certificate_id, event, actor_ip_hash, created_at DESC)
  WHERE event IN ('VIEWED', 'DOWNLOADED');

INSERT INTO schema_migrations (version)
VALUES ('0005_view_download_dedupe_index')
ON CONFLICT (version) DO NOTHING;

COMMIT;
