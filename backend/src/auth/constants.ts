import { Role } from '@prisma/client';

/** Marketplace accounts — public register / switch-role / platform login. */
export const PLATFORM_ROLES: Role[] = [Role.FREELANCER, Role.CLIENT];

/** Alias used by registration & switch-role. */
export const PUBLIC_ROLES: Role[] = PLATFORM_ROLES;

/**
 * Control-center staff — admin host login only.
 * Never marketplace freelancers/clients.
 */
export const STAFF_ROLES: Role[] = [
  Role.SUPER_ADMIN,
  Role.ADMIN,
  Role.MODERATOR,
];

/** Roles SUPER_ADMIN may create via dashboard (never SUPER_ADMIN itself). */
export const CREATABLE_STAFF_ROLES: Role[] = [Role.ADMIN, Role.MODERATOR];

export type LoginAudience = 'platform' | 'admin';

export function isPlatformRole(role: Role): boolean {
  return PLATFORM_ROLES.includes(role);
}

export function isStaffRole(role: Role): boolean {
  return STAFF_ROLES.includes(role);
}

/**
 * Role satisfaction for @Roles(...).
 * SUPER_ADMIN + MODERATOR inherit ADMIN panel routes.
 * Staff never inherit FREELANCER/CLIENT marketplace routes.
 */
export function roleSatisfies(userRole: Role, requiredRoles: Role[]): boolean {
  if (requiredRoles.includes(userRole)) {
    return true;
  }

  const needsAdminPanel = requiredRoles.includes(Role.ADMIN);
  if (
    needsAdminPanel &&
    (userRole === Role.SUPER_ADMIN || userRole === Role.MODERATOR)
  ) {
    return true;
  }

  return false;
}
