export interface ProjectFilters {
  q: string;
  category: string;
  skill: string;
  city: string;
  workMode: string;
  budgetType: string;
  experienceLevel: string;
  minBudget: string;
  maxBudget: string;
  sort: string;
  page: string;
}

export const DEFAULT_FILTERS: ProjectFilters = {
  q: '',
  category: '',
  skill: '',
  city: '',
  workMode: '',
  budgetType: '',
  experienceLevel: '',
  minBudget: '',
  maxBudget: '',
  sort: 'newest',
  page: '1',
};

const FILTER_KEYS = [
  'q',
  'category',
  'skill',
  'city',
  'workMode',
  'budgetType',
  'experienceLevel',
  'minBudget',
  'maxBudget',
  'sort',
  'page',
] as const;

export function parseFiltersFromSearchParams(
  params: URLSearchParams,
): ProjectFilters {
  return {
    q: params.get('q') ?? '',
    category: params.get('category') ?? '',
    skill: params.get('skill') ?? '',
    city: params.get('city') ?? '',
    workMode: params.get('workMode') ?? '',
    budgetType: params.get('budgetType') ?? '',
    experienceLevel: params.get('experienceLevel') ?? '',
    minBudget: params.get('minBudget') ?? '',
    maxBudget: params.get('maxBudget') ?? '',
    sort: params.get('sort') ?? 'newest',
    page: params.get('page') ?? '1',
  };
}

export function buildSearchParams(filters: ProjectFilters): URLSearchParams {
  const params = new URLSearchParams();

  for (const key of FILTER_KEYS) {
    const value = filters[key];
    if (!value) continue;
    if (key === 'sort' && value === 'newest') continue;
    if (key === 'page' && value === '1') continue;
    params.set(key, value);
  }

  return params;
}

export function countActiveFilters(filters: ProjectFilters): number {
  let count = 0;
  if (filters.q) count += 1;
  if (filters.category) count += 1;
  if (filters.skill) count += 1;
  if (filters.city) count += 1;
  if (filters.workMode) count += 1;
  if (filters.budgetType) count += 1;
  if (filters.experienceLevel) count += 1;
  if (filters.minBudget) count += 1;
  if (filters.maxBudget) count += 1;
  return count;
}

export function filtersToApiParams(
  filters: ProjectFilters,
): Record<string, string> {
  const params: Record<string, string> = {
    page: filters.page || '1',
    limit: '12',
    sort: filters.sort || 'newest',
  };

  if (filters.q) params.q = filters.q;
  if (filters.category) params.category = filters.category;
  if (filters.skill) params.skill = filters.skill;
  if (filters.city) params.city = filters.city;
  if (filters.workMode) params.workMode = filters.workMode;
  if (filters.budgetType) params.budgetType = filters.budgetType;
  if (filters.experienceLevel) params.experienceLevel = filters.experienceLevel;
  if (filters.minBudget) params.minBudget = filters.minBudget;
  if (filters.maxBudget) params.maxBudget = filters.maxBudget;

  return params;
}
