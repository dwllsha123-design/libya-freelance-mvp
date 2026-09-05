'use client';

import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
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
import { useSocketEvent } from '@/contexts/socket-context';
import type { NotificationItem } from '@/lib/notification-ui';
import { ApiError } from '@/lib/api';

const TABS = [
  { key: 'all', labelKey: 'tabAll' },
  { key: 'PROJECTS', labelKey: 'tabProjects' },
  { key: 'MESSAGES', labelKey: 'tabMessages' },
  { key: 'PAYMENTS', labelKey: 'tabPayments' },
  { key: 'POINTS', labelKey: 'tabPoints' },
  { key: 'SYSTEM', labelKey: 'tabSystem' },
  { key: 'unread', labelKey: 'tabUnread' },
] as const;

export default function NotificationsPage() {
  const t = useTranslations('notifications');
  const tCommon = useTranslations('common');
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
        else if (tab !== 'all') params.category = tab;

        const data = await api.list(params);
        if (!cancelled) {
          setItems(data.items);
          setTotalPages(data.totalPages);
        }
        await refreshUnread();
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError ? err.message : t('loadFailed'),
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [api, page, refreshUnread, reloadKey, tab, user, t]);

  useSocketEvent<NotificationItem>('notification:new', (payload) => {
    setItems((current) => {
      if (current.some((n) => n.id === payload.id)) return current;
      return [payload, ...current].slice(0, 40);
    });
  });

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
        err instanceof ApiError ? err.message : t('markAllFailed'),
      );
    } finally {
      setIsMarkingAll(false);
    }
  }

  async function handleDelete(item: NotificationItem) {
    try {
      await api.deleteOne(item.id);
      setItems((current) => current.filter((n) => n.id !== item.id));
      if (!item.isRead) decrement();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('updateFailed'));
    }
  }

  if (authLoading) {
    return <div className="p-8 text-center">{tCommon('loadingPage')}</div>;
  }

  if (!user) {
    return (
      <div className="p-8 text-center">
        <p>{t('loginRequired')}</p>
      </div>
    );
  }

  const emptyMessage = tab === 'unread' ? t('noUnread') : t('emptyTitle');

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-on-surface">{t('title')}</h1>
          <p className="mt-1 text-sm text-slate-500">{t('emptyHint')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/settings/notifications"
            className="rounded-lg border px-4 py-2 text-sm text-slate-700"
          >
            {t('preferences')}
          </Link>
          <button
            type="button"
            disabled={isMarkingAll}
            onClick={() => void handleMarkAllRead()}
            className="rounded-lg border px-4 py-2 text-sm text-primary disabled:opacity-50"
          >
            {isMarkingAll ? tCommon('processing') : t('markAllRead')}
          </button>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
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
            {t(item.labelKey)}
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
            {tCommon('retry')}
          </button>
        </div>
      ) : null}

      <div className="mt-8 space-y-3">
        {isLoading ? (
          <NotificationListSkeleton />
        ) : items.length === 0 ? (
          <div className="rounded-xl border bg-white p-8 text-center text-slate-500">
            <p className="text-3xl" aria-hidden>
              🔔
            </p>
            <p className="mt-3 font-medium text-on-surface">{emptyMessage}</p>
            <p className="mt-1 text-sm">{t('emptyHint')}</p>
          </div>
        ) : (
          items.map((item) => (
            <NotificationCard
              key={item.id}
              item={item}
              onOpen={(n) => void handleOpen(n)}
              onDelete={(n) => void handleDelete(n)}
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
            {tCommon('previous')}
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
            {tCommon('next')}
          </button>
        </div>
      ) : null}
    </div>
  );
}
