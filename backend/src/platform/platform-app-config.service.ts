import { Injectable } from '@nestjs/common';
import { PlatformPolicyService } from './platform-policy.service.js';
import {
  ALL_FEATURE_FLAGS,
  MOBILE_FEATURE_FLAGS,
  DEFAULT_SETTINGS,
  type FeatureFlagKey,
} from './platform-settings.constants.js';
import {
  DEFAULT_APP_STORE_STATUS,
  isAppStoreStatus,
  type AppStoreStatus,
} from './mobile-app.constants.js';

export interface PublicAppConfig {
  maintenanceMode: boolean;
  maintenanceMessage: string;
  mobileMaintenanceMessage: string;
  minimumSupportedIosVersion: string | null;
  latestIosVersion: string | null;
  minimumSupportedAndroidVersion: string | null;
  latestAndroidVersion: string | null;
  iosAppStatus: AppStoreStatus;
  androidAppStatus: AppStoreStatus;
  iosStoreUrl: string | null;
  androidStoreUrl: string | null;
  supportUrl: string | null;
  privacyPolicyUrl: string | null;
  termsUrl: string | null;
  featureFlags: Record<string, boolean>;
}

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const t = value.trim();
  return t ? t : null;
}

function asStatus(value: unknown, fallback: AppStoreStatus): AppStoreStatus {
  return isAppStoreStatus(value) ? value : fallback;
}

@Injectable()
export class PlatformAppConfigService {
  constructor(private readonly policy: PlatformPolicyService) {}

  /**
   * Safe public mobile/web bootstrap config — no secrets.
   * Served at GET /api/platform/app-config and GET /api/v1/app-config.
   */
  async getPublicAppConfig(): Promise<PublicAppConfig> {
    const snap = await this.policy.getPublicSnapshot();
    const s = snap.settings;
    const maintenance = snap.maintenance;

    const featureFlags: Record<string, boolean> = {};
    for (const key of ALL_FEATURE_FLAGS) {
      featureFlags[key] = Boolean(snap.flags[key]);
    }
    // Explicit mobile gates (also present in featureFlags)
    for (const key of MOBILE_FEATURE_FLAGS) {
      featureFlags[key] = Boolean(snap.flags[key as FeatureFlagKey]);
    }

    const iosStatus = asStatus(
      s.iosAppStatus ?? DEFAULT_SETTINGS.iosAppStatus,
      DEFAULT_APP_STORE_STATUS,
    );
    const androidStatus = asStatus(
      s.androidAppStatus ?? DEFAULT_SETTINGS.androidAppStatus,
      DEFAULT_APP_STORE_STATUS,
    );

    const iosStoreUrl = asNonEmptyString(s.iosStoreUrl);
    const androidStoreUrl = asNonEmptyString(s.androidStoreUrl);

    return {
      maintenanceMode: Boolean(maintenance.active),
      maintenanceMessage: maintenance.message,
      mobileMaintenanceMessage:
        asNonEmptyString(s.mobileMaintenanceMessage) ?? '',
      minimumSupportedIosVersion: asNonEmptyString(s.iosMinimumSupportedVersion),
      latestIosVersion: asNonEmptyString(s.iosLatestVersion),
      minimumSupportedAndroidVersion: asNonEmptyString(
        s.androidMinimumSupportedVersion,
      ),
      latestAndroidVersion: asNonEmptyString(s.androidLatestVersion),
      iosAppStatus: iosStatus,
      androidAppStatus: androidStatus,
      // Only expose store URLs when status allows linking
      iosStoreUrl:
        iosStatus === 'AVAILABLE' || iosStatus === 'BETA' ? iosStoreUrl : null,
      androidStoreUrl:
        androidStatus === 'AVAILABLE' || androidStatus === 'BETA'
          ? androidStoreUrl
          : null,
      supportUrl: asNonEmptyString(s.supportUrl),
      privacyPolicyUrl: asNonEmptyString(s.privacyPolicyUrl),
      termsUrl: asNonEmptyString(s.termsUrl),
      featureFlags,
    };
  }
}
