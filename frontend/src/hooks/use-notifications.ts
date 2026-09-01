'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useSocketEvent } from '@/contexts/socket-context';
import { authenticatedRequest } from '@/lib/api';
import type { NotificationItem } from '@/lib/notification-ui';

interface PaginatedNotifications {
  items: NotificationItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  unreadCount: number;
}

export function useNotificationsApi() {
  const { accessToken } = useAuth();

  return useMemo(
    () => ({
      list: (params: Record<string, string> = {}) => {
        if (!accessToken) throw new Error('غير مصرح');
        const qs = new URLSearchParams(params).toString();
        const suffix = qs ? `?${qs}` : '';
        return authenticatedRequest<PaginatedNotifications>(
          `/notifications${suffix}`,
          accessToken,
        );
      },

      latest: () => {
        if (!accessToken) throw new Error('غير مصرح');
        return authenticatedRequest<NotificationItem[]>(
          '/notifications/latest',
          accessToken,
        );
      },

      unreadCount: () => {
        if (!accessToken) throw new Error('غير مصرح');
        return authenticatedRequest<{ count: number }>(
          '/notifications/unread-count',
          accessToken,
        );
      },

      markRead: (id: string) => {
        if (!accessToken) throw new Error('غير مصرح');
        return authenticatedRequest<NotificationItem>(
          `/notifications/${id}/read`,
          accessToken,
          { method: 'POST' },
        );
      },

      markAllRead: () => {
        if (!accessToken) throw new Error('غير مصرح');
        return authenticatedRequest<{ affected: number }>(
          '/notifications/read-all',
          accessToken,
          { method: 'POST' },
        );
      },
    }),
    [accessToken],
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
