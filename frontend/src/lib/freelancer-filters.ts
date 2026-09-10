export interface FreelancerFilters {
  q: string;
  category: string;
  skill: string;
  city: string;
  workMode: string;
  availability: string;
  minRating: string;
  verified: string;
  activity: string;
  sort: string;
  page: string;
}

/**
 * Categories with a non-empty soft skill map (mirrors backend MVP map).
 * Unmapped categories are hidden from the discovery filter UI.
 */
export const DISCOVERY_MAPPED_CATEGORY_SLUGS = new Set([
  'programming-tech',
  'ai',
  'design-graphic',
  'digital-marketing',
  'social-media',
  'writing-translation',
  'video-motion',
  'accounting-business',
  'data-entry',
]);

export const DEFAULT_FREELANCER_FILTERS: FreelancerFilters = {
  q: '',
  category: '',
  skill: '',
  city: '',
  workMode: '',
  availability: '',
  minRating: '',
  verified: '',
  activity: '',
  sort: 'relevant',
  page: '1',
};

const FILTER_KEYS = [
  'q',
  'category',
  'skill',
  'city',
  'workMode',
  'availability',
  'minRating',
  'verified',
  'activity',
  'sort',
  'page',
] as const;

export function parseFreelancerFiltersFromSearchParams(
  params: URLSearchParams,
): FreelancerFilters {
  return {
    q: params.get('q') ?? '',
    category: params.get('category') ?? '',
    skill: params.get('skill') ?? '',
    city: params.get('city') ?? '',
    workMode: params.get('workMode') ?? '',
    availability: params.get('availability') ?? '',
    minRating: params.get('minRating') ?? '',
    verified: params.get('verified') ?? '',
    activity: params.get('activity') ?? '',
    sort: params.get('sort') ?? 'relevant',
    page: params.get('page') ?? '1',
  };
}

export function buildFreelancerSearchParams(
  filters: FreelancerFilters,
): URLSearchParams {
  const params = new URLSearchParams();

  for (const key of FILTER_KEYS) {
    const value = filters[key];
    if (!value) continue;
    if (key === 'sort' && value === 'relevant') continue;
    if (key === 'page' && value === '1') continue;
    params.set(key, value);
  }

  return params;
}

export function countActiveFreelancerFilters(filters: FreelancerFilters): number {
  let count = 0;
  if (filters.q) count += 1;
  if (filters.category) count += 1;
  if (filters.skill) count += 1;
  if (filters.city) count += 1;
  if (filters.workMode) count += 1;
  if (filters.availability) count += 1;
  if (filters.minRating) count += 1;
  if (filters.verified === 'true') count += 1;
  if (filters.activity && filters.activity !== 'all') count += 1;
  return count;
}

export function freelancerFiltersToApiParams(
  filters: FreelancerFilters,
): Record<string, string> {
  const params: Record<string, string> = {
    page: filters.page || '1',
    limit: '12',
    sort: filters.sort || 'relevant',
  };

  if (filters.q) params.q = filters.q;
  if (filters.category) params.category = filters.category;
  if (filters.skill) params.skill = filters.skill;
  if (filters.city) params.city = filters.city;
  if (filters.workMode) params.workMode = filters.workMode;
  if (filters.availability) params.availability = filters.availability;
  if (filters.minRating) params.minRating = filters.minRating;
  if (filters.verified === 'true') params.verified = 'true';
  if (filters.activity && filters.activity !== 'all') {
    params.activity = filters.activity;
  }

  return params;
}
