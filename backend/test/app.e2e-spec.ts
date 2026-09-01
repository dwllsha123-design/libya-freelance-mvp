import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/bootstrap.js';
import { isDatabaseAvailable } from './helpers/e2e-setup.js';

describe('AppController (e2e)', () => {
  let app: Awaited<ReturnType<typeof createApp>>;
  let dbReady = false;

  beforeAll(async () => {
    dbReady = await isDatabaseAvailable();

    if (!dbReady) {
      console.warn('Skipping health E2E: PostgreSQL not available');
      return;
    }

    app = await createApp();
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('/api/health (GET)', async (ctx) => {
    if (!dbReady) ctx.skip();

    return request(app.getHttpServer())
      .get('/api/health')
      .expect(200)
      .expect((res) => {
        expect(res.body.status).toBe('ok');
      });
  });
});
