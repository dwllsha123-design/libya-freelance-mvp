'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/contexts/auth-context';
import { authenticatedRequest, getApiErrorMessage } from '@/lib/api';
import { useLocale } from 'next-intl';
import type { AppLocale } from '@/i18n/routing';

type Row = {
  id: string;
  status: string;
  startedAt: string | null;
  expiresAt: string | null;
  identityVerified: boolean;
  verificationStatus: string;
  plan?: { nameAr: string; price: number; currency: string };
  payment?: { id: string; status: string; amount: number } | null;
  user: {
    id: string;
    email: string;
    displayName: string | null;
    username: string | null;
  };
};

export default function AdminSubscriptionsPage() {
  const t = useTranslations('admin');
  const locale = useLocale() as AppLocale;
  const { accessToken } = useAuth();
  const [items, setItems] = useState<Row[]>([]);
  const [selected, setSelected] = useState<Row | null>(null);
  const [reason, setReason] = useState('');
  const [extraDays, setExtraDays] = useState(30);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');

  async function load(search = q) {
    if (!accessToken) return;
    const data = await authenticatedRequest<{ items: Row[] }>(
      `/admin/subscriptions?limit=50${search ? `&q=${encodeURIComponent(search)}` : ''}`,
      accessToken,
    );
    setItems(data.items);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await load();
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : getApiErrorMessage(locale));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  async function open(id: string) {
    if (!accessToken) return;
    const detail = await authenticatedRequest<Row>(`/admin/subscriptions/${id}`, accessToken);
    setSelected(detail);
  }

  async function act(path: string, body: object) {
    if (!accessToken || !selected) return;
    setError(null);
    try {
      const detail = await authenticatedRequest<Row>(
        `/admin/subscriptions/${selected.id}/${path}`,
        accessToken,
        { method: 'POST', body: JSON.stringify(body) },
      );
      setSelected(detail);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : getApiErrorMessage(locale));
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('proSubscriptions')}</h1>
        <p className="text-sm text-on-surface-variant">{t('proSubscriptionsHint')}</p>
      </div>

      <div className="flex gap-2">
        <input
          className="flex-1 rounded-lg border border-outline-variant/50 bg-transparent px-3 py-2 text-sm"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t('search')}
        />
        <button
          type="button"
          className="rounded-lg bg-primary px-3 py-2 text-sm text-on-primary"
          onClick={() => void load()}
        >
          {t('search')}
        </button>
      </div>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <div className="overflow-x-auto rounded-xl border border-outline-variant/40">
        <table className="min-w-full text-sm">
          <thead className="bg-surface-container/60 text-start">
            <tr>
              <th className="px-3 py-2">User</th>
              <th className="px-3 py-2">Verification</th>
              <th className="px-3 py-2">Plan</th>
              <th className="px-3 py-2">Price</th>
              <th className="px-3 py-2">Started</th>
              <th className="px-3 py-2">Expires</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Payment</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr key={row.id} className="border-t border-outline-variant/30">
                <td className="px-3 py-2">{row.user.displayName ?? row.user.email}</td>
                <td className="px-3 py-2">
                  {row.identityVerified ? 'Verified' : row.verificationStatus}
                </td>
                <td className="px-3 py-2">{row.plan?.nameAr ?? '—'}</td>
                <td className="px-3 py-2">
                  {row.plan ? `${row.plan.price} ${row.plan.currency}` : '—'}
                </td>
                <td className="px-3 py-2">{row.startedAt?.slice(0, 10) ?? '—'}</td>
                <td className="px-3 py-2">{row.expiresAt?.slice(0, 10) ?? '—'}</td>
                <td className="px-3 py-2">{row.status}</td>
                <td className="px-3 py-2">{row.payment?.status ?? '—'}</td>
                <td className="px-3 py-2">
                  <button type="button" className="text-primary underline" onClick={() => void open(row.id)}>
                    {t('view')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected ? (
        <div className="space-y-3 rounded-xl border border-outline-variant/40 bg-surface p-4">
          <h2 className="font-semibold">{selected.user.displayName ?? selected.user.email}</h2>
          <p className="text-sm">Status: {selected.status}</p>
          <p className="text-sm">Expires: {selected.expiresAt}</p>
          <label className="block text-sm">
            Extra days
            <input
              type="number"
              min={1}
              className="mt-1 w-full rounded-lg border border-outline-variant/50 bg-transparent px-3 py-2"
              value={extraDays}
              onChange={(e) => setExtraDays(Number(e.target.value))}
            />
          </label>
          <textarea
            className="w-full rounded-lg border border-outline-variant/50 bg-transparent px-3 py-2 text-sm"
            placeholder="Reason (required for admin actions)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-lg bg-primary px-3 py-1.5 text-sm text-on-primary"
              onClick={() => void act('extend', { reason, extraDays })}
            >
              Extend
            </button>
            <button
              type="button"
              className="rounded-lg border px-3 py-1.5 text-sm"
              onClick={() => void act('suspend', { reason })}
            >
              Suspend
            </button>
            <button
              type="button"
              className="rounded-lg bg-red-700 px-3 py-1.5 text-sm text-white"
              onClick={() => void act('cancel', { reason })}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
