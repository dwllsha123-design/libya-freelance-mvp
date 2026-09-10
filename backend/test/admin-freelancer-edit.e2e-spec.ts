import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  AdminPermission,
  Role,
  UserStatus,
  WorkMode,
  FreelancerAvailability,
} from '@prisma/client';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import {
  authAgent,
  CLIENT_HEADER,
  createTestApp,
  isDatabaseAvailable,
  resetDatabase,
  type TestApp,
} from './helpers/e2e-setup.js';

const prisma = new PrismaClient();

async function loginAdmin(app: TestApp, email: string, password = 'Password1!') {
  const res = await authAgent(app)
    .post('/api/auth/login')
    .set(CLIENT_HEADER)
    .send({ email, password, audience: 'admin' });
  expect(res.status).toBe(200);
  return res.body.accessToken as string;
}

describe('Admin Freelancer Edit E2E', () => {
  let app: TestApp;
  let dbOk = false;
  let freelancerId = '';
  let clientId = '';
  let skillId = '';
  let proposalId = '';
  let createdAtIso = '';

  beforeAll(async () => {
    dbOk = await isDatabaseAvailable();
    if (!dbOk) return;

    await resetDatabase(prisma);
    app = await createTestApp({ testStorage: true });

    const passwordHash = await bcrypt.hash('Password1!', 12);

    await prisma.user.create({
      data: {
        email: 'super-edit@e2e.ly',
        passwordHash,
        role: Role.SUPER_ADMIN,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        profile: {
          create: {
            firstName: 'Super',
            lastName: 'Edit',
            username: 'super-edit',
          },
        },
      },
    });

    const adminWith = await prisma.user.create({
      data: {
        email: 'admin-manage@e2e.ly',
        passwordHash,
        role: Role.ADMIN,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        profile: {
          create: {
            firstName: 'Admin',
            lastName: 'Manage',
            username: 'admin-manage',
          },
        },
      },
    });
    await prisma.userAdminPermission.create({
      data: {
        userId: adminWith.id,
        permission: AdminPermission.MANAGE_USERS,
      },
    });

    await prisma.user.create({
      data: {
        email: 'admin-noperm@e2e.ly',
        passwordHash,
        role: Role.ADMIN,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        profile: {
          create: {
            firstName: 'Admin',
            lastName: 'NoPerm',
            username: 'admin-noperm',
          },
        },
      },
    });

    await prisma.user.create({
      data: {
        email: 'mod-edit@e2e.ly',
        passwordHash,
        role: Role.MODERATOR,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        profile: {
          create: {
            firstName: 'Mod',
            lastName: 'Edit',
            username: 'mod-edit',
          },
        },
      },
    });

    const skill = await prisma.skill.create({
      data: { name: 'EditSkill', slug: 'edit-skill', isActive: true },
    });
    skillId = skill.id;

    const category = await prisma.category.create({
      data: {
        nameAr: 'تصنيف تعديل',
        slug: 'edit-cat',
        isActive: true,
      },
    });

    const freelancer = await prisma.user.create({
      data: {
        email: 'freelancer-edit@e2e.ly',
        passwordHash,
        role: Role.FREELANCER,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        profile: {
          create: {
            firstName: 'Free',
            lastName: 'Lancer',
            username: 'freelancer-edit',
            bio: 'old bio',
            workMode: WorkMode.REMOTE,
            freelancerProfile: {
              create: {
                professionalTitle: 'Old Title',
                availability: FreelancerAvailability.AVAILABLE,
              },
            },
          },
        },
      },
      include: { profile: { include: { freelancerProfile: true } } },
    });
    freelancerId = freelancer.id;
    createdAtIso = freelancer.createdAt.toISOString();

    const client = await prisma.user.create({
      data: {
        email: 'client-edit-target@e2e.ly',
        passwordHash,
        role: Role.CLIENT,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        profile: {
          create: {
            firstName: 'Client',
            lastName: 'Target',
            username: 'client-edit-target',
            clientProfile: { create: { displayName: 'Client Target' } },
          },
        },
      },
    });
    clientId = client.id;

    const project = await prisma.project.create({
      data: {
        title: 'Preserve Project',
        slug: `preserve-${Date.now()}`,
        description: 'keep me',
        categoryId: category.id,
        clientId: client.id,
        budgetMin: 100,
        budgetMax: 200,
        budgetType: 'FIXED',
        experienceLevel: 'INTERMEDIATE',
        workMode: WorkMode.REMOTE,
        status: 'OPEN',
      },
    });

    const proposal = await prisma.proposal.create({
      data: {
        projectId: project.id,
        freelancerId: freelancer.id,
        coverLetter: 'keep proposal',
        proposedPrice: 150,
        estimatedDurationDays: 7,
      },
    });
    proposalId = proposal.id;
  }, 180_000);

  afterAll(async () => {
    if (app) await app.close();
    await prisma.$disconnect();
  });

  it('skips cleanly when DB unavailable', (ctx) => {
    if (!dbOk) ctx.skip();
    expect(dbOk).toBe(true);
  });

  it('SUPER_ADMIN can GET/PATCH freelancer edit endpoints', async (ctx) => {
    if (!dbOk) ctx.skip();

    const token = await loginAdmin(app, 'super-edit@e2e.ly');

    const getRes = await authAgent(app)
      .get(`/api/admin/freelancers/${freelancerId}/edit`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${token}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.id).toBe(freelancerId);
    expect(getRes.body.passwordHash).toBeUndefined();
    expect(getRes.body.refreshToken).toBeUndefined();

    const patchRes = await authAgent(app)
      .patch(`/api/admin/freelancers/${freelancerId}`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${token}`)
      .send({
        firstName: 'Updated',
        professionalTitle: 'New Title',
        skillIds: [skillId],
      });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.firstName).toBe('Updated');
    expect(patchRes.body.professionalTitle).toBe('New Title');
    expect(patchRes.body.skillIds).toEqual([skillId]);
  });

  it('SUPER_ADMIN can upload freelancer photo', async (ctx) => {
    if (!dbOk) ctx.skip();
    const token = await loginAdmin(app, 'super-edit@e2e.ly');

    const photoRes = await authAgent(app)
      .post(`/api/admin/freelancers/${freelancerId}/photo`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from('fake-image'), {
        filename: 'avatar.png',
        contentType: 'image/png',
      });
    // NestJS @Post defaults to 201 Created for successful uploads.
    expect(photoRes.status).toBe(201);
    expect(photoRes.body.profilePhoto).toContain('http://test.storage/profiles/');
  });

  it('authorization matrix for ADMIN/MODERATOR/platform users', async (ctx) => {
    if (!dbOk) ctx.skip();

    const manageToken = await loginAdmin(app, 'admin-manage@e2e.ly');
    const ok = await authAgent(app)
      .get(`/api/admin/freelancers/${freelancerId}/edit`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${manageToken}`);
    expect(ok.status).toBe(200);

    const me = await authAgent(app)
      .get('/api/admin/me')
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${manageToken}`);
    expect(me.status).toBe(200);
    expect(me.body.permissions).toContain(AdminPermission.MANAGE_USERS);

    const noPermToken = await loginAdmin(app, 'admin-noperm@e2e.ly');
    const deniedAdmin = await authAgent(app)
      .get(`/api/admin/freelancers/${freelancerId}/edit`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${noPermToken}`);
    expect(deniedAdmin.status).toBe(403);

    const deniedPatch = await authAgent(app)
      .patch(`/api/admin/freelancers/${freelancerId}`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${noPermToken}`)
      .send({ firstName: 'NopeAdmin' });
    expect(deniedPatch.status).toBe(403);

    const modToken = await loginAdmin(app, 'mod-edit@e2e.ly');
    const deniedMod = await authAgent(app)
      .patch(`/api/admin/freelancers/${freelancerId}`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${modToken}`)
      .send({ firstName: 'Nope' });
    expect(deniedMod.status).toBe(403);

    const platformLogin = await authAgent(app)
      .post('/api/auth/login')
      .set(CLIENT_HEADER)
      .send({
        email: 'freelancer-edit@e2e.ly',
        password: 'Password1!',
        audience: 'platform',
      });
    expect(platformLogin.status).toBe(200);
    const frToken = platformLogin.body.accessToken as string;
    const deniedFr = await authAgent(app)
      .get(`/api/admin/freelancers/${freelancerId}/edit`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${frToken}`);
    expect(deniedFr.status).toBe(403);
  });

  it('omitted skillIds leaves skills unchanged; empty array clears skills', async (ctx) => {
    if (!dbOk) ctx.skip();
    const token = await loginAdmin(app, 'super-edit@e2e.ly');

    await authAgent(app)
      .patch(`/api/admin/freelancers/${freelancerId}`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${token}`)
      .send({ skillIds: [skillId] })
      .expect(200);

    await authAgent(app)
      .patch(`/api/admin/freelancers/${freelancerId}`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${token}`)
      .send({ bio: 'skills should remain' })
      .expect(200);

    const afterOmit = await prisma.freelancerSkill.count({
      where: { freelancerProfile: { profile: { userId: freelancerId } } },
    });
    expect(afterOmit).toBe(1);

    const cleared = await authAgent(app)
      .patch(`/api/admin/freelancers/${freelancerId}`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${token}`)
      .send({ skillIds: [] });
    expect(cleared.status).toBe(200);
    expect(cleared.body.skillIds).toEqual([]);

    expect(
      await prisma.freelancerSkill.count({
        where: { freelancerProfile: { profile: { userId: freelancerId } } },
      }),
    ).toBe(0);
  });

  it('rejects structurally incomplete freelancer on GET edit with 400', async (ctx) => {
    if (!dbOk) ctx.skip();
    const token = await loginAdmin(app, 'super-edit@e2e.ly');
    const passwordHash = await bcrypt.hash('Password1!', 12);

    const broken = await prisma.user.create({
      data: {
        email: 'freelancer-broken-edit@e2e.ly',
        passwordHash,
        role: Role.FREELANCER,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        profile: {
          create: {
            firstName: 'Broken',
            lastName: 'Struct',
            username: 'freelancer-broken-edit',
            // no freelancerProfile on purpose
          },
        },
      },
    });

    const res = await authAgent(app)
      .get(`/api/admin/freelancers/${broken.id}/edit`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });

  it('rejects non-freelancer targets and missing users', async (ctx) => {
    if (!dbOk) ctx.skip();
    const token = await loginAdmin(app, 'super-edit@e2e.ly');

    const clientTarget = await authAgent(app)
      .get(`/api/admin/freelancers/${clientId}/edit`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${token}`);
    expect(clientTarget.status).toBe(403);

    const missing = await authAgent(app)
      .get('/api/admin/freelancers/00000000-0000-4000-8000-000000000099/edit')
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${token}`);
    expect(missing.status).toBe(404);
  });

  it('rejects protected fields in PATCH payload', async (ctx) => {
    if (!dbOk) ctx.skip();
    const token = await loginAdmin(app, 'super-edit@e2e.ly');

    const res = await authAgent(app)
      .patch(`/api/admin/freelancers/${freelancerId}`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${token}`)
      .send({
        firstName: 'Safe',
        role: 'ADMIN',
        status: 'BANNED',
        passwordHash: 'hack',
        id: 'other-id',
      });
    expect(res.status).toBe(400);

    const user = await prisma.user.findUniqueOrThrow({
      where: { id: freelancerId },
    });
    expect(user.role).toBe(Role.FREELANCER);
    expect(user.status).toBe(UserStatus.ACTIVE);
    expect(user.passwordHash).not.toBe('hack');
  });

  it('preserves marketplace activity and createdAt while editing profile', async (ctx) => {
    if (!dbOk) ctx.skip();
    const token = await loginAdmin(app, 'super-edit@e2e.ly');

    const beforeProposal = await prisma.proposal.count({
      where: { freelancerId },
    });
    const beforeProjects = await prisma.project.count({
      where: { clientId },
    });

    await authAgent(app)
      .patch(`/api/admin/freelancers/${freelancerId}`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${token}`)
      .send({ bio: 'preserved activity bio' })
      .expect(200);

    const user = await prisma.user.findUniqueOrThrow({
      where: { id: freelancerId },
    });
    expect(user.createdAt.toISOString()).toBe(createdAtIso);
    expect(user.role).toBe(Role.FREELANCER);

    expect(
      await prisma.proposal.count({ where: { freelancerId } }),
    ).toBe(beforeProposal);
    expect(await prisma.proposal.findUnique({ where: { id: proposalId } })).toBeTruthy();
    expect(await prisma.project.count({ where: { clientId } })).toBe(beforeProjects);

    const portfolioCount = await prisma.portfolioItem.count({
      where: { freelancerProfile: { profile: { userId: freelancerId } } },
    });
    expect(portfolioCount).toBe(0);
  });

  it('writes audit log with actor, freelancer, changed fields, timestamp', async (ctx) => {
    if (!dbOk) ctx.skip();
    const token = await loginAdmin(app, 'super-edit@e2e.ly');
    const superUser = await prisma.user.findUniqueOrThrow({
      where: { email: 'super-edit@e2e.ly' },
    });

    await authAgent(app)
      .patch(`/api/admin/freelancers/${freelancerId}`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${token}`)
      .send({ phone: '0910000000' })
      .expect(200);

    const audit = await prisma.adminAuditLog.findFirst({
      where: {
        adminId: superUser.id,
        entityType: 'User',
        entityId: freelancerId,
      },
      orderBy: { createdAt: 'desc' },
    });
    expect(audit).toBeTruthy();
    expect(audit!.createdAt).toBeInstanceOf(Date);
    const meta = audit!.metadata as Record<string, unknown>;
    expect(meta.action).toBe('ADMIN_FREELANCER_PROFILE_UPDATE');
    expect(meta.actorAdminId).toBe(superUser.id);
    expect(meta.freelancerUserId).toBe(freelancerId);
    expect(Array.isArray(meta.changedFields)).toBe(true);
    expect(meta.changedFields).toContain('phone');
    expect(JSON.stringify(meta)).not.toMatch(/password|refreshToken|secret/i);
  });
});
