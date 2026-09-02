'use client';

import { useLocale } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { authenticatedRequest, getApiErrorMessage } from '@/lib/api';
import type { NuqatiDashboard, NuqatiTransaction } from '@/lib/nuqati';
import type { AppLocale } from '@/i18n/routing';

export function useNuqatiApi() {
  const { accessToken } = useAuth();
  const locale = useLocale() as AppLocale;

  return useMemo(
    () => ({
      getDashboard: () => {
        if (!accessToken) throw new Error(getApiErrorMessage(locale, 'unauthorized'));
        return authenticatedRequest<NuqatiDashboard>('/nuqati/me', accessToken);
      },
      getBalance: () => {
        if (!accessToken) throw new Error(getApiErrorMessage(locale, 'unauthorized'));
        return authenticatedRequest<{ balance: number; brand: string }>(
          '/nuqati/balance',
          accessToken,
        );
      },
      listTransactions: (type?: string, page = 1) => {
        if (!accessToken) throw new Error(getApiErrorMessage(locale, 'unauthorized'));
        const params = new URLSearchParams({ page: String(page), limit: '30' });
        if (type && type !== 'all') params.set('type', type);
        return authenticatedRequest<{
          items: NuqatiTransaction[];
          total: number;
          page: number;
          limit: number;
        }>(`/nuqati/transactions?${params}`, accessToken);
      },
      purchase: (packageId: string) => {
        if (!accessToken) throw new Error(getApiErrorMessage(locale, 'unauthorized'));
        return authenticatedRequest<{ purchaseId: string; pointsAdded: number; balance: number }>(
          '/nuqati/purchase',
          accessToken,
          { method: 'POST', body: JSON.stringify({ packageId }) },
        );
      },
      submitSocialShare: (postUrl: string) => {
        if (!accessToken) throw new Error(getApiErrorMessage(locale, 'unauthorized'));
        return authenticatedRequest<{ awarded: number }>(
          '/nuqati/social-share',
          accessToken,
          { method: 'POST', body: JSON.stringify({ postUrl }) },
        );
      },
    }),
    [accessToken, locale],
  );
}

export function useNuqatiBalance() {
  const { user, accessToken } = useAuth();
  const api = useNuqatiApi();
  const [balance, setBalance] = useState<number | null>(null);
  const enabled = Boolean(accessToken && user?.role === 'FREELANCER');

  const reload = useCallback(async () => {
    if (!enabled) return;
    try {
      const res = await api.getBalance();
      setBalance(res.balance);
    } catch {
      setBalance(null);
    }
  }, [enabled, api]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    void api.getBalance().then(
      (res) => {
        if (!cancelled) setBalance(res.balance);
      },
      () => {
        if (!cancelled) setBalance(null);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [enabled, api]);

  return { balance: enabled ? balance : null, reload };
}
