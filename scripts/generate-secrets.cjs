#!/usr/bin/env node
/**
 * Prints a fresh set of secrets for .env.local / the Vercel dashboard.
 *
 *   npm run secrets:generate
 *
 * Each value is 32 random bytes from the OS CSPRNG, hex-encoded. Never reuse a
 * value across two variables — CERT_SIGNING_KEY and JWT_SECRET in particular are
 * required to differ, so that a leaked session key cannot forge certificates.
 *
 * Rotating CERT_SIGNING_KEY invalidates the signature on every certificate ever
 * issued. Treat it as permanent.
 */

const crypto = require('crypto');

const KEYS = ['JWT_SECRET', 'CERT_SIGNING_KEY', 'IP_HASH_SALT', 'CRON_SECRET'];

for (const key of KEYS) {
  console.log(`${key}="${crypto.randomBytes(32).toString('hex')}"`);
}
