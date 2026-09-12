/** Client-side subscription plan / access types matching GET /subscriptions/* */

export type AccessKind =
  | 'NONE'
  | 'TRIAL'
  | 'PAID'
  | 'ADMIN_GRANT'
  | 'PRE_COMMERCIAL';

export interface SubscriptionPlan {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  price: number;
  currency: string;
  durationDays: number;
  proposalQuotaMonthly: number;
  monthlyPointsGrant: number;
  visibilityWeight: number;
  portfolioItemLimit: number;
  badgeKey: string | null;
  features: Record<string, unknown>;
  isActive: boolean;
  sortOrder: number;
  rankingBoostWeight?: number;
}

export interface SubscriptionAccess {
  kind: AccessKind;
  canSubmitProposal: boolean;
  isExpired: boolean;
  plan: SubscriptionPlan | null;
  subscriptionId: string | null;
  status: string | null;
  startedAt: string | null;
  expiresAt: string | null;
  trialStartedAt: string | null;
  trialEndsAt: string | null;
  trialDaysRemaining: number | null;
  proposalLimit: number;
  proposalUsed: number;
  proposalRemaining: number;
  periodKey: string;
  visibilityWeight: number;
}

export interface SubscriptionMe {
  access: SubscriptionAccess;
  currentPlan: SubscriptionPlan | null;
  trialDaysRemaining: number | null;
  quotas: {
    proposalLimit: number;
    proposalUsed: number;
    proposalRemaining: number;
    periodKey: string;
    portfolioItemLimit: number;
    monthlyPointsGrant: number;
  };
  requiresIdentityVerification: boolean;
  hasAccess: boolean;
  isPro: boolean;
  daysRemaining: number;
  /** ISO UTC commercial go-live; null = pre-commercial (no trial countdown) */
  subscriptionsGoLiveAt: string | null;
  subscriptionsCommercialLive: boolean;
  /** Always false until a real PSP is integrated and verified */
  readyForSubscriptionPaywall: boolean;
  subscription: {
    id: string;
    status: string;
    startedAt: string | null;
    expiresAt: string | null;
    plan?: SubscriptionPlan;
  } | null;
  payment: {
    provider?: string;
    mode?: string;
    simulated: boolean;
    canActivateSimulated: boolean;
  };
}

export interface SubscriptionCheckoutResult {
  subscriptionId: string;
  paymentId: string;
  status: string;
  paymentStatus?: string;
  requiresRedirect?: boolean;
  checkoutUrl?: string | null;
  activationBlocked?: boolean;
  message?: string;
  isRenewal?: boolean;
  plan?: SubscriptionPlan;
}

/** Display fallbacks when API is empty (seeded plan codes / prices). */
export const FALLBACK_PLANS: Omit<
  SubscriptionPlan,
  'id' | 'features' | 'visibilityWeight' | 'portfolioItemLimit' | 'badgeKey' | 'isActive' | 'sortOrder' | 'monthlyPointsGrant'
>[] = [
  {
    code: 'STARTER',
    nameAr: 'البداية',
    nameEn: 'Starter',
    price: 22,
    currency: 'LYD',
    durationDays: 30,
    proposalQuotaMonthly: 20,
  },
  {
    code: 'PRO',
    nameAr: 'احترافي',
    nameEn: 'Pro',
    price: 42,
    currency: 'LYD',
    durationDays: 30,
    proposalQuotaMonthly: 60,
  },
  {
    code: 'PREMIUM',
    nameAr: 'مميز',
    nameEn: 'Premium',
    price: 72,
    currency: 'LYD',
    durationDays: 30,
    proposalQuotaMonthly: 120,
  },
];

export const TRIAL_DAYS = 30;

export function planDisplayName(plan: Pick<SubscriptionPlan, 'nameAr' | 'nameEn'>, locale: string) {
  return locale === 'en' ? plan.nameEn : plan.nameAr;
}

export function formatPlanPrice(plan: Pick<SubscriptionPlan, 'price' | 'currency'>, locale: string) {
  const currency = plan.currency === 'LYD' ? (locale === 'en' ? 'LYD' : 'د.ل') : plan.currency;
  return `${plan.price} ${currency}`;
}

export function getApiErrorCode(details: unknown): string | null {
  if (!details || typeof details !== 'object') return null;
  const record = details as Record<string, unknown>;
  if (typeof record.code === 'string') return record.code;
  const nested = record.message;
  if (nested && typeof nested === 'object' && typeof (nested as { code?: unknown }).code === 'string') {
    return (nested as { code: string }).code;
  }
  return null;
}
