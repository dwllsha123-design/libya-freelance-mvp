'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useNuqatiApi } from '@/hooks/use-nuqati';
import type { NuqatiDashboard } from '@/lib/nuqati';
import { getNuqatiBrand } from '@/lib/nuqati';
import type { AppLocale } from '@/i18n/routing';

export default function AccountPointsPage() {
  const t = useTranslations('subscription');
  const tCommon = useTranslations('common');
  const locale = useLocale() as AppLocale;
  const brand = getNuqatiBrand(locale);
  const { user, accessToken, isLoading: authLoading } = useAuth();
  const nuqatiApi = useNuqatiApi();
  const [dash, setDash] = useState<NuqatiDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken || user?.role !== 'FREELANCER') return;
    let cancelled = false;
    (async () => {
      try {
        const data = await nuqatiApi.getDashboard();
        if (!cancelled) setDash(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : tCommon('error'));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [accessToken, user?.role, nuqatiApi, tCommon]);

  if (authLoading) {
    return <p className="page-gutter py-10 text-ink-soft">{tCommon('loading')}</p>;
  }
  if (!user) {
    return (
      <p className="page-gutter py-10">
        <Link href="/login?next=/account/points" className="text-ember underline">
          {t('loginRequired')}
        </Link>
      </p>
    );
  }
  if (user.role !== 'FREELANCER') {
    return <p className="page-gutter py-10 text-ink-soft">{t('freelancersOnly')}</p>;
  }

  const packages = dash?.packages ?? [];

  return (
    <div className="page-gutter page-shell page-shell--app page-shell--padded mx-auto max-w-3xl space-y-6 py-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">{t('pointsTitle')}</h1>
          <p className="mt-1 text-sm text-ink-soft">{brand}</p>
        </div>
        <Link href="/dashboard/nuqati" className="text-sm font-semibold text-ember hover:underline">
          {t('goToNuqati')}
        </Link>
      </header>

      {error ? (
        <p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <div className="rounded-2xl border border-line bg-surface p-5">
        <p className="text-sm text-ink-soft">{t('pointsBalance')}</p>
        <p className="mt-1 font-display text-3xl font-bold text-ink">
          {dash?.balance ?? '—'}
        </p>
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="font-display text-lg font-bold text-ink">{t('pointsPackages')}</h2>
          <Link
            href="/dashboard/nuqati/history"
            className="text-sm font-semibold text-ember hover:underline"
          >
            {t('pointsHistory')}
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {packages.map((pkg) => {
            const title =
              (locale === 'en' ? pkg.nameEn : pkg.nameAr) ||
              `${pkg.points} ${brand}`;
            return (
              <Link
                key={pkg.id}
                href={`/dashboard/nuqati/checkout?packageId=${pkg.id}`}
                className="rounded-2xl border border-line bg-surface p-4 transition hover:border-ember/40"
              >
                <p className="font-semibold text-ink">{title}</p>
                <p className="mt-1 text-sm text-ink-soft">
                  {pkg.points}
                  {pkg.bonusPoints ? ` + ${pkg.bonusPoints}` : ''} · {pkg.priceLyd}{' '}
                  {locale === 'en' ? 'LYD' : 'د.ل'}
                </p>
                <span className="mt-3 inline-block text-sm font-semibold text-ember">
                  {t('pointsBuy')}
                </span>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
