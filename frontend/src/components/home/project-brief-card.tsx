'use client';

import { useTranslations, useLocale } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { useState } from 'react';
import { expandProjectBrief } from '@/lib/expand-brief';
import { getExampleProjectBriefs, getTrustBadges } from '@/lib/marketplace-content';
import { saveProjectBriefDraft } from '@/lib/project-brief';
import type { AppLocale } from '@/i18n/routing';

type ProjectBriefCardProps = {
  projectCount?: number;
  variant?: 'hero' | 'footer';
};

export function ProjectBriefCard({ projectCount, variant = 'hero' }: ProjectBriefCardProps) {
  const t = useTranslations('home');
  const tBrand = useTranslations('brand');
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const [brief, setBrief] = useState('');
  const [isExpanding, setIsExpanding] = useState(false);
  const examples = getExampleProjectBriefs(locale);
  const trustBadges = getTrustBadges(locale);

  function startPosting(expand: boolean) {
    const text = brief.trim();
    if (!text) return;

    setIsExpanding(true);
    const draft = expand ? expandProjectBrief(text, locale) : { title: text.slice(0, 100), description: text };
    saveProjectBriefDraft(draft);
    router.push('/register?role=CLIENT&next=/dashboard/projects/new');
  }

  return (
    <div
      className={`rounded-2xl border border-outline-variant/40 bg-surface shadow-[0_8px_24px_rgba(26,27,38,0.08)] ${
        variant === 'footer' ? 'p-5 sm:p-6' : 'p-6 sm:p-8'
      }`}
    >
      {variant === 'hero' ? (
        <div className="text-center">
          <p className="text-sm font-semibold text-on-surface">{t('briefTitle')}</p>
          <p className="mt-1 text-sm text-on-surface-variant">{t('briefSubtitle')}</p>
        </div>
      ) : null}

      <label className={`block text-sm font-medium text-on-surface ${variant === 'hero' ? 'mt-5' : 'mt-0'}`} htmlFor={`project-brief-${variant}`}>
        {t('briefLabel')}
      </label>
      <textarea
        id={`project-brief-${variant}`}
        value={brief}
        onChange={(e) => setBrief(e.target.value)}
        rows={variant === 'footer' ? 3 : 4}
        placeholder={t('briefPlaceholder')}
        className="mt-2 w-full resize-none rounded-xl border border-outline-variant/60 bg-surface-container-low px-4 py-3 text-on-surface outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
      />
      <p className="mt-2 text-xs text-on-surface-variant">{t('briefTip')}</p>

      {variant === 'hero' ? (
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {examples.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => setBrief(example)}
              className="rounded-full border border-outline-variant/50 bg-surface px-3 py-1.5 text-xs text-on-surface-variant transition hover:border-primary hover:text-primary"
            >
              {example}
            </button>
          ))}
        </div>
      ) : null}

      {projectCount ? (
        <p className="mt-4 text-center text-xs text-on-surface-variant">
          {t('briefPublishedCount', { count: projectCount, brand: tBrand('name') })}
        </p>
      ) : null}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <button
          type="button"
          disabled={!brief.trim() || isExpanding}
          onClick={() => startPosting(true)}
          className="rounded-lg bg-primary px-8 py-3 font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          {isExpanding ? t('briefCreating') : t('briefCreate')}
        </button>
        <Link
          href="/register?role=CLIENT&next=/dashboard/projects/new"
          className="rounded-lg border border-secondary px-8 py-3 text-center font-semibold text-secondary hover:bg-secondary/5"
        >
          {t('briefFullForm')}
        </Link>
      </div>

      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {trustBadges.map((point) => (
          <span
            key={point}
            className="rounded-full bg-tertiary/10 px-3 py-1 text-xs font-medium text-tertiary"
          >
            {point}
          </span>
        ))}
      </div>
    </div>
  );
}
