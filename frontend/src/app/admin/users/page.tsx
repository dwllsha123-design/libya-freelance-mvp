'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  AdminEmptyState,
  AdminPagination,
  AdminSearch,
} from '@/components/admin/admin-ui';
import { StatusBadge, userStatusTone } from '@/components/admin/status-badge';
import { useAdminApi } from '@/hooks/use-admin';

export default function AdminUsersPage() {
  const api = useAdminApi();
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Awaited<ReturnType<typeof api.users>> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setIsLoading(true);
      try {
        const result = await api.users({ page: String(page), limit: '20', q: q || undefined });
        if (!cancelled) setData(result);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [api, page, q]);

  return (
    <div className="min-w-0">
      <h1 className="text-2xl font-bold">المستخدمون</h1>
      <div className="mt-4">
        <AdminSearch value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="بحث بالاسم أو البريد" />
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border bg-white">
        {isLoading ? (
          <div className="p-8 text-center text-slate-500">جاري التحميل...</div>
        ) : !data?.items.length ? (
          <AdminEmptyState message="لا يوجد مستخدمون" />
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-right">الاسم</th>
                <th className="px-4 py-3 text-right">البريد</th>
                <th className="px-4 py-3 text-right">الدور</th>
                <th className="px-4 py-3 text-right">الحالة</th>
                <th className="px-4 py-3 text-right">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((user) => (
                <tr key={String(user.id)} className="border-t">
                  <td className="max-w-[10rem] truncate px-4 py-3">{String(user.displayName ?? '—')}</td>
                  <td className="max-w-[12rem] break-all px-4 py-3">{String(user.email)}</td>
                  <td className="px-4 py-3">{String(user.role)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      label={String(user.status)}
                      tone={userStatusTone(String(user.status))}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/users/${user.id}`} className="text-[#00A86B]">
                      عرض
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {data ? (
        <AdminPagination page={page} totalPages={data.totalPages} onChange={setPage} disabled={isLoading} />
      ) : null}
    </div>
  );
}
