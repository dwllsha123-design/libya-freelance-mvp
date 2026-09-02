import { describe, expect, it, vi } from 'vitest';
import { PlatformAppConfigService } from '../src/platform/platform-app-config.service.js';
import type { PlatformPolicyService } from '../src/platform/platform-policy.service.js';

function makeService(snapshot: unknown) {
  const policy = {
    getPublicSnapshot: vi.fn().mockResolvedValue(snapshot),
  } as unknown as PlatformPolicyService;
  return new PlatformAppConfigService(policy);
}

describe('PlatformAppConfigService', () => {
  it('returns safe COMING_SOON config without secrets or store links', async () => {
    const service = makeService({
      settings: {
        iosAppStatus: 'COMING_SOON',
        androidAppStatus: 'COMING_SOON',
        iosStoreUrl: 'https://apps.apple.com/app/id1',
        androidStoreUrl: 'https://play.google.com/store/apps/details?id=x',
        privacyPolicyUrl: 'https://libyanfreelance.ly/privacy',
        termsUrl: 'https://libyanfreelance.ly/terms',
        supportUrl: 'https://libyanfreelance.ly/help',
        iosLatestVersion: '1.0.0',
        iosMinimumSupportedVersion: '1.0.0',
        androidLatestVersion: '1.0.0',
        androidMinimumSupportedVersion: '1.0.0',
        mobileMaintenanceMessage: '',
      },
      flags: {
        MOBILE_ENABLED: false,
        MOBILE_MESSAGING: false,
        MESSAGING: true,
      },
      maintenance: {
        enabled: false,
        active: false,
        message: 'ok',
        startsAt: null,
        endsAt: null,
      },
    });

    const cfg = await service.getPublicAppConfig();

    expect(cfg.iosAppStatus).toBe('COMING_SOON');
    expect(cfg.androidAppStatus).toBe('COMING_SOON');
    expect(cfg.iosStoreUrl).toBeNull();
    expect(cfg.androidStoreUrl).toBeNull();
    expect(cfg.privacyPolicyUrl).toBe('https://libyanfreelance.ly/privacy');
    expect(cfg.featureFlags.MOBILE_ENABLED).toBe(false);
    expect(JSON.stringify(cfg)).not.toMatch(/SECRET|password|apns|fcm/i);
  });

  it('exposes store URLs only when AVAILABLE', async () => {
    const service = makeService({
      settings: {
        iosAppStatus: 'AVAILABLE',
        androidAppStatus: 'AVAILABLE',
        iosStoreUrl: 'https://apps.apple.com/app/id1',
        androidStoreUrl: 'https://play.google.com/store/apps/details?id=x',
        privacyPolicyUrl: '',
        termsUrl: '',
        supportUrl: '',
        iosLatestVersion: '1.1.0',
        iosMinimumSupportedVersion: '1.0.0',
        androidLatestVersion: '1.1.0',
        androidMinimumSupportedVersion: '1.0.0',
        mobileMaintenanceMessage: '',
      },
      flags: { MOBILE_ENABLED: true },
      maintenance: {
        enabled: false,
        active: false,
        message: 'ok',
        startsAt: null,
        endsAt: null,
      },
    });

    const cfg = await service.getPublicAppConfig();
    expect(cfg.iosStoreUrl).toContain('apps.apple.com');
    expect(cfg.androidStoreUrl).toContain('play.google.com');
  });
});
