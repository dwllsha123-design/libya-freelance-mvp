'use client';

import { useMemo } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { API_BASE_URL, CLIENT_REQUEST_HEADER, CLIENT_REQUEST_VALUE, authenticatedRequest } from '@/lib/api';

export interface PortfolioImage {
  id: string;
  imageUrl: string;
  sortOrder: number;
}

export interface PortfolioItem {
  id: string;
  title: string;
  description: string;
  projectUrl?: string | null;
  completedAt?: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  skills: { id: string; name: string; slug: string }[];
  images: PortfolioImage[];
  coverImage?: string | null;
}

export interface PublicPortfolioItem {
  id: string;
  title: string;
  description: string;
  projectUrl?: string | null;
  completedAt?: string | null;
  skills: { id: string; name: string; slug: string }[];
  images: PortfolioImage[];
  coverImage?: string | null;
}

export function usePortfolioApi() {
  const { accessToken } = useAuth();

  return useMemo(
    () => ({
      listMine: () => {
        if (!accessToken) throw new Error('غير مصرح');
        return authenticatedRequest<PortfolioItem[]>('/portfolio/me', accessToken);
      },

      create: (payload: {
        title: string;
        description: string;
        projectUrl?: string;
        skillIds: string[];
        completedAt?: string;
      }) => {
        if (!accessToken) throw new Error('غير مصرح');
        return authenticatedRequest<PortfolioItem>('/portfolio', accessToken, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      },

      update: (
        id: string,
        payload: Partial<{
          title: string;
          description: string;
          projectUrl: string | null;
          skillIds: string[];
          completedAt: string | null;
        }>,
      ) => {
        if (!accessToken) throw new Error('غير مصرح');
        return authenticatedRequest<PortfolioItem>(`/portfolio/${id}`, accessToken, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      },

      remove: (id: string) => {
        if (!accessToken) throw new Error('غير مصرح');
        return authenticatedRequest<{ ok: boolean }>(`/portfolio/${id}`, accessToken, {
          method: 'DELETE',
        });
      },

      reorder: (itemIds: string[]) => {
        if (!accessToken) throw new Error('غير مصرح');
        return authenticatedRequest<PortfolioItem[]>('/portfolio/reorder', accessToken, {
          method: 'PATCH',
          body: JSON.stringify({ itemIds }),
        });
      },

      uploadImage: async (itemId: string, file: File) => {
        if (!accessToken) throw new Error('غير مصرح');
        const form = new FormData();
        form.append('file', file);

        const response = await fetch(`${API_BASE_URL}/portfolio/${itemId}/images`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            [CLIENT_REQUEST_HEADER]: CLIENT_REQUEST_VALUE,
          },
          body: form,
          credentials: 'include',
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(
            typeof data.message === 'string' ? data.message : 'فشل رفع الصورة',
          );
        }

        return data as PortfolioImage;
      },

      deleteImage: (itemId: string, imageId: string) => {
        if (!accessToken) throw new Error('غير مصرح');
        return authenticatedRequest<{ ok: boolean }>(
          `/portfolio/${itemId}/images/${imageId}`,
          accessToken,
          { method: 'DELETE' },
        );
      },
    }),
    [accessToken],
  );
}
