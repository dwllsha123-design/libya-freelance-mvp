'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import {
  AdminEmptyState,
  AdminPagination,
  AdminSearch,
} from '@/components/admin/admin-ui';
import { AdminPageHeader } from '@/components/admin/admin-layout-ui';
import { StatusBadge, userStatusTone } from '@/components/admin/status-badge';
import { useAdminApi } from '@/hooks/use-admin';

export default function AdminClientsPage() {
  const t = useTranslations('admin');
  const api = useAdminApi();
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Awaited<ReturnType<typeof api.users>> | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .users({ page: String(page), limit: '20', q: q || undefined, role: 'CLIENT' })
      .then((r) => {
        if (!cancelled) setData(r);
      });
    return () => {
      cancelled = true;
    };
  }, [api, page, q]);

  return (
    <div className="space-y-4">
      <AdminPageHeader title={t('clients')} subtitle={t('clientsSubtitle')} />
      <AdminSearch
        value={q}
        onChange={(v) => {
          setQ(v);
          setPage(1);
        }}
        placeholder={t('searchUsers')}
      />
      <div className="overflow-x-auto rounded-2xl border bg-white">
        {!data?.items.length ? (
          <AdminEmptyState message={t('noUsers')} />
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-right">{t('tableClient')}</th>
                <th className="px-4 py-3 text-right">{t('projectsPosted')}</th>
                <th className="px-4 py-3 text-right">{t('rating')}</th>
                <th className="px-4 py-3 text-right">{t('tableJoined')}</th>
                <th className="px-4 py-3 text-right">{t('tableStatus')}</th>
                <th className="px-4 py-3 text-right">{t('tableAction')}</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((u) => {
                const cl = u.client as Record<string, unknown> | null;
                return (
                  <tr key={String(u.id)} className="border-t">
                    <td className="px-4 py-3">
                      <p className="font-medium">{String(u.displayName ?? '—')}</p>
                      <p className="text-xs text-slate-500">{String(u.email)}</p>
                    </td>
                    <td className="px-4 py-3">
                      {String(cl?.projectsPosted ?? u.projectsPosted ?? 0)}
                    </td>
                    <td className="px-4 py-3">{String(cl?.averageRating ?? 0)}</td>
                    <td className="px-4 py-3 text-xs">
                      {new Date(String(u.createdAt)).toLocaleDateString('ar-LY')}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        label={String(u.status)}
                        tone={userStatusTone(String(u.status))}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/users/${u.id}`} className="text-primary">
                        {t('view')}
                      </Link>
                    </td>
                  </tr>
                );
              })}
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
