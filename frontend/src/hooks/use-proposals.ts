'use client';

import { useLocale } from 'next-intl';
import { useMemo } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { authenticatedRequest, getApiErrorMessage } from '@/lib/api';
import type { AppLocale } from '@/i18n/routing';

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
  boostPoints?: number;
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
  const locale = useLocale() as AppLocale;

  return useMemo(
    () => ({
      submit: (
        projectId: string,
        payload: {
          coverLetter: string;
          proposedPrice: number;
          estimatedDurationDays: number;
          boostPoints?: number;
        },
      ) => {
        if (!accessToken) throw new Error(getApiErrorMessage(locale, 'unauthorized'));
        const body: {
          coverLetter: string;
          proposedPrice: number;
          estimatedDurationDays: number;
          boostPoints?: number;
        } = {
          coverLetter: payload.coverLetter,
          proposedPrice: payload.proposedPrice,
          estimatedDurationDays: payload.estimatedDurationDays,
        };
        if (payload.boostPoints != null && payload.boostPoints > 0) {
          body.boostPoints = payload.boostPoints;
        }
        return authenticatedRequest<FreelancerProposal>(
          `/projects/${projectId}/proposals`,
          accessToken,
          { method: 'POST', body: JSON.stringify(body) },
        );
      },

      listMine: (status?: string) => {
        if (!accessToken) throw new Error(getApiErrorMessage(locale, 'unauthorized'));
        const qs = status ? `?status=${status}` : '';
        return authenticatedRequest<PaginatedProposals>(
          `/proposals/me${qs}`,
          accessToken,
        );
      },

      getMyForProject: (projectId: string) => {
        if (!accessToken) throw new Error(getApiErrorMessage(locale, 'unauthorized'));
        return authenticatedRequest<FreelancerProposal>(
          `/projects/${projectId}/proposals/me`,
          accessToken,
        );
      },

      listForProject: (projectId: string) => {
        if (!accessToken) throw new Error(getApiErrorMessage(locale, 'unauthorized'));
        return authenticatedRequest<ClientProposal[]>(
          `/projects/${projectId}/proposals`,
          accessToken,
        );
      },

      accept: (id: string) => {
        if (!accessToken) throw new Error(getApiErrorMessage(locale, 'unauthorized'));
        return authenticatedRequest<ClientProposal>(
          `/proposals/${id}/accept`,
          accessToken,
          { method: 'POST' },
        );
      },

      reject: (id: string) => {
        if (!accessToken) throw new Error(getApiErrorMessage(locale, 'unauthorized'));
        return authenticatedRequest<ClientProposal>(
          `/proposals/${id}/reject`,
          accessToken,
          { method: 'POST' },
        );
      },

      withdraw: (id: string) => {
        if (!accessToken) throw new Error(getApiErrorMessage(locale, 'unauthorized'));
        return authenticatedRequest<FreelancerProposal>(
          `/proposals/${id}/withdraw`,
          accessToken,
          { method: 'POST' },
        );
      },
    }),
    [accessToken, locale],
  );
}
