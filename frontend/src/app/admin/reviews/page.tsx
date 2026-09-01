'use client';

import { useEffect, useState } from 'react';
import { AdminConfirmDialog, AdminEmptyState, AdminPagination } from '@/components/admin/admin-ui';
import { StatusBadge } from '@/components/admin/status-badge';
import { useAdminApi } from '@/hooks/use-admin';

export default function AdminReviewsPage() {
  const api = useAdminApi();
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Awaited<ReturnType<typeof api.reviews>> | null>(null);
  const [pending, setPending] = useState<{ id: string; action: 'hide' | 'restore' } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function reload() {
    const result = await api.reviews({ page: String(page), limit: '20' });
    setData(result);
    return result;
  }

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setIsLoading(true);
      try {
        const result = await api.reviews({ page: String(page), limit: '20' });
        if (!cancelled) setData(result);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [api, page]);

  return (
    <div>
      <h1 className="text-2xl font-bold">التقييمات</h1>
      <div className="mt-6 space-y-3">
        {!data?.items.length ? <AdminEmptyState message="لا توجد تقييمات" /> : data.items.map((review) => (
          <div key={String(review.id)} className="rounded-xl border bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium">{String((review.project as { title?: string })?.title)}</p>
              <StatusBadge
                label={review.isVisible ? 'ظاهر' : 'مخفي'}
                tone={review.isVisible ? 'success' : 'danger'}
              />
            </div>
            <p className="mt-2 text-sm">⭐ {String(review.rating)} — {String(review.comment ?? '')}</p>
            <div className="mt-3 flex gap-2">
              {review.isVisible ? (
                <button type="button" onClick={() => setPending({ id: String(review.id), action: 'hide' })} className="text-sm text-red-600">
                  إخفاء التقييم
                </button>
              ) : (
                <button type="button" onClick={() => setPending({ id: String(review.id), action: 'restore' })} className="text-sm text-[#00A86B]">
                  استعادة التقييم
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      {data ? <AdminPagination page={page} totalPages={data.totalPages} onChange={setPage} /> : null}
      <AdminConfirmDialog
        open={pending !== null}
        title={pending?.action === 'hide' ? 'إخفاء التقييم' : 'استعادة التقييم'}
        message="هل أنت متأكد؟"
        confirmLabel="تأكيد"
        isLoading={isLoading}
        onConfirm={() => {
          if (!pending) return;
          setIsLoading(true);
          const action = pending.action === 'hide' ? api.hideReview(pending.id) : api.restoreReview(pending.id);
          void action.then(() => reload()).finally(() => { setIsLoading(false); setPending(null); });
        }}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}
