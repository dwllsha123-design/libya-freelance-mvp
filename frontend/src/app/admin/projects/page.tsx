'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AdminEmptyState, AdminPagination } from '@/components/admin/admin-ui';
import { StatusBadge, projectStatusLabel } from '@/components/admin/status-badge';
import { useAdminApi } from '@/hooks/use-admin';

export default function AdminProjectsPage() {
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
      <h1 className="text-2xl font-bold">المشاريع</h1>
      <div className="mt-6 overflow-x-auto rounded-xl border bg-white">
        {!data?.items.length ? (
          <AdminEmptyState message="لا توجد مشاريع" />
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50"><tr>
              <th className="px-4 py-3 text-right">العنوان</th>
              <th className="px-4 py-3 text-right">العميل</th>
              <th className="px-4 py-3 text-right">الحالة</th>
              <th className="px-4 py-3 text-right">العروض</th>
              <th className="px-4 py-3 text-right" />
            </tr></thead>
            <tbody>
              {data.items.map((p) => (
                <tr key={String(p.id)} className="border-t">
                  <td className="max-w-[12rem] truncate px-4 py-3">{String(p.title)}</td>
                  <td className="max-w-[10rem] truncate px-4 py-3">{String((p.client as { displayName?: string })?.displayName ?? '—')}</td>
                  <td className="px-4 py-3"><StatusBadge label={projectStatusLabel(String(p.status))} tone="info" /></td>
                  <td className="px-4 py-3">{String(p.proposalCount)}</td>
                  <td className="px-4 py-3"><Link href={`/admin/projects/${p.id}`} className="text-[#00A86B]">عرض</Link></td>
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
