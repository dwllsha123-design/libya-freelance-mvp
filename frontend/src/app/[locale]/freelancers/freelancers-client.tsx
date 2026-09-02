'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiRequest, type PublicProfile } from '@/lib/api';
import { FreelancerCard } from '@/components/freelancers/freelancer-card';

interface FreelancerListResponse {
  data: PublicProfile[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

function FreelancerSearchInput({ initialQ }: { initialQ: string }) {
  const t = useTranslations('freelancers');
  const router = useRouter();
  const [draft, setDraft] = useState(initialQ);

  return (
    <div className="mt-6">
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            const next = draft.trim();
            router.push(next ? `/freelancers?q=${encodeURIComponent(next)}` : '/freelancers');
          }
        }}
        placeholder={t('searchPlaceholder')}
        className="w-full max-w-md rounded-lg border border-outline-variant/60 bg-surface px-4 py-2"
      />
    </div>
  );
}

export default function FreelancersPageClient() {
  const t = useTranslations('freelancers');
  const tCommon = useTranslations('common');
  const searchParams = useSearchParams();
  const q = searchParams.get('q') ?? '';
  const [data, setData] = useState<FreelancerListResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (q) params.set('q', q);

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
  }, [q, t]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold text-on-surface">{t('title')}</h1>
      <p className="mt-2 text-on-surface-variant">{t('subtitle')}</p>

      <FreelancerSearchInput key={q} initialQ={q} />

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
