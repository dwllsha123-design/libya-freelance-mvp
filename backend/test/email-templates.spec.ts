import { describe, expect, it } from 'vitest';
import {
  buildEmailVerificationEmail,
  buildPasswordResetEmail,
} from '../src/common/services/email-templates.js';

const FRONTEND = 'https://libyanfreelance.ly';
const TOKEN = 'test-token-abc123';

describe('transactional email templates', () => {
  it('builds password-reset email with FRONTEND_URL and Arabic RTL HTML', () => {
    const mail = buildPasswordResetEmail(FRONTEND, TOKEN);

    expect(mail.subject).toBe('إعادة تعيين كلمة المرور | ليبي فريلانس');
    expect(mail.actionUrl).toBe(
      `${FRONTEND}/reset-password?token=${encodeURIComponent(TOKEN)}`,
    );
    expect(mail.html).toContain('dir="rtl"');
    expect(mail.html).toContain('lang="ar"');
    expect(mail.html).toContain('ليبي فريلانس');
    expect(mail.html).toContain('إعادة تعيين كلمة المرور');
    expect(mail.html).toContain(mail.actionUrl);
    expect(mail.html).not.toContain('<img'); // no tracking pixels
    expect(mail.text).toContain(mail.actionUrl);
    expect(mail.text).toContain('تجاهل');
  });

  it('builds verification email with FRONTEND_URL and Arabic RTL HTML', () => {
    const mail = buildEmailVerificationEmail(FRONTEND, TOKEN);

    expect(mail.subject).toBe('تأكيد بريدك الإلكتروني | ليبي فريلانس');
    expect(mail.actionUrl).toBe(
      `${FRONTEND}/verify-email?token=${encodeURIComponent(TOKEN)}`,
    );
    expect(mail.html).toContain('dir="rtl"');
    expect(mail.html).toContain('تأكيد البريد الإلكتروني');
    expect(mail.text).toContain(mail.actionUrl);
  });

  it('strips trailing slash from FRONTEND_URL', () => {
    const mail = buildPasswordResetEmail(`${FRONTEND}/`, TOKEN);
    expect(mail.actionUrl.startsWith(`${FRONTEND}/reset-password`)).toBe(true);
    expect(mail.actionUrl).not.toContain('//reset-password');
  });
});
