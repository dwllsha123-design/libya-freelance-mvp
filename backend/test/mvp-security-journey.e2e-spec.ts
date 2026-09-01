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
  createInProgressProject,
  createOpenProject,
  getReferenceIds,
  registerAdmin,
  registerUser,
  seedTestReferenceData,
  validProposalBody,
} from './helpers/project-e2e.helpers.js';

const prisma = new PrismaClient();

describe('MVP security journey E2E (PostgreSQL)', () => {
  let app: Awaited<ReturnType<typeof createTestApp>>;
  let dbReady = false;
  let categoryId = '';
  let skillId = '';

  beforeAll(async () => {
    dbReady = await isDatabaseAvailable();
    if (!dbReady) return;

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

  it('rejects duplicate proposal from same freelancer', async (ctx) => {
    if (!dbReady) ctx.skip();

    const client = await registerUser(app, 'CLIENT', 'sec-dup');
    const freelancer = await registerUser(app, 'FREELANCER', 'sec-dup-fl');
    const open = await createOpenProject(app, client.accessToken, categoryId, skillId);

    await authAgent(app)
      .post(`/api/projects/${open.id}/proposals`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${freelancer.accessToken}`)
      .send(validProposalBody)
      .expect(201);

    await authAgent(app)
      .post(`/api/projects/${open.id}/proposals`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${freelancer.accessToken}`)
      .send(validProposalBody)
      .expect(409);
  });

  it('foreign client cannot accept proposal', async (ctx) => {
    if (!dbReady) ctx.skip();

    const owner = await registerUser(app, 'CLIENT', 'sec-owner');
    const outsider = await registerUser(app, 'CLIENT', 'sec-outsider');
    const freelancer = await registerUser(app, 'FREELANCER', 'sec-fl');
    const open = await createOpenProject(app, owner.accessToken, categoryId, skillId);

    const proposal = await authAgent(app)
      .post(`/api/projects/${open.id}/proposals`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${freelancer.accessToken}`)
      .send(validProposalBody)
      .expect(201);

    await authAgent(app)
      .post(`/api/proposals/${proposal.body.id}/accept`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${outsider.accessToken}`)
      .expect(403);
  });

  it('foreign user cannot read private conversation', async (ctx) => {
    if (!dbReady) ctx.skip();

    const client = await registerUser(app, 'CLIENT', 'sec-conv-c');
    const freelancer = await registerUser(app, 'FREELANCER', 'sec-conv-f');
    const outsider = await registerUser(app, 'FREELANCER', 'sec-conv-o');
    const open = await createOpenProject(app, client.accessToken, categoryId, skillId);

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
      .get(`/api/conversations/${conv.body.conversationId}`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${outsider.accessToken}`)
      .expect(403);
  });

  it('freelancer cannot complete project without client', async (ctx) => {
    if (!dbReady) ctx.skip();

    const client = await registerUser(app, 'CLIENT', 'sec-complete-c');
    const freelancer = await registerUser(app, 'FREELANCER', 'sec-complete-f');
    const { project } = await createInProgressProject(
      app,
      client.accessToken,
      freelancer.accessToken,
      categoryId,
      skillId,
    );

    await authAgent(app)
      .post(`/api/projects/${project.id}/complete`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${freelancer.accessToken}`)
      .expect(403);
  });

  it('unrelated user cannot submit review', async (ctx) => {
    if (!dbReady) ctx.skip();

    const client = await registerUser(app, 'CLIENT', 'sec-rev-c');
    const freelancer = await registerUser(app, 'FREELANCER', 'sec-rev-f');
    const outsider = await registerUser(app, 'FREELANCER', 'sec-rev-o');
    const { project } = await createInProgressProject(
      app,
      client.accessToken,
      freelancer.accessToken,
      categoryId,
      skillId,
    );

    await authAgent(app)
      .post(`/api/projects/${project.id}/complete`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .expect(201);

    await authAgent(app)
      .post(`/api/projects/${project.id}/review`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${outsider.accessToken}`)
      .send({
        rating: 5,
        comment: 'محاولة تقييم غير مصرح بها من مستخدم خارج المشروع',
      })
      .expect(403);
  });

  it('draft project is not publicly listed', async (ctx) => {
    if (!dbReady) ctx.skip();

    const client = await registerUser(app, 'CLIENT', 'sec-draft');
    const created = await authAgent(app)
      .post('/api/projects')
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .send({
        title: 'مشروع مسودة سري',
        description:
          'وصف اختباري مفصل للمشروع يتضمن المتطلبات الأساسية والنطاق المتوقع للعمل والتسليمات المطلوبة.',
        categoryId,
        skillIds: [skillId],
        budgetType: 'FIXED',
        budgetMin: 500,
        budgetMax: 1500,
        experienceLevel: 'INTERMEDIATE',
        workMode: 'REMOTE',
      })
      .expect(201);

    const publicList = await authAgent(app)
      .get('/api/projects')
      .set(CLIENT_HEADER)
      .expect(200);

    expect(
      publicList.body.items.some((p: { id: string }) => p.id === created.body.id),
    ).toBe(false);
  });

  it('hidden review excluded from public rating', async (ctx) => {
    if (!dbReady) ctx.skip();

    const admin = await registerAdmin(prisma, app, 'sec-hide');
    const client = await registerUser(app, 'CLIENT', 'sec-hide-c');
    const freelancer = await registerUser(app, 'FREELANCER', 'sec-hide-f');
    const { project } = await createInProgressProject(
      app,
      client.accessToken,
      freelancer.accessToken,
      categoryId,
      skillId,
    );

    await authAgent(app)
      .post(`/api/projects/${project.id}/complete`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .expect(201);

    await authAgent(app)
      .post(`/api/projects/${project.id}/review`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .send({
        rating: 5,
        comment: 'تقييم سيتم إخفاؤه لاحقاً من قبل الإدارة لأغراض الاختبار',
      })
      .expect(201);

    const review = await prisma.review.findFirst({ where: { projectId: project.id } });

    await authAgent(app)
      .post(`/api/admin/reviews/${review!.id}/hide`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(201);

    const flProfile = await prisma.freelancerProfile.findFirst({
      where: { profile: { userId: freelancer.userId } },
    });
    expect(flProfile?.averageRating).toBe(0);
  });

  it('foreign notification is inaccessible', async (ctx) => {
    if (!dbReady) ctx.skip();

    const client = await registerUser(app, 'CLIENT', 'sec-notif-c');
    const outsider = await registerUser(app, 'FREELANCER', 'sec-notif-o');

    const notif = await prisma.notification.create({
      data: {
        userId: client.userId,
        type: 'NEW_PROPOSAL',
        title: 'إشعار خاص',
        message: 'رسالة خاصة للعميل فقط',
      },
    });

    await authAgent(app)
      .post(`/api/notifications/${notif.id}/read`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${outsider.accessToken}`)
      .expect(404);
  });
});
