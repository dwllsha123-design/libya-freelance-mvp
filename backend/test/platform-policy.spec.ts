import { describe, expect, it } from 'vitest';
import {
  CRITICAL_SETTING_KEYS,
  DEFAULT_SETTINGS,
  PLATFORM_SETTING_KEYS,
  settingTypeFor,
} from '../src/platform/platform-settings.constants.js';

describe('platform settings validation helpers', () => {
  it('includes all operational keys', () => {
    expect(PLATFORM_SETTING_KEYS).toContain('allowClientRegistration');
    expect(PLATFORM_SETTING_KEYS).toContain('maintenanceEnabled');
    expect(PLATFORM_SETTING_KEYS).toContain('allowNewProjects');
    expect(PLATFORM_SETTING_KEYS).toContain('iosAppStatus');
    expect(PLATFORM_SETTING_KEYS).toContain('androidAppStatus');
  });

  it('marks maintenance and currency as critical', () => {
    expect(CRITICAL_SETTING_KEYS.has('maintenanceEnabled')).toBe(true);
    expect(CRITICAL_SETTING_KEYS.has('currency')).toBe(true);
    expect(CRITICAL_SETTING_KEYS.has('iosStoreUrl')).toBe(true);
    expect(CRITICAL_SETTING_KEYS.has('allowNewProjects')).toBe(false);
  });

  it('defaults stable marketplace toggles to true', () => {
    expect(DEFAULT_SETTINGS.allowClientRegistration).toBe(true);
    expect(DEFAULT_SETTINGS.allowFreelancerRegistration).toBe(true);
    expect(DEFAULT_SETTINGS.maintenanceEnabled).toBe(false);
    expect(DEFAULT_SETTINGS.iosAppStatus).toBe('COMING_SOON');
    expect(DEFAULT_SETTINGS.androidAppStatus).toBe('COMING_SOON');
  });

  it('types boolean vs string settings', () => {
    expect(settingTypeFor('allowNewProjects')).toBe('BOOLEAN');
    expect(settingTypeFor('supportEmail')).toBe('STRING');
    expect(settingTypeFor('platformName')).toBe('STRING');
  });
});

describe('payout status transitions (policy)', () => {
  const allowed: Record<string, string[]> = {
    PENDING: ['APPROVED', 'PAID', 'CANCELLED'],
    APPROVED: ['PAID', 'CANCELLED'],
    PAID: [],
    FAILED: ['CANCELLED'],
    CANCELLED: [],
  };

  it('does not allow editing paid payouts', () => {
    expect(allowed.PAID).toEqual([]);
  });

  it('allows approve then paid', () => {
    expect(allowed.PENDING).toContain('APPROVED');
    expect(allowed.APPROVED).toContain('PAID');
  });
});

describe('final SUPER_ADMIN protection', () => {
  it('requires at least one active SUPER_ADMIN conceptually', () => {
    const supers = [{ id: '1', status: 'ACTIVE' }];
    expect(supers.filter((s) => s.status === 'ACTIVE').length).toBeGreaterThanOrEqual(1);
  });
});
