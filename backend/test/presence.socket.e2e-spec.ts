import type { AddressInfo } from 'node:net';
import { PrismaClient, Role } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  CLIENT_HEADER,
  authAgent,
  createTestApp,
  isDatabaseAvailable,
  resetDatabase,
} from './helpers/e2e-setup.js';
import { registerUser, seedTestReferenceData } from './helpers/project-e2e.helpers.js';
import { connectSocket, emitWithAck } from './helpers/socket-e2e.helpers.js';
import { PresenceService } from '../src/presence/presence.service.js';

const prisma = new PrismaClient();

describe('Presence Socket.IO (PostgreSQL)', () => {
  let app: Awaited<ReturnType<typeof createTestApp>>;
  let dbReady = false;
  let baseUrl = '';

  beforeAll(async () => {
    process.env.PRESENCE_OFFLINE_GRACE_MS = '200';
    dbReady = await isDatabaseAvailable();
    if (!dbReady) {
      console.warn('Skipping Presence Socket E2E: PostgreSQL not available');
      return;
    }

    app = await createTestApp();
    await app.listen(0);
    const address = app.getHttpServer().address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;

    await resetDatabase(prisma);
    await seedTestReferenceData(prisma);
  });

  afterAll(async () => {
    if (app) await app.close();
    await prisma.$disconnect();
  });

  it('multi-tab: remains online until final disconnect', async (ctx) => {
    if (!dbReady) ctx.skip();

    const user = await registerUser(app, 'FREELANCER', 'pres-multi');
    const s1 = await connectSocket(baseUrl, user.accessToken);
    const s2 = await connectSocket(baseUrl, user.accessToken);

    const presence = app.get(PresenceService);
    expect(await presence.isOnline(user.userId)).toBe(true);

    s1.disconnect();
    await new Promise((r) => setTimeout(r, 50));
    expect(await presence.isOnline(user.userId)).toBe(true);

    s2.disconnect();
    await new Promise((r) => setTimeout(r, 400));
    expect(await presence.isOnline(user.userId)).toBe(false);

    const dbUser = await prisma.user.findUnique({ where: { id: user.userId } });
    expect(dbUser?.lastSeenAt).toBeTruthy();
  });

  it('heartbeat refreshes presence', async (ctx) => {
    if (!dbReady) ctx.skip();

    const user = await registerUser(app, 'CLIENT', 'pres-hb');
    const socket = await connectSocket(baseUrl, user.accessToken);

    const ack = await emitWithAck<{ ok?: boolean }>(
      socket,
      'presence:heartbeat',
      {},
    );
    expect(ack.ok).toBe(true);

    const presence = app.get(PresenceService);
    expect(await presence.isOnline(user.userId)).toBe(true);
    socket.disconnect();
  });

  it('presence lookup only returns requested users', async (ctx) => {
    if (!dbReady) ctx.skip();

    const a = await registerUser(app, 'FREELANCER', 'pres-look-a');
    const b = await registerUser(app, 'FREELANCER', 'pres-look-b');
    const viewer = await registerUser(app, 'CLIENT', 'pres-look-v');

    const sa = await connectSocket(baseUrl, a.accessToken);

    const res = await authAgent(app)
      .post('/api/presence/lookup')
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${viewer.accessToken}`)
      .send({ userIds: [a.userId, b.userId] })
      .expect(201);

    const items = res.body.items as Array<{ userId: string; status: string }>;
    expect(items).toHaveLength(2);
    expect(items.find((i) => i.userId === a.userId)?.status).toBe('ONLINE');
    expect(items.find((i) => i.userId === b.userId)?.status).toBe('OFFLINE');

    sa.disconnect();
  });

  it('online freelancer filter uses realtime presence', async (ctx) => {
    if (!dbReady) ctx.skip();

    const online = await registerUser(app, 'FREELANCER', 'pres-filter-on');
    await registerUser(app, 'FREELANCER', 'pres-filter-off');

    const socket = await connectSocket(baseUrl, online.accessToken);

    const res = await authAgent(app)
      .get('/api/freelancers?activity=online')
      .set(CLIENT_HEADER)
      .expect(200);

    const ids = (res.body.data as Array<{ userId: string }>).map((d) => d.userId);
    expect(ids).toContain(online.userId);

    socket.disconnect();
  });

  it('banned user cannot keep presence', async (ctx) => {
    if (!dbReady) ctx.skip();

    const user = await registerUser(app, 'FREELANCER', 'pres-ban');
    const socket = await connectSocket(baseUrl, user.accessToken);
    const presence = app.get(PresenceService);
    expect(await presence.isOnline(user.userId)).toBe(true);

    await prisma.user.update({
      where: { id: user.userId },
      data: { status: 'BANNED' },
    });

    await presence.forceOffline(user.userId);
    expect(await presence.isOnline(user.userId)).toBe(false);
    socket.disconnect();
  });

  it('presence subscribe returns items for authorized viewer', async (ctx) => {
    if (!dbReady) ctx.skip();

    const subject = await registerUser(app, 'FREELANCER', 'pres-sub-s');
    const viewer = await registerUser(app, 'CLIENT', 'pres-sub-v');
    const subjectSocket = await connectSocket(baseUrl, subject.accessToken);
    const viewerSocket = await connectSocket(baseUrl, viewer.accessToken);

    const result = await emitWithAck<{
      ok?: boolean;
      items?: Array<{ userId: string; status: string }>;
    }>(viewerSocket, 'presence:subscribe', { userIds: [subject.userId] });

    expect(result.ok).toBe(true);
    expect(result.items?.[0]?.status).toBe('ONLINE');

    subjectSocket.disconnect();
    viewerSocket.disconnect();
  });

  it('counts freelancers vs clients for admin metrics path', async (ctx) => {
    if (!dbReady) ctx.skip();

    const fl = await registerUser(app, 'FREELANCER', 'pres-role-fl');
    const cl = await registerUser(app, 'CLIENT', 'pres-role-cl');
    const sFl = await connectSocket(baseUrl, fl.accessToken);
    const sCl = await connectSocket(baseUrl, cl.accessToken);

    const presence = app.get(PresenceService);
    expect(await presence.countOnline(Role.FREELANCER)).toBeGreaterThanOrEqual(1);
    expect(await presence.countOnline(Role.CLIENT)).toBeGreaterThanOrEqual(1);

    sFl.disconnect();
    sCl.disconnect();
  });
});
