/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { verifyResendSignature } from './resendWebhook.js';

/**
 * The canonical Svix example vector (from Svix's own verification docs, the
 * scheme Resend uses). Verifying against it proves our hand-rolled HMAC matches
 * a real signer rather than merely agreeing with itself.
 */
const SECRET = 'whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw';
const ID = 'msg_p5jXN8AQM9LWM0D4loKWxJek';
const TIMESTAMP = '1614265330';
const BODY = '{"test": 2432232314}';
const SIGNATURE = 'v1,g0hM9SsE+OTPJTGt/tmIKtSyZlE3uFJELVlNIOLJ1OE=';

const headers = (overrides: Partial<{ id: string; timestamp: string; signature: string }> = {}) => ({
  id: ID,
  timestamp: TIMESTAMP,
  signature: SIGNATURE,
  ...overrides,
});

describe('verifyResendSignature', () => {
  afterEach(() => vi.useRealTimers());

  // The vector's timestamp is from 2021; pin "now" to it so the replay window check passes.
  const atSigningTime = () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(Number(TIMESTAMP) * 1000));
  };

  it('accepts a valid signature (known Svix vector)', () => {
    atSigningTime();
    expect(verifyResendSignature(BODY, headers(), SECRET)).toBe(true);
  });

  it('accepts when the header carries several space-separated signatures', () => {
    atSigningTime();
    expect(
      verifyResendSignature(BODY, headers({ signature: `v1,aaaa ${SIGNATURE}` }), SECRET),
    ).toBe(true);
  });

  it('rejects a body that has been altered by a single byte', () => {
    atSigningTime();
    expect(verifyResendSignature(`${BODY} `, headers(), SECRET)).toBe(false);
  });

  it('rejects a signature made with a different secret', () => {
    atSigningTime();
    const other = `whsec_${Buffer.from('a different signing key here').toString('base64')}`;
    expect(verifyResendSignature(BODY, headers(), other)).toBe(false);
  });

  it('rejects a stale timestamp as a replay', () => {
    // Real "now" is years after the vector's timestamp — outside the tolerance.
    expect(verifyResendSignature(BODY, headers(), SECRET)).toBe(false);
  });

  it('rejects when any Svix header is missing', () => {
    atSigningTime();
    expect(verifyResendSignature(BODY, headers({ signature: undefined as any }), SECRET)).toBe(false);
    expect(verifyResendSignature(BODY, headers({ id: undefined as any }), SECRET)).toBe(false);
    expect(verifyResendSignature(BODY, headers({ timestamp: undefined as any }), SECRET)).toBe(false);
  });
});
