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
  getReferenceIds,
  registerUser,
  seedTestReferenceData,
  validProjectPayload,
} from './helpers/project-e2e.helpers.js';
import {
  connectSocket,
  expectUnauthenticatedSocketRejected,
} from './helpers/socket-e2e.helpers.js';

const prisma = new PrismaClient();

const proposalBody = {
  coverLetter:
    'أنا مستقل ذو خبرة في هذا المجال وأستطيع تنفيذ المشروع وفق المتطلبات المذكورة مع التزام بالجودة والمواعيد.',
  proposedPrice: 2500,
  estimatedDurationDays: 14,
};

async function publishProject(
  app: Awaited<ReturnType<typeof createTestApp>>,
  token: string,
  categoryId: string,
  skillId: string,
) {
  const created = await authAgent(app)
    .post('/api/projects')
    .set(CLIENT_HEADER)
    .set('Authorization', `Bearer ${token}`)
    .send(validProjectPayload(categoryId, [skillId]))
    .expect(201);

  await authAgent(app)
    .post(`/api/projects/${created.body.id}/publish`)
    .set(CLIENT_HEADER)
    .set('Authorization', `Bearer ${token}`)
    .expect(201);

  return created.body;
}

describe('Messaging Socket.IO (PostgreSQL)', () => {
  let app: Awaited<ReturnType<typeof createTestApp>>;
  let dbReady = false;
  let baseUrl = '';
  let categoryId = '';
  let skillId = '';

  beforeAll(async () => {
    dbReady = await isDatabaseAvailable();
    if (!dbReady) {
      console.warn('Skipping Messaging Socket E2E: PostgreSQL not available');
      return;
    }

    app = await createTestApp();
    await app.listen(0);
    const address = app.getHttpServer().address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;

    await resetDatabase(prisma);
    await seedTestReferenceData(prisma);
    const refs = await getReferenceIds(prisma);
    categoryId = refs.category.id;
    skillId = refs.skill.id;
  });

  afterAll(async () => {
    if (app) await app.close();
    await prisma.$disconnect();
  });

  it('rejects unauthenticated socket connection', async (ctx) => {
    if (!dbReady) ctx.skip();

    await expectUnauthenticatedSocketRejected(baseUrl);
  });

  it('authenticated member can join conversation room', async (ctx) => {
    if (!dbReady) ctx.skip();

    const client = await registerUser(app, 'CLIENT', 'sock-1');
    const freelancer = await registerUser(app, 'FREELANCER', 'sock-1-fl');
    const project = await publishProject(
      app,
      client.accessToken,
      categoryId,
      skillId,
    );

    const proposal = await authAgent(app)
      .post(`/api/projects/${project.id}/proposals`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${freelancer.accessToken}`)
      .send(proposalBody)
      .expect(201);

    const conv = await authAgent(app)
      .post(`/api/proposals/${proposal.body.id}/conversation`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .expect(201);

    const socket = await connectSocket(baseUrl, client.accessToken);

    const joinResult = await new Promise<{ ok?: boolean; error?: string }>(
      (resolve) => {
        socket.emit(
          'conversation:join',
          { conversationId: conv.body.conversationId },
          resolve,
        );
      },
    );

    expect(joinResult.ok).toBe(true);
    socket.disconnect();
  });

  it('non-member cannot join conversation room', async (ctx) => {
    if (!dbReady) ctx.skip();

    const client = await registerUser(app, 'CLIENT', 'sock-2');
    const freelancer = await registerUser(app, 'FREELANCER', 'sock-2-fl');
    const outsider = await registerUser(app, 'FREELANCER', 'sock-2-out');
    const project = await publishProject(
      app,
      client.accessToken,
      categoryId,
      skillId,
    );

    const proposal = await authAgent(app)
      .post(`/api/projects/${project.id}/proposals`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${freelancer.accessToken}`)
      .send(proposalBody)
      .expect(201);

    const conv = await authAgent(app)
      .post(`/api/proposals/${proposal.body.id}/conversation`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .expect(201);

    const socket = await connectSocket(baseUrl, outsider.accessToken);

    const joinResult = await new Promise<{ ok?: boolean; error?: string }>(
      (resolve) => {
        socket.emit(
          'conversation:join',
          { conversationId: conv.body.conversationId },
          resolve,
        );
      },
    );

    expect(joinResult.error).toBeTruthy();
    socket.disconnect();
  });

  it('message:new is emitted only after persistence', async (ctx) => {
    if (!dbReady) ctx.skip();

    const client = await registerUser(app, 'CLIENT', 'sock-3');
    const freelancer = await registerUser(app, 'FREELANCER', 'sock-3-fl');
    const project = await publishProject(
      app,
      client.accessToken,
      categoryId,
      skillId,
    );

    const proposal = await authAgent(app)
      .post(`/api/projects/${project.id}/proposals`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${freelancer.accessToken}`)
      .send(proposalBody)
      .expect(201);

    const conv = await authAgent(app)
      .post(`/api/proposals/${proposal.body.id}/conversation`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .expect(201);

    const recipientSocket = await connectSocket(baseUrl, freelancer.accessToken);
    const senderSocket = await connectSocket(baseUrl, client.accessToken);

    await Promise.all([
      new Promise<void>((resolve) => {
        recipientSocket.emit(
          'conversation:join',
          { conversationId: conv.body.conversationId },
          () => resolve(),
        );
      }),
      new Promise<void>((resolve) => {
        senderSocket.emit(
          'conversation:join',
          { conversationId: conv.body.conversationId },
          () => resolve(),
        );
      }),
    ]);

    const received = new Promise<{ id: string; content: string }>((resolve) => {
      recipientSocket.on('message:new', (message) => resolve(message));
    });

    const sendResult = await new Promise<{
      message?: { id: string; content: string };
      error?: string;
    }>((resolve) => {
      senderSocket.emit(
        'message:send',
        {
          conversationId: conv.body.conversationId,
          content: 'رسالة socket اختبار',
        },
        resolve,
      );
    });

    expect(sendResult.message?.content).toContain('socket');

    const emitted = await received;
    expect(emitted.id).toBe(sendResult.message?.id);

    const dbMessage = await prisma.message.findUnique({
      where: { id: emitted.id },
    });
    expect(dbMessage).toBeTruthy();

    recipientSocket.disconnect();
    senderSocket.disconnect();
  });

  it('typing event non-member rejected', async (ctx) => {
    if (!dbReady) ctx.skip();

    const client = await registerUser(app, 'CLIENT', 'sock-typ-1');
    const freelancer = await registerUser(app, 'FREELANCER', 'sock-typ-1-fl');
    const outsider = await registerUser(app, 'FREELANCER', 'sock-typ-1-out');
    const project = await publishProject(
      app,
      client.accessToken,
      categoryId,
      skillId,
    );

    const proposal = await authAgent(app)
      .post(`/api/projects/${project.id}/proposals`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${freelancer.accessToken}`)
      .send(proposalBody)
      .expect(201);

    const conv = await authAgent(app)
      .post(`/api/proposals/${proposal.body.id}/conversation`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .expect(201);

    const outsiderSocket = await connectSocket(baseUrl, outsider.accessToken);

    const result = await new Promise<{ ok?: boolean; error?: string }>(
      (resolve) => {
        outsiderSocket.emit(
          'typing:start',
          { conversationId: conv.body.conversationId },
          resolve,
        );
      },
    );

    expect(result.error).toBeTruthy();
    outsiderSocket.disconnect();
  });

  it('typing event member allowed', async (ctx) => {
    if (!dbReady) ctx.skip();

    const client = await registerUser(app, 'CLIENT', 'sock-typ-2');
    const freelancer = await registerUser(app, 'FREELANCER', 'sock-typ-2-fl');
    const project = await publishProject(
      app,
      client.accessToken,
      categoryId,
      skillId,
    );

    const proposal = await authAgent(app)
      .post(`/api/projects/${project.id}/proposals`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${freelancer.accessToken}`)
      .send(proposalBody)
      .expect(201);

    const conv = await authAgent(app)
      .post(`/api/proposals/${proposal.body.id}/conversation`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .expect(201);

    const clientSocket = await connectSocket(baseUrl, client.accessToken);

    await new Promise<void>((resolve) => {
      clientSocket.emit(
        'conversation:join',
        { conversationId: conv.body.conversationId },
        () => resolve(),
      );
    });

    const result = await new Promise<{ ok?: boolean; error?: string }>(
      (resolve) => {
        clientSocket.emit(
          'typing:start',
          { conversationId: conv.body.conversationId },
          resolve,
        );
      },
    );

    expect(result.ok).toBe(true);
    clientSocket.disconnect();
  });
});
