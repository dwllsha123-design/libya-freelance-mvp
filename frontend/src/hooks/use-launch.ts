'use client';

import { useLocale } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { apiRequest, authenticatedRequest, getApiErrorMessage } from '@/lib/api';
import type {
  LaunchAdminOverview,
  LaunchPublicProgram,
  LaunchUserStatus,
} from '@/lib/launch';
import type { AppLocale } from '@/i18n/routing';

export function useLaunchApi() {
  const { accessToken } = useAuth();
  const locale = useLocale() as AppLocale;

  return useMemo(
    () => ({
      getPublicProgram: () => apiRequest<LaunchPublicProgram>('/launch/program'),
      getMyStatus: () => {
        if (!accessToken) throw new Error(getApiErrorMessage(locale, 'unauthorized'));
        return authenticatedRequest<LaunchUserStatus>('/launch/me', accessToken);
      },
      getAdminOverview: () => {
        if (!accessToken) throw new Error(getApiErrorMessage(locale, 'unauthorized'));
        return authenticatedRequest<LaunchAdminOverview>(
          '/admin/launch-program',
          accessToken,
        );
      },
    }),
    [accessToken, locale],
  );
}

export function useLaunchPublicProgram() {
  const api = useLaunchApi();
  const [program, setProgram] = useState<LaunchPublicProgram | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve()
      .then(() => api.getPublicProgram())
      .then((res) => {
        if (!cancelled) {
          setProgram(res);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setProgram(null);
          setIsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [api]);

  return { program, isLoading };
}

export function useMyLaunchStatus(enabled = true) {
  const { accessToken } = useAuth();
  const api = useLaunchApi();
  const [status, setStatus] = useState<LaunchUserStatus | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(accessToken && enabled));

  const reload = useCallback(async () => {
    if (!accessToken || !enabled) {
      setStatus(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const res = await api.getMyStatus();
      setStatus(res);
    } catch {
      setStatus(null);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, enabled, api]);

  useEffect(() => {
    let cancelled = false;

    if (!accessToken || !enabled) {
      void Promise.resolve().then(() => {
        if (!cancelled) {
          setStatus(null);
          setIsLoading(false);
        }
      });
      return () => {
        cancelled = true;
      };
    }

    void api
      .getMyStatus()
      .then((res) => {
        if (!cancelled) {
          setStatus(res);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStatus(null);
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken, enabled, api]);

  return { status, isLoading, reload };
}
