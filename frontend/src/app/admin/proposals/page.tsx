'use client';

import { useEffect, useState } from 'react';
import { AdminEmptyState, AdminPagination } from '@/components/admin/admin-ui';
import { useAdminApi } from '@/hooks/use-admin';

export default function AdminProposalsPage() {
  const api = useAdminApi();
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Awaited<ReturnType<typeof api.proposals>> | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.proposals({ page: String(page), limit: '20' }).then((r) => { if (!cancelled) setData(r); });
    return () => { cancelled = true; };
  }, [api, page]);

  return (
    <div>
      <h1 className="text-2xl font-bold">العروض</h1>
      <p className="mt-2 text-sm text-slate-500">للاطلاع والمراجعة فقط — لا يمكن قبول العروض من لوحة الإدارة.</p>
      <div className="mt-6 overflow-x-auto rounded-xl border bg-white">
        {!data?.items.length ? <AdminEmptyState message="لا توجد عروض" /> : (
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50"><tr>
              <th className="px-4 py-3 text-right">المشروع</th>
              <th className="px-4 py-3 text-right">المستقل</th>
              <th className="px-4 py-3 text-right">السعر</th>
              <th className="px-4 py-3 text-right">الحالة</th>
            </tr></thead>
            <tbody>
              {data.items.map((p) => (
                <tr key={String(p.id)} className="border-t">
                  <td className="px-4 py-3">{String((p.project as { title?: string })?.title ?? '—')}</td>
                  <td className="px-4 py-3">{String((p.freelancer as { displayName?: string })?.displayName ?? '—')}</td>
                  <td className="px-4 py-3">{String(p.proposedPrice)}</td>
                  <td className="px-4 py-3">{String(p.status)}</td>
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
