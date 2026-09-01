'use client';

import { useEffect, useState } from 'react';
import { ConfirmDialog } from '@/components/projects/confirm-dialog';
import { EscrowStatusCard } from '@/components/escrow/escrow-status-card';
import { OpenDisputeDialog } from '@/components/escrow/open-dispute-dialog';
import { ReviewForm } from '@/components/rating/review-form';
import { RatingStars } from '@/components/rating/rating-stars';
import { useReviewsApi } from '@/hooks/use-reviews';
import { useProjectsApi } from '@/hooks/use-projects';
import { useEscrowApi, type EscrowRecord } from '@/hooks/use-escrow';
import type { ManageProject } from '@/lib/schemas/project';
import { PLATFORM_NAME_AR } from '@/lib/branding';
import { ApiError } from '@/lib/api';

export function ProjectCompletionPanel({
  project,
  onUpdated,
}: {
  project: ManageProject;
  onUpdated: (project: ManageProject) => void;
}) {
  const projectsApi = useProjectsApi();
  const reviewsApi = useReviewsApi();
  const escrowApi = useEscrowApi();
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [escrow, setEscrow] = useState<EscrowRecord | null>(null);
  const [showDispute, setShowDispute] = useState(false);
  const [reviewState, setReviewState] = useState<{
    canReview: boolean;
    hasReviewed: boolean;
    myReview: { rating: number; comment?: string | null } | null;
  } | null>(null);

  useEffect(() => {
    if (project.status !== 'IN_PROGRESS' && project.status !== 'COMPLETED') return;

    let cancelled = false;
    escrowApi
      .getByProject(project.id)
      .then((data) => {
        if (!cancelled) setEscrow(data);
      })
      .catch(() => {
        /* ignore */
      });

    return () => {
      cancelled = true;
    };
  }, [project.id, project.status, escrowApi]);

  useEffect(() => {
    if (project.status !== 'COMPLETED') return;

    let cancelled = false;

    reviewsApi
      .status(project.id)
      .then((data) => {
        if (!cancelled) setReviewState(data);
      })
      .catch(() => {
        /* ignore */
      });

    return () => {
      cancelled = true;
    };
  }, [project.id, project.status, reviewsApi]);

  async function handleComplete() {
    setIsLoading(true);
    setError(null);
    try {
      const updated = await projectsApi.complete(project.id);
      onUpdated(updated);
      setShowConfirm(false);
      const refreshed = await escrowApi.getByProject(project.id);
      setEscrow(refreshed);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'فشل إتمام المشروع');
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
      const refreshed = await escrowApi.getByProject(project.id);
      setEscrow(refreshed);
      setShowDispute(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'فشل فتح النزاع');
    } finally {
      setIsLoading(false);
    }
  }

  if (project.status === 'IN_PROGRESS') {
    return (
      <div className="mb-6 space-y-4">
        {escrow ? <EscrowStatusCard escrow={escrow} /> : null}

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          {project.completionRequestedAt ? (
            <p className="mb-3 text-sm text-amber-900">
              طلب المستقل تأكيد إتمام المشروع.
            </p>
          ) : null}
          {project.acceptedFreelancer ? (
            <p className="mb-3 text-sm text-slate-700">
              المستقل المقبول: {project.acceptedFreelancer.displayName}
            </p>
          ) : null}
          {error ? <p className="mb-2 text-sm text-red-600">{error}</p> : null}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowConfirm(true)}
              disabled={escrow?.status === 'DISPUTED'}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              تأكيد الإتمام وتحرير الضمان
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
        </div>

        <ConfirmDialog
          open={showConfirm}
          title="تأكيد إتمام المشروع"
          message={
            escrow
              ? `هل أنجز المستقل العمل كما اتفقتم؟ سيتم تحرير ${escrow.freelancerPayout} د.ل للمستقل من الضمان.`
              : `هل أنت متأكد من إتمام المشروع على ${PLATFORM_NAME_AR}؟`
          }
          confirmLabel="تأكيد الإتمام"
          isLoading={isLoading}
          onConfirm={() => void handleComplete()}
          onCancel={() => setShowConfirm(false)}
        />

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

  if (project.status === 'COMPLETED') {
    return (
      <div className="mb-6 space-y-4 rounded-xl border bg-white p-4">
        {escrow ? <EscrowStatusCard escrow={escrow} /> : null}
        <p className="text-sm text-primary">
          مكتمل
          {project.completedAt
            ? ` · ${new Date(project.completedAt).toLocaleDateString('ar-LY')}`
            : ''}
        </p>
        {reviewState?.hasReviewed && reviewState.myReview ? (
          <div>
            <p className="mb-2 text-sm font-medium">تقييمك</p>
            <RatingStars value={reviewState.myReview.rating} readOnly />
            {reviewState.myReview.comment ? (
              <p className="mt-2 text-sm text-slate-600">{reviewState.myReview.comment}</p>
            ) : null}
          </div>
        ) : reviewState?.canReview ? (
          <div>
            <p className="mb-2 text-sm font-medium">قيّم المستقل</p>
            <ReviewForm
              isSubmitting={isLoading}
              onSubmit={async (payload) => {
                setIsLoading(true);
                try {
                  await reviewsApi.submit(project.id, payload);
                  const status = await reviewsApi.status(project.id);
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
