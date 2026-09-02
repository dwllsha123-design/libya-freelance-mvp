import type { AppLocale } from '@/i18n/routing';

const ORGANIZATION_SIZE_LABELS: Record<
  AppLocale,
  Record<(typeof ORGANIZATION_SIZE_OPTIONS)[number]['value'], string>
> = {
  ar: {
    SOLO: 'أنا فقط',
    '2-9': '2 – 9',
    '10-99': '10 – 99',
    '100-499': '100 – 499',
    '500-4999': '500 – 4,999',
    '5000+': '+5,000',
  },
  en: {
    SOLO: 'Just me',
    '2-9': '2 – 9',
    '10-99': '10 – 99',
    '100-499': '100 – 499',
    '500-4999': '500 – 4,999',
    '5000+': '5,000+',
  },
};

export const ORGANIZATION_SIZE_OPTIONS = [
  { value: 'SOLO', label: 'أنا فقط' },
  { value: '2-9', label: '2 – 9' },
  { value: '10-99', label: '10 – 99' },
  { value: '100-499', label: '100 – 499' },
  { value: '500-4999', label: '500 – 4,999' },
  { value: '5000+', label: '+5,000' },
] as const;

export type OrganizationSize = (typeof ORGANIZATION_SIZE_OPTIONS)[number]['value'];

export function getClientOnboardingOptions(locale: AppLocale) {
  return ORGANIZATION_SIZE_OPTIONS.map((option) => ({
    value: option.value,
    label: ORGANIZATION_SIZE_LABELS[locale][option.value],
  }));
}

export const ONBOARDING_SKIP_KEY = 'lf-client-onboarding-skipped';

export function hasCompletedClientOnboarding(
  client?: {
    displayName?: string | null;
    companySector?: string | null;
    organizationSize?: string | null;
  } | null,
): boolean {
  if (typeof window !== 'undefined' && sessionStorage.getItem(ONBOARDING_SKIP_KEY) === '1') {
    return true;
  }
  return Boolean(client?.displayName?.trim());
}

export function markClientOnboardingSkipped() {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(ONBOARDING_SKIP_KEY, '1');
  }
}
