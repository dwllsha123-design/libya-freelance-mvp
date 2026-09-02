'use client';

import { useTranslations } from 'next-intl';
import { FormEvent, useEffect, useState } from 'react';
import { AdminEmptyState, AdminPagination } from '@/components/admin/admin-ui';
import { StatusBadge } from '@/components/admin/status-badge';
import { useAdminApi } from '@/hooks/use-admin';

export default function AdminCategoriesPage() {
  const t = useTranslations('admin');
  const tCommon = useTranslations('common');
  const api = useAdminApi();
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Awaited<ReturnType<typeof api.categories>> | null>(null);
  const [nameAr, setNameAr] = useState('');
  const [slug, setSlug] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  async function reload() {
    const result = await api.categories({ page: String(page), limit: '20' });
    setData(result);
    return result;
  }

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setIsLoading(true);
      try {
        const result = await api.categories({ page: String(page), limit: '20' });
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
    await api.createCategory({ nameAr, slug });
    setNameAr('');
    setSlug('');
    await reload();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('categories')}</h1>
      <form onSubmit={(e) => void onCreate(e)} className="flex flex-wrap gap-2 rounded-xl border bg-white p-4">
        <input value={nameAr} onChange={(e) => setNameAr(e.target.value)} placeholder={t('nameAr')} className="rounded border px-3 py-2 text-sm" required />
        <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder={t('slug')} className="rounded border px-3 py-2 text-sm" required />
        <button type="submit" className="rounded bg-primary px-4 py-2 text-sm text-white">{t('add')}</button>
      </form>
      <div className="space-y-2">
        {isLoading ? (
          <div className="p-8 text-center text-slate-500">{tCommon('loadingPage')}</div>
        ) : !data?.items.length ? <AdminEmptyState message={t('noCategories')} /> : data.items.map((c) => (
          <div key={String(c.id)} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-white p-4">
            <div>
              <p className="font-medium">{String(c.nameAr)}</p>
              <p className="text-xs text-slate-500">{String(c.slug)}</p>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge label={c.isActive ? t('active') : t('inactive')} tone={c.isActive ? 'success' : 'danger'} />
              {c.isActive ? (
                <button type="button" onClick={() => void api.deactivateCategory(String(c.id)).then(reload)} className="text-sm text-red-600">{t('deactivate')}</button>
              ) : (
                <button type="button" onClick={() => void api.activateCategory(String(c.id)).then(reload)} className="text-sm text-primary">{t('activate')}</button>
              )}
            </div>
          </div>
        ))}
      </div>
      {data ? <AdminPagination page={page} totalPages={data.totalPages} onChange={setPage} /> : null}
    </div>
  );
}
