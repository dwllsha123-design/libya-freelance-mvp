import { describe, expect, it } from 'vitest';
import { decideBootstrapAction } from '../src/auth/bootstrap-super-admin.js';
import {
  assertPasswordComplexity,
  hashPassword,
  verifyPassword,
} from '../src/auth/password.util.js';

describe('SUPER_ADMIN bootstrap decisions', () => {
  it('creates when missing and password env is set', () => {
    expect(
      decideBootstrapAction(null, { hasPasswordEnv: true, forcePassword: false }),
    ).toBe('create');
  });

  it('requires password env when account missing', () => {
    expect(
      decideBootstrapAction(null, { hasPasswordEnv: false, forcePassword: false }),
    ).toBe('needs-password-env');
  });

  it('is noop when SUPER_ADMIN already ready (no duplicate)', () => {
    expect(
      decideBootstrapAction(
        { role: 'SUPER_ADMIN', status: 'ACTIVE', emailVerified: true },
        { hasPasswordEnv: true, forcePassword: false },
      ),
    ).toBe('noop-ready');
  });

  it('upgrades existing non-super account without forcing password', () => {
    expect(
      decideBootstrapAction(
        { role: 'ADMIN', status: 'ACTIVE', emailVerified: false },
        { hasPasswordEnv: true, forcePassword: false },
      ),
    ).toBe('upgrade-role');
  });

  it('force-password only when explicitly requested', () => {
    expect(
      decideBootstrapAction(
        { role: 'SUPER_ADMIN', status: 'ACTIVE', emailVerified: true },
        { hasPasswordEnv: true, forcePassword: true },
      ),
    ).toBe('force-password');
  });
});

describe('password hashing helpers', () => {
  it('hashes and verifies with shared util (bcrypt 12)', async () => {
    const hash = await hashPassword('Password1');
    expect(hash).not.toContain('Password1');
    expect(await verifyPassword('Password1', hash)).toBe(true);
    expect(await verifyPassword('WrongPass1', hash)).toBe(false);
  });

  it('rejects weak passwords', () => {
    expect(() => assertPasswordComplexity('short')).toThrow();
    expect(() => assertPasswordComplexity('alllowercase1')).toThrow();
    expect(() => assertPasswordComplexity('Password1')).not.toThrow();
  });
});
