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

const prisma = new PrismaClient();

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

const proposalBody = {
  coverLetter:
    'أنا مستقل ذو خبرة في هذا المجال وأستطيع تنفيذ المشروع وفق المتطلبات المذكورة مع التزام بالجودة والمواعيد.',
  proposedPrice: 2500,
  estimatedDurationDays: 14,
};

describe('Messaging E2E (PostgreSQL)', () => {
  let app: Awaited<ReturnType<typeof createTestApp>>;
  let dbReady = false;
  let categoryId = '';
  let skillId = '';

  beforeAll(async () => {
    dbReady = await isDatabaseAvailable();
    if (!dbReady) {
      console.warn('Skipping Messaging E2E: PostgreSQL not available');
      return;
    }

    app = await createTestApp();
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

  it('1. Client can create conversation for own proposal', async (ctx) => {
    if (!dbReady) ctx.skip();
    const client = await registerUser(app, 'CLIENT', 'msg-1');
    const freelancer = await registerUser(app, 'FREELANCER', 'msg-1-fl');
    const project = await publishProject(app, client.accessToken, categoryId, skillId);

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

    expect(conv.body.conversationId).toBeTruthy();
  });

  it('2. Other client cannot create conversation', async (ctx) => {
    if (!dbReady) ctx.skip();
    const client = await registerUser(app, 'CLIENT', 'msg-2');
    const other = await registerUser(app, 'CLIENT', 'msg-2-other');
    const freelancer = await registerUser(app, 'FREELANCER', 'msg-2-fl');
    const project = await publishProject(app, client.accessToken, categoryId, skillId);

    const proposal = await authAgent(app)
      .post(`/api/projects/${project.id}/proposals`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${freelancer.accessToken}`)
      .send(proposalBody)
      .expect(201);

    await authAgent(app)
      .post(`/api/proposals/${proposal.body.id}/conversation`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${other.accessToken}`)
      .expect(403);
  });

  it('4. Freelancer cannot initiate pending proposal chat', async (ctx) => {
    if (!dbReady) ctx.skip();
    const client = await registerUser(app, 'CLIENT', 'msg-4');
    const freelancer = await registerUser(app, 'FREELANCER', 'msg-4-fl');
    const project = await publishProject(app, client.accessToken, categoryId, skillId);

    const proposal = await authAgent(app)
      .post(`/api/projects/${project.id}/proposals`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${freelancer.accessToken}`)
      .send(proposalBody)
      .expect(201);

    await authAgent(app)
      .post(`/api/proposals/${proposal.body.id}/conversation`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${freelancer.accessToken}`)
      .expect(403);
  });

  it('5-8. Freelancer access, duplicate, send, persist', async (ctx) => {
    if (!dbReady) ctx.skip();
    const client = await registerUser(app, 'CLIENT', 'msg-5');
    const freelancer = await registerUser(app, 'FREELANCER', 'msg-5-fl');
    const project = await publishProject(app, client.accessToken, categoryId, skillId);

    const proposal = await authAgent(app)
      .post(`/api/projects/${project.id}/proposals`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${freelancer.accessToken}`)
      .send(proposalBody)
      .expect(201);

    const conv1 = await authAgent(app)
      .post(`/api/proposals/${proposal.body.id}/conversation`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .expect(201);

    const conv2 = await authAgent(app)
      .post(`/api/proposals/${proposal.body.id}/conversation`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .expect(201);

    expect(conv1.body.conversationId).toBe(conv2.body.conversationId);

    await authAgent(app)
      .get(`/api/conversations/${conv1.body.conversationId}`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${freelancer.accessToken}`)
      .expect(200);

    const sent = await authAgent(app)
      .post(`/api/conversations/${conv1.body.conversationId}/messages`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .send({ content: 'مرحباً، أود مناقشة تفاصيل المشروع' })
      .expect(201);

    const dbMessage = await prisma.message.findUnique({
      where: { id: sent.body.id },
    });
    expect(dbMessage?.content).toContain('مناقشة');
  });

  it('9-11. Non-member blocked from send/read', async (ctx) => {
    if (!dbReady) ctx.skip();
    const client = await registerUser(app, 'CLIENT', 'msg-9');
    const freelancer = await registerUser(app, 'FREELANCER', 'msg-9-fl');
    const outsider = await registerUser(app, 'FREELANCER', 'msg-9-out');
    const project = await publishProject(app, client.accessToken, categoryId, skillId);

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

    await authAgent(app)
      .post(`/api/conversations/${conv.body.conversationId}/messages`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${outsider.accessToken}`)
      .send({ content: 'محاولة اختراق' })
      .expect(403);

    await authAgent(app)
      .get(`/api/conversations/${conv.body.conversationId}`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${outsider.accessToken}`)
      .expect(403);
  });

  it('14-16. List, unread, mark read', async (ctx) => {
    if (!dbReady) ctx.skip();
    const client = await registerUser(app, 'CLIENT', 'msg-14');
    const freelancer = await registerUser(app, 'FREELANCER', 'msg-14-fl');
    const project = await publishProject(app, client.accessToken, categoryId, skillId);

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

    await authAgent(app)
      .post(`/api/conversations/${conv.body.conversationId}/messages`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .send({ content: 'رسالة اختبار للعدّاد' })
      .expect(201);

    const unread = await authAgent(app)
      .get('/api/messages/unread-count')
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${freelancer.accessToken}`)
      .expect(200);

    expect(unread.body.unreadCount).toBeGreaterThanOrEqual(1);

    await authAgent(app)
      .post(`/api/conversations/${conv.body.conversationId}/read`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${freelancer.accessToken}`)
      .expect(201);

    const list = await authAgent(app)
      .get('/api/conversations')
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${freelancer.accessToken}`)
      .expect(200);

    expect(list.body.items.length).toBeGreaterThanOrEqual(1);
  });

  it('17-19. Rejected proposal rules', async (ctx) => {
    if (!dbReady) ctx.skip();
    const client = await registerUser(app, 'CLIENT', 'msg-17');
    const freelancer = await registerUser(app, 'FREELANCER', 'msg-17-fl');
    const project = await publishProject(app, client.accessToken, categoryId, skillId);

    const proposal = await authAgent(app)
      .post(`/api/projects/${project.id}/proposals`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${freelancer.accessToken}`)
      .send(proposalBody)
      .expect(201);

    await authAgent(app)
      .post(`/api/proposals/${proposal.body.id}/reject`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .expect(201);

    await authAgent(app)
      .post(`/api/proposals/${proposal.body.id}/conversation`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .expect(403);
  });

  it('21-22. Notifications for recipient only', async (ctx) => {
    if (!dbReady) ctx.skip();
    const client = await registerUser(app, 'CLIENT', 'msg-21');
    const freelancer = await registerUser(app, 'FREELANCER', 'msg-21-fl');
    const project = await publishProject(app, client.accessToken, categoryId, skillId);

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

    await authAgent(app)
      .post(`/api/conversations/${conv.body.conversationId}/messages`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .send({ content: 'إشعار اختبار' })
      .expect(201);

    const recipientNotif = await prisma.notification.count({
      where: { userId: freelancer.userId, type: 'NEW_MESSAGE' },
    });
    const senderNotif = await prisma.notification.count({
      where: { userId: client.userId, type: 'NEW_MESSAGE' },
    });

    expect(recipientNotif).toBeGreaterThanOrEqual(1);
    expect(senderNotif).toBe(0);
  });

  it('6. Accepted freelancer can initiate/access conversation', async (ctx) => {
    if (!dbReady) ctx.skip();
    const client = await registerUser(app, 'CLIENT', 'msg-acc');
    const freelancer = await registerUser(app, 'FREELANCER', 'msg-acc-fl');
    const project = await publishProject(app, client.accessToken, categoryId, skillId);

    const proposal = await authAgent(app)
      .post(`/api/projects/${project.id}/proposals`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${freelancer.accessToken}`)
      .send(proposalBody)
      .expect(201);

    await authAgent(app)
      .post(`/api/escrow/fund-and-accept/${proposal.body.id}`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .expect(201);

    const conv = await authAgent(app)
      .post(`/api/proposals/${proposal.body.id}/conversation`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${freelancer.accessToken}`)
      .expect(201);

    expect(conv.body.conversationId).toBeTruthy();
  });

  it('18. Existing rejected-proposal conversation remains readable', async (ctx) => {
    if (!dbReady) ctx.skip();
    const client = await registerUser(app, 'CLIENT', 'msg-18');
    const freelancer = await registerUser(app, 'FREELANCER', 'msg-18-fl');
    const project = await publishProject(app, client.accessToken, categoryId, skillId);

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

    await authAgent(app)
      .post(`/api/proposals/${proposal.body.id}/reject`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .expect(201);

    await authAgent(app)
      .get(`/api/conversations/${conv.body.conversationId}`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .expect(200);
  });

  it('19. Sending blocked after rejected proposal', async (ctx) => {
    if (!dbReady) ctx.skip();
    const client = await registerUser(app, 'CLIENT', 'msg-19');
    const freelancer = await registerUser(app, 'FREELANCER', 'msg-19-fl');
    const project = await publishProject(app, client.accessToken, categoryId, skillId);

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

    await authAgent(app)
      .post(`/api/proposals/${proposal.body.id}/reject`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .expect(201);

    await authAgent(app)
      .post(`/api/conversations/${conv.body.conversationId}/messages`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .send({ content: 'محاولة إرسال بعد الرفض' })
      .expect(403);
  });

  it('20. Cancelled project conversation readable but sending blocked', async (ctx) => {
    if (!dbReady) ctx.skip();
    const client = await registerUser(app, 'CLIENT', 'msg-20');
    const freelancer = await registerUser(app, 'FREELANCER', 'msg-20-fl');
    const project = await publishProject(app, client.accessToken, categoryId, skillId);

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

    await authAgent(app)
      .post(`/api/projects/${project.id}/cancel`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .expect(201);

    await authAgent(app)
      .get(`/api/conversations/${conv.body.conversationId}`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .expect(200);

    await authAgent(app)
      .post(`/api/conversations/${conv.body.conversationId}/messages`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .send({ content: 'محاولة بعد الإلغاء' })
      .expect(403);
  });

  it('withdrawn proposal prevents new conversation', async (ctx) => {
    if (!dbReady) ctx.skip();
    const client = await registerUser(app, 'CLIENT', 'msg-wd');
    const freelancer = await registerUser(app, 'FREELANCER', 'msg-wd-fl');
    const project = await publishProject(app, client.accessToken, categoryId, skillId);

    const proposal = await authAgent(app)
      .post(`/api/projects/${project.id}/proposals`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${freelancer.accessToken}`)
      .send(proposalBody)
      .expect(201);

    await authAgent(app)
      .post(`/api/proposals/${proposal.body.id}/withdraw`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${freelancer.accessToken}`)
      .expect(201);

    await authAgent(app)
      .post(`/api/proposals/${proposal.body.id}/conversation`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .expect(403);
  });
});
