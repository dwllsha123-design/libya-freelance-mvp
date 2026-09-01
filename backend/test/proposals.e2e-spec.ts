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

function validProposal() {
  return {
    coverLetter:
      'أنا مستقل ذو خبرة في هذا المجال وأستطيع تنفيذ المشروع وفق المتطلبات المذكورة مع التزام بالجودة والمواعيد.',
    proposedPrice: 2500,
    estimatedDurationDays: 14,
  };
}

async function createOpenProject(
  app: Awaited<ReturnType<typeof createTestApp>>,
  clientToken: string,
  categoryId: string,
  skillId: string,
) {
  const created = await authAgent(app)
    .post('/api/projects')
    .set(CLIENT_HEADER)
    .set('Authorization', `Bearer ${clientToken}`)
    .send(validProjectPayload(categoryId, [skillId]))
    .expect(201);

  await authAgent(app)
    .post(`/api/projects/${created.body.id}/publish`)
    .set(CLIENT_HEADER)
    .set('Authorization', `Bearer ${clientToken}`)
    .expect(201);

  return created.body;
}

describe('Proposals E2E (PostgreSQL)', () => {
  let app: Awaited<ReturnType<typeof createTestApp>>;
  let dbReady = false;
  let categoryId = '';
  let skillId = '';

  beforeAll(async () => {
    dbReady = await isDatabaseAvailable();
    if (!dbReady) {
      console.warn('Skipping Proposals E2E: PostgreSQL not available');
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

  it('1. FREELANCER submits proposal to OPEN project', async (ctx) => {
    if (!dbReady) ctx.skip();
    const client = await registerUser(app, 'CLIENT', 'p-submit');
    const freelancer = await registerUser(app, 'FREELANCER', 'p-submit-fl');
    const project = await createOpenProject(app, client.accessToken, categoryId, skillId);

    const res = await authAgent(app)
      .post(`/api/projects/${project.id}/proposals`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${freelancer.accessToken}`)
      .send(validProposal())
      .expect(201);

    expect(res.body.status).toBe('PENDING');
  });

  it('2. CLIENT cannot submit proposal', async (ctx) => {
    if (!dbReady) ctx.skip();
    const client = await registerUser(app, 'CLIENT', 'p-client-no');
    const project = await createOpenProject(app, client.accessToken, categoryId, skillId);

    await authAgent(app)
      .post(`/api/projects/${project.id}/proposals`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .send(validProposal())
      .expect(403);
  });

  it('3. Anonymous cannot submit proposal', async (ctx) => {
    if (!dbReady) ctx.skip();
    const client = await registerUser(app, 'CLIENT', 'p-anon');
    const project = await createOpenProject(app, client.accessToken, categoryId, skillId);

    await authAgent(app)
      .post(`/api/projects/${project.id}/proposals`)
      .set(CLIENT_HEADER)
      .send(validProposal())
      .expect(401);
  });

  it('4. duplicate proposal rejected', async (ctx) => {
    if (!dbReady) ctx.skip();
    const client = await registerUser(app, 'CLIENT', 'p-dup');
    const freelancer = await registerUser(app, 'FREELANCER', 'p-dup-fl');
    const project = await createOpenProject(app, client.accessToken, categoryId, skillId);

    await authAgent(app)
      .post(`/api/projects/${project.id}/proposals`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${freelancer.accessToken}`)
      .send(validProposal())
      .expect(201);

    await authAgent(app)
      .post(`/api/projects/${project.id}/proposals`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${freelancer.accessToken}`)
      .send(validProposal())
      .expect(409);
  });

  it('5. cannot apply to CLOSED project', async (ctx) => {
    if (!dbReady) ctx.skip();
    const client = await registerUser(app, 'CLIENT', 'p-closed');
    const freelancer = await registerUser(app, 'FREELANCER', 'p-closed-fl');
    const project = await createOpenProject(app, client.accessToken, categoryId, skillId);

    await authAgent(app)
      .post(`/api/projects/${project.id}/close`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .expect(201);

    await authAgent(app)
      .post(`/api/projects/${project.id}/proposals`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${freelancer.accessToken}`)
      .send(validProposal())
      .expect(403);
  });

  it('6. project owner cannot submit proposal', async (ctx) => {
    if (!dbReady) ctx.skip();
    const client = await registerUser(app, 'CLIENT', 'p-owner');
    const project = await createOpenProject(app, client.accessToken, categoryId, skillId);

    await authAgent(app)
      .post(`/api/projects/${project.id}/proposals`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .send(validProposal())
      .expect(403);
  });

  it('7. freelancer sees own proposals', async (ctx) => {
    if (!dbReady) ctx.skip();
    const client = await registerUser(app, 'CLIENT', 'p-mine');
    const freelancer = await registerUser(app, 'FREELANCER', 'p-mine-fl');
    const project = await createOpenProject(app, client.accessToken, categoryId, skillId);

    await authAgent(app)
      .post(`/api/projects/${project.id}/proposals`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${freelancer.accessToken}`)
      .send(validProposal())
      .expect(201);

    const list = await authAgent(app)
      .get('/api/proposals/me')
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${freelancer.accessToken}`)
      .expect(200);

    expect(list.body.items.length).toBeGreaterThanOrEqual(1);
  });

  it('8. freelancer cannot see another freelancer proposal via project proposals', async (ctx) => {
    if (!dbReady) ctx.skip();
    const client = await registerUser(app, 'CLIENT', 'p-privacy');
    const fl1 = await registerUser(app, 'FREELANCER', 'p-privacy-1');
    const fl2 = await registerUser(app, 'FREELANCER', 'p-privacy-2');
    const project = await createOpenProject(app, client.accessToken, categoryId, skillId);

    await authAgent(app)
      .post(`/api/projects/${project.id}/proposals`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${fl1.accessToken}`)
      .send(validProposal())
      .expect(201);

    await authAgent(app)
      .get(`/api/projects/${project.id}/proposals`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${fl2.accessToken}`)
      .expect(403);
  });

  it('9. project owner sees project proposals', async (ctx) => {
    if (!dbReady) ctx.skip();
    const client = await registerUser(app, 'CLIENT', 'p-owner-list');
    const freelancer = await registerUser(app, 'FREELANCER', 'p-owner-list-fl');
    const project = await createOpenProject(app, client.accessToken, categoryId, skillId);

    await authAgent(app)
      .post(`/api/projects/${project.id}/proposals`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${freelancer.accessToken}`)
      .send(validProposal())
      .expect(201);

    const list = await authAgent(app)
      .get(`/api/projects/${project.id}/proposals`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .expect(200);

    expect(list.body.length).toBe(1);
  });

  it('10. other client cannot see proposals', async (ctx) => {
    if (!dbReady) ctx.skip();
    const client = await registerUser(app, 'CLIENT', 'p-other-list');
    const other = await registerUser(app, 'CLIENT', 'p-other-list-2');
    const freelancer = await registerUser(app, 'FREELANCER', 'p-other-list-fl');
    const project = await createOpenProject(app, client.accessToken, categoryId, skillId);

    await authAgent(app)
      .post(`/api/projects/${project.id}/proposals`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${freelancer.accessToken}`)
      .send(validProposal())
      .expect(201);

    await authAgent(app)
      .get(`/api/projects/${project.id}/proposals`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${other.accessToken}`)
      .expect(403);
  });

  it('11-15. accept flow and concurrency', async (ctx) => {
    if (!dbReady) ctx.skip();

    const client = await registerUser(app, 'CLIENT', 'p-accept');
    const fl1 = await registerUser(app, 'FREELANCER', 'p-accept-1');
    const fl2 = await registerUser(app, 'FREELANCER', 'p-accept-2');
    const project = await createOpenProject(app, client.accessToken, categoryId, skillId);

    const p1 = await authAgent(app)
      .post(`/api/projects/${project.id}/proposals`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${fl1.accessToken}`)
      .send(validProposal())
      .expect(201);

    const p2 = await authAgent(app)
      .post(`/api/projects/${project.id}/proposals`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${fl2.accessToken}`)
      .send(validProposal())
      .expect(201);

    const accepted = await authAgent(app)
      .post(`/api/proposals/${p1.body.id}/accept`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .expect(201);

    expect(accepted.body.status).toBe('ACCEPTED');

    const dbProject = await prisma.project.findUniqueOrThrow({
      where: { id: project.id },
    });
    expect(dbProject.status).toBe('IN_PROGRESS');
    expect(dbProject.acceptedProposalId).toBe(p1.body.id);

    const otherProposal = await prisma.proposal.findUniqueOrThrow({
      where: { id: p2.body.id },
    });
    expect(otherProposal.status).toBe('REJECTED');

    await authAgent(app)
      .post(`/api/proposals/${p2.body.id}/accept`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .expect(409);

    const acceptedCount = await prisma.proposal.count({
      where: { projectId: project.id, status: 'ACCEPTED' },
    });
    expect(acceptedCount).toBe(1);
  });

  it('16. non-owner client cannot accept', async (ctx) => {
    if (!dbReady) ctx.skip();
    const client = await registerUser(app, 'CLIENT', 'p-no-accept');
    const other = await registerUser(app, 'CLIENT', 'p-no-accept-2');
    const freelancer = await registerUser(app, 'FREELANCER', 'p-no-accept-fl');
    const project = await createOpenProject(app, client.accessToken, categoryId, skillId);

    const proposal = await authAgent(app)
      .post(`/api/projects/${project.id}/proposals`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${freelancer.accessToken}`)
      .send(validProposal())
      .expect(201);

    await authAgent(app)
      .post(`/api/proposals/${proposal.body.id}/accept`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${other.accessToken}`)
      .expect(403);
  });

  it('17. freelancer can withdraw PENDING proposal', async (ctx) => {
    if (!dbReady) ctx.skip();
    const client = await registerUser(app, 'CLIENT', 'p-withdraw');
    const freelancer = await registerUser(app, 'FREELANCER', 'p-withdraw-fl');
    const project = await createOpenProject(app, client.accessToken, categoryId, skillId);

    const proposal = await authAgent(app)
      .post(`/api/projects/${project.id}/proposals`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${freelancer.accessToken}`)
      .send(validProposal())
      .expect(201);

    const withdrawn = await authAgent(app)
      .post(`/api/proposals/${proposal.body.id}/withdraw`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${freelancer.accessToken}`)
      .expect(201);

    expect(withdrawn.body.status).toBe('WITHDRAWN');
  });

  it('18. freelancer cannot withdraw ACCEPTED proposal', async (ctx) => {
    if (!dbReady) ctx.skip();
    const client = await registerUser(app, 'CLIENT', 'p-no-withdraw');
    const freelancer = await registerUser(app, 'FREELANCER', 'p-no-withdraw-fl');
    const project = await createOpenProject(app, client.accessToken, categoryId, skillId);

    const proposal = await authAgent(app)
      .post(`/api/projects/${project.id}/proposals`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${freelancer.accessToken}`)
      .send(validProposal())
      .expect(201);

    await authAgent(app)
      .post(`/api/proposals/${proposal.body.id}/accept`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .expect(201);

    await authAgent(app)
      .post(`/api/proposals/${proposal.body.id}/withdraw`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${freelancer.accessToken}`)
      .expect(400);
  });

  it('19. owner can reject PENDING proposal', async (ctx) => {
    if (!dbReady) ctx.skip();
    const client = await registerUser(app, 'CLIENT', 'p-reject');
    const freelancer = await registerUser(app, 'FREELANCER', 'p-reject-fl');
    const project = await createOpenProject(app, client.accessToken, categoryId, skillId);

    const proposal = await authAgent(app)
      .post(`/api/projects/${project.id}/proposals`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${freelancer.accessToken}`)
      .send(validProposal())
      .expect(201);

    const rejected = await authAgent(app)
      .post(`/api/proposals/${proposal.body.id}/reject`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .expect(201);

    expect(rejected.body.status).toBe('REJECTED');
  });

  it('20. notifications are created correctly', async (ctx) => {
    if (!dbReady) ctx.skip();
    const client = await registerUser(app, 'CLIENT', 'p-notify');
    const freelancer = await registerUser(app, 'FREELANCER', 'p-notify-fl');
    const project = await createOpenProject(app, client.accessToken, categoryId, skillId);

    await authAgent(app)
      .post(`/api/projects/${project.id}/proposals`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${freelancer.accessToken}`)
      .send(validProposal())
      .expect(201);

    const clientNotifications = await prisma.notification.count({
      where: { userId: client.userId, type: 'NEW_PROPOSAL' },
    });
    expect(clientNotifications).toBeGreaterThanOrEqual(1);
  });

  it('concurrency: only one proposal accepted under parallel accept', async (ctx) => {
    if (!dbReady) ctx.skip();

    const client = await registerUser(app, 'CLIENT', 'p-concurrent');
    const fl1 = await registerUser(app, 'FREELANCER', 'p-concurrent-1');
    const fl2 = await registerUser(app, 'FREELANCER', 'p-concurrent-2');
    const project = await createOpenProject(app, client.accessToken, categoryId, skillId);

    const p1 = await authAgent(app)
      .post(`/api/projects/${project.id}/proposals`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${fl1.accessToken}`)
      .send(validProposal())
      .expect(201);

    const p2 = await authAgent(app)
      .post(`/api/projects/${project.id}/proposals`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${fl2.accessToken}`)
      .send(validProposal())
      .expect(201);

    const [res1, res2] = await Promise.allSettled([
      authAgent(app)
        .post(`/api/proposals/${p1.body.id}/accept`)
        .set(CLIENT_HEADER)
        .set('Authorization', `Bearer ${client.accessToken}`),
      authAgent(app)
        .post(`/api/proposals/${p2.body.id}/accept`)
        .set(CLIENT_HEADER)
        .set('Authorization', `Bearer ${client.accessToken}`),
    ]);

    const statuses = [res1, res2].map((r) =>
      r.status === 'fulfilled' ? r.value.status : 500,
    );

    const successCount = statuses.filter((s) => s === 201).length;
    expect(successCount).toBe(1);

    const acceptedCount = await prisma.proposal.count({
      where: { projectId: project.id, status: 'ACCEPTED' },
    });
    expect(acceptedCount).toBe(1);

    const dbProject = await prisma.project.findUniqueOrThrow({
      where: { id: project.id },
    });
    expect(dbProject.status).toBe('IN_PROGRESS');
  });
});
