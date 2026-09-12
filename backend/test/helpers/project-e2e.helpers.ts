import type { INestApplication } from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';
import { Role, UserStatus, AdminPermission } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { seedReferenceData } from '../../prisma/seed-reference.js';
import {
  CLIENT_HEADER,
  authAgent,
  type request,
} from './e2e-setup.js';

export async function seedTestReferenceData(prisma: PrismaClient) {
  await seedReferenceData(prisma);
  await ensureSubscriptionCatalog(prisma);
}

async function ensureSubscriptionCatalog(prisma: PrismaClient) {
  const plans = [
    {
      id: '00000000-0000-4000-8000-000000000022',
      code: 'STARTER',
      nameAr: 'البداية',
      nameEn: 'Starter',
      price: 22,
      proposalQuotaMonthly: 20,
      monthlyPointsGrant: 0,
      visibilityWeight: 1,
      portfolioItemLimit: 20,
      sortOrder: 10,
      featuresJson: { messaging: true, publicProfile: true, standardVisibility: true },
    },
    {
      id: '00000000-0000-4000-8000-000000000042',
      code: 'PRO',
      nameAr: 'احترافي',
      nameEn: 'Pro',
      price: 42,
      proposalQuotaMonthly: 60,
      monthlyPointsGrant: 30,
      visibilityWeight: 5,
      portfolioItemLimit: 40,
      badgeKey: 'pro',
      sortOrder: 20,
      featuresJson: {
        messaging: true,
        publicProfile: true,
        proBadge: true,
        statistics: true,
        higherVisibility: true,
      },
    },
    {
      id: '00000000-0000-4000-8000-000000000072',
      code: 'PREMIUM',
      nameAr: 'مميز',
      nameEn: 'Premium',
      price: 72,
      proposalQuotaMonthly: 120,
      monthlyPointsGrant: 80,
      visibilityWeight: 10,
      portfolioItemLimit: 80,
      badgeKey: 'premium',
      sortOrder: 30,
      featuresJson: {
        messaging: true,
        publicProfile: true,
        premiumBadge: true,
        advancedStatistics: true,
        highestVisibility: true,
        promotionalBenefits: true,
      },
    },
  ] as const;

  for (const plan of plans) {
    await prisma.subscriptionPlan.upsert({
      where: { code: plan.code },
      create: {
        id: plan.id,
        code: plan.code,
        nameAr: plan.nameAr,
        nameEn: plan.nameEn,
        price: plan.price,
        currency: 'LYD',
        durationDays: 30,
        isActive: true,
        portfolioItemLimit: plan.portfolioItemLimit,
        visibilityWeight: plan.visibilityWeight,
        rankingBoostWeight: plan.code === 'STARTER' ? 0 : 1,
        proposalQuotaMonthly: plan.proposalQuotaMonthly,
        monthlyPointsGrant: plan.monthlyPointsGrant,
        badgeKey: 'badgeKey' in plan ? plan.badgeKey : null,
        featuresJson: plan.featuresJson,
        sortOrder: plan.sortOrder,
      },
      update: {
        isActive: true,
        price: plan.price,
        proposalQuotaMonthly: plan.proposalQuotaMonthly,
        monthlyPointsGrant: plan.monthlyPointsGrant,
        visibilityWeight: plan.visibilityWeight,
        portfolioItemLimit: plan.portfolioItemLimit,
      },
    });
  }

  await prisma.subscriptionPlan.updateMany({
    where: { code: 'FREELANCER_PRO' },
    data: { isActive: false },
  });
}

export async function registerUser(
  app: INestApplication,
  role: 'CLIENT' | 'FREELANCER',
  suffix = Date.now().toString(),
) {
  const agent = authAgent(app);
  const email = `${role.toLowerCase()}-${suffix}@test.ly`;

  const res = await agent
    .post('/api/auth/register')
    .set(CLIENT_HEADER)
    .send({
      firstName: role === 'CLIENT' ? 'عميل' : 'مستقل',
      lastName: 'اختبار',
      email,
      password: 'Password1',
      confirmPassword: 'Password1',
      role,
    })
    .expect(201);

  return {
    agent,
    email,
    accessToken: res.body.accessToken as string,
    userId: res.body.user.id as string,
  };
}

export async function registerAdmin(
  prisma: PrismaClient,
  app: INestApplication,
  suffix = Date.now().toString(),
) {
  const email = `admin-${suffix}@test.ly`;
  const passwordHash = await bcrypt.hash('Password1', 12);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
      emailVerified: true,
      profile: {
        create: {
          firstName: 'مدير',
          lastName: 'اختبار',
          username: `admin-${suffix}`,
        },
      },
      adminPermissions: {
        create: [{ permission: AdminPermission.MANAGE_USERS }],
      },
    },
  });

  const login = await authAgent(app)
    .post('/api/auth/login')
    .set(CLIENT_HEADER)
    .send({ email, password: 'Password1', audience: 'admin' })
    .expect(200);

  return {
    email,
    userId: user.id,
    accessToken: login.body.accessToken as string,
  };
}

export async function getReferenceIds(prisma: PrismaClient) {
  const category = await prisma.category.findFirstOrThrow({
    where: { slug: 'programming-tech' },
  });
  const skill = await prisma.skill.findFirstOrThrow({
    where: { slug: 'react' },
  });
  const city = await prisma.city.findFirstOrThrow({
    where: { slug: 'tripoli' },
  });

  return { category, skill, city };
}

export function validProjectPayload(
  categoryId: string,
  skillIds: string[],
  overrides: Record<string, unknown> = {},
) {
  return {
    title: 'مشروع اختباري لتطوير تطبيق ويب',
    description:
      'وصف اختباري مفصل للمشروع يتضمن المتطلبات الأساسية والنطاق المتوقع للعمل والتسليمات المطلوبة من المستقل.',
    categoryId,
    skillIds,
    budgetType: 'FIXED',
    budgetMin: 1000,
    budgetMax: 5000,
    experienceLevel: 'INTERMEDIATE',
    workMode: 'REMOTE',
    ...overrides,
  };
}

export function authRequest(
  app: INestApplication,
  accessToken?: string,
): ReturnType<typeof request> {
  const agent = authAgent(app);
  if (accessToken) {
    return agent.set('Authorization', `Bearer ${accessToken}`);
  }
  return agent;
}

export const validProposalBody = {
  coverLetter:
    'أنا مستقل ذو خبرة في هذا المجال وأستطيع تنفيذ المشروع وفق المتطلبات المذكورة مع التزام بالجودة والمواعيد.',
  proposedPrice: 2500,
  estimatedDurationDays: 14,
};

export async function createOpenProject(
  app: INestApplication,
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

  return created.body as { id: string; title: string };
}

export async function approveProjectAgreement(
  app: INestApplication,
  clientToken: string,
  freelancerToken: string,
  proposalId: string,
) {
  const created = await authAgent(app)
    .post('/api/agreements')
    .set(CLIENT_HEADER)
    .set('Authorization', `Bearer ${clientToken}`)
    .send({ proposalId })
    .expect(201);

  await authAgent(app)
    .post(`/api/agreements/${created.body.id}/accept`)
    .set(CLIENT_HEADER)
    .set('Authorization', `Bearer ${clientToken}`)
    .expect(201);

  await authAgent(app)
    .post(`/api/agreements/${created.body.id}/accept`)
    .set(CLIENT_HEADER)
    .set('Authorization', `Bearer ${freelancerToken}`)
    .expect(201);

  return created.body as {
    id: string;
    proposalId: string;
    status: string;
    canConfirmStart?: boolean;
    canFund?: boolean;
  };
}

export async function fundAndAcceptProposal(
  app: INestApplication,
  clientToken: string,
  proposalId: string,
  freelancerToken: string,
) {
  await approveProjectAgreement(app, clientToken, freelancerToken, proposalId);

  return authAgent(app)
    .post(`/api/escrow/fund-and-accept/${proposalId}`)
    .set(CLIENT_HEADER)
    .set('Authorization', `Bearer ${clientToken}`)
    .expect(201);
}

export async function confirmDirectAgreementAndStart(
  app: INestApplication,
  clientToken: string,
  freelancerToken: string,
  proposalId: string,
) {
  await approveProjectAgreement(app, clientToken, freelancerToken, proposalId);

  return authAgent(app)
    .post(`/api/proposals/${proposalId}/accept`)
    .set(CLIENT_HEADER)
    .set('Authorization', `Bearer ${clientToken}`)
    .expect(201);
}

export async function createInProgressProject(
  app: INestApplication,
  clientToken: string,
  freelancerToken: string,
  categoryId: string,
  skillId: string,
) {
  const project = await createOpenProject(
    app,
    clientToken,
    categoryId,
    skillId,
  );

  const proposal = await authAgent(app)
    .post(`/api/projects/${project.id}/proposals`)
    .set(CLIENT_HEADER)
    .set('Authorization', `Bearer ${freelancerToken}`)
    .send(validProposalBody)
    .expect(201);

  // Launch model: start work without platform funding.
  await confirmDirectAgreementAndStart(
    app,
    clientToken,
    freelancerToken,
    proposal.body.id,
  );

  return {
    project,
    proposal: proposal.body as { id: string },
  };
}
