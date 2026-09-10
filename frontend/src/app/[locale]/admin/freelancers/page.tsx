'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import {
  AdminEmptyState,
  AdminPagination,
  AdminSearch,
} from '@/components/admin/admin-ui';
import { AdminComingSoon, AdminPageHeader } from '@/components/admin/admin-layout-ui';
import { StatusBadge, userStatusTone } from '@/components/admin/status-badge';
import {
  staffCanManageUsers,
  useAdminApi,
  type AdminMeSession,
} from '@/hooks/use-admin';
import { getApiErrorMessage } from '@/lib/api';
import type { AppLocale } from '@/i18n/routing';

export default function AdminFreelancersPage() {
  const t = useTranslations('admin');
  const locale = useLocale() as AppLocale;
  const api = useAdminApi();
  const [staffSession, setStaffSession] = useState<AdminMeSession | null>(null);
  const canEditAccounts = staffCanManageUsers(staffSession);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Awaited<ReturnType<typeof api.users>> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .me()
      .then((me) => {
        if (!cancelled) setStaffSession(me);
      })
      .catch(() => {
        if (!cancelled) setStaffSession(null);
      });
    return () => {
      cancelled = true;
    };
  }, [api]);

  useEffect(() => {
    let cancelled = false;
    api
      .users({ page: String(page), limit: '20', q: q || undefined, role: 'FREELANCER' })
      .then((r) => {
        if (!cancelled) setData(r);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : getApiErrorMessage(locale, 'unexpected'));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [api, page, q, locale]);

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
      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}
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
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 whitespace-nowrap">
                        {canEditAccounts ? (
                          <>
                            <Link
                              href={`/admin/freelancers/${u.id}/edit`}
                              className="text-slate-700 underline-offset-2 hover:text-primary hover:underline"
                            >
                              {t('editAccount')}
                            </Link>
                            <span className="text-slate-300" aria-hidden>
                              |
                            </span>
                          </>
                        ) : null}
                        <Link href={`/admin/users/${u.id}`} className="text-primary">
                          {t('viewProfile')}
                        </Link>
                      </div>
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
