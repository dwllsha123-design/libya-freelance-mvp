'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  useNotificationsApi,
  useUnreadNotificationCount,
} from '@/hooks/use-notifications';
import {
  NOTIFICATION_UI,
  formatUnreadBadge,
  type NotificationItem,
} from '@/lib/notification-ui';
import { formatRelativeTime } from '@/lib/i18n/notification-ui';
import { ApiError } from '@/lib/api';
import type { AppLocale } from '@/i18n/routing';
import { resolveNotificationHref } from '@/lib/notification-href';

function NotificationRow({
  item,
  locale,
  onRead,
}: {
  item: NotificationItem;
  locale: AppLocale;
  onRead: (item: NotificationItem) => void;
}) {
  const ui = NOTIFICATION_UI[item.type] ?? NOTIFICATION_UI.NEW_MESSAGE;

  return (
    <button
      type="button"
      onClick={() => onRead(item)}
      className={`flex w-full max-w-full min-w-0 gap-3 rounded-lg px-3 py-2 text-start transition hover:bg-slate-50 ${
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
        <span className="block truncate text-sm font-semibold text-on-surface">
          {item.title}
        </span>
        <span className="mt-0.5 block line-clamp-2 break-words text-xs text-slate-600 [overflow-wrap:anywhere]">
          {item.message}
        </span>
        <span className="mt-1 block text-[11px] text-slate-400">
          {formatRelativeTime(item.createdAt, locale)}
        </span>
      </span>
      {!item.isRead ? (
        <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden />
      ) : null}
    </button>
  );
}

export function NotificationBell() {
  const t = useTranslations('notifications');
  const tCommon = useTranslations('common');
  const locale = useLocale() as AppLocale;
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
        if (!cancelled) setError(t('loadFailed'));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [api, open, t]);

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
          err instanceof ApiError ? err.message : t('updateFailed'),
        );
      }
    }

    setOpen(false);
    router.push(resolveNotificationHref(item));
  }

  function handleBellClick() {
    // Match navbar drawer breakpoint (lg = 1024): phones/tablets go to full list
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      router.push('/notifications');
      return;
    }
    setOpen((value) => !value);
  }

  const ariaLabel = badge
    ? t('ariaLabelUnread', { count: badge })
    : t('ariaLabel');

  return (
    <div className="relative shrink-0" ref={panelRef}>
      <button
        type="button"
        aria-label={ariaLabel}
        onClick={handleBellClick}
        className="relative grid size-9 place-items-center rounded-lg border border-line text-ink-soft transition hover:bg-cream-deep hover:text-ink"
      >
        <span aria-hidden className="text-base leading-none">
          🔔
        </span>
        {badge ? (
          <span className="absolute -end-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {badge}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          className="absolute end-0 top-full z-50 mt-2 hidden w-[min(100vw-2rem,20rem)] rounded-xl border border-line bg-cream p-3 shadow-xl lg:block"
          role="menu"
          aria-label={t('latest')}
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-sm font-bold text-on-surface">{t('title')}</p>
            {badge ? (
              <span className="shrink-0 text-xs text-slate-500">
                {t('unreadCount', { count: badge })}
              </span>
            ) : null}
          </div>

          {isLoading ? (
            <p className="py-6 text-center text-sm text-slate-500">{tCommon('loadingPage')}</p>
          ) : error ? (
            <p className="py-4 text-center text-sm text-red-600">{error}</p>
          ) : latest.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">
              {t('noNotifications')}
            </p>
          ) : (
            <div className="max-h-80 space-y-1 overflow-y-auto">
              {latest.map((item) => (
                <NotificationRow
                  key={item.id}
                  item={item}
                  locale={locale}
                  onRead={(n) => void handleNotificationClick(n)}
                />
              ))}
            </div>
          )}

          <Link
            href="/notifications"
            className="mt-3 block rounded-lg border-t border-line pt-3 text-center text-sm font-medium text-primary"
            onClick={() => setOpen(false)}
          >
            {t('viewAll')}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
