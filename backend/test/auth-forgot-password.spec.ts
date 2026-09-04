import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../src/auth/auth.service.js';

describe('forgotPassword account-enumeration protection', () => {
  const genericMessage =
    'إذا كان البريد الإلكتروني مسجلاً، ستتلقى رابط إعادة تعيين كلمة المرور';

  let prisma: {
    user: { findUnique: ReturnType<typeof vi.fn> };
    passwordResetToken: { create: ReturnType<typeof vi.fn> };
  };
  let emailService: { sendPasswordResetEmail: ReturnType<typeof vi.fn> };
  let configService: { get: ReturnType<typeof vi.fn> };
  let service: AuthService;

  beforeEach(() => {
    prisma = {
      user: { findUnique: vi.fn() },
      passwordResetToken: { create: vi.fn().mockResolvedValue({}) },
    };
    emailService = {
      sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
    };
    configService = {
      get: vi.fn((key: string) =>
        key === 'tokens.passwordResetExpiresIn' ? '1h' : undefined,
      ),
    };

    service = new AuthService(
      prisma as never,
      {} as never,
      {} as never,
      configService as never,
      emailService as never,
      {} as never,
      {} as never,
      {} as never,
    );
  });

  it('returns the same generic message when the account does not exist', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    const result = await service.forgotPassword('missing@example.com');
    expect(result.message).toBe(genericMessage);
    expect(emailService.sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it('returns the same generic message when the account exists', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'user@example.com',
    });
    const result = await service.forgotPassword('user@example.com');
    expect(result.message).toBe(genericMessage);
    expect(emailService.sendPasswordResetEmail).toHaveBeenCalledOnce();
    const tokenArg = emailService.sendPasswordResetEmail.mock.calls[0][1];
    expect(typeof tokenArg).toBe('string');
    expect(tokenArg.length).toBeGreaterThan(10);
  });

  it('still returns the generic message when SMTP delivery fails', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'user@example.com',
    });
    emailService.sendPasswordResetEmail.mockRejectedValue(
      new Error('smtp boom with password=secret'),
    );
    const result = await service.forgotPassword('user@example.com');
    expect(result.message).toBe(genericMessage);
  });
});
