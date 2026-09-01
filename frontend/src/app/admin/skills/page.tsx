'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AdminEmptyState, AdminPagination } from '@/components/admin/admin-ui';
import { StatusBadge } from '@/components/admin/status-badge';
import { useAdminApi } from '@/hooks/use-admin';

export default function AdminSkillsPage() {
  const api = useAdminApi();
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Awaited<ReturnType<typeof api.skills>> | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  async function reload() {
    const result = await api.skills({ page: String(page), limit: '20' });
    setData(result);
    return result;
  }

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setIsLoading(true);
      try {
        const result = await api.skills({ page: String(page), limit: '20' });
        if (!cancelled) setData(result);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [api, page]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    await api.createSkill({ name, slug });
    setName('');
    setSlug('');
    await reload();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">المهارات</h1>
      <form onSubmit={(e) => void onCreate(e)} className="flex flex-wrap gap-2 rounded-xl border bg-white p-4">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="اسم المهارة" className="rounded border px-3 py-2 text-sm" required />
        <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="slug" className="rounded border px-3 py-2 text-sm" required />
        <button type="submit" className="rounded bg-primary px-4 py-2 text-sm text-white">إضافة</button>
      </form>
      <div className="space-y-2">
        {isLoading ? (
          <div className="p-8 text-center text-slate-500">جاري التحميل...</div>
        ) : !data?.items.length ? <AdminEmptyState message="لا توجد مهارات" /> : data.items.map((s) => (
          <div key={String(s.id)} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-white p-4">
            <div>
              <p className="font-medium">{String(s.name)}</p>
              <p className="text-xs text-slate-500">{String(s.slug)}</p>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge label={s.isActive ? 'نشطة' : 'معطلة'} tone={s.isActive ? 'success' : 'danger'} />
              {s.isActive ? (
                <button type="button" onClick={() => void api.deactivateSkill(String(s.id)).then(reload)} className="text-sm text-red-600">تعطيل</button>
              ) : (
                <button type="button" onClick={() => void api.activateSkill(String(s.id)).then(reload)} className="text-sm text-primary">تفعيل</button>
              )}
            </div>
          </div>
        ))}
      </div>
      {data ? <AdminPagination page={page} totalPages={data.totalPages} onChange={setPage} /> : null}
    </div>
  );
}
