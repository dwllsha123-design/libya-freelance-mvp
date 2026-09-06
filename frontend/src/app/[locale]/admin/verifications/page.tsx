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
  fullNameAsOnId: string | null;
  nationalIdLast4: string | null;
  submittedAt: string | null;
  rejectionReason: string | null;
  documentCount: number;
  user: {
    id: string;
    email: string;
    displayName: string | null;
    username: string | null;
  };
};

export default function AdminVerificationsPage() {
  const t = useTranslations('admin');
  const locale = useLocale() as AppLocale;
  const { accessToken } = useAuth();
  const [status, setStatus] = useState('PENDING');
  const [items, setItems] = useState<Row[]>([]);
  const [selected, setSelected] = useState<Row & { documents?: Array<{ id: string }> } | null>(
    null,
  );
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load(nextStatus = status) {
    if (!accessToken) return;
    const data = await authenticatedRequest<{ items: Row[] }>(
      `/admin/verifications?status=${encodeURIComponent(nextStatus)}&limit=50`,
      accessToken,
    );
    setItems(data.items);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        await load();
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
  }, [accessToken, status]);

  async function open(id: string) {
    if (!accessToken) return;
    const detail = await authenticatedRequest<Row & { documents?: Array<{ id: string }> }>(
      `/admin/verifications/${id}`,
      accessToken,
    );
    setSelected(detail);
  }

  async function act(path: string, body?: object) {
    if (!accessToken || !selected) return;
    setError(null);
    try {
      await authenticatedRequest(`/admin/verifications/${selected.id}/${path}`, accessToken, {
        method: 'POST',
        body: body ? JSON.stringify(body) : JSON.stringify({}),
      });
      await load();
      await open(selected.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : getApiErrorMessage(locale));
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('identityVerifications')}</h1>
        <p className="text-sm text-on-surface-variant">{t('identityVerificationsHint')}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {['PENDING', 'VERIFIED', 'REJECTED', 'SUSPENDED'].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s)}
            className={`rounded-lg px-3 py-1.5 text-sm ${
              status === s ? 'bg-primary text-on-primary' : 'border border-outline-variant/50'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {loading ? <p>{t('loading')}</p> : null}

      <div className="overflow-x-auto rounded-xl border border-outline-variant/40">
        <table className="min-w-full text-sm">
          <thead className="bg-surface-container/60 text-start">
            <tr>
              <th className="px-3 py-2">User</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Submitted</th>
              <th className="px-3 py-2">Docs</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr key={row.id} className="border-t border-outline-variant/30">
                <td className="px-3 py-2">
                  <div>{row.user.displayName ?? row.user.email}</div>
                  <div className="text-xs text-on-surface-variant">{row.user.email}</div>
                </td>
                <td className="px-3 py-2">{row.status}</td>
                <td className="px-3 py-2">{row.submittedAt?.slice(0, 10) ?? '—'}</td>
                <td className="px-3 py-2">{row.documentCount}</td>
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
          <p className="text-sm">Name on ID: {selected.fullNameAsOnId}</p>
          <p className="text-sm">Last4: {selected.nationalIdLast4}</p>
          <div className="flex flex-wrap gap-2">
            {(selected.documents ?? []).map((doc) => (
              <a
                key={doc.id}
                className="text-sm text-primary underline"
                href={`${process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? ''}/admin/verifications/${selected.id}/documents/${doc.id}`}
                target="_blank"
                rel="noreferrer"
              >
                Document
              </a>
            ))}
          </div>
          <textarea
            className="w-full rounded-lg border border-outline-variant/50 bg-transparent px-3 py-2 text-sm"
            placeholder="Rejection / suspend reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-lg bg-emerald-700 px-3 py-1.5 text-sm text-white"
              onClick={() => void act('approve')}
            >
              Approve
            </button>
            <button
              type="button"
              className="rounded-lg bg-amber-700 px-3 py-1.5 text-sm text-white"
              onClick={() =>
                void act('request-resubmission', { rejectionReason: reason || 'يرجى إعادة تقديم المستندات' })
              }
            >
              Request resubmission
            </button>
            <button
              type="button"
              className="rounded-lg bg-red-700 px-3 py-1.5 text-sm text-white"
              onClick={() => void act('reject', { rejectionReason: reason || 'مرفوض' })}
            >
              Reject
            </button>
            <button
              type="button"
              className="rounded-lg border border-outline-variant px-3 py-1.5 text-sm"
              onClick={() => void act('suspend', { reason: reason || 'تعليق التوثيق' })}
            >
              Suspend
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
