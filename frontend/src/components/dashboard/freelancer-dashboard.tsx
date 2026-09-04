'use client';

import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useEscrowApi, type EscrowRecord } from '@/hooks/use-escrow';
import { useNuqatiApi } from '@/hooks/use-nuqati';
import { useProposalsApi, type FreelancerProposal } from '@/hooks/use-proposals';
import { formatCurrency } from '@/lib/currency';
import type { NuqatiDashboard, NuqatiTask } from '@/lib/nuqati';
import type { AppLocale } from '@/i18n/routing';

const SETUP_TASK_KEYS = new Set(['PROFILE_COMPLETE', 'FIRST_PORTFOLIO', 'FIRST_JOB']);
const PROMO_DISMISS_KEY = 'lf-dashboard-nuqati-promo-dismissed';

const TASK_HREF: Record<string, string> = {
  PROFILE_COMPLETE: '/dashboard/profile',
  FIRST_PORTFOLIO: '/dashboard/portfolio',
  FIRST_JOB: '/projects',
  MONTHLY_APPLY: '/projects',
  DAILY_LOGIN: '/dashboard/nuqati',
};

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" strokeLinecap="round" />
    </svg>
  );
}

function PortfolioIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
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

function DocumentIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Zm0 2.5L17.5 8H14ZM8 12h8v2H8Zm0 4h8v2H8Zm0-8h3v2H8Z" />
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

function NuqatiIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
      <path d="M12 2 9.5 8.5 3 9.3l5 4.9L6.5 21 12 17.7 17.5 21 16 14.2l5-4.9-6.5-.8Z" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
      <path d="M12 2 9.5 8.5 3 9.3l5 4.9L6.5 21 12 17.7 17.5 21 16 14.2l5-4.9-6.5-.8Z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
      <path d="M5 12.5 9.5 17 19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BriefcaseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
      <path d="M10 2h4a2 2 0 0 1 2 2v2h3a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3V4a2 2 0 0 1 2-2Zm4 4V4h-4v2h4Z" />
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

function formatProposalDate(iso: string, locale: AppLocale) {
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'ar-LY', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(iso));
}

function taskHref(task: NuqatiTask) {
  return TASK_HREF[task.key] ?? '/dashboard/nuqati';
}

export function FreelancerDashboard() {
  const t = useTranslations('dashboard');
  const tProposals = useTranslations('proposals');
  const tCommon = useTranslations('common');
  const locale = useLocale() as AppLocale;
  const { user } = useAuth();
  const proposalsApi = useProposalsApi();
  const escrowApi = useEscrowApi();
  const nuqatiApi = useNuqatiApi();

  const [proposals, setProposals] = useState<FreelancerProposal[]>([]);
  const [proposalsTotal, setProposalsTotal] = useState(0);
  const [escrows, setEscrows] = useState<EscrowRecord[]>([]);
  const [nuqati, setNuqati] = useState<NuqatiDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [promoDismissed, setPromoDismissed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(PROMO_DISMISS_KEY) === '1';
  });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [proposalPage, escrowList, nuqatiDash] = await Promise.all([
          proposalsApi.listMine(),
          escrowApi.listMine().catch(() => [] as EscrowRecord[]),
          nuqatiApi.getDashboard().catch(() => null),
        ]);
        if (!cancelled) {
          setProposals(proposalPage.items);
          setProposalsTotal(proposalPage.total);
          setEscrows(escrowList);
          setNuqati(nuqatiDash);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [proposalsApi, escrowApi, nuqatiApi]);

  const firstName = user?.profile?.firstName ?? user?.email ?? '';

  const stats = useMemo(() => {
    const activeContracts = proposals.filter(
      (p) => p.status === 'ACCEPTED' && p.project.status === 'IN_PROGRESS',
    ).length;
    const totalEarnings = escrows
      .filter((e) => e.status === 'RELEASED')
      .reduce((sum, e) => sum + e.freelancerPayout, 0);

    return {
      activeContracts,
      applications: proposalsTotal,
      earnings: totalEarnings,
      nuqatiBalance: nuqati?.balance ?? 0,
    };
  }, [proposals, proposalsTotal, escrows, nuqati]);

  const setupTasks = useMemo(() => {
    const tasks = (nuqati?.tasks ?? []).filter((task) => SETUP_TASK_KEYS.has(task.key));
    const earned = tasks.filter((task) => task.completed).reduce((sum, task) => sum + task.reward, 0);
    const total = tasks.reduce((sum, task) => sum + task.reward, 0) || 40;
    return { tasks, earned, total };
  }, [nuqati]);

  const recentProposals = useMemo(
    () =>
      [...proposals]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 4),
    [proposals],
  );

  const displayProposals = useMemo(() => {
    const pending = proposals
      .filter((p) => p.status === 'PENDING')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 4);
    return pending.length > 0 ? pending : recentProposals;
  }, [proposals, recentProposals]);

  function dismissPromo() {
    window.localStorage.setItem(PROMO_DISMISS_KEY, '1');
    setPromoDismissed(true);
  }

  const statusLabel = (status: string) => {
    switch (status) {
      case 'PENDING':
        return tProposals('pendingShort');
      case 'ACCEPTED':
        return tProposals('accepted');
      case 'REJECTED':
        return tProposals('rejected');
      case 'WITHDRAWN':
        return tProposals('withdrawn');
      default:
        return status;
    }
  };

  const statusTone = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-amber-100 text-amber-800';
      case 'ACCEPTED':
        return 'bg-emerald-100 text-emerald-800';
      case 'REJECTED':
        return 'bg-rose-100 text-rose-800';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  };

  return (
    <div className="bg-transparent">
      <div className="page-gutter mx-auto max-w-3xl py-8 sm:py-10">
        <header className="animate-fade-up">
          <h1 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            {t('title')}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <p className="text-base text-ink-soft sm:text-lg">
              {t('welcomeBackNameFirst', { name: firstName })}
            </p>
            <span className="rounded-full bg-sand px-3 py-1 text-xs font-semibold text-ink-soft">
              {t('freelancerMode')}
            </span>
          </div>
        </header>

        <div className="mt-6 grid animate-fade-up gap-3 sm:grid-cols-[1.4fr_1fr]" style={{ animationDelay: '50ms' }}>
          <Link
            href="/projects"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-ember px-5 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-ember-deep"
          >
            <SearchIcon />
            {t('browseOffers')}
          </Link>
          <Link
            href="/dashboard/portfolio"
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-line bg-cream-deep px-5 py-3.5 text-sm font-bold text-ink transition hover:border-sand hover:bg-cream"
          >
            <PortfolioIcon />
            {t('managePortfolioCta')}
          </Link>
        </div>

        <div className="mt-6 grid animate-fade-up grid-cols-2 gap-3" style={{ animationDelay: '80ms' }}>
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
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-ember">
              <DocumentIcon />
            </div>
            <p className="text-sm text-ink-soft">{t('myApplications')}</p>
            <p className="mt-1 text-2xl font-bold text-ink">
              {isLoading ? '—' : String(stats.applications)}
            </p>
          </div>

          <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm sm:p-5">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
              <NuqatiIcon />
            </div>
            <p className="text-sm text-ink-soft">{t('nuqatiBalance')}</p>
            <p className="mt-1 text-2xl font-bold text-ink">
              {isLoading ? '—' : String(stats.nuqatiBalance)}
            </p>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold">
              <Link href="/dashboard/nuqati#nuqati-purchase" className="text-ember hover:underline">
                {t('buyNuqati')}
              </Link>
              <Link href="/dashboard/nuqati" className="text-ember hover:underline">
                {t('earnNuqati')}
              </Link>
              <Link href="/dashboard/nuqati/history" className="text-ink-soft hover:underline">
                {t('viewNuqatiLog')}
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm sm:p-5">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-palm">
              <CoinIcon />
            </div>
            <p className="text-sm text-ink-soft">{t('totalEarnings')}</p>
            <p className="mt-1 text-2xl font-bold text-ink">
              {isLoading ? '—' : formatCurrency(stats.earnings, 'LYD', locale)}
            </p>
          </div>
        </div>

        {!promoDismissed ? (
          <div
            className="relative mt-5 flex animate-fade-up items-start gap-3 overflow-hidden rounded-2xl border border-orange-200/70 bg-gradient-to-l from-orange-50 to-[#fff7ed] px-4 py-3.5"
            style={{ animationDelay: '120ms' }}
          >
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ember/10 text-ember">
              <StarIcon />
            </div>
            <div className="min-w-0 flex-1 pe-6">
              <p className="font-bold text-ink">{t('promoTitle')}</p>
              <p className="mt-0.5 text-sm text-ink-soft">{t('promoBody')}</p>
              <Link
                href="/dashboard/nuqati"
                className="mt-2 inline-block text-sm font-semibold text-ember hover:underline"
              >
                {t('promoCta')}
              </Link>
            </div>
            <button
              type="button"
              onClick={dismissPromo}
              className="absolute end-3 top-3 rounded-full p-1 text-ink-soft transition hover:bg-surface/80 hover:text-ink"
              aria-label={t('dismissPromo')}
            >
              <CloseIcon />
            </button>
          </div>
        ) : null}

        <section
          className="mt-5 animate-fade-up rounded-2xl border border-line bg-surface p-5 shadow-sm"
          style={{ animationDelay: '140ms' }}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ember/10 text-ember">
                <StarIcon />
              </span>
              <h2 className="text-lg font-bold text-ink">{t('completeSetup')}</h2>
            </div>
            <p className="text-sm font-semibold text-ink-soft">
              {t('setupPoints', {
                earned: setupTasks.earned,
                total: setupTasks.total,
              })}
            </p>
          </div>

          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-cream-deep">
            <div
              className="h-full rounded-full bg-ember transition-all duration-500"
              style={{
                width: `${Math.min(
                  100,
                  setupTasks.total > 0 ? (setupTasks.earned / setupTasks.total) * 100 : 0,
                )}%`,
              }}
            />
          </div>

          <ul className="mt-4 space-y-3">
            {(setupTasks.tasks.length > 0
              ? setupTasks.tasks
              : [
                  {
                    key: 'PROFILE_COMPLETE',
                    titleAr: t('completeProfileTitle'),
                    descriptionAr: t('completeProfileSubtitle'),
                    reward: 10,
                    category: 'profile',
                    progress: 0,
                    completed: false,
                  } satisfies NuqatiTask,
                ]
            ).map((task) => (
              <li key={task.key}>
                <Link
                  href={taskHref(task)}
                  className="flex items-center gap-3 rounded-xl border border-line bg-cream/70 px-3 py-3 transition hover:border-ember/30 hover:bg-orange-50/40"
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                      task.completed
                        ? 'bg-emerald-100 text-palm-deep'
                        : 'border-2 border-ember/40 bg-surface text-ember'
                    }`}
                  >
                    {task.completed ? <CheckIcon /> : <span className="h-2 w-2 rounded-full bg-ember" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`font-semibold ${
                        task.completed ? 'text-ink-soft line-through' : 'text-ink'
                      }`}
                    >
                      {task.titleAr}
                    </p>
                    <p className="mt-0.5 line-clamp-1 text-xs text-ink-soft">{task.descriptionAr}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${
                      task.completed
                        ? 'bg-sand text-ink-soft'
                        : 'bg-ember text-white'
                    }`}
                  >
                    {t('taskReward', { points: task.reward })}
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
            <p className="text-sm text-ink-soft">{t('setupUnlockHint')}</p>
            <Link
              href="/dashboard/nuqati"
              className="text-sm font-semibold text-ember hover:underline"
            >
              {t('viewAllTasks')}
            </Link>
          </div>
        </section>

        <section className="mt-8 animate-fade-up" style={{ animationDelay: '180ms' }}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-xl font-bold text-ink">{t('myApplications')}</h2>
            <Link
              href="/dashboard/proposals"
              className="text-sm font-semibold text-ember hover:underline"
            >
              {tCommon('viewAll')}
            </Link>
          </div>

          <div className="mb-4">
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink-soft shadow-sm">
              <BriefcaseIcon />
              {t('activeOffersFilter')}
              {!isLoading ? (
                <span className="rounded-full bg-cream-deep px-1.5 py-0.5 text-[10px]">
                  {displayProposals.length}
                </span>
              ) : null}
            </span>
          </div>

          {isLoading ? (
            <div className="rounded-2xl border border-line bg-surface p-8 text-center text-ink-soft">
              {tCommon('loadingPage')}
            </div>
          ) : recentProposals.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line bg-surface p-10 text-center">
              <p className="font-semibold text-ink">{t('noRecentProposals')}</p>
              <p className="mt-2 text-sm text-ink-soft">{t('noRecentProposalsHint')}</p>
              <Link
                href="/projects"
                className="mt-5 inline-flex rounded-xl bg-ember px-5 py-2.5 text-sm font-semibold text-white hover:bg-ember-deep"
              >
                {t('browseOffers')}
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {displayProposals.map((proposal) => {
                const pointsSpent =
                  (proposal.boostPoints ?? 0) > 0
                    ? proposal.boostPoints!
                    : (nuqati?.proposalCost ?? 10);
                return (
                  <Link
                    key={proposal.id}
                    href="/dashboard/proposals"
                    className="block rounded-2xl border border-line bg-surface p-4 shadow-sm transition hover:border-ember/35 sm:p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-bold text-ink">{proposal.project.title}</p>
                        <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-soft">
                          <span>
                            {formatCurrency(proposal.proposedPrice, proposal.project.currency || 'LYD', locale)}{' '}
                            ({t('proposalFixed')})
                          </span>
                          <span>{t('proposalDays', { count: proposal.estimatedDurationDays })}</span>
                          <span>{formatProposalDate(proposal.createdAt, locale)}</span>
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusTone(proposal.status)}`}
                        >
                          {statusLabel(proposal.status)}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-xs font-bold text-ember">
                          <NuqatiIcon />
                          {t('proposalPoints', { count: pointsSpent })}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
