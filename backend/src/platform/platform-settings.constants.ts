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
] as const;

export type PlatformSettingKey = (typeof PLATFORM_SETTING_KEYS)[number];

export const CRITICAL_SETTING_KEYS = new Set<PlatformSettingKey>([
  'maintenanceEnabled',
  'maintenanceMessage',
  'maintenanceStartsAt',
  'maintenanceEndsAt',
  'investorPortalEnabled',
  'currency',
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

export const ALL_FEATURE_FLAGS = [
  ...STABLE_FEATURE_FLAGS,
  ...FUTURE_FEATURE_FLAGS,
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
  supportEmail: 'support@libyafreelance.ly',
  currency: 'LYD',
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
