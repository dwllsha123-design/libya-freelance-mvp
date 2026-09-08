'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useMyLaunchStatus } from '@/hooks/use-launch';
import type { AppLocale } from '@/i18n/routing';

export function LaunchDashboardCard() {
  const t = useTranslations('launch');
  const locale = useLocale() as AppLocale;
  const numberLocale = locale === 'ar' ? 'ar-LY' : 'en-LY';
  const { status, isLoading } = useMyLaunchStatus(true);

  if (!isLoading && status && !status.config.enabled) {
    return null;
  }

  const config = status?.config;
  const percent = status?.profileCompletionPercent ?? 0;
  const reward = config?.profileCompletionReward ?? 5;
  const threshold = config?.profileCompletionThreshold ?? 80;
  const commission = config?.freelancerCommissionPercent ?? 0;
  const balance = status?.balance ?? 0;
  const showNextReward = status ? !status.profileRewardAwarded : true;

  return (
    <section className="mt-5 animate-fade-up rounded-2xl border border-ember/25 bg-gradient-to-l from-orange-50/80 to-surface p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-ink">{t('dashboardCardTitle')}</h2>
          <p className="mt-1 text-sm text-ink-soft">{t('dashboardCardSubtitle')}</p>
        </div>
        <Link
          href="/dashboard/nuqati"
          className="text-sm font-semibold text-ember hover:underline"
        >
          {t('ctaViewPoints')}
        </Link>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <p className="rounded-xl border border-line bg-cream/60 px-3 py-2.5 text-sm font-semibold text-ink">
          {isLoading
            ? '…'
            : t('dashboardBalance', { count: balance.toLocaleString(numberLocale) })}
        </p>
        <p className="rounded-xl border border-line bg-cream/60 px-3 py-2.5 text-sm font-semibold text-ink">
          {isLoading ? '…' : t('dashboardCompletion', { percent })}
        </p>
        <p className="rounded-xl border border-line bg-cream/60 px-3 py-2.5 text-sm font-semibold text-ink">
          {t('dashboardZeroCommission', { percent: commission })}
        </p>
        <p className="rounded-xl border border-line bg-cream/60 px-3 py-2.5 text-sm font-semibold text-ink">
          {status?.isFoundingFreelancer
            ? t('dashboardFoundingYes', {
                slot:
                  status.foundingSlotNumber != null
                    ? t('dashboardFoundingSlot', { slot: status.foundingSlotNumber })
                    : '',
              })
            : t('dashboardFoundingNo')}
        </p>
      </div>

      {showNextReward ? (
        <Link
          href="/dashboard/profile"
          className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-ember/30 bg-ember/10 px-4 py-3 text-sm font-semibold text-ember-deep transition hover:bg-ember/15"
        >
          <span>
            {t('dashboardNextReward', { threshold, points: reward })}
            {!isLoading ? ` · ${percent}%` : null}
          </span>
          <span aria-hidden>←</span>
        </Link>
      ) : (
        <p className="mt-4 text-sm font-medium text-palm-deep">{t('dashboardRewardClaimed')}</p>
      )}

      {!status?.isFoundingFreelancer ? (
        <Link
          href="/dashboard/profile"
          className="mt-3 inline-flex text-sm font-semibold text-palm-deep hover:underline"
        >
          {t('foundingCta')}
        </Link>
      ) : null}

      <p className="mt-4 text-xs text-ink-soft">{t('paymentDisclaimer')}</p>
    </section>
  );
}
