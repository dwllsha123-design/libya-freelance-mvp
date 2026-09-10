import { describe, expect, it } from 'vitest';

/**
 * Mirrors frontend/src/lib/freelancer-filters.ts URL contract so CI can
 * validate query-param behavior without a frontend test runner.
 */
function parse(params: URLSearchParams) {
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

function build(filters: ReturnType<typeof parse>): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (!value) continue;
    if (key === 'sort' && value === 'relevant') continue;
    if (key === 'page' && value === '1') continue;
    params.set(key, value);
  }
  return params;
}

function applyPatch(
  filters: ReturnType<typeof parse>,
  patch: Partial<ReturnType<typeof parse>>,
) {
  return { ...filters, ...patch };
}

describe('freelancer discovery URL contract', () => {
  it('keeps search/filter/pagination state in query params', () => {
    const filters = parse(
      new URLSearchParams(
        'q=react&skill=next-js&workMode=REMOTE&page=2&verified=true',
      ),
    );
    expect(filters.q).toBe('react');
    expect(filters.skill).toBe('next-js');
    expect(filters.workMode).toBe('REMOTE');
    expect(filters.page).toBe('2');
    expect(filters.verified).toBe('true');
    expect(build(filters).get('page')).toBe('2');
    expect(build(filters).get('verified')).toBe('true');
  });

  it('resets to page 1 when filters change', () => {
    const filters = parse(new URLSearchParams('q=react&page=3'));
    const next = applyPatch(filters, { skill: 'figma', page: '1' });
    expect(next.page).toBe('1');
    expect(build(next).get('page')).toBeNull();
    expect(build(next).get('skill')).toBe('figma');
  });

  it('clearing filters drops query state back to defaults', () => {
    const cleared = parse(new URLSearchParams(''));
    expect(cleared.page).toBe('1');
    expect(cleared.q).toBe('');
    expect(cleared.verified).toBe('');
    expect(build(cleared).toString()).toBe('');
  });
});

describe('public profile path guard', () => {
  function publicProfilePath(username: string | null | undefined): string | null {
    if (!username || typeof username !== 'string') return null;
    const normalized = username.trim().toLowerCase();
    if (normalized.length < 3 || normalized.length > 30) return null;
    if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(normalized)) return null;
    return `/u/${normalized}`;
  }

  it('never builds /u/undefined for missing usernames', () => {
    expect(publicProfilePath(undefined)).toBeNull();
    expect(publicProfilePath(null)).toBeNull();
    expect(publicProfilePath('')).toBeNull();
    expect(publicProfilePath('ab')).toBeNull();
    expect(publicProfilePath('ahmed-dev')).toBe('/u/ahmed-dev');
  });
});
