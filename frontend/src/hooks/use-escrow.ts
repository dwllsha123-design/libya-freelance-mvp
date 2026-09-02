'use client';

import { useLocale } from 'next-intl';
import { useMemo } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { authenticatedRequest, getApiErrorMessage } from '@/lib/api';
import type { AppLocale } from '@/i18n/routing';

export type EscrowStatus =
  | 'PENDING_FUNDING'
  | 'FUNDED'
  | 'RELEASED'
  | 'REFUNDED'
  | 'DISPUTED';

export interface EscrowRecord {
  id: string;
  projectId: string;
  proposalId: string;
  amount: number;
  platformFee: number;
  freelancerPayout: number;
  currency: string;
  status: EscrowStatus;
  fundedAt?: string | null;
  releasedAt?: string | null;
  refundedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  dispute?: { id: string; status: string; reason: string } | null;
  project?: {
    id: string;
    title: string;
    slug: string;
    status: string;
  };
}

export function useEscrowApi() {
  const { accessToken } = useAuth();
  const locale = useLocale() as AppLocale;

  return useMemo(
    () => ({
      listMine: () => {
        if (!accessToken) throw new Error(getApiErrorMessage(locale, 'unauthorized'));
        return authenticatedRequest<EscrowRecord[]>('/escrow/me', accessToken);
      },
      getByProposal: (proposalId: string) => {
        if (!accessToken) throw new Error(getApiErrorMessage(locale, 'unauthorized'));
        return authenticatedRequest<EscrowRecord | null>(
          `/escrow/proposal/${proposalId}`,
          accessToken,
        );
      },
      getByProject: (projectId: string) => {
        if (!accessToken) throw new Error(getApiErrorMessage(locale, 'unauthorized'));
        return authenticatedRequest<EscrowRecord | null>(
          `/escrow/project/${projectId}`,
          accessToken,
        );
      },
      prepare: (proposalId: string) => {
        if (!accessToken) throw new Error(getApiErrorMessage(locale, 'unauthorized'));
        return authenticatedRequest<EscrowRecord>(
          `/escrow/prepare/${proposalId}`,
          accessToken,
          { method: 'POST' },
        );
      },
      fund: (escrowId: string) => {
        if (!accessToken) throw new Error(getApiErrorMessage(locale, 'unauthorized'));
        return authenticatedRequest<EscrowRecord>(`/escrow/fund/${escrowId}`, accessToken, {
          method: 'POST',
        });
      },
      fundAndAccept: (proposalId: string) => {
        if (!accessToken) throw new Error(getApiErrorMessage(locale, 'unauthorized'));
        return authenticatedRequest<unknown>(
          `/escrow/fund-and-accept/${proposalId}`,
          accessToken,
          { method: 'POST' },
        );
      },
      openDispute: (escrowId: string, reason: string) => {
        if (!accessToken) throw new Error(getApiErrorMessage(locale, 'unauthorized'));
        return authenticatedRequest<unknown>(`/escrow/${escrowId}/dispute`, accessToken, {
          method: 'POST',
          body: JSON.stringify({ reason }),
        });
      },
    }),
    [accessToken, locale],
  );
}
