/**
 * Mirrors frontend/src/lib/staff-marketplace-access.ts for backend contract tests.
 */
export const STAFF_BLOCKED_MARKETPLACE_PREFIXES = [
  '/dashboard',
  '/messages',
  '/notifications',
] as const;

export const STAFF_PUBLIC_MARKETPLACE_EXAMPLES = [
  '/',
  '/about',
  '/help',
  '/contact',
  '/how-it-works',
  '/terms',
  '/privacy',
  '/sitemap',
  '/escrow',
  '/projects',
  '/freelancers',
  '/search',
  '/login',
  '/register',
  '/forgot-password',
] as const;

export function stripLocalePrefix(pathname: string): string {
  const raw = pathname.split('?')[0] ?? pathname;
  const stripped = raw.replace(/^\/(ar|en)(?=\/|$)/, '') || '/';
  if (stripped === '') return '/';
  return stripped.startsWith('/') ? stripped : `/${stripped}`;
}

export function normalizeAppPath(pathname: string): string {
  const path = stripLocalePrefix(pathname).replace(/\/+$/, '');
  return path === '' ? '/' : path;
}

export function isStaffBlockedMarketplacePath(pathname: string): boolean {
  const path = normalizeAppPath(pathname);
  if (path === '/admin' || path.startsWith('/admin/')) {
    return false;
  }
  return STAFF_BLOCKED_MARKETPLACE_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

export function isStaffAllowedPublicMarketplacePath(pathname: string): boolean {
  const path = normalizeAppPath(pathname);
  if (path === '/admin' || path.startsWith('/admin/')) {
    return false;
  }
  return !isStaffBlockedMarketplacePath(path);
}
