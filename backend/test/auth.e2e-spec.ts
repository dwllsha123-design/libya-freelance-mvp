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

describe('Auth E2E (PostgreSQL)', () => {
  let app: Awaited<ReturnType<typeof createTestApp>>;
  let dbReady = false;

  beforeAll(async () => {
    dbReady = await isDatabaseAvailable();

    if (!dbReady) {
      console.warn(
        'Skipping Auth E2E: PostgreSQL not available at DATABASE_URL',
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

  it('registers CLIENT, logs in, gets /auth/me, refreshes, logs out', async (ctx) => {
    if (!dbReady) ctx.skip();

    const agent = authAgent(app);
    const email = `client-${Date.now()}@test.ly`;
    const password = 'Password1';

    const registerRes = await agent
      .post('/api/auth/register')
      .set(CLIENT_HEADER)
      .send({
        firstName: 'أحمد',
        lastName: 'العميل',
        email,
        password,
        confirmPassword: password,
        role: 'CLIENT',
      })
      .expect(201);

    expect(registerRes.body.user.role).toBe('CLIENT');
    expect(registerRes.body.accessToken).toBeTruthy();

    const loginRes = await agent
      .post('/api/auth/login')
      .set(CLIENT_HEADER)
      .send({ email, password })
      .expect(200);

    const accessToken = loginRes.body.accessToken as string;

    const meRes = await agent
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(meRes.body.email).toBe(email);

    const refreshRes = await agent
      .post('/api/auth/refresh')
      .set(CLIENT_HEADER)
      .expect(200);

    expect(refreshRes.body.accessToken).toBeTruthy();

    await agent.post('/api/auth/logout').set(CLIENT_HEADER).expect(200);

    await agent.post('/api/auth/refresh').set(CLIENT_HEADER).expect(401);
  });

  it('registers FREELANCER successfully', async (ctx) => {
    if (!dbReady) ctx.skip();

    const agent = authAgent(app);
    const email = `freelancer-${Date.now()}@test.ly`;

    const res = await agent
      .post('/api/auth/register')
      .set(CLIENT_HEADER)
      .send({
        firstName: 'سارة',
        lastName: 'مستقلة',
        email,
        password: 'Password1',
        confirmPassword: 'Password1',
        role: 'FREELANCER',
      })
      .expect(201);

    expect(res.body.user.role).toBe('FREELANCER');
  });

  it('rejects duplicate email registration', async (ctx) => {
    if (!dbReady) ctx.skip();

    const agent = authAgent(app);
    const email = `dup-${Date.now()}@test.ly`;

    await agent
      .post('/api/auth/register')
      .set(CLIENT_HEADER)
      .send({
        firstName: 'Test',
        lastName: 'User',
        email,
        password: 'Password1',
        confirmPassword: 'Password1',
        role: 'CLIENT',
      })
      .expect(201);

    await agent
      .post('/api/auth/register')
      .set(CLIENT_HEADER)
      .send({
        firstName: 'Test',
        lastName: 'User2',
        email,
        password: 'Password1',
        confirmPassword: 'Password1',
        role: 'CLIENT',
      })
      .expect(409);
  });

  it('rejects invalid password on login', async (ctx) => {
    if (!dbReady) ctx.skip();

    const agent = authAgent(app);
    const email = `invalid-${Date.now()}@test.ly`;

    await agent
      .post('/api/auth/register')
      .set(CLIENT_HEADER)
      .send({
        firstName: 'Test',
        lastName: 'User',
        email,
        password: 'Password1',
        confirmPassword: 'Password1',
        role: 'CLIENT',
      })
      .expect(201);

    await agent
      .post('/api/auth/login')
      .set(CLIENT_HEADER)
      .send({ email, password: 'WrongPass1' })
      .expect(401);
  });

  it('rejects ADMIN self-registration', async (ctx) => {
    if (!dbReady) ctx.skip();

    const agent = authAgent(app);

    await agent
      .post('/api/auth/register')
      .set(CLIENT_HEADER)
      .send({
        firstName: 'Admin',
        lastName: 'User',
        email: `admin-${Date.now()}@test.ly`,
        password: 'Password1',
        confirmPassword: 'Password1',
        role: 'ADMIN',
      })
      .expect(400);
  });

  it('rejects unauthenticated /auth/me', async (ctx) => {
    if (!dbReady) ctx.skip();

    await authAgent(app).get('/api/auth/me').expect(401);
  });

  it('rejects CLIENT and FREELANCER from admin endpoint', async (ctx) => {
    if (!dbReady) ctx.skip();

    const agent = authAgent(app);
    const email = `norole-${Date.now()}@test.ly`;

    const registerRes = await agent
      .post('/api/auth/register')
      .set(CLIENT_HEADER)
      .send({
        firstName: 'Client',
        lastName: 'Only',
        email,
        password: 'Password1',
        confirmPassword: 'Password1',
        role: 'CLIENT',
      })
      .expect(201);

    await agent
      .get('/api/health/admin')
      .set('Authorization', `Bearer ${registerRes.body.accessToken}`)
      .expect(403);
  });

  it('invalidates old refresh token after rotation', async (ctx) => {
    if (!dbReady) ctx.skip();

    const agent = authAgent(app);
    const email = `rotate-${Date.now()}@test.ly`;

    const registerRes = await agent
      .post('/api/auth/register')
      .set(CLIENT_HEADER)
      .send({
        firstName: 'Rotate',
        lastName: 'Test',
        email,
        password: 'Password1',
        confirmPassword: 'Password1',
        role: 'CLIENT',
      })
      .expect(201);

    const setCookie = registerRes.headers['set-cookie'];
    expect(setCookie).toBeTruthy();

    const oldRefreshCookie = (
      Array.isArray(setCookie) ? setCookie[0] : setCookie
    ).split(';')[0];

    await agent.post('/api/auth/refresh').set(CLIENT_HEADER).expect(200);

    const agent2 = authAgent(app);
    await agent2
      .post('/api/auth/refresh')
      .set(CLIENT_HEADER)
      .set('Cookie', oldRefreshCookie)
      .expect(401);

    await agent.post('/api/auth/refresh').set(CLIENT_HEADER).expect(200);
  });
});
