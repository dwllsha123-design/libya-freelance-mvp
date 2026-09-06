'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useAuth } from '@/contexts/auth-context';
import { authenticatedRequest, getApiErrorMessage } from '@/lib/api';
import { useLocale } from 'next-intl';
import type { AppLocale } from '@/i18n/routing';
import { formatCurrency } from '@/lib/currency';

type AdminAgreementRow = {
  id: string;
  status: string;
  project: { id: string; title: string; slug: string; status: string };
  client: { id: string; displayName: string | null; email?: string };
  freelancer: { id: string; displayName: string | null; email?: string };
  amount: number | null;
  currency: string;
  versionNumber: number | null;
  escrowStatus: string | null;
  paymentStatus: string | null;
  createdAt: string;
};

type AdminAgreementDetail = AdminAgreementRow & {
  timeline: Array<{ id: string; action: string; createdAt: string; actorId: string | null }>;
  versions: Array<{
    id: string;
    versionNumber: number;
    grossAmount: number;
    platformFee: number;
    freelancerNet: number;
    createdAt: string;
    acceptances: Array<{ role: string; acceptedAt: string }>;
  }>;
  currentVersion?: {
    versionNumber: number;
    title: string;
    grossAmount: number;
    scope: string;
  } | null;
};

export default function AdminProjectAgreementsPage() {
  const t = useTranslations('admin');
  const tAgreements = useTranslations('agreements');
  const locale = useLocale() as AppLocale;
  const { accessToken } = useAuth();
  const [items, setItems] = useState<AdminAgreementRow[]>([]);
  const [selected, setSelected] = useState<AdminAgreementDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  async function loadList(search = q) {
    if (!accessToken) throw new Error(getApiErrorMessage(locale, 'unauthorized'));
    const data = await authenticatedRequest<{ items: AdminAgreementRow[] }>(
      `/admin/project-agreements?limit=50${search ? `&q=${encodeURIComponent(search)}` : ''}`,
      accessToken,
    );
    setItems(data.items);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setIsLoading(true);
        await loadList();
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : t('statsLoadFailed'));
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  async function openDetail(id: string) {
    if (!accessToken) return;
    setError(null);
    try {
      const detail = await authenticatedRequest<AdminAgreementDetail>(
        `/admin/project-agreements/${id}`,
        accessToken,
      );
      setSelected(detail);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('statsLoadFailed'));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t('projectAgreements')}</h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            {t('projectAgreementsHint')}
          </p>
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void loadList(q);
          }}
        >
          <input
            className="rounded-lg border px-3 py-2 text-sm"
            placeholder={t('search')}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button type="submit" className="rounded-lg border px-3 py-2 text-sm">
            {t('search')}
          </button>
        </form>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {isLoading ? <p className="text-sm">{t('loading')}</p> : null}

      <div className="overflow-x-auto rounded-xl border border-outline-variant/40">
        <table className="min-w-full text-start text-sm">
          <thead className="bg-surface-container/50 text-xs uppercase tracking-wide text-on-surface-variant">
            <tr>
              <th className="px-3 py-2 font-medium">ID</th>
              <th className="px-3 py-2 font-medium">{t('projects')}</th>
              <th className="px-3 py-2 font-medium">{t('clients')}</th>
              <th className="px-3 py-2 font-medium">{t('freelancers')}</th>
              <th className="px-3 py-2 font-medium">{tAgreements('amount')}</th>
              <th className="px-3 py-2 font-medium">{tAgreements('version', { number: '' }).trim()}</th>
              <th className="px-3 py-2 font-medium">{tAgreements('status')}</th>
              <th className="px-3 py-2 font-medium">Escrow</th>
              <th className="px-3 py-2 font-medium">{t('view')}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr key={row.id} className="border-t border-outline-variant/30">
                <td className="px-3 py-2 font-mono text-xs">{row.id.slice(0, 8)}</td>
                <td className="px-3 py-2">
                  <Link href={`/admin/projects/${row.project.id}`} className="text-primary underline">
                    {row.project.title}
                  </Link>
                </td>
                <td className="px-3 py-2">{row.client.displayName ?? row.client.email ?? '—'}</td>
                <td className="px-3 py-2">
                  {row.freelancer.displayName ?? row.freelancer.email ?? '—'}
                </td>
                <td className="px-3 py-2">
                  {row.amount != null
                    ? formatCurrency(row.amount, row.currency, locale)
                    : '—'}
                </td>
                <td className="px-3 py-2">{row.versionNumber ?? '—'}</td>
                <td className="px-3 py-2">
                  {tAgreements(`statuses.${row.status}` as 'statuses.APPROVED')}
                </td>
                <td className="px-3 py-2">{row.escrowStatus ?? '—'}</td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    className="text-primary underline"
                    onClick={() => void openDetail(row.id)}
                  >
                    {t('view')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!isLoading && items.length === 0 ? (
          <p className="p-4 text-sm text-on-surface-variant">{t('noProjectAgreements')}</p>
        ) : null}
      </div>

      {selected ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-surface p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">{selected.project.title}</h2>
                <p className="text-xs text-on-surface-variant font-mono">{selected.id}</p>
              </div>
              <button type="button" className="text-sm" onClick={() => setSelected(null)}>
                ✕
              </button>
            </div>

            <p className="mt-3 text-sm">
              {tAgreements('status')}:{' '}
              {tAgreements(`statuses.${selected.status}` as 'statuses.APPROVED')}
            </p>

            <h3 className="mt-5 font-semibold">{tAgreements('timeline')}</h3>
            <ol className="mt-2 space-y-2 border-s ps-4 text-sm">
              {selected.timeline.map((event) => (
                <li key={event.id}>
                  {tAgreements(
                    `timelineActions.${event.action}` as 'timelineActions.AGREEMENT_CREATED',
                  )}
                  <span className="ms-2 text-xs text-on-surface-variant">
                    {new Date(event.createdAt).toLocaleString(
                      locale === 'ar' ? 'ar-LY' : 'en-LY',
                    )}
                  </span>
                </li>
              ))}
            </ol>

            <h3 className="mt-5 font-semibold">{t('versions')}</h3>
            <ul className="mt-2 space-y-2 text-sm">
              {selected.versions.map((version) => (
                <li key={version.id} className="rounded-lg border px-3 py-2">
                  <p className="font-medium">
                    {tAgreements('version', { number: version.versionNumber })} ·{' '}
                    {formatCurrency(version.grossAmount, selected.currency, locale)}
                  </p>
                  <p className="text-xs text-on-surface-variant">
                    fee {formatCurrency(version.platformFee, selected.currency, locale)} · net{' '}
                    {formatCurrency(version.freelancerNet, selected.currency, locale)} ·
                    acceptances {version.acceptances.length}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}
