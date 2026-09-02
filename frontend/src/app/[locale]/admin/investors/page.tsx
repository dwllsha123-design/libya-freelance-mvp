'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useAdminApi, type InvestorRow } from '@/hooks/use-admin';
import {
  AdminKpiCard,
  AdminPageHeader,
  AdminPanel,
} from '@/components/admin/admin-layout-ui';
import { AdminEmptyState } from '@/components/admin/admin-ui';
import { StatusBadge } from '@/components/admin/status-badge';

function money(n: number) {
  return `${n.toLocaleString('ar-LY')} د.ل`;
}

export default function AdminInvestorsPage() {
  const t = useTranslations('admin');
  const api = useAdminApi();
  const [rows, setRows] = useState<InvestorRow[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    api
      .listInvestors()
      .then((data) => {
        if (!cancelled) setRows(data);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : t('financeLoadFailed'));
      });
    return () => {
      cancelled = true;
    };
  }, [api, t]);

  const totals = useMemo(() => {
    if (!rows) return null;
    return {
      count: rows.length,
      investment: rows.reduce((s, r) => s + (r.investmentAmount || 0), 0),
      accrued: rows.reduce((s, r) => s + (r.accruedTotal || 0), 0),
      paid: rows.reduce((s, r) => s + (r.paidTotal || 0), 0),
      outstanding: rows.reduce((s, r) => s + (r.outstanding || 0), 0),
    };
  }, [rows]);

  return (
    <div className="space-y-6">
      <AdminPageHeader title={t('investors')} subtitle={t('investorsSubtitle')} />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {totals ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <AdminKpiCard label={t('investorCount')} value={totals.count} />
          <AdminKpiCard label={t('totalInvestment')} value={money(totals.investment)} />
          <AdminKpiCard label={t('statInvestorAccruals')} value={money(totals.accrued)} />
          <AdminKpiCard label={t('statInvestorPaid')} value={money(totals.paid)} />
          <AdminKpiCard label={t('statInvestorOutstanding')} value={money(totals.outstanding)} />
        </div>
      ) : null}

      <AdminPanel title={t('investors')}>
        {!rows?.length ? (
          <AdminEmptyState message={t('noInvestors')} />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-3 py-2 text-right">{t('investorName')}</th>
                  <th className="px-3 py-2 text-right">{t('investmentAmount')}</th>
                  <th className="px-3 py-2 text-right">{t('investorSharePercent')}</th>
                  <th className="px-3 py-2 text-right">{t('tableStatus')}</th>
                  <th className="px-3 py-2 text-right">{t('statInvestorAccruals')}</th>
                  <th className="px-3 py-2 text-right">{t('statInvestorPaid')}</th>
                  <th className="px-3 py-2 text-right">{t('statInvestorOutstanding')}</th>
                  <th className="px-3 py-2 text-right" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t">
                    <td className="px-3 py-2 font-medium">{row.name}</td>
                    <td className="px-3 py-2">{money(row.investmentAmount)}</td>
                    <td className="px-3 py-2">{row.sharePercentage}%</td>
                    <td className="px-3 py-2">
                      <StatusBadge
                        label={row.agreementStatus ?? (row.isActive ? 'ACTIVE' : 'INACTIVE')}
                        tone={row.isActive ? 'success' : 'neutral'}
                      />
                    </td>
                    <td className="px-3 py-2">{money(row.accruedTotal)}</td>
                    <td className="px-3 py-2">{money(row.paidTotal)}</td>
                    <td className="px-3 py-2">{money(row.outstanding)}</td>
                    <td className="px-3 py-2">
                      <Link href={`/admin/investors/${row.id}`} className="text-primary">
                        {t('view')}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminPanel>
    </div>
  );
}
