import {
  ForbiddenException,
  Injectable,
  Logger,
  PreconditionFailedException,
} from '@nestjs/common';
import {
  FreelancerSubscriptionStatus,
  Prisma,
  Role,
  SubscriptionSource,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  PROPOSAL_BLOCKED_AR,
  PROPOSAL_QUOTA_EXCEEDED_AR,
  STARTER_PLAN_CODE,
  TRIAL_DURATION_DAYS,
  TRIAL_MIGRATION_BATCH,
  addDays,
  calendarMonthPeriodKey,
  type SubscriptionFeatureKey,
} from './subscriptions.constants.js';

export type AccessKind = 'NONE' | 'TRIAL' | 'PAID' | 'ADMIN_GRANT';

export interface PlanEntitlements {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  price: number;
  currency: string;
  durationDays: number;
  proposalQuotaMonthly: number;
  monthlyPointsGrant: number;
  visibilityWeight: number;
  portfolioItemLimit: number;
  badgeKey: string | null;
  features: Record<string, unknown>;
  isActive: boolean;
  sortOrder: number;
}

export interface CurrentAccess {
  kind: AccessKind;
  canSubmitProposal: boolean;
  isExpired: boolean;
  plan: PlanEntitlements | null;
  subscriptionId: string | null;
  status: FreelancerSubscriptionStatus | 'TRIAL_USER' | null;
  startedAt: Date | null;
  expiresAt: Date | null;
  trialStartedAt: Date | null;
  trialEndsAt: Date | null;
  trialDaysRemaining: number | null;
  proposalLimit: number;
  proposalUsed: number;
  proposalRemaining: number;
  periodKey: string;
  visibilityWeight: number;
}

type Tx = Prisma.TransactionClient;

@Injectable()
export class SubscriptionEntitlementService {
  private readonly logger = new Logger(SubscriptionEntitlementService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getCurrentSubscription(userId: string, asOf: Date = new Date()) {
    return this.prisma.freelancerSubscription.findFirst({
      where: {
        userId,
        status: {
          in: [
            FreelancerSubscriptionStatus.TRIAL,
            FreelancerSubscriptionStatus.ACTIVE,
            FreelancerSubscriptionStatus.PAST_DUE,
          ],
        },
        OR: [{ expiresAt: null }, { expiresAt: { gt: asOf } }],
      },
      include: { plan: true, payment: true },
      orderBy: [{ expiresAt: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async getTrialStatus(userId: string, asOf: Date = new Date()) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
        trialStartedAt: true,
        trialEndsAt: true,
        hasUsedTrial: true,
      },
    });
    if (!user || user.role !== Role.FREELANCER) {
      return {
        eligible: false,
        active: false,
        startedAt: null as Date | null,
        endsAt: null as Date | null,
        daysRemaining: null as number | null,
        hasUsedTrial: false,
      };
    }
    const endsAt = user.trialEndsAt;
    const active = !!endsAt && endsAt > asOf;
    const daysRemaining = active
      ? Math.max(0, Math.ceil((endsAt!.getTime() - asOf.getTime()) / 86_400_000))
      : 0;
    return {
      eligible: user.role === Role.FREELANCER,
      active,
      startedAt: user.trialStartedAt,
      endsAt: user.trialEndsAt,
      daysRemaining: active ? daysRemaining : null,
      hasUsedTrial: user.hasUsedTrial,
    };
  }

  formatPlan(plan: {
    id: string;
    code: string;
    nameAr: string;
    nameEn: string;
    price: Prisma.Decimal | number;
    currency: string;
    durationDays: number;
    proposalQuotaMonthly: number;
    monthlyPointsGrant: number;
    visibilityWeight: number;
    portfolioItemLimit: number;
    badgeKey: string | null;
    featuresJson: Prisma.JsonValue | null;
    isActive: boolean;
    sortOrder: number;
  }): PlanEntitlements {
    return {
      id: plan.id,
      code: plan.code,
      nameAr: plan.nameAr,
      nameEn: plan.nameEn,
      price: Number(plan.price),
      currency: plan.currency,
      durationDays: plan.durationDays,
      proposalQuotaMonthly: plan.proposalQuotaMonthly,
      monthlyPointsGrant: plan.monthlyPointsGrant,
      visibilityWeight: plan.visibilityWeight,
      portfolioItemLimit: plan.portfolioItemLimit,
      badgeKey: plan.badgeKey,
      features:
        plan.featuresJson && typeof plan.featuresJson === 'object' && !Array.isArray(plan.featuresJson)
          ? (plan.featuresJson as Record<string, unknown>)
          : {},
      isActive: plan.isActive,
      sortOrder: plan.sortOrder,
    };
  }

  async getProposalUsage(userId: string, asOf: Date = new Date()) {
    const periodKey = calendarMonthPeriodKey(asOf);
    const row = await this.prisma.proposalUsagePeriod.findUnique({
      where: { userId_periodKey: { userId, periodKey } },
    });
    return { periodKey, used: row?.usedCount ?? 0 };
  }

  async getProposalLimit(userId: string, asOf: Date = new Date()): Promise<number> {
    const access = await this.getCurrentAccess(userId, asOf);
    return access.proposalLimit;
  }

  async getRemainingProposalQuota(userId: string, asOf: Date = new Date()) {
    const access = await this.getCurrentAccess(userId, asOf);
    return access.proposalRemaining;
  }

  async canSubmitProposal(userId: string, asOf: Date = new Date()) {
    const access = await this.getCurrentAccess(userId, asOf);
    return {
      allowed: access.canSubmitProposal && access.proposalRemaining > 0,
      access,
      reason: !access.canSubmitProposal
        ? ('EXPIRED' as const)
        : access.proposalRemaining <= 0
          ? ('QUOTA' as const)
          : ('OK' as const),
    };
  }

  async assertCanSubmitProposal(userId: string, asOf: Date = new Date()) {
    const result = await this.canSubmitProposal(userId, asOf);
    if (result.reason === 'EXPIRED') {
      throw new ForbiddenException({
        message: PROPOSAL_BLOCKED_AR,
        code: 'SUBSCRIPTION_REQUIRED',
        messageEn: 'Choose a plan to continue submitting proposals.',
      });
    }
    if (result.reason === 'QUOTA') {
      throw new ForbiddenException({
        message: PROPOSAL_QUOTA_EXCEEDED_AR,
        code: 'PROPOSAL_QUOTA_EXCEEDED',
      });
    }
    return result.access;
  }

  /**
   * Atomically consume one proposal slot. Call inside the same transaction that creates the proposal.
   */
  async consumeProposalQuota(userId: string, tx: Tx, asOf: Date = new Date()) {
    const access = await this.buildAccessSnapshot(userId, asOf, tx);
    if (!access.canSubmitProposal) {
      throw new ForbiddenException({
        message: PROPOSAL_BLOCKED_AR,
        code: 'SUBSCRIPTION_REQUIRED',
      });
    }
    if (access.proposalLimit <= 0) {
      throw new ForbiddenException({
        message: PROPOSAL_BLOCKED_AR,
        code: 'SUBSCRIPTION_REQUIRED',
      });
    }

    const periodKey = access.periodKey;
    await tx.proposalUsagePeriod.upsert({
      where: { userId_periodKey: { userId, periodKey } },
      create: { userId, periodKey, usedCount: 0 },
      update: {},
    });

    const updated = await tx.$executeRaw`
      UPDATE "ProposalUsagePeriod"
      SET "usedCount" = "usedCount" + 1,
          "updatedAt" = NOW()
      WHERE "userId" = ${userId}
        AND "periodKey" = ${periodKey}
        AND "usedCount" < ${access.proposalLimit}
    `;

    if (updated !== 1) {
      throw new ForbiddenException({
        message: PROPOSAL_QUOTA_EXCEEDED_AR,
        code: 'PROPOSAL_QUOTA_EXCEEDED',
      });
    }
  }

  async canUseFeature(
    userId: string,
    feature: SubscriptionFeatureKey,
    asOf: Date = new Date(),
  ): Promise<boolean> {
    const access = await this.getCurrentAccess(userId, asOf);
    if (!access.plan) return false;
    const value = access.plan.features[feature];
    return value === true;
  }

  async getVisibilityWeight(userId: string, asOf: Date = new Date()): Promise<number> {
    const access = await this.getCurrentAccess(userId, asOf);
    return access.visibilityWeight;
  }

  async getCurrentAccess(userId: string, asOf: Date = new Date()): Promise<CurrentAccess> {
    return this.buildAccessSnapshot(userId, asOf, this.prisma);
  }

  private async buildAccessSnapshot(
    userId: string,
    asOf: Date,
    db: PrismaService | Tx,
  ): Promise<CurrentAccess> {
    const periodKey = calendarMonthPeriodKey(asOf);
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
        trialStartedAt: true,
        trialEndsAt: true,
        hasUsedTrial: true,
      },
    });

    const empty: CurrentAccess = {
      kind: 'NONE',
      canSubmitProposal: false,
      isExpired: true,
      plan: null,
      subscriptionId: null,
      status: null,
      startedAt: null,
      expiresAt: null,
      trialStartedAt: user?.trialStartedAt ?? null,
      trialEndsAt: user?.trialEndsAt ?? null,
      trialDaysRemaining: null,
      proposalLimit: 0,
      proposalUsed: 0,
      proposalRemaining: 0,
      periodKey,
      visibilityWeight: 0,
    };

    if (!user || user.role !== Role.FREELANCER) {
      return { ...empty, isExpired: false, canSubmitProposal: false };
    }

    const usage = await db.proposalUsagePeriod.findUnique({
      where: { userId_periodKey: { userId, periodKey } },
    });
    const used = usage?.usedCount ?? 0;

    const paid = await db.freelancerSubscription.findFirst({
      where: {
        userId,
        status: {
          in: [
            FreelancerSubscriptionStatus.ACTIVE,
            FreelancerSubscriptionStatus.TRIAL,
            FreelancerSubscriptionStatus.PAST_DUE,
          ],
        },
        OR: [{ expiresAt: null }, { expiresAt: { gt: asOf } }],
      },
      include: { plan: true },
      orderBy: [{ expiresAt: 'desc' }, { createdAt: 'desc' }],
    });

    if (paid?.plan) {
      const plan = this.formatPlan(paid.plan);
      const limit = plan.proposalQuotaMonthly;
      const kind: AccessKind =
        paid.source === SubscriptionSource.ADMIN_GRANT
          ? 'ADMIN_GRANT'
          : paid.status === FreelancerSubscriptionStatus.TRIAL ||
              paid.source === SubscriptionSource.TRIAL
            ? 'TRIAL'
            : 'PAID';
      const trialDaysRemaining =
        user.trialEndsAt && user.trialEndsAt > asOf
          ? Math.max(
              0,
              Math.ceil((user.trialEndsAt.getTime() - asOf.getTime()) / 86_400_000),
            )
          : paid.status === FreelancerSubscriptionStatus.TRIAL && paid.expiresAt
            ? Math.max(
                0,
                Math.ceil((paid.expiresAt.getTime() - asOf.getTime()) / 86_400_000),
              )
            : null;

      return {
        kind,
        canSubmitProposal: true,
        isExpired: false,
        plan,
        subscriptionId: paid.id,
        status: paid.status,
        startedAt: paid.startedAt,
        expiresAt: paid.expiresAt,
        trialStartedAt: user.trialStartedAt,
        trialEndsAt: user.trialEndsAt,
        trialDaysRemaining,
        proposalLimit: limit,
        proposalUsed: used,
        proposalRemaining: Math.max(0, limit - used),
        periodKey,
        visibilityWeight: plan.visibilityWeight,
      };
    }

    // User-level trial window (even if subscription row missing)
    if (user.trialEndsAt && user.trialEndsAt > asOf) {
      const starter = await db.subscriptionPlan.findFirst({
        where: { code: STARTER_PLAN_CODE, isActive: true },
      });
      const plan = starter ? this.formatPlan(starter) : null;
      const limit = plan?.proposalQuotaMonthly ?? 20;
      const daysRemaining = Math.max(
        0,
        Math.ceil((user.trialEndsAt.getTime() - asOf.getTime()) / 86_400_000),
      );
      return {
        kind: 'TRIAL',
        canSubmitProposal: true,
        isExpired: false,
        plan,
        subscriptionId: null,
        status: 'TRIAL_USER',
        startedAt: user.trialStartedAt,
        expiresAt: user.trialEndsAt,
        trialStartedAt: user.trialStartedAt,
        trialEndsAt: user.trialEndsAt,
        trialDaysRemaining: daysRemaining,
        proposalLimit: limit,
        proposalUsed: used,
        proposalRemaining: Math.max(0, limit - used),
        periodKey,
        visibilityWeight: plan?.visibilityWeight ?? 1,
      };
    }

    return {
      ...empty,
      proposalUsed: used,
      proposalRemaining: 0,
      isExpired: true,
      canSubmitProposal: false,
    };
  }

  /**
   * Grant a 30-day trial for a newly registered freelancer.
   * Idempotent if hasUsedTrial already true.
   */
  async grantRegistrationTrial(userId: string, registeredAt: Date, tx?: Tx) {
    const db = tx ?? this.prisma;
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, hasUsedTrial: true, trialEndsAt: true },
    });
    if (!user || user.role !== Role.FREELANCER) return null;
    if (user.hasUsedTrial && user.trialEndsAt) return null;

    const starter = await db.subscriptionPlan.findFirst({
      where: { code: STARTER_PLAN_CODE, isActive: true },
    });
    if (!starter) {
      this.logger.warn('STARTER plan missing — cannot grant registration trial');
      throw new PreconditionFailedException('خطة البداية غير متاحة');
    }

    const startedAt = registeredAt;
    const endsAt = addDays(startedAt, TRIAL_DURATION_DAYS);

    await db.user.update({
      where: { id: userId },
      data: {
        trialStartedAt: startedAt,
        trialEndsAt: endsAt,
        hasUsedTrial: true,
      },
    });

    const existingTrialSub = await db.freelancerSubscription.findFirst({
      where: {
        userId,
        source: SubscriptionSource.TRIAL,
        status: FreelancerSubscriptionStatus.TRIAL,
      },
    });
    if (existingTrialSub) return existingTrialSub;

    return db.freelancerSubscription.create({
      data: {
        userId,
        planId: starter.id,
        status: FreelancerSubscriptionStatus.TRIAL,
        source: SubscriptionSource.TRIAL,
        startedAt,
        expiresAt: endsAt,
        metadata: { grantedBy: 'registration' } as Prisma.InputJsonValue,
      },
      include: { plan: true },
    });
  }

  /**
   * Idempotent go-live backfill for freelancers without an active paid subscription.
   */
  async backfillExistingFreelancerTrials(goLiveAt: Date = new Date()) {
    const starter = await this.prisma.subscriptionPlan.findFirst({
      where: { code: STARTER_PLAN_CODE, isActive: true },
    });
    if (!starter) throw new PreconditionFailedException('خطة البداية غير متاحة');

    const endsAt = addDays(goLiveAt, TRIAL_DURATION_DAYS);
    const freelancers = await this.prisma.user.findMany({
      where: { role: Role.FREELANCER },
      select: { id: true, hasUsedTrial: true, trialEndsAt: true },
    });

    let granted = 0;
    let skipped = 0;

    for (const freelancer of freelancers) {
      const activePaid = await this.prisma.freelancerSubscription.findFirst({
        where: {
          userId: freelancer.id,
          status: FreelancerSubscriptionStatus.ACTIVE,
          OR: [{ expiresAt: null }, { expiresAt: { gt: goLiveAt } }],
          source: { in: [SubscriptionSource.PURCHASE, SubscriptionSource.ADMIN_GRANT, SubscriptionSource.MIGRATION] },
        },
      });

      // Also treat legacy ACTIVE without source filter (source defaults PURCHASE)
      const anyActivePaid = await this.prisma.freelancerSubscription.findFirst({
        where: {
          userId: freelancer.id,
          status: FreelancerSubscriptionStatus.ACTIVE,
          OR: [{ expiresAt: null }, { expiresAt: { gt: goLiveAt } }],
          NOT: { source: SubscriptionSource.TRIAL },
        },
      });

      if (activePaid || anyActivePaid) {
        skipped += 1;
        continue;
      }

      const alreadyBackfilled = await this.prisma.freelancerSubscription.findFirst({
        where: {
          userId: freelancer.id,
          migrationBatch: TRIAL_MIGRATION_BATCH,
        },
      });
      if (alreadyBackfilled) {
        skipped += 1;
        continue;
      }

      await this.prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: freelancer.id },
          data: {
            trialStartedAt: goLiveAt,
            trialEndsAt: endsAt,
            hasUsedTrial: true,
          },
        });
        await tx.freelancerSubscription.create({
          data: {
            userId: freelancer.id,
            planId: starter.id,
            status: FreelancerSubscriptionStatus.TRIAL,
            source: SubscriptionSource.TRIAL,
            startedAt: goLiveAt,
            expiresAt: endsAt,
            migrationBatch: TRIAL_MIGRATION_BATCH,
            metadata: {
              grantedBy: 'golive-backfill',
              goLiveAt: goLiveAt.toISOString(),
            } as Prisma.InputJsonValue,
          },
        });
      });
      granted += 1;
    }

    this.logger.log(
      `Trial backfill complete: granted=${granted} skipped=${skipped} goLive=${goLiveAt.toISOString()}`,
    );
    return { granted, skipped, goLiveAt, endsAt, batch: TRIAL_MIGRATION_BATCH };
  }

  async grantMonthlyPlanPoints(
    userId: string,
    periodKey: string,
    creditFn: (args: {
      userId: string;
      amount: number;
      reasonKey: string;
      descriptionAr: string;
      referenceId: string;
      fulfillmentKey: string;
    }) => Promise<unknown>,
  ) {
    const access = await this.getCurrentAccess(userId);
    const amount = access.plan?.monthlyPointsGrant ?? 0;
    if (amount <= 0 || !access.plan) return { credited: false, amount: 0 };

    const fulfillmentKey = `plan-points:${userId}:${access.plan.code}:${periodKey}`;
    await creditFn({
      userId,
      amount,
      reasonKey: 'PLAN_MONTHLY_POINTS',
      descriptionAr: `نقاط شهرية لباقة ${access.plan.nameAr}`,
      referenceId: `${access.plan.code}:${periodKey}`,
      fulfillmentKey,
    });
    return { credited: true, amount };
  }

  async expireDueSubscriptions(asOf: Date = new Date()) {
    const due = await this.prisma.freelancerSubscription.findMany({
      where: {
        status: {
          in: [
            FreelancerSubscriptionStatus.ACTIVE,
            FreelancerSubscriptionStatus.TRIAL,
            FreelancerSubscriptionStatus.PAST_DUE,
          ],
        },
        expiresAt: { lte: asOf },
      },
      select: { id: true, userId: true, status: true },
    });

    let expired = 0;
    for (const row of due) {
      await this.prisma.freelancerSubscription.update({
        where: { id: row.id },
        data: { status: FreelancerSubscriptionStatus.EXPIRED },
      });

      // Clear boost if no other active access
      const still = await this.getCurrentAccess(row.userId, asOf);
      if (!still.canSubmitProposal) {
        await this.prisma.freelancerProfile.updateMany({
          where: { profile: { userId: row.userId } },
          data: { proBoostScore: 0 },
        });
      }
      expired += 1;
    }

    // Sync user trial end → no separate status; entitlement reads dates
    this.logger.log(`expireDueSubscriptions: expired=${expired} asOf=${asOf.toISOString()}`);
    return { expired };
  }
}
