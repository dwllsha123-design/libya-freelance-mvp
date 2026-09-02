'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import {
  AdminEmptyState,
  AdminPagination,
  AdminSearch,
} from '@/components/admin/admin-ui';
import { AdminPageHeader } from '@/components/admin/admin-layout-ui';
import { StatusBadge, userStatusTone } from '@/components/admin/status-badge';
import { useAdminApi } from '@/hooks/use-admin';

const ROLES = ['', 'CLIENT', 'FREELANCER', 'ADMIN', 'SUPER_ADMIN'] as const;
const STATUSES = ['', 'ACTIVE', 'SUSPENDED', 'BANNED'] as const;

export default function AdminUsersPage() {
  const t = useTranslations('admin');
  const tCommon = useTranslations('common');
  const searchParams = useSearchParams();
  const api = useAdminApi();
  const [q, setQ] = useState('');
  const [role, setRole] = useState(searchParams.get('role') ?? '');
  const [status, setStatus] = useState(searchParams.get('status') ?? '');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Awaited<ReturnType<typeof api.users>> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      try {
        const result = await api.users({
          page: String(page),
          limit: '20',
          q: q || undefined,
          role: role || undefined,
          status: status || undefined,
        });
        if (!cancelled) setData(result);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api, page, q, role, status]);

  return (
    <div className="min-w-0 space-y-4">
      <AdminPageHeader title={t('usersManagement')} subtitle={t('usersManagementSubtitle')} />

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <div className="min-w-[16rem] flex-1">
          <AdminSearch
            value={q}
            onChange={(v) => {
              setQ(v);
              setPage(1);
            }}
            placeholder={t('searchUsers')}
          />
        </div>
        <select
          value={role}
          onChange={(e) => {
            setRole(e.target.value);
            setPage(1);
          }}
          className="rounded-xl border px-3 py-2 text-sm"
        >
          <option value="">{t('filterAllRoles')}</option>
          {ROLES.filter(Boolean).map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="rounded-xl border px-3 py-2 text-sm"
        >
          <option value="">{t('filterAllStatuses')}</option>
          {STATUSES.filter(Boolean).map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-2xl border bg-white">
        {isLoading ? (
          <div className="p-8 text-center text-slate-500">{tCommon('loadingPage')}</div>
        ) : !data?.items.length ? (
          <AdminEmptyState message={t('noUsers')} />
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-right">{t('tableUser')}</th>
                <th className="px-4 py-3 text-right">{t('tableAccountType')}</th>
                <th className="px-4 py-3 text-right">{t('tableJoined')}</th>
                <th className="px-4 py-3 text-right">{t('tableStatus')}</th>
                <th className="px-4 py-3 text-right">{t('tableLastActivity')}</th>
                <th className="px-4 py-3 text-right">{t('tableAction')}</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((user) => (
                <tr key={String(user.id)} className="border-t">
                  <td className="px-4 py-3">
                    <p className="font-medium">{String(user.displayName ?? '—')}</p>
                    <p className="text-xs text-slate-500">{String(user.email)}</p>
                    {user.username ? (
                      <p className="text-xs text-slate-400">@{String(user.username)}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">{String(user.role)}</td>
                  <td className="px-4 py-3 text-xs">
                    {new Date(String(user.createdAt)).toLocaleDateString('ar-LY')}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      label={String(user.status)}
                      tone={userStatusTone(String(user.status))}
                    />
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {user.updatedAt
                      ? new Date(String(user.updatedAt)).toLocaleDateString('ar-LY')
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/users/${user.id}`} className="text-primary">
                      {t('view')}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {data ? (
        <AdminPagination
          page={page}
          totalPages={data.totalPages}
          onChange={setPage}
          disabled={isLoading}
        />
      ) : null}
    </div>
  );
}
