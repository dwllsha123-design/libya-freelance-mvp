'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useSocketEvent } from '@/contexts/socket-context';
import type { NotificationItem } from '@/lib/notification-ui';
import { NOTIFICATION_UI } from '@/lib/notification-ui';
import { Link } from '@/i18n/navigation';

type ToastItem = NotificationItem & { toastId: string };

/**
 * Lightweight in-app toast host for realtime notifications.
 * Mount once near chrome / notification pages.
 */
export function NotificationToastHost() {
  const t = useTranslations('notifications');
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useSocketEvent<NotificationItem>('notification:new', (payload) => {
    const toastId = `${payload.id}-${Date.now()}`;
    setToasts((current) => [{ ...payload, toastId }, ...current].slice(0, 3));
  });

  useEffect(() => {
    if (!toasts.length) return;
    const timer = window.setTimeout(() => {
      setToasts((current) => current.slice(0, -1));
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [toasts]);

  if (!toasts.length) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-16 z-[80] flex flex-col items-center gap-2 px-4 md:items-end"
      aria-live="polite"
    >
      {toasts.map((toast) => {
        const ui = NOTIFICATION_UI[toast.type] ?? NOTIFICATION_UI.NEW_MESSAGE;
        return (
          <div
            key={toast.toastId}
            className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border bg-white p-3 shadow-lg"
            role="status"
          >
            <span className={`rounded-full p-2 text-sm ${ui.accent}`} aria-hidden>
              {ui.icon}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-on-surface">
                {toast.title}
              </p>
              <p className="mt-0.5 line-clamp-2 text-xs text-slate-600">
                {toast.message}
              </p>
              {toast.targetUrl ? (
                <Link
                  href={toast.targetUrl}
                  className="mt-2 inline-block text-xs font-medium text-primary"
                >
                  {t('viewAll')}
                </Link>
              ) : null}
            </div>
            <button
              type="button"
              className="text-slate-400"
              aria-label={t('dismiss')}
              onClick={() =>
                setToasts((current) =>
                  current.filter((item) => item.toastId !== toast.toastId),
                )
              }
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}
