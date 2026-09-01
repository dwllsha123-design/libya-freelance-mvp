'use client';

import { useEffect, useState } from 'react';
import { EscrowStatusCard } from '@/components/escrow/escrow-status-card';
import { OpenDisputeDialog } from '@/components/escrow/open-dispute-dialog';
import { ReviewForm } from '@/components/rating/review-form';
import { RatingStars } from '@/components/rating/rating-stars';
import { useProjectsApi } from '@/hooks/use-projects';
import { useReviewsApi } from '@/hooks/use-reviews';
import { useEscrowApi, type EscrowRecord } from '@/hooks/use-escrow';
import type { FreelancerProposal } from '@/hooks/use-proposals';
import { ApiError } from '@/lib/api';

export function FreelancerProposalCompletion({
  proposal,
  onUpdated,
}: {
  proposal: FreelancerProposal;
  onUpdated: () => void;
}) {
  const projectsApi = useProjectsApi();
  const reviewsApi = useReviewsApi();
  const escrowApi = useEscrowApi();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [escrow, setEscrow] = useState<EscrowRecord | null>(null);
  const [showDispute, setShowDispute] = useState(false);
  const [requestedAt, setRequestedAt] = useState<string | null>(
    proposal.project.completionRequestedAt ?? null,
  );
  const [reviewState, setReviewState] = useState<{
    canReview: boolean;
    hasReviewed: boolean;
    myReview: { rating: number; comment?: string | null } | null;
  } | null>(null);

  const completionRequestedAt =
    requestedAt ?? proposal.project.completionRequestedAt ?? null;

  useEffect(() => {
    if (proposal.project.status !== 'IN_PROGRESS' && proposal.project.status !== 'COMPLETED') {
      return;
    }

    let cancelled = false;
    escrowApi
      .getByProject(proposal.project.id)
      .then((data) => {
        if (!cancelled) setEscrow(data);
      })
      .catch(() => {
        /* ignore */
      });

    return () => {
      cancelled = true;
    };
  }, [proposal.project.id, proposal.project.status, escrowApi]);

  useEffect(() => {
    if (proposal.project.status !== 'COMPLETED') return;

    let cancelled = false;

    reviewsApi
      .status(proposal.project.id)
      .then((data) => {
        if (!cancelled) setReviewState(data);
      })
      .catch(() => {
        /* ignore */
      });

    return () => {
      cancelled = true;
    };
  }, [proposal.project.id, proposal.project.status, reviewsApi]);

  async function handleRequestCompletion() {
    setIsLoading(true);
    setError(null);
    try {
      const updated = await projectsApi.requestCompletion(proposal.project.id);
      setRequestedAt(
        updated.completionRequestedAt ?? new Date().toISOString(),
      );
      onUpdated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'فشل إرسال طلب الإتمام');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleOpenDispute(reason: string) {
    if (!escrow) return;
    setIsLoading(true);
    setError(null);
    try {
      await escrowApi.openDispute(escrow.id, reason);
      const refreshed = await escrowApi.getByProject(proposal.project.id);
      setEscrow(refreshed);
      setShowDispute(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'فشل فتح النزاع');
    } finally {
      setIsLoading(false);
    }
  }

  if (
    proposal.status === 'ACCEPTED' &&
    proposal.project.status === 'IN_PROGRESS'
  ) {
    return (
      <div className="mt-4 space-y-3">
        {escrow ? <EscrowStatusCard escrow={escrow} /> : null}

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          {completionRequestedAt ? (
            <p className="text-sm text-primary">
              تم إرسال طلب الإتمام
              {` · ${new Date(completionRequestedAt).toLocaleDateString('ar-LY')}`}
            </p>
          ) : (
            <>
              {error ? <p className="mb-2 text-sm text-red-600">{error}</p> : null}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={isLoading || escrow?.status === 'DISPUTED'}
                  onClick={() => void handleRequestCompletion()}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {isLoading ? 'جاري الإرسال...' : 'طلب تأكيد إتمام المشروع'}
                </button>
                {escrow?.status === 'FUNDED' ? (
                  <button
                    type="button"
                    onClick={() => setShowDispute(true)}
                    className="rounded-lg border border-red-300 px-4 py-2 text-sm text-red-700"
                  >
                    فتح نزاع
                  </button>
                ) : null}
              </div>
            </>
          )}
        </div>

        <OpenDisputeDialog
          key={showDispute ? 'open' : 'closed'}
          open={showDispute}
          isLoading={isLoading}
          onClose={() => setShowDispute(false)}
          onSubmit={handleOpenDispute}
        />
      </div>
    );
  }

  if (
    proposal.status === 'ACCEPTED' &&
    proposal.project.status === 'COMPLETED'
  ) {
    return (
      <div className="mt-4 space-y-3 rounded-lg border bg-slate-50 p-3">
        {escrow ? <EscrowStatusCard escrow={escrow} /> : null}
        <p className="text-sm text-primary">
          مكتمل
          {proposal.project.completedAt
            ? ` · ${new Date(proposal.project.completedAt).toLocaleDateString('ar-LY')}`
            : ''}
        </p>
        {reviewState?.hasReviewed && reviewState.myReview ? (
          <div>
            <p className="mb-1 text-sm font-medium">تقييمك للعميل</p>
            <RatingStars value={reviewState.myReview.rating} readOnly />
            {reviewState.myReview.comment ? (
              <p className="mt-1 text-sm text-slate-600">
                {reviewState.myReview.comment}
              </p>
            ) : null}
          </div>
        ) : reviewState?.canReview ? (
          <div>
            <p className="mb-2 text-sm font-medium">قيّم العميل</p>
            <ReviewForm
              isSubmitting={isLoading}
              onSubmit={async (payload) => {
                setIsLoading(true);
                try {
                  await reviewsApi.submit(proposal.project.id, payload);
                  const status = await reviewsApi.status(proposal.project.id);
                  setReviewState(status);
                } finally {
                  setIsLoading(false);
                }
              }}
            />
          </div>
        ) : null}
      </div>
    );
  }

  return null;
}
