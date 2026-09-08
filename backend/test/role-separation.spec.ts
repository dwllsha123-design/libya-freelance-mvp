import { describe, expect, it } from 'vitest';
import { Role } from '@prisma/client';
import {
  CREATABLE_STAFF_ROLES,
  PUBLIC_ROLES,
  PLATFORM_ROLES,
  STAFF_ROLES,
  isPlatformRole,
  isStaffRole,
  roleSatisfies,
} from '../src/auth/constants.js';
import { RolesGuard } from '../src/common/guards/roles.guard.js';
import { ROLES_KEY } from '../src/common/decorators/roles.decorator.js';

describe('role separation constants', () => {
  it('keeps platform and staff roles disjoint', () => {
    for (const role of PLATFORM_ROLES) {
      expect(isPlatformRole(role)).toBe(true);
      expect(isStaffRole(role)).toBe(false);
    }
    for (const role of STAFF_ROLES) {
      expect(isStaffRole(role)).toBe(true);
      expect(isPlatformRole(role)).toBe(false);
    }
    expect(PUBLIC_ROLES).toEqual(PLATFORM_ROLES);
    expect(PUBLIC_ROLES).not.toContain(Role.ADMIN);
    expect(PUBLIC_ROLES).not.toContain(Role.SUPER_ADMIN);
    expect(PUBLIC_ROLES).not.toContain(Role.MODERATOR);
  });

  it('only allows SUPER_ADMIN to create ADMIN/MODERATOR (not SUPER_ADMIN)', () => {
    expect(CREATABLE_STAFF_ROLES).toEqual([Role.ADMIN, Role.MODERATOR]);
    expect(CREATABLE_STAFF_ROLES).not.toContain(Role.SUPER_ADMIN);
  });

  it('staff never satisfy FREELANCER/CLIENT requirements', () => {
    expect(roleSatisfies(Role.ADMIN, [Role.FREELANCER])).toBe(false);
    expect(roleSatisfies(Role.SUPER_ADMIN, [Role.FREELANCER])).toBe(false);
    expect(roleSatisfies(Role.MODERATOR, [Role.CLIENT])).toBe(false);
    expect(roleSatisfies(Role.FREELANCER, [Role.FREELANCER])).toBe(true);
  });

  it('SUPER_ADMIN and MODERATOR satisfy ADMIN panel routes', () => {
    expect(roleSatisfies(Role.SUPER_ADMIN, [Role.ADMIN])).toBe(true);
    expect(roleSatisfies(Role.MODERATOR, [Role.ADMIN])).toBe(true);
    expect(roleSatisfies(Role.ADMIN, [Role.ADMIN])).toBe(true);
    expect(roleSatisfies(Role.CLIENT, [Role.ADMIN])).toBe(false);
    expect(roleSatisfies(Role.FREELANCER, [Role.ADMIN])).toBe(false);
  });
});

describe('RolesGuard marketplace vs admin separation', () => {
  function makeContext(user: { role: Role; status: string } | null) {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as never;
  }

  function guardFor(required: Role[]) {
    const reflector = {
      getAllAndOverride: () => required,
    };
    return new RolesGuard(reflector as never);
  }

  it('freelancer cannot access admin routes', () => {
    expect(() =>
      guardFor([Role.ADMIN]).canActivate(
        makeContext({ role: Role.FREELANCER, status: 'ACTIVE' }),
      ),
    ).toThrow();
  });

  it('company/client cannot access admin routes', () => {
    expect(() =>
      guardFor([Role.ADMIN]).canActivate(
        makeContext({ role: Role.CLIENT, status: 'ACTIVE' }),
      ),
    ).toThrow();
  });

  it('admin can access admin routes', () => {
    expect(
      guardFor([Role.ADMIN]).canActivate(
        makeContext({ role: Role.ADMIN, status: 'ACTIVE' }),
      ),
    ).toBe(true);
  });

  it('admin cannot participate as freelancer', () => {
    expect(() =>
      guardFor([Role.FREELANCER]).canActivate(
        makeContext({ role: Role.ADMIN, status: 'ACTIVE' }),
      ),
    ).toThrow();
    expect(() =>
      guardFor([Role.FREELANCER]).canActivate(
        makeContext({ role: Role.SUPER_ADMIN, status: 'ACTIVE' }),
      ),
    ).toThrow();
  });

  it('exposes ROLES_KEY metadata', () => {
    expect(ROLES_KEY).toBe('roles');
  });
});
