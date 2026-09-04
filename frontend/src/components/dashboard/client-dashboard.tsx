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

function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent: string;
}) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-ink-soft">{label}</p>
          <p className="mt-2 text-2xl font-bold text-ink">{value}</p>
        </div>
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${accent}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function BriefcaseIcon() {
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

  return (
    <div className="page-gutter mx-auto max-w-6xl py-8 sm:py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink">{t('title')}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <p className="text-ink-soft">{t('welcomeBackNameFirst', { name: firstName })}</p>
            <span className="rounded-full bg-sand px-3 py-1 text-xs font-semibold text-ink-soft">
              {t('clientMode')}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void handleSwitchToFreelancer()}
            disabled={isSwitching}
            className="inline-flex items-center gap-2 rounded-xl border border-line bg-cream-deep px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-cream disabled:opacity-60"
          >
            <SwapIcon />
            {isSwitching ? t('switchingRole') : t('switchToFreelancer')}
          </button>
          <Link
            href="/freelancers"
            className="rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-semibold text-ink hover:border-sand"
          >
            {t('findTalent')}
          </Link>
          <Link
            href="/dashboard/projects/new"
            className="inline-flex items-center gap-2 rounded-xl bg-ember px-4 py-2.5 text-sm font-semibold text-white hover:bg-ember-deep"
          >
            <span className="text-lg leading-none">+</span>
            {t('postProject')}
          </Link>
        </div>
      </div>
      {switchError ? <p className="mt-3 text-sm text-error">{switchError}</p> : null}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t('publishedProjects')}
          value={isLoading ? tCommon('loading') : String(stats.published)}
          accent="bg-orange-100 text-ember"
          icon={<BriefcaseIcon />}
        />
        <StatCard
          label={t('activeContracts')}
          value={isLoading ? tCommon('loading') : String(stats.activeContracts)}
          accent="bg-blue-100 text-blue-600"
          icon={<ClockIcon />}
        />
        <StatCard
          label={t('totalSpent')}
          value={isLoading ? tCommon('loading') : formatCurrency(stats.totalSpend, 'LYD', locale)}
          accent="bg-emerald-100 text-palm"
          icon={<CoinIcon />}
        />
        <StatCard
          label={t('proposalsReceived')}
          value={isLoading ? tCommon('loading') : String(stats.proposalsReceived)}
          accent="bg-violet-100 text-violet-600"
          icon={<PeopleIcon />}
        />
      </div>

      <section className="mt-10">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-display text-xl font-bold text-ink">{t('myPublishedProjects')}</h2>
          <Link
            href="/dashboard/projects"
            className="text-sm font-semibold text-ember hover:underline"
          >
            {tCommon('viewAll')}
          </Link>
        </div>

        {isLoading ? (
          <div className="rounded-2xl border border-line bg-surface p-10 text-center text-ink-soft">
            {tCommon('loadingPage')}
          </div>
        ) : publishedProjects.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-surface p-12 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-cream-deep text-ink-soft">
              <BriefcaseIcon />
            </div>
            <p className="font-semibold text-ink">{t('noPublishedYet')}</p>
            <p className="mt-2 text-sm text-ink-soft">{t('noPublishedHint')}</p>
            <Link
              href="/dashboard/projects/new"
              className="mt-6 inline-flex rounded-xl bg-ember px-5 py-2.5 text-sm font-semibold text-white hover:bg-ember-deep"
            >
              {t('postProject')}
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {publishedProjects.slice(0, 5).map((project) => (
              <Link
                key={project.id}
                href={`/dashboard/projects/${project.id}/proposals`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-5 transition-colors hover:border-ember/40"
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

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/dashboard/escrow" className="rounded-xl border border-line bg-surface p-5 hover:border-ember/40">
          <p className="font-semibold text-ink">{t('escrowLog')}</p>
          <p className="mt-1 text-sm text-ink-soft">{t('escrowLogHint')}</p>
        </Link>
        <Link href="/messages" className="rounded-xl border border-line bg-surface p-5 hover:border-ember/40">
          <p className="font-semibold text-ink">{t('messages')}</p>
          <p className="mt-1 text-sm text-ink-soft">{t('messagesHintClient')}</p>
        </Link>
        <Link href="/dashboard/profile" className="rounded-xl border border-line bg-surface p-5 hover:border-ember/40">
          <p className="font-semibold text-ink">{t('profile')}</p>
          <p className="mt-1 text-sm text-ink-soft">{t('profileHintClient')}</p>
        </Link>
      </div>
    </div>
  );
}
