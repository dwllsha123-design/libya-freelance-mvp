'use client';

import { useTranslations } from 'next-intl';
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
  const t = useTranslations('ui');
  const textClass = size === 'md' ? 'text-sm' : 'text-xs';
  const projectLabel =
    completedProjects === 1
      ? t('projectCompleted', { count: completedProjects })
      : t('projectsCompleted', { count: completedProjects });

  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 ${textClass} text-on-surface-variant`}>
      <span className="inline-flex items-center gap-1">
        <RatingStars value={rating} readOnly size={size === 'md' ? 'md' : 'sm'} />
        <span className="font-semibold text-on-surface">{rating.toFixed(1)}</span>
        {reviewCount !== undefined && reviewCount > 0 ? (
          <span>({t('reviewCount', { count: reviewCount })})</span>
        ) : null}
      </span>
      <span className="inline-flex items-center gap-1">
        <span aria-hidden>✓</span>
        <span>{projectLabel}</span>
      </span>
    </div>
  );
}
