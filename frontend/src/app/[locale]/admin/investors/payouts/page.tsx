'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  useAdminApi,
  type InvestorPayoutRow,
  type InvestorRow,
} from '@/hooks/use-admin';
import { AdminPageHeader, AdminPanel } from '@/components/admin/admin-layout-ui';
import { AdminConfirmDialog, AdminEmptyState } from '@/components/admin/admin-ui';
import { StatusBadge } from '@/components/admin/status-badge';

function money(n: number | string) {
  return `${Number(n).toLocaleString('ar-LY')} د.ل`;
}

function payoutTone(status: string): 'success' | 'warning' | 'danger' | 'neutral' {
  if (status === 'PAID') return 'success';
  if (status === 'APPROVED') return 'warning';
  if (status === 'CANCELLED' || status === 'FAILED') return 'danger';
  return 'neutral';
}

type ConfirmKind = 'approve' | 'paid' | 'cancel';

export default function InvestorPayoutsPage() {
  const t = useTranslations('admin');
  const api = useAdminApi();
  const [rows, setRows] = useState<InvestorPayoutRow[] | null>(null);
  const [investors, setInvestors] = useState<InvestorRow[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState<{ id: string; kind: ConfirmKind } | null>(null);
  const [paymentReference, setPaymentReference] = useState('');
  const [notes, setNotes] = useState('');

  const [investorId, setInvestorId] = useState('');
  const [amount, setAmount] = useState('');
  const [createRef, setCreateRef] = useState('');
  const [createNotes, setCreateNotes] = useState('');

  async function reload() {
    const [payouts, inv] = await Promise.all([
      api.listInvestorPayouts(),
      api.listInvestors(),
    ]);
    setRows(payouts);
    setInvestors(inv);
  }

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.listInvestorPayouts(), api.listInvestors()])
      .then(([payouts, inv]) => {
        if (cancelled) return;
        setRows(payouts);
        setInvestors(inv);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : t('payoutsLoadFailed'));
      });
    return () => {
      cancelled = true;
    };
  }, [api, t]);

  async function createPayout(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.createInvestorPayout({
        investorId,
        amount: Number(amount),
        currency: 'LYD',
        paymentMethod: 'EXTERNAL',
        paymentReference: createRef.trim() || null,
        notes: createNotes.trim() || null,
      });
      setAmount('');
      setCreateRef('');
      setCreateNotes('');
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('payoutsSaveFailed'));
    } finally {
      setSaving(false);
    }
  }

  async function runConfirm() {
    if (!confirm) return;
    setSaving(true);
    setError('');
    try {
      if (confirm.kind === 'approve') await api.approveInvestorPayout(confirm.id);
      if (confirm.kind === 'cancel') await api.cancelInvestorPayout(confirm.id);
      if (confirm.kind === 'paid') {
        await api.markInvestorPayoutPaid(confirm.id, {
          paymentReference: paymentReference.trim() || null,
          notes: notes.trim() || null,
        });
      }
      setConfirm(null);
      setPaymentReference('');
      setNotes('');
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('payoutsSaveFailed'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader title={t('investorPayouts')} subtitle={t('investorPayoutsSubtitle')} />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <AdminPanel title={t('createPayout')}>
        <form onSubmit={createPayout} className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block">{t('investorName')}</span>
            <select
              required
              value={investorId}
              onChange={(e) => setInvestorId(e.target.value)}
              className="w-full rounded-xl border px-3 py-2"
            >
              <option value="">{t('selectInvestor')}</option>
              {investors.map((inv) => (
                <option key={inv.id} value={inv.id}>
                  {inv.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block">{t('payoutAmount')}</span>
            <input
              required
              type="number"
              min={0.01}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-xl border px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block">{t('paymentReference')}</span>
            <input
              value={createRef}
              onChange={(e) => setCreateRef(e.target.value)}
              className="w-full rounded-xl border px-3 py-2"
              placeholder={t('optional')}
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block">{t('payoutNotes')}</span>
            <input
              value={createNotes}
              onChange={(e) => setCreateNotes(e.target.value)}
              className="w-full rounded-xl border px-3 py-2"
              placeholder={t('optional')}
            />
          </label>
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-on-surface px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 sm:col-span-2"
          >
            {saving ? t('loading') : t('createPayout')}
          </button>
        </form>
      </AdminPanel>

      <AdminPanel title={t('payoutsList')}>
        {!rows ? (
          <p className="text-sm text-slate-500">{t('loading')}</p>
        ) : !rows.length ? (
          <AdminEmptyState message={t('noPayouts')} />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-right">{t('investorName')}</th>
                  <th className="px-3 py-2 text-right">{t('payoutAmount')}</th>
                  <th className="px-3 py-2 text-right">{t('tableStatus')}</th>
                  <th className="px-3 py-2 text-right">{t('paymentReference')}</th>
                  <th className="px-3 py-2 text-right">{t('tableAction')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t">
                    <td className="px-3 py-2">{row.investor?.name ?? row.investorId}</td>
                    <td className="px-3 py-2">{money(row.amount)}</td>
                    <td className="px-3 py-2">
                      <StatusBadge label={row.status} tone={payoutTone(row.status)} />
                    </td>
                    <td className="px-3 py-2 text-xs">{row.paymentReference ?? '—'}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-2">
                        {row.status === 'PENDING' ? (
                          <button
                            type="button"
                            className="text-xs text-primary"
                            onClick={() => setConfirm({ id: row.id, kind: 'approve' })}
                          >
                            {t('approvePayout')}
                          </button>
                        ) : null}
                        {row.status === 'PENDING' || row.status === 'APPROVED' ? (
                          <button
                            type="button"
                            className="text-xs text-emerald-700"
                            onClick={() => {
                              setPaymentReference(row.paymentReference ?? '');
                              setNotes(row.notes ?? '');
                              setConfirm({ id: row.id, kind: 'paid' });
                            }}
                          >
                            {t('markPayoutPaid')}
                          </button>
                        ) : null}
                        {row.status !== 'PAID' && row.status !== 'CANCELLED' ? (
                          <button
                            type="button"
                            className="text-xs text-red-600"
                            onClick={() => setConfirm({ id: row.id, kind: 'cancel' })}
                          >
                            {t('cancelPayout')}
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminPanel>

      {confirm?.kind === 'paid' ? (
        <AdminPanel title={t('markPayoutPaid')}>
          <div className="space-y-3">
            <label className="block text-sm">
              <span className="mb-1 block">{t('paymentReference')}</span>
              <input
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                className="w-full rounded-xl border px-3 py-2"
                required
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block">{t('payoutNotes')}</span>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-xl border px-3 py-2"
              />
            </label>
          </div>
        </AdminPanel>
      ) : null}

      <AdminConfirmDialog
        open={confirm !== null}
        title={
          confirm?.kind === 'approve'
            ? t('approvePayout')
            : confirm?.kind === 'paid'
              ? t('markPayoutPaid')
              : t('cancelPayout')
        }
        message={
          confirm?.kind === 'paid'
            ? t('markPayoutPaidConfirm')
            : confirm?.kind === 'cancel'
              ? t('cancelPayoutConfirm')
              : t('approvePayoutConfirm')
        }
        confirmLabel={t('confirmToggle')}
        isLoading={saving}
        onConfirm={() => void runConfirm()}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
