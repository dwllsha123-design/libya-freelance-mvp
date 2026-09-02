'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useAdminApi, type InvestorDetail } from '@/hooks/use-admin';
import {
  AdminKpiCard,
  AdminPageHeader,
  AdminPanel,
} from '@/components/admin/admin-layout-ui';
import { StatusBadge } from '@/components/admin/status-badge';

function money(n: number) {
  return `${n.toLocaleString('ar-LY')} د.ل`;
}

export default function AdminInvestorDetailPage() {
  const t = useTranslations('admin');
  const { user } = useAuth();
  const api = useAdminApi();
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<InvestorDetail | null>(null);
  const [tab, setTab] = useState<'overview' | 'contract' | 'accruals'>('overview');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const isOwner = user?.role === 'SUPER_ADMIN';

  async function reload() {
    const row = await api.getInvestor(params.id);
    setData(row);
  }

  useEffect(() => {
    let cancelled = false;
    api
      .getInvestor(params.id)
      .then((row) => {
        if (!cancelled) setData(row);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : t('financeLoadFailed'));
      });
    return () => {
      cancelled = true;
    };
  }, [api, params.id, t]);

  async function terminate(e: FormEvent) {
    e.preventDefault();
    if (!isOwner || !data?.agreements[0]) return;
    if (!window.confirm(t('financeConfirmTerminateAgreement'))) return;
    try {
      await api.terminateInvestmentAgreement(data.agreements[0].id, {
        reason: reason || t('terminateAgreement'),
        confirm: true,
      });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('financeSaveFailed'));
    }
  }

  if (!data && !error) {
    return <div className="p-8 text-center text-slate-500">{t('loading')}</div>;
  }

  if (!data) {
    return <p className="text-red-600">{error}</p>;
  }

  const tabs = [
    { id: 'overview' as const, label: t('tabOverview') },
    { id: 'contract' as const, label: t('tabContract') },
    { id: 'accruals' as const, label: t('tabAccruals') },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={data.name}
        breadcrumb={
          <Link href="/admin/investors" className="hover:text-primary">
            {t('investors')}
          </Link>
        }
        actions={
          <StatusBadge
            label={data.agreementStatus ?? (data.isActive ? 'ACTIVE' : 'INACTIVE')}
            tone={data.isActive ? 'success' : 'neutral'}
          />
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <AdminKpiCard label={t('investmentAmount')} value={money(data.investmentAmount)} />
        <AdminKpiCard label={t('investorSharePercent')} value={`${data.sharePercentage}%`} />
        <AdminKpiCard label={t('statInvestorAccruals')} value={money(data.accruedTotal)} />
        <AdminKpiCard label={t('statInvestorPaid')} value={money(data.paidTotal)} />
        <AdminKpiCard label={t('statInvestorOutstanding')} value={money(data.outstanding)} />
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${
              tab === item.id ? 'bg-on-surface text-white' : 'border bg-white'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'overview' ? (
        <AdminPanel title={t('tabOverview')}>
          <div className="space-y-2 text-sm">
            <p>
              {t('investorName')}: {data.name}
            </p>
            <p>
              {t('tableEmail')}: {data.email ?? '—'}
            </p>
            {data.notes ? <p>{data.notes}</p> : null}
          </div>
        </AdminPanel>
      ) : null}

      {tab === 'contract' ? (
        <AdminPanel title={t('tabContract')}>
          <div className="space-y-3">
            {data.agreements.map((a) => (
              <div key={a.id} className="rounded-xl border px-4 py-3 text-sm">
                <p className="font-medium">
                  {a.sharePercentage}% · {money(a.investmentAmount)} · {a.status}
                </p>
                <p className="text-xs text-slate-500">
                  {t('effectiveFrom')}: {new Date(a.effectiveFrom).toLocaleString('ar-LY')}
                  {a.effectiveTo
                    ? ` → ${new Date(a.effectiveTo).toLocaleString('ar-LY')}`
                    : ''}
                </p>
                <p className="text-xs text-slate-500">
                  {t('revenueBase')}: {a.revenueBase}
                </p>
              </div>
            ))}
            {isOwner && data.agreements[0]?.status === 'ACTIVE' ? (
              <form onSubmit={(e) => void terminate(e)} className="space-y-2 border-t pt-4">
                <label className="block text-sm">
                  <span className="mb-1 block">{t('changeReason')}</span>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full rounded-xl border px-3 py-2"
                    rows={2}
                    required
                  />
                </label>
                <button
                  type="submit"
                  className="rounded-xl border border-red-200 px-4 py-2 text-sm text-red-600"
                >
                  {t('terminateAgreement')}
                </button>
              </form>
            ) : null}
          </div>
        </AdminPanel>
      ) : null}

      {tab === 'accruals' ? (
        <AdminPanel title={t('tabAccruals')}>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-right">{t('operationId')}</th>
                  <th className="px-3 py-2 text-right">{t('eligibleRevenue')}</th>
                  <th className="px-3 py-2 text-right">{t('investorSharePercent')}</th>
                  <th className="px-3 py-2 text-right">{t('accrualAmount')}</th>
                  <th className="px-3 py-2 text-right">{t('tableStatus')}</th>
                  <th className="px-3 py-2 text-right">{t('tableJoined')}</th>
                </tr>
              </thead>
              <tbody>
                {data.agreements.flatMap((a) =>
                  (a.accruals ?? []).map((row) => (
                    <tr key={row.id} className="border-t">
                      <td className="px-3 py-2 font-mono text-xs">{row.escrowId.slice(0, 8)}</td>
                      <td className="px-3 py-2">{money(row.platformCommissionAmount)}</td>
                      <td className="px-3 py-2">{row.sharePercentageSnapshot}%</td>
                      <td className="px-3 py-2">{money(row.accrualAmount)}</td>
                      <td className="px-3 py-2">{row.escrowStatus}</td>
                      <td className="px-3 py-2 text-xs">
                        {new Date(row.createdAt).toLocaleDateString('ar-LY')}
                      </td>
                    </tr>
                  )),
                )}
              </tbody>
            </table>
          </div>
        </AdminPanel>
      ) : null}
    </div>
  );
}
