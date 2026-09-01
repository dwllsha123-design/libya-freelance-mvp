'use client';

import { useMemo } from 'react';
import { useAuth } from '@/contexts/auth-context';
import {
  apiRequest,
  authenticatedRequest,
  type Category,
  type City,
  type Skill,
} from '@/lib/api';
import type {
  ManageProject,
  PaginatedProjects,
  ProjectListItem,
} from '@/lib/schemas/project';

export function useProjectsApi() {
  const { accessToken } = useAuth();

  return useMemo(
    () => ({
    listPublic: (params: Record<string, string>) => {
      const qs = new URLSearchParams(params).toString();
      return apiRequest<PaginatedProjects>(`/projects?${qs}`);
    },

    getBySlug: (slug: string) =>
      apiRequest<ProjectListItem>(`/projects/slug/${slug}`),

    listMine: (status?: string, page = '1', limit = '50') => {
      if (!accessToken) throw new Error('غير مصرح');
      const params = new URLSearchParams({ page, limit });
      if (status) params.set('status', status);
      return authenticatedRequest<{ items: ManageProject[]; total: number }>(
        `/projects/manage?${params.toString()}`,
        accessToken,
      ).then((res) => res.items);
    },

    getManage: (id: string) => {
      if (!accessToken) throw new Error('غير مصرح');
      return authenticatedRequest<ManageProject>(
        `/projects/${id}/manage`,
        accessToken,
      );
    },

    create: (payload: Record<string, unknown>) => {
      if (!accessToken) throw new Error('غير مصرح');
      return authenticatedRequest<ManageProject>('/projects', accessToken, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    update: (id: string, payload: Record<string, unknown>) => {
      if (!accessToken) throw new Error('غير مصرح');
      return authenticatedRequest<ManageProject>(
        `/projects/${id}`,
        accessToken,
        { method: 'PATCH', body: JSON.stringify(payload) },
      );
    },

    publish: (id: string) => {
      if (!accessToken) throw new Error('غير مصرح');
      return authenticatedRequest<ManageProject>(
        `/projects/${id}/publish`,
        accessToken,
        { method: 'POST' },
      );
    },

    close: (id: string) => {
      if (!accessToken) throw new Error('غير مصرح');
      return authenticatedRequest<ManageProject>(
        `/projects/${id}/close`,
        accessToken,
        { method: 'POST' },
      );
    },

    cancel: (id: string) => {
      if (!accessToken) throw new Error('غير مصرح');
      return authenticatedRequest<ManageProject>(
        `/projects/${id}/cancel`,
        accessToken,
        { method: 'POST' },
      );
    },

    complete: (id: string) => {
      if (!accessToken) throw new Error('غير مصرح');
      return authenticatedRequest<ManageProject>(
        `/projects/${id}/complete`,
        accessToken,
        { method: 'POST' },
      );
    },

    requestCompletion: (id: string) => {
      if (!accessToken) throw new Error('غير مصرح');
      return authenticatedRequest<ManageProject>(
        `/projects/${id}/request-completion`,
        accessToken,
        { method: 'POST' },
      );
    },

    delete: (id: string) => {
      if (!accessToken) throw new Error('غير مصرح');
      return authenticatedRequest<{ message: string }>(
        `/projects/${id}`,
        accessToken,
        { method: 'DELETE' },
      );
    },

    loadFormData: () =>
      Promise.all([
        apiRequest<Category[]>('/categories'),
        apiRequest<Skill[]>('/skills'),
        apiRequest<City[]>('/cities'),
      ]),
    }),
    [accessToken],
  );
}
