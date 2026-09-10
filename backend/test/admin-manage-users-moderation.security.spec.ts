import 'reflect-metadata';
import { ForbiddenException } from '@nestjs/common';
import { AdminPermission, Role, UserStatus } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { AdminPermissionGuard } from '../src/common/guards/admin-permission.guard.js';

function rolesContext(user: { id?: string; role: Role; status: string } | null) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as never;
}

describe('Admin user moderation — MANAGE_USERS matrix', () => {
  function makeGuard(prisma: {
    userAdminPermission: { findFirst: ReturnType<typeof vi.fn> };
  }) {
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue([AdminPermission.MANAGE_USERS]),
    };
    return new AdminPermissionGuard(reflector as never, prisma as never);
  }

  it('SUPER_ADMIN is allowed', async () => {
    const findFirst = vi.fn();
    const guard = makeGuard({ userAdminPermission: { findFirst } });
    await expect(
      guard.canActivate(
        rolesContext({
          id: 'sa',
          role: Role.SUPER_ADMIN,
          status: UserStatus.ACTIVE,
        }),
      ),
    ).resolves.toBe(true);
  });

  it('ADMIN with MANAGE_USERS is allowed', async () => {
    const findFirst = vi.fn().mockResolvedValue({ id: 'p1' });
    const guard = makeGuard({ userAdminPermission: { findFirst } });
    await expect(
      guard.canActivate(
        rolesContext({ id: 'a1', role: Role.ADMIN, status: UserStatus.ACTIVE }),
      ),
    ).resolves.toBe(true);
  });

  it('ADMIN without MANAGE_USERS is forbidden', async () => {
    const findFirst = vi.fn().mockResolvedValue(null);
    const guard = makeGuard({ userAdminPermission: { findFirst } });
    await expect(
      guard.canActivate(
        rolesContext({ id: 'a2', role: Role.ADMIN, status: UserStatus.ACTIVE }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('MODERATOR without MANAGE_USERS is forbidden', async () => {
    const findFirst = vi.fn().mockResolvedValue(null);
    const guard = makeGuard({ userAdminPermission: { findFirst } });
    await expect(
      guard.canActivate(
        rolesContext({
          id: 'm1',
          role: Role.MODERATOR,
          status: UserStatus.ACTIVE,
        }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('CLIENT is forbidden', async () => {
    const findFirst = vi.fn();
    const guard = makeGuard({ userAdminPermission: { findFirst } });
    await expect(
      guard.canActivate(
        rolesContext({
          id: 'c1',
          role: Role.CLIENT,
          status: UserStatus.ACTIVE,
        }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
