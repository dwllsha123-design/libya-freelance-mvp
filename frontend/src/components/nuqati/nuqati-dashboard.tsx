'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useNuqatiApi } from '@/hooks/use-nuqati';
import type { NuqatiDashboard, NuqatiTask } from '@/lib/nuqati';
import { getNuqatiBrand } from '@/lib/nuqati';
import { PLATFORM_NAME_AR_STYLED, PLATFORM_NAME_EN } from '@/lib/branding';
import type { AppLocale } from '@/i18n/routing';

const TAB_KEYS = [
  { key: 'all', labelKey: 'tabAll' },
  { key: 'profile', labelKey: 'tabProfile' },
  { key: 'activity', labelKey: 'tabActivity' },
  { key: 'streak', labelKey: 'tabStreak' },
  { key: 'achievement', labelKey: 'tabAchievement' },
  { key: 'social', labelKey: 'tabSocial' },
] as const;

function TaskCard({
  task,
  proposalCost,
  onPurchaseHint,
}: {
  task: NuqatiTask;
  proposalCost: number;
  onPurchaseHint?: () => void;
}) {
  const t = useTranslations('nuqati');
  const pct = task.maxProgress
    ? Math.min(100, Math.round((task.progress / task.maxProgress) * 100))
    : task.completed
      ? 100
      : 0;

  return (
    <div className="flex items-start gap-4 border-b border-slate-100 py-4 last:border-0">
      <div
        className={`flex h-10 min-w-[3.5rem] shrink-0 items-center justify-center rounded-lg px-2 text-sm font-bold ${
          task.completed ? 'bg-slate-100 text-slate-500' : 'bg-primary/10 text-primary'
        }`}
      >
        {task.completed ? '✓' : `${task.reward}+`}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-on-surface">{task.titleAr}</p>
        <p className="mt-1 text-sm text-on-surface-variant">{task.descriptionAr}</p>
        {task.key === 'MONTHLY_APPLY' ? (
          <p className="mt-1 text-xs text-slate-500">
            {t('applyCostHint', { cost: proposalCost })}{' '}
            <button type="button" onClick={onPurchaseHint} className="text-primary hover:underline">
              {t('buyPointsLink')}
            </button>
          </p>
        ) : null}
        {task.maxProgress && task.maxProgress > 1 ? (
          <div className="mt-3">
            <div className="mb-1 flex justify-between text-xs text-slate-500">
              <span>{t('progress')}</span>
              <span>
                {task.progress}/{task.maxProgress}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function NuqatiDashboardView() {
  const t = useTranslations('nuqati');
  const tCommon = useTranslations('common');
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const api = useNuqatiApi();
  const [data, setData] = useState<NuqatiDashboard | null>(null);
  const [tab, setTab] = useState<(typeof TAB_KEYS)[number]['key']>('all');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [socialUrl, setSocialUrl] = useState('');
  const numberLocale = locale === 'ar' ? 'ar-LY' : 'en-LY';
  const platformName = locale === 'en' ? PLATFORM_NAME_EN : PLATFORM_NAME_AR_STYLED;
  const brand = getNuqatiBrand(locale);

  const reload = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.getDashboard();
      setData(res);
    } catch {
      setError(t('loadFailed'));
    } finally {
      setIsLoading(false);
    }
  }, [api, t]);

  useEffect(() => {
    if (!authLoading && user && user.role !== 'FREELANCER') {
      router.replace('/dashboard');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (user?.role !== 'FREELANCER') return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await api.getDashboard();
        if (!cancelled) setData(res);
      } catch {
        if (!cancelled) setError(t('loadFailed'));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, api, t]);

  async function handleSocialShare(event: React.FormEvent) {
    event.preventDefault();
    try {
      await api.submitSocialShare(socialUrl);
      setSocialUrl('');
      await reload();
    } catch {
      setError(t('shareFailed'));
    }
  }

  if (authLoading || isLoading) {
    return <div className="p-8 text-center text-slate-500">{t('loading')}</div>;
  }

  if (!user || user.role !== 'FREELANCER') return null;

  const tasks =
    tab === 'all' ? data?.tasks ?? [] : (data?.tasks ?? []).filter((task) => task.category === tab);

  const availableToEarn =
    (data?.tasks ?? [])
      .filter((task) => !task.completed)
      .reduce((sum, task) => sum + task.reward, 0) ?? 0;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-on-surface">{t('earnTitle', { brand })}</h1>
          <p className="mt-2 text-on-surface-variant">
            {t('earnSubtitle', { platform: platformName })}{' '}
            <Link href="/dashboard/nuqati/history" className="font-semibold text-primary hover:underline">
              {t('viewHistory')}
            </Link>
          </p>
        </div>
        <div className="rounded-2xl bg-primary px-6 py-4 text-center text-white shadow-sm">
          <p className="text-3xl font-bold">{data?.balance.toLocaleString(numberLocale) ?? 0}</p>
          <p className="text-sm opacity-90">{t('currentBalance')}</p>
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-outline-variant/40 bg-surface p-5">
          <p className="text-sm text-slate-500">{t('availableToEarn')}</p>
          <p className="mt-1 text-2xl font-bold text-primary">
            {availableToEarn.toLocaleString(numberLocale)}
          </p>
        </div>
        <div className="rounded-2xl border border-outline-variant/40 bg-surface p-5">
          <p className="text-sm text-slate-500">{t('proposalCostLabel')}</p>
          <p className="mt-1 text-2xl font-bold text-on-surface">
            {data?.proposalCost ?? 10} {t('points')}
          </p>
        </div>
      </div>

      <section id="nuqati-purchase" className="mt-8 rounded-2xl border border-outline-variant/40 bg-surface p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold">{t('buyPointsTitle')}</h2>
          <span className="text-sm text-slate-500">{t('inLyd')}</span>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {(data?.packages ?? []).map((pkg) => (
            <Link
              key={pkg.id}
              href={`/dashboard/nuqati/checkout?packageId=${pkg.id}`}
              className="rounded-xl border border-slate-200 p-4 text-start transition hover:border-primary"
            >
              <p className="text-xl font-bold text-primary">{pkg.points} {t('point')}</p>
              <p className="mt-1 text-sm text-slate-600">{pkg.priceLyd} {tCommon('lyd')}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-outline-variant/40 bg-surface p-6">
        <div className="flex flex-wrap gap-2">
          {TAB_KEYS.map((tabItem) => (
            <button
              key={tabItem.key}
              type="button"
              onClick={() => setTab(tabItem.key)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                tab === tabItem.key
                  ? 'bg-primary text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t(tabItem.labelKey)}
            </button>
          ))}
        </div>

        <div className="mt-4">
          {tasks.map((task) => (
            <TaskCard
              key={task.key}
              task={task}
              proposalCost={data?.proposalCost ?? 10}
              onPurchaseHint={() => {
                document.getElementById('nuqati-purchase')?.scrollIntoView({ behavior: 'smooth' });
              }}
            />
          ))}
        </div>
      </section>

      {data?.streak ? (
        <section className="mt-8 rounded-2xl border border-outline-variant/40 bg-surface p-6">
          <h2 className="text-lg font-bold">{t('streakTitle')}</h2>
          <p className="mt-1 text-sm text-slate-600">
            {t('streakCurrent', { days: data.streak.currentDays })}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            {t('streakHint')}
          </p>
        </section>
      ) : null}

      <section className="mt-8 rounded-2xl border border-outline-variant/40 bg-surface p-6">
        <h2 className="text-lg font-bold">{t('shareTitle', { platform: platformName })}</h2>
        <p className="mt-1 text-sm text-slate-600">
          {t('shareSubtitle')}
        </p>
        <form onSubmit={handleSocialShare} className="mt-4 flex flex-wrap gap-2">
          <input
            type="url"
            value={socialUrl}
            onChange={(e) => setSocialUrl(e.target.value)}
            placeholder={t('sharePlaceholder')}
            className="min-w-[12rem] flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
            required
          />
          <button
            type="submit"
            className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-container"
          >
            {t('shareSubmit')}
          </button>
        </form>
      </section>
    </div>
  );
}
