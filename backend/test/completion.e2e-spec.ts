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

describe('Project Completion E2E (PostgreSQL)', () => {
  let app: Awaited<ReturnType<typeof createTestApp>>;
  let dbReady = false;
  let categoryId = '';
  let skillId = '';

  beforeAll(async () => {
    dbReady = await isDatabaseAvailable();
    if (!dbReady) {
      console.warn('Skipping Completion E2E: PostgreSQL not available');
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

  it('1-4. Freelancer request completion + client notification', async (ctx) => {
    if (!dbReady) ctx.skip();
    const client = await registerUser(app, 'CLIENT', 'comp-1');
    const freelancer = await registerUser(app, 'FREELANCER', 'comp-1-fl');
    const { project } = await createInProgressProject(
      app,
      client.accessToken,
      freelancer.accessToken,
      categoryId,
      skillId,
    );

    await authAgent(app)
      .post(`/api/projects/${project.id}/request-completion`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${freelancer.accessToken}`)
      .expect(201);

    const notif = await prisma.notification.count({
      where: {
        userId: client.userId,
        type: 'PROJECT_COMPLETION_REQUESTED',
      },
    });
    expect(notif).toBeGreaterThanOrEqual(1);
  });

  it('2-3. Rejected/unrelated freelancer cannot request completion', async (ctx) => {
    if (!dbReady) ctx.skip();
    const client = await registerUser(app, 'CLIENT', 'comp-2');
    const freelancer = await registerUser(app, 'FREELANCER', 'comp-2-fl');
    const other = await registerUser(app, 'FREELANCER', 'comp-2-other');
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

    await authAgent(app)
      .post(`/api/projects/${open.id}/request-completion`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${freelancer.accessToken}`)
      .expect(400);

    const { project } = await createInProgressProject(
      app,
      client.accessToken,
      other.accessToken,
      categoryId,
      skillId,
    );

    await authAgent(app)
      .post(`/api/projects/${project.id}/request-completion`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${freelancer.accessToken}`)
      .expect(400);
  });

  it('5-12. Client completes project + notifications + timestamps', async (ctx) => {
    if (!dbReady) ctx.skip();
    const client = await registerUser(app, 'CLIENT', 'comp-5');
    const freelancer = await registerUser(app, 'FREELANCER', 'comp-5-fl');
    const otherClient = await registerUser(app, 'CLIENT', 'comp-5-other');
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
      .set('Authorization', `Bearer ${otherClient.accessToken}`)
      .expect(403);

    await authAgent(app)
      .post(`/api/projects/${project.id}/complete`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${freelancer.accessToken}`)
      .expect(403);

    const completed = await authAgent(app)
      .post(`/api/projects/${project.id}/complete`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .expect(201);

    expect(completed.body.status).toBe('COMPLETED');
    expect(completed.body.completedAt).toBeTruthy();

    const dbProject = await prisma.project.findUniqueOrThrow({
      where: { id: project.id },
    });
    expect(dbProject.status).toBe('COMPLETED');
    expect(dbProject.completedAt).toBeTruthy();

    const notif = await prisma.notification.count({
      where: { userId: freelancer.userId, type: 'PROJECT_COMPLETED' },
    });
    expect(notif).toBeGreaterThanOrEqual(1);
  });

  it('8-9. OPEN/CLOSED cannot be completed', async (ctx) => {
    if (!dbReady) ctx.skip();
    const client = await registerUser(app, 'CLIENT', 'comp-8');
    const open = await createOpenProject(
      app,
      client.accessToken,
      categoryId,
      skillId,
    );

    await authAgent(app)
      .post(`/api/projects/${open.id}/complete`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .expect(400);

    await authAgent(app)
      .post(`/api/projects/${open.id}/close`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .expect(201);

    await authAgent(app)
      .post(`/api/projects/${open.id}/complete`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .expect(400);
  });

  it('13. Duplicate completion request is idempotent', async (ctx) => {
    if (!dbReady) ctx.skip();
    const client = await registerUser(app, 'CLIENT', 'comp-13');
    const freelancer = await registerUser(app, 'FREELANCER', 'comp-13-fl');
    const { project } = await createInProgressProject(
      app,
      client.accessToken,
      freelancer.accessToken,
      categoryId,
      skillId,
    );

    await authAgent(app)
      .post(`/api/projects/${project.id}/request-completion`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${freelancer.accessToken}`)
      .expect(201);

    const before = await prisma.notification.count({
      where: { userId: client.userId, type: 'PROJECT_COMPLETION_REQUESTED' },
    });

    await authAgent(app)
      .post(`/api/projects/${project.id}/request-completion`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${freelancer.accessToken}`)
      .expect(201);

    const after = await prisma.notification.count({
      where: { userId: client.userId, type: 'PROJECT_COMPLETION_REQUESTED' },
    });
    expect(after).toBe(before);
  });

  it('14. IN_PROGRESS cannot use normal close/cancel', async (ctx) => {
    if (!dbReady) ctx.skip();
    const client = await registerUser(app, 'CLIENT', 'comp-14');
    const freelancer = await registerUser(app, 'FREELANCER', 'comp-14-fl');
    const { project } = await createInProgressProject(
      app,
      client.accessToken,
      freelancer.accessToken,
      categoryId,
      skillId,
    );

    await authAgent(app)
      .post(`/api/projects/${project.id}/close`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .expect(400);

    await authAgent(app)
      .post(`/api/projects/${project.id}/cancel`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .expect(400);
  });
});
