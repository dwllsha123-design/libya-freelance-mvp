'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useAuth } from '@/contexts/auth-context';
import { authenticatedRequest, getApiErrorMessage } from '@/lib/api';
import type { AppLocale } from '@/i18n/routing';
import { AdminPagination } from '@/components/admin/admin-ui';

type PaymentRow = {
  id: string;
  purpose: string;
  status: string;
  amount: number;
  currency: string;
  provider: string;
  createdAt: string;
  client?: {
    email: string;
    displayName?: string | null;
    username?: string | null;
  } | null;
};

export default function AdminPaymentsPage() {
  const t = useTranslations('admin');
  const tCommon = useTranslations('common');
  const locale = useLocale() as AppLocale;
  const { accessToken } = useAuth();
  const [items, setItems] = useState<PaymentRow[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [purpose, setPurpose] = useState('');
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load(nextPage = page) {
    if (!accessToken) return;
    const params = new URLSearchParams({
      page: String(nextPage),
      limit: '20',
    });
    if (purpose) params.set('purpose', purpose);
    if (status) params.set('status', status);
    if (q.trim()) params.set('q', q.trim());
    const data = await authenticatedRequest<{
      items: PaymentRow[];
      page: number;
      limit: number;
      total: number;
    }>(`/admin/payments?${params.toString()}`, accessToken);
    setItems(data.items);
    setPage(data.page);
    setTotalPages(Math.max(1, Math.ceil(data.total / (data.limit || 20))));
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        await load(1);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : getApiErrorMessage(locale));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('commercialPayments')}</h1>
        <p className="text-sm text-on-surface-variant">{t('commercialPaymentsHint')}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          className="rounded-lg border px-3 py-2 text-sm"
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
        >
          <option value="">{t('allPurposes')}</option>
          <option value="SUBSCRIPTION">SUBSCRIPTION</option>
          <option value="POINTS_PURCHASE">POINTS_PURCHASE</option>
        </select>
        <select
          className="rounded-lg border px-3 py-2 text-sm"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">{t('allStatuses')}</option>
          <option value="PENDING">PENDING</option>
          <option value="PROCESSING">PROCESSING</option>
          <option value="SUCCEEDED">SUCCEEDED</option>
          <option value="FAILED">FAILED</option>
        </select>
        <input
          className="flex-1 rounded-lg border px-3 py-2 text-sm"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t('search')}
        />
        <button
          type="button"
          className="rounded-lg bg-primary px-3 py-2 text-sm text-white"
          onClick={() => void load(1).catch((err) => setError(err instanceof Error ? err.message : getApiErrorMessage(locale)))}
        >
          {t('search')}
        </button>
      </div>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      {loading ? (
        <p className="text-slate-500">{tCommon('loadingPage')}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="min-w-full text-sm">
            <thead className="bg-surface-container/60 text-start">
              <tr>
                <th className="px-3 py-2">User</th>
                <th className="px-3 py-2">Purpose</th>
                <th className="px-3 py-2">Amount</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Provider</th>
                <th className="px-3 py-2">Created</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="px-3 py-2">
                    {row.client?.displayName ?? row.client?.email ?? '—'}
                  </td>
                  <td className="px-3 py-2">{row.purpose}</td>
                  <td className="px-3 py-2">
                    {row.amount} {row.currency}
                  </td>
                  <td className="px-3 py-2">{row.status}</td>
                  <td className="px-3 py-2">{row.provider}</td>
                  <td className="px-3 py-2">{row.createdAt?.slice(0, 19) ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AdminPagination page={page} totalPages={totalPages} onChange={(p) => void load(p)} />
    </div>
  );
}
