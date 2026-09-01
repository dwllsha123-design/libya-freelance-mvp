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
  registerUser,
  seedTestReferenceData,
  validProposalBody,
} from './helpers/project-e2e.helpers.js';

const prisma = new PrismaClient();

async function completeProject(
  app: Awaited<ReturnType<typeof createTestApp>>,
  clientToken: string,
  projectId: string,
) {
  await authAgent(app)
    .post(`/api/projects/${projectId}/complete`)
    .set(CLIENT_HEADER)
    .set('Authorization', `Bearer ${clientToken}`)
    .expect(201);
}

describe('Reviews E2E (PostgreSQL)', () => {
  let app: Awaited<ReturnType<typeof createTestApp>>;
  let dbReady = false;
  let categoryId = '';
  let skillId = '';

  beforeAll(async () => {
    dbReady = await isDatabaseAvailable();
    if (!dbReady) {
      console.warn('Skipping Reviews E2E: PostgreSQL not available');
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

  it('1-2. Client and freelancer can review after COMPLETED', async (ctx) => {
    if (!dbReady) ctx.skip();
    const client = await registerUser(app, 'CLIENT', 'rev-1');
    const freelancer = await registerUser(app, 'FREELANCER', 'rev-1-fl');
    const { project } = await createInProgressProject(
      app,
      client.accessToken,
      freelancer.accessToken,
      categoryId,
      skillId,
    );
    await completeProject(app, client.accessToken, project.id);

    await authAgent(app)
      .post(`/api/projects/${project.id}/review`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .send({ rating: 5, comment: 'عمل ممتاز واحترافية عالية في التنفيذ والتواصل' })
      .expect(201);

    await authAgent(app)
      .post(`/api/projects/${project.id}/review`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${freelancer.accessToken}`)
      .send({ rating: 4, comment: 'عميل متعاون وواضح في المتطلبات طوال المشروع' })
      .expect(201);

    const count = await prisma.review.count({ where: { projectId: project.id } });
    expect(count).toBe(2);
  });

  it('3-7. Eligibility and authorization rules', async (ctx) => {
    if (!dbReady) ctx.skip();
    const client = await registerUser(app, 'CLIENT', 'rev-3');
    const acceptedFl = await registerUser(app, 'FREELANCER', 'rev-3-fl');
    const rejectedFl = await registerUser(app, 'FREELANCER', 'rev-3-rej');
    const other = await registerUser(app, 'FREELANCER', 'rev-3-other');
    const open = await createOpenProject(
      app,
      client.accessToken,
      categoryId,
      skillId,
    );

    const pending = await authAgent(app)
      .post(`/api/projects/${open.id}/proposals`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${rejectedFl.accessToken}`)
      .send(validProposalBody)
      .expect(201);

    const acceptedProposal = await authAgent(app)
      .post(`/api/projects/${open.id}/proposals`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${acceptedFl.accessToken}`)
      .send(validProposalBody)
      .expect(201);

    await authAgent(app)
      .post(`/api/proposals/${pending.body.id}/reject`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .expect(201);

    await authAgent(app)
      .post(`/api/escrow/fund-and-accept/${acceptedProposal.body.id}`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .expect(201);

    await authAgent(app)
      .post(`/api/projects/${open.id}/review`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .send({ rating: 5 })
      .expect(400);

    await completeProject(app, client.accessToken, open.id);

    await authAgent(app)
      .post(`/api/projects/${open.id}/review`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${rejectedFl.accessToken}`)
      .send({ rating: 3 })
      .expect(403);

    await authAgent(app)
      .post(`/api/projects/${open.id}/review`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${other.accessToken}`)
      .send({ rating: 1 })
      .expect(403);
  });

  it('8-10. Rating bounds and duplicate review', async (ctx) => {
    if (!dbReady) ctx.skip();
    const client = await registerUser(app, 'CLIENT', 'rev-8');
    const freelancer = await registerUser(app, 'FREELANCER', 'rev-8-fl');
    const { project } = await createInProgressProject(
      app,
      client.accessToken,
      freelancer.accessToken,
      categoryId,
      skillId,
    );
    await completeProject(app, client.accessToken, project.id);

    await authAgent(app)
      .post(`/api/projects/${project.id}/review`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .send({ rating: 0 })
      .expect(400);

    await authAgent(app)
      .post(`/api/projects/${project.id}/review`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .send({ rating: 6 })
      .expect(400);

    await authAgent(app)
      .post(`/api/projects/${project.id}/review`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .send({ rating: 5, comment: 'تقييم أول ممتاز للمستقل في هذا المشروع' })
      .expect(201);

    await authAgent(app)
      .post(`/api/projects/${project.id}/review`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .send({ rating: 4 })
      .expect(409);
  });

  it('12-16. Public profile reviews + aggregates + privacy', async (ctx) => {
    if (!dbReady) ctx.skip();
    const client = await registerUser(app, 'CLIENT', 'rev-12');
    const freelancer = await registerUser(app, 'FREELANCER', 'rev-12-fl');
    const { project } = await createInProgressProject(
      app,
      client.accessToken,
      freelancer.accessToken,
      categoryId,
      skillId,
    );
    await completeProject(app, client.accessToken, project.id);

    await authAgent(app)
      .post(`/api/projects/${project.id}/review`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .send({ rating: 5, comment: 'أداء ممتاز وتسليم في الوقت المحدد للمشروع' })
      .expect(201);

    const flProfile = await prisma.profile.findFirst({
      where: { user: { email: freelancer.email } },
    });

    const publicProfile = await authAgent(app)
      .get(`/api/freelancers/${flProfile!.username}`)
      .set(CLIENT_HEADER)
      .expect(200);

    expect(publicProfile.body.reviews.reviewCount).toBeGreaterThanOrEqual(1);
    expect(publicProfile.body.reviews.ratingAverage).toBeGreaterThanOrEqual(4);
    expect(publicProfile.body.email).toBeUndefined();

    const list = await authAgent(app)
      .get(`/api/freelancers/${flProfile!.username}/reviews`)
      .set(CLIENT_HEADER)
      .expect(200);

    expect(list.body.items.length).toBeGreaterThanOrEqual(1);
    expect(list.body.items[0].reviewer.displayName).toBeTruthy();
    expect(list.body.items[0].reviewer.email).toBeUndefined();
  });

  it('17-18. NEW_REVIEW notification for recipient only', async (ctx) => {
    if (!dbReady) ctx.skip();
    const client = await registerUser(app, 'CLIENT', 'rev-17');
    const freelancer = await registerUser(app, 'FREELANCER', 'rev-17-fl');
    const { project } = await createInProgressProject(
      app,
      client.accessToken,
      freelancer.accessToken,
      categoryId,
      skillId,
    );
    await completeProject(app, client.accessToken, project.id);

    await authAgent(app)
      .post(`/api/projects/${project.id}/review`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .send({ rating: 5, comment: 'تجربة رائعة مع مستقل محترف في التنفيذ' })
      .expect(201);

    const recipient = await prisma.notification.count({
      where: { userId: freelancer.userId, type: 'NEW_REVIEW' },
    });
    const reviewer = await prisma.notification.count({
      where: { userId: client.userId, type: 'NEW_REVIEW' },
    });
    expect(recipient).toBeGreaterThanOrEqual(1);
    expect(reviewer).toBe(0);
  });

  it('19. Concurrent duplicate review creates exactly one row', async (ctx) => {
    if (!dbReady) ctx.skip();
    const client = await registerUser(app, 'CLIENT', 'rev-19');
    const freelancer = await registerUser(app, 'FREELANCER', 'rev-19-fl');
    const { project } = await createInProgressProject(
      app,
      client.accessToken,
      freelancer.accessToken,
      categoryId,
      skillId,
    );
    await completeProject(app, client.accessToken, project.id);

    const payload = {
      rating: 5,
      comment: 'تقييم متزامن للتحقق من عدم التكرار في قاعدة البيانات',
    };

    const [first, second] = await Promise.all([
      authAgent(app)
        .post(`/api/projects/${project.id}/review`)
        .set(CLIENT_HEADER)
        .set('Authorization', `Bearer ${client.accessToken}`)
        .send(payload),
      authAgent(app)
        .post(`/api/projects/${project.id}/review`)
        .set(CLIENT_HEADER)
        .set('Authorization', `Bearer ${client.accessToken}`)
        .send(payload),
    ]);

    const statuses = [first.status, second.status].sort();
    expect(statuses).toEqual([201, 409]);

    const count = await prisma.review.count({
      where: { projectId: project.id, reviewerId: client.userId },
    });
    expect(count).toBe(1);
  });
});
