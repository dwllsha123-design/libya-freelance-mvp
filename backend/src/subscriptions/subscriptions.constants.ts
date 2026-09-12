export const LEGACY_PRO_PLAN_CODE = 'FREELANCER_PRO';
export const STARTER_PLAN_CODE = 'STARTER';
export const PRO_PLAN_CODE = 'PRO';
export const PREMIUM_PLAN_CODE = 'PREMIUM';

/** @deprecated Use LEGACY_PRO_PLAN_CODE — kept for older imports during pivot. */
export const OLD_PRO_PLAN_CODE = LEGACY_PRO_PLAN_CODE;

export const FREE_PORTFOLIO_ITEM_LIMIT = 8;
export const TRIAL_DURATION_DAYS = 30;
export const TRIAL_MIGRATION_BATCH = 'subscription-marketplace-golive-v1';

export const IDENTITY_VERIFICATION_VALIDITY_DAYS = 730;
export const VERIFICATION_DOC_MAX_SIZE = 5 * 1024 * 1024;
export const VERIFICATION_DOC_MAX_COUNT = 3;
export const VERIFICATION_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

export const SUBSCRIPTION_FEATURE_KEYS = [
  'messaging',
  'publicProfile',
  'standardVisibility',
  'proBadge',
  'premiumBadge',
  'statistics',
  'advancedStatistics',
  'higherVisibility',
  'highestVisibility',
  'promotionalBenefits',
] as const;

export type SubscriptionFeatureKey = (typeof SUBSCRIPTION_FEATURE_KEYS)[number];

export const PROPOSAL_BLOCKED_AR =
  'انتهت الفترة المجانية أو اشتراكك الحالي. اختر إحدى الباقات للاستمرار في تقديم العروض.';
export const PROPOSAL_BLOCKED_EN =
  'Your free trial or current subscription has ended. Choose a plan to continue submitting proposals.';
export const PROPOSAL_QUOTA_EXCEEDED_AR =
  'لقد استهلكت حد العروض الشهري لباقتك. قم بالترقية أو انتظر بداية الدورة التالية.';
export const PROPOSAL_QUOTA_EXCEEDED_EN =
  'You have used this month’s proposal allowance. Upgrade your plan or wait for the next billing period.';

/** Env/feature gate: simulated payments may activate products only when explicitly allowed. */
export function allowSimulatedProductActivation(
  nodeEnv: string | undefined,
  flagEnabled: boolean,
): boolean {
  if (flagEnabled) return true;
  return nodeEnv !== 'production';
}

/** @deprecated Prefer allowSimulatedProductActivation */
export function allowSimulatedProActivation(
  nodeEnv: string | undefined,
  flagEnabled: boolean,
): boolean {
  return allowSimulatedProductActivation(nodeEnv, flagEnabled);
}

export function calendarMonthPeriodKey(asOf: Date = new Date()): string {
  const y = asOf.getUTCFullYear();
  const m = String(asOf.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date.getTime());
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}
