'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useAdminApi, type AdminDashboardOverview } from '@/hooks/use-admin';
import {
  AdminBarChart,
  AdminKpiCard,
  AdminPageHeader,
  AdminPanel,
} from '@/components/admin/admin-layout-ui';

function money(n: number) {
  return `${n.toLocaleString('ar-LY')} د.ل`;
}

export default function FinanceOverviewPage() {
  const t = useTranslations('admin');
  const api = useAdminApi();
  const [stats, setStats] = useState<AdminDashboardOverview | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.dashboard().then((d) => {
      if (!cancelled) setStats(d);
    });
    return () => {
      cancelled = true;
    };
  }, [api]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={t('financePageTitle')}
        subtitle={t('financePageSubtitle')}
        actions={
          <Link href="/admin/finance/commission" className="rounded-xl bg-on-surface px-4 py-2 text-sm text-white">
            {t('commissionSettings')}
          </Link>
        }
      />

      {!stats ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl border bg-white" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <AdminKpiCard label={t('statTotalProjectValue')} value={money(stats.finance.totalProjectValue)} />
            <AdminKpiCard label={t('statTotalPlatformFees')} value={money(stats.finance.totalPlatformFees)} />
            <AdminKpiCard label={t('statMonthPlatformFees')} value={money(stats.finance.monthPlatformFees)} />
            <AdminKpiCard label={t('statInvestorAccruals')} value={money(stats.finance.investorAccrualsTotal)} />
            <AdminKpiCard label={t('statInvestorPaid')} value={money(stats.finance.investorPaidTotal)} />
            <AdminKpiCard label={t('statInvestorOutstanding')} value={money(stats.finance.investorOutstanding)} />
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            <AdminPanel title={t('chartPlatformRevenue')}>
              <AdminBarChart
                labels={stats.trends.labels}
                values={stats.trends.platformFees}
                emptyLabel={t('chartEmpty')}
              />
            </AdminPanel>
            <AdminPanel title={t('chartOperationVolume')}>
              <AdminBarChart
                labels={stats.trends.labels}
                values={stats.trends.projectVolume}
                emptyLabel={t('chartEmpty')}
              />
            </AdminPanel>
          </div>
        </>
      )}
    </div>
  );
}
