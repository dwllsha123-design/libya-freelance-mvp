import type { UserRole } from '@/lib/api';
import { getAdminUrl, hasSeparateAdminOrigin } from '@/lib/site-urls';

export const PLATFORM_ROLES = ['FREELANCER', 'CLIENT'] as const;
export const STAFF_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MODERATOR'] as const;

export type PlatformRole = (typeof PLATFORM_ROLES)[number];
export type StaffRole = (typeof STAFF_ROLES)[number];
export type LoginAudience = 'platform' | 'admin';

export function isStaffRole(role: string | null | undefined): role is StaffRole {
  return STAFF_ROLES.includes(role as StaffRole);
}

export function isPlatformRole(
  role: string | null | undefined,
): role is PlatformRole {
  return PLATFORM_ROLES.includes(role as PlatformRole);
}

/** Absolute admin login URL (separate origin in production). */
export function getAdminLoginHref(locale = 'ar'): string {
  const path = locale === 'ar' ? '/admin/login' : `/${locale}/admin/login`;
  if (hasSeparateAdminOrigin()) {
    return `${getAdminUrl()}${path}`;
  }
  return path;
}

export function getAdminHomeHref(locale = 'ar'): string {
  const path = locale === 'ar' ? '/admin' : `/${locale}/admin`;
  if (hasSeparateAdminOrigin()) {
    return `${getAdminUrl()}${path}`;
  }
  return path;
}

export function assertUserRole(role: UserRole | string): UserRole {
  return role as UserRole;
}
