import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AdminOpsService } from '../src/admin/admin-ops.service.js';

describe('AdminOpsService.createStaffAdmin (SUPER_ADMIN only path)', () => {
  let prisma: {
    user: { findUnique: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };
    userAdminPermission: { create: ReturnType<typeof vi.fn> };
    $transaction: ReturnType<typeof vi.fn>;
  };
  let audit: { log: ReturnType<typeof vi.fn> };
  let service: AdminOpsService;

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn(),
      },
      userAdminPermission: { create: vi.fn() },
      $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          user: {
            create: vi.fn().mockResolvedValue({
              id: 'new-admin',
              email: 'staff@test.ly',
              role: Role.ADMIN,
            }),
          },
          userAdminPermission: { create: vi.fn() },
        }),
      ),
    };
    audit = { log: vi.fn() };
    service = new AdminOpsService(
      prisma as never,
      audit as never,
      {} as never,
      {} as never,
      {} as never,
    );
  });

  it('creates ADMIN without freelancer/client profiles', async () => {
    const result = await service.createStaffAdmin('owner-id', {
      email: 'staff@test.ly',
      password: 'Password1',
      firstName: 'Staff',
      lastName: 'Admin',
      role: Role.ADMIN,
      permissions: [],
    });

    expect(result.role).toBe(Role.ADMIN);
    expect(result.email).toBe('staff@test.ly');
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('rejects duplicate email', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'exists' });
    await expect(
      service.createStaffAdmin('owner-id', {
        email: 'staff@test.ly',
        password: 'Password1',
        firstName: 'Staff',
        lastName: 'Admin',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects creating SUPER_ADMIN via dashboard DTO role', async () => {
    await expect(
      service.createStaffAdmin('owner-id', {
        email: 'evil@test.ly',
        password: 'Password1',
        firstName: 'Evil',
        lastName: 'Owner',
        role: Role.SUPER_ADMIN as never,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
