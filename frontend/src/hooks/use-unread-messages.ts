'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useMessagingApi } from '@/hooks/use-messaging';

export function useUnreadMessageCount() {
  const { user, accessToken } = useAuth();
  const api = useMessagingApi();
  const [count, setCount] = useState(0);

  const enabled = Boolean(user && accessToken);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    (async () => {
      try {
        const data = await api.unreadCount();
        if (!cancelled) setCount(data.unreadCount);
      } catch {
        /* ignore */
      }
    })();

    const interval = setInterval(() => {
      void api.unreadCount().then((data) => {
        if (!cancelled) setCount(data.unreadCount);
      });
    }, 60_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [enabled, api]);

  return enabled ? count : 0;
}
