import 'reflect-metadata';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AdminPermission, Role, UserStatus } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RolesGuard } from '../src/common/guards/roles.guard.js';
import { AdminPermissionGuard } from '../src/common/guards/admin-permission.guard.js';
import { roleSatisfies } from '../src/auth/constants.js';
import { AdminUpdateFreelancerDto } from '../src/admin/dto/admin-update-freelancer.dto.js';
import { AdminUsersService } from '../src/admin/admin-users.service.js';

function rolesContext(user: { id?: string; role: Role; status: string } | null) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as never;
}

describe('Admin Freelancer Edit — RolesGuard + SUPER_ADMIN', () => {
  it('roleSatisfies allows SUPER_ADMIN for @Roles(ADMIN)', () => {
    expect(roleSatisfies(Role.SUPER_ADMIN, [Role.ADMIN])).toBe(true);
  });

  it('RolesGuard does not reject SUPER_ADMIN before permission layer', () => {
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue([Role.ADMIN]),
    };
    const guard = new RolesGuard(reflector as never);
    expect(
      guard.canActivate(
        rolesContext({ role: Role.SUPER_ADMIN, status: UserStatus.ACTIVE }),
      ),
    ).toBe(true);
  });
});

describe('Admin Freelancer Edit — AdminPermissionGuard matrix', () => {
  function makeGuard(prisma: { userAdminPermission: { findFirst: ReturnType<typeof vi.fn> } }) {
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue([AdminPermission.MANAGE_USERS]),
    };
    return new AdminPermissionGuard(reflector as never, prisma as never);
  }

  it('SUPER_ADMIN bypasses MANAGE_USERS lookup', async () => {
    const findFirst = vi.fn();
    const guard = makeGuard({ userAdminPermission: { findFirst } });
    await expect(
      guard.canActivate(
        rolesContext({
          id: 'sa-1',
          role: Role.SUPER_ADMIN,
          status: UserStatus.ACTIVE,
        }),
      ),
    ).resolves.toBe(true);
    expect(findFirst).not.toHaveBeenCalled();
  });

  it('ADMIN with MANAGE_USERS is allowed', async () => {
    const findFirst = vi.fn().mockResolvedValue({ id: 'perm-1' });
    const guard = makeGuard({ userAdminPermission: { findFirst } });
    await expect(
      guard.canActivate(
        rolesContext({ id: 'admin-1', role: Role.ADMIN, status: UserStatus.ACTIVE }),
      ),
    ).resolves.toBe(true);
  });

  it('ADMIN without MANAGE_USERS is forbidden', async () => {
    const findFirst = vi.fn().mockResolvedValue(null);
    const guard = makeGuard({ userAdminPermission: { findFirst } });
    await expect(
      guard.canActivate(
        rolesContext({ id: 'admin-2', role: Role.ADMIN, status: UserStatus.ACTIVE }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('MODERATOR without MANAGE_USERS is forbidden', async () => {
    const findFirst = vi.fn().mockResolvedValue(null);
    const guard = makeGuard({ userAdminPermission: { findFirst } });
    await expect(
      guard.canActivate(
        rolesContext({
          id: 'mod-1',
          role: Role.MODERATOR,
          status: UserStatus.ACTIVE,
        }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('FREELANCER / CLIENT cannot pass permission guard for staff permission', async () => {
    const findFirst = vi.fn();
    const guard = makeGuard({ userAdminPermission: { findFirst } });
    await expect(
      guard.canActivate(
        rolesContext({
          id: 'fr-1',
          role: Role.FREELANCER,
          status: UserStatus.ACTIVE,
        }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      guard.canActivate(
        rolesContext({ id: 'cl-1', role: Role.CLIENT, status: UserStatus.ACTIVE }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(findFirst).not.toHaveBeenCalled();
  });
});

describe('AdminUpdateFreelancerDto protected fields', () => {
  it('rejects payloads that include unknown protected properties', async () => {
    const { ValidationPipe } = await import('@nestjs/common');
    const pipe = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    });

    await expect(
      pipe.transform(
        {
          firstName: 'أحمد',
          lastName: 'علي',
          role: 'ADMIN',
          status: 'BANNED',
          passwordHash: 'x',
          refreshToken: 'y',
          id: 'should-not-bind',
          createdAt: '2020-01-01',
        },
        { type: 'body', metatype: AdminUpdateFreelancerDto },
      ),
    ).rejects.toBeTruthy();

    const clean = await pipe.transform(
      { firstName: 'أحمد', lastName: 'علي' },
      { type: 'body', metatype: AdminUpdateFreelancerDto },
    );
    expect(clean).toEqual({ firstName: 'أحمد', lastName: 'علي' });
    expect((clean as { role?: string }).role).toBeUndefined();
    expect((clean as { passwordHash?: string }).passwordHash).toBeUndefined();
  });
});

describe('AdminUsersService photo replacement safety', () => {
  function freelancerRow(overrides: Record<string, unknown> = {}) {
    return {
      id: 'fr-1',
      email: 'f@test.ly',
      role: Role.FREELANCER,
      status: UserStatus.ACTIVE,
      profile: {
        id: 'p-1',
        profilePhoto: 'http://cdn/old.webp',
        username: 'fr',
        firstName: 'A',
        lastName: 'B',
        bio: null,
        phone: null,
        country: 'Libya',
        cityId: null,
        workMode: 'REMOTE',
        city: null,
        freelancerProfile: {
          id: 'fp-1',
          professionalTitle: null,
          availability: 'AVAILABLE',
          hourlyRate: null,
          skills: [],
          _count: { portfolio: 0, skills: 0 },
        },
        clientProfile: null,
      },
      _count: {
        proposals: 0,
        projectsAsClient: 0,
        escrowsAsFreelancer: 0,
        escrowsAsClient: 0,
        reviewsGiven: 0,
        reviewsReceived: 0,
        conversationMembers: 0,
        projectAgreementsAsFreelancer: 0,
        projectAgreementsAsClient: 0,
      },
      ...overrides,
    };
  }

  let service: AdminUsersService;
  let prisma: {
    user: { findUnique: ReturnType<typeof vi.fn> };
    $transaction: ReturnType<typeof vi.fn>;
  };
  let storage: {
    uploadProfileImage: ReturnType<typeof vi.fn>;
    deleteFile: ReturnType<typeof vi.fn>;
  };
  let audit: { log: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue(freelancerRow()),
      },
      $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          profile: {
            update: vi.fn().mockResolvedValue({}),
          },
        };
        return fn(tx);
      }),
    };
    storage = {
      uploadProfileImage: vi.fn().mockResolvedValue('http://cdn/new.webp'),
      deleteFile: vi.fn().mockResolvedValue(undefined),
    };
    audit = { log: vi.fn().mockResolvedValue(undefined) };

    service = new AdminUsersService(
      prisma as never,
      audit as never,
      { disconnectUser: vi.fn() } as never,
      { getUserLaunchStatus: vi.fn() } as never,
      { resolveProjectWorkMode: vi.fn() } as never,
      storage as never,
    );
  });

  it('uploads new photo before deleting the previous asset', async () => {
    const order: string[] = [];
    storage.uploadProfileImage.mockImplementation(async () => {
      order.push('upload');
      return 'http://cdn/new.webp';
    });
    prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      order.push('db');
      return fn({
        profile: { update: vi.fn().mockResolvedValue({}) },
      });
    });
    storage.deleteFile.mockImplementation(async (url: string) => {
      order.push(`delete:${url}`);
    });

    // requireFreelancerUser + getFreelancerForEdit
    prisma.user.findUnique
      .mockResolvedValueOnce(freelancerRow())
      .mockResolvedValueOnce(
        freelancerRow({
          profile: {
            ...(freelancerRow().profile as object),
            profilePhoto: 'http://cdn/new.webp',
          },
        }),
      );

    await service.uploadFreelancerPhoto('admin-1', 'fr-1', {
      originalname: 'a.png',
      mimetype: 'image/png',
      size: 100,
      buffer: Buffer.from('x'),
    } as Express.Multer.File);

    expect(order[0]).toBe('upload');
    expect(order[1]).toBe('db');
    expect(order[2]).toBe('delete:http://cdn/old.webp');
  });

  it('keeps old photo when upload fails', async () => {
    storage.uploadProfileImage.mockRejectedValue(new BadRequestException('bad file'));
    await expect(
      service.uploadFreelancerPhoto('admin-1', 'fr-1', {
        originalname: 'a.png',
        mimetype: 'image/png',
        size: 100,
        buffer: Buffer.from('x'),
      } as Express.Multer.File),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(storage.deleteFile).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects CLIENT targets', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'cl-1',
      role: Role.CLIENT,
      profile: null,
    });
    await expect(service.getFreelancerForEdit('cl-1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('rejects missing users with 404 semantics', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(service.getFreelancerForEdit('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('returns BadRequest when FREELANCER lacks profile structure (no crash)', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'fr-broken',
      email: 'broken@test.ly',
      role: Role.FREELANCER,
      status: UserStatus.ACTIVE,
      profile: null,
      _count: {
        proposals: 0,
        projectsAsClient: 0,
        escrowsAsFreelancer: 0,
        escrowsAsClient: 0,
        reviewsGiven: 0,
        reviewsReceived: 0,
        conversationMembers: 0,
        projectAgreementsAsFreelancer: 0,
        projectAgreementsAsClient: 0,
      },
    });
    await expect(service.getFreelancerForEdit('fr-broken')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('returns BadRequest when FreelancerProfile row is missing', async () => {
    prisma.user.findUnique.mockResolvedValue(
      freelancerRow({
        profile: {
          ...(freelancerRow().profile as object),
          freelancerProfile: null,
        },
      }),
    );
    await expect(service.getFreelancerForEdit('fr-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});

describe('AdminUsersService skillIds omit vs clear', () => {
  function freelancerWithSkills(skillIds: string[]) {
    return {
      id: 'fr-1',
      email: 'f@test.ly',
      role: Role.FREELANCER,
      status: UserStatus.ACTIVE,
      profile: {
        id: 'p-1',
        profilePhoto: null,
        username: 'fr',
        firstName: 'A',
        lastName: 'B',
        bio: null,
        phone: null,
        country: 'Libya',
        cityId: null,
        workMode: 'REMOTE',
        city: null,
        freelancerProfile: {
          id: 'fp-1',
          professionalTitle: null,
          availability: 'AVAILABLE',
          hourlyRate: null,
          skills: skillIds.map((skillId) => ({ skillId, skill: { id: skillId, name: 'S', slug: 's', isActive: true } })),
          _count: { portfolio: 0, skills: skillIds.length },
        },
        clientProfile: null,
      },
      _count: {
        proposals: 0,
        projectsAsClient: 0,
        escrowsAsFreelancer: 0,
        escrowsAsClient: 0,
        reviewsGiven: 0,
        reviewsReceived: 0,
        conversationMembers: 0,
        projectAgreementsAsFreelancer: 0,
        projectAgreementsAsClient: 0,
      },
    };
  }

  it('omitted skillIds leaves skills unchanged; [] clears all', async () => {
    const deleteMany = vi.fn().mockResolvedValue({ count: 1 });
    const createMany = vi.fn().mockResolvedValue({ count: 0 });
    const profileUpdate = vi.fn().mockResolvedValue({});
    const freelancerUpdate = vi.fn().mockResolvedValue({});

    const prisma = {
      user: {
        findUnique: vi
          .fn()
          .mockResolvedValueOnce(freelancerWithSkills(['skill-1']))
          .mockResolvedValueOnce(freelancerWithSkills(['skill-1']))
          .mockResolvedValueOnce(freelancerWithSkills(['skill-1']))
          .mockResolvedValueOnce(freelancerWithSkills([])),
      },
      city: { findFirst: vi.fn() },
      skill: { findMany: vi.fn() },
      $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          profile: { update: profileUpdate },
          freelancerProfile: { update: freelancerUpdate },
          freelancerSkill: { deleteMany, createMany },
        }),
      ),
    };
    const audit = { log: vi.fn().mockResolvedValue(undefined) };
    const service = new AdminUsersService(
      prisma as never,
      audit as never,
      { disconnectUser: vi.fn() } as never,
      { getUserLaunchStatus: vi.fn() } as never,
      { resolveProjectWorkMode: vi.fn(async (m: string) => m) } as never,
      { uploadProfileImage: vi.fn(), deleteFile: vi.fn() } as never,
    );

    await service.updateFreelancerProfile('admin-1', 'fr-1', { firstName: 'New' });
    expect(deleteMany).not.toHaveBeenCalled();

    await service.updateFreelancerProfile('admin-1', 'fr-1', { skillIds: [] });
    expect(deleteMany).toHaveBeenCalledTimes(1);
    expect(createMany).not.toHaveBeenCalled();
  });

  it('rejects mismatched city for supplied country; auto-clears city when only country changes', async () => {
    const profileUpdate = vi.fn().mockResolvedValue({});
    const freelancerUpdate = vi.fn().mockResolvedValue({});
    const base = freelancerWithSkills([]);
    (base.profile as { cityId: string | null }).cityId = 'city-libya';

    const prisma = {
      user: {
        findUnique: vi
          .fn()
          .mockResolvedValueOnce(base)
          .mockResolvedValueOnce(base)
          .mockResolvedValueOnce(base)
          .mockResolvedValueOnce({
            ...base,
            profile: { ...base.profile, cityId: null, country: 'Tunisia' },
          }),
      },
      city: {
        findFirst: vi.fn().mockImplementation(async ({ where }: { where: { id: string } }) => {
          if (where.id === 'city-libya') {
            return { id: 'city-libya', country: 'Libya', isActive: true };
          }
          if (where.id === 'city-tn') {
            return { id: 'city-tn', country: 'Tunisia', isActive: true };
          }
          return null;
        }),
      },
      skill: { findMany: vi.fn() },
      $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          profile: { update: profileUpdate },
          freelancerProfile: { update: freelancerUpdate },
          freelancerSkill: { deleteMany: vi.fn(), createMany: vi.fn() },
        }),
      ),
    };
    const audit = { log: vi.fn().mockResolvedValue(undefined) };
    const service = new AdminUsersService(
      prisma as never,
      audit as never,
      { disconnectUser: vi.fn() } as never,
      { getUserLaunchStatus: vi.fn() } as never,
      { resolveProjectWorkMode: vi.fn(async (m: string) => m) } as never,
      { uploadProfileImage: vi.fn(), deleteFile: vi.fn() } as never,
    );

    await expect(
      service.updateFreelancerProfile('admin-1', 'fr-1', {
        country: 'Tunisia',
        cityId: 'city-libya',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    profileUpdate.mockClear();
    await service.updateFreelancerProfile('admin-1', 'fr-1', { country: 'Tunisia' });
    expect(profileUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ country: 'Tunisia', cityId: null }),
      }),
    );
  });
});
