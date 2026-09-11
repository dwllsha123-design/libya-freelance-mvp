import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  CLIENT_HEADER,
  authAgent,
  createTestApp,
  isDatabaseAvailable,
  resetDatabase,
} from './helpers/e2e-setup.js';

const prisma = new PrismaClient();

describe('Native auth session E2E (PostgreSQL)', () => {
  let app: Awaited<ReturnType<typeof createTestApp>>;
  let dbReady = false;

  beforeAll(async () => {
    dbReady = await isDatabaseAvailable();

    if (!dbReady) {
      console.warn(
        'Skipping Native Auth E2E: PostgreSQL not available at DATABASE_URL',
      );
      return;
    }

    app = await createTestApp();
    await resetDatabase(prisma);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    await prisma.$disconnect();
  });

  it('native login returns refresh in body, creates UserDevice, needs no cookie', async (ctx) => {
    if (!dbReady) ctx.skip();

    const agent = authAgent(app);
    const email = `native-login-${Date.now()}@test.ly`;
    const password = 'Password1';

    await agent
      .post('/api/auth/register')
      .set(CLIENT_HEADER)
      .send({
        firstName: 'Native',
        lastName: 'User',
        email,
        password,
        confirmPassword: password,
        role: 'FREELANCER',
      })
      .expect(201);

    // Cookie-jar agent would keep web cookies from register — use fresh agent.
    const nativeAgent = authAgent(app);
    const loginRes = await nativeAgent
      .post('/api/auth/login')
      .set(CLIENT_HEADER)
      .send({
        email,
        password,
        clientChannel: 'native',
        platform: 'ANDROID',
        appVersion: '1.0.0',
      })
      .expect(200);

    expect(loginRes.body.accessToken).toBeTruthy();
    expect(loginRes.body.refreshToken).toBeTruthy();
    expect(typeof loginRes.body.refreshToken).toBe('string');

    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    const devices = await prisma.userDevice.findMany({
      where: { userId: user.id, platform: 'ANDROID', isActive: true },
    });
    expect(devices.length).toBeGreaterThanOrEqual(1);

    const refreshRows = await prisma.refreshToken.findMany({
      where: { userId: user.id, deviceId: { not: null } },
    });
    expect(refreshRows.length).toBeGreaterThanOrEqual(1);

    const meRes = await nativeAgent
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${loginRes.body.accessToken}`)
      .expect(200);

    expect(meRes.body.email).toBe(email);
  });

  it('native refresh rotates and returns new refresh without cookies', async (ctx) => {
    if (!dbReady) ctx.skip();

    const agent = authAgent(app);
    const email = `native-refresh-${Date.now()}@test.ly`;
    const password = 'Password1';

    await agent
      .post('/api/auth/register')
      .set(CLIENT_HEADER)
      .send({
        firstName: 'Rotate',
        lastName: 'Native',
        email,
        password,
        confirmPassword: password,
        role: 'CLIENT',
      })
      .expect(201);

    const loginRes = await authAgent(app)
      .post('/api/auth/login')
      .set(CLIENT_HEADER)
      .send({
        email,
        password,
        clientChannel: 'native',
        platform: 'IOS',
      })
      .expect(200);

    const oldRefresh = loginRes.body.refreshToken as string;

    const refreshRes = await authAgent(app)
      .post('/api/auth/refresh')
      .set(CLIENT_HEADER)
      .send({ refreshToken: oldRefresh })
      .expect(200);

    expect(refreshRes.body.accessToken).toBeTruthy();
    expect(refreshRes.body.refreshToken).toBeTruthy();
    expect(refreshRes.body.refreshToken).not.toBe(oldRefresh);

    await authAgent(app)
      .post('/api/auth/refresh')
      .set(CLIENT_HEADER)
      .send({ refreshToken: oldRefresh })
      .expect(401);

    // Family revoke: the rotated successor is also invalidated after reuse.
    await authAgent(app)
      .post('/api/auth/refresh')
      .set(CLIENT_HEADER)
      .send({ refreshToken: refreshRes.body.refreshToken })
      .expect(401);
  });

  it('native logout revokes session and rejects subsequent refresh', async (ctx) => {
    if (!dbReady) ctx.skip();

    const email = `native-logout-${Date.now()}@test.ly`;
    const password = 'Password1';

    await authAgent(app)
      .post('/api/auth/register')
      .set(CLIENT_HEADER)
      .send({
        firstName: 'Logout',
        lastName: 'Native',
        email,
        password,
        confirmPassword: password,
        role: 'CLIENT',
      })
      .expect(201);

    const loginRes = await authAgent(app)
      .post('/api/auth/login')
      .set(CLIENT_HEADER)
      .send({
        email,
        password,
        clientChannel: 'native',
        platform: 'ANDROID',
      })
      .expect(200);

    const refreshToken = loginRes.body.refreshToken as string;
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });

    await authAgent(app)
      .post('/api/auth/logout')
      .set(CLIENT_HEADER)
      .send({ refreshToken })
      .expect(200);

    const devices = await prisma.userDevice.findMany({
      where: { userId: user.id, platform: 'ANDROID' },
    });
    expect(devices.every((d) => d.isActive === false)).toBe(true);

    await authAgent(app)
      .post('/api/auth/refresh')
      .set(CLIENT_HEADER)
      .send({ refreshToken })
      .expect(401);
  });

  it('isolates native device sessions from each other', async (ctx) => {
    if (!dbReady) ctx.skip();

    const email = `native-iso-${Date.now()}@test.ly`;
    const password = 'Password1';

    await authAgent(app)
      .post('/api/auth/register')
      .set(CLIENT_HEADER)
      .send({
        firstName: 'Iso',
        lastName: 'Native',
        email,
        password,
        confirmPassword: password,
        role: 'CLIENT',
      })
      .expect(201);

    const androidLogin = await authAgent(app)
      .post('/api/auth/login')
      .set(CLIENT_HEADER)
      .send({
        email,
        password,
        clientChannel: 'native',
        platform: 'ANDROID',
      })
      .expect(200);

    const iosLogin = await authAgent(app)
      .post('/api/auth/login')
      .set(CLIENT_HEADER)
      .send({
        email,
        password,
        clientChannel: 'native',
        platform: 'IOS',
      })
      .expect(200);

    await authAgent(app)
      .post('/api/auth/logout')
      .set(CLIENT_HEADER)
      .send({ refreshToken: androidLogin.body.refreshToken })
      .expect(200);

    const iosRefresh = await authAgent(app)
      .post('/api/auth/refresh')
      .set(CLIENT_HEADER)
      .send({ refreshToken: iosLogin.body.refreshToken })
      .expect(200);

    expect(iosRefresh.body.refreshToken).toBeTruthy();
  });

  it('rejects invalid native client metadata', async (ctx) => {
    if (!dbReady) ctx.skip();

    const email = `native-bad-${Date.now()}@test.ly`;
    const password = 'Password1';

    await authAgent(app)
      .post('/api/auth/register')
      .set(CLIENT_HEADER)
      .send({
        firstName: 'Bad',
        lastName: 'Meta',
        email,
        password,
        confirmPassword: password,
        role: 'CLIENT',
      })
      .expect(201);

    await authAgent(app)
      .post('/api/auth/login')
      .set(CLIENT_HEADER)
      .send({
        email,
        password,
        clientChannel: 'native',
      })
      .expect(400);

    await authAgent(app)
      .post('/api/auth/login')
      .set(CLIENT_HEADER)
      .send({
        email,
        password,
        clientChannel: 'native',
        platform: 'WEB',
      })
      .expect(400);
  });

  it('does not let native channel bypass admin audience separation', async (ctx) => {
    if (!dbReady) ctx.skip();

    const email = `native-aud-${Date.now()}@test.ly`;
    const password = 'Password1';

    await authAgent(app)
      .post('/api/auth/register')
      .set(CLIENT_HEADER)
      .send({
        firstName: 'Aud',
        lastName: 'Native',
        email,
        password,
        confirmPassword: password,
        role: 'CLIENT',
      })
      .expect(201);

    await authAgent(app)
      .post('/api/auth/login')
      .set(CLIENT_HEADER)
      .send({
        email,
        password,
        clientChannel: 'native',
        platform: 'IOS',
        audience: 'admin',
      })
      .expect(403);
  });
});
