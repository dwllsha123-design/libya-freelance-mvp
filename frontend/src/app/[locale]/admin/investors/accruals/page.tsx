'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useAdminApi, type InvestorAccrualRow } from '@/hooks/use-admin';
import { AdminPageHeader, AdminPanel } from '@/components/admin/admin-layout-ui';
import { AdminEmptyState } from '@/components/admin/admin-ui';

function money(n: number) {
  return `${n.toLocaleString('ar-LY')} د.ل`;
}

export default function InvestorAccrualsPage() {
  const t = useTranslations('admin');
  const api = useAdminApi();
  const [rows, setRows] = useState<InvestorAccrualRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    api.listInvestorAccruals().then((data) => {
      if (!cancelled) setRows(data);
    });
    return () => {
      cancelled = true;
    };
  }, [api]);

  return (
    <div className="space-y-4">
      <AdminPageHeader title={t('investorAccruals')} subtitle={t('investorAccrualsSubtitle')} />
      <AdminPanel>
        {!rows.length ? (
          <AdminEmptyState message={t('noAccruals')} />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-right">{t('investorName')}</th>
                  <th className="px-3 py-2 text-right">{t('operationId')}</th>
                  <th className="px-3 py-2 text-right">{t('eligibleRevenue')}</th>
                  <th className="px-3 py-2 text-right">{t('investorSharePercent')}</th>
                  <th className="px-3 py-2 text-right">{t('accrualAmount')}</th>
                  <th className="px-3 py-2 text-right">{t('tableStatus')}</th>
                  <th className="px-3 py-2 text-right">{t('tableJoined')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t">
                    <td className="px-3 py-2">
                      <Link href={`/admin/investors/${row.investorId}`} className="text-primary">
                        {row.investorName}
                      </Link>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{row.escrowId.slice(0, 8)}</td>
                    <td className="px-3 py-2">{money(row.platformCommissionAmount)}</td>
                    <td className="px-3 py-2">{row.sharePercentage}%</td>
                    <td className="px-3 py-2">{money(row.accrualAmount)}</td>
                    <td className="px-3 py-2">{row.status}</td>
                    <td className="px-3 py-2 text-xs">
                      {new Date(row.createdAt).toLocaleDateString('ar-LY')}
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
