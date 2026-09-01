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
} from './helpers/project-e2e.helpers.js';

const prisma = new PrismaClient();

describe('Admin E2E (PostgreSQL)', () => {
  let app: Awaited<ReturnType<typeof createTestApp>>;
  let dbReady = false;
  let categoryId = '';
  let skillId = '';

  beforeAll(async () => {
    dbReady = await isDatabaseAvailable();
    if (!dbReady) {
      console.warn('Skipping Admin E2E: PostgreSQL not available');
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

  it('I38. Authorization — admin access vs client/freelancer/anonymous', async (ctx) => {
    if (!dbReady) ctx.skip();
    const admin = await registerAdmin(prisma, app, 'auth');
    const client = await registerUser(app, 'CLIENT', 'auth-c');
    const freelancer = await registerUser(app, 'FREELANCER', 'auth-f');

    await authAgent(app)
      .get('/api/admin/dashboard')
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);

    await authAgent(app)
      .get('/api/admin/dashboard')
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .expect(403);

    await authAgent(app)
      .get('/api/admin/dashboard')
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${freelancer.accessToken}`)
      .expect(403);

    await authAgent(app)
      .get('/api/admin/dashboard')
      .set(CLIENT_HEADER)
      .expect(401);
  });

  it('I38. Suspended admin cannot access admin endpoints', async (ctx) => {
    if (!dbReady) ctx.skip();
    const admin = await registerAdmin(prisma, app, 'suspended-admin');

    await prisma.user.update({
      where: { id: admin.userId },
      data: { status: 'SUSPENDED' },
    });

    await authAgent(app)
      .get('/api/admin/dashboard')
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(401);
  });

  it('I38-39. User management, sessions, audit', async (ctx) => {
    if (!dbReady) ctx.skip();
    const admin = await registerAdmin(prisma, app, 'users');
    const client = await registerUser(app, 'CLIENT', 'users-c');

    const list = await authAgent(app)
      .get('/api/admin/users')
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);

    expect(list.body.total).toBeGreaterThanOrEqual(1);

    await authAgent(app)
      .post(`/api/admin/users/${admin.userId}/suspend`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(403);

    await authAgent(app)
      .post(`/api/admin/users/${client.userId}/suspend`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(201);

    await authAgent(app)
      .post('/api/auth/login')
      .set(CLIENT_HEADER)
      .send({ email: client.email, password: 'Password1' })
      .expect(401);

    const tokens = await prisma.refreshToken.count({ where: { userId: client.userId } });
    expect(tokens).toBe(0);

    await authAgent(app)
      .post(`/api/admin/users/${client.userId}/reactivate`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(201);

    await authAgent(app)
      .post('/api/auth/login')
      .set(CLIENT_HEADER)
      .send({ email: client.email, password: 'Password1' })
      .expect(200);

    const audit = await prisma.adminAuditLog.count({
      where: { adminId: admin.userId },
    });
    expect(audit).toBeGreaterThanOrEqual(2);

    const freelancer = await registerUser(app, 'FREELANCER', 'users-f');
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
  });

  it('I40. Project moderation', async (ctx) => {
    if (!dbReady) ctx.skip();
    const admin = await registerAdmin(prisma, app, 'proj');
    const client = await registerUser(app, 'CLIENT', 'proj-c');
    const freelancer = await registerUser(app, 'FREELANCER', 'proj-f');
    const open = await createOpenProject(app, client.accessToken, categoryId, skillId);

    await authAgent(app)
      .post(`/api/admin/projects/${open.id}/close`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(201);

    const closed = await prisma.project.findUnique({ where: { id: open.id } });
    expect(closed?.status).toBe('CLOSED');

    const publicList = await authAgent(app)
      .get('/api/projects')
      .set(CLIENT_HEADER)
      .expect(200);

    expect(
      publicList.body.items?.some((p: { id: string }) => p.id === open.id) ?? false,
    ).toBe(false);

    const closeAudit = await prisma.adminAuditLog.count({
      where: { adminId: admin.userId, action: 'PROJECT_CLOSED' },
    });
    expect(closeAudit).toBeGreaterThanOrEqual(1);

    const { project } = await createInProgressProject(
      app,
      client.accessToken,
      freelancer.accessToken,
      categoryId,
      skillId,
    );

    await authAgent(app)
      .post(`/api/admin/projects/${project.id}/close`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(400);
  });

  it('I41. Review moderation + rating cache', async (ctx) => {
    if (!dbReady) ctx.skip();
    const admin = await registerAdmin(prisma, app, 'rev');
    const client = await registerUser(app, 'CLIENT', 'rev-c');
    const freelancer = await registerUser(app, 'FREELANCER', 'rev-f');
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
      .send({ rating: 5, comment: 'عمل ممتاز واحترافية عالية في التنفيذ والتواصل' })
      .expect(201);

    const review = await prisma.review.findFirst({ where: { projectId: project.id } });
    expect(review?.isVisible).toBe(true);

    const flProfile = await prisma.profile.findFirst({
      where: { user: { email: freelancer.email } },
      include: { freelancerProfile: true },
    });
    expect(flProfile?.freelancerProfile?.averageRating).toBeGreaterThan(0);

    await authAgent(app)
      .post(`/api/admin/reviews/${review!.id}/hide`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(201);

    const hidden = await prisma.review.findUnique({ where: { id: review!.id } });
    expect(hidden?.isVisible).toBe(false);

    const flAfterHide = await prisma.freelancerProfile.findUnique({
      where: { id: flProfile!.freelancerProfile!.id },
    });
    expect(flAfterHide?.averageRating).toBe(0);

    await authAgent(app)
      .post(`/api/admin/reviews/${review!.id}/restore`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(201);

    await authAgent(app)
      .post(`/api/admin/reviews/${review!.id}/hide`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .expect(403);
  });

  it('I42. Category and skill activation', async (ctx) => {
    if (!dbReady) ctx.skip();
    const admin = await registerAdmin(prisma, app, 'cat');

    const category = await authAgent(app)
      .post('/api/admin/categories')
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({
        nameAr: 'تصنيف اختباري إداري',
        slug: `admin-test-cat-${Date.now()}`,
      })
      .expect(201);

    await authAgent(app)
      .post(`/api/admin/categories/${category.body.id}/deactivate`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(201);

    const publicCategories = await authAgent(app)
      .get('/api/categories')
      .set(CLIENT_HEADER)
      .expect(200);

    expect(
      publicCategories.body.some((c: { id: string }) => c.id === category.body.id),
    ).toBe(false);

    const skill = await authAgent(app)
      .post('/api/admin/skills')
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ name: 'مهارة إدارية', slug: `admin-skill-${Date.now()}` })
      .expect(201);

    await authAgent(app)
      .post(`/api/admin/skills/${skill.body.id}/deactivate`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(201);

    const publicSkills = await authAgent(app)
      .get('/api/skills')
      .set(CLIENT_HEADER)
      .expect(200);

    expect(publicSkills.body.some((s: { id: string }) => s.id === skill.body.id)).toBe(false);
  });

  it('I43. Audit log has no secrets', async (ctx) => {
    if (!dbReady) ctx.skip();
    const admin = await registerAdmin(prisma, app, 'audit');
    const logs = await prisma.adminAuditLog.findMany({ where: { adminId: admin.userId } });
    for (const log of logs) {
      const serialized = JSON.stringify(log.metadata ?? {});
      expect(serialized).not.toMatch(/passwordHash|refreshToken|tokenHash/i);
    }
  });
});
