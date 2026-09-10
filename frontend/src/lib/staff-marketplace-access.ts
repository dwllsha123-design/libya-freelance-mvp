import { isAdminLoginPath, isAdminPath } from '@/lib/site-urls';

/**
 * Central staff ↔ marketplace route policy.
 *
 * Staff MAY view public marketplace/marketing pages as visitors.
 * Staff must NOT use authenticated marketplace account/action routes.
 */

/** Authenticated marketplace surfaces blocked for staff (redirect → admin home). */
export const STAFF_BLOCKED_MARKETPLACE_PREFIXES = [
  '/dashboard',
  '/messages',
  '/notifications',
] as const;

/** Representative public paths staff may view (documentation + tests). */
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
  '/u',
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

/**
 * True when staff must be redirected away from this marketplace path
 * to the admin control center.
 */
export function isStaffBlockedMarketplacePath(pathname: string): boolean {
  const path = normalizeAppPath(pathname);
  if (isAdminPath(path) || isAdminLoginPath(path)) {
    return false;
  }
  return STAFF_BLOCKED_MARKETPLACE_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

/** Public (or auth-form) marketplace path — staff may view as visitors. */
export function isStaffAllowedPublicMarketplacePath(pathname: string): boolean {
  const path = normalizeAppPath(pathname);
  if (isAdminPath(path) || isAdminLoginPath(path)) {
    return false;
  }
  return !isStaffBlockedMarketplacePath(path);
}
