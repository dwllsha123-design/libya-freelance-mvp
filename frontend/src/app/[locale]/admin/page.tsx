'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import {
  useAdminApi,
  type AdminDashboardOverview,
  type DashboardRange,
} from '@/hooks/use-admin';
import {
  AdminAlertBanner,
  AdminBarChart,
  AdminKpiCard,
  AdminPageHeader,
  AdminPanel,
} from '@/components/admin/admin-layout-ui';
import { StatusBadge, projectStatusLabel, userStatusTone } from '@/components/admin/status-badge';

function money(n: number) {
  return `${n.toLocaleString('ar-LY')} د.ل`;
}

const RANGES: DashboardRange[] = ['7d', '30d', '3m', '6m', '12m'];

export default function AdminDashboardPage() {
  const t = useTranslations('admin');
  const api = useAdminApi();
  const [range, setRange] = useState<DashboardRange>('6m');
  const [stats, setStats] = useState<AdminDashboardOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .dashboard(range)
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch(() => {
        if (!cancelled) setError(t('statsLoadFailed'));
      });
    return () => {
      cancelled = true;
    };
  }, [api, t, range]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={t('dashboardTitle')}
        subtitle={t('dashboardSubtitle')}
        actions={
          <div className="flex flex-wrap gap-1 rounded-xl border bg-white p-1">
            {RANGES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-medium ${
                  range === r ? 'bg-on-surface text-white' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {t(`chartRange.${r}`)}
              </button>
            ))}
          </div>
        }
      />

      {error ? <p className="text-red-600">{error}</p> : null}

      {!stats ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl border bg-white" />
          ))}
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {stats.alerts.suspendedUsers > 0 ? (
              <AdminAlertBanner href="/admin/users?status=SUSPENDED" tone="warning">
                {t('alertSuspendedUsers', { count: stats.alerts.suspendedUsers })}
              </AdminAlertBanner>
            ) : null}
            {stats.alerts.openDisputes > 0 ? (
              <AdminAlertBanner href="/admin/disputes" tone="warning">
                {t('disputesAlert', { count: stats.alerts.openDisputes })}
              </AdminAlertBanner>
            ) : null}
            {stats.alerts.hiddenReviews > 0 ? (
              <AdminAlertBanner href="/admin/reviews" tone="info">
                {t('alertHiddenReviews', { count: stats.alerts.hiddenReviews })}
              </AdminAlertBanner>
            ) : null}
            {stats.alerts.bannedUsers > 0 ? (
              <AdminAlertBanner href="/admin/users?status=BANNED" tone="danger">
                {t('alertBannedUsers', { count: stats.alerts.bannedUsers })}
              </AdminAlertBanner>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <AdminKpiCard label={t('statTotalUsers')} value={stats.users.total} />
            <AdminKpiCard label={t('statFreelancers')} value={stats.users.freelancers} />
            <AdminKpiCard label={t('statClients')} value={stats.users.clients} />
            <AdminKpiCard label={t('statOpenProjects')} value={stats.projects.open} />
            <AdminKpiCard
              label={t('statInProgressProjects')}
              value={stats.projects.inProgress}
            />
            <AdminKpiCard
              label={t('statCompletedProjects')}
              value={stats.projects.completed}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <AdminKpiCard
              label={t('statTotalProjectValue')}
              value={money(stats.finance.totalProjectValue)}
            />
            <AdminKpiCard
              label={t('statTotalPlatformFees')}
              value={money(stats.finance.totalPlatformFees)}
            />
            <AdminKpiCard
              label={t('statMonthPlatformFees')}
              value={money(stats.finance.monthPlatformFees)}
            />
            <AdminKpiCard
              label={t('statInvestorAccruals')}
              value={money(stats.finance.investorAccrualsTotal)}
            />
            <AdminKpiCard
              label={t('statInvestorPaid')}
              value={money(stats.finance.investorPaidTotal)}
            />
            <AdminKpiCard
              label={t('statInvestorOutstanding')}
              value={money(stats.finance.investorOutstanding)}
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <AdminPanel title={t('chartUsersGrowth')}>
              <AdminBarChart
                labels={stats.trends.labels}
                values={stats.trends.users}
                emptyLabel={t('chartEmpty')}
              />
            </AdminPanel>
            <AdminPanel title={t('chartProjectsMonthly')}>
              <AdminBarChart
                labels={stats.trends.labels}
                values={stats.trends.projects}
                emptyLabel={t('chartEmpty')}
              />
            </AdminPanel>
            <AdminPanel title={t('chartCompletedProjects')}>
              <AdminBarChart
                labels={stats.trends.labels}
                values={stats.trends.completed}
                emptyLabel={t('chartEmpty')}
              />
            </AdminPanel>
            <AdminPanel title={t('chartPlatformRevenue')}>
              <AdminBarChart
                labels={stats.trends.labels}
                values={stats.trends.platformFees}
                emptyLabel={t('chartEmpty')}
                formatValue={(n) => n.toLocaleString('ar-LY')}
              />
            </AdminPanel>
            <AdminPanel title={t('chartOperationVolume')}>
              <AdminBarChart
                labels={stats.trends.labels}
                values={stats.trends.projectVolume}
                emptyLabel={t('chartEmpty')}
                formatValue={(n) => n.toLocaleString('ar-LY')}
              />
            </AdminPanel>
            <AdminPanel title={t('chartInvestorAccruals')}>
              <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-400">
                {stats.finance.investorAccrualsTotal > 0
                  ? money(stats.finance.investorAccrualsTotal)
                  : t('chartEmpty')}
              </div>
            </AdminPanel>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <AdminPanel
              title={t('recentUsers')}
              action={
                <Link href="/admin/users" className="text-xs text-primary">
                  {t('viewAll')}
                </Link>
              }
            >
              <ul className="divide-y">
                {stats.recent.users.map((u) => (
                  <li key={u.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <Link href={`/admin/users/${u.id}`} className="min-w-0 truncate font-medium hover:text-primary">
                      {u.name}
                    </Link>
                    <StatusBadge label={u.status} tone={userStatusTone(u.status)} />
                  </li>
                ))}
              </ul>
            </AdminPanel>

            <AdminPanel
              title={t('recentProjects')}
              action={
                <Link href="/admin/projects" className="text-xs text-primary">
                  {t('viewAll')}
                </Link>
              }
            >
              <ul className="divide-y">
                {stats.recent.projects.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <Link href={`/admin/projects/${p.id}`} className="min-w-0 truncate font-medium hover:text-primary">
                      {p.title}
                    </Link>
                    <span className="shrink-0 text-xs text-slate-500">
                      {projectStatusLabel(p.status, 'ar')}
                    </span>
                  </li>
                ))}
              </ul>
            </AdminPanel>

            <AdminPanel title={t('recentOperations')}>
              <ul className="divide-y">
                {stats.recent.escrows.length ? (
                  stats.recent.escrows.map((e) => (
                    <li key={e.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                      <Link
                        href={`/admin/projects/${e.projectId}`}
                        className="min-w-0 truncate font-medium hover:text-primary"
                      >
                        {e.projectTitle}
                      </Link>
                      <span className="shrink-0 text-xs text-slate-500">
                        {money(e.amount)} · {e.status}
                      </span>
                    </li>
                  ))
                ) : (
                  <li className="py-6 text-center text-sm text-slate-400">{t('noRecentOps')}</li>
                )}
              </ul>
            </AdminPanel>

            <AdminPanel
              title={t('recentReviews')}
              action={
                <Link href="/admin/reviews" className="text-xs text-primary">
                  {t('viewAll')}
                </Link>
              }
            >
              <ul className="divide-y">
                {stats.recent.reviews.length ? (
                  stats.recent.reviews.map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                      <Link
                        href={`/admin/projects/${r.projectId}`}
                        className="min-w-0 truncate font-medium hover:text-primary"
                      >
                        {r.projectTitle}
                      </Link>
                      <span className="shrink-0 text-xs text-slate-500">
                        {r.rating}/5 · {r.isVisible ? t('visible') : t('hidden')}
                      </span>
                    </li>
                  ))
                ) : (
                  <li className="py-6 text-center text-sm text-slate-400">{t('noReviews')}</li>
                )}
              </ul>
            </AdminPanel>

            <AdminPanel
              title={t('recentAdminActions')}
              action={
                <Link href="/admin/audit" className="text-xs text-primary">
                  {t('viewAll')}
                </Link>
              }
            >
              <ul className="divide-y">
                {stats.recent.audit.map((a) => (
                  <li key={a.id} className="py-2.5 text-sm">
                    <p className="font-medium">{a.action}</p>
                    <p className="text-xs text-slate-500">
                      {a.actorEmail} · {new Date(a.createdAt).toLocaleString('ar-LY')}
                    </p>
                  </li>
                ))}
              </ul>
            </AdminPanel>
          </div>
        </>
      )}
    </div>
  );
}
