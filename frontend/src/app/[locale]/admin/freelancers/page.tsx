'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import {
  AdminEmptyState,
  AdminPagination,
  AdminSearch,
} from '@/components/admin/admin-ui';
import { AdminComingSoon, AdminPageHeader } from '@/components/admin/admin-layout-ui';
import { StatusBadge, userStatusTone } from '@/components/admin/status-badge';
import { useAdminApi } from '@/hooks/use-admin';

export default function AdminFreelancersPage() {
  const t = useTranslations('admin');
  const api = useAdminApi();
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Awaited<ReturnType<typeof api.users>> | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .users({ page: String(page), limit: '20', q: q || undefined, role: 'FREELANCER' })
      .then((r) => {
        if (!cancelled) setData(r);
      });
    return () => {
      cancelled = true;
    };
  }, [api, page, q]);

  return (
    <div className="space-y-4">
      <AdminPageHeader title={t('freelancers')} subtitle={t('freelancersSubtitle')} />
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
                <th className="px-4 py-3 text-right">{t('tableUser')}</th>
                <th className="px-4 py-3 text-right">{t('city')}</th>
                <th className="px-4 py-3 text-right">{t('skills')}</th>
                <th className="px-4 py-3 text-right">{t('rating')}</th>
                <th className="px-4 py-3 text-right">{t('completedProjects')}</th>
                <th className="px-4 py-3 text-right">{t('portfolioCount')}</th>
                <th className="px-4 py-3 text-right">{t('tableStatus')}</th>
                <th className="px-4 py-3 text-right">{t('tableAction')}</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((u) => {
                const fr = u.freelancer as Record<string, unknown> | null;
                const city = u.city as { nameAr?: string } | null;
                return (
                  <tr key={String(u.id)} className="border-t">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {u.profilePhoto ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={String(u.profilePhoto)}
                            alt=""
                            className="h-8 w-8 rounded-full object-cover"
                          />
                        ) : (
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs">
                            {(String(u.displayName ?? '?')[0] ?? '?').toUpperCase()}
                          </span>
                        )}
                        <div>
                          <p className="font-medium">{String(u.displayName ?? '—')}</p>
                          <p className="text-xs text-slate-400">@{String(u.username ?? '—')}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">{city?.nameAr ?? '—'}</td>
                    <td className="px-4 py-3">{String(fr?.skillsCount ?? 0)}</td>
                    <td className="px-4 py-3">{String(fr?.averageRating ?? 0)}</td>
                    <td className="px-4 py-3">{String(fr?.completedProjects ?? 0)}</td>
                    <td className="px-4 py-3">{String(fr?.portfolioCount ?? 0)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        label={String(u.status)}
                        tone={userStatusTone(String(u.status))}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/users/${u.id}`} className="text-primary">
                        {t('viewProfile')}
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
      <AdminComingSoon
        title={t('featuredFreelancerAction')}
        description={t('featuredFreelancerPlaceholder')}
      />
    </div>
  );
}
