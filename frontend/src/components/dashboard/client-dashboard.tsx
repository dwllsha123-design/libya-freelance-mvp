'use client';

import { useTranslations, useLocale } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useEscrowApi, type EscrowRecord } from '@/hooks/use-escrow';
import { useProjectsApi } from '@/hooks/use-projects';
import { formatCurrency } from '@/lib/currency';
import { getLocalizedCategoryName } from '@/lib/locale-content';
import type { AppLocale } from '@/i18n/routing';
import type { ManageProject } from '@/lib/schemas/project';
import { ApiError } from '@/lib/api';

const CLIENT_PROMO_KEY = 'lf-dashboard-client-promo-dismissed';

function BriefcaseIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M10 2h4a2 2 0 0 1 2 2v2h3a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3V4a2 2 0 0 1 2-2Zm4 4V4h-4v2h4Z" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
      <path d="M12 2a10 10 0 1 0 10 10A10.011 10.011 0 0 0 12 2Zm1 11h4v-2h-3V7h-2v6Z" />
    </svg>
  );
}

function CoinIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
      <path d="M12 2a10 10 0 1 0 10 10A10.011 10.011 0 0 0 12 2Zm.5 14.5V17h-1v-1.5H9v-1h2.5V12H9v-1h2.5V9.5h1V11H15v1h-2.5v2.5H15v1h-2.5Z" />
    </svg>
  );
}

function PeopleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
      <path d="M16 11a3 3 0 1 0-3-3 3 3 0 0 0 3 3Zm-8 0a3 3 0 1 0-3-3 3 3 0 0 0 3 3Zm0 2c-2.67 0-8 1.34-8 4v3h10v-3c0-1.1.45-2.07 1.17-2.83A11.94 11.94 0 0 0 8 13Zm8 0c-.34 0-.67 0-1 .06A5.2 5.2 0 0 1 18 18.17V20h6v-3c0-2.66-5.33-4-8-4Z" />
    </svg>
  );
}

function SwapIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M7 7h11M16 4l3 3-3 3M17 17H6M8 14l-3 3 3 3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
      <path d="M12 2 9.5 8.5 3 9.3l5 4.9L6.5 21 12 17.7 17.5 21 16 14.2l5-4.9-6.5-.8Z" />
    </svg>
  );
}

export function ClientDashboard() {
  const t = useTranslations('dashboard');
  const tProjects = useTranslations('projects');
  const tCommon = useTranslations('common');
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const { user, switchRole } = useAuth();
  const projectsApi = useProjectsApi();
  const escrowApi = useEscrowApi();
  const [projects, setProjects] = useState<ManageProject[]>([]);
  const [escrows, setEscrows] = useState<EscrowRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSwitching, setIsSwitching] = useState(false);
  const [switchError, setSwitchError] = useState<string | null>(null);
  const [promoDismissed, setPromoDismissed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(CLIENT_PROMO_KEY) === '1';
  });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [projectList, escrowList] = await Promise.all([
          projectsApi.listMine(),
          escrowApi.listMine().catch(() => [] as EscrowRecord[]),
        ]);
        if (!cancelled) {
          setProjects(projectList);
          setEscrows(escrowList);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [projectsApi, escrowApi]);

  const stats = useMemo(() => {
    const published = projects.filter((p) => p.status === 'OPEN').length;
    const activeContracts = projects.filter((p) => p.status === 'IN_PROGRESS').length;
    const proposalsReceived = projects.reduce((sum, p) => sum + (p.proposalCount ?? 0), 0);
    const totalSpend = escrows
      .filter((e) => e.status === 'FUNDED' || e.status === 'RELEASED' || e.status === 'DISPUTED')
      .reduce((sum, e) => sum + e.amount, 0);

    return { published, activeContracts, proposalsReceived, totalSpend };
  }, [projects, escrows]);

  const publishedProjects = useMemo(
    () =>
      projects
        .filter((p) => p.status === 'OPEN')
        .sort(
          (a, b) =>
            new Date(b.publishedAt ?? b.createdAt).getTime() -
            new Date(a.publishedAt ?? a.createdAt).getTime(),
        ),
    [projects],
  );

  const firstName = user?.profile?.firstName ?? user?.email ?? '';

  async function handleSwitchToFreelancer() {
    setSwitchError(null);
    setIsSwitching(true);
    try {
      await switchRole('FREELANCER');
      router.replace('/dashboard');
      router.refresh();
    } catch (err) {
      setSwitchError(err instanceof ApiError ? err.message : tCommon('error'));
    } finally {
      setIsSwitching(false);
    }
  }

  function dismissPromo() {
    window.localStorage.setItem(CLIENT_PROMO_KEY, '1');
    setPromoDismissed(true);
  }

  return (
    <div className="bg-transparent">
      <div className="page-gutter mx-auto max-w-3xl py-8 sm:py-10">
        {!promoDismissed ? (
          <div className="relative mb-6 animate-fade-up overflow-hidden rounded-2xl border border-line bg-cream-deep/80 p-4 sm:p-5">
            <button
              type="button"
              onClick={dismissPromo}
              className="absolute end-3 top-3 rounded-full p-1 text-ink-soft transition hover:bg-surface hover:text-ink"
              aria-label={t('dismissPromo')}
            >
              <CloseIcon />
            </button>
            <div className="flex items-start gap-3 pe-6">
              <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ember/10 text-ember">
                <SparkIcon />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-ink">{t('clientPromoTitle')}</p>
                <p className="mt-1 text-sm text-ink-soft">{t('clientPromoBody')}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    href="/dashboard/projects/new"
                    className="inline-flex rounded-xl bg-ember px-4 py-2 text-sm font-bold text-white hover:bg-ember-deep"
                  >
                    {t('clientPromoCta')}
                  </Link>
                  <Link
                    href="/freelancers"
                    className="inline-flex rounded-xl border border-line bg-surface px-4 py-2 text-sm font-semibold text-ink hover:bg-cream"
                  >
                    {t('clientPromoSecondary')}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <header className="animate-fade-up" style={{ animationDelay: '40ms' }}>
          <h1 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            {t('title')}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <p className="text-base text-ink-soft sm:text-lg">
              {t('welcomeBack', { name: firstName })}
            </p>
            <span className="rounded-full bg-sand px-3 py-1 text-xs font-semibold text-ink-soft">
              {t('clientMode')}
            </span>
          </div>
        </header>

        <div
          className="mt-6 grid animate-fade-up gap-3 sm:grid-cols-[1.35fr_1fr]"
          style={{ animationDelay: '70ms' }}
        >
          <Link
            href="/dashboard/projects/new"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-ember px-5 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-ember-deep"
          >
            <span className="text-lg leading-none">+</span>
            {t('postOffer')}
          </Link>
          <button
            type="button"
            onClick={() => void handleSwitchToFreelancer()}
            disabled={isSwitching}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-line bg-cream-deep px-5 py-3.5 text-sm font-bold text-ink transition hover:border-sand hover:bg-cream disabled:opacity-60"
          >
            <SwapIcon />
            {isSwitching ? t('switchingRole') : t('switchToFreelancer')}
          </button>
        </div>
        {switchError ? <p className="mt-2 text-sm text-error">{switchError}</p> : null}

        <div
          className="mt-6 grid animate-fade-up grid-cols-2 gap-3"
          style={{ animationDelay: '100ms' }}
        >
          <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm sm:p-5">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-ember">
              <BriefcaseIcon />
            </div>
            <p className="text-sm text-ink-soft">{t('publishedOffers')}</p>
            <p className="mt-1 text-2xl font-bold text-ink">
              {isLoading ? '—' : String(stats.published)}
            </p>
          </div>

          <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm sm:p-5">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-600">
              <ClockIcon />
            </div>
            <p className="text-sm text-ink-soft">{t('activeContracts')}</p>
            <p className="mt-1 text-2xl font-bold text-ink">
              {isLoading ? '—' : String(stats.activeContracts)}
            </p>
          </div>

          <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm sm:p-5">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-palm">
              <CoinIcon />
            </div>
            <p className="text-sm text-ink-soft">{t('totalSpent')}</p>
            <p className="mt-1 text-2xl font-bold text-ink">
              {isLoading ? '—' : formatCurrency(stats.totalSpend, 'LYD', locale)}
            </p>
          </div>

          <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm sm:p-5">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
              <PeopleIcon />
            </div>
            <p className="text-sm text-ink-soft">{t('receivedOrders')}</p>
            <p className="mt-1 text-2xl font-bold text-ink">
              {isLoading ? '—' : String(stats.proposalsReceived)}
            </p>
          </div>
        </div>

        <section
          className="mt-8 animate-fade-up rounded-2xl border border-line bg-surface p-5 shadow-sm sm:p-6"
          style={{ animationDelay: '140ms' }}
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-display text-xl font-bold text-ink">{t('myPublishedOffers')}</h2>
            <Link
              href="/dashboard/projects"
              className="text-sm font-semibold text-ember hover:underline"
            >
              {tCommon('viewAll')}
            </Link>
          </div>

          {isLoading ? (
            <div className="rounded-xl bg-cream/70 py-10 text-center text-ink-soft">
              {tCommon('loadingPage')}
            </div>
          ) : publishedProjects.length === 0 ? (
            <div className="rounded-xl bg-cream/50 px-4 py-12 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center text-ink-soft/70">
                <BriefcaseIcon className="h-12 w-12" />
              </div>
              <p className="font-semibold text-ink">{t('noOffersYet')}</p>
              <Link
                href="/dashboard/projects/new"
                className="mt-6 inline-flex rounded-xl bg-ember px-6 py-2.5 text-sm font-bold text-white hover:bg-ember-deep"
              >
                {t('postOffer')}
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {publishedProjects.slice(0, 5).map((project) => (
                <Link
                  key={project.id}
                  href={`/dashboard/projects/${project.id}/proposals`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-cream/40 p-4 transition-colors hover:border-ember/40"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">{project.title}</p>
                    <p className="mt-1 text-sm text-ink-soft">
                      {getLocalizedCategoryName(project.category, locale)} ·{' '}
                      {tProjects('proposalsCount', { count: project.proposalCount ?? 0 })}
                    </p>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-palm-deep">
                    {tProjects('statusOpen')}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
