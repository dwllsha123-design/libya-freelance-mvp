'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ProjectFiltersSidebar } from '@/components/projects/project-filters-sidebar';
import { useProjectsApi } from '@/hooks/use-projects';
import { apiRequest, type Category, type City, type Skill } from '@/lib/api';
import {
  buildSearchParams,
  countActiveFilters,
  filtersToApiParams,
  parseFiltersFromSearchParams,
  type ProjectFilters,
} from '@/lib/project-filters';
import type { PaginatedProjects } from '@/lib/schemas/project';

const EXPERIENCE_LABELS: Record<string, string> = {
  ENTRY: 'مبتدئ',
  INTERMEDIATE: 'متوسط',
  EXPERT: 'خبير',
};

export default function ProjectsDirectoryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const api = useProjectsApi();

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
        if (!cancelled) setError('فشل تحميل المشاريع. حاول مرة أخرى.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [api, filters]);

  function submitSearch() {
    const input = document.querySelector<HTMLInputElement>(
      '[data-project-search]',
    );
    const value = input?.value ?? searchInput;
    updateFilters({ q: value.trim(), page: '1' });
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="text-3xl font-bold text-[#0B132B]">تصفح المشاريع</h1>

      <div className="mt-6 flex flex-col gap-4 lg:flex-row">
        <aside className="hidden lg:block lg:w-72 lg:shrink-0">
          <ProjectFiltersSidebar
            filters={filters}
            categories={categories}
            skills={skills}
            cities={cities}
            onChange={updateFilters}
            onClear={clearFilters}
          />
        </aside>

        {mobileFiltersOpen ? (
          <div className="fixed inset-0 z-40 lg:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-black/40"
              aria-label="إغلاق الفلاتر"
              onClick={() => setMobileFiltersOpen(false)}
            />
            <div className="absolute inset-y-0 right-0 w-full max-w-sm overflow-y-auto bg-[#F6F8FA] p-4 shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-bold">فلترة المشاريع</h2>
                <button
                  type="button"
                  onClick={() => setMobileFiltersOpen(false)}
                  className="text-sm text-slate-600"
                >
                  إغلاق
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

        <div className="flex-1">
          <div className="flex gap-3">
            <input
              key={filters.q}
              data-project-search
              defaultValue={filters.q}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitSearch();
              }}
              placeholder="ابحث في المشاريع..."
              className="flex-1 rounded-lg border bg-white px-4 py-2"
            />
            <button
              type="button"
              onClick={submitSearch}
              className="rounded-lg bg-[#0B132B] px-4 py-2 text-sm text-white"
            >
              بحث
            </button>
            <button
              type="button"
              className="relative rounded-lg border bg-white px-4 py-2 text-sm lg:hidden"
              onClick={() => setMobileFiltersOpen(true)}
            >
              فلترة
              {activeFilterCount > 0 ? (
                <span className="absolute -left-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#00A86B] text-xs text-white">
                  {activeFilterCount}
                </span>
              ) : null}
            </button>
          </div>

          {isLoading ? (
            <p className="mt-8 text-center text-slate-500">جاري التحميل...</p>
          ) : null}

          {error ? (
            <p className="mt-8 text-center text-red-600">{error}</p>
          ) : null}

          {!isLoading && !error && data?.items.length === 0 ? (
            <div className="mt-8 rounded-xl border bg-white p-8 text-center">
              <p className="text-slate-600">لا توجد مشاريع مطابقة للفلاتر الحالية</p>
              {activeFilterCount > 0 ? (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-4 text-sm text-[#00A86B] hover:underline"
                >
                  مسح الفلاتر
                </button>
              ) : null}
            </div>
          ) : null}

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {data?.items.map((project) => (
              <Link
                key={project.slug}
                href={`/projects/${project.slug}`}
                className="rounded-xl border bg-white p-5 shadow-sm transition hover:border-[#00A86B]"
              >
                <h2 className="font-bold text-[#0B132B]">{project.title}</h2>
                <p className="mt-2 line-clamp-2 text-sm text-slate-600">
                  {project.description}
                </p>
                <div className="mt-3 flex flex-wrap gap-1">
                  {project.skills.slice(0, 3).map((s) => (
                    <span
                      key={s.slug}
                      className="rounded bg-slate-100 px-2 py-0.5 text-xs"
                    >
                      {s.name}
                    </span>
                  ))}
                </div>
                <p className="mt-3 text-sm font-medium text-[#00A86B]">
                  {project.budgetMin}–{project.budgetMax} {project.currency}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {EXPERIENCE_LABELS[project.experienceLevel] ??
                    project.experienceLevel}
                  {' · '}
                  {project.workMode === 'REMOTE'
                    ? 'عن بُعد'
                    : (project.city?.nameAr ?? '—')}
                  {project.publishedAt
                    ? ` · ${new Date(project.publishedAt).toLocaleDateString('ar-LY')}`
                    : ''}
                </p>
                {project.client ? (
                  <p className="mt-1 text-xs text-slate-400">
                    {project.client.displayName}
                  </p>
                ) : null}
                {project.proposalCount !== undefined && project.proposalCount > 0 ? (
                  <p className="mt-0.5 text-xs text-slate-500">
                    {project.proposalCount} عروض
                  </p>
                ) : null}
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
                className="rounded border bg-white px-4 py-2 text-sm disabled:opacity-40"
              >
                السابق
              </button>
              <span className="px-4 py-2 text-sm">
                {filters.page} / {data.totalPages}
              </span>
              <button
                type="button"
                disabled={Number(filters.page) >= data.totalPages}
                onClick={() =>
                  updateFilters({
                    page: String(Number(filters.page) + 1),
                  })
                }
                className="rounded border bg-white px-4 py-2 text-sm disabled:opacity-40"
              >
                التالي
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
