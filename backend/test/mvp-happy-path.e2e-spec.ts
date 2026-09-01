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
  createOpenProject,
  getReferenceIds,
  registerUser,
  seedTestReferenceData,
  validProposalBody,
} from './helpers/project-e2e.helpers.js';

const prisma = new PrismaClient();

describe('MVP happy path E2E (PostgreSQL)', () => {
  let app: Awaited<ReturnType<typeof createTestApp>>;
  let dbReady = false;
  let categoryId = '';
  let skillId = '';

  beforeAll(async () => {
    dbReady = await isDatabaseAvailable();
    if (!dbReady) {
      console.warn('Skipping MVP happy path E2E: PostgreSQL not available');
      return;
    }

    app = await createTestApp({ testStorage: true });
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

  it('full marketplace lifecycle from registration to mutual reviews', async (ctx) => {
    if (!dbReady) ctx.skip();

    const client = await registerUser(app, 'CLIENT', 'mvp-client');
    const freelancer = await registerUser(app, 'FREELANCER', 'mvp-fl');

    await authAgent(app)
      .patch('/api/profiles/me')
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .send({ bio: 'عميل يبحث عن مستقلين محترفين في ليبيا' })
      .expect(200);

    await authAgent(app)
      .patch('/api/profiles/me')
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${freelancer.accessToken}`)
      .send({
        bio: 'مستقل متخصص في تطوير الويب',
        professionalTitle: 'مطور ويب',
      })
      .expect(200);

    await authAgent(app)
      .post('/api/profiles/me/skills')
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${freelancer.accessToken}`)
      .send({ skillId })
      .expect(201);

    await authAgent(app)
      .post('/api/portfolio')
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${freelancer.accessToken}`)
      .send({
        title: 'متجر إلكتروني',
        description:
          'مشروع متكامل لتطوير متجر إلكتروني باستخدام React وNestJS مع لوحة تحكم وإدارة طلبات.',
        projectUrl: 'https://example.com/portfolio',
        skillIds: [skillId],
      })
      .expect(201);

    const open = await createOpenProject(
      app,
      client.accessToken,
      categoryId,
      skillId,
    );

    const publicList = await authAgent(app)
      .get('/api/projects')
      .set(CLIENT_HEADER)
      .expect(200);
    expect(publicList.body.items.some((p: { id: string }) => p.id === open.id)).toBe(
      true,
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
      .send({ content: 'مرحباً، أود مناقشة تفاصيل المشروع قبل القبول' })
      .expect(201);

    await authAgent(app)
      .post(`/api/proposals/${proposal.body.id}/accept`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .expect(201);

    const inProgress = await prisma.project.findUnique({ where: { id: open.id } });
    expect(inProgress?.status).toBe('IN_PROGRESS');
    expect(inProgress?.acceptedProposalId).toBe(proposal.body.id);

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
      .send({
        rating: 5,
        comment: 'عمل ممتاز واحترافية عالية في التنفيذ والتواصل مع الفريق',
      })
      .expect(201);

    await authAgent(app)
      .post(`/api/projects/${open.id}/review`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${freelancer.accessToken}`)
      .send({
        rating: 4,
        comment: 'عميل متعاون وواضح في المتطلبات وسهل التواصل معه طوال المشروع',
      })
      .expect(201);

    const flProfile = await prisma.freelancerProfile.findFirst({
      where: { profile: { userId: freelancer.userId } },
    });
    expect(flProfile?.averageRating).toBeGreaterThan(0);

    const notifications = await authAgent(app)
      .get('/api/notifications')
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .expect(200);

    expect(notifications.body.items.length).toBeGreaterThan(0);
  });
});
