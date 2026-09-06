'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiRequest, type PublicProfile } from '@/lib/api';
import { FreelancerCard } from '@/components/freelancers/freelancer-card';
import { usePresenceSubscription } from '@/hooks/use-presence';

interface FreelancerListResponse {
  data: PublicProfile[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

type ActivityFilter = 'all' | 'online' | 'active_today' | 'active_week';

const ACTIVITY_OPTIONS: ActivityFilter[] = [
  'all',
  'online',
  'active_today',
  'active_week',
];

function FreelancerSearchInput({ initialQ }: { initialQ: string }) {
  const t = useTranslations('freelancers');
  const router = useRouter();
  const searchParams = useSearchParams();
  const [draft, setDraft] = useState(initialQ);

  function pushQuery(nextQ: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (nextQ.trim()) params.set('q', nextQ.trim());
    else params.delete('q');
    const qs = params.toString();
    router.push(qs ? `/freelancers?${qs}` : '/freelancers');
  }

  return (
    <div className="mt-6">
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') pushQuery(draft);
        }}
        placeholder={t('searchPlaceholder')}
        className="w-full max-w-md rounded-lg border border-outline-variant/60 bg-surface px-4 py-2"
      />
    </div>
  );
}

function ActivityFilterBar({
  activity,
}: {
  activity: ActivityFilter;
}) {
  const t = useTranslations('freelancers');
  const router = useRouter();
  const searchParams = useSearchParams();

  function setActivity(next: ActivityFilter) {
    const params = new URLSearchParams(searchParams.toString());
    if (next === 'all') params.delete('activity');
    else params.set('activity', next);
    const qs = params.toString();
    router.push(qs ? `/freelancers?${qs}` : '/freelancers');
  }

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      <span className="self-center text-sm text-on-surface-variant">
        {t('activityLabel')}
      </span>
      {ACTIVITY_OPTIONS.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => setActivity(opt)}
          className={`rounded-lg px-3 py-1.5 text-sm ${
            activity === opt
              ? 'bg-on-surface text-white'
              : 'border border-outline-variant/50 bg-surface text-on-surface-variant hover:bg-surface-container'
          }`}
        >
          {t(`activity.${opt}`)}
        </button>
      ))}
    </div>
  );
}

export default function FreelancersPageClient() {
  const t = useTranslations('freelancers');
  const tCommon = useTranslations('common');
  const searchParams = useSearchParams();
  const q = searchParams.get('q') ?? '';
  const activityParam = searchParams.get('activity');
  const activity: ActivityFilter =
    activityParam === 'online' ||
    activityParam === 'active_today' ||
    activityParam === 'active_week'
      ? activityParam
      : 'all';

  const [data, setData] = useState<FreelancerListResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const userIds = (data?.data ?? [])
    .map((f) => f.userId)
    .filter((id): id is string => !!id);
  usePresenceSubscription(userIds);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (q) params.set('q', q);
        if (activity !== 'all') params.set('activity', activity);

        const result = await apiRequest<FreelancerListResponse>(
          `/freelancers?${params.toString()}`,
        );

        if (!cancelled) setData(result);
      } catch {
        if (!cancelled) setError(t('loadError'));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [q, activity, t]);

  return (
    <div className="page-gutter page-shell page-shell--app page-shell--padded">
      <h1 className="text-3xl font-bold text-on-surface">{t('title')}</h1>
      <p className="mt-2 text-on-surface-variant">{t('subtitle')}</p>

      <FreelancerSearchInput key={q} initialQ={q} />
      <ActivityFilterBar activity={activity} />

      {isLoading ? <p className="mt-8 text-slate-500">{tCommon('loadingPage')}</p> : null}
      {error ? <p className="mt-8 text-red-600">{error}</p> : null}

      {!isLoading && !error && data?.data.length === 0 ? (
        <p className="mt-8 text-slate-500">{t('noFreelancers')}</p>
      ) : null}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data?.data.map((freelancer) => (
          <FreelancerCard key={freelancer.username} freelancer={freelancer} />
        ))}
      </div>
    </div>
  );
}
