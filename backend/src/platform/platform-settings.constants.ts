/** Canonical platform setting keys + defaults */
export const PLATFORM_SETTING_KEYS = [
  'allowClientRegistration',
  'allowFreelancerRegistration',
  'allowNewProjects',
  'allowNewProposals',
  'allowMessaging',
  'allowReviews',
  'allowPortfolio',
  'investorPortalEnabled',
  'maintenanceEnabled',
  'maintenanceMessage',
  'maintenanceStartsAt',
  'maintenanceEndsAt',
  'platformName',
  'supportEmail',
  'currency',
  // Legal / support (safe public URLs)
  'privacyPolicyUrl',
  'termsUrl',
  'supportUrl',
  // Mobile release configuration (no secrets / certs)
  'iosAppStatus',
  'androidAppStatus',
  'iosLatestVersion',
  'iosMinimumSupportedVersion',
  'androidLatestVersion',
  'androidMinimumSupportedVersion',
  'iosStoreUrl',
  'androidStoreUrl',
  'mobileMaintenanceMessage',
] as const;

export type PlatformSettingKey = (typeof PLATFORM_SETTING_KEYS)[number];

export const CRITICAL_SETTING_KEYS = new Set<PlatformSettingKey>([
  'maintenanceEnabled',
  'maintenanceMessage',
  'maintenanceStartsAt',
  'maintenanceEndsAt',
  'investorPortalEnabled',
  'currency',
  'iosAppStatus',
  'androidAppStatus',
  'iosLatestVersion',
  'iosMinimumSupportedVersion',
  'androidLatestVersion',
  'androidMinimumSupportedVersion',
  'iosStoreUrl',
  'androidStoreUrl',
  'mobileMaintenanceMessage',
  'privacyPolicyUrl',
  'termsUrl',
  'supportUrl',
]);

export const STABLE_FEATURE_FLAGS = [
  'MESSAGING',
  'PORTFOLIO',
  'REVIEWS',
  'INVESTOR_PORTAL',
  'ESCROW',
] as const;

export const FUTURE_FEATURE_FLAGS = [
  'PAYMENTS',
  'SUBSCRIPTIONS',
  'AI_MATCHING',
] as const;

/** Mobile client gates — default OFF until native apps ship */
export const MOBILE_FEATURE_FLAGS = [
  'MOBILE_ENABLED',
  'MOBILE_MESSAGING',
  'MOBILE_PORTFOLIO',
  'MOBILE_REVIEWS',
  'MOBILE_PAYMENTS',
  'MOBILE_AI_MATCHING',
] as const;

export const ALL_FEATURE_FLAGS = [
  ...STABLE_FEATURE_FLAGS,
  ...FUTURE_FEATURE_FLAGS,
  ...MOBILE_FEATURE_FLAGS,
] as const;

export type FeatureFlagKey = (typeof ALL_FEATURE_FLAGS)[number];

export const CMS_KEYS = [
  'HOMEPAGE_HERO',
  'FAQ',
  'FOOTER',
  'CONTACT',
  'SOCIAL_LINKS',
] as const;

export type CmsKey = (typeof CMS_KEYS)[number];

export const DEFAULT_SETTINGS: Record<PlatformSettingKey, unknown> = {
  allowClientRegistration: true,
  allowFreelancerRegistration: true,
  allowNewProjects: true,
  allowNewProposals: true,
  allowMessaging: true,
  allowReviews: true,
  allowPortfolio: true,
  investorPortalEnabled: true,
  maintenanceEnabled: false,
  maintenanceMessage: '',
  maintenanceStartsAt: null,
  maintenanceEndsAt: null,
  platformName: 'Libya Freelance',
  supportEmail: 'support@libyanfreelance.ly',
  currency: 'LYD',
  privacyPolicyUrl: 'https://libyanfreelance.ly/privacy',
  termsUrl: 'https://libyanfreelance.ly/terms',
  supportUrl: 'https://libyanfreelance.ly/help',
  iosAppStatus: 'COMING_SOON',
  androidAppStatus: 'COMING_SOON',
  iosLatestVersion: '',
  iosMinimumSupportedVersion: '',
  androidLatestVersion: '',
  androidMinimumSupportedVersion: '',
  iosStoreUrl: '',
  androidStoreUrl: '',
  mobileMaintenanceMessage: '',
};

export function settingTypeFor(key: PlatformSettingKey): 'BOOLEAN' | 'STRING' | 'NUMBER' | 'JSON' {
  if (
    key === 'allowClientRegistration' ||
    key === 'allowFreelancerRegistration' ||
    key === 'allowNewProjects' ||
    key === 'allowNewProposals' ||
    key === 'allowMessaging' ||
    key === 'allowReviews' ||
    key === 'allowPortfolio' ||
    key === 'investorPortalEnabled' ||
    key === 'maintenanceEnabled'
  ) {
    return 'BOOLEAN';
  }
  return 'STRING';
}
