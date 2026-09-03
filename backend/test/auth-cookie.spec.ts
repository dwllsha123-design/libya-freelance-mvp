import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  REFRESH_COOKIE,
  getRefreshCookieOptions,
} from '../src/auth/auth-cookie.util.js';

const COOKIE_KEYS = [
  'NODE_ENV',
  'AUTH_COOKIE_SAME_SITE',
  'AUTH_COOKIE_DOMAIN',
  'JWT_REFRESH_EXPIRES_IN',
] as const;

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

describe('refresh cookie policy', () => {
  let saved: Record<string, string | undefined>;

  beforeEach(() => {
    saved = {};
    for (const key of COOKIE_KEYS) {
      saved[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of COOKIE_KEYS) {
      if (saved[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = saved[key];
      }
    }
  });

  it('is named refresh_token and scoped to the auth routes only', () => {
    expect(REFRESH_COOKIE).toBe('refresh_token');
    expect(getRefreshCookieOptions().path).toBe('/api/auth');
  });

  it('is httpOnly and Secure in production', () => {
    process.env.NODE_ENV = 'production';

    const options = getRefreshCookieOptions();

    expect(options.httpOnly).toBe(true);
    expect(options.secure).toBe(true);
  });

  it('stays host-only unless AUTH_COOKIE_DOMAIN is explicitly set', () => {
    process.env.NODE_ENV = 'production';
    expect(getRefreshCookieOptions().domain).toBeUndefined();

    process.env.AUTH_COOKIE_DOMAIN = '.libyanfreelance.ly';
    expect(getRefreshCookieOptions().domain).toBe('.libyanfreelance.ly');
  });

  it('honours AUTH_COOKIE_SAME_SITE and ignores invalid values', () => {
    process.env.NODE_ENV = 'production';

    process.env.AUTH_COOKIE_SAME_SITE = 'lax';
    expect(getRefreshCookieOptions().sameSite).toBe('lax');

    process.env.AUTH_COOKIE_SAME_SITE = 'None';
    expect(getRefreshCookieOptions().sameSite).toBe('none');

    // An unrecognised value must never silently weaken the policy.
    process.env.AUTH_COOKIE_SAME_SITE = 'laxx';
    expect(getRefreshCookieOptions().sameSite).toBe('strict');
  });

  it('forces Secure when SameSite=None even outside production', () => {
    process.env.NODE_ENV = 'development';
    process.env.AUTH_COOKIE_SAME_SITE = 'none';

    const options = getRefreshCookieOptions();

    expect(options.sameSite).toBe('none');
    expect(options.secure).toBe(true);
  });

  it('tracks the refresh token TTL for maxAge', () => {
    expect(getRefreshCookieOptions().maxAge).toBe(SEVEN_DAYS_MS);

    process.env.JWT_REFRESH_EXPIRES_IN = '30d';
    expect(getRefreshCookieOptions().maxAge).toBe(30 * 24 * 60 * 60 * 1000);

    process.env.JWT_REFRESH_EXPIRES_IN = 'not-a-duration';
    expect(getRefreshCookieOptions().maxAge).toBe(SEVEN_DAYS_MS);
  });
});
