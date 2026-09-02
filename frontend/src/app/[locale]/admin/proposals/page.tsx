'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { AdminEmptyState, AdminPagination } from '@/components/admin/admin-ui';
import { AdminPageHeader } from '@/components/admin/admin-layout-ui';
import { StatusBadge } from '@/components/admin/status-badge';
import { useAdminApi } from '@/hooks/use-admin';

const STATUSES = ['', 'PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN'] as const;

export default function AdminProposalsPage() {
  const t = useTranslations('admin');
  const api = useAdminApi();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [data, setData] = useState<Awaited<ReturnType<typeof api.proposals>> | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .proposals({
        page: String(page),
        limit: '20',
        status: status || undefined,
      })
      .then((r) => {
        if (!cancelled) setData(r);
      });
    return () => {
      cancelled = true;
    };
  }, [api, page, status]);

  return (
    <div className="min-w-0 space-y-4">
      <AdminPageHeader title={t('proposals')} subtitle={t('proposalsNote')} />
      <div className="flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <button
            key={s || 'all'}
            type="button"
            onClick={() => {
              setStatus(s);
              setPage(1);
            }}
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${
              status === s ? 'bg-on-surface text-white' : 'border bg-white'
            }`}
          >
            {s || t('tabAll')}
          </button>
        ))}
      </div>
      <div className="overflow-x-auto rounded-2xl border bg-white">
        {!data?.items.length ? (
          <AdminEmptyState message={t('noProposals')} />
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-right">{t('tableFreelancer')}</th>
                <th className="px-4 py-3 text-right">{t('tableProject')}</th>
                <th className="px-4 py-3 text-right">{t('tablePrice')}</th>
                <th className="px-4 py-3 text-right">{t('tableDuration')}</th>
                <th className="px-4 py-3 text-right">{t('tableStatus')}</th>
                <th className="px-4 py-3 text-right">{t('tableJoined')}</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((p) => (
                <tr key={String(p.id)} className="border-t">
                  <td className="max-w-[10rem] truncate px-4 py-3">
                    {String((p.freelancer as { displayName?: string })?.displayName ?? '—')}
                  </td>
                  <td className="max-w-[12rem] truncate px-4 py-3">
                    {String((p.project as { title?: string })?.title ?? '—')}
                  </td>
                  <td className="px-4 py-3">{String(p.proposedPrice)} د.ل</td>
                  <td className="px-4 py-3">{String(p.estimatedDurationDays ?? '—')}</td>
                  <td className="px-4 py-3">
                    <StatusBadge label={String(p.status)} tone="info" />
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {p.createdAt
                      ? new Date(String(p.createdAt)).toLocaleDateString('ar-LY')
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {data ? (
        <AdminPagination page={page} totalPages={data.totalPages} onChange={setPage} />
      ) : null}
    </div>
  );
}
