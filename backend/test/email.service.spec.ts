import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { InternalServerErrorException } from '@nestjs/common';

const { sendMailMock, createTransportMock } = vi.hoisted(() => {
  const sendMailMock = vi.fn();
  const createTransportMock = vi.fn(() => ({ sendMail: sendMailMock }));
  return { sendMailMock, createTransportMock };
});

vi.mock('nodemailer', () => ({
  default: {
    createTransport: createTransportMock,
  },
}));

import { EmailService } from '../src/common/services/email.service.js';

function makeConfig(values: Record<string, string | undefined>) {
  return {
    get: (key: string) => values[key],
    getOrThrow: (key: string) => {
      const v = values[key];
      if (v === undefined || v === '') {
        throw new Error(`missing ${key}`);
      }
      return v;
    },
  } as unknown as ConfigService;
}

describe('EmailService SMTP delivery', () => {
  beforeEach(() => {
    sendMailMock.mockReset();
    createTransportMock.mockClear();
    sendMailMock.mockResolvedValue({ messageId: '1' });
  });

  it('sends password-reset mail without logging tokens or SMTP password', async () => {
    const password = 'super-secret-smtp-password';
    const token = 'reset-token-SHOULD-NOT-APPEAR-IN-LOGS';
    const logs: string[] = [];
    const errorLogs: string[] = [];

    const service = new EmailService(
      makeConfig({
        nodeEnv: 'development',
        frontendUrl: 'https://libyanfreelance.ly',
        'email.smtpHost': 'smtp.lsbox.email',
        'email.smtpPort': '465',
        'email.smtpSecure': 'true',
        'email.smtpUser': 'support@libyanfreelance.ly',
        'email.smtpPassword': password,
        'email.from': 'support@libyanfreelance.ly',
        'tokens.passwordResetExpiresIn': '1h',
      }),
    );

    const logger = (
      service as unknown as {
        logger: { log: (m: string) => void; warn: (m: string) => void; error: (m: string) => void };
      }
    ).logger;
    logger.log = (m) => logs.push(String(m));
    logger.warn = (m) => logs.push(String(m));
    logger.error = (m) => errorLogs.push(String(m));

    service.onModuleInit();

    expect(createTransportMock).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'smtp.lsbox.email',
        port: 465,
        secure: true,
        tls: { rejectUnauthorized: true },
        auth: {
          user: 'support@libyanfreelance.ly',
          pass: password,
        },
      }),
    );

    await service.sendPasswordResetEmail('user@example.com', token);

    expect(sendMailMock).toHaveBeenCalledOnce();
    const payload = sendMailMock.mock.calls[0][0];
    expect(payload.subject).toContain('إعادة تعيين كلمة المرور');
    expect(payload.html).toContain('dir="rtl"');
    expect(payload.html).toContain(
      'https://libyanfreelance.ly/reset-password?token=',
    );
    expect(payload.text).toContain(token);

    const allLogs = [...logs, ...errorLogs].join('\n');
    expect(allLogs).not.toContain(token);
    expect(allLogs).not.toContain(password);
    expect(allLogs).not.toContain('reset-password?token=');
  });

  it('sends verification mail with correct FRONTEND_URL', async () => {
    const service = new EmailService(
      makeConfig({
        nodeEnv: 'development',
        frontendUrl: 'https://libyanfreelance.ly',
        'email.smtpHost': 'smtp.lsbox.email',
        'email.smtpPort': '465',
        'email.smtpSecure': 'true',
        'email.smtpUser': 'support@libyanfreelance.ly',
        'email.smtpPassword': 'secret',
        'email.from': 'support@libyanfreelance.ly',
        'tokens.emailVerificationExpiresIn': '24h',
      }),
    );
    service.onModuleInit();

    await service.sendVerificationEmail('user@example.com', 'verify-token');

    const payload = sendMailMock.mock.calls[0][0];
    expect(payload.subject).toContain('تأكيد بريدك الإلكتروني');
    expect(payload.html).toContain(
      'https://libyanfreelance.ly/verify-email?token=verify-token',
    );
  });

  it('fails safely on SMTP errors without leaking secrets', async () => {
    sendMailMock.mockRejectedValue(new Error('SMTP auth failed for secret-password'));
    const errorLogs: string[] = [];

    const service = new EmailService(
      makeConfig({
        nodeEnv: 'development',
        frontendUrl: 'https://libyanfreelance.ly',
        'email.smtpHost': 'smtp.lsbox.email',
        'email.smtpPort': '465',
        'email.smtpSecure': 'true',
        'email.smtpUser': 'support@libyanfreelance.ly',
        'email.smtpPassword': 'secret-password',
        'email.from': 'support@libyanfreelance.ly',
        'tokens.passwordResetExpiresIn': '1h',
      }),
    );

    (
      service as unknown as {
        logger: { error: (m: string) => void; log: () => void; warn: () => void };
      }
    ).logger.error = (m) => errorLogs.push(String(m));
    (
      service as unknown as {
        logger: { log: () => void; warn: () => void };
      }
    ).logger.log = () => undefined;
    (
      service as unknown as {
        logger: { warn: () => void };
      }
    ).logger.warn = () => undefined;

    service.onModuleInit();

    await expect(
      service.sendPasswordResetEmail('user@example.com', 'tok'),
    ).rejects.toBeInstanceOf(InternalServerErrorException);

    const joined = errorLogs.join('\n');
    expect(joined).toContain('Failed to send password_reset email via SMTP');
    expect(joined).not.toContain('secret-password');
    expect(joined).not.toContain('tok');
    expect(joined).not.toContain('SMTP auth failed');
  });

  it('skips sending when SMTP is disabled (local/dev)', async () => {
    const service = new EmailService(
      makeConfig({
        nodeEnv: 'development',
        frontendUrl: 'http://localhost:3000',
        'email.from': 'support@libyanfreelance.ly',
      }),
    );
    service.onModuleInit();
    await service.sendPasswordResetEmail('user@example.com', 'tok');
    expect(sendMailMock).not.toHaveBeenCalled();
  });
});
