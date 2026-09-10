'use client';

import { useLocale } from 'next-intl';
import { useMemo } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { authenticatedRequest, getApiErrorMessage } from '@/lib/api';
import type { AppLocale } from '@/i18n/routing';

export type ProjectAgreementStatus =
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'PAYMENT_PENDING'
  | 'FUNDED'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'DISPUTED';

export type AgreementChangeType =
  | 'PRICE'
  | 'DEADLINE'
  | 'SCOPE'
  | 'DELIVERABLES'
  | 'REVISIONS'
  | 'OTHER';

export interface AgreementVersion {
  id: string;
  versionNumber: number;
  title: string;
  scope: string;
  deliverables: string;
  currency: string;
  grossAmount: number;
  platformFee: number;
  freelancerNet: number;
  durationDays: number;
  deliveryDate: string | null;
  revisionCount: number;
  paymentTerms: string;
  cancellationTerms: string;
  disputeTerms: string;
  createdAt: string;
  acceptances: Array<{
    id: string;
    userId: string;
    role: 'CLIENT' | 'FREELANCER';
    acceptedAt: string;
  }>;
  milestones: Array<{
    id: string;
    title: string;
    description: string | null;
    amount: number;
    sortOrder: number;
    dueDate: string | null;
    status: string;
  }>;
}

export interface ProjectAgreementDetail {
  id: string;
  status: ProjectAgreementStatus;
  projectId: string;
  proposalId: string;
  clientId: string;
  freelancerId: string;
  approvedAt: string | null;
  fundedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  project: {
    id: string;
    title: string;
    slug: string;
    status: string;
    description?: string;
  };
  proposal: { id: string; status: string; coverLetter?: string };
  client: { id: string; displayName: string | null; username: string | null };
  freelancer: { id: string; displayName: string | null; username: string | null };
  viewerRole: 'CLIENT' | 'FREELANCER' | null;
  clientAccepted: boolean;
  freelancerAccepted: boolean;
  iAccepted: boolean;
  canAccept: boolean;
  canRequestChange: boolean;
  canFund: boolean;
  canConfirmStart?: boolean;
  paymentProtectionActive?: boolean;
  directPaymentMode?: boolean;
  currentVersion: AgreementVersion | null;
  recentChangeRequests: Array<{
    id: string;
    changeType: AgreementChangeType;
    reason: string;
    status: string;
    createdAt: string;
  }>;
}

export interface AgreementTimelineEvent {
  id: string;
  action: string;
  versionId: string | null;
  metadata: unknown;
  createdAt: string;
  actor: {
    id: string;
    displayName: string | null;
    username: string | null;
  } | null;
}

export function useAgreementsApi() {
  const { accessToken } = useAuth();
  const locale = useLocale() as AppLocale;

  return useMemo(
    () => ({
      create: (proposalId: string) => {
        if (!accessToken) throw new Error(getApiErrorMessage(locale, 'unauthorized'));
        return authenticatedRequest<ProjectAgreementDetail>('/agreements', accessToken, {
          method: 'POST',
          body: JSON.stringify({ proposalId }),
        });
      },
      listMine: () => {
        if (!accessToken) throw new Error(getApiErrorMessage(locale, 'unauthorized'));
        return authenticatedRequest<unknown[]>('/agreements/me', accessToken);
      },
      get: (id: string) => {
        if (!accessToken) throw new Error(getApiErrorMessage(locale, 'unauthorized'));
        return authenticatedRequest<ProjectAgreementDetail>(`/agreements/${id}`, accessToken);
      },
      getByProject: (projectId: string) => {
        if (!accessToken) throw new Error(getApiErrorMessage(locale, 'unauthorized'));
        return authenticatedRequest<ProjectAgreementDetail>(
          `/agreements/project/${projectId}`,
          accessToken,
        );
      },
      accept: (id: string) => {
        if (!accessToken) throw new Error(getApiErrorMessage(locale, 'unauthorized'));
        return authenticatedRequest<ProjectAgreementDetail>(
          `/agreements/${id}/accept`,
          accessToken,
          { method: 'POST' },
        );
      },
      changeRequest: (
        id: string,
        body: {
          changeType: AgreementChangeType;
          reason: string;
          proposedTitle?: string;
          proposedScope?: string;
          proposedDeliverables?: string;
          proposedGrossAmount?: number;
          proposedDurationDays?: number;
          proposedRevisionCount?: number;
          proposedDeliveryDate?: string;
        },
      ) => {
        if (!accessToken) throw new Error(getApiErrorMessage(locale, 'unauthorized'));
        return authenticatedRequest<ProjectAgreementDetail>(
          `/agreements/${id}/change-request`,
          accessToken,
          { method: 'POST', body: JSON.stringify(body) },
        );
      },
      history: (id: string) => {
        if (!accessToken) throw new Error(getApiErrorMessage(locale, 'unauthorized'));
        return authenticatedRequest<{ timeline: AgreementTimelineEvent[] }>(
          `/agreements/${id}/history`,
          accessToken,
        );
      },
      versions: (id: string) => {
        if (!accessToken) throw new Error(getApiErrorMessage(locale, 'unauthorized'));
        return authenticatedRequest<AgreementVersion[]>(
          `/agreements/${id}/versions`,
          accessToken,
        );
      },
    }),
    [accessToken, locale],
  );
}
