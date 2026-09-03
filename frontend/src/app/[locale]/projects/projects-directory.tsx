'use client';

import { useTranslations, useLocale } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ProjectFiltersSidebar } from '@/components/projects/project-filters-sidebar';
import { useProjectsApi } from '@/hooks/use-projects';
import { apiRequest, type Category, type City, type Skill } from '@/lib/api';
import { formatBudgetRange } from '@/lib/currency';
import { getLocalizedCityName } from '@/lib/locale-content';
import type { AppLocale } from '@/i18n/routing';
import {
  buildSearchParams,
  countActiveFilters,
  filtersToApiParams,
  parseFiltersFromSearchParams,
  type ProjectFilters,
} from '@/lib/project-filters';
import type { PaginatedProjects } from '@/lib/schemas/project';

export default function ProjectsDirectoryPage() {
  const t = useTranslations('projects');
  const tCommon = useTranslations('common');
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const searchParams = useSearchParams();
  const api = useProjectsApi();

  const numberLocale = locale === 'ar' ? 'ar-LY' : 'en-LY';

  const EXPERIENCE_LABELS: Record<string, string> = useMemo(
    () => ({
      ENTRY: t('experienceEntry'),
      INTERMEDIATE: t('experienceIntermediate'),
      EXPERT: t('experienceExpert'),
    }),
    [t],
  );

  const filters = useMemo(
    () => parseFiltersFromSearchParams(searchParams),
    [searchParams],
  );

  const [data, setData] = useState<PaginatedProjects | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [view, setView] = useState<'list' | 'grid'>('list');

  const activeFilterCount = countActiveFilters(filters);

  const updateFilters = useCallback(
    (patch: Partial<ProjectFilters>) => {
      const next = { ...filters, ...patch };
      const qs = buildSearchParams(next).toString();
      router.push(qs ? `/projects?${qs}` : '/projects', { scroll: false });
    },
    [filters, router],
  );

  const clearFilters = useCallback(() => {
    router.push('/projects', { scroll: false });
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
        const result = await api.listPublic(filtersToApiParams(filters));
        if (!cancelled) setData(result);
      } catch {
        if (!cancelled) setError(t('loadErrorRetry'));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [api, filters, t]);

  function submitSearch() {
    const input = document.querySelector<HTMLInputElement>(
      '[data-project-search]',
    );
    const value = input?.value ?? searchInput;
    updateFilters({ q: value.trim(), page: '1' });
  }

  return (
    <div className="page-gutter mx-auto max-w-6xl py-8 md:py-10">
      <h1 className="font-display text-3xl font-bold text-ink">{t('browseTitle')}</h1>

      <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-start">
        <aside className="hidden lg:block lg:w-72 lg:shrink-0">
          <div className="sticky top-24 rounded-2xl border border-line bg-cream p-4 shadow-[0_8px_24px_-16px_rgba(21,32,60,0.25)]">
            <ProjectFiltersSidebar
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
            <div className="absolute inset-y-0 end-0 w-full max-w-sm overflow-y-auto border-s border-line bg-cream p-4 shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display font-bold text-ink">{t('filterProjects')}</h2>
                <button
                  type="button"
                  onClick={() => setMobileFiltersOpen(false)}
                  className="text-sm text-ink-soft"
                >
                  {tCommon('close')}
                </button>
              </div>
              <ProjectFiltersSidebar
                filters={filters}
                categories={categories}
                skills={skills}
                cities={cities}
                onChange={updateFilters}
                onClear={clearFilters}
              />
            </div>
          </div>
        ) : null}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex overflow-hidden rounded-xl border border-line">
              {(['list', 'grid'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setView(v)}
                  className={`px-3 py-2 text-sm font-medium transition-colors ${
                    view === v ? 'bg-ink text-cream' : 'bg-cream text-ink-soft hover:bg-cream-deep'
                  }`}
                  aria-pressed={view === v}
                >
                  {v === 'list' ? '☰' : '▦'}
                </button>
              ))}
            </div>
            <div className="relative min-w-0 flex-1">
              <span className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-ink-soft">
                ⌕
              </span>
              <input
                key={filters.q}
                data-project-search
                defaultValue={filters.q}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submitSearch();
                }}
                placeholder={t('searchJobsPlaceholder')}
                className="w-full rounded-xl border border-line bg-cream py-2.5 pe-4 ps-9 text-sm shadow-sm outline-none ring-ember/30 focus:ring-2"
              />
            </div>
            <button
              type="button"
              onClick={submitSearch}
              className="rounded-xl bg-ember px-4 py-2 text-sm font-semibold text-white transition hover:bg-ember-deep"
            >
              {tCommon('search')}
            </button>
            <button
              type="button"
              className="relative rounded-xl border border-line bg-cream px-4 py-2 text-sm text-ink lg:hidden"
              onClick={() => setMobileFiltersOpen(true)}
            >
              {t('filter')}
              {activeFilterCount > 0 ? (
                <span className="absolute -start-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-ember text-xs text-white">
                  {activeFilterCount}
                </span>
              ) : null}
            </button>
          </div>

          {isLoading ? (
            <p className="mt-8 text-center text-ink-soft">{tCommon('loadingPage')}</p>
          ) : null}

          {error ? (
            <p className="mt-8 text-center text-error">{error}</p>
          ) : null}

          {!isLoading && !error && data?.items.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-line bg-cream p-8 text-center">
              <p className="text-ink-soft">{t('noProjectsFiltered')}</p>
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

          <div
            className={`mt-6 ${
              view === 'grid' ? 'grid gap-4 sm:grid-cols-2' : 'space-y-4'
            }`}
          >
            {data?.items.map((project) => (
              <Link
                key={project.slug}
                href={`/projects/${project.slug}`}
                className="group block rounded-2xl border border-line bg-cream p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-ember/40 hover:shadow-[0_22px_50px_-24px_rgba(29,24,17,0.35)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <h2 className="font-display text-lg font-bold text-ink group-hover:text-ember">
                    {project.title}
                  </h2>
                  <span className="shrink-0 rounded-full bg-ember/10 px-3 py-1 text-xs font-semibold text-ember">
                    {t('unitsToApply', { cost: 10 })}
                  </span>
                </div>
                <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink-soft">
                  {project.description}
                </p>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-soft">
                  <span>
                    {project.budgetType === 'FIXED'
                      ? t('budgetTypeFixed')
                      : t('budgetTypeHourly')}
                  </span>
                  <span className="font-mono font-medium text-ink">
                    {formatBudgetRange(
                      project.budgetMin,
                      project.budgetMax,
                      project.currency,
                      locale,
                    )}
                  </span>
                  <span>
                    {EXPERIENCE_LABELS[project.experienceLevel] ??
                      project.experienceLevel}
                  </span>
                  <span>
                    {project.workMode === 'REMOTE'
                      ? t('workModeRemote')
                      : project.city
                        ? getLocalizedCityName(project.city, locale)
                        : '—'}
                  </span>
                  {project.publishedAt ? (
                    <span>
                      {t('publishedAgo', {
                        date: new Date(project.publishedAt).toLocaleDateString(
                          numberLocale,
                        ),
                      })}
                    </span>
                  ) : null}
                  {project.proposalCount !== undefined &&
                  project.proposalCount > 0 ? (
                    <span>
                      {t('proposalsCount', { count: project.proposalCount })}
                    </span>
                  ) : null}
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {project.skills.slice(0, 6).map((s) => (
                    <span
                      key={s.slug}
                      className="rounded-full border border-line bg-cream-deep/60 px-2.5 py-0.5 text-xs text-ink-soft"
                    >
                      {s.name}
                    </span>
                  ))}
                </div>
              </Link>
            ))}
          </div>

          {data && data.totalPages > 1 ? (
            <div className="mt-8 flex justify-center gap-2">
              <button
                type="button"
                disabled={Number(filters.page) <= 1}
                onClick={() =>
                  updateFilters({
                    page: String(Math.max(1, Number(filters.page) - 1)),
                  })
                }
                className="rounded-full border border-line bg-cream px-4 py-2 text-sm text-ink disabled:opacity-40"
              >
                {tCommon('previous')}
              </button>
              <span className="px-4 py-2 text-sm text-ink-soft">
                {filters.page} {tCommon('of')} {data.totalPages}
              </span>
              <button
                type="button"
                disabled={Number(filters.page) >= data.totalPages}
                onClick={() =>
                  updateFilters({
                    page: String(Number(filters.page) + 1),
                  })
                }
                className="rounded-full border border-line bg-cream px-4 py-2 text-sm text-ink disabled:opacity-40"
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
