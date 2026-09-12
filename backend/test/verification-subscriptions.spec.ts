import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import {
  FreelancerSubscriptionStatus,
  IdentityVerificationStatus,
  PaymentPurpose,
  PaymentStatus,
  Role,
} from '@prisma/client';
import { VerificationService } from '../src/verification/verification.service.js';
import { SubscriptionsService } from '../src/subscriptions/subscriptions.service.js';
import { PRO_PLAN_CODE } from '../src/subscriptions/subscriptions.constants.js';

function createVerificationPrisma() {
  return {
    user: { findUnique: vi.fn() },
    freelancerIdentityVerification: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    identityVerificationDocument: {
      createMany: vi.fn(),
      deleteMany: vi.fn(),
      findFirst: vi.fn(),
    },
    $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => {
      if (typeof fn === 'function') {
        return fn({
          freelancerIdentityVerification: {
            create: vi.fn(async ({ data }: { data: unknown }) => ({
              id: 'ver-1',
              ...(data as object),
            })),
            update: vi.fn(async ({ data }: { data: unknown }) => ({
              id: 'ver-1',
              ...(data as object),
            })),
          },
          identityVerificationDocument: {
            createMany: vi.fn(),
            deleteMany: vi.fn(),
          },
          adminAuditLog: { create: vi.fn() },
        });
      }
      return fn;
    }),
  };
}

describe('VerificationService', () => {
  let prisma: ReturnType<typeof createVerificationPrisma>;
  let notifications: { create: ReturnType<typeof vi.fn> };
  let storage: {
    putPrivateObject: ReturnType<typeof vi.fn>;
    deletePrivateObject: ReturnType<typeof vi.fn>;
    getObject: ReturnType<typeof vi.fn>;
  };
  let audit: { log: ReturnType<typeof vi.fn> };
  let service: VerificationService;

  beforeEach(() => {
    prisma = createVerificationPrisma();
    notifications = { create: vi.fn() };
    storage = {
      putPrivateObject: vi.fn(async (key: string) => key),
      deletePrivateObject: vi.fn(),
      getObject: vi.fn(),
    };
    audit = { log: vi.fn() };
    service = new VerificationService(
      prisma as never,
      notifications as never,
      storage as never,
      audit as never,
    );
  });

  it('rejects non-freelancer submit', async () => {
    prisma.user.findUnique.mockResolvedValue({ role: Role.CLIENT, profile: null });
    await expect(
      service.submit('u1', { fullNameAsOnId: 'Test User', nationalId: '1234567890' }, [
        { buffer: Buffer.from('x'), mimetype: 'image/jpeg', size: 10 } as Express.Multer.File,
      ]),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('submits verification for freelancer', async () => {
    prisma.user.findUnique.mockResolvedValue({
      role: Role.FREELANCER,
      profile: { freelancerProfile: { id: 'fp1' } },
    });
    prisma.freelancerIdentityVerification.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'ver-1',
        status: IdentityVerificationStatus.PENDING,
        fullNameAsOnId: 'Test User',
        nationalIdLast4: '7890',
        freelancerNote: null,
        rejectionReason: null,
        submittedAt: new Date(),
        reviewedAt: null,
        expiresAt: null,
        documents: [],
      });

    const result = await service.submit(
      'u1',
      { fullNameAsOnId: 'Test User', nationalId: '1234567890' },
      [{ buffer: Buffer.from('x'), mimetype: 'image/jpeg', size: 10 } as Express.Multer.File],
    );

    expect(storage.putPrivateObject).toHaveBeenCalled();
    expect(notifications.create).toHaveBeenCalled();
    expect(result.status).toBe(IdentityVerificationStatus.PENDING);
    expect(result.identityVerified).toBe(false);
  });

  it('admin approve sets VERIFIED with expiry', async () => {
    prisma.freelancerIdentityVerification.findUnique
      .mockResolvedValueOnce({
        id: 'ver-1',
        userId: 'u1',
        status: IdentityVerificationStatus.PENDING,
      })
      .mockResolvedValueOnce({
        id: 'ver-1',
        userId: 'u1',
        status: IdentityVerificationStatus.VERIFIED,
        documents: [],
        user: { id: 'u1', email: 'a@b.c', profile: null },
      });

    await service.approve('admin-1', 'ver-1');
    expect(audit.log).toHaveBeenCalled();
    expect(notifications.create).toHaveBeenCalled();
  });

  it('unauthorized approve path: only PENDING can be approved', async () => {
    prisma.freelancerIdentityVerification.findUnique.mockResolvedValue({
      id: 'ver-1',
      userId: 'u1',
      status: IdentityVerificationStatus.VERIFIED,
    });
    await expect(service.approve('admin-1', 'ver-1')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('isIdentityVerified true only for VERIFIED non-expired', async () => {
    prisma.freelancerIdentityVerification.findUnique.mockResolvedValue({
      status: IdentityVerificationStatus.VERIFIED,
      expiresAt: new Date(Date.now() + 86_400_000),
    });
    expect(await service.isIdentityVerified('u1')).toBe(true);

    prisma.freelancerIdentityVerification.findUnique.mockResolvedValue({
      status: IdentityVerificationStatus.PENDING,
      expiresAt: null,
    });
    expect(await service.isIdentityVerified('u1')).toBe(false);
  });
});

describe('SubscriptionsService activation rules', () => {
  let prisma: {
    subscriptionPlan: { findFirst: ReturnType<typeof vi.fn> };
    freelancerSubscription: {
      findFirst: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      findUniqueOrThrow: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    payment: {
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
    };
    freelancerProfile: { updateMany: ReturnType<typeof vi.fn> };
    productAnalyticsEvent: { create: ReturnType<typeof vi.fn> };
    user: { findUnique: ReturnType<typeof vi.fn> };
    $transaction: ReturnType<typeof vi.fn>;
  };
  let notifications: { create: ReturnType<typeof vi.fn> };
  let audit: { log: ReturnType<typeof vi.fn> };
  let platformPolicy: { isFeatureEnabled: ReturnType<typeof vi.fn> };
  let entitlements: {
    getCurrentAccess: ReturnType<typeof vi.fn>;
    formatPlan: ReturnType<typeof vi.fn>;
  };
  let configService: { get: ReturnType<typeof vi.fn> };
  let paymentProvider: {
    name: string;
    capabilities: { supportsSyncCapture: boolean };
    createPayment: ReturnType<typeof vi.fn>;
    createCheckout: ReturnType<typeof vi.fn>;
  };
  let paymentFulfillment: { fulfillSucceededPayment: ReturnType<typeof vi.fn> };
  let service: SubscriptionsService;

  const plan = {
    id: 'plan-1',
    code: PRO_PLAN_CODE,
    nameAr: 'ليبي فريلانس برو',
    nameEn: 'Libyan Freelance Pro',
    price: 49 as never,
    currency: 'LYD',
    durationDays: 30,
    portfolioItemLimit: 40,
    visibilityWeight: 1,
    rankingBoostWeight: 1,
    proposalQuotaMonthly: 60,
    monthlyPointsGrant: 0,
    badgeKey: 'pro',
    featuresJson: { statistics: true },
    isActive: true,
    sortOrder: 2,
  };

  beforeEach(() => {
    prisma = {
      subscriptionPlan: { findFirst: vi.fn().mockResolvedValue(plan) },
      freelancerSubscription: {
        findFirst: vi.fn().mockResolvedValue(null),
        findUnique: vi.fn(),
        findUniqueOrThrow: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      payment: {
        create: vi.fn(),
        update: vi.fn(),
        findUnique: vi.fn(),
      },
      freelancerProfile: { updateMany: vi.fn() },
      productAnalyticsEvent: { create: vi.fn() },
      user: {
        findUnique: vi.fn().mockResolvedValue({
          role: Role.FREELANCER,
          profile: { freelancerProfile: { id: 'fp1' } },
        }),
      },
      $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => {
        const tx = {
          payment: {
            create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({
              id: 'pay-1',
              ...data,
              metadata: data.metadata ?? {},
            })),
            update: vi.fn(async ({ data }: { data: unknown }) => data),
          },
          freelancerSubscription: {
            create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({
              id: 'sub-1',
              ...data,
              plan,
              payment: { id: 'pay-1' },
            })),
            update: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({
              id: 'sub-1',
              userId: 'u1',
              planId: 'plan-1',
              paymentId: 'pay-1',
              createdAt: new Date(),
              updatedAt: new Date(),
              cancelledAt: null,
              plan,
              payment: {
                id: 'pay-1',
                status: PaymentStatus.SUCCEEDED,
                amount: plan.price,
                currency: 'LYD',
                provider: 'simulated',
                paidAt: new Date(),
              },
              ...data,
            })),
            findFirst: vi.fn().mockResolvedValue(null),
            updateMany: vi.fn(),
          },
          freelancerProfile: { updateMany: vi.fn() },
          productAnalyticsEvent: { create: vi.fn() },
          subscriptionAdminAction: { create: vi.fn() },
          adminAuditLog: { create: vi.fn() },
        };
        return fn(tx);
      }),
    };
    notifications = { create: vi.fn() };
    audit = { log: vi.fn() };
    platformPolicy = { isFeatureEnabled: vi.fn().mockResolvedValue(true) };
    entitlements = {
      getCurrentAccess: vi.fn().mockResolvedValue({
        kind: 'NONE',
        canSubmitProposal: false,
        isExpired: true,
        plan: null,
        trialDaysRemaining: null,
        proposalLimit: 0,
        proposalUsed: 0,
        proposalRemaining: 0,
        periodKey: '2026-09',
      }),
      formatPlan: vi.fn((p: typeof plan) => ({
        id: p.id,
        code: p.code,
        nameAr: p.nameAr,
        nameEn: p.nameEn,
        price: Number(p.price),
        currency: p.currency,
        durationDays: p.durationDays,
        proposalQuotaMonthly: p.proposalQuotaMonthly ?? 20,
        monthlyPointsGrant: p.monthlyPointsGrant ?? 0,
        visibilityWeight: p.visibilityWeight ?? 0,
        portfolioItemLimit: p.portfolioItemLimit,
        badgeKey: p.badgeKey ?? null,
        features: {},
        isActive: p.isActive,
        sortOrder: p.sortOrder ?? 0,
      })),
    };
    configService = { get: vi.fn().mockReturnValue('test') };
    paymentProvider = {
      name: 'simulated',
      capabilities: { supportsSyncCapture: true },
      createPayment: vi.fn().mockResolvedValue({
        status: 'succeeded',
        providerReference: 'sim_1',
      }),
      createCheckout: vi.fn().mockResolvedValue({
        status: 'pending',
        providerReference: 'sim_1',
        checkoutUrl: 'https://pay.example/checkout',
      }),
    };
    paymentFulfillment = {
      fulfillSucceededPayment: vi.fn().mockResolvedValue({ fulfilled: true }),
    };
    service = new SubscriptionsService(
      prisma as never,
      notifications as never,
      audit as never,
      platformPolicy as never,
      entitlements as never,
      configService as never,
      paymentProvider as never,
      paymentFulfillment as never,
    );
  });

  it('exposes Pro plan price from backend (49 LYD)', async () => {
    const result = await service.getProPlan();
    expect(result.code).toBe(PRO_PLAN_CODE);
    expect(result.price).toBe(49);
    expect(result.currency).toBe('LYD');
    expect(result.durationDays).toBe(30);
  });

  it('allows checkout without identity verification', async () => {
    entitlements.getCurrentAccess.mockResolvedValue({
      kind: 'NONE',
      canSubmitProposal: false,
      isExpired: true,
      plan: null,
      subscriptionId: null,
    });
    const result = await service.checkout('u1', { planCode: PRO_PLAN_CODE });
    expect(result.paymentId).toBeTruthy();
    expect(result.plan.code).toBe(PRO_PLAN_CODE);
  });

  it('activates only after confirmed SUCCEEDED payment', async () => {
    prisma.payment.findUnique.mockResolvedValue({
      id: 'pay-1',
      purpose: PaymentPurpose.SUBSCRIPTION,
      status: PaymentStatus.PENDING,
      paidAt: null,
      freelancerSubscription: {
        id: 'sub-1',
        userId: 'u1',
        status: FreelancerSubscriptionStatus.PENDING_PAYMENT,
        plan,
      },
    });
    await expect(service.activateFromConfirmedPayment('pay-1')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('activates Pro for 30 days from activation timestamp', async () => {
    const before = Date.now();
    prisma.payment.findUnique.mockResolvedValue({
      id: 'pay-1',
      purpose: PaymentPurpose.SUBSCRIPTION,
      status: PaymentStatus.SUCCEEDED,
      paidAt: new Date(),
      freelancerSubscription: {
        id: 'sub-1',
        userId: 'u1',
        status: FreelancerSubscriptionStatus.PENDING_PAYMENT,
        plan,
      },
    });
    prisma.freelancerSubscription.findFirst.mockResolvedValue(null);

    const result = await service.activateFromConfirmedPayment('pay-1');
    expect(result.status).toBe(FreelancerSubscriptionStatus.ACTIVE);
    expect(result.expiresAt).toBeTruthy();
    const expires = new Date(result.expiresAt!).getTime();
    const expectedMin = before + 29 * 86_400_000;
    const expectedMax = Date.now() + 31 * 86_400_000;
    expect(expires).toBeGreaterThan(expectedMin);
    expect(expires).toBeLessThan(expectedMax);
  });

  it('renewal extends from max(now, currentExpiresAt)', async () => {
    const currentExpires = new Date(Date.now() + 10 * 86_400_000);
    prisma.payment.findUnique.mockResolvedValue({
      id: 'pay-2',
      purpose: PaymentPurpose.SUBSCRIPTION,
      status: PaymentStatus.SUCCEEDED,
      paidAt: new Date(),
      freelancerSubscription: {
        id: 'sub-2',
        userId: 'u1',
        status: FreelancerSubscriptionStatus.PENDING_PAYMENT,
        plan,
      },
    });
    prisma.freelancerSubscription.findFirst.mockResolvedValue({
      id: 'sub-old',
      expiresAt: currentExpires,
      status: FreelancerSubscriptionStatus.ACTIVE,
    });

    const result = await service.activateFromConfirmedPayment('pay-2');
    const expires = new Date(result.expiresAt!).getTime();
    const expected = currentExpires.getTime() + 30 * 86_400_000;
    expect(Math.abs(expires - expected)).toBeLessThan(2000);
  });

  it('hasActivePro false when expired even if status still ACTIVE in stale row', async () => {
    entitlements.getCurrentAccess.mockResolvedValue({
      kind: 'NONE',
      canSubmitProposal: false,
      isExpired: true,
    });
    expect(await service.hasActivePro('u1')).toBe(false);
  });

  it('blocks simulated activation in production without flag', async () => {
    configService.get.mockReturnValue('production');
    platformPolicy.isFeatureEnabled.mockResolvedValue(false);
    delete process.env.ALLOW_SIMULATED_PRO_ACTIVATION;

    prisma.payment.findUnique.mockResolvedValue({
      id: 'pay-1',
      purpose: PaymentPurpose.SUBSCRIPTION,
      status: PaymentStatus.SUCCEEDED,
      paidAt: new Date(),
      freelancerSubscription: {
        id: 'sub-1',
        userId: 'u1',
        status: FreelancerSubscriptionStatus.PENDING_PAYMENT,
        plan,
      },
    });

    await expect(service.activateFromConfirmedPayment('pay-1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('admin extend records actor, old/new expiry, reason', async () => {
    const oldExpires = new Date('2026-10-01T00:00:00.000Z');
    prisma.freelancerSubscription.findUnique
      .mockResolvedValueOnce({
        id: 'sub-1',
        userId: 'u1',
        expiresAt: oldExpires,
        startedAt: new Date('2026-09-01T00:00:00.000Z'),
        plan,
      })
      .mockResolvedValueOnce({
        id: 'sub-1',
        userId: 'u1',
        status: FreelancerSubscriptionStatus.ACTIVE,
        startedAt: new Date(),
        expiresAt: new Date('2026-11-01T00:00:00.000Z'),
        cancelledAt: null,
        paymentId: 'pay-1',
        planId: 'plan-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        plan,
        payment: null,
        adminActions: [
          {
            actorId: 'admin-1',
            action: 'EXTEND',
            reason: 'courtesy extension for outage',
            oldExpiresAt: oldExpires,
            newExpiresAt: new Date('2026-11-01T00:00:00.000Z'),
          },
        ],
        user: {
          id: 'u1',
          email: 'a@b.c',
          profile: null,
        },
      });

    const result = await service.adminExtend('admin-1', 'sub-1', {
      reason: 'courtesy extension for outage',
      extraDays: 30,
    });
    expect(result.adminActions[0].reason).toContain('courtesy');
    expect(audit.log).toHaveBeenCalled();
  });
});
