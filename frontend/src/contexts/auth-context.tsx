'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { AuthResponse, AuthUser } from '@/lib/api';
import { apiRequest, authenticatedRequest } from '@/lib/api';

interface AuthContextValue {
  user: AuthUser | null;
  accessToken: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    confirmPassword: string;
    role: 'FREELANCER' | 'CLIENT';
  }) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const applySession = useCallback((response: AuthResponse) => {
    setUser(response.user);
    setAccessToken(response.accessToken);
  }, []);

  const clearSession = useCallback(() => {
    setUser(null);
    setAccessToken(null);
  }, []);

  const refreshSession = useCallback(async () => {
    const refresh = await apiRequest<{ accessToken: string }>('/auth/refresh', {
      method: 'POST',
    });

    setAccessToken(refresh.accessToken);

    const me = await authenticatedRequest<AuthUser>('/auth/me', refresh.accessToken);
    setUser(me);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        await refreshSession();
      } catch {
        if (!cancelled) {
          clearSession();
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [clearSession, refreshSession]);

  const login = useCallback(
    async (email: string, password: string) => {
      const response = await apiRequest<AuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      applySession(response);
    },
    [applySession],
  );

  const register = useCallback(
    async (payload: {
      firstName: string;
      lastName: string;
      email: string;
      password: string;
      confirmPassword: string;
      role: 'FREELANCER' | 'CLIENT';
    }) => {
      const response = await apiRequest<AuthResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      applySession(response);
    },
    [applySession],
  );

  const logout = useCallback(async () => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const value = useMemo(
    () => ({
      user,
      accessToken,
      isLoading,
      login,
      register,
      logout,
      refreshSession,
    }),
    [user, accessToken, isLoading, login, register, logout, refreshSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
