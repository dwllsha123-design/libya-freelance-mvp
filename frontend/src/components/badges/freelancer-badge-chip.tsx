'use client';

import { useTranslations } from 'next-intl';
import type { PerformanceLevel } from '@/lib/badges';
import { PerformanceBadgeIcon } from '@/components/badges/badge-icons';

export function FreelancerBadgeChip({
  level,
  verifiedTalent = false,
  foundingFreelancer = false,
  compact = false,
  className = '',
}: {
  level?: PerformanceLevel | null;
  verifiedTalent?: boolean;
  foundingFreelancer?: boolean;
  compact?: boolean;
  className?: string;
}) {
  const t = useTranslations('badges');
  const showLevel = level && level !== 'NONE';

  if (!showLevel && !verifiedTalent && !foundingFreelancer) return null;

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      {foundingFreelancer ? (
        <span
          className={`inline-flex items-center gap-1 rounded-full border border-ember/35 bg-ember/10 ${
            compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs'
          } font-medium text-ember-deep`}
          title={t('tooltips.FOUNDING_FREELANCER')}
        >
          <span aria-hidden>★</span>
          <span className={compact ? 'max-w-[7rem] truncate' : ''}>
            {t('levels.FOUNDING_FREELANCER')}
          </span>
        </span>
      ) : null}
      {showLevel ? (
        <span
          className={`inline-flex items-center gap-1 rounded-full border border-outline-variant/50 bg-surface-container-low ${
            compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs'
          } font-medium text-on-surface`}
          title={t(`tooltips.${level}`)}
        >
          <PerformanceBadgeIcon level={level} size="sm" />
          <span className={compact ? 'max-w-[7rem] truncate' : ''}>
            {t(`levels.${level}`)}
          </span>
        </span>
      ) : null}
      {verifiedTalent ? (
        <span
          className={`inline-flex items-center gap-1 rounded-full border border-palm/30 bg-palm/10 ${
            compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs'
          } font-medium text-palm-deep`}
          title={t('tooltips.VERIFIED_TALENT')}
        >
          <PerformanceBadgeIcon level="VERIFIED_TALENT" size="sm" />
          <span className={compact ? 'max-w-[7rem] truncate' : ''}>
            {t('levels.VERIFIED_TALENT')}
          </span>
        </span>
      ) : null}
    </div>
  );
}
