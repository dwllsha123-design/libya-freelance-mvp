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
} from './helpers/project-e2e.helpers.js';

const prisma = new PrismaClient();

const validPortfolioPayload = (skillId: string) => ({
  title: 'تطبيق ويب للتجارة الإلكترونية',
  description:
    'مشروع متكامل لتطوير متجر إلكتروني باستخدام React وNestJS مع لوحة تحكم وإدارة طلبات وتكامل دفع محلي.',
  projectUrl: 'https://example.com/project',
  skillIds: [skillId],
});

describe('Portfolio E2E (PostgreSQL)', () => {
  let app: Awaited<ReturnType<typeof createTestApp>>;
  let dbReady = false;
  let skillId = '';

  beforeAll(async () => {
    dbReady = await isDatabaseAvailable();
    if (!dbReady) {
      console.warn('Skipping Portfolio E2E: PostgreSQL not available');
      return;
    }

    app = await createTestApp();
    await resetDatabase(prisma);
    await seedTestReferenceData(prisma);
    const refs = await getReferenceIds(prisma);
    skillId = refs.skill.id;
  });

  afterAll(async () => {
    if (app) await app.close();
    await prisma.$disconnect();
  });

  it('1. FREELANCER creates portfolio item', async (ctx) => {
    if (!dbReady) ctx.skip();
    const freelancer = await registerUser(app, 'FREELANCER', 'pf-1');

    const res = await authAgent(app)
      .post('/api/portfolio')
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${freelancer.accessToken}`)
      .send(validPortfolioPayload(skillId))
      .expect(201);

    expect(res.body.id).toBeTruthy();
    expect(res.body.title).toContain('تطبيق');
  });

  it('2. CLIENT cannot create portfolio item', async (ctx) => {
    if (!dbReady) ctx.skip();
    const client = await registerUser(app, 'CLIENT', 'pf-2');

    await authAgent(app)
      .post('/api/portfolio')
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .send(validPortfolioPayload(skillId))
      .expect(403);
  });

  it('3. anonymous cannot create', async (ctx) => {
    if (!dbReady) ctx.skip();

    await authAgent(app)
      .post('/api/portfolio')
      .set(CLIENT_HEADER)
      .send(validPortfolioPayload(skillId))
      .expect(401);
  });

  it('4-7. owner edit/delete and other freelancer blocked', async (ctx) => {
    if (!dbReady) ctx.skip();
    const owner = await registerUser(app, 'FREELANCER', 'pf-4');
    const other = await registerUser(app, 'FREELANCER', 'pf-4-other');

    const created = await authAgent(app)
      .post('/api/portfolio')
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send(validPortfolioPayload(skillId))
      .expect(201);

    await authAgent(app)
      .patch(`/api/portfolio/${created.body.id}`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ title: 'عنوان محدّث للعمل' })
      .expect(200);

    await authAgent(app)
      .patch(`/api/portfolio/${created.body.id}`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${other.accessToken}`)
      .send({ title: 'محاولة اختراق' })
      .expect(403);

    await authAgent(app)
      .delete(`/api/portfolio/${created.body.id}`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${other.accessToken}`)
      .expect(403);

    await authAgent(app)
      .delete(`/api/portfolio/${created.body.id}`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .expect(200);
  });

  it('8-9. invalid skill and URL rejected', async (ctx) => {
    if (!dbReady) ctx.skip();
    const freelancer = await registerUser(app, 'FREELANCER', 'pf-8');

    await authAgent(app)
      .post('/api/portfolio')
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${freelancer.accessToken}`)
      .send({
        ...validPortfolioPayload(skillId),
        skillIds: ['00000000-0000-4000-8000-000000000099'],
      })
      .expect(404);

    await authAgent(app)
      .post('/api/portfolio')
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${freelancer.accessToken}`)
      .send({
        ...validPortfolioPayload(skillId),
        projectUrl: 'javascript:alert(1)',
      })
      .expect(400);
  });

  it('10-11. public can view portfolio without private data leak', async (ctx) => {
    if (!dbReady) ctx.skip();
    const freelancer = await registerUser(app, 'FREELANCER', 'pf-10');

    await authAgent(app)
      .post('/api/portfolio')
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${freelancer.accessToken}`)
      .send(validPortfolioPayload(skillId))
      .expect(201);

    const profile = await prisma.profile.findFirst({
      where: { user: { email: freelancer.email } },
    });

    const publicProfile = await authAgent(app)
      .get(`/api/freelancers/${profile!.username}`)
      .set(CLIENT_HEADER)
      .expect(200);

    expect(publicProfile.body.portfolio.count).toBeGreaterThanOrEqual(1);
    expect(publicProfile.body.email).toBeUndefined();
  });

  it('15-16. reorder works and cannot reorder another freelancer item', async (ctx) => {
    if (!dbReady) ctx.skip();
    const owner = await registerUser(app, 'FREELANCER', 'pf-15');
    const other = await registerUser(app, 'FREELANCER', 'pf-15-other');

    const first = await authAgent(app)
      .post('/api/portfolio')
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send(validPortfolioPayload(skillId))
      .expect(201);

    const second = await authAgent(app)
      .post('/api/portfolio')
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({
        ...validPortfolioPayload(skillId),
        title: 'عمل ثاني في المعرض',
      })
      .expect(201);

    const reordered = await authAgent(app)
      .patch('/api/portfolio/reorder')
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ itemIds: [second.body.id, first.body.id] })
      .expect(200);

    expect(reordered.body[0].id).toBe(second.body.id);

    await authAgent(app)
      .patch('/api/portfolio/reorder')
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${other.accessToken}`)
      .send({ itemIds: [second.body.id, first.body.id] })
      .expect(403);
  });
});
