import type { AddressInfo } from 'node:net';
import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  CLIENT_HEADER,
  authAgent,
  createTestApp,
  isDatabaseAvailable,
  resetDatabase,
} from './helpers/e2e-setup.js';
import {
  registerAdmin,
  registerUser,
  seedTestReferenceData,
} from './helpers/project-e2e.helpers.js';
import { connectSocket } from './helpers/socket-e2e.helpers.js';

const prisma = new PrismaClient();

describe('Auth hardening E2E (PostgreSQL)', () => {
  let app: Awaited<ReturnType<typeof createTestApp>>;
  let dbReady = false;
  let baseUrl = '';

  beforeAll(async () => {
    dbReady = await isDatabaseAvailable();
    if (!dbReady) {
      console.warn('Skipping Auth hardening E2E: PostgreSQL not available');
      return;
    }

    app = await createTestApp();
    await resetDatabase(prisma);
    await seedTestReferenceData(prisma);
    await app.listen(0);
    const address = app.getHttpServer().address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    if (app) await app.close();
    await prisma.$disconnect();
  });

  it('blocks suspended user immediately on protected HTTP with existing access token', async (ctx) => {
    if (!dbReady) ctx.skip();

    const admin = await registerAdmin(prisma, app, 'suspend-http');
    const client = await registerUser(app, 'CLIENT', 'suspend-http-c');
    const token = client.accessToken;

    await authAgent(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    await authAgent(app)
      .post(`/api/admin/users/${client.userId}/suspend`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(201);

    await authAgent(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);

    const refreshCount = await prisma.refreshToken.count({
      where: { userId: client.userId },
    });
    expect(refreshCount).toBe(0);
  });

  it('disconnects suspended user socket and blocks further realtime actions', async (ctx) => {
    if (!dbReady) ctx.skip();

    const admin = await registerAdmin(prisma, app, 'suspend-socket');
    const client = await registerUser(app, 'CLIENT', 'suspend-socket-c');
    const socket = await connectSocket(baseUrl, client.accessToken);

    const disconnected = new Promise<void>((resolve) => {
      socket.on('disconnect', () => resolve());
    });

    await authAgent(app)
      .post(`/api/admin/users/${client.userId}/suspend`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(201);

    await disconnected;

    expect(socket.connected).toBe(false);
    socket.disconnect();
  });

  it('reactivated user can authenticate again after ban', async (ctx) => {
    if (!dbReady) ctx.skip();

    const admin = await registerAdmin(prisma, app, 'reactivate');
    const freelancer = await registerUser(app, 'FREELANCER', 'reactivate-fl');

    await authAgent(app)
      .post(`/api/admin/users/${freelancer.userId}/ban`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(201);

    await authAgent(app)
      .post('/api/auth/login')
      .set(CLIENT_HEADER)
      .send({ email: freelancer.email, password: 'Password1' })
      .expect(401);

    await authAgent(app)
      .post(`/api/admin/users/${freelancer.userId}/reactivate`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(201);

    await authAgent(app)
      .post('/api/auth/login')
      .set(CLIENT_HEADER)
      .send({ email: freelancer.email, password: 'Password1' })
      .expect(200);
  });
});
