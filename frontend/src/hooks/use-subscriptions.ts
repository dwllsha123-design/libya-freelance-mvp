'use client';

import { useLocale } from 'next-intl';
import { useMemo } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { apiRequest, authenticatedRequest, getApiErrorMessage } from '@/lib/api';
import type { AppLocale } from '@/i18n/routing';
import type {
  SubscriptionCheckoutResult,
  SubscriptionMe,
  SubscriptionPlan,
} from '@/lib/subscriptions';

export function useSubscriptionsApi() {
  const { accessToken } = useAuth();
  const locale = useLocale() as AppLocale;

  return useMemo(
    () => ({
      listPlans: () => apiRequest<SubscriptionPlan[]>('/subscriptions/plans', {}, locale),

      getMine: () => {
        if (!accessToken) throw new Error(getApiErrorMessage(locale, 'unauthorized'));
        return authenticatedRequest<SubscriptionMe>('/subscriptions/me', accessToken, {}, locale);
      },

      checkout: (body: { planCode: string; returnUrl?: string; cancelUrl?: string }) => {
        if (!accessToken) throw new Error(getApiErrorMessage(locale, 'unauthorized'));
        return authenticatedRequest<SubscriptionCheckoutResult>(
          '/subscriptions/checkout',
          accessToken,
          { method: 'POST', body: JSON.stringify(body) },
          locale,
        );
      },
    }),
    [accessToken, locale],
  );
}
