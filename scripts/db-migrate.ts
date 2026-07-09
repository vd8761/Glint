/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Applies every un-applied migration in db/migrations, in filename order.
 *
 *   npm run db:migrate
 *
 * Each .sql file wraps itself in BEGIN/COMMIT and records its own version in
 * schema_migrations, so a partially-applied migration is impossible: it either
 * lands whole or not at all.
 *
 * If the target database does not exist yet, it is created first — connecting to
 * the maintenance `postgres` database on the same server to do so.
 */

import fs from 'fs';
import path from 'path';
import pg from 'pg';
import '../lib/env.js';
import { env } from '../lib/env.js';

const MIGRATIONS_DIR = path.join(process.cwd(), 'db', 'migrations');

/** `postgresql://user:pass@host:port/dbname` → the dbname, and the same URL pointed at `postgres`. */
function splitConnectionString(url: string): { database: string; maintenanceUrl: string } {
  const parsed = new URL(url);
  const database = decodeURIComponent(parsed.pathname.replace(/^\//, ''));
  parsed.pathname = '/postgres';
  return { database, maintenanceUrl: parsed.toString() };
}

async function ensureDatabaseExists(): Promise<void> {
  const { database, maintenanceUrl } = splitConnectionString(env.DATABASE_URL);

  const probe = new pg.Client({ connectionString: env.DATABASE_URL });
  try {
    await probe.connect();
    await probe.end();
    return;
  } catch (err) {
    if ((err as any).code !== '3D000') throw err; // 3D000 = invalid_catalog_name
  }

  console.log(`  database "${database}" does not exist — creating it`);
  const admin = new pg.Client({ connectionString: maintenanceUrl });
  await admin.connect();
  try {
    // Identifiers cannot be parameterised. The name comes from our own
    // DATABASE_URL, but quote it properly rather than interpolating raw.
    await admin.query(`CREATE DATABASE "${database.replace(/"/g, '""')}"`);
  } finally {
    await admin.end();
  }
}

async function main(): Promise<void> {
  await ensureDatabaseExists();

  const client = new pg.Client({ connectionString: env.DATABASE_URL });
  await client.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version    TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    const applied = new Set(
      (await client.query<{ version: string }>('SELECT version FROM schema_migrations')).rows.map((r) => r.version),
    );

    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    if (files.length === 0) {
      console.log('  no migrations found');
      return;
    }

    let ran = 0;
    for (const file of files) {
      const version = file.replace(/\.sql$/, '');
      if (applied.has(version)) {
        console.log(`  ${version} — already applied`);
        continue;
      }
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      console.log(`  ${version} — applying`);
      await client.query(sql);
      ran += 1;
    }

    console.log(ran === 0 ? '\n  Database is up to date.\n' : `\n  Applied ${ran} migration(s).\n`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('\n  Migration failed:', err.message ?? err, '\n');
  process.exit(1);
});
