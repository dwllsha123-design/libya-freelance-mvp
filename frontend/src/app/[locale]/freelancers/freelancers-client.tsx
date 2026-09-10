'use client';

import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiRequest, type Category, type City, type PublicProfile, type Skill } from '@/lib/api';
import { FreelancerCard } from '@/components/freelancers/freelancer-card';
import { FreelancerFiltersSidebar } from '@/components/freelancers/freelancer-filters-sidebar';
import { usePresenceSubscription } from '@/hooks/use-presence';
import type { AppLocale } from '@/i18n/routing';
import {
  buildFreelancerSearchParams,
  countActiveFreelancerFilters,
  freelancerFiltersToApiParams,
  parseFreelancerFiltersFromSearchParams,
  type FreelancerFilters,
} from '@/lib/freelancer-filters';

interface FreelancerListResponse {
  data: PublicProfile[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

function FreelancerCardSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-line bg-cream p-4">
      <div className="flex gap-3">
        <div className="size-12 rounded-full bg-surface-container" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-2/3 rounded bg-surface-container" />
          <div className="h-3 w-full rounded bg-surface-container" />
        </div>
      </div>
      <div className="mt-4 h-3 w-1/2 rounded bg-surface-container" />
      <div className="mt-3 flex gap-2">
        <div className="h-5 w-14 rounded bg-surface-container" />
        <div className="h-5 w-14 rounded bg-surface-container" />
        <div className="h-5 w-10 rounded bg-surface-container" />
      </div>
    </div>
  );
}

export default function FreelancersPageClient() {
  const t = useTranslations('freelancers');
  const tCommon = useTranslations('common');
  const locale = useLocale() as AppLocale;
  const numberLocale = locale === 'ar' ? 'ar-LY' : 'en-LY';
  const router = useRouter();
  const searchParams = useSearchParams();

  const filters = useMemo(
    () => parseFreelancerFiltersFromSearchParams(searchParams),
    [searchParams],
  );

  const [data, setData] = useState<FreelancerListResponse | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [searchInput, setSearchInput] = useState(() => filters.q);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const searchInputKey = filters.q;

  const activeFilterCount = countActiveFreelancerFilters(filters);

  const userIds = (data?.data ?? [])
    .map((f) => f.userId)
    .filter((id): id is string => !!id);
  usePresenceSubscription(userIds);

  const updateFilters = useCallback(
    (patch: Partial<FreelancerFilters>) => {
      const next = { ...filters, ...patch };
      const qs = buildFreelancerSearchParams(next).toString();
      router.push(qs ? `/freelancers?${qs}` : '/freelancers', { scroll: false });
    },
    [filters, router],
  );

  const clearFilters = useCallback(() => {
    router.push('/freelancers', { scroll: false });
    setSearchInput('');
  }, [router]);

  useEffect(() => {
    Promise.all([
      apiRequest<Category[]>('/categories'),
      apiRequest<Skill[]>('/skills'),
      apiRequest<City[]>('/cities'),
    ])
      .then(([cats, sk, ct]) => {
        setCategories(cats);
        setSkills(sk);
        setCities(ct);
      })
      .catch(() => {
        /* filter options optional */
      });
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams(freelancerFiltersToApiParams(filters));
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
  }, [filters, t]);

  function submitSearch() {
    updateFilters({ q: searchInput.trim(), page: '1' });
  }

  const page = Number(filters.page) || 1;
  const totalPages = data?.meta.totalPages ?? 0;
  const total = data?.meta.total ?? 0;

  return (
    <div className="page-gutter page-shell page-shell--app page-shell--padded">
      <h1 className="fluid-h1 font-display font-bold text-ink">{t('title')}</h1>
      <p className="mt-2 text-ink-soft">{t('subtitle')}</p>

      <div className="mt-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <span className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-ink-soft">
              ⌕
            </span>
            <input
              key={searchInputKey}
              defaultValue={filters.q}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const value = (e.target as HTMLInputElement).value;
                  setSearchInput(value);
                  updateFilters({ q: value.trim(), page: '1' });
                }
              }}
              placeholder={t('searchPlaceholder')}
              className="w-full rounded-xl border border-line bg-cream py-3 pe-4 ps-9 text-sm shadow-sm outline-none ring-ember/30 focus:ring-2"
              aria-label={t('searchPlaceholder')}
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={submitSearch}
              className="rounded-xl bg-ember px-5 py-3 text-sm font-semibold text-white transition hover:bg-ember-deep"
            >
              {tCommon('search')}
            </button>
            <button
              type="button"
              className="relative rounded-xl border border-line bg-cream px-4 py-3 text-sm text-ink lg:hidden"
              onClick={() => setMobileFiltersOpen(true)}
            >
              {t('filters')}
              {activeFilterCount > 0 ? (
                <span className="absolute -start-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-ember text-xs text-white">
                  {activeFilterCount}
                </span>
              ) : null}
            </button>
          </div>
        </div>
      </div>

      <div className="sidebar-layout mt-6 grid min-w-0 gap-4 lg:grid-cols-[minmax(240px,300px)_minmax(0,1fr)] xl:grid-cols-[minmax(260px,320px)_minmax(0,1fr)] lg:gap-6">
        <aside className="hidden min-w-0 lg:block">
          <div className="sticky top-24 rounded-2xl border border-line bg-cream p-4 shadow-[0_8px_24px_-16px_rgba(21,32,60,0.25)]">
            <FreelancerFiltersSidebar
              filters={filters}
              categories={categories}
              skills={skills}
              cities={cities}
              onChange={updateFilters}
              onClear={clearFilters}
            />
          </div>
        </aside>

        {mobileFiltersOpen ? (
          <div className="fixed inset-0 z-40 lg:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-ink/40"
              aria-label={t('closeFilters')}
              onClick={() => setMobileFiltersOpen(false)}
            />
            <div className="absolute inset-y-0 end-0 flex w-full max-w-sm flex-col overflow-y-auto border-s border-line bg-cream p-4 shadow-xl pb-[env(safe-area-inset-bottom)]">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display font-bold text-ink">{t('filtersTitle')}</h2>
                <button
                  type="button"
                  onClick={() => setMobileFiltersOpen(false)}
                  className="text-sm text-ink-soft"
                >
                  {tCommon('close')}
                </button>
              </div>
              <FreelancerFiltersSidebar
                filters={filters}
                categories={categories}
                skills={skills}
                cities={cities}
                onChange={(patch) => {
                  updateFilters(patch);
                }}
                onClear={clearFilters}
              />
            </div>
          </div>
        ) : null}

        <div className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-ink-soft">
              {isLoading
                ? tCommon('loadingPage')
                : t('resultsCount', { count: total.toLocaleString(numberLocale) })}
            </p>
            <div className="flex items-center gap-2">
              <label className="text-sm text-ink-soft" htmlFor="freelancer-sort">
                {t('sortLabel')}
              </label>
              <select
                id="freelancer-sort"
                value={filters.sort || 'relevant'}
                onChange={(e) => updateFilters({ sort: e.target.value, page: '1' })}
                className="rounded-lg border border-line bg-cream px-3 py-1.5 text-sm text-ink"
              >
                <option value="relevant">{t('sortRelevant')}</option>
                <option value="rating">{t('sortRating')}</option>
                <option value="completed">{t('sortCompleted')}</option>
                <option value="newest">{t('sortNewest')}</option>
              </select>
            </div>
          </div>

          {error ? <p className="mt-8 text-center text-error">{error}</p> : null}

          {isLoading ? (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <FreelancerCardSkeleton key={i} />
              ))}
            </div>
          ) : null}

          {!isLoading && !error && data?.data.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-line bg-cream p-8 text-center">
              <p className="text-ink-soft">{t('noFreelancersFiltered')}</p>
              {activeFilterCount > 0 ? (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-4 text-sm font-semibold text-ember hover:underline"
                >
                  {tCommon('clearFilters')}
                </button>
              ) : null}
            </div>
          ) : null}

          {!isLoading && !error && (data?.data.length ?? 0) > 0 ? (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {data?.data.map((freelancer) => (
                <FreelancerCard key={freelancer.username} freelancer={freelancer} />
              ))}
            </div>
          ) : null}

          {totalPages > 1 ? (
            <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => updateFilters({ page: String(page - 1) })}
                className="rounded-lg border border-line bg-cream px-3 py-1.5 text-sm disabled:opacity-40"
              >
                {tCommon('previous')}
              </button>
              <span className="text-sm text-ink-soft">
                {t('pageStatus', {
                  page: page.toLocaleString(numberLocale),
                  total: totalPages.toLocaleString(numberLocale),
                })}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => updateFilters({ page: String(page + 1) })}
                className="rounded-lg border border-line bg-cream px-3 py-1.5 text-sm disabled:opacity-40"
              >
                {tCommon('next')}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
