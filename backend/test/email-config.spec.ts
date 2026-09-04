import { describe, expect, it } from 'vitest';
import {
  assertProductionSmtpConfig,
  parseSmtpPort,
  parseSmtpSecure,
  resolveEmailConfig,
} from '../src/common/services/email-config.util.js';

describe('SMTP config parsing', () => {
  it('maps SMTP_PORT to a number', () => {
    expect(parseSmtpPort('465')).toBe(465);
    expect(parseSmtpPort(465)).toBe(465);
    expect(parseSmtpPort('')).toBeUndefined();
    expect(parseSmtpPort('abc')).toBeUndefined();
    expect(parseSmtpPort('0')).toBeUndefined();
  });

  it('parses SMTP_SECURE=true and defaults port 465 to secure', () => {
    expect(parseSmtpSecure('true')).toBe(true);
    expect(parseSmtpSecure('TRUE')).toBe(true);
    expect(parseSmtpSecure('1')).toBe(true);
    expect(parseSmtpSecure('false')).toBe(false);
    expect(parseSmtpSecure(undefined, 465)).toBe(true);
    expect(parseSmtpSecure(undefined, 587)).toBe(false);
  });

  it('rejects malformed SMTP_SECURE', () => {
    expect(() => parseSmtpSecure('maybe')).toThrow(/SMTP_SECURE/);
  });

  it('resolves production-shaped lsbox config', () => {
    const resolved = resolveEmailConfig({
      host: 'smtp.lsbox.email',
      port: '465',
      secure: 'true',
      user: 'support@libyanfreelance.ly',
      password: 'secret-not-for-logs',
      from: 'support@libyanfreelance.ly',
    });

    expect(resolved.mode).toBe('enabled');
    if (resolved.mode === 'enabled') {
      expect(resolved.smtp.host).toBe('smtp.lsbox.email');
      expect(resolved.smtp.port).toBe(465);
      expect(resolved.smtp.secure).toBe(true);
      expect(resolved.smtp.user).toBe('support@libyanfreelance.ly');
      expect(resolved.smtp.from).toBe('support@libyanfreelance.ly');
      expect(resolved.smtp.password).toBe('secret-not-for-logs');
    }
  });

  it('disables mail when SMTP is fully unset', () => {
    const resolved = resolveEmailConfig({});
    expect(resolved.mode).toBe('disabled');
  });

  it('fails clearly on incomplete SMTP', () => {
    expect(() =>
      resolveEmailConfig({
        host: 'smtp.lsbox.email',
        port: '465',
      }),
    ).toThrow(/Incomplete SMTP/);
  });

  it('assertProductionSmtpConfig requires full SMTP', () => {
    expect(() => assertProductionSmtpConfig({})).toThrow(/Production requires SMTP/);
    const smtp = assertProductionSmtpConfig({
      host: 'smtp.lsbox.email',
      port: 465,
      secure: true,
      user: 'support@libyanfreelance.ly',
      password: 'x',
      from: 'support@libyanfreelance.ly',
    });
    expect(smtp.port).toBe(465);
    expect(smtp.secure).toBe(true);
  });
});
