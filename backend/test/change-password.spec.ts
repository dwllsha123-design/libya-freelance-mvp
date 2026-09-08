import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthService } from '../src/auth/auth.service.js';
import { hashPassword, verifyPassword } from '../src/auth/password.util.js';
import { RolesGuard } from '../src/common/guards/roles.guard.js';
import { ROLES_KEY } from '../src/common/decorators/roles.decorator.js';

describe('AuthService.changePassword', () => {
  let prisma: {
    user: {
      findUnique: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    refreshToken: { deleteMany: ReturnType<typeof vi.fn> };
    $transaction: ReturnType<typeof vi.fn>;
  };
  let realtimeSessions: { disconnectUser: ReturnType<typeof vi.fn> };
  let service: AuthService;
  let storedHash: string;

  beforeEach(async () => {
    storedHash = await hashPassword('OldPass12');
    prisma = {
      user: {
        findUnique: vi.fn(),
        update: vi.fn(async ({ data }: { data: { passwordHash: string } }) => {
          storedHash = data.passwordHash;
          return { id: 'u1' };
        }),
      },
      refreshToken: {
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      $transaction: vi.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
    };
    realtimeSessions = { disconnectUser: vi.fn().mockResolvedValue(undefined) };

    service = new AuthService(
      prisma as never,
      {} as never,
      {} as never,
      { get: vi.fn() } as never,
      {} as never,
      realtimeSessions as never,
      {} as never,
      {} as never,
      {} as never,
    );
  });

  it('rejects incorrect current password', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      passwordHash: storedHash,
      status: 'ACTIVE',
    });

    await expect(
      service.changePassword('u1', {
        currentPassword: 'WrongPass1',
        newPassword: 'NewPass12',
        confirmNewPassword: 'NewPass12',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('successfully changes password, revokes sessions, and invalidates old hash', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      passwordHash: storedHash,
      status: 'ACTIVE',
    });

    const result = await service.changePassword('u1', {
      currentPassword: 'OldPass12',
      newPassword: 'NewPass12',
      confirmNewPassword: 'NewPass12',
    });

    expect(result.message).toMatch(/تم تغيير كلمة المرور/);
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(realtimeSessions.disconnectUser).toHaveBeenCalledWith('u1');
    expect(await verifyPassword('OldPass12', storedHash)).toBe(false);
    expect(await verifyPassword('NewPass12', storedHash)).toBe(true);
  });

  it('rejects mismatched confirmation', async () => {
    await expect(
      service.changePassword('u1', {
        currentPassword: 'OldPass12',
        newPassword: 'NewPass12',
        confirmNewPassword: 'OtherPass1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('RolesGuard SUPER_ADMIN + non-admin', () => {
  function makeContext(user: { role: Role; status: string } | null) {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as never;
  }

  it('allows SUPER_ADMIN on ADMIN routes; rejects FREELANCER', () => {
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue([Role.ADMIN]),
    };
    const guard = new RolesGuard(reflector as never);
    expect(
      guard.canActivate(
        makeContext({ role: Role.SUPER_ADMIN, status: 'ACTIVE' }),
      ),
    ).toBe(true);
    expect(() =>
      guard.canActivate(
        makeContext({ role: Role.FREELANCER, status: 'ACTIVE' }),
      ),
    ).toThrow();
  });

  it('uses ROLES_KEY metadata', () => {
    expect(ROLES_KEY).toBe('roles');
  });
});
