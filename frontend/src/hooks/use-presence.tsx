'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useSocket, useSocketEvent } from '@/contexts/socket-context';
import { useAuth } from '@/contexts/auth-context';
import { authenticatedRequest } from '@/lib/api';
import type { PresenceSnapshot, PresenceStatus } from '@/lib/presence';

interface PresenceUpdatePayload {
  userId: string;
  status: 'ONLINE' | 'OFFLINE';
  lastSeenAt?: string | null;
}

interface PresenceContextValue {
  getPresence: (userId: string | null | undefined) => PresenceSnapshot | null;
  subscribe: (userIds: string[]) => void;
  unsubscribe: (userIds: string[]) => void;
}

const PresenceContext = createContext<PresenceContextValue | undefined>(
  undefined,
);

const HEARTBEAT_MS = 35_000;

export function PresenceProvider({ children }: { children: ReactNode }) {
  const { socket, isConnected } = useSocket();
  const { accessToken } = useAuth();
  const [map, setMap] = useState<Record<string, PresenceSnapshot>>({});
  const watchedRef = useRef(new Set<string>());

  useEffect(() => {
    if (!socket || !isConnected) return;

    const tick = () => {
      socket.emit('presence:heartbeat', {});
    };
    tick();
    const id = window.setInterval(tick, HEARTBEAT_MS);
    return () => window.clearInterval(id);
  }, [socket, isConnected]);

  useSocketEvent<PresenceUpdatePayload>('presence:update', (payload) => {
    setMap((prev) => ({
      ...prev,
      [payload.userId]: {
        userId: payload.userId,
        status: payload.status === 'ONLINE' ? 'ONLINE' : 'OFFLINE',
        lastSeenAt: payload.lastSeenAt ?? prev[payload.userId]?.lastSeenAt ?? null,
      },
    }));
  });

  const mergeItems = useCallback((items: PresenceSnapshot[]) => {
    if (!items.length) return;
    setMap((prev) => {
      const next = { ...prev };
      for (const item of items) {
        next[item.userId] = item;
      }
      return next;
    });
  }, []);

  const subscribe = useCallback(
    (userIds: string[]) => {
      const unique = [...new Set(userIds.filter(Boolean))];
      if (!unique.length) return;

      for (const id of unique) watchedRef.current.add(id);

      if (socket && isConnected) {
        socket.emit(
          'presence:subscribe',
          { userIds: unique },
          (response: { items?: PresenceSnapshot[] } | undefined) => {
            if (response?.items) mergeItems(response.items);
          },
        );
      } else if (accessToken) {
        void authenticatedRequest<{ items: PresenceSnapshot[] }>(
          '/presence/lookup',
          accessToken,
          { method: 'POST', body: JSON.stringify({ userIds: unique }) },
        )
          .then((res) => mergeItems(res.items))
          .catch(() => undefined);
      }
    },
    [socket, isConnected, accessToken, mergeItems],
  );

  const unsubscribe = useCallback(
    (userIds: string[]) => {
      const unique = [...new Set(userIds.filter(Boolean))];
      for (const id of unique) watchedRef.current.delete(id);
      socket?.emit('presence:unsubscribe', { userIds: unique });
    },
    [socket],
  );

  // Re-subscribe after reconnect
  useEffect(() => {
    if (!socket || !isConnected) return;
    const ids = [...watchedRef.current];
    if (!ids.length) return;
    socket.emit(
      'presence:subscribe',
      { userIds: ids },
      (response: { items?: PresenceSnapshot[] } | undefined) => {
        if (response?.items) mergeItems(response.items);
      },
    );
  }, [socket, isConnected, mergeItems]);

  const getPresence = useCallback(
    (userId: string | null | undefined) => {
      if (!userId) return null;
      return map[userId] ?? null;
    },
    [map],
  );

  const value = useMemo(
    () => ({ getPresence, subscribe, unsubscribe }),
    [getPresence, subscribe, unsubscribe],
  );

  return (
    <PresenceContext.Provider value={value}>{children}</PresenceContext.Provider>
  );
}

export function usePresenceStore() {
  const ctx = useContext(PresenceContext);
  if (!ctx) {
    throw new Error('usePresenceStore must be used within PresenceProvider');
  }
  return ctx;
}

export function usePresence(userId: string | null | undefined) {
  const { getPresence, subscribe, unsubscribe } = usePresenceStore();

  useEffect(() => {
    if (!userId) return;
    subscribe([userId]);
    return () => unsubscribe([userId]);
  }, [userId, subscribe, unsubscribe]);

  return getPresence(userId);
}

export function usePresenceSubscription(userIds: string[]) {
  const { getPresence, subscribe, unsubscribe } = usePresenceStore();
  const key = userIds.filter(Boolean).sort().join(',');

  useEffect(() => {
    const ids = key ? key.split(',') : [];
    if (!ids.length) return;
    subscribe(ids);
    return () => unsubscribe(ids);
  }, [key, subscribe, unsubscribe]);

  return useMemo(() => {
    const result: Record<string, PresenceSnapshot | null> = {};
    for (const id of userIds) {
      if (id) result[id] = getPresence(id);
    }
    return result;
  }, [userIds, getPresence]);
}

export type { PresenceStatus, PresenceSnapshot };
