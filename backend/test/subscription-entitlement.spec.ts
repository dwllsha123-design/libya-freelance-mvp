import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  FreelancerSubscriptionStatus,
  Role,
  SubscriptionSource,
} from '@prisma/client';
import { ForbiddenException } from '@nestjs/common';
import { SubscriptionEntitlementService } from '../src/subscriptions/subscription-entitlement.service.js';
import {
  STARTER_PLAN_CODE,
  TRIAL_DURATION_DAYS,
  addDays,
  calendarMonthPeriodKey,
} from '../src/subscriptions/subscriptions.constants.js';

function makePlan(overrides: Partial<{
  code: string;
  proposalQuotaMonthly: number;
  visibilityWeight: number;
  monthlyPointsGrant: number;
  price: number;
}> = {}) {
  return {
    id: 'plan-1',
    code: overrides.code ?? STARTER_PLAN_CODE,
    nameAr: 'البداية',
    nameEn: 'Starter',
    price: overrides.price ?? 22,
    currency: 'LYD',
    durationDays: 30,
    proposalQuotaMonthly: overrides.proposalQuotaMonthly ?? 20,
    monthlyPointsGrant: overrides.monthlyPointsGrant ?? 0,
    visibilityWeight: overrides.visibilityWeight ?? 1,
    portfolioItemLimit: 20,
    badgeKey: null,
    featuresJson: { messaging: true, publicProfile: true },
    isActive: true,
    sortOrder: 10,
    rankingBoostWeight: 0,
  };
}

describe('SubscriptionEntitlementService', () => {
  const prisma = {
    user: { findUnique: vi.fn(), update: vi.fn(), findMany: vi.fn() },
    freelancerSubscription: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
    subscriptionPlan: { findFirst: vi.fn() },
    proposalUsagePeriod: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    freelancerProfile: { updateMany: vi.fn() },
    $transaction: vi.fn(),
    $executeRaw: vi.fn(),
  };

  let service: SubscriptionEntitlementService;
  const previousGoLive = process.env.SUBSCRIPTIONS_GO_LIVE_AT;

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.SUBSCRIPTIONS_GO_LIVE_AT;
    service = new SubscriptionEntitlementService(prisma as never);
  });

  afterEach(() => {
    if (previousGoLive === undefined) {
      delete process.env.SUBSCRIPTIONS_GO_LIVE_AT;
    } else {
      process.env.SUBSCRIPTIONS_GO_LIVE_AT = previousGoLive;
    }
  });

  it('allows proposals during active user trial with Starter quota', async () => {
    process.env.SUBSCRIPTIONS_GO_LIVE_AT = '2026-01-01T00:00:00.000Z';
    const now = new Date('2026-09-12T12:00:00.000Z');
    const ends = addDays(now, 10);
    prisma.user.findUnique.mockResolvedValue({
      role: Role.FREELANCER,
      trialStartedAt: now,
      trialEndsAt: ends,
      hasUsedTrial: true,
    });
    prisma.freelancerSubscription.findFirst.mockResolvedValue(null);
    prisma.subscriptionPlan.findFirst.mockResolvedValue(makePlan());
    prisma.proposalUsagePeriod.findUnique.mockResolvedValue({ usedCount: 3 });

    const access = await service.getCurrentAccess('u1', now);
    expect(access.kind).toBe('TRIAL');
    expect(access.canSubmitProposal).toBe(true);
    expect(access.proposalLimit).toBe(20);
    expect(access.proposalUsed).toBe(3);
    expect(access.proposalRemaining).toBe(17);
    expect(access.trialDaysRemaining).toBe(10);
  });

  it('before commercial go-live allows freelancers without starting a trial', async () => {
    const now = new Date('2026-09-12T12:00:00.000Z');
    prisma.user.findUnique.mockResolvedValue({
      role: Role.FREELANCER,
      trialStartedAt: null,
      trialEndsAt: null,
      hasUsedTrial: false,
    });
    prisma.freelancerSubscription.findFirst.mockResolvedValue(null);
    prisma.proposalUsagePeriod.findUnique.mockResolvedValue(null);

    const access = await service.getCurrentAccess('u1', now);
    expect(access.kind).toBe('PRE_COMMERCIAL');
    expect(access.canSubmitProposal).toBe(true);
    expect(access.trialDaysRemaining).toBeNull();
    await expect(service.assertCanSubmitProposal('u1', now)).resolves.toBeTruthy();
  });

  it('skips registration trial grant before commercial go-live', async () => {
    const registeredAt = new Date('2026-09-01T08:00:00.000Z');
    const result = await service.grantRegistrationTrial('u1', registeredAt);
    expect(result).toBeNull();
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('blocks new proposals when trial and paid access expired after go-live', async () => {
    process.env.SUBSCRIPTIONS_GO_LIVE_AT = '2026-01-01T00:00:00.000Z';
    const now = new Date('2026-09-12T12:00:00.000Z');
    prisma.user.findUnique.mockResolvedValue({
      role: Role.FREELANCER,
      trialStartedAt: addDays(now, -40),
      trialEndsAt: addDays(now, -10),
      hasUsedTrial: true,
    });
    prisma.freelancerSubscription.findFirst.mockResolvedValue(null);
    prisma.proposalUsagePeriod.findUnique.mockResolvedValue(null);

    const result = await service.canSubmitProposal('u1', now);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('EXPIRED');
    await expect(service.assertCanSubmitProposal('u1', now)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('clients never get proposal subscription access requirements via role check', async () => {
    prisma.user.findUnique.mockResolvedValue({
      role: Role.CLIENT,
      trialStartedAt: null,
      trialEndsAt: null,
      hasUsedTrial: false,
    });
    const access = await service.getCurrentAccess('c1');
    expect(access.kind).toBe('NONE');
    expect(access.canSubmitProposal).toBe(false);
  });

  it('enforces Pro quota of 60', async () => {
    process.env.SUBSCRIPTIONS_GO_LIVE_AT = '2026-01-01T00:00:00.000Z';
    const now = new Date('2026-09-12T12:00:00.000Z');
    prisma.user.findUnique.mockResolvedValue({
      role: Role.FREELANCER,
      trialStartedAt: null,
      trialEndsAt: null,
      hasUsedTrial: true,
    });
    prisma.freelancerSubscription.findFirst.mockResolvedValue({
      id: 'sub-1',
      status: FreelancerSubscriptionStatus.ACTIVE,
      source: SubscriptionSource.PURCHASE,
      startedAt: now,
      expiresAt: addDays(now, 20),
      plan: makePlan({ code: 'PRO', proposalQuotaMonthly: 60, visibilityWeight: 5 }),
    });
    prisma.proposalUsagePeriod.findUnique.mockResolvedValue({ usedCount: 60 });

    const result = await service.canSubmitProposal('u1', now);
    expect(result.access.proposalLimit).toBe(60);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('QUOTA');
  });

  it('enforces Premium quota of 120', async () => {
    process.env.SUBSCRIPTIONS_GO_LIVE_AT = '2026-01-01T00:00:00.000Z';
    const now = new Date('2026-09-12T12:00:00.000Z');
    prisma.user.findUnique.mockResolvedValue({
      role: Role.FREELANCER,
      trialStartedAt: null,
      trialEndsAt: null,
      hasUsedTrial: true,
    });
    prisma.freelancerSubscription.findFirst.mockResolvedValue({
      id: 'sub-2',
      status: FreelancerSubscriptionStatus.ACTIVE,
      source: SubscriptionSource.PURCHASE,
      startedAt: now,
      expiresAt: addDays(now, 20),
      plan: makePlan({
        code: 'PREMIUM',
        proposalQuotaMonthly: 120,
        visibilityWeight: 10,
        price: 72,
      }),
    });
    prisma.proposalUsagePeriod.findUnique.mockResolvedValue({ usedCount: 119 });

    const result = await service.canSubmitProposal('u1', now);
    expect(result.allowed).toBe(true);
    expect(result.access.proposalRemaining).toBe(1);
  });

  it('grantRegistrationTrial sets 30-day window from registration date after go-live', async () => {
    process.env.SUBSCRIPTIONS_GO_LIVE_AT = '2026-08-01T00:00:00.000Z';
    const registeredAt = new Date('2026-09-01T08:00:00.000Z');
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      role: Role.FREELANCER,
      hasUsedTrial: false,
      trialEndsAt: null,
    });
    prisma.subscriptionPlan.findFirst.mockResolvedValue(makePlan());
    prisma.freelancerSubscription.findFirst.mockResolvedValue(null);
    prisma.user.update.mockResolvedValue({});
    prisma.freelancerSubscription.create.mockResolvedValue({
      id: 'trial-sub',
      status: FreelancerSubscriptionStatus.TRIAL,
    });

    await service.grantRegistrationTrial('u1', registeredAt);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: {
        trialStartedAt: registeredAt,
        trialEndsAt: addDays(registeredAt, TRIAL_DURATION_DAYS),
        hasUsedTrial: true,
      },
    });
  });

  it('calendarMonthPeriodKey is stable UTC YYYY-MM', () => {
    expect(calendarMonthPeriodKey(new Date('2026-09-12T23:00:00.000Z'))).toBe(
      '2026-09',
    );
  });
});
