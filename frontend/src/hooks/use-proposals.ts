'use client';

import { useMemo } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { authenticatedRequest } from '@/lib/api';

export interface FreelancerProposal {
  id: string;
  coverLetter: string;
  proposedPrice: number;
  estimatedDurationDays: number;
  status: string;
  createdAt: string;
  conversationId?: string | null;
  project: {
    id: string;
    title: string;
    slug: string;
    status: string;
    budgetMin: number;
    budgetMax: number;
    currency: string;
    completionRequestedAt?: string | null;
    completedAt?: string | null;
  };
}

export interface ClientProposal {
  id: string;
  coverLetter: string;
  proposedPrice: number;
  estimatedDurationDays: number;
  status: string;
  createdAt: string;
  freelancer: {
    username: string;
    displayName: string;
    profilePhoto?: string | null;
    professionalTitle?: string | null;
    rating?: number | null;
    completedProjects: number;
    skills: { name: string; slug: string }[];
    portfolio?: {
      count: number;
      recentThumbnails: string[];
    };
  } | null;
}

export interface PaginatedProposals {
  items: FreelancerProposal[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function useProposalsApi() {
  const { accessToken } = useAuth();

  return useMemo(
    () => ({
      submit: (
        projectId: string,
        payload: {
          coverLetter: string;
          proposedPrice: number;
          estimatedDurationDays: number;
        },
      ) => {
        if (!accessToken) throw new Error('غير مصرح');
        return authenticatedRequest<FreelancerProposal>(
          `/projects/${projectId}/proposals`,
          accessToken,
          { method: 'POST', body: JSON.stringify(payload) },
        );
      },

      listMine: (status?: string) => {
        if (!accessToken) throw new Error('غير مصرح');
        const qs = status ? `?status=${status}` : '';
        return authenticatedRequest<PaginatedProposals>(
          `/proposals/me${qs}`,
          accessToken,
        );
      },

      getMyForProject: (projectId: string) => {
        if (!accessToken) throw new Error('غير مصرح');
        return authenticatedRequest<FreelancerProposal>(
          `/projects/${projectId}/proposals/me`,
          accessToken,
        );
      },

      listForProject: (projectId: string) => {
        if (!accessToken) throw new Error('غير مصرح');
        return authenticatedRequest<ClientProposal[]>(
          `/projects/${projectId}/proposals`,
          accessToken,
        );
      },

      accept: (id: string) => {
        if (!accessToken) throw new Error('غير مصرح');
        return authenticatedRequest<ClientProposal>(
          `/proposals/${id}/accept`,
          accessToken,
          { method: 'POST' },
        );
      },

      reject: (id: string) => {
        if (!accessToken) throw new Error('غير مصرح');
        return authenticatedRequest<ClientProposal>(
          `/proposals/${id}/reject`,
          accessToken,
          { method: 'POST' },
        );
      },

      withdraw: (id: string) => {
        if (!accessToken) throw new Error('غير مصرح');
        return authenticatedRequest<FreelancerProposal>(
          `/proposals/${id}/withdraw`,
          accessToken,
          { method: 'POST' },
        );
      },
    }),
    [accessToken],
  );
}
