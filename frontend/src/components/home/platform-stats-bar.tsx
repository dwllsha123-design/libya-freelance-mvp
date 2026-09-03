'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { fetchPlatformStats, formatStatValue, type PlatformStats } from '@/lib/platform-stats';

export function PlatformStatsBar({
  fallback,
  variant = 'bar',
}: {
  fallback?: PlatformStats;
  variant?: 'bar' | 'heroCards';
}) {
  const t = useTranslations('home');
  const [stats, setStats] = useState<PlatformStats | null>(fallback ?? null);

  useEffect(() => {
    let cancelled = false;
    fetchPlatformStats().then((data) => {
      if (!cancelled && data) setStats(data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const items = useMemo(
    () => [
      {
        label: t('statsActiveFreelancers'),
        value: stats ? `${formatStatValue(stats.freelancers)}+` : '—',
        tone: 'text-ember' as const,
      },
      {
        label: t('statsPublishedProjects'),
        value: stats ? `${formatStatValue(stats.projects)}+` : '—',
        tone: 'text-palm-deep' as const,
      },
      {
        label: t('statsCompletedProjects'),
        value: stats ? `${formatStatValue(stats.completedProjects)}+` : '—',
        tone: 'text-ember' as const,
      },
      {
        label: t('statsSatisfaction'),
        value: stats?.satisfactionPercent
          ? `${stats.satisfactionPercent}%`
          : stats?.averageRating
            ? `${stats.averageRating}★`
            : '—',
        tone: 'text-palm-deep' as const,
      },
    ],
    [stats, t],
  );

  if (variant === 'heroCards') {
    return (
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-4">
        {items.map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-line bg-cream/85 px-3 py-4 text-start shadow-[0_8px_24px_-16px_rgba(21,32,60,0.4)] backdrop-blur-sm sm:px-5 sm:py-6"
          >
            <div className={`font-display text-2xl font-bold sm:text-3xl md:text-4xl ${item.tone}`}>
              {item.value}
            </div>
            <div className="mt-1 text-xs font-medium text-ink-soft sm:text-sm">{item.label}</div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <section className="border-y border-line/70 bg-cream-deep/40">
      <div className="page-gutter mx-auto grid max-w-6xl grid-cols-2 gap-4 py-8 text-center sm:grid-cols-4 sm:gap-6 md:gap-8">
        {items.map((item) => (
          <div key={item.label}>
            <p className={`font-display text-2xl font-bold sm:text-3xl ${item.tone}`}>
              {item.value}
            </p>
            <p className="mt-1 text-xs text-ink-soft sm:text-sm">{item.label}</p>
          </div>
        ))}
      </div>
      {stats && stats.verifiedFreelancers > 0 ? (
        <p className="page-gutter pb-6 text-center text-xs text-ink-soft">
          {t('statsVerified', { count: stats.verifiedFreelancers })}
        </p>
      ) : null}
    </section>
  );
}
