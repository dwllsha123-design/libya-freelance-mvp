'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useSubscriptionsApi } from '@/hooks/use-subscriptions';
import type { SubscriptionMe } from '@/lib/subscriptions';

export function SubscriptionStatusBanner() {
  const t = useTranslations('subscription');
  const { user, accessToken } = useAuth();
  const api = useSubscriptionsApi();
  const [me, setMe] = useState<SubscriptionMe | null>(null);

  useEffect(() => {
    if (!accessToken || user?.role !== 'FREELANCER') return;
    let cancelled = false;
    (async () => {
      try {
        const data = await api.getMine();
        if (!cancelled) setMe(data);
      } catch {
        if (!cancelled) setMe(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [accessToken, user?.role, api]);

  if (!me) return null;

  if (!me.hasAccess && me.subscriptionsCommercialLive) {
    return (
      <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-950">
        <p className="font-semibold">{t('expiredBannerTitle')}</p>
        <p className="mt-1">{t('expiredBannerBody')}</p>
        <Link
          href="/pricing"
          className="mt-3 inline-flex rounded-lg bg-ember px-4 py-2 text-sm font-semibold text-white hover:bg-ember-deep"
        >
          {t('upgradeCta')}
        </Link>
      </div>
    );
  }

  if (
    me.subscriptionsCommercialLive &&
    me.access.kind === 'TRIAL' &&
    me.trialDaysRemaining != null
  ) {
    return (
      <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        <p className="font-semibold">{t('trialBannerTitle')}</p>
        <p className="mt-1">{t('trialBannerBody', { count: me.trialDaysRemaining })}</p>
        <Link href="/pricing" className="mt-2 inline-block font-semibold text-ember underline">
          {t('viewPricing')}
        </Link>
      </div>
    );
  }

  return null;
}
