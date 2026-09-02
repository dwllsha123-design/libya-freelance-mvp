'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useAdminApi } from '@/hooks/use-admin';

export default function AdminDashboardPage() {
  const t = useTranslations('admin');
  const { user } = useAuth();
  const api = useAdminApi();
  const [stats, setStats] = useState<Awaited<ReturnType<typeof api.dashboard>> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    api
      .dashboard()
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch(() => {
        if (!cancelled) setError(t('statsLoadFailed'));
      });

    return () => {
      cancelled = true;
    };
  }, [api, t]);

  const statCards = stats
    ? [
        { label: t('statTotalUsers'), value: stats.users.total },
        { label: t('statFreelancers'), value: stats.users.freelancers },
        { label: t('statClients'), value: stats.users.clients },
        { label: t('statSuspendedUsers'), value: stats.users.suspended + stats.users.banned },
        { label: t('statTotalProjects'), value: stats.projects.total },
        { label: t('statOpenProjects'), value: stats.projects.open },
        { label: t('statInProgressProjects'), value: stats.projects.inProgress },
        { label: t('statCompletedProjects'), value: stats.projects.completed },
        { label: t('statTotalProposals'), value: stats.proposals.total },
        { label: t('statTotalReviews'), value: stats.reviews.total },
        { label: t('statOpenDisputes'), value: stats.escrow.openDisputes },
      ]
    : [];

  return (
    <div>
      <h1 className="text-3xl font-bold text-on-surface">{t('dashboard')}</h1>
      <p className="mt-2 text-sm text-slate-500">{t('dashboardWelcome', { email: user?.email ?? '' })}</p>

      {error ? <p className="mt-6 text-red-600">{error}</p> : null}

      {stats ? (
        <div className="mt-8 space-y-6">
          {stats.escrow.openDisputes > 0 ? (
            <Link
              href="/admin/disputes"
              className="block rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900 hover:bg-amber-100"
            >
              {t('disputesAlert', { count: stats.escrow.openDisputes })}
            </Link>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {statCards.map((card) => (
              <div key={card.label} className="rounded-xl border bg-white p-5">
                <p className="text-sm text-slate-500">{card.label}</p>
                <p className="mt-2 text-3xl font-bold text-on-surface">{card.value}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl border bg-white" />
          ))}
        </div>
      )}
    </div>
  );
}
