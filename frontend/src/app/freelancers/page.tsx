'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiRequest, type PublicProfile } from '@/lib/api';

interface FreelancerListResponse {
  data: PublicProfile[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export default function FreelancersPage() {
  const [data, setData] = useState<FreelancerListResponse | null>(null);
  const [q, setQ] = useState('');
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
        if (!cancelled) setError('فشل تحميل المستقلين');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [q]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold text-[#0B132B]">المستقلون</h1>

      <div className="mt-6">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ابحث بالاسم أو المسمى المهني..."
          className="w-full max-w-md rounded-lg border px-4 py-2"
        />
      </div>

      {isLoading ? <p className="mt-8 text-slate-500">جاري التحميل...</p> : null}
      {error ? <p className="mt-8 text-red-600">{error}</p> : null}

      {!isLoading && !error && data?.data.length === 0 ? (
        <p className="mt-8 text-slate-500">لا يوجد مستقلون حالياً</p>
      ) : null}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data?.data.map((freelancer) => (
          <Link
            key={freelancer.username}
            href={`/freelancers/${freelancer.username}`}
            className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-[#00A86B]"
          >
            <h2 className="font-bold text-[#0B132B]">
              {freelancer.firstName} {freelancer.lastName}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {freelancer.freelancer?.professionalTitle ?? 'مستقل'}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              {freelancer.city?.nameAr ?? '—'} · ⭐ {freelancer.freelancer?.averageRating ?? 0}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
