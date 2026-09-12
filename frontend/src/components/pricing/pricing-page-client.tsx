'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useSubscriptionsApi } from '@/hooks/use-subscriptions';
import { ApiError } from '@/lib/api';
import type { AppLocale } from '@/i18n/routing';
import {
  FALLBACK_PLANS,
  formatPlanPrice,
  planDisplayName,
  type SubscriptionMe,
  type SubscriptionPlan,
} from '@/lib/subscriptions';
function normalizePlans(plans: SubscriptionPlan[]): SubscriptionPlan[] {
  if (plans.length > 0) return plans;
  return FALLBACK_PLANS.map((p, index) => ({
    id: `fallback-${p.code}`,
    ...p,
    monthlyPointsGrant: 0,
    visibilityWeight: index,
    portfolioItemLimit: 20 + index * 20,
    badgeKey: p.code === 'PRO' || p.code === 'PREMIUM' ? 'PRO' : null,
    features: {},
    isActive: true,
    sortOrder: index,
  }));
}

export function PricingPageClient() {
  const t = useTranslations('pricing');
  const locale = useLocale() as AppLocale;
  const { user, accessToken } = useAuth();
  const api = useSubscriptionsApi();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [me, setMe] = useState<SubscriptionMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyCode, setBusyCode] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const list = await api.listPlans();
        if (!cancelled) setPlans(normalizePlans(list));
      } catch {
        if (!cancelled) setPlans(normalizePlans([]));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api]);

  useEffect(() => {
    if (!accessToken || user?.role !== 'FREELANCER') {
      return;
    }
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

  const displayPlans = useMemo(() => normalizePlans(plans), [plans]);
  const activeMe = accessToken && user?.role === 'FREELANCER' ? me : null;
  const currentCode = activeMe?.currentPlan?.code ?? activeMe?.access?.plan?.code ?? null;

  async function checkout(planCode: string) {
    if (!accessToken) return;
    setBusyCode(planCode);
    setError(null);
    setMessage(null);
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const result = await api.checkout({
        planCode,
        returnUrl: `${origin}/${locale === 'en' ? 'en/' : ''}account/subscription`,
        cancelUrl: `${origin}/${locale === 'en' ? 'en/' : ''}pricing`,
      });
      if (result.requiresRedirect && result.checkoutUrl) {
        window.location.assign(result.checkoutUrl);
        return;
      }
      if (result.activationBlocked) {
        setMessage(result.message ?? t('checkoutBlocked'));
      } else {
        setMessage(t('checkoutSuccess'));
      }
      const data = await api.getMine();
      setMe(data);
    } catch (err) {
      if (
        err instanceof ApiError &&
        (err.status === 503 ||
          (err.details &&
            typeof err.details === 'object' &&
            (err.details as { code?: string }).code ===
              'PAYMENT_PROVIDER_UNAVAILABLE'))
      ) {
        setError(t('paymentUnavailable'));
      } else {
        setError(err instanceof Error ? err.message : t('checkoutFailed'));
      }
    } finally {
      setBusyCode(null);
    }
  }

  return (
    <div className="page-gutter page-shell page-shell--padded mx-auto max-w-5xl space-y-10 py-10">
      <header className="space-y-3 text-center">
        <p className="inline-flex rounded-full bg-ember/10 px-3 py-1 text-xs font-semibold text-ember">
          {t('trialBadge')}
        </p>
        <h1 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          {t('title')}
        </h1>
        <p className="mx-auto max-w-2xl text-ink-soft">{t('subtitle')}</p>
        <p className="text-sm text-ink-soft">{t('trialNote')}</p>
      </header>

      {activeMe?.currentPlan ? (
        <p className="rounded-xl border border-ember/30 bg-ember/5 px-4 py-3 text-center text-sm text-ink">
          {t('currentPlan')}:{' '}
          <strong>{planDisplayName(activeMe.currentPlan, locale)}</strong>
          {activeMe.hasAccess ? null : ` — ${t('upgradeCta')}`}
        </p>
      ) : null}

      {error ? (
        <p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {message}
        </p>
      ) : null}

      {loading ? (
        <p className="text-center text-ink-soft">{t('loading')}</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {displayPlans.map((plan) => {
            const isCurrent = currentCode === plan.code;
            const highlighted = plan.code === 'PRO';
            return (
              <article
                key={plan.id}
                className={`flex flex-col rounded-2xl border p-6 ${
                  highlighted
                    ? 'border-ember bg-surface shadow-[0_12px_32px_-16px_rgba(234,88,12,0.45)]'
                    : 'border-line bg-surface'
                }`}
              >
                <h2 className="font-display text-xl font-bold text-ink">
                  {planDisplayName(plan, locale)}
                </h2>
                <p className="mt-3 font-display text-3xl font-bold text-ink">
                  {formatPlanPrice(plan, locale)}
                  <span className="ms-1 text-sm font-medium text-ink-soft">{t('perMonth')}</span>
                </p>
                <p className="mt-2 text-sm text-ink-soft">
                  {t('proposalsPerMonth', { count: plan.proposalQuotaMonthly })}
                </p>
                {isCurrent ? (
                  <p className="mt-4 text-sm font-semibold text-ember">{t('currentPlan')}</p>
                ) : null}
                <div className="mt-auto pt-6">
                  {!user ? (
                    <Link
                      href="/login?next=/pricing"
                      className="block rounded-xl bg-ember px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-ember-deep"
                    >
                      {t('loginToSubscribe')}
                    </Link>
                  ) : user.role !== 'FREELANCER' ? (
                    <p className="text-center text-sm text-ink-soft">{t('forFreelancersOnly')}</p>
                  ) : (
                    <button
                      type="button"
                      disabled={!!busyCode || plan.id.startsWith('fallback-')}
                      onClick={() => void checkout(plan.code)}
                      className="w-full rounded-xl bg-ember px-4 py-2.5 text-sm font-semibold text-white hover:bg-ember-deep disabled:opacity-60"
                    >
                      {busyCode === plan.code
                        ? t('checkoutBusy')
                        : isCurrent
                          ? t('upgradeCta')
                          : t('choosePlan')}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <section className="overflow-x-auto rounded-2xl border border-line bg-surface">
        <h2 className="border-b border-line px-4 py-3 font-display text-lg font-bold text-ink">
          {t('compareTitle')}
        </h2>
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-cream-deep/40 text-start">
              <th className="px-4 py-3 font-medium text-ink-soft" />
              {displayPlans.map((plan) => (
                <th key={plan.id} className="px-4 py-3 font-semibold text-ink">
                  {planDisplayName(plan, locale)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-line">
              <td className="px-4 py-3 text-ink-soft">{t('featureQuota')}</td>
              {displayPlans.map((plan) => (
                <td key={plan.id} className="px-4 py-3 font-medium text-ink">
                  {plan.proposalQuotaMonthly}
                </td>
              ))}
            </tr>
            {(
              [
                'featureTrial',
                'featureDirectPay',
                'featurePlatformPay',
                'featureSupport',
              ] as const
            ).map((key) => (
              <tr key={key} className="border-t border-line">
                <td className="px-4 py-3 text-ink-soft">{t(key)}</td>
                {displayPlans.map((plan) => (
                  <td key={plan.id} className="px-4 py-3 text-ink">
                    {t('included')}
                  </td>
                ))}
              </tr>
            ))}
            <tr className="border-t border-line">
              <td className="px-4 py-3 text-ink-soft">{t('featureVisibility')}</td>
              {displayPlans.map((plan) => (
                <td key={plan.id} className="px-4 py-3 text-ink">
                  {plan.code === 'STARTER' ? t('notIncluded') : t('included')}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </section>

      <section className="space-y-3 rounded-2xl border border-line bg-cream-deep/30 p-6 text-sm text-ink">
        <h2 className="font-display text-lg font-bold">{t('disclaimerTitle')}</h2>
        <p>{t('disclaimerBody')}</p>
        <p>{t('platformPaymentsNote')}</p>
        {user?.role === 'FREELANCER' ? (
          <Link href="/account/subscription" className="inline-block font-semibold text-ember hover:underline">
            {t('manageSubscription')}
          </Link>
        ) : null}
      </section>
    </div>
  );
}
