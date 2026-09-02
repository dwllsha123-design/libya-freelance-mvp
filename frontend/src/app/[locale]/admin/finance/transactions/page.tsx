'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useAdminApi, type AdminDashboardOverview } from '@/hooks/use-admin';
import {
  AdminComingSoon,
  AdminPageHeader,
  AdminPanel,
} from '@/components/admin/admin-layout-ui';
import { AdminEmptyState } from '@/components/admin/admin-ui';

function money(n: number) {
  return `${n.toLocaleString('ar-LY')} د.ل`;
}

export default function FinanceTransactionsPage() {
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
    <div className="space-y-4">
      <AdminPageHeader
        title={t('financeTransactions')}
        subtitle={t('financeTransactionsSubtitle')}
      />
      <AdminPanel title={t('recentOperations')}>
        {!stats?.recent.escrows.length ? (
          <AdminEmptyState message={t('noRecentOps')} />
        ) : (
          <ul className="divide-y">
            {stats.recent.escrows.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <Link href={`/admin/projects/${e.projectId}`} className="font-medium text-primary">
                  {e.projectTitle}
                </Link>
                <span className="text-xs text-slate-500">
                  {money(e.amount)} · {e.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </AdminPanel>
      <AdminComingSoon
        title={t('ledgerPlaceholderTitle')}
        description={t('ledgerPlaceholderDesc')}
      />
    </div>
  );
}
