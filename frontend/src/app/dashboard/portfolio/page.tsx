'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { PortfolioForm } from '@/components/portfolio/portfolio-form';
import { useAuth } from '@/contexts/auth-context';
import { usePortfolioApi, type PortfolioItem } from '@/hooks/use-portfolio';
import { ApiError } from '@/lib/api';

export default function PortfolioDashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const api = usePortfolioApi();
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<PortfolioItem | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user || user.role !== 'FREELANCER') return;

    let cancelled = false;

    (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await api.listMine();
        if (!cancelled) setItems(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'فشل تحميل المعرض');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, api]);

  async function reload() {
    const data = await api.listMine();
    setItems(data);
  }

  async function handleCreate(payload: Parameters<typeof api.create>[0]) {
    setIsSubmitting(true);
    try {
      await api.create(payload);
      setIsCreating(false);
      await reload();
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleUpdate(payload: Parameters<typeof api.create>[0]) {
    if (!editing) return;
    setIsSubmitting(true);
    try {
      await api.update(editing.id, payload);
      setEditing(null);
      await reload();
    } finally {
      setIsSubmitting(false);
    }
  }

  async function moveItem(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    const [removed] = next.splice(index, 1);
    next.splice(target, 0, removed);
    const reordered = await api.reorder(next.map((item) => item.id));
    setItems(reordered);
  }

  async function handleDelete(id: string) {
    if (!confirm('حذف هذا العمل من المعرض؟')) return;
    await api.remove(id);
    await reload();
  }

  async function handleUpload(itemId: string, file: File) {
    setUploadingId(itemId);
    try {
      await api.uploadImage(itemId, file);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل رفع الصورة');
    } finally {
      setUploadingId(null);
    }
  }

  if (authLoading || isLoading) {
    return <div className="p-8 text-center">جاري التحميل...</div>;
  }

  if (!user || user.role !== 'FREELANCER') {
    return (
      <div className="p-8 text-center">
        <p>هذه الصفحة للمستقلين فقط</p>
        <Link href="/dashboard" className="text-primary">
          العودة
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-on-surface">معرض الأعمال</h1>
          <p className="mt-1 text-sm text-slate-500">اعرض أفضل مشاريعك للعملاء</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setIsCreating(true);
          }}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white"
        >
          إضافة عمل
        </button>
      </div>

      {error ? <p className="mt-4 text-red-600">{error}</p> : null}

      {isCreating ? (
        <div className="mt-6 rounded-xl border bg-white p-6">
          <h2 className="mb-4 text-lg font-bold">إضافة عمل جديد</h2>
          <PortfolioForm
            isSubmitting={isSubmitting}
            onSubmit={handleCreate}
            onCancel={() => setIsCreating(false)}
          />
        </div>
      ) : null}

      {editing ? (
        <div className="mt-6 rounded-xl border bg-white p-6">
          <h2 className="mb-4 text-lg font-bold">تعديل العمل</h2>
          <PortfolioForm
            initial={editing}
            isSubmitting={isSubmitting}
            onSubmit={handleUpdate}
            onCancel={() => setEditing(null)}
          />
          <div className="mt-4 border-t pt-4">
            <label className="mb-2 block text-sm font-medium">الصور (حد أقصى 5)</label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={uploadingId === editing.id}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleUpload(editing.id, file);
                e.target.value = '';
              }}
            />
          </div>
        </div>
      ) : null}

      {items.length === 0 && !isCreating ? (
        <p className="mt-10 text-center text-slate-500">
          لا توجد أعمال في المعرض بعد — أضف أول عمل لك
        </p>
      ) : null}

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {items.map((item) => (
          <div key={item.id} className="overflow-hidden rounded-xl border bg-white">
            {item.coverImage ? (
              <Image
                src={item.coverImage}
                alt={item.title}
                width={600}
                height={320}
                className="h-40 w-full object-cover"
              />
            ) : (
              <div className="flex h-40 items-center justify-center bg-slate-100 text-sm text-slate-400">
                بدون صورة
              </div>
            )}
            <div className="p-4">
              <h3 className="font-bold text-on-surface">{item.title}</h3>
              <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                {item.description}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void moveItem(items.indexOf(item), -1)}
                  className="rounded border px-2 py-1 text-xs"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => void moveItem(items.indexOf(item), 1)}
                  className="rounded border px-2 py-1 text-xs"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsCreating(false);
                    setEditing(item);
                  }}
                  className="rounded border px-3 py-1 text-xs text-primary"
                >
                  تعديل
                </button>
                <button
                  type="button"
                  onClick={() => void handleDelete(item.id)}
                  className="rounded border px-3 py-1 text-xs text-red-600"
                >
                  حذف
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
