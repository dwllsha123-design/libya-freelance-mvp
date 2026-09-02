'use client';

import { useLocale } from 'next-intl';
import { useMemo } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { authenticatedRequest, getApiErrorMessage } from '@/lib/api';
import type { ReviewItem } from '@/components/rating/review-card';
import type { AppLocale } from '@/i18n/routing';

export function useReviewsApi() {
  const { accessToken } = useAuth();
  const locale = useLocale() as AppLocale;

  return useMemo(
    () => ({
      submit: (projectId: string, payload: { rating: number; comment?: string }) => {
        if (!accessToken) throw new Error(getApiErrorMessage(locale, 'unauthorized'));
        return authenticatedRequest<ReviewItem>(
          `/projects/${projectId}/review`,
          accessToken,
          { method: 'POST', body: JSON.stringify(payload) },
        );
      },

      status: (projectId: string) => {
        if (!accessToken) throw new Error(getApiErrorMessage(locale, 'unauthorized'));
        return authenticatedRequest<{
          canReview: boolean;
          hasReviewed: boolean;
          myReview: { rating: number; comment?: string | null } | null;
        }>(`/projects/${projectId}/review-status`, accessToken);
      },
    }),
    [accessToken, locale],
  );
}
