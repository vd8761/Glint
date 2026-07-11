import { describe, expect, it } from 'vitest';
import {
  generateResetToken,
  hashToken,
  isAdminRole,
  isSuperAdminRole,
} from './security';

describe('role helpers', () => {
  it('isAdminRole admits admin and super_admin, rejects issuer', () => {
    expect(isAdminRole('admin')).toBe(true);
    expect(isAdminRole('super_admin')).toBe(true);
    expect(isAdminRole('issuer')).toBe(false);
    expect(isAdminRole(undefined)).toBe(false);
    expect(isAdminRole(null)).toBe(false);
    expect(isAdminRole('')).toBe(false);
  });

  it('isSuperAdminRole admits only super_admin', () => {
    expect(isSuperAdminRole('super_admin')).toBe(true);
    expect(isSuperAdminRole('admin')).toBe(false);
    expect(isSuperAdminRole('issuer')).toBe(false);
    expect(isSuperAdminRole(undefined)).toBe(false);
  });
});

describe('reset token helpers', () => {
  it('hashToken is deterministic, 64-hex, and not the raw token', () => {
    const raw = 'abc123';
    const h = hashToken(raw);
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(h).toBe(hashToken(raw));
    expect(h).not.toBe(raw);
  });

  it('hashToken differs for different inputs', () => {
    expect(hashToken('a')).not.toBe(hashToken('b'));
  });

  it('generateResetToken returns a 64-hex raw token whose hash matches hashToken', () => {
    const { token, tokenHash } = generateResetToken();
    expect(token).toMatch(/^[0-9a-f]{64}$/); // 32 random bytes
    expect(tokenHash).toBe(hashToken(token));
    expect(tokenHash).not.toBe(token);
  });

  it('generateResetToken is unpredictable between calls', () => {
    const a = generateResetToken();
    const b = generateResetToken();
    expect(a.token).not.toBe(b.token);
    expect(a.tokenHash).not.toBe(b.tokenHash);
  });
});
