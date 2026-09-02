'use client';

import { useLocale, useTranslations } from 'next-intl';
import {
  NOTIFICATION_UI,
  type NotificationItem,
} from '@/lib/notification-ui';
import { formatRelativeTime } from '@/lib/i18n/notification-ui';
import type { AppLocale } from '@/i18n/routing';

export function NotificationCard({
  item,
  onOpen,
}: {
  item: NotificationItem;
  onOpen: (item: NotificationItem) => void;
}) {
  const t = useTranslations('notifications');
  const locale = useLocale() as AppLocale;
  const ui = NOTIFICATION_UI[item.type] ?? NOTIFICATION_UI.NEW_MESSAGE;

  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      className={`flex w-full gap-4 rounded-xl border bg-white p-4 text-right transition hover:shadow-sm ${
        item.isRead ? 'border-slate-200' : 'border-primary/30 bg-emerald-50/30'
      }`}
    >
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg ${ui.accent}`}
        aria-hidden
      >
        {ui.icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-2">
          <span className="font-semibold text-on-surface">{item.title}</span>
          {!item.isRead ? (
            <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-[10px] text-white">
              {t('new')}
            </span>
          ) : null}
        </span>
        <span className="mt-1 block text-sm text-slate-600">{item.message}</span>
        <span className="mt-2 block text-xs text-slate-400">
          {formatRelativeTime(item.createdAt, locale)}
        </span>
      </span>
    </button>
  );
}

export function NotificationListSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((key) => (
        <div
          key={key}
          className="h-24 animate-pulse rounded-xl border bg-white"
        />
      ))}
    </div>
  );
}
