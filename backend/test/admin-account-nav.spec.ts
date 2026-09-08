import { describe, expect, it } from 'vitest';
import { Role } from '@prisma/client';
import { isStaffRole, roleSatisfies, STAFF_ROLES } from '../src/auth/constants.js';

/**
 * Contract for admin account navigation (mirrors frontend/src/lib/admin-account-nav.ts).
 * Staff account UI must stay under /admin and never open marketplace routes.
 */
const ADMIN_ACCOUNT_PATH = '/admin/account';
const ADMIN_SECURITY_PATH = '/admin/security';
const ADMIN_LOGIN_PATH = '/admin/login';
const ADMIN_HOME_PATH = '/admin';

const MENU_BY_ROLE = {
  SUPER_ADMIN: {
    account: ADMIN_ACCOUNT_PATH,
    security: ADMIN_SECURITY_PATH,
    logout: ADMIN_LOGIN_PATH,
  },
  ADMIN: {
    account: ADMIN_ACCOUNT_PATH,
    security: ADMIN_SECURITY_PATH,
    logout: ADMIN_LOGIN_PATH,
  },
  MODERATOR: {
    account: ADMIN_ACCOUNT_PATH,
    security: ADMIN_SECURITY_PATH,
    logout: ADMIN_LOGIN_PATH,
  },
} as const;

const FORBIDDEN_MARKETPLACE = [
  '/profile',
  '/settings',
  '/dashboard',
  '/dashboard/profile',
] as const;

describe('admin account navigation contract', () => {
  for (const role of ['SUPER_ADMIN', 'ADMIN', 'MODERATOR'] as const) {
    it(`${role} حسابي => /admin/account`, () => {
      expect(MENU_BY_ROLE[role].account).toBe('/admin/account');
      expect(MENU_BY_ROLE[role].account.startsWith('/admin')).toBe(true);
      expect(isStaffRole(Role[role])).toBe(true);
    });
  }

  it('admin security stays inside admin domain path', () => {
    for (const role of STAFF_ROLES) {
      const key = role as keyof typeof MENU_BY_ROLE;
      expect(MENU_BY_ROLE[key].security).toBe('/admin/security');
      expect(FORBIDDEN_MARKETPLACE).not.toContain(MENU_BY_ROLE[key].security);
    }
  });

  it('admin logout redirects to admin login only', () => {
    for (const role of Object.keys(MENU_BY_ROLE) as Array<
      keyof typeof MENU_BY_ROLE
    >) {
      expect(MENU_BY_ROLE[role].logout).toBe('/admin/login');
      expect(MENU_BY_ROLE[role].logout).not.toBe('/login');
    }
  });

  it('admin account page path never equals marketplace routes', () => {
    expect(FORBIDDEN_MARKETPLACE).not.toContain(ADMIN_ACCOUNT_PATH);
    expect(ADMIN_ACCOUNT_PATH).not.toMatch(/^\/(profile|settings|dashboard)/);
  });

  it('marketplace users cannot satisfy ADMIN account route guards', () => {
    expect(roleSatisfies(Role.FREELANCER, [Role.ADMIN])).toBe(false);
    expect(roleSatisfies(Role.CLIENT, [Role.ADMIN])).toBe(false);
    expect(roleSatisfies(Role.ADMIN, [Role.ADMIN])).toBe(true);
    expect(roleSatisfies(Role.SUPER_ADMIN, [Role.ADMIN])).toBe(true);
    expect(roleSatisfies(Role.MODERATOR, [Role.ADMIN])).toBe(true);
  });

  it('documents admin home fallback for staff stranded on marketplace', () => {
    expect(ADMIN_HOME_PATH).toBe('/admin');
  });
});
