'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useAdminApi, type FinanceSettingsDashboard } from '@/hooks/use-admin';
import { AdminPageHeader, AdminPanel } from '@/components/admin/admin-layout-ui';
import { AdminEmptyState } from '@/components/admin/admin-ui';
import { StatusBadge } from '@/components/admin/status-badge';

function money(n: number) {
  return `${n.toLocaleString('ar-LY')} د.ل`;
}

export default function InvestorAgreementsPage() {
  const t = useTranslations('admin');
  const api = useAdminApi();
  const [data, setData] = useState<FinanceSettingsDashboard | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    api
      .financeSettings()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : t('financeLoadFailed'));
      });
    return () => {
      cancelled = true;
    };
  }, [api, t]);

  const agreements = data?.investorAgreements ?? [];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={t('investmentAgreements')}
        subtitle={t('investmentAgreementsSubtitle')}
        actions={
          <Link
            href="/admin/finance/settings"
            className="rounded-xl border px-3 py-2 text-sm hover:bg-slate-50"
          >
            {t('financeSettingsLink')}
          </Link>
        }
      />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <AdminPanel title={t('investmentAgreements')}>
        {!data ? (
          <p className="text-sm text-slate-500">{t('loading')}</p>
        ) : !agreements.length ? (
          <AdminEmptyState message={t('noAgreements')} />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-right">{t('investorName')}</th>
                  <th className="px-3 py-2 text-right">{t('investmentAmount')}</th>
                  <th className="px-3 py-2 text-right">{t('investorSharePercent')}</th>
                  <th className="px-3 py-2 text-right">{t('effectiveFrom')}</th>
                  <th className="px-3 py-2 text-right">{t('tableStatus')}</th>
                  <th className="px-3 py-2 text-right">{t('tableAction')}</th>
                </tr>
              </thead>
              <tbody>
                {agreements.map((row) => (
                  <tr key={row.id} className="border-t">
                    <td className="px-3 py-2 font-medium">{row.investorName}</td>
                    <td className="px-3 py-2">{money(row.investmentAmount)}</td>
                    <td className="px-3 py-2">{row.sharePercentage}%</td>
                    <td className="px-3 py-2 text-xs">
                      {new Date(row.effectiveFrom).toLocaleDateString('ar-LY')}
                    </td>
                    <td className="px-3 py-2">
                      <StatusBadge
                        label={row.status}
                        tone={row.status === 'ACTIVE' ? 'success' : 'neutral'}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Link
                        href={`/admin/investors/${row.investorId}`}
                        className="text-primary"
                      >
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
      <p className="text-xs text-slate-500">{t('investmentAgreementsHint')}</p>
    </div>
  );
}
