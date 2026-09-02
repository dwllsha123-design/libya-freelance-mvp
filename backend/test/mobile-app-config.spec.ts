import { describe, expect, it } from 'vitest';
import {
  assertSafeHttpsUrl,
  isAppStoreStatus,
} from '../src/platform/mobile-app.constants.js';
import { MOBILE_FEATURE_FLAGS, DEFAULT_SETTINGS } from '../src/platform/platform-settings.constants.js';

describe('mobile app config helpers', () => {
  it('accepts known store statuses', () => {
    expect(isAppStoreStatus('COMING_SOON')).toBe(true);
    expect(isAppStoreStatus('AVAILABLE')).toBe(true);
    expect(isAppStoreStatus('nope')).toBe(false);
  });

  it('defaults both stores to COMING_SOON', () => {
    expect(DEFAULT_SETTINGS.iosAppStatus).toBe('COMING_SOON');
    expect(DEFAULT_SETTINGS.androidAppStatus).toBe('COMING_SOON');
  });

  it('keeps mobile feature flags listed and initially off by convention', () => {
    expect(MOBILE_FEATURE_FLAGS).toContain('MOBILE_ENABLED');
    expect(MOBILE_FEATURE_FLAGS).toContain('MOBILE_AI_MATCHING');
  });

  it('accepts https URLs and empty', () => {
    expect(assertSafeHttpsUrl('', 'iosStoreUrl')).toBeNull();
    expect(assertSafeHttpsUrl(null, 'iosStoreUrl')).toBeNull();
    expect(assertSafeHttpsUrl('https://apps.apple.com/app/id1', 'iosStoreUrl')).toBe(
      'https://apps.apple.com/app/id1',
    );
  });

  it('rejects non-https and invalid URLs', () => {
    expect(() => assertSafeHttpsUrl('http://evil.example', 'iosStoreUrl')).toThrow(
      /https/,
    );
    expect(() => assertSafeHttpsUrl('not-a-url', 'iosStoreUrl')).toThrow(/valid URL/);
  });
});
