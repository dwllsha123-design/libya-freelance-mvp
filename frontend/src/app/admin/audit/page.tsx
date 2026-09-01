'use client';

import { useEffect, useState } from 'react';
import { AdminEmptyState, AdminPagination } from '@/components/admin/admin-ui';
import { useAdminApi } from '@/hooks/use-admin';

export default function AdminAuditPage() {
  const api = useAdminApi();
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Awaited<ReturnType<typeof api.audit>> | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.audit({ page: String(page), limit: '20' }).then((r) => { if (!cancelled) setData(r); });
    return () => { cancelled = true; };
  }, [api, page]);

  return (
    <div>
      <h1 className="text-2xl font-bold">سجل التدقيق</h1>
      <div className="mt-6 space-y-2">
        {!data?.items.length ? <AdminEmptyState message="لا توجد سجلات" /> : data.items.map((entry) => (
          <div key={String(entry.id)} className="rounded-xl border bg-white p-4 text-sm">
            <p className="font-medium">{String(entry.action)}</p>
            <p className="text-slate-600">{String(entry.entityType)} · {String(entry.entityId)}</p>
            <p className="text-xs text-slate-400">
              {String((entry.admin as { displayName?: string })?.displayName ?? entry.admin)} ·{' '}
              {new Date(String(entry.createdAt)).toLocaleString('ar-LY')}
            </p>
          </div>
        ))}
      </div>
      {data ? <AdminPagination page={page} totalPages={data.totalPages} onChange={setPage} /> : null}
    </div>
  );
}
