'use client';

import { useState } from 'react';
import { ReviewCard, RatingSummary, type ReviewItem } from '@/components/rating/review-card';
import { apiRequest } from '@/lib/api';

export function ProfileReviewsSection({
  username,
  role,
  summary,
}: {
  username: string;
  role: 'freelancer' | 'client';
  summary?: {
    ratingAverage: number;
    reviewCount: number;
    latestReviews?: ReviewItem[];
  };
}) {
  const initialReviews = summary?.latestReviews ?? [];
  const [reviews, setReviews] = useState<ReviewItem[]>(initialReviews);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const reviewCount = summary?.reviewCount ?? 0;
  const ratingAverage = summary?.ratingAverage ?? 0;
  const displayedReviews = expanded ? reviews : initialReviews;

  async function loadPage(nextPage: number) {
    setIsLoading(true);
    try {
      const path =
        role === 'freelancer'
          ? `/freelancers/${username}/reviews?page=${nextPage}&limit=5`
          : `/clients/${username}/reviews?page=${nextPage}&limit=5`;
      const data = await apiRequest<{
        items: ReviewItem[];
        page: number;
        totalPages: number;
      }>(path);
      setReviews(data.items);
      setPage(data.page);
      setTotalPages(data.totalPages);
      setExpanded(true);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="mt-10">
      <h2 className="text-2xl font-bold text-[#0B132B]">التقييمات</h2>
      {reviewCount > 0 ? (
        <div className="mt-2">
          <RatingSummary average={ratingAverage} count={reviewCount} />
        </div>
      ) : (
        <p className="mt-4 text-slate-500">لا توجد تقييمات بعد</p>
      )}

      {displayedReviews.length > 0 ? (
        <div className="mt-6 grid gap-4">
          {displayedReviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      ) : null}

      {reviewCount > initialReviews.length && !expanded ? (
        <button
          type="button"
          disabled={isLoading}
          onClick={() => void loadPage(1)}
          className="mt-4 text-sm text-[#00A86B] disabled:opacity-50"
        >
          عرض كل التقييمات
        </button>
      ) : null}

      {expanded && totalPages > 1 ? (
        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            disabled={isLoading || page <= 1}
            onClick={() => void loadPage(page - 1)}
            className="rounded border px-3 py-1 text-sm disabled:opacity-50"
          >
            السابق
          </button>
          <span className="text-sm text-slate-500">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={isLoading || page >= totalPages}
            onClick={() => void loadPage(page + 1)}
            className="rounded border px-3 py-1 text-sm disabled:opacity-50"
          >
            التالي
          </button>
        </div>
      ) : null}
    </section>
  );
}
