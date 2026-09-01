'use client';

import Image from 'next/image';
import { RatingStars } from '@/components/rating/rating-stars';

export interface ReviewItem {
  id: string;
  rating: number;
  comment?: string | null;
  createdAt: string;
  reviewer?: {
    username: string;
    displayName: string;
    profilePhoto?: string | null;
  } | null;
  project?: { title: string; slug?: string };
}

export function ReviewCard({ review }: { review: ReviewItem }) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="flex items-center gap-3">
        {review.reviewer?.profilePhoto ? (
          <Image
            src={review.reviewer.profilePhoto}
            alt=""
            width={40}
            height={40}
            className="h-10 w-10 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-sm">
            {review.reviewer?.displayName?.[0] ?? '?'}
          </div>
        )}
        <div>
          <p className="font-medium">{review.reviewer?.displayName}</p>
          <p className="text-xs text-slate-500">{review.project?.title}</p>
        </div>
      </div>
      <div className="mt-2">
        <RatingStars value={review.rating} readOnly size="sm" />
      </div>
      {review.comment ? (
        <p className="mt-2 text-sm text-slate-700">{review.comment}</p>
      ) : null}
      <p className="mt-2 text-xs text-slate-400">
        {new Date(review.createdAt).toLocaleDateString('ar-LY')}
      </p>
    </div>
  );
}

export function RatingSummary({
  average,
  count,
}: {
  average: number;
  count: number;
}) {
  return (
    <p className="text-sm text-slate-600">
      ⭐ {average.toFixed(1)} · {count} تقييم
    </p>
  );
}
