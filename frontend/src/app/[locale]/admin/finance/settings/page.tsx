'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import {
  useAdminApi,
  type FinanceSettingsDashboard,
} from '@/hooks/use-admin';

export default function FinanceSettingsPage() {
  const t = useTranslations('admin');
  const api = useAdminApi();
  const [data, setData] = useState<FinanceSettingsDashboard | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const [categoryId, setCategoryId] = useState('');
  const [categoryPercent, setCategoryPercent] = useState('');
  const [categoryFrom, setCategoryFrom] = useState('');
  const [categoryReason, setCategoryReason] = useState('');

  const [projectId, setProjectId] = useState('');
  const [projectPercent, setProjectPercent] = useState('');
  const [projectFrom, setProjectFrom] = useState('');
  const [projectReason, setProjectReason] = useState('');

  const [investorName, setInvestorName] = useState('');
  const [investorId, setInvestorId] = useState('');
  const [sharePercent, setSharePercent] = useState('');
  const [investmentAmount, setInvestmentAmount] = useState('');
  const [returnCap, setReturnCap] = useState('');
  const [agreementFrom, setAgreementFrom] = useState('');
  const [agreementReason, setAgreementReason] = useState('');

  async function reload() {
    const result = await api.financeSettings();
    setData(result);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await api.financeSettings();
        if (!cancelled) setData(result);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : t('financeLoadFailed'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api, t]);

  async function saveCategory(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await api.setCategoryCommission(categoryId, {
        commissionPercentage: categoryPercent === '' ? null : Number(categoryPercent),
        effectiveFrom: new Date(categoryFrom).toISOString(),
        reason: categoryReason,
      });
      setCategoryReason('');
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('financeSaveFailed'));
    }
  }

  async function saveProjectOverride(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!window.confirm(t('financeConfirmProjectOverride'))) return;
    try {
      await api.setProjectCommissionOverride(projectId, {
        commissionPercentage: Number(projectPercent),
        effectiveFrom: new Date(projectFrom).toISOString(),
        reason: projectReason,
        confirm: true,
      });
      setProjectReason('');
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('financeSaveFailed'));
    }
  }

  async function createInvestor(e: FormEvent) {
    e.preventDefault();
    try {
      const created = (await api.createInvestor({ name: investorName })) as {
        id: string;
      };
      setInvestorId(created.id);
      setInvestorName('');
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('financeSaveFailed'));
    }
  }

  async function createAgreement(e: FormEvent) {
    e.preventDefault();
    if (!window.confirm(t('financeConfirmInvestorShare'))) return;
    try {
      await api.createInvestmentAgreement({
        investorId,
        investmentAmount: Number(investmentAmount),
        sharePercentage: Number(sharePercent),
        revenueBase: 'PLATFORM_COMMISSION',
        effectiveFrom: new Date(agreementFrom).toISOString(),
        returnCap: returnCap ? Number(returnCap) : null,
        reason: agreementReason,
        confirm: true,
      });
      setAgreementReason('');
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('financeSaveFailed'));
    }
  }

  async function terminateAgreement(id: string) {
    const reason = window.prompt(t('changeReason'));
    if (!reason) return;
    if (!window.confirm(t('financeConfirmTerminateAgreement'))) return;
    try {
      await api.terminateInvestmentAgreement(id, { reason, confirm: true });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('financeSaveFailed'));
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-slate-500">{t('loading')}</div>;
  }

  return (
    <div className="space-y-8" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold">{t('financeSettings')}</h1>
        <p className="mt-1 text-sm text-slate-600">{t('financeSettingsHint')}</p>
        <Link
          href="/admin/finance/commission-settings"
          className="mt-2 inline-block text-sm text-primary"
        >
          {t('commissionSettings')}
        </Link>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <section className="rounded-xl border bg-white p-5">
        <h2 className="font-semibold">{t('platformCommission')}</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 text-sm">
          <div className="rounded-lg border p-3">
            <p className="text-xs text-slate-500">{t('currentValue')}</p>
            <p className="text-lg font-bold">
              {data?.platformCommission.current
                ? `${data.platformCommission.current.defaultCommissionPercentage}%`
                : '—'}
            </p>
            {data?.platformCommission.current ? (
              <p className="mt-1 text-xs text-slate-500">
                {t('effectiveFrom')}:{' '}
                {new Date(data.platformCommission.current.effectiveFrom).toLocaleString('ar-LY')}
                <br />
                {t('changedBy')}: {data.platformCommission.current.changedBy ?? '—'}
              </p>
            ) : null}
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-slate-500">{t('scheduledValue')}</p>
            <p className="text-lg font-bold">
              {data?.platformCommission.scheduled
                ? `${data.platformCommission.scheduled.defaultCommissionPercentage}%`
                : t('noneScheduled')}
            </p>
            {data?.platformCommission.scheduled ? (
              <p className="mt-1 text-xs text-slate-500">
                {t('effectiveFrom')}:{' '}
                {new Date(data.platformCommission.scheduled.effectiveFrom).toLocaleString('ar-LY')}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="rounded-xl border bg-white p-5 space-y-4">
        <h2 className="font-semibold">{t('categoryOverrides')}</h2>
        <form onSubmit={(e) => void saveCategory(e)} className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <input
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            placeholder={t('categoryId')}
            className="rounded border px-3 py-2 text-sm"
            required
          />
          <input
            value={categoryPercent}
            onChange={(e) => setCategoryPercent(e.target.value)}
            placeholder={t('categoryCommission')}
            className="rounded border px-3 py-2 text-sm"
          />
          <input
            type="datetime-local"
            value={categoryFrom}
            onChange={(e) => setCategoryFrom(e.target.value)}
            className="rounded border px-3 py-2 text-sm"
            required
          />
          <input
            value={categoryReason}
            onChange={(e) => setCategoryReason(e.target.value)}
            placeholder={t('changeReason')}
            className="rounded border px-3 py-2 text-sm"
            required
          />
          <button type="submit" className="rounded bg-primary px-4 py-2 text-sm text-white sm:col-span-2 lg:col-span-4">
            {t('saveCategoryOverride')}
          </button>
        </form>
        <div className="space-y-2">
          {(data?.categoryOverrides ?? []).map((row) => (
            <div key={row.id} className="rounded-lg border px-3 py-2 text-sm">
              <p className="font-medium">
                {row.categoryNameAr}: {row.commissionPercentage}%
              </p>
              <p className="text-xs text-slate-500">
                {t('effectiveFrom')}: {new Date(row.effectiveFrom).toLocaleString('ar-LY')} —{' '}
                {row.changedBy ?? '—'}
              </p>
            </div>
          ))}
          {!data?.categoryOverrides.length ? (
            <p className="text-sm text-slate-500">{t('noCategoryOverrides')}</p>
          ) : null}
        </div>
      </section>

      <section className="rounded-xl border bg-white p-5 space-y-4">
        <h2 className="font-semibold">{t('dealOverrides')}</h2>
        <form onSubmit={(e) => void saveProjectOverride(e)} className="grid gap-2 sm:grid-cols-2">
          <input
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            placeholder={t('projectId')}
            className="rounded border px-3 py-2 text-sm"
            required
          />
          <input
            value={projectPercent}
            onChange={(e) => setProjectPercent(e.target.value)}
            placeholder={t('projectOverride')}
            className="rounded border px-3 py-2 text-sm"
            required
          />
          <input
            type="datetime-local"
            value={projectFrom}
            onChange={(e) => setProjectFrom(e.target.value)}
            className="rounded border px-3 py-2 text-sm"
            required
          />
          <input
            value={projectReason}
            onChange={(e) => setProjectReason(e.target.value)}
            placeholder={t('changeReason')}
            className="rounded border px-3 py-2 text-sm"
            required
          />
          <button type="submit" className="rounded bg-primary px-4 py-2 text-sm text-white sm:col-span-2">
            {t('saveProjectOverride')}
          </button>
        </form>
        <div className="space-y-2">
          {(data?.dealOverrides ?? []).map((row) => (
            <div key={row.id} className="rounded-lg border px-3 py-2 text-sm">
              <p className="font-medium">
                {row.projectTitle}: {row.commissionPercentage}%
              </p>
              <p className="text-xs text-slate-500">{row.reason}</p>
            </div>
          ))}
          {!data?.dealOverrides.length ? (
            <p className="text-sm text-slate-500">{t('noDealOverrides')}</p>
          ) : null}
        </div>
      </section>

      <section className="rounded-xl border bg-white p-5 space-y-4">
        <h2 className="font-semibold">{t('investorAgreements')}</h2>
        <p className="text-xs text-slate-500">{t('revenueBaseHint')}</p>
        <form onSubmit={(e) => void createInvestor(e)} className="flex flex-wrap gap-2">
          <input
            value={investorName}
            onChange={(e) => setInvestorName(e.target.value)}
            placeholder={t('investorName')}
            className="rounded border px-3 py-2 text-sm"
            required
          />
          <button type="submit" className="rounded border px-4 py-2 text-sm">
            {t('addInvestor')}
          </button>
        </form>
        <form onSubmit={(e) => void createAgreement(e)} className="grid gap-2 sm:grid-cols-2">
          <input
            value={investorId}
            onChange={(e) => setInvestorId(e.target.value)}
            placeholder={t('investorId')}
            className="rounded border px-3 py-2 text-sm"
            required
          />
          <input
            value={sharePercent}
            onChange={(e) => setSharePercent(e.target.value)}
            placeholder={t('investorSharePercent')}
            className="rounded border px-3 py-2 text-sm"
            required
          />
          <input
            value={investmentAmount}
            onChange={(e) => setInvestmentAmount(e.target.value)}
            placeholder={t('investmentAmount')}
            className="rounded border px-3 py-2 text-sm"
            required
          />
          <input
            value={returnCap}
            onChange={(e) => setReturnCap(e.target.value)}
            placeholder={t('returnCap')}
            className="rounded border px-3 py-2 text-sm"
          />
          <input
            type="datetime-local"
            value={agreementFrom}
            onChange={(e) => setAgreementFrom(e.target.value)}
            className="rounded border px-3 py-2 text-sm"
            required
          />
          <input
            value={agreementReason}
            onChange={(e) => setAgreementReason(e.target.value)}
            placeholder={t('changeReason')}
            className="rounded border px-3 py-2 text-sm"
            required
          />
          <p className="text-xs text-slate-500 sm:col-span-2">{t('revenueBaseHint')}</p>
          <button type="submit" className="rounded bg-primary px-4 py-2 text-sm text-white sm:col-span-2">
            {t('saveInvestorAgreement')}
          </button>
        </form>
        <div className="space-y-2">
          {(data?.investorAgreements ?? []).map((row) => (
            <div
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm"
            >
              <div>
                <p className="font-medium">
                  {row.investorName}: {row.sharePercentage}% — {row.status}
                </p>
                <p className="text-xs text-slate-500">
                  {t('revenueBase')}: {t('revenueBasePlatformCommission')} · {t('returnCap')}:{' '}
                  {row.returnCap ?? '—'}
                </p>
              </div>
              {row.status === 'ACTIVE' || row.status === 'SCHEDULED' ? (
                <button
                  type="button"
                  onClick={() => void terminateAgreement(row.id)}
                  className="text-sm text-red-600"
                >
                  {t('terminateAgreement')}
                </button>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border bg-white p-5">
        <h2 className="font-semibold">{t('futureFeeSettings')}</h2>
        <div className="mt-3 space-y-2">
          {(data?.futureFeeSettings ?? []).map((row) => (
            <div key={row.id} className="rounded-lg border px-3 py-2 text-sm">
              <p className="font-medium">{row.labelAr}</p>
              <p className="text-xs text-slate-500">{row.notes}</p>
              <pre className="mt-1 overflow-x-auto text-xs text-slate-600">
                {JSON.stringify(row.value, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border bg-white p-5">
        <h2 className="font-semibold">{t('commercialAudit')}</h2>
        <div className="mt-3 space-y-2">
          {(data?.recentAudit ?? []).map((row) => (
            <div key={row.id} className="rounded-lg border px-3 py-2 text-xs">
              <p className="font-medium">
                {row.action} — {row.actorEmail}
              </p>
              <p className="text-slate-500">
                {new Date(row.createdAt).toLocaleString('ar-LY')}
                {row.reason ? ` · ${row.reason}` : ''}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
