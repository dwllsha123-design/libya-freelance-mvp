'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { authenticatedRequest } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';
import type { FreelancerBadgesResponse } from '@/lib/badges';
import { PerformanceBadgeIcon } from '@/components/badges/badge-icons';
import { BadgesRequirementsModal } from '@/components/badges/badges-requirements-modal';
import { FreelancerBadgeChip } from '@/components/badges/freelancer-badge-chip';

export function FreelancerBadgesSection() {
  const t = useTranslations('badges');
  const { accessToken } = useAuth();
  const [data, setData] = useState<FreelancerBadgesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    authenticatedRequest<FreelancerBadgesResponse>('/freelancers/me/badges', accessToken)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch(() => {
        if (!cancelled) setError(t('loadFailed'));
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken, t]);

  if (!accessToken) return null;

  const next = data?.nextLevelProgress;
  const projectsPct = next
    ? Math.min(
        100,
        Math.round(
          (next.requirements.completedProjects.current /
            Math.max(1, next.requirements.completedProjects.required)) *
            100,
        ),
      )
    : data?.currentLevel === 'ELITE'
      ? 100
      : 0;

  return (
    <section
      id="badges"
      className="scroll-mt-24 rounded-2xl border border-outline-variant/40 bg-surface p-5 shadow-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-on-surface">{t('sectionTitle')}</h2>
          <p className="mt-1 text-sm text-on-surface-variant">{t('currentLevelLabel')}</p>
        </div>
        {data ? (
          <FreelancerBadgeChip
            level={data.currentLevel}
            verifiedTalent={data.verifiedTalent}
            foundingFreelancer={Boolean(data.foundingFreelancer?.earned)}
          />
        ) : null}
      </div>

      {error ? (
        <p className="mt-3 text-sm text-error">{error}</p>
      ) : !data ? (
        <p className="mt-3 text-sm text-on-surface-variant">…</p>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="flex items-center gap-3">
            {data.currentLevel !== 'NONE' ? (
              <PerformanceBadgeIcon level={data.currentLevel} size="lg" />
            ) : null}
            <div>
              <p className="text-base font-semibold text-on-surface">
                {data.currentLevel === 'NONE'
                  ? t('noLevelYet')
                  : t(`levels.${data.currentLevel}`)}
              </p>
              <p className="text-sm text-on-surface-variant">
                {t('projectsLabel')}: {data.stats.completedProjects} · {t('ratingLabel')}:{' '}
                {data.stats.averageRating.toFixed(1)}
              </p>
            </div>
          </div>

          {next ? (
            <div>
              <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="font-medium text-on-surface">
                  {t('nextLevelLabel')}: {t(`levels.${next.id}`)}
                </span>
                <span className="text-on-surface-variant">
                  {t('progressToNext', {
                    current: next.requirements.completedProjects.current,
                    required: next.requirements.completedProjects.required,
                    next: t(`levels.${next.id}`),
                  })}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface-container">
                <div
                  className="h-full rounded-full bg-ember transition-all"
                  style={{ width: `${projectsPct}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-on-surface-variant">
                {t('ratingProgress', {
                  current: next.requirements.averageRating.current,
                  required: next.requirements.averageRating.required,
                })}
              </p>
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-outline-variant/60 bg-cream px-4 py-2.5 text-sm font-semibold text-ink transition hover:border-ember/40 hover:bg-cream-deep sm:w-auto"
          >
            {t('openRequirements')}
          </button>
        </div>
      )}

      <BadgesRequirementsModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        data={data}
      />
    </section>
  );
}
