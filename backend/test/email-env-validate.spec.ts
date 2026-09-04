import 'reflect-metadata';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Environment } from '../src/config/env.validation.js';
import { validate } from '../src/config/validate.js';

function baseEnv(overrides: Record<string, unknown> = {}) {
  return {
    NODE_ENV: Environment.Development,
    PORT: 4000,
    DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
    JWT_ACCESS_SECRET: 'a'.repeat(32),
    JWT_REFRESH_SECRET: 'b'.repeat(32),
    FRONTEND_URL: 'http://localhost:3000',
    CORS_ORIGINS: 'http://localhost:3000',
    ...overrides,
  };
}

describe('env validate SMTP rules', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it('allows development without SMTP', () => {
    expect(() => validate(baseEnv())).not.toThrow();
  });

  it('requires complete SMTP in production', () => {
    expect(() =>
      validate(
        baseEnv({
          NODE_ENV: Environment.Production,
          FRONTEND_URL: 'https://libyanfreelance.ly',
          CORS_ORIGINS: 'https://libyanfreelance.ly',
        }),
      ),
    ).toThrow(/SMTP/);
  });

  it('accepts production lsbox SMTP', () => {
    const cfg = validate(
      baseEnv({
        NODE_ENV: Environment.Production,
        FRONTEND_URL: 'https://libyanfreelance.ly',
        CORS_ORIGINS: 'https://libyanfreelance.ly',
        SMTP_HOST: 'smtp.lsbox.email',
        SMTP_PORT: '465',
        SMTP_SECURE: 'true',
        SMTP_USER: 'support@libyanfreelance.ly',
        SMTP_PASSWORD: 'placeholder',
        EMAIL_FROM: 'support@libyanfreelance.ly',
      }),
    );
    expect(cfg.SMTP_PORT).toBe('465');
    expect(cfg.SMTP_SECURE).toBe('true');
  });

  it('rejects incomplete partial SMTP in development', () => {
    expect(() =>
      validate(
        baseEnv({
          SMTP_HOST: 'smtp.lsbox.email',
          SMTP_PORT: '465',
        }),
      ),
    ).toThrow(/Incomplete SMTP|Missing/);
  });
});
