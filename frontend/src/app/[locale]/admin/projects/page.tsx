'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useEffect, useState } from 'react';
import { AdminEmptyState, AdminPagination } from '@/components/admin/admin-ui';
import { AdminPageHeader } from '@/components/admin/admin-layout-ui';
import { StatusBadge, projectStatusLabel } from '@/components/admin/status-badge';
import { useAdminApi } from '@/hooks/use-admin';
import type { AppLocale } from '@/i18n/routing';

const TABS = ['', 'DRAFT', 'OPEN', 'IN_PROGRESS', 'COMPLETED', 'CLOSED', 'CANCELLED'] as const;

export default function AdminProjectsPage() {
  const t = useTranslations('admin');
  const locale = useLocale() as AppLocale;
  const api = useAdminApi();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [data, setData] = useState<Awaited<ReturnType<typeof api.projects>> | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .projects({
        page: String(page),
        limit: '20',
        status: status || undefined,
      })
      .then((result) => {
        if (!cancelled) setData(result);
      });
    return () => {
      cancelled = true;
    };
  }, [api, page, status]);

  return (
    <div className="min-w-0 space-y-4">
      <AdminPageHeader title={t('projects')} subtitle={t('projectsSubtitle')} />

      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => {
          const label = tab ? t(`projectStatus.${tab}`) : t('tabAll');
          const active = status === tab;
          return (
            <button
              key={tab || 'all'}
              type="button"
              onClick={() => {
                setStatus(tab);
                setPage(1);
              }}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                active ? 'bg-on-surface text-white' : 'border bg-white text-slate-600'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="overflow-x-auto rounded-2xl border bg-white">
        {!data?.items.length ? (
          <AdminEmptyState message={t('noProjects')} />
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-right">{t('tableTitle')}</th>
                <th className="px-4 py-3 text-right">{t('tableClient')}</th>
                <th className="px-4 py-3 text-right">{t('tableCategory')}</th>
                <th className="px-4 py-3 text-right">{t('tableBudget')}</th>
                <th className="px-4 py-3 text-right">{t('tableProposals')}</th>
                <th className="px-4 py-3 text-right">{t('tableStatus')}</th>
                <th className="px-4 py-3 text-right">{t('tablePublished')}</th>
                <th className="px-4 py-3 text-right" />
              </tr>
            </thead>
            <tbody>
              {data.items.map((p) => {
                const client = p.client as { displayName?: string } | undefined;
                const category = p.category as { nameAr?: string } | undefined;
                return (
                  <tr key={String(p.id)} className="border-t">
                    <td className="max-w-[12rem] truncate px-4 py-3 font-medium">
                      {String(p.title)}
                    </td>
                    <td className="max-w-[10rem] truncate px-4 py-3">
                      {String(client?.displayName ?? '—')}
                    </td>
                    <td className="px-4 py-3">{String(category?.nameAr ?? '—')}</td>
                    <td className="px-4 py-3 text-xs">
                      {p.budgetMin != null || p.budgetMax != null
                        ? `${String(p.budgetMin ?? '—')} – ${String(p.budgetMax ?? '—')} د.ل`
                        : '—'}
                    </td>
                    <td className="px-4 py-3">{String(p.proposalCount)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        label={projectStatusLabel(String(p.status), locale)}
                        tone="info"
                      />
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {p.publishedAt
                        ? new Date(String(p.publishedAt)).toLocaleDateString('ar-LY')
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/projects/${p.id}`} className="text-primary">
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
