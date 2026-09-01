import { NotificationType, PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  CLIENT_HEADER,
  authAgent,
  createTestApp,
  isDatabaseAvailable,
  resetDatabase,
} from './helpers/e2e-setup.js';
import { isValidInternalTargetUrl } from '../src/notifications/notification-url.util.js';
import {
  createOpenProject,
  getReferenceIds,
  registerUser,
  seedTestReferenceData,
  validProposalBody,
} from './helpers/project-e2e.helpers.js';

const prisma = new PrismaClient();

describe('Notifications E2E (PostgreSQL)', () => {
  let app: Awaited<ReturnType<typeof createTestApp>>;
  let dbReady = false;
  let categoryId = '';
  let skillId = '';

  beforeAll(async () => {
    dbReady = await isDatabaseAvailable();
    if (!dbReady) {
      console.warn('Skipping Notifications E2E: PostgreSQL not available');
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

  it('1-2. User lists only own notifications; others not visible', async (ctx) => {
    if (!dbReady) ctx.skip();
    const client = await registerUser(app, 'CLIENT', 'notif-1');
    const freelancer = await registerUser(app, 'FREELANCER', 'notif-1-fl');
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

    const clientList = await authAgent(app)
      .get('/api/notifications')
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .expect(200);

    const freelancerList = await authAgent(app)
      .get('/api/notifications')
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${freelancer.accessToken}`)
      .expect(200);

    expect(clientList.body.items.length).toBeGreaterThanOrEqual(1);
    expect(clientList.body.items.every((n: { type: string }) => n.type === 'NEW_PROPOSAL')).toBe(true);
    expect(freelancerList.body.items.length).toBe(0);
  });

  it('3-5. Pagination, unread filter, unread count', async (ctx) => {
    if (!dbReady) ctx.skip();
    const client = await registerUser(app, 'CLIENT', 'notif-3');
    const freelancer = await registerUser(app, 'FREELANCER', 'notif-3-fl');
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

    const page1 = await authAgent(app)
      .get('/api/notifications?page=1&limit=1')
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .expect(200);

    expect(page1.body.items).toHaveLength(1);
    expect(page1.body.total).toBeGreaterThanOrEqual(1);
    expect(page1.body.unreadCount).toBeGreaterThanOrEqual(1);

    const unreadOnly = await authAgent(app)
      .get('/api/notifications?status=unread')
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .expect(200);

    expect(unreadOnly.body.items.every((n: { isRead: boolean }) => !n.isRead)).toBe(true);

    const countRes = await authAgent(app)
      .get('/api/notifications/unread-count')
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .expect(200);

    expect(countRes.body.count).toBeGreaterThanOrEqual(1);
  });

  it('6-9. Mark read, ownership, idempotency, mark all', async (ctx) => {
    if (!dbReady) ctx.skip();
    const client = await registerUser(app, 'CLIENT', 'notif-6');
    const other = await registerUser(app, 'CLIENT', 'notif-6-other');
    const freelancer = await registerUser(app, 'FREELANCER', 'notif-6-fl');
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

    const list = await authAgent(app)
      .get('/api/notifications')
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .expect(200);

    const notificationId = list.body.items[0].id as string;

    await authAgent(app)
      .post(`/api/notifications/${notificationId}/read`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${other.accessToken}`)
      .expect(404);

    const marked = await authAgent(app)
      .post(`/api/notifications/${notificationId}/read`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .expect(201);

    expect(marked.body.isRead).toBe(true);

    const again = await authAgent(app)
      .post(`/api/notifications/${notificationId}/read`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .expect(201);

    expect(again.body.isRead).toBe(true);

    const open2 = await createOpenProject(
      app,
      client.accessToken,
      categoryId,
      skillId,
    );

    await authAgent(app)
      .post(`/api/projects/${open2.id}/proposals`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${freelancer.accessToken}`)
      .send(validProposalBody)
      .expect(201);

    const markAll = await authAgent(app)
      .post('/api/notifications/read-all')
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .expect(201);

    expect(markAll.body.affected).toBeGreaterThanOrEqual(1);

    const afterAll = await authAgent(app)
      .get('/api/notifications/unread-count')
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .expect(200);

    expect(afterAll.body.count).toBe(0);
  });

  it('10-16. Business event notifications are created', async (ctx) => {
    if (!dbReady) ctx.skip();
    const client = await registerUser(app, 'CLIENT', 'notif-10');
    const freelancer = await registerUser(app, 'FREELANCER', 'notif-10-fl');
    const open = await createOpenProject(
      app,
      client.accessToken,
      categoryId,
      skillId,
    );

    const proposal = await authAgent(app)
      .post(`/api/projects/${open.id}/proposals`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${freelancer.accessToken}`)
      .send(validProposalBody)
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
      .send({ content: 'مرحباً، لدي بعض الأسئلة حول المشروع' })
      .expect(201);

    await authAgent(app)
      .post(`/api/conversations/${conv.body.conversationId}/messages`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .send({ content: 'هل يمكن توضيح المزيد من التفاصيل؟' })
      .expect(201);

    await authAgent(app)
      .post(`/api/escrow/fund-and-accept/${proposal.body.id}`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .expect(201);

    await authAgent(app)
      .post(`/api/projects/${open.id}/request-completion`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${freelancer.accessToken}`)
      .expect(201);

    await authAgent(app)
      .post(`/api/projects/${open.id}/complete`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .expect(201);

    await authAgent(app)
      .post(`/api/projects/${open.id}/review`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .send({ rating: 5, comment: 'عمل ممتاز واحترافية عالية في التنفيذ والتواصل' })
      .expect(201);

    const clientTypes = await prisma.notification.findMany({
      where: { userId: client.userId },
      select: { type: true },
    });
    const freelancerTypes = await prisma.notification.findMany({
      where: { userId: freelancer.userId },
      select: { type: true },
    });

    expect(clientTypes.map((n) => n.type)).toContain(NotificationType.NEW_PROPOSAL);
    expect(freelancerTypes.map((n) => n.type)).toContain(NotificationType.NEW_MESSAGE);
    expect(freelancerTypes.map((n) => n.type)).toContain(NotificationType.PROPOSAL_ACCEPTED);
    expect(clientTypes.map((n) => n.type)).toContain(NotificationType.PROJECT_COMPLETION_REQUESTED);
    expect(freelancerTypes.map((n) => n.type)).toContain(NotificationType.PROJECT_COMPLETED);
    expect(freelancerTypes.map((n) => n.type)).toContain(NotificationType.NEW_REVIEW);

    const messageNotifs = await prisma.notification.count({
      where: {
        userId: freelancer.userId,
        type: NotificationType.NEW_MESSAGE,
        targetUrl: `/messages/${conv.body.conversationId}`,
      },
    });
    expect(messageNotifs).toBe(1);
  });

  it('12. PROPOSAL_REJECTED notification appears', async (ctx) => {
    if (!dbReady) ctx.skip();
    const client = await registerUser(app, 'CLIENT', 'notif-12');
    const freelancer = await registerUser(app, 'FREELANCER', 'notif-12-fl');
    const open = await createOpenProject(
      app,
      client.accessToken,
      categoryId,
      skillId,
    );

    const proposal = await authAgent(app)
      .post(`/api/projects/${open.id}/proposals`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${freelancer.accessToken}`)
      .send(validProposalBody)
      .expect(201);

    await authAgent(app)
      .post(`/api/proposals/${proposal.body.id}/reject`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .expect(201);

    const count = await prisma.notification.count({
      where: {
        userId: freelancer.userId,
        type: NotificationType.PROPOSAL_REJECTED,
      },
    });
    expect(count).toBeGreaterThanOrEqual(1);
  });

  it('17. Notification target URLs are valid internal paths', async (ctx) => {
    if (!dbReady) ctx.skip();
    const notifications = await prisma.notification.findMany({
      select: { targetUrl: true },
      take: 50,
    });

    for (const notification of notifications) {
      if (notification.targetUrl) {
        expect(isValidInternalTargetUrl(notification.targetUrl)).toBe(true);
      }
    }
  });
});
