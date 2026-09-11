import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ConflictException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Prisma, Role, UserStatus } from '@prisma/client';
import { AuthService } from '../src/auth/auth.service.js';

function buildService(overrides?: {
  emailService?: { sendVerificationEmail: ReturnType<typeof vi.fn> };
  jwtSignAsync?: ReturnType<typeof vi.fn>;
  refreshTokenCreate?: ReturnType<typeof vi.fn>;
  transactionImpl?: (fn: (tx: unknown) => Promise<unknown>) => Promise<unknown>;
}) {
  const createdUser = {
    id: 'user-1',
    email: 'new@test.ly',
    role: Role.CLIENT,
    status: UserStatus.ACTIVE,
    emailVerified: false,
    createdAt: new Date(),
    profile: {
      id: 'profile-1',
      firstName: 'New',
      lastName: 'User',
      username: 'new-user',
      profilePhoto: null,
    },
  };

  const tx = {
    user: {
      create: vi.fn().mockResolvedValue(createdUser),
    },
    freelancerProfile: { create: vi.fn().mockResolvedValue({}) },
    clientProfile: { create: vi.fn().mockResolvedValue({}) },
  };

  const prisma = {
    user: {
      findUnique: vi.fn().mockResolvedValue(null),
    },
    emailVerificationToken: {
      create: vi.fn().mockResolvedValue({ id: 'evt-1' }),
    },
    refreshToken: {
      create:
        overrides?.refreshTokenCreate ?? vi.fn().mockResolvedValue({ id: 'rt-1' }),
    },
    userDevice: { create: vi.fn() },
    $transaction:
      overrides?.transactionImpl ??
      vi.fn(async (fn: (inner: typeof tx) => Promise<unknown>) => fn(tx)),
  };

  const emailService = overrides?.emailService ?? {
    sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
  };

  const jwtService = {
    signAsync:
      overrides?.jwtSignAsync ??
      vi
        .fn()
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token'),
  };

  const configService = {
    get: vi.fn((key: string) => {
      if (key === 'jwt.accessExpiresIn') return '15m';
      if (key === 'jwt.refreshExpiresIn') return '7d';
      if (key === 'tokens.emailVerificationExpiresIn') return '24h';
      return undefined;
    }),
    getOrThrow: vi.fn((key: string) => {
      if (key === 'jwt.accessSecret') return 'access-secret';
      if (key === 'jwt.refreshSecret') return 'refresh-secret';
      throw new Error(key);
    }),
  };

  const nuqatiService = {
    awardWelcomeBonus: vi.fn().mockResolvedValue({ awarded: 55 }),
  };

  const launchProgram = {
    trackAnalytics: vi.fn().mockResolvedValue(undefined),
  };

  const service = new AuthService(
    prisma as never,
    {
      generateUniqueUsername: vi.fn().mockResolvedValue('new-user'),
    } as never,
    jwtService as never,
    configService as never,
    emailService as never,
    { revokeAllForUser: vi.fn() } as never,
    nuqatiService as never,
    launchProgram as never,
    { assertRegistrationAllowed: vi.fn().mockResolvedValue(undefined) } as never,
  );

  return {
    service,
    prisma,
    tx,
    emailService,
    jwtService,
    nuqatiService,
    createdUser,
  };
}

describe('AuthService.register reliability', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('creates account + session (authenticated)', async () => {
    const { service, prisma, tx, nuqatiService, emailService } = buildService();

    const result = await service.register({
      firstName: 'New',
      lastName: 'User',
      email: 'New@test.ly',
      password: 'Password1',
      confirmPassword: 'Password1',
      role: Role.CLIENT,
    });

    expect(result).toMatchObject({
      accountCreated: true,
      authenticated: true,
      channel: 'web',
    });
    if (!result.authenticated) throw new Error('expected authenticated');
    expect(result.tokens.accessToken).toBe('access-token');
    expect(result.user.email).toBe('new@test.ly');
    expect(tx.user.create).toHaveBeenCalledTimes(1);
    expect(tx.clientProfile.create).toHaveBeenCalledTimes(1);
    expect(nuqatiService.awardWelcomeBonus).toHaveBeenCalledTimes(1);
    expect(prisma.emailVerificationToken.create).toHaveBeenCalledTimes(1);
    expect(emailService.sendVerificationEmail).toHaveBeenCalledTimes(1);
  });

  it('succeeds when SMTP throws after account commit', async () => {
    const sendVerificationEmail = vi.fn().mockRejectedValue(
      new InternalServerErrorException('smtp down'),
    );
    const loggerError = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    const { service, emailService } = buildService({
      emailService: { sendVerificationEmail },
    });

    const result = await service.register({
      firstName: 'New',
      lastName: 'User',
      email: 'smtp-fail@test.ly',
      password: 'Password1',
      confirmPassword: 'Password1',
      role: Role.CLIENT,
    });

    expect(result.accountCreated).toBe(true);
    expect(result.authenticated).toBe(true);
    expect(emailService.sendVerificationEmail).toHaveBeenCalledTimes(1);

    await vi.waitFor(() => {
      expect(loggerError).toHaveBeenCalledWith(
        expect.stringContaining('register.verificationEmailDispatchFailed'),
      );
    });
  });

  it('does not wait for slow SMTP delivery', async () => {
    let resolveSmtp!: () => void;
    const smtpGate = new Promise<void>((resolve) => {
      resolveSmtp = resolve;
    });
    const sendVerificationEmail = vi.fn().mockImplementation(() => smtpGate);

    const { service } = buildService({
      emailService: { sendVerificationEmail },
    });

    const started = Date.now();
    const result = await service.register({
      firstName: 'New',
      lastName: 'User',
      email: 'slow-smtp@test.ly',
      password: 'Password1',
      confirmPassword: 'Password1',
      role: Role.FREELANCER,
    });
    const elapsed = Date.now() - started;

    expect(result.accountCreated).toBe(true);
    expect(result.authenticated).toBe(true);
    // bcrypt dominates; SMTP must not add multi-second wait — gate still open.
    expect(elapsed).toBeLessThan(8000);
    expect(sendVerificationEmail).toHaveBeenCalledTimes(1);

    resolveSmtp();
    await smtpGate;
  });

  it('returns requiresLogin when session persistence fails after commit', async () => {
    const refreshTokenCreate = vi
      .fn()
      .mockRejectedValue(new Error('refresh persist failed'));
    const loggerError = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const { service, prisma } = buildService({ refreshTokenCreate });

    const result = await service.register({
      firstName: 'New',
      lastName: 'User',
      email: 'session-fail@test.ly',
      password: 'Password1',
      confirmPassword: 'Password1',
      role: Role.CLIENT,
    });

    expect(result).toEqual({
      accountCreated: true,
      authenticated: false,
      requiresLogin: true,
      channel: 'web',
    });
    expect(prisma.emailVerificationToken.create).toHaveBeenCalled();
    expect(loggerError).toHaveBeenCalledWith(
      expect.stringContaining('register.sessionFailed'),
    );
  });

  it('does not create a user when the DB transaction fails', async () => {
    const { service, prisma } = buildService({
      transactionImpl: async () => {
        throw new Error('tx boom');
      },
    });

    await expect(
      service.register({
        firstName: 'New',
        lastName: 'User',
        email: 'tx-fail@test.ly',
        password: 'Password1',
        confirmPassword: 'Password1',
        role: Role.CLIENT,
      }),
    ).rejects.toThrow('tx boom');

    expect(prisma.emailVerificationToken.create).not.toHaveBeenCalled();
  });

  it('maps P2002 email uniqueness to ConflictException', async () => {
    const { service } = buildService({
      transactionImpl: async () => {
        throw new Prisma.PrismaClientKnownRequestError('Unique constraint', {
          code: 'P2002',
          clientVersion: 'test',
          meta: { target: ['email'] },
        });
      },
    });

    await expect(
      service.register({
        firstName: 'New',
        lastName: 'User',
        email: 'dup@test.ly',
        password: 'Password1',
        confirmPassword: 'Password1',
        role: Role.CLIENT,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects existing email before transaction (409 path)', async () => {
    const { service, prisma } = buildService();
    prisma.user.findUnique = vi.fn().mockResolvedValue({ id: 'existing' });

    await expect(
      service.register({
        firstName: 'New',
        lastName: 'User',
        email: 'exists@test.ly',
        password: 'Password1',
        confirmPassword: 'Password1',
        role: Role.CLIENT,
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
