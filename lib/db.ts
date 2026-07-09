/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import pg from 'pg';
import { env } from './env.js';
import { logger } from './logger.js';

const { Pool } = pg;

/**
 * Return `DATE` columns as the literal 'YYYY-MM-DD' string the database holds.
 *
 * By default node-postgres parses OID 1082 into a JS Date at *local* midnight.
 * Every call site then did `row.issue_date.toISOString().split('T')[0]` — which
 * converts to UTC first. East of Greenwich that lands on the previous day: in
 * Asia/Kolkata (+05:30), the date 2026-07-08 round-trips to '2026-07-07'.
 * Certificates were being issued, displayed, and signed with the wrong date.
 *
 * A DATE has no timezone. Never give it one.
 */
pg.types.setTypeParser(1082, (value: string) => value);

/**
 * Serverless functions each hold their own pool. Under Fluid Compute the
 * instance is reused across concurrent requests, so a small pool per instance
 * is right — but a large one multiplied by the instance count will exhaust a
 * managed Postgres connection limit (Neon's free tier caps at 100 across all
 * consumers). Keep `max` low in serverless and let the platform scale out.
 *
 * `sslmode` is read from the connection string by pg-connection-string, so a
 * `?sslmode=require` suffix is sufficient for managed providers; no extra
 * `ssl` option is needed here.
 */
export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: env.isServerless ? 2 : env.DATABASE_POOL_MAX,
  idleTimeoutMillis: env.isServerless ? 10_000 : 30_000,
  connectionTimeoutMillis: 10_000,
  // Recycle connections so a long-lived instance never pins a stale backend.
  maxLifetimeSeconds: 1_800,
});

// An idle client that errors (network blip, server restart, provider failover)
// emits on the pool. Without a listener this is an unhandled 'error' event and
// takes the whole process down.
pool.on('error', (err) => {
  logger.error('Unexpected error on idle PostgreSQL client', err);
});

/** Rolls back without letting a failed ROLLBACK mask the original error. */
export async function safeRollback(client: pg.PoolClient | undefined): Promise<void> {
  if (!client) return;
  try {
    await client.query('ROLLBACK');
  } catch (err) {
    logger.error('Failed to roll back transaction', err);
  }
}

/** Runs `fn` inside a transaction, committing on success and rolling back on throw. */
export async function withTransaction<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await safeRollback(client);
    throw err;
  } finally {
    client.release();
  }
}

/** Postgres unique-violation. */
export const UNIQUE_VIOLATION = '23505';
