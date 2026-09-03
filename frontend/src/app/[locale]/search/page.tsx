'use client';

import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { apiRequest, type PublicProfile } from '@/lib/api';
import type { PaginatedProjects } from '@/lib/schemas/project';
import { formatBudgetRange } from '@/lib/currency';
import type { AppLocale } from '@/i18n/routing';

function SearchResults() {
  const t = useTranslations('search');
  const searchParams = useSearchParams();
  const q = searchParams.get('q') ?? '';
  const trimmed = q.trim();

  if (!trimmed) {
    return (
      <p className="text-ink-soft">
        {t('enterQuery')}{' '}
        <Link href="/projects" className="font-semibold text-ember hover:underline">
          {t('browseProjects')}
        </Link>
      </p>
    );
  }

  return <SearchResultsLoaded key={trimmed} query={trimmed} />;
}

function SearchResultsLoaded({ query }: { query: string }) {
  const t = useTranslations('search');
  const tFreelancers = useTranslations('freelancers');
  const locale = useLocale() as AppLocale;
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

  if (loading) return <p className="text-ink-soft">{t('searching')}</p>;

  return (
    <div className="space-y-10">
      <section>
        <h2 className="font-display text-xl font-semibold text-ink">{t('projectsTab')}</h2>
        {!projects?.items.length ? (
          <p className="mt-2 text-ink-soft">{t('noProjects')}</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {projects.items.map((p) => (
              <li key={p.slug}>
                <Link
                  href={`/projects/${p.slug}`}
                  className="block rounded-2xl border border-line bg-cream p-4 transition hover:-translate-y-0.5 hover:border-ember/40"
                >
                  <span className="font-display font-medium text-ink">{p.title}</span>
                  <span className="mt-1 block font-mono text-sm text-ember">
                    {formatBudgetRange(p.budgetMin, p.budgetMax, p.currency, locale)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section>
        <h2 className="font-display text-xl font-semibold text-ink">{t('freelancersTab')}</h2>
        {!freelancers.length ? (
          <p className="mt-2 text-ink-soft">{t('noFreelancers')}</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {freelancers.map((f) => (
              <li key={f.username}>
                <Link
                  href={`/freelancers/${f.username}`}
                  className="block rounded-2xl border border-line bg-cream p-4 transition hover:border-ember/40"
                >
                  {f.firstName} {f.lastName} —{' '}
                  {f.freelancer?.professionalTitle ?? tFreelancers('defaultTitle')}
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
  const t = useTranslations('search');
  const tCommon = useTranslations('common');

  return (
    <div className="page-gutter mx-auto max-w-3xl py-10 sm:py-12">
      <h1 className="font-display text-3xl font-bold text-ink">{t('title')}</h1>
      <Suspense fallback={<p className="mt-4 text-ink-soft">{tCommon('loadingPage')}</p>}>
        <SearchResults />
      </Suspense>
    </div>
  );
}
