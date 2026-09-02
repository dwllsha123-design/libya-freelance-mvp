'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { RatingStars } from '@/components/rating/rating-stars';

export function ReviewForm({
  onSubmit,
  isSubmitting,
}: {
  onSubmit: (payload: { rating: number; comment?: string }) => Promise<void>;
  isSubmitting: boolean;
}) {
  const t = useTranslations('ui');
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (rating < 1) {
      setError(t('selectRating'));
      return;
    }

    try {
      await onSubmit({
        rating,
        comment: comment.trim() || undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('submitReviewFailed'));
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3 rounded-xl border bg-white p-4">
      <p className="font-medium text-on-surface">{t('addYourReview')}</p>
      <RatingStars value={rating} onChange={setRating} />
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder={t('commentOptional')}
        className="min-h-24 w-full rounded-lg border px-3 py-2 text-sm"
        maxLength={2000}
      />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {isSubmitting ? t('submittingReview') : t('submitReview')}
      </button>
    </form>
  );
}
