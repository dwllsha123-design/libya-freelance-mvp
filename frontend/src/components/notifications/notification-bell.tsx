'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  useNotificationsApi,
  useUnreadNotificationCount,
} from '@/hooks/use-notifications';
import {
  NOTIFICATION_UI,
  formatRelativeTime,
  formatUnreadBadge,
  type NotificationItem,
} from '@/lib/notification-ui';
import { ApiError } from '@/lib/api';

function NotificationRow({
  item,
  onRead,
}: {
  item: NotificationItem;
  onRead: (item: NotificationItem) => void;
}) {
  const ui = NOTIFICATION_UI[item.type] ?? NOTIFICATION_UI.NEW_MESSAGE;

  return (
    <button
      type="button"
      onClick={() => onRead(item)}
      className={`flex w-full gap-3 rounded-lg px-3 py-2 text-right transition hover:bg-slate-50 ${
        item.isRead ? 'opacity-80' : 'bg-emerald-50/40'
      }`}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base ${ui.accent}`}
        aria-hidden
      >
        {ui.icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-[#0B132B]">
          {item.title}
        </span>
        <span className="mt-0.5 block line-clamp-2 text-xs text-slate-600">
          {item.message}
        </span>
        <span className="mt-1 block text-[11px] text-slate-400">
          {formatRelativeTime(item.createdAt)}
        </span>
      </span>
      {!item.isRead ? (
        <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#00A86B]" aria-hidden />
      ) : null}
    </button>
  );
}

export function NotificationBell() {
  const router = useRouter();
  const api = useNotificationsApi();
  const { count, decrement } = useUnreadNotificationCount();
  const [open, setOpen] = useState(false);
  const [latest, setLatest] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const badge = formatUnreadBadge(count);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await api.latest();
        if (!cancelled) setLatest(data);
      } catch {
        if (!cancelled) setError('فشل تحميل الإشعارات');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [api, open]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!panelRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  async function handleNotificationClick(item: NotificationItem) {
    if (!item.isRead) {
      try {
        await api.markRead(item.id);
        decrement();
        setLatest((current) =>
          current.map((n) =>
            n.id === item.id ? { ...n, isRead: true } : n,
          ),
        );
      } catch (err) {
        setError(
          err instanceof ApiError ? err.message : 'فشل تحديث الإشعار',
        );
      }
    }

    setOpen(false);

    if (item.targetUrl) {
      router.push(item.targetUrl);
    }
  }

  function handleMobileNavigate() {
    router.push('/notifications');
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        aria-label={`الإشعارات${badge ? `، ${badge} غير مقروء` : ''}`}
        onClick={() => {
          if (window.innerWidth < 768) {
            handleMobileNavigate();
            return;
          }
          setOpen((value) => !value);
        }}
        className="relative rounded-lg p-2 text-slate-700 hover:bg-slate-100"
      >
        <span aria-hidden>🔔</span>
        {badge ? (
          <span className="absolute -end-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {badge}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          className="absolute end-0 top-full z-50 mt-2 hidden w-[min(100vw-2rem,20rem)] rounded-xl border bg-white p-3 shadow-xl md:block"
          role="menu"
          aria-label="أحدث الإشعارات"
        >
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-bold text-[#0B132B]">الإشعارات</p>
            {badge ? (
              <span className="text-xs text-slate-500">{badge} غير مقروء</span>
            ) : null}
          </div>

          {isLoading ? (
            <p className="py-6 text-center text-sm text-slate-500">جاري التحميل...</p>
          ) : error ? (
            <p className="py-4 text-center text-sm text-red-600">{error}</p>
          ) : latest.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">
              لا توجد إشعارات حتى الآن
            </p>
          ) : (
            <div className="max-h-80 space-y-1 overflow-y-auto">
              {latest.map((item) => (
                <NotificationRow
                  key={item.id}
                  item={item}
                  onRead={(n) => void handleNotificationClick(n)}
                />
              ))}
            </div>
          )}

          <Link
            href="/notifications"
            className="mt-3 block rounded-lg border-t pt-3 text-center text-sm font-medium text-[#00A86B]"
            onClick={() => setOpen(false)}
          >
            عرض كل الإشعارات
          </Link>
        </div>
      ) : null}
    </div>
  );
}
