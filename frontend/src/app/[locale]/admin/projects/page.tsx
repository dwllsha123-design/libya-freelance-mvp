'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useEffect, useState } from 'react';
import { AdminEmptyState, AdminPagination } from '@/components/admin/admin-ui';
import { StatusBadge, projectStatusLabel } from '@/components/admin/status-badge';
import { useAdminApi } from '@/hooks/use-admin';
import type { AppLocale } from '@/i18n/routing';

export default function AdminProjectsPage() {
  const t = useTranslations('admin');
  const locale = useLocale() as AppLocale;
  const api = useAdminApi();
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Awaited<ReturnType<typeof api.projects>> | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.projects({ page: String(page), limit: '20' }).then((result) => {
      if (!cancelled) setData(result);
    });
    return () => { cancelled = true; };
  }, [api, page]);

  return (
    <div className="min-w-0">
      <h1 className="text-2xl font-bold">{t('projects')}</h1>
      <div className="mt-6 overflow-x-auto rounded-xl border bg-white">
        {!data?.items.length ? (
          <AdminEmptyState message={t('noProjects')} />
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50"><tr>
              <th className="px-4 py-3 text-right">{t('tableTitle')}</th>
              <th className="px-4 py-3 text-right">{t('tableClient')}</th>
              <th className="px-4 py-3 text-right">{t('tableStatus')}</th>
              <th className="px-4 py-3 text-right">{t('tableProposals')}</th>
              <th className="px-4 py-3 text-right" />
            </tr></thead>
            <tbody>
              {data.items.map((p) => (
                <tr key={String(p.id)} className="border-t">
                  <td className="max-w-[12rem] truncate px-4 py-3">{String(p.title)}</td>
                  <td className="max-w-[10rem] truncate px-4 py-3">{String((p.client as { displayName?: string })?.displayName ?? '—')}</td>
                  <td className="px-4 py-3"><StatusBadge label={projectStatusLabel(String(p.status), locale)} tone="info" /></td>
                  <td className="px-4 py-3">{String(p.proposalCount)}</td>
                  <td className="px-4 py-3"><Link href={`/admin/projects/${p.id}`} className="text-primary">{t('view')}</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {data ? <AdminPagination page={page} totalPages={data.totalPages} onChange={setPage} /> : null}
    </div>
  );
}
