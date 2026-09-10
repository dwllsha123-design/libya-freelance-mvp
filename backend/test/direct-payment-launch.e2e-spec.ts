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
  confirmDirectAgreementAndStart,
  createOpenProject,
  getReferenceIds,
  registerUser,
  seedTestReferenceData,
  validProposalBody,
} from './helpers/project-e2e.helpers.js';

const prisma = new PrismaClient();

describe('Direct payment launch model E2E (PostgreSQL)', () => {
  let app: Awaited<ReturnType<typeof createTestApp>>;
  let dbReady = false;
  let categoryId = '';
  let skillId = '';

  beforeAll(async () => {
    dbReady = await isDatabaseAvailable();
    if (!dbReady) {
      console.warn('Skipping direct-payment E2E: PostgreSQL not available');
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

  it('agreement → accept proposal starts work without escrow funding or payment rows', async (ctx) => {
    if (!dbReady) ctx.skip();

    const client = await registerUser(app, 'CLIENT', 'dp-client');
    const freelancer = await registerUser(app, 'FREELANCER', 'dp-fl');
    const project = await createOpenProject(
      app,
      client.accessToken,
      categoryId,
      skillId,
    );

    const proposal = await authAgent(app)
      .post(`/api/projects/${project.id}/proposals`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${freelancer.accessToken}`)
      .send(validProposalBody)
      .expect(201);

    await confirmDirectAgreementAndStart(
      app,
      client.accessToken,
      freelancer.accessToken,
      proposal.body.id,
    );

    const inProgress = await prisma.project.findUniqueOrThrow({
      where: { id: project.id },
    });
    expect(inProgress.status).toBe('IN_PROGRESS');
    expect(inProgress.acceptedProposalId).toBe(proposal.body.id);

    const agreement = await prisma.projectAgreement.findUniqueOrThrow({
      where: { proposalId: proposal.body.id },
      include: { currentVersion: true },
    });
    expect(agreement.status).toBe('ACTIVE');
    expect(Number(agreement.currentVersion?.grossAmount)).toBe(
      validProposalBody.proposedPrice,
    );
    expect(agreement.fundedAt).toBeNull();

    const escrow = await prisma.escrow.findUnique({
      where: { proposalId: proposal.body.id },
    });
    expect(escrow).toBeNull();

    const payments = await prisma.payment.count({
      where: { escrow: { proposalId: proposal.body.id } },
    });
    expect(payments).toBe(0);

    const conv = await authAgent(app)
      .post(`/api/proposals/${proposal.body.id}/conversation`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .expect(201);

    await authAgent(app)
      .post(`/api/conversations/${conv.body.conversationId}/messages`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .send({
        content: 'تواصل واتساب 0912345678 أو WhatsApp +218912345678',
      })
      .expect(201);

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

    const completedAgreement = await prisma.projectAgreement.findUniqueOrThrow({
      where: { proposalId: proposal.body.id },
    });
    expect(completedAgreement.status).toBe('COMPLETED');

    await authAgent(app)
      .post(`/api/projects/${project.id}/review`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .send({
        rating: 5,
        comment: 'تسليم ممتاز والتواصل كان واضحاً خلال مرحلة الدفع المباشر',
      })
      .expect(201);
  });
});
