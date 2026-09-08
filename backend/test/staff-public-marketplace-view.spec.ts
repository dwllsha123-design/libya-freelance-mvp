import { describe, expect, it } from 'vitest';
import { Role } from '@prisma/client';
import { roleSatisfies } from '../src/auth/constants.js';
import {
  isStaffAllowedPublicMarketplacePath,
  isStaffBlockedMarketplacePath,
  STAFF_PUBLIC_MARKETPLACE_EXAMPLES,
} from '../src/auth/staff-marketplace-access.js';
import { RolesGuard } from '../src/common/guards/roles.guard.js';

describe('staff public marketplace view policy', () => {
  it('SUPER_ADMIN may visit public homepage', () => {
    expect(isStaffAllowedPublicMarketplacePath('/')).toBe(true);
    expect(isStaffAllowedPublicMarketplacePath('/ar')).toBe(true);
    expect(isStaffBlockedMarketplacePath('/')).toBe(false);
  });

  it('ADMIN may visit public homepage and marketing pages', () => {
    for (const path of STAFF_PUBLIC_MARKETPLACE_EXAMPLES) {
      expect(isStaffAllowedPublicMarketplacePath(path)).toBe(true);
      expect(isStaffBlockedMarketplacePath(path)).toBe(false);
    }
  });

  it('MODERATOR may visit public freelancer profile routes', () => {
    expect(isStaffAllowedPublicMarketplacePath('/freelancers/jane')).toBe(true);
    expect(isStaffAllowedPublicMarketplacePath('/ar/freelancers/jane')).toBe(
      true,
    );
    expect(isStaffBlockedMarketplacePath('/freelancers/jane')).toBe(false);
  });

  it('staff marketplace dashboard is blocked (redirect target)', () => {
    expect(isStaffBlockedMarketplacePath('/dashboard')).toBe(true);
    expect(isStaffBlockedMarketplacePath('/en/dashboard/profile')).toBe(true);
    expect(isStaffBlockedMarketplacePath('/messages')).toBe(true);
    expect(isStaffBlockedMarketplacePath('/notifications')).toBe(true);
  });

  it('staff cannot satisfy proposal FREELANCER API role', () => {
    expect(roleSatisfies(Role.SUPER_ADMIN, [Role.FREELANCER])).toBe(false);
    expect(roleSatisfies(Role.ADMIN, [Role.FREELANCER])).toBe(false);
    expect(roleSatisfies(Role.MODERATOR, [Role.FREELANCER])).toBe(false);
  });

  it('staff cannot satisfy client project-creation CLIENT API role', () => {
    expect(roleSatisfies(Role.SUPER_ADMIN, [Role.CLIENT])).toBe(false);
    expect(roleSatisfies(Role.ADMIN, [Role.CLIENT])).toBe(false);
    expect(roleSatisfies(Role.MODERATOR, [Role.CLIENT])).toBe(false);
  });

  it('platform user cannot access admin routes', () => {
    const reflector = {
      getAllAndOverride: () => [Role.ADMIN],
    };
    const guard = new RolesGuard(reflector as never);
    const ctx = {
      switchToHttp: () => ({
        getRequest: () => ({
          user: { role: Role.FREELANCER, status: 'ACTIVE' },
        }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as never;
    expect(() => guard.canActivate(ctx)).toThrow();
  });

  it('admin visit-site public homepage path is not blocked', () => {
    // Logo / زيارة الموقع opens marketplace home — must not bounce.
    expect(isStaffBlockedMarketplacePath('/')).toBe(false);
    expect(isStaffAllowedPublicMarketplacePath('/')).toBe(true);
  });
});
