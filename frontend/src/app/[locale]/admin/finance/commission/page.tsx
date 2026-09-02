'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import {
  useAdminApi,
  type CommissionPreviewResult,
  type FinanceSettingsDashboard,
  type PlatformCommissionPolicy,
} from '@/hooks/use-admin';
import { useAuth } from '@/contexts/auth-context';
import {
  AdminComingSoon,
  AdminPageHeader,
  AdminPanel,
} from '@/components/admin/admin-layout-ui';

export default function CommissionControlPage() {
  const t = useTranslations('admin');
  const { user } = useAuth();
  const api = useAdminApi();
  const isOwner = user?.role === 'SUPER_ADMIN';
  const [history, setHistory] = useState<PlatformCommissionPolicy[]>([]);
  const [dashboard, setDashboard] = useState<FinanceSettingsDashboard | null>(null);
  const [percent, setPercent] = useState('10');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState('');
  const [reason, setReason] = useState('');
  const [previewValue, setPreviewValue] = useState('1000');
  const [investorShare, setInvestorShare] = useState('15');
  const [preview, setPreview] = useState<CommissionPreviewResult | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  async function reload() {
    const [rows, settings] = await Promise.all([
      api.commissionHistory(),
      api.financeSettings(),
    ]);
    setHistory(rows);
    setDashboard(settings);
    const current = rows.find((r) => r.status === 'ACTIVE');
    if (current) setPercent(String(current.defaultCommissionPercentage));
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await reload();
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : t('financeLoadFailed'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, t]);

  const exampleReady = useMemo(
    () => Number(previewValue) > 0 && Number(percent) >= 0,
    [previewValue, percent],
  );

  async function runPreview() {
    if (!exampleReady) return;
    try {
      const result = await api.previewCommission({
        projectValue: Number(previewValue),
        commissionPercent: Number(percent),
        investorSharePercent: Number(investorShare || 0),
        minimumCommissionAmount: minAmount ? Number(minAmount) : null,
        maximumCommissionAmount: maxAmount ? Number(maxAmount) : null,
      });
      setPreview(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('financeLoadFailed'));
    }
  }

  useEffect(() => {
    if (!isOwner || !exampleReady) return;
    const timer = window.setTimeout(() => {
      void runPreview();
    }, 300);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOwner, exampleReady, previewValue, percent, investorShare, minAmount, maxAmount]);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!isOwner) {
      setError(t('superAdminOnlyAction'));
      return;
    }
    setError('');
    if (!reason.trim() || !effectiveFrom) {
      setError(t('financeMissingFields'));
      return;
    }
    if (!window.confirm(t('financeConfirmCommission'))) return;
    setSaving(true);
    try {
      await runPreview();
      await api.scheduleCommission({
        defaultCommissionPercentage: Number(percent),
        minimumCommissionAmount: minAmount ? Number(minAmount) : null,
        maximumCommissionAmount: maxAmount ? Number(maxAmount) : null,
        effectiveFrom: new Date(effectiveFrom).toISOString(),
        reason: reason.trim(),
        confirm: true,
      });
      setReason('');
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('financeSaveFailed'));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-slate-500">{t('loading')}</div>;
  }

  const current = dashboard?.platformCommission.current;
  const scheduled = dashboard?.platformCommission.scheduled;

  return (
    <div className="space-y-6" dir="rtl">
      <AdminPageHeader
        title={t('commissionPageTitle')}
        subtitle={t('commissionPageSubtitle')}
        actions={
          <Link href="/admin/finance" className="text-sm text-primary">
            {t('financeOverview')}
          </Link>
        }
      />

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <AdminPanel title={t('currentCommissionCard')}>
          <p className="text-4xl font-bold text-on-surface">
            {current ? `${current.defaultCommissionPercentage}%` : '—'}
          </p>
          {current ? (
            <p className="mt-2 text-xs text-slate-500">
              {t('effectiveFrom')}: {new Date(current.effectiveFrom).toLocaleString('ar-LY')}
              <br />
              {t('changedBy')}: {current.changedBy ?? '—'}
            </p>
          ) : null}
        </AdminPanel>
        <AdminPanel title={t('scheduledValue')}>
          <p className="text-4xl font-bold text-on-surface">
            {scheduled ? `${scheduled.defaultCommissionPercentage}%` : t('noneScheduled')}
          </p>
          {scheduled ? (
            <p className="mt-2 text-xs text-slate-500">
              {t('effectiveFrom')}: {new Date(scheduled.effectiveFrom).toLocaleString('ar-LY')}
            </p>
          ) : null}
        </AdminPanel>
      </div>

      {isOwner ? (
        <form onSubmit={(e) => void onSave(e)} className="space-y-4 rounded-2xl border bg-white p-5">
          <h2 className="font-semibold">{t('editCommission')}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block text-slate-600">{t('defaultCommission')}</span>
              <input
                type="number"
                min={0}
                max={100}
                step="0.01"
                value={percent}
                onChange={(e) => setPercent(e.target.value)}
                className="w-full rounded-xl border px-3 py-2"
                required
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-slate-600">{t('effectiveFrom')}</span>
              <input
                type="datetime-local"
                value={effectiveFrom}
                onChange={(e) => setEffectiveFrom(e.target.value)}
                className="w-full rounded-xl border px-3 py-2"
                required
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-slate-600">{t('minCommissionAmount')}</span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
                className="w-full rounded-xl border px-3 py-2"
                placeholder={t('optional')}
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-slate-600">{t('maxCommissionAmount')}</span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
                className="w-full rounded-xl border px-3 py-2"
                placeholder={t('optional')}
              />
            </label>
          </div>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">{t('changeReason')}</span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-xl border px-3 py-2"
              rows={3}
              required
            />
          </label>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <h3 className="font-medium">{t('commissionPreview')}</h3>
            <p className="mt-2 text-xs leading-relaxed text-amber-950/80">
              {t('commissionPreviewFormula')}
            </p>
            <p className="mt-1 text-xs text-amber-900/70">{t('revenueBaseHint')}</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <label className="text-sm">
                <span className="mb-1 block">{t('projectValueExample')}</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={previewValue}
                  onChange={(e) => setPreviewValue(e.target.value)}
                  className="w-full rounded-xl border bg-white px-3 py-2"
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block">{t('investorSharePercent')}</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  value={investorShare}
                  onChange={(e) => setInvestorShare(e.target.value)}
                  className="w-full rounded-xl border bg-white px-3 py-2"
                />
              </label>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => void runPreview()}
                  className="w-full rounded-xl border border-amber-300 bg-white px-4 py-2 text-sm"
                >
                  {t('runPreview')}
                </button>
              </div>
            </div>
            {preview ? (
              <ol className="mt-4 space-y-2 text-sm text-slate-800">
                <li className="flex justify-between gap-3 border-b border-amber-200/80 pb-2">
                  <span>{t('previewProjectValue')}</span>
                  <span className="font-medium tabular-nums">
                    {preview.projectValue} {preview.currency}
                  </span>
                </li>
                <li className="flex justify-between gap-3 border-b border-amber-200/80 pb-2">
                  <span>
                    {t('previewPlatformFee')} ({preview.commissionPercent}%)
                  </span>
                  <span className="font-medium tabular-nums">
                    {preview.platformCommission} {preview.currency}
                  </span>
                </li>
                <li className="flex justify-between gap-3 border-b border-amber-200/80 pb-2">
                  <span>{t('previewFreelancerPayout')}</span>
                  <span className="font-medium tabular-nums">
                    {preview.freelancerPayout} {preview.currency}
                  </span>
                </li>
                <li className="flex justify-between gap-3 border-b border-amber-200/80 pb-2">
                  <span>
                    {t('previewInvestorAccrual')} ({preview.investorSharePercent}%)
                  </span>
                  <span className="font-medium tabular-nums">
                    {preview.investorAccrual} {preview.currency}
                  </span>
                </li>
                <li className="flex justify-between gap-3 pt-1">
                  <span>{t('previewPlatformRemaining')}</span>
                  <span className="font-semibold tabular-nums">
                    {preview.platformRemainingBeforeExpenses} {preview.currency}
                  </span>
                </li>
              </ol>
            ) : null}
          </div>

          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-on-surface px-5 py-2.5 text-sm text-white disabled:opacity-60"
          >
            {saving ? t('saving') : t('saveCommissionVersion')}
          </button>
        </form>
      ) : (
        <AdminComingSoon title={t('superAdminOnlyAction')} description={t('commissionSettingsHint')} />
      )}

      <AdminPanel title={t('categoryOverrides')}>
        <div className="space-y-2">
          {(dashboard?.categoryOverrides ?? []).map((row) => (
            <div key={row.id} className="rounded-xl border px-3 py-2 text-sm">
              <p className="font-medium">
                {row.categoryNameAr}: {row.commissionPercentage ?? t('defaultCommission')}%
              </p>
            </div>
          ))}
          {!dashboard?.categoryOverrides.length ? (
            <p className="text-sm text-slate-500">{t('noCategoryOverrides')}</p>
          ) : null}
        </div>
      </AdminPanel>

      <AdminPanel title={t('commissionVersions')}>
        <p className="mb-3 text-xs text-slate-500">{t('commissionVersionsHint')}</p>
        <div className="space-y-2">
          {history.map((row) => (
            <div
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-3 text-sm"
            >
              <div>
                <p className="font-medium">
                  {row.defaultCommissionPercentage}% — {row.status}
                </p>
                <p className="text-xs text-slate-500">
                  {t('effectiveFrom')}: {new Date(row.effectiveFrom).toLocaleString('ar-LY')}
                  {row.effectiveTo
                    ? ` → ${new Date(row.effectiveTo).toLocaleString('ar-LY')}`
                    : ''}
                </p>
                {row.reason ? <p className="text-xs text-slate-600">{row.reason}</p> : null}
              </div>
              <p className="text-xs text-slate-500">{row.changedBy ?? '—'}</p>
            </div>
          ))}
        </div>
      </AdminPanel>
    </div>
  );
}
