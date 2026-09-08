/**
 * Admin staff account menu routes — always under /admin.
 * Never point staff to marketplace profile/dashboard/settings.
 */

export const ADMIN_ACCOUNT_PATH = '/admin/account';
export const ADMIN_SECURITY_PATH = '/admin/security';
export const ADMIN_LOGIN_PATH = '/admin/login';
export const ADMIN_HOME_PATH = '/admin';

export type AdminAccountMenuItem = 'account' | 'security' | 'logout';

export function resolveAdminAccountMenuPath(
  item: AdminAccountMenuItem,
): string {
  switch (item) {
    case 'account':
      return ADMIN_ACCOUNT_PATH;
    case 'security':
      return ADMIN_SECURITY_PATH;
    case 'logout':
      return ADMIN_LOGIN_PATH;
  }
}

/** True when an href stays inside the admin control center (or is logout login). */
export function isAdminInternalAccountHref(href: string): boolean {
  const path = href.split('?')[0] ?? href;
  return (
    path === ADMIN_ACCOUNT_PATH ||
    path === ADMIN_SECURITY_PATH ||
    path === ADMIN_LOGIN_PATH ||
    path === ADMIN_HOME_PATH ||
    path.startsWith(`${ADMIN_ACCOUNT_PATH}/`) ||
    path.startsWith(`${ADMIN_SECURITY_PATH}/`)
  );
}

/** Marketplace account/action routes staff must never open from admin UI. */
export {
  STAFF_BLOCKED_MARKETPLACE_PREFIXES,
  isStaffBlockedMarketplacePath as isForbiddenStaffMarketplacePath,
} from '@/lib/staff-marketplace-access';

/** @deprecated Use STAFF_BLOCKED_MARKETPLACE_PREFIXES */
export const FORBIDDEN_STAFF_MARKETPLACE_PATHS = [
  '/profile',
  '/settings',
  '/dashboard',
  '/dashboard/profile',
  '/messages',
  '/notifications',
] as const;
