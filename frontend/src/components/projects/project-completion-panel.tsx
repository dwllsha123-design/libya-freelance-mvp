'use client';

import { useEffect, useState } from 'react';
import { ConfirmDialog } from '@/components/projects/confirm-dialog';
import { ReviewForm } from '@/components/rating/review-form';
import { RatingStars } from '@/components/rating/rating-stars';
import { useReviewsApi } from '@/hooks/use-reviews';
import { useProjectsApi } from '@/hooks/use-projects';
import type { ManageProject } from '@/lib/schemas/project';
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
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewState, setReviewState] = useState<{
    canReview: boolean;
    hasReviewed: boolean;
    myReview: { rating: number; comment?: string | null } | null;
  } | null>(null);

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
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'فشل إتمام المشروع');
    } finally {
      setIsLoading(false);
    }
  }

  if (project.status === 'IN_PROGRESS') {
    return (
      <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
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
        <button
          type="button"
          onClick={() => setShowConfirm(true)}
          className="rounded-lg bg-[#00A86B] px-4 py-2 text-sm font-semibold text-white"
        >
          تأكيد إتمام المشروع
        </button>
        <ConfirmDialog
          open={showConfirm}
          title="تأكيد إتمام المشروع"
          message="هل أنت متأكد من أن المشروع تم إنجازه؟ هذا الإجراء يُعلّم المشروع مكتملاً على ليبيا فريلانس ولا يمثل معاملة مالية أو دفعاً."
          confirmLabel="تأكيد الإتمام"
          isLoading={isLoading}
          onConfirm={() => void handleComplete()}
          onCancel={() => setShowConfirm(false)}
        />
      </div>
    );
  }

  if (project.status === 'COMPLETED') {
    return (
      <div className="mb-6 space-y-4 rounded-xl border bg-white p-4">
        <p className="text-sm text-[#00A86B]">
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
              <p className="mt-2 text-sm text-slate-600">
                {reviewState.myReview.comment}
              </p>
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
