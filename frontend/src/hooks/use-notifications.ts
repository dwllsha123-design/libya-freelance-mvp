'use client';

import { useLocale } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useSocketEvent } from '@/contexts/socket-context';
import { authenticatedRequest, apiRequest, getApiErrorMessage } from '@/lib/api';
import type { NotificationItem } from '@/lib/notification-ui';
import type { AppLocale } from '@/i18n/routing';

interface PaginatedNotifications {
  items: NotificationItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  unreadCount: number;
}

export type PreferenceRow = {
  notificationType: string;
  inAppEnabled: boolean;
  pushEnabled: boolean;
  emailEnabled: boolean;
};

export function useNotificationsApi() {
  const { accessToken } = useAuth();
  const locale = useLocale() as AppLocale;

  return useMemo(
    () => ({
      list: (params: Record<string, string> = {}) => {
        if (!accessToken) throw new Error(getApiErrorMessage(locale, 'unauthorized'));
        const qs = new URLSearchParams(params).toString();
        const suffix = qs ? `?${qs}` : '';
        return authenticatedRequest<PaginatedNotifications>(
          `/notifications${suffix}`,
          accessToken,
        );
      },

      latest: () => {
        if (!accessToken) throw new Error(getApiErrorMessage(locale, 'unauthorized'));
        return authenticatedRequest<NotificationItem[]>(
          '/notifications/latest',
          accessToken,
        );
      },

      unreadCount: () => {
        if (!accessToken) throw new Error(getApiErrorMessage(locale, 'unauthorized'));
        return authenticatedRequest<{ count: number }>(
          '/notifications/unread-count',
          accessToken,
        );
      },

      markRead: (id: string) => {
        if (!accessToken) throw new Error(getApiErrorMessage(locale, 'unauthorized'));
        return authenticatedRequest<NotificationItem>(
          `/notifications/${id}/read`,
          accessToken,
          { method: 'POST' },
        );
      },

      markUnread: (id: string) => {
        if (!accessToken) throw new Error(getApiErrorMessage(locale, 'unauthorized'));
        return authenticatedRequest<NotificationItem>(
          `/notifications/${id}/unread`,
          accessToken,
          { method: 'PATCH' },
        );
      },

      markAllRead: () => {
        if (!accessToken) throw new Error(getApiErrorMessage(locale, 'unauthorized'));
        return authenticatedRequest<{ affected: number }>(
          '/notifications/read-all',
          accessToken,
          { method: 'POST' },
        );
      },

      deleteOne: (id: string) => {
        if (!accessToken) throw new Error(getApiErrorMessage(locale, 'unauthorized'));
        return authenticatedRequest<{ deleted: boolean }>(
          `/notifications/${id}`,
          accessToken,
          { method: 'DELETE' },
        );
      },

      clearAll: () => {
        if (!accessToken) throw new Error(getApiErrorMessage(locale, 'unauthorized'));
        return authenticatedRequest<{ deleted: number }>(
          '/notifications',
          accessToken,
          { method: 'DELETE' },
        );
      },

      getPreferences: () => {
        if (!accessToken) throw new Error(getApiErrorMessage(locale, 'unauthorized'));
        return authenticatedRequest<PreferenceRow[]>(
          '/notifications/preferences',
          accessToken,
        );
      },

      updatePreferences: (preferences: PreferenceRow[]) => {
        if (!accessToken) throw new Error(getApiErrorMessage(locale, 'unauthorized'));
        return authenticatedRequest<PreferenceRow[]>(
          '/notifications/preferences',
          accessToken,
          {
            method: 'PATCH',
            body: JSON.stringify({ preferences }),
          },
        );
      },

      pushPublicKey: () =>
        apiRequest<{ publicKey: string | null }>(
          '/notifications/push/public-key',
          {},
          locale,
        ),

      subscribePush: (body: {
        endpoint: string;
        p256dh: string;
        auth: string;
        deviceType?: string;
        browser?: string;
        userAgent?: string;
      }) => {
        if (!accessToken) throw new Error(getApiErrorMessage(locale, 'unauthorized'));
        return authenticatedRequest(
          '/notifications/push-subscriptions',
          accessToken,
          { method: 'POST', body: JSON.stringify(body) },
        );
      },
    }),
    [accessToken, locale],
  );
}

export function useUnreadNotificationCount() {
  const { user } = useAuth();
  const api = useNotificationsApi();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user) {
      let cancelled = false;
      Promise.resolve().then(() => {
        if (!cancelled) setCount(0);
      });
      return () => {
        cancelled = true;
      };
    }

    let cancelled = false;

    api
      .unreadCount()
      .then((data) => {
        if (!cancelled) setCount(Math.max(0, data.count));
      })
      .catch(() => {
        /* keep last known count */
      });

    return () => {
      cancelled = true;
    };
  }, [api, user]);

  useSocketEvent<NotificationItem>('notification:new', () => {
    void api.unreadCount().then((data) => {
      setCount(Math.max(0, data.count));
    });
  });

  const decrement = useCallback((by = 1) => {
    setCount((current) => Math.max(0, current - by));
  }, []);

  const reset = useCallback(() => {
    setCount(0);
  }, []);

  const refresh = useCallback(async () => {
    if (!user) {
      setCount(0);
      return;
    }

    try {
      const data = await api.unreadCount();
      setCount(Math.max(0, data.count));
    } catch {
      /* keep last known count */
    }
  }, [api, user]);

  return { count, refresh, decrement, reset };
}
