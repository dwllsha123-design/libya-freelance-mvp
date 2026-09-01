import { RatingStars } from '@/components/rating/rating-stars';

export function FreelancerTrustStats({
  rating,
  completedProjects,
  reviewCount,
  size = 'sm',
}: {
  rating: number;
  completedProjects: number;
  reviewCount?: number;
  size?: 'sm' | 'md';
}) {
  const textClass = size === 'md' ? 'text-sm' : 'text-xs';

  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 ${textClass} text-on-surface-variant`}>
      <span className="inline-flex items-center gap-1">
        <RatingStars value={rating} readOnly size={size === 'md' ? 'md' : 'sm'} />
        <span className="font-semibold text-on-surface">{rating.toFixed(1)}</span>
        {reviewCount !== undefined && reviewCount > 0 ? (
          <span>({reviewCount} تقييم)</span>
        ) : null}
      </span>
      <span className="inline-flex items-center gap-1">
        <span aria-hidden>✓</span>
        <span>
          {completedProjects} مشروع{completedProjects === 1 ? '' : ' مكتمل'}
        </span>
      </span>
    </div>
  );
}
