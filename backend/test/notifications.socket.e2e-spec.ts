import type { AddressInfo } from 'node:net';
import { PrismaClient } from '@prisma/client';
import { io, type Socket } from 'socket.io-client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  CLIENT_HEADER,
  authAgent,
  createTestApp,
  isDatabaseAvailable,
  resetDatabase,
} from './helpers/e2e-setup.js';
import {
  createOpenProject,
  getReferenceIds,
  registerUser,
  seedTestReferenceData,
  validProposalBody,
} from './helpers/project-e2e.helpers.js';

const prisma = new PrismaClient();

function connectSocket(baseUrl: string, token?: string): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const socket = io(baseUrl, {
      auth: token ? { token } : {},
      transports: ['websocket'],
      forceNew: true,
      reconnection: false,
    });

    const timer = setTimeout(() => {
      socket.disconnect();
      reject(new Error('Socket connect timeout'));
    }, 5000);

    socket.on('connect', () => {
      clearTimeout(timer);
      resolve(socket);
    });

    socket.on('connect_error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

function waitForEvent<T>(socket: Socket, event: string, timeoutMs = 5000) {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout waiting for ${event}`));
    }, timeoutMs);

    socket.once(event, (payload: T) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

describe('Notifications Socket.IO (PostgreSQL)', () => {
  let app: Awaited<ReturnType<typeof createTestApp>>;
  let dbReady = false;
  let baseUrl = '';
  let categoryId = '';
  let skillId = '';

  beforeAll(async () => {
    dbReady = await isDatabaseAvailable();
    if (!dbReady) {
      console.warn('Skipping Notifications Socket E2E: PostgreSQL not available');
      return;
    }

    app = await createTestApp();
    await resetDatabase(prisma);
    await seedTestReferenceData(prisma);
    const refs = await getReferenceIds(prisma);
    categoryId = refs.category.id;
    skillId = refs.skill.id;

    const server = app.getHttpServer();
    const address = server.address() as AddressInfo;
    const port = typeof address === 'string' ? 0 : address.port;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    if (app) await app.close();
    await prisma.$disconnect();
  });

  it('1-2. Authenticated user joins private room; cannot receive other user events', async (ctx) => {
    if (!dbReady) ctx.skip();
    const client = await registerUser(app, 'CLIENT', 'nsock-1');
    const other = await registerUser(app, 'CLIENT', 'nsock-1-other');
    const freelancer = await registerUser(app, 'FREELANCER', 'nsock-1-fl');

    const recipientSocket = await connectSocket(baseUrl, client.accessToken);
    const otherSocket = await connectSocket(baseUrl, other.accessToken);

    let otherReceived = false;
    otherSocket.on('notification:new', () => {
      otherReceived = true;
    });

    const open = await createOpenProject(
      app,
      client.accessToken,
      categoryId,
      skillId,
    );

    const notificationPromise = waitForEvent<{ id: string; type: string }>(
      recipientSocket,
      'notification:new',
    );

    await authAgent(app)
      .post(`/api/projects/${open.id}/proposals`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${freelancer.accessToken}`)
      .send(validProposalBody)
      .expect(201);

    const payload = await notificationPromise;
    expect(payload.type).toBe('NEW_PROPOSAL');

    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(otherReceived).toBe(false);

    recipientSocket.disconnect();
    otherSocket.disconnect();
  });

  it('3-5. notification:new only to recipient; persisted before emit', async (ctx) => {
    if (!dbReady) ctx.skip();
    const client = await registerUser(app, 'CLIENT', 'nsock-3');
    const freelancer = await registerUser(app, 'FREELANCER', 'nsock-3-fl');
    const socket = await connectSocket(baseUrl, client.accessToken);

    const open = await createOpenProject(
      app,
      client.accessToken,
      categoryId,
      skillId,
    );

    const eventPromise = waitForEvent<{ id: string }>(socket, 'notification:new');

    await authAgent(app)
      .post(`/api/projects/${open.id}/proposals`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${freelancer.accessToken}`)
      .send(validProposalBody)
      .expect(201);

    const event = await eventPromise;
    const row = await prisma.notification.findUnique({ where: { id: event.id } });
    expect(row).toBeTruthy();
    expect(row?.userId).toBe(client.userId);

    socket.disconnect();
  });

  it('6. REST unread count works after missed socket event', async (ctx) => {
    if (!dbReady) ctx.skip();
    const client = await registerUser(app, 'CLIENT', 'nsock-6');
    const freelancer = await registerUser(app, 'FREELANCER', 'nsock-6-fl');
    const open = await createOpenProject(
      app,
      client.accessToken,
      categoryId,
      skillId,
    );

    await authAgent(app)
      .post(`/api/projects/${open.id}/proposals`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${freelancer.accessToken}`)
      .send(validProposalBody)
      .expect(201);

    const countRes = await authAgent(app)
      .get('/api/notifications/unread-count')
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .expect(200);

    expect(countRes.body.count).toBeGreaterThanOrEqual(1);
  });
});
