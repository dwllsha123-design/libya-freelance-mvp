'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import type { FreelancerBadgesResponse } from '@/lib/badges';
import { PerformanceBadgeIcon } from '@/components/badges/badge-icons';
import { useIsClient } from '@/hooks/use-is-client';

function RequirementRow({
  label,
  required,
  current,
  completed,
}: {
  label: string;
  required: number;
  current: number;
  completed: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-on-surface-variant">
        {completed ? '✓ ' : ''}
        {label}
      </span>
      <span
        className={`tabular-nums font-medium ${
          completed ? 'text-palm-deep' : 'text-on-surface'
        }`}
      >
        {current} / {required}
      </span>
    </div>
  );
}

export function BadgesRequirementsModal({
  open,
  onClose,
  data,
}: {
  open: boolean;
  onClose: () => void;
  data: FreelancerBadgesResponse | null;
}) {
  const t = useTranslations('badges');
  const isClient = useIsClient();

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open || !isClient || !data) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center overflow-y-auto bg-ink/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="my-0 flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-line bg-cream shadow-[0_40px_100px_-30px_rgba(21,32,60,0.7)] sm:my-auto sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="badges-modal-title"
      >
        <div className="border-b border-outline-variant/40 px-5 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id="badges-modal-title" className="text-lg font-bold text-ink sm:text-xl">
                {t('modalTitle')}
              </h2>
              <p className="mt-1 text-sm text-ink-soft">{t('modalSubtitle')}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full px-3 py-1 text-sm text-ink-soft hover:bg-cream-deep"
            >
              {t('close')}
            </button>
          </div>
        </div>

        <div className="space-y-4 overflow-y-auto px-5 py-5 sm:px-6">
          {data.badges.map((badge) => (
            <article
              key={badge.id}
              className={`rounded-2xl border p-4 ${
                badge.earned
                  ? 'border-ember/30 bg-ember/5'
                  : 'border-outline-variant/40 bg-surface'
              }`}
            >
              <div className="flex items-start gap-3">
                <PerformanceBadgeIcon level={badge.id} size="lg" />
                <div className="min-w-0 flex-1 space-y-3">
                  <div>
                    <h3 className="font-semibold text-on-surface">
                      {t(`levels.${badge.id}`)}
                    </h3>
                    <p className="text-xs text-on-surface-variant">
                      {t(`tooltips.${badge.id}`)}
                    </p>
                  </div>
                  <RequirementRow
                    label={t('projectsLabel')}
                    required={badge.requirements.completedProjects.required}
                    current={badge.requirements.completedProjects.current}
                    completed={badge.requirements.completedProjects.completed}
                  />
                  <RequirementRow
                    label={t('ratingLabel')}
                    required={badge.requirements.averageRating.required}
                    current={badge.requirements.averageRating.current}
                    completed={badge.requirements.averageRating.completed}
                  />
                </div>
              </div>
            </article>
          ))}

          <article
            className={`rounded-2xl border p-4 ${
              data.verifiedTalent
                ? 'border-palm/40 bg-palm/5'
                : 'border-outline-variant/40 bg-surface'
            }`}
          >
            <div className="flex items-start gap-3">
              <PerformanceBadgeIcon level="VERIFIED_TALENT" size="lg" />
              <div>
                <h3 className="font-semibold text-on-surface">
                  {t('levels.VERIFIED_TALENT')}
                </h3>
                <p className="mt-1 text-xs text-on-surface-variant">
                  {t('tooltips.VERIFIED_TALENT')}
                </p>
                <p className="mt-2 text-xs font-medium text-on-surface-variant">
                  {t('independentBadge')} · {t('adminGrantedHint')}
                </p>
                <p className="mt-1 text-sm font-medium text-on-surface">
                  {data.verifiedTalent ? `✓ ${t('earned')}` : t('locked')}
                </p>
              </div>
            </div>
          </article>
        </div>
      </div>
    </div>,
    document.body,
  );
}
