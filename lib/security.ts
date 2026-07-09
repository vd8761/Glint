/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Certificate signing, identifier generation, and privacy helpers.
 *
 * ── What changed and why ─────────────────────────────────────────────────────
 * The previous implementation stored:
 *
 *   `sha256:${Math.random().toString(16).substring(2, 10)}_security_seal_${id}`
 *
 * That is not SHA-256, not a signature, and not derived from the certificate's
 * contents. Nothing verified it. The public /verify endpoint appended an audit
 * row and unconditionally returned `verified: true` — including for revoked
 * certificates. The UI called this "tamper-proof".
 *
 * It is now a real HMAC-SHA256 over a canonical encoding of the issuance facts,
 * keyed by CERT_SIGNING_KEY, compared in constant time.
 *
 * ── What this does and does not prove ────────────────────────────────────────
 * It DOES prove: this certificate's recipient, program, and dates are exactly
 * what Glint issued, and nobody has altered the row in the database.
 *
 * It does NOT prove anything to a third party who lacks the key. It is a
 * symmetric MAC, so only Glint can verify. Publicly-verifiable credentials
 * would need asymmetric signatures (Ed25519) and a published public key.
 * That is a larger change; this is the honest, correct version of what the
 * schema already claimed to be.
 */

import crypto from 'crypto';
import { env } from './env.js';

export const SIGNATURE_VERSION = 1;
export const SIGNATURE_ALG = 'HMAC-SHA256';

const signingKey = Buffer.from(env.CERT_SIGNING_KEY, 'utf8');
const ipHashKey = Buffer.from(env.IP_HASH_SALT, 'utf8');

/** The facts a signature commits to. Deliberately excludes mutable state. */
export interface SignableCertificate {
  id: string;
  workspaceId: string;
  programId: string | null;
  programName: string;
  recipientName: string;
  recipientEmail: string;
  /** YYYY-MM-DD */
  issueDate: string;
  /** YYYY-MM-DD, or null */
  expiryDate: string | null;
}

/**
 * Canonical byte encoding of the signed facts.
 *
 * Fields are joined with U+001F (unit separator), a character that cannot occur
 * in any of the inputs. Using a delimiter that the inputs could contain — a
 * comma, a pipe — would let an attacker shift bytes across field boundaries and
 * produce two different certificates with identical canonical forms.
 *
 * The version prefix means a future encoding change cannot be replayed against
 * signatures produced by this one.
 */
const UNIT_SEPARATOR = '\u001f';

function canonicalize(cert: SignableCertificate): string {
  return [
    `v${SIGNATURE_VERSION}`,
    cert.id,
    cert.workspaceId,
    cert.programId ?? '',
    cert.programName.trim(),
    cert.recipientName.trim(),
    cert.recipientEmail.trim().toLowerCase(),
    cert.issueDate,
    cert.expiryDate ?? '',
  ].join(UNIT_SEPARATOR);
}

/** Returns a lowercase hex HMAC-SHA256. Always 64 characters. */
export function signCertificate(cert: SignableCertificate): string {
  return crypto.createHmac('sha256', signingKey).update(canonicalize(cert), 'utf8').digest('hex');
}

const HEX_64 = /^[0-9a-f]{64}$/;

/**
 * Constant-time signature check.
 *
 * `Buffer.from(str, 'hex')` silently truncates on invalid input rather than
 * throwing, so the shape is validated before any comparison. `timingSafeEqual`
 * itself throws on length mismatch, which is why the lengths are equal by
 * construction here.
 */
export function verifyCertificateSignature(
  cert: SignableCertificate,
  storedSignature: string,
): boolean {
  if (typeof storedSignature !== 'string' || !HEX_64.test(storedSignature)) return false;
  const expected = Buffer.from(signCertificate(cert), 'hex');
  const provided = Buffer.from(storedSignature, 'hex');
  if (expected.length !== provided.length) return false;
  return crypto.timingSafeEqual(expected, provided);
}

/**
 * Public certificate identifier: `GLNT-XXXXX-XXXXX-XXXXX-XXXXX`.
 *
 * 80 bits of entropy from a CSPRNG. The old sequential `CERT-2026-1000` scheme
 * let anyone enumerate every certificate in the registry by incrementing a
 * counter, and the verification page is public by design.
 */
export function newCertificateId(): string {
  const hex = crypto.randomBytes(10).toString('hex').toUpperCase();
  const groups = hex.match(/.{1,5}/g) ?? [];
  return `GLNT-${groups.join('-')}`;
}

/** Prefixed, collision-resistant identifiers for internal rows. */
export function newId(prefix: string): string {
  return `${prefix}-${crypto.randomBytes(9).toString('base64url')}`;
}

/**
 * One-way, salted hash of a client IP, truncated to 128 bits.
 *
 * Enough to recognise "the same source hit this endpoint 400 times", not enough
 * to recover the address. An unsalted hash of an IPv4 address is trivially
 * reversible — the entire space is 2^32.
 */
export function hashIp(ip: string | undefined | null): string | null {
  if (!ip) return null;
  return crypto.createHmac('sha256', ipHashKey).update(ip, 'utf8').digest('hex').slice(0, 32);
}

/** `jane.doe@example.com` → `j******e@example.com`. For public responses. */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf('@');
  if (at <= 0) return '***';
  const local = email.slice(0, at);
  const domain = email.slice(at);
  if (local.length <= 2) return `${local[0]}***${domain}`;
  return `${local[0]}${'*'.repeat(Math.min(local.length - 2, 8))}${local.at(-1)}${domain}`;
}

/** Constant-time comparison of two secrets of arbitrary length. */
export function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  // Hash first so differing lengths do not leak via an early return, and so
  // timingSafeEqual always receives equal-length buffers.
  const hashA = crypto.createHash('sha256').update(bufA).digest();
  const hashB = crypto.createHash('sha256').update(bufB).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

/**
 * A certificate is "verified" only when the signature is intact AND the
 * registry still asserts it is valid AND it has not expired. The old endpoint
 * checked none of these and always returned true.
 */
export type VerificationFailure = 'signature_invalid' | 'revoked' | 'expired';

export function evaluateCertificate(
  cert: SignableCertificate & { status: string; signature: string },
  now: Date = new Date(),
): { verified: boolean; signatureValid: boolean; reasons: VerificationFailure[] } {
  const reasons: VerificationFailure[] = [];

  const signatureValid = verifyCertificateSignature(cert, cert.signature);
  if (!signatureValid) reasons.push('signature_invalid');

  if (cert.status === 'revoked') reasons.push('revoked');

  if (cert.expiryDate) {
    // Compare dates, not instants: a certificate expiring 2026-07-08 is valid
    // for the whole of that day in every timezone the holder might be in.
    const expiry = new Date(`${cert.expiryDate}T23:59:59.999Z`);
    if (now > expiry) reasons.push('expired');
  }

  return { verified: reasons.length === 0, signatureValid, reasons };
}
