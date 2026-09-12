'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useSubscriptionsApi } from '@/hooks/use-subscriptions';
import { getApiErrorMessage } from '@/lib/api';
import type { AppLocale } from '@/i18n/routing';
import { planDisplayName, type SubscriptionMe } from '@/lib/subscriptions';

function statusLabel(
  me: SubscriptionMe,
  t: ReturnType<typeof useTranslations<'subscription'>>,
) {
  if (me.access.kind === 'TRIAL' && me.hasAccess) return t('statusTrial');
  if (me.access.kind === 'ADMIN_GRANT' && me.hasAccess) return t('statusAdminGrant');
  if (me.hasAccess) return t('statusPaid');
  if (me.access.isExpired || me.subscription?.status === 'EXPIRED') return t('statusExpired');
  return t('statusNone');
}

export default function AccountSubscriptionPage() {
  const t = useTranslations('subscription');
  const tCommon = useTranslations('common');
  const locale = useLocale() as AppLocale;
  const { user, accessToken, isLoading: authLoading } = useAuth();
  const api = useSubscriptionsApi();
  const [me, setMe] = useState<SubscriptionMe | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);

  const isFreelancer = user?.role === 'FREELANCER';
  const canFetch = !authLoading && Boolean(accessToken) && isFreelancer;

  useEffect(() => {
    if (!canFetch) return;
    let cancelled = false;
    (async () => {
      setFetching(true);
      try {
        const data = await api.getMine();
        if (!cancelled) {
          setMe(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : getApiErrorMessage(locale, 'unexpected'));
        }
      } finally {
        if (!cancelled) setFetching(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canFetch, accessToken, api, locale]);

  if (authLoading || (canFetch && fetching && !me && !error)) {
    return <p className="page-gutter py-10 text-ink-soft">{tCommon('loading')}</p>;
  }
  if (!user) {
    return (
      <p className="page-gutter py-10">
        <Link href="/login?next=/account/subscription" className="text-ember underline">
          {t('loginRequired')}
        </Link>
      </p>
    );
  }
  if (!isFreelancer) {
    return <p className="page-gutter py-10 text-ink-soft">{t('freelancersOnly')}</p>;
  }

  return (
    <div className="page-gutter page-shell page-shell--app page-shell--padded mx-auto max-w-2xl space-y-6 py-8">
      <header>
        <h1 className="font-display text-2xl font-bold text-ink">{t('title')}</h1>
        <p className="mt-1 text-sm text-ink-soft">{t('subtitle')}</p>
      </header>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      {me ? (
        <section className="space-y-3 rounded-xl border border-outline-variant/40 bg-surface p-5">
          <p className="text-sm text-ink-soft">{t('currentStatus')}</p>
          <p className="text-lg font-semibold text-ink">{statusLabel(me, t)}</p>
          {me.access.trialDaysRemaining != null && me.access.kind === 'TRIAL' ? (
            <p className="text-sm text-ink">
              {t('daysRemaining', { days: me.access.trialDaysRemaining })}
            </p>
          ) : null}
          {me.access.expiresAt ? (
            <p className="text-sm text-ink-soft">
              {t('expiresAt', { date: new Date(me.access.expiresAt).toLocaleDateString(locale) })}
            </p>
          ) : null}
          {me.currentPlan || me.access.plan ? (
            <p className="text-sm text-ink">
              {t('planLabel')}:{' '}
              {planDisplayName(me.currentPlan ?? me.access.plan!, locale)}
            </p>
          ) : null}
          <p className="text-sm text-ink-soft">
            {t('quota', {
              used: me.access.proposalUsed,
              limit: me.access.proposalLimit,
              remaining: me.access.proposalRemaining,
            })}
          </p>
        </section>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Link
          href="/pricing"
          className="inline-flex rounded-lg bg-ember px-4 py-2 text-sm font-semibold text-white"
        >
          {me?.hasAccess ? t('upgrade') : t('choosePlan')}
        </Link>
        <Link href="/account/points" className="text-sm text-ember underline">
          {t('pointsLink')}
        </Link>
      </div>
    </div>
  );
}
