'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useSubscriptionsApi } from '@/hooks/use-subscriptions';
import { getApiErrorMessage } from '@/lib/api';
import type { AppLocale } from '@/i18n/routing';
import { planDisplayName, type SubscriptionMe } from '@/lib/subscriptions';

export default function AccountPaymentsPage() {
  const t = useTranslations('subscription');
  const tCommon = useTranslations('common');
  const locale = useLocale() as AppLocale;
  const { user, accessToken, isLoading: authLoading } = useAuth();
  const api = useSubscriptionsApi();
  const [me, setMe] = useState<SubscriptionMe | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken || user?.role !== 'FREELANCER') return;
    let cancelled = false;
    (async () => {
      try {
        const data = await api.getMine();
        if (!cancelled) setMe(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : getApiErrorMessage(locale, 'unexpected'));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [accessToken, user?.role, api, locale]);

  if (authLoading) {
    return <p className="page-gutter py-10 text-ink-soft">{tCommon('loading')}</p>;
  }
  if (!user) {
    return (
      <p className="page-gutter py-10">
        <Link href="/login?next=/account/payments" className="text-ember underline">
          {t('loginRequired')}
        </Link>
      </p>
    );
  }

  return (
    <div className="page-gutter page-shell page-shell--app page-shell--padded mx-auto max-w-2xl space-y-6 py-8">
      <header>
        <h1 className="font-display text-2xl font-bold text-ink">{t('paymentsTitle')}</h1>
        <p className="mt-1 text-sm text-ink-soft">{t('paymentsSubtitle')}</p>
      </header>

      <p className="rounded-xl border border-line bg-cream-deep/40 px-4 py-3 text-sm text-ink">
        {t('paymentsNoList')}
      </p>

      {error ? (
        <p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      {user.role === 'FREELANCER' && me ? (
        <div className="space-y-2 rounded-2xl border border-line bg-surface p-5 text-sm">
          <p className="font-semibold text-ink">{t('subscriptionStatus')}</p>
          {me.currentPlan ? (
            <p>
              {t('currentPlan')}: {planDisplayName(me.currentPlan, locale)}
            </p>
          ) : null}
          <p>
            {me.hasAccess ? t('hasAccessYes') : t('hasAccessNo')}
          </p>
          {me.payment?.simulated ? (
            <p className="text-ink-soft">{t('paymentSimulated')}</p>
          ) : null}
          <div className="flex flex-wrap gap-3 pt-2">
            <Link href="/account/subscription" className="font-semibold text-ember hover:underline">
              {t('title')}
            </Link>
            <Link href="/pricing" className="font-semibold text-ember hover:underline">
              {t('viewPricing')}
            </Link>
            <Link href="/account/points" className="font-semibold text-ember hover:underline">
              {t('pointsTitle')}
            </Link>
          </div>
        </div>
      ) : user.role !== 'FREELANCER' ? (
        <p className="text-sm text-ink-soft">{t('freelancersOnly')}</p>
      ) : null}
    </div>
  );
}
