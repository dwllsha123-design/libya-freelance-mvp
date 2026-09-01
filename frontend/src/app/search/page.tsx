'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { apiRequest, type PublicProfile } from '@/lib/api';
import type { PaginatedProjects } from '@/lib/schemas/project';
import { formatBudgetRange } from '@/lib/currency';

function SearchResults() {
  const searchParams = useSearchParams();
  const q = searchParams.get('q') ?? '';
  const trimmed = q.trim();

  if (!trimmed) {
    return (
      <p className="text-on-surface-variant">
        أدخل كلمة بحث من الشريط العلوي أو جرّب{' '}
        <Link href="/projects" className="text-primary">
          تصفح المشاريع
        </Link>
      </p>
    );
  }

  return <SearchResultsLoaded key={trimmed} query={trimmed} />;
}

function SearchResultsLoaded({ query }: { query: string }) {
  const [projects, setProjects] = useState<PaginatedProjects | null>(null);
  const [freelancers, setFreelancers] = useState<PublicProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const [p, f] = await Promise.all([
          apiRequest<PaginatedProjects>(`/projects?q=${encodeURIComponent(query)}&limit=10`),
          apiRequest<{ data: PublicProfile[] }>(
            `/freelancers?q=${encodeURIComponent(query)}&limit=10`,
          ),
        ]);
        if (!cancelled) {
          setProjects(p);
          setFreelancers(f.data);
        }
      } catch {
        if (!cancelled) {
          setProjects(null);
          setFreelancers([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [query]);

  if (loading) return <p>جاري البحث...</p>;

  return (
    <div className="space-y-10">
      <section>
        <h2 className="text-xl font-semibold text-on-surface">المشاريع</h2>
        {!projects?.items.length ? (
          <p className="mt-2 text-on-surface-variant">لا توجد مشاريع مطابقة</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {projects.items.map((p) => (
              <li key={p.slug}>
                <Link href={`/projects/${p.slug}`} className="block rounded-lg border p-4 hover:border-primary">
                  <span className="font-medium">{p.title}</span>
                  <span className="mt-1 block text-sm text-primary">
                    {formatBudgetRange(p.budgetMin, p.budgetMax, p.currency)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section>
        <h2 className="text-xl font-semibold text-on-surface">المستقلون</h2>
        {!freelancers.length ? (
          <p className="mt-2 text-on-surface-variant">لا يوجد مستقلون مطابقون</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {freelancers.map((f) => (
              <li key={f.username}>
                <Link
                  href={`/freelancers/${f.username}`}
                  className="block rounded-lg border p-4 hover:border-primary"
                >
                  {f.firstName} {f.lastName} — {f.freelancer?.professionalTitle ?? 'مستقل'}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default function SearchPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold text-on-surface">بحث</h1>
      <Suspense fallback={<p className="mt-4">جاري التحميل...</p>}>
        <SearchResults />
      </Suspense>
    </div>
  );
}
