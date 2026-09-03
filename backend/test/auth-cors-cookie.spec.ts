import { Controller, Module, Post, Res } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { ExpressAdapter } from '@nestjs/platform-express';
import type { Response } from 'express';
import type { Server } from 'node:http';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  clearRefreshCookie,
  setRefreshCookie,
} from '../src/auth/auth-cookie.util.js';
import { configureApp } from '../src/bootstrap.js';

const ALLOWED_ORIGINS = [
  'https://libyanfreelance.ly',
  'https://www.libyanfreelance.ly',
  'https://admin.libyanfreelance.ly',
];

const REJECTED_ORIGIN = 'https://libyanfreelance.ly.attacker.example';

/**
 * Stands in for the real auth controller: exercises the shared cookie helpers
 * through the real Express response so the emitted Set-Cookie headers are the
 * ones a browser would receive.
 */
@Controller('cookie-probe')
class CookieProbeController {
  @Post('set')
  set(@Res({ passthrough: true }) res: Response) {
    setRefreshCookie(res, 'refresh-token-value');
    return { ok: true };
  }

  @Post('clear')
  clear(@Res({ passthrough: true }) res: Response) {
    clearRefreshCookie(res);
    return { ok: true };
  }
}

@Module({ controllers: [CookieProbeController] })
class CookieProbeModule {}

describe('production CORS + refresh cookie wire format', () => {
  let app: NestExpressApplication;
  let server: Server;
  let savedCorsOrigins: string | undefined;
  let savedNodeEnv: string | undefined;
  let savedSameSite: string | undefined;

  beforeAll(async () => {
    savedCorsOrigins = process.env.CORS_ORIGINS;
    savedNodeEnv = process.env.NODE_ENV;
    savedSameSite = process.env.AUTH_COOKIE_SAME_SITE;

    process.env.CORS_ORIGINS = ALLOWED_ORIGINS.join(',');

    // The app is created while NODE_ENV is still `test` so the rate limiters
    // stay disabled; cookie options are resolved per request instead.
    app = await NestFactory.create<NestExpressApplication>(
      CookieProbeModule,
      new ExpressAdapter(),
      { logger: false },
    );
    configureApp(app);
    await app.init();
    server = app.getHttpServer();
  });

  afterAll(async () => {
    await app?.close();

    const restore = (key: string, value: string | undefined) => {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    };

    restore('CORS_ORIGINS', savedCorsOrigins);
    restore('NODE_ENV', savedNodeEnv);
    restore('AUTH_COOKIE_SAME_SITE', savedSameSite);
  });

  describe('CORS', () => {
    it.each(ALLOWED_ORIGINS)('allows credentialed requests from %s', async (origin) => {
      const response = await request(server)
        .options('/api/cookie-probe/set')
        .set('Origin', origin)
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'content-type,x-client-request');

      expect(response.headers['access-control-allow-origin']).toBe(origin);
      expect(response.headers['access-control-allow-credentials']).toBe('true');
      expect(
        response.headers['access-control-allow-headers']?.toLowerCase(),
      ).toContain('x-client-request');
    });

    it('never answers with a wildcard origin', async () => {
      const response = await request(server)
        .options('/api/cookie-probe/set')
        .set('Origin', ALLOWED_ORIGINS[0])
        .set('Access-Control-Request-Method', 'POST');

      expect(response.headers['access-control-allow-origin']).not.toBe('*');
    });

    it('rejects a look-alike origin outside the allowlist', async () => {
      const response = await request(server)
        .options('/api/cookie-probe/set')
        .set('Origin', REJECTED_ORIGIN)
        .set('Access-Control-Request-Method', 'POST');

      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });
  });

  describe('Set-Cookie', () => {
    const productionCookie = async (path: string): Promise<string> => {
      process.env.NODE_ENV = 'production';
      process.env.AUTH_COOKIE_SAME_SITE = 'lax';

      try {
        const response = await request(server)
          .post(path)
          .set('Origin', ALLOWED_ORIGINS[0])
          .set('X-Forwarded-Proto', 'https');

        const cookies = response.headers['set-cookie'] as unknown as string[];
        expect(cookies).toHaveLength(1);
        return cookies[0];
      } finally {
        process.env.NODE_ENV = savedNodeEnv ?? 'test';
        delete process.env.AUTH_COOKIE_SAME_SITE;
      }
    };

    it('issues a host-only, HttpOnly, Secure, SameSite=Lax cookie', async () => {
      const cookie = await productionCookie('/api/cookie-probe/set');

      expect(cookie).toContain('refresh_token=refresh-token-value');
      expect(cookie).toContain('HttpOnly');
      expect(cookie).toContain('Secure');
      expect(cookie).toContain('SameSite=Lax');
      expect(cookie).toContain('Path=/api/auth');
      expect(cookie).toContain('Max-Age=604800');
      expect(cookie).not.toContain('Domain=');
    });

    it('clears the cookie with matching attributes and a past expiry', async () => {
      const cookie = await productionCookie('/api/cookie-probe/clear');

      expect(cookie).toContain('refresh_token=;');
      expect(cookie).toContain('Expires=Thu, 01 Jan 1970');
      expect(cookie).toContain('Path=/api/auth');
      expect(cookie).toContain('HttpOnly');
      expect(cookie).toContain('Secure');
      expect(cookie).toContain('SameSite=Lax');
      expect(cookie).not.toContain('Max-Age');
    });
  });
});
