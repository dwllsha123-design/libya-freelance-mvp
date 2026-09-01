export function getSafeNextPath(value: string | null | undefined): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return null;
  }
  return value;
}

export function buildAuthHref(
  path: '/login' | '/register',
  opts?: { next?: string; role?: 'CLIENT' | 'FREELANCER' },
): string {
  const params = new URLSearchParams();
  const safeNext = getSafeNextPath(opts?.next);
  if (safeNext) params.set('next', safeNext);
  if (opts?.role) params.set('role', opts.role);
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

export function resolvePostAuthPath(
  next: string | null | undefined,
  fallback = '/dashboard',
): string {
  return getSafeNextPath(next) ?? fallback;
}
