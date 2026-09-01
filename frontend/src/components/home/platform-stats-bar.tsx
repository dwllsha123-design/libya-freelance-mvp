'use client';

import { useEffect, useState } from 'react';
import { fetchPlatformStats, formatStatValue, type PlatformStats } from '@/lib/platform-stats';

export function PlatformStatsBar({ fallback }: { fallback?: PlatformStats }) {
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

  const items = [
    {
      label: 'مستقلون نشطون',
      value: stats ? `${formatStatValue(stats.freelancers)}+` : '—',
    },
    {
      label: 'مشاريع منشورة',
      value: stats ? `${formatStatValue(stats.projects)}+` : '—',
    },
    {
      label: 'مشاريع مكتملة',
      value: stats ? `${formatStatValue(stats.completedProjects)}+` : '—',
    },
    {
      label: 'رضا العملاء',
      value: stats?.satisfactionPercent ? `${stats.satisfactionPercent}%` : stats?.averageRating ? `${stats.averageRating}★` : '—',
    },
  ];

  return (
    <section className="border-y border-outline-variant/30 bg-surface">
      <div className="mx-auto grid max-w-5xl grid-cols-2 gap-4 px-4 py-8 text-center sm:grid-cols-4 sm:gap-8">
        {items.map((item) => (
          <div key={item.label}>
            <p className="text-2xl font-bold text-on-surface sm:text-3xl">{item.value}</p>
            <p className="mt-1 text-sm text-on-surface-variant">{item.label}</p>
          </div>
        ))}
      </div>
      {stats && stats.verifiedFreelancers > 0 ? (
        <p className="pb-6 text-center text-xs text-on-surface-variant">
          {stats.verifiedFreelancers}+ مستقل موثّق على المنصة
        </p>
      ) : null}
    </section>
  );
}
