'use client';

import { useMemo } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { authenticatedRequest } from '@/lib/api';

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function useAdminApi() {
  const { accessToken } = useAuth();

  return useMemo(() => {
    function requireToken() {
      if (!accessToken) throw new Error('غير مصرح');
      return accessToken;
    }

    function qs(params: Record<string, string | undefined>) {
      const entries = Object.entries(params).filter(([, v]) => v != null && v !== '');
      return entries.length ? `?${new URLSearchParams(entries as [string, string][])}` : '';
    }

    return {
      dashboard: () =>
        authenticatedRequest<{
          users: {
            total: number;
            freelancers: number;
            clients: number;
            suspended: number;
            banned: number;
          };
          projects: {
            total: number;
            open: number;
            inProgress: number;
            completed: number;
          };
          proposals: { total: number };
          reviews: { total: number };
        }>('/admin/dashboard', requireToken()),

      users: (params: Record<string, string | undefined> = {}) =>
        authenticatedRequest<Paginated<Record<string, unknown>>>(
          `/admin/users${qs(params)}`,
          requireToken(),
        ),

      user: (id: string) =>
        authenticatedRequest<Record<string, unknown>>(`/admin/users/${id}`, requireToken()),

      suspendUser: (id: string) =>
        authenticatedRequest(`/admin/users/${id}/suspend`, requireToken(), { method: 'POST' }),

      banUser: (id: string) =>
        authenticatedRequest(`/admin/users/${id}/ban`, requireToken(), { method: 'POST' }),

      reactivateUser: (id: string) =>
        authenticatedRequest(`/admin/users/${id}/reactivate`, requireToken(), { method: 'POST' }),

      projects: (params: Record<string, string | undefined> = {}) =>
        authenticatedRequest<Paginated<Record<string, unknown>>>(
          `/admin/projects${qs(params)}`,
          requireToken(),
        ),

      project: (id: string) =>
        authenticatedRequest<Record<string, unknown>>(`/admin/projects/${id}`, requireToken()),

      closeProject: (id: string) =>
        authenticatedRequest(`/admin/projects/${id}/close`, requireToken(), { method: 'POST' }),

      proposals: (params: Record<string, string | undefined> = {}) =>
        authenticatedRequest<Paginated<Record<string, unknown>>>(
          `/admin/proposals${qs(params)}`,
          requireToken(),
        ),

      reviews: (params: Record<string, string | undefined> = {}) =>
        authenticatedRequest<Paginated<Record<string, unknown>>>(
          `/admin/reviews${qs(params)}`,
          requireToken(),
        ),

      hideReview: (id: string) =>
        authenticatedRequest(`/admin/reviews/${id}/hide`, requireToken(), { method: 'POST' }),

      restoreReview: (id: string) =>
        authenticatedRequest(`/admin/reviews/${id}/restore`, requireToken(), { method: 'POST' }),

      categories: (params: Record<string, string | undefined> = {}) =>
        authenticatedRequest<Paginated<Record<string, unknown>>>(
          `/admin/categories${qs(params)}`,
          requireToken(),
        ),

      createCategory: (body: Record<string, unknown>) =>
        authenticatedRequest('/admin/categories', requireToken(), {
          method: 'POST',
          body: JSON.stringify(body),
        }),

      updateCategory: (id: string, body: Record<string, unknown>) =>
        authenticatedRequest(`/admin/categories/${id}`, requireToken(), {
          method: 'PATCH',
          body: JSON.stringify(body),
        }),

      activateCategory: (id: string) =>
        authenticatedRequest(`/admin/categories/${id}/activate`, requireToken(), { method: 'POST' }),

      deactivateCategory: (id: string) =>
        authenticatedRequest(`/admin/categories/${id}/deactivate`, requireToken(), { method: 'POST' }),

      skills: (params: Record<string, string | undefined> = {}) =>
        authenticatedRequest<Paginated<Record<string, unknown>>>(
          `/admin/skills${qs(params)}`,
          requireToken(),
        ),

      createSkill: (body: Record<string, unknown>) =>
        authenticatedRequest('/admin/skills', requireToken(), {
          method: 'POST',
          body: JSON.stringify(body),
        }),

      updateSkill: (id: string, body: Record<string, unknown>) =>
        authenticatedRequest(`/admin/skills/${id}`, requireToken(), {
          method: 'PATCH',
          body: JSON.stringify(body),
        }),

      activateSkill: (id: string) =>
        authenticatedRequest(`/admin/skills/${id}/activate`, requireToken(), { method: 'POST' }),

      deactivateSkill: (id: string) =>
        authenticatedRequest(`/admin/skills/${id}/deactivate`, requireToken(), { method: 'POST' }),

      audit: (params: Record<string, string | undefined> = {}) =>
        authenticatedRequest<Paginated<Record<string, unknown>>>(
          `/admin/audit${qs(params)}`,
          requireToken(),
        ),
    };
  }, [accessToken]);
}
