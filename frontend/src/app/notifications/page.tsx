'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import {
  NotificationCard,
  NotificationListSkeleton,
} from '@/components/notifications/notification-card';
import {
  useNotificationsApi,
  useUnreadNotificationCount,
} from '@/hooks/use-notifications';
import type { NotificationItem } from '@/lib/notification-ui';
import { ApiError } from '@/lib/api';

const TABS = [
  { key: 'all', label: 'الكل' },
  { key: 'unread', label: 'غير المقروء' },
] as const;

export default function NotificationsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const api = useNotificationsApi();
  const { refresh: refreshUnread, decrement, reset } = useUnreadNotificationCount();
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('all');
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    (async () => {
      setIsLoading(true);
      setError(null);

      try {
        const params: Record<string, string> = {
          page: String(page),
          limit: '20',
        };
        if (tab === 'unread') params.status = 'unread';

        const data = await api.list(params);
        if (!cancelled) {
          setItems(data.items);
          setTotalPages(data.totalPages);
        }
        await refreshUnread();
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError ? err.message : 'فشل تحميل الإشعارات',
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [api, page, refreshUnread, reloadKey, tab, user]);

  async function reloadList() {
    setReloadKey((value) => value + 1);
  }

  async function handleOpen(item: NotificationItem) {
    if (!item.isRead) {
      try {
        await api.markRead(item.id);
        setItems((current) =>
          current.map((n) =>
            n.id === item.id ? { ...n, isRead: true } : n,
          ),
        );
        decrement();
      } catch {
        /* continue navigation */
      }
    }

    if (item.targetUrl) {
      router.push(item.targetUrl);
    }
  }

  async function handleMarkAllRead() {
    setIsMarkingAll(true);
    try {
      await api.markAllRead();
      setItems((current) => current.map((n) => ({ ...n, isRead: true })));
      reset();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'فشل تحديد الإشعارات كمقروءة',
      );
    } finally {
      setIsMarkingAll(false);
    }
  }

  if (authLoading) {
    return <div className="p-8 text-center">جاري التحميل...</div>;
  }

  if (!user) {
    return (
      <div className="p-8 text-center">
        <p>يجب تسجيل الدخول لعرض الإشعارات</p>
      </div>
    );
  }

  const emptyMessage =
    tab === 'unread'
      ? 'لا توجد إشعارات غير مقروءة'
      : 'لا توجد إشعارات حتى الآن';

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-on-surface">الإشعارات</h1>
        <button
          type="button"
          disabled={isMarkingAll}
          onClick={() => void handleMarkAllRead()}
          className="rounded-lg border px-4 py-2 text-sm text-primary disabled:opacity-50"
        >
          {isMarkingAll ? 'جاري التنفيذ...' : 'تحديد الكل كمقروء'}
        </button>
      </div>

      <div className="mt-6 flex gap-2">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => {
              setTab(item.key);
              setPage(1);
            }}
            className={`rounded-full px-4 py-1.5 text-sm ${
              tab === item.key ? 'bg-on-surface text-white' : 'border bg-white'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error ? (
        <div className="mt-8 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p>{error}</p>
          <button
            type="button"
            onClick={() => void reloadList()}
            className="mt-2 font-medium underline"
          >
            إعادة المحاولة
          </button>
        </div>
      ) : null}

      <div className="mt-8 space-y-3">
        {isLoading ? (
          <NotificationListSkeleton />
        ) : items.length === 0 ? (
          <p className="rounded-xl border bg-white p-8 text-center text-slate-500">
            {emptyMessage}
          </p>
        ) : (
          items.map((item) => (
            <NotificationCard
              key={item.id}
              item={item}
              onOpen={(n) => void handleOpen(n)}
            />
          ))
        )}
      </div>

      {totalPages > 1 ? (
        <div className="mt-8 flex items-center justify-center gap-3">
          <button
            type="button"
            disabled={page <= 1 || isLoading}
            onClick={() => setPage((p) => p - 1)}
            className="rounded border px-3 py-1 text-sm disabled:opacity-50"
          >
            السابق
          </button>
          <span className="text-sm text-slate-500">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages || isLoading}
            onClick={() => setPage((p) => p + 1)}
            className="rounded border px-3 py-1 text-sm disabled:opacity-50"
          >
            التالي
          </button>
        </div>
      ) : null}
    </div>
  );
}
