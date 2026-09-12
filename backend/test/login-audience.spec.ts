import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthService } from '../src/auth/auth.service.js';
import { hashPassword } from '../src/auth/password.util.js';

describe('AuthService login audience separation', () => {
  let prisma: Record<string, unknown>;
  let usersService: { findByEmail: ReturnType<typeof vi.fn> };
  let jwtService: { signAsync: ReturnType<typeof vi.fn> };
  let configService: { get: ReturnType<typeof vi.fn>; getOrThrow: ReturnType<typeof vi.fn> };
  let service: AuthService;

  beforeEach(() => {
    prisma = {
      refreshToken: { create: vi.fn().mockResolvedValue({}) },
    };
    usersService = { findByEmail: vi.fn() };
    jwtService = {
      signAsync: vi.fn().mockResolvedValue('token'),
    };
    configService = {
      get: vi.fn((key: string) => {
        if (key === 'jwt.accessExpiresIn') return '15m';
        if (key === 'jwt.refreshExpiresIn') return '7d';
        return undefined;
      }),
      getOrThrow: vi.fn((key: string) => {
        if (key === 'jwt.accessSecret') return 'access-secret';
        if (key === 'jwt.refreshSecret') return 'refresh-secret';
        throw new Error(key);
      }),
    };

    service = new AuthService(
      prisma as never,
      usersService as never,
      jwtService as never,
      configService as never,
      {} as never,
      {} as never,
      { onFreelancerLogin: vi.fn() } as never,
      {} as never,
      {} as never,
      {} as never,
    );
  });

  async function stubUser(role: Role) {
    const passwordHash = await hashPassword('Password1');
    usersService.findByEmail.mockResolvedValue({
      id: 'u1',
      email: 'user@test.ly',
      passwordHash,
      role,
      status: 'ACTIVE',
      emailVerified: true,
      mustChangePassword: false,
      createdAt: new Date(),
      profile: {
        firstName: 'T',
        lastName: 'U',
        username: 'tu',
        profilePhoto: null,
      },
    });
  }

  it('rejects staff on platform audience', async () => {
    await stubUser(Role.ADMIN);
    await expect(
      service.login({
        email: 'user@test.ly',
        password: 'Password1',
        audience: 'platform',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects platform users on admin audience', async () => {
    await stubUser(Role.FREELANCER);
    await expect(
      service.login({
        email: 'user@test.ly',
        password: 'Password1',
        audience: 'admin',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows admin on admin audience', async () => {
    await stubUser(Role.SUPER_ADMIN);
    const result = await service.login({
      email: 'user@test.ly',
      password: 'Password1',
      audience: 'admin',
    });
    expect(result.user.role).toBe(Role.SUPER_ADMIN);
    expect(result.tokens.accessToken).toBeTruthy();
  });

  it('allows freelancer on platform audience (default)', async () => {
    await stubUser(Role.CLIENT);
    const result = await service.login({
      email: 'user@test.ly',
      password: 'Password1',
    });
    expect(result.user.role).toBe(Role.CLIENT);
  });

  it('rejects wrong password', async () => {
    await stubUser(Role.CLIENT);
    await expect(
      service.login({
        email: 'user@test.ly',
        password: 'WrongPass1',
        audience: 'platform',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

describe('AuthService.register role promotion prevention', () => {
  it('rejects ADMIN/SUPER_ADMIN via PUBLIC_ROLES check in register', async () => {
    const prisma = {
      user: { findUnique: vi.fn().mockResolvedValue(null) },
      $transaction: vi.fn(),
    };
    const service = new AuthService(
      prisma as never,
      { generateUniqueUsername: vi.fn() } as never,
      {} as never,
      { get: vi.fn() } as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      { assertRegistrationAllowed: vi.fn() } as never,
      {} as never,
    );

    await expect(
      service.register({
        firstName: 'A',
        lastName: 'B',
        email: 'evil@test.ly',
        password: 'Password1',
        confirmPassword: 'Password1',
        role: Role.ADMIN,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.register({
        firstName: 'A',
        lastName: 'B',
        email: 'evil2@test.ly',
        password: 'Password1',
        confirmPassword: 'Password1',
        role: Role.SUPER_ADMIN,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
