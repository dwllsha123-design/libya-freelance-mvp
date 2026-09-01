'use client';

import { useMemo } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { authenticatedRequest } from '@/lib/api';
import type { ReviewItem } from '@/components/rating/review-card';

export function useReviewsApi() {
  const { accessToken } = useAuth();

  return useMemo(
    () => ({
      submit: (projectId: string, payload: { rating: number; comment?: string }) => {
        if (!accessToken) throw new Error('غير مصرح');
        return authenticatedRequest<ReviewItem>(
          `/projects/${projectId}/review`,
          accessToken,
          { method: 'POST', body: JSON.stringify(payload) },
        );
      },

      status: (projectId: string) => {
        if (!accessToken) throw new Error('غير مصرح');
        return authenticatedRequest<{
          canReview: boolean;
          hasReviewed: boolean;
          myReview: { rating: number; comment?: string | null } | null;
        }>(`/projects/${projectId}/review-status`, accessToken);
      },
    }),
    [accessToken],
  );
}
