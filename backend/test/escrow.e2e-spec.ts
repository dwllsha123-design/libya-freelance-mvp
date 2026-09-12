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
import { PAYMENT_PROTECTION_NOT_ACTIVE } from '../src/payments/payment-protection.policy.js';

const prisma = new PrismaClient();

describe('Escrow E2E (PostgreSQL) — permanently frozen', () => {
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

    // Even if env is set, advertising model permanently freezes mutations.
    process.env.PAYMENT_PROTECTION_ACTIVE = 'true';

    app = await createTestApp({ testStorage: true });
    await resetDatabase(prisma);
    await seedTestReferenceData(prisma);
    const refs = await getReferenceIds(prisma);
    categoryId = refs.category.id;
    skillId = refs.skill.id;
  });

  afterAll(async () => {
    delete process.env.PAYMENT_PROTECTION_ACTIVE;
    if (app) await app.close();
    await prisma.$disconnect();
  });

  it('fund-and-accept is always rejected (no project escrow)', async (ctx) => {
    if (!dbReady) ctx.skip();

    const client = await registerUser(app, 'CLIENT', 'escrow-frozen-client');
    const freelancer = await registerUser(app, 'FREELANCER', 'escrow-frozen-fl');
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

    const res = await authAgent(app)
      .post(`/api/escrow/fund-and-accept/${proposal.body.id}`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .expect(412);

    expect(res.body.code).toBe(PAYMENT_PROTECTION_NOT_ACTIVE);
    const escrow = await prisma.escrow.findUnique({
      where: { proposalId: proposal.body.id },
    });
    expect(escrow).toBeNull();
  });

  it('prepare escrow is rejected', async (ctx) => {
    if (!dbReady) ctx.skip();

    const client = await registerUser(app, 'CLIENT', 'escrow-prep-client');
    const freelancer = await registerUser(app, 'FREELANCER', 'escrow-prep-fl');
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

    const res = await authAgent(app)
      .post(`/api/escrow/prepare/${proposal.body.id}`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .expect(412);

    expect(res.body.code).toBe(PAYMENT_PROTECTION_NOT_ACTIVE);
  });

  it('accept without agreement still returns precondition failed', async (ctx) => {
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
