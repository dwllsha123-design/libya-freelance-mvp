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
  fundAndAcceptProposal,
  getReferenceIds,
  registerAdmin,
  registerUser,
  seedTestReferenceData,
  validProposalBody,
} from './helpers/project-e2e.helpers.js';

const prisma = new PrismaClient();

describe('Escrow E2E (PostgreSQL)', () => {
  let app: Awaited<ReturnType<typeof createTestApp>>;
  let dbReady = false;
  let categoryId = '';
  let skillId = '';

  beforeAll(async () => {
    dbReady = await isDatabaseAvailable();
    if (!dbReady) {
      console.warn('Skipping Escrow E2E: PostgreSQL not available');
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

  it('fund-and-accept, complete releases escrow to freelancer', async (ctx) => {
    if (!dbReady) ctx.skip();

    const client = await registerUser(app, 'CLIENT', 'escrow-client');
    const freelancer = await registerUser(app, 'FREELANCER', 'escrow-fl');
    const project = await createOpenProject(app, client.accessToken, categoryId, skillId);

    const proposal = await authAgent(app)
      .post(`/api/projects/${project.id}/proposals`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${freelancer.accessToken}`)
      .send(validProposalBody)
      .expect(201);

    await fundAndAcceptProposal(app, client.accessToken, proposal.body.id);

    const escrow = await prisma.escrow.findUniqueOrThrow({
      where: { proposalId: proposal.body.id },
    });
    expect(escrow.status).toBe('FUNDED');
    expect(Number(escrow.amount)).toBe(validProposalBody.proposedPrice);

    await authAgent(app)
      .post(`/api/projects/${project.id}/request-completion`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${freelancer.accessToken}`)
      .expect(201);

    await authAgent(app)
      .post(`/api/projects/${project.id}/complete`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .expect(201);

    const released = await prisma.escrow.findUniqueOrThrow({
      where: { id: escrow.id },
    });
    expect(released.status).toBe('RELEASED');
    expect(released.releasedAt).not.toBeNull();
  });

  it('dispute blocks completion; admin can resolve with refund', async (ctx) => {
    if (!dbReady) ctx.skip();

    const admin = await registerAdmin(prisma, app, 'escrow-admin');
    const client = await registerUser(app, 'CLIENT', 'escrow-dispute-client');
    const freelancer = await registerUser(app, 'FREELANCER', 'escrow-dispute-fl');
    const project = await createOpenProject(app, client.accessToken, categoryId, skillId);

    const proposal = await authAgent(app)
      .post(`/api/projects/${project.id}/proposals`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${freelancer.accessToken}`)
      .send(validProposalBody)
      .expect(201);

    await fundAndAcceptProposal(app, client.accessToken, proposal.body.id);

    const escrow = await prisma.escrow.findUniqueOrThrow({
      where: { proposalId: proposal.body.id },
    });

    const dispute = await authAgent(app)
      .post(`/api/escrow/${escrow.id}/dispute`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .send({ reason: 'العمل لم يُسلَّم وفق الاتفاق والجودة غير مقبولة' })
      .expect(201);

    expect(dispute.body.status).toBe('OPEN');

    const disputedEscrow = await prisma.escrow.findUniqueOrThrow({
      where: { id: escrow.id },
    });
    expect(disputedEscrow.status).toBe('DISPUTED');

    await authAgent(app)
      .post(`/api/projects/${project.id}/complete`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .expect(409);

    const openDisputes = await authAgent(app)
      .get('/api/admin/escrow/disputes?status=open')
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);

    expect(openDisputes.body.some((d: { id: string }) => d.id === dispute.body.id)).toBe(
      true,
    );

    await authAgent(app)
      .post(`/api/admin/escrow/disputes/${dispute.body.id}/resolve`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({
        resolution: 'بعد المراجعة، يستحق العميل استرداد المبلغ.',
        outcome: 'REFUND_CLIENT',
      })
      .expect(201);

    const refunded = await prisma.escrow.findUniqueOrThrow({
      where: { id: escrow.id },
    });
    expect(refunded.status).toBe('REFUNDED');

    const resolvedList = await authAgent(app)
      .get('/api/admin/escrow/disputes?status=resolved')
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);

    expect(
      resolvedList.body.some((d: { id: string }) => d.id === dispute.body.id),
    ).toBe(true);
  });

  it('accept without funded escrow returns precondition failed', async (ctx) => {
    if (!dbReady) ctx.skip();

    const client = await registerUser(app, 'CLIENT', 'escrow-no-fund');
    const freelancer = await registerUser(app, 'FREELANCER', 'escrow-no-fund-fl');
    const project = await createOpenProject(app, client.accessToken, categoryId, skillId);

    const proposal = await authAgent(app)
      .post(`/api/projects/${project.id}/proposals`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${freelancer.accessToken}`)
      .send(validProposalBody)
      .expect(201);

    await authAgent(app)
      .post(`/api/proposals/${proposal.body.id}/accept`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .expect(412);
  });
});
