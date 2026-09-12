import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AdminAuditAction,
  FreelancerSubscriptionStatus,
  NotificationType,
  PaymentPurpose,
  PaymentStatus,
  Prisma,
  ProductAnalyticsEventType,
  Role,
  SubscriptionAdminActionType,
  SubscriptionSource,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { AdminAuditService } from '../admin/admin-audit.service.js';
import { PlatformPolicyService } from '../platform/platform-policy.service.js';
import { PAYMENT_PROVIDER } from '../payments/payment.types.js';
import type { PaymentProvider } from '../payments/payment.types.js';
import type { PaymentFulfillmentService } from '../payments/payment-fulfillment.service.js';
import { PAYMENT_FULFILLMENT_SERVICE } from '../payments/payment-fulfillment.tokens.js';
import { SIMULATED_PAYMENT_PROVIDER } from '../payments/providers/simulated-payment.provider.js';
import {
  FREE_PORTFOLIO_ITEM_LIMIT,
  PRO_PLAN_CODE,
  addDays,
  allowSimulatedProductActivation,
} from './subscriptions.constants.js';
import {
  isSubscriptionsCommercialLive,
  resolveSubscriptionsGoLiveAt,
} from './subscriptions-go-live.js';
import { clampProBoostScore } from './ranking.util.js';
import { SubscriptionEntitlementService } from './subscription-entitlement.service.js';
import type {
  CreateSubscriptionPlanDto,
  ExtendSubscriptionDto,
  GrantSubscriptionDto,
  SubscriptionAdminReasonDto,
  UpdateSubscriptionPlanDto,
} from './dto/subscriptions.dto.js';

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly audit: AdminAuditService,
    private readonly platformPolicy: PlatformPolicyService,
    private readonly entitlements: SubscriptionEntitlementService,
    private readonly configService: ConfigService,
    @Inject(PAYMENT_PROVIDER) private readonly paymentProvider: PaymentProvider,
    @Inject(PAYMENT_FULFILLMENT_SERVICE)
    private readonly paymentFulfillment: PaymentFulfillmentService,
  ) {}

  async listActivePlans() {
    const plans = await this.prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { price: 'asc' }],
    });
    return plans.map((plan) => this.formatPlan(plan));
  }

  /** Backward-compatible alias — returns the active PRO plan. */
  async getProPlan() {
    const plan = await this.prisma.subscriptionPlan.findFirst({
      where: { code: PRO_PLAN_CODE, isActive: true },
    });
    if (!plan) throw new NotFoundException('خطة Pro غير متاحة');
    return this.formatPlan(plan);
  }

  async getMine(userId: string) {
    await this.assertFreelancer(userId);
    const access = await this.entitlements.getCurrentAccess(userId);
    const latest = await this.prisma.freelancerSubscription.findFirst({
      where: { userId },
      include: { plan: true, payment: true },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();
    const goLiveAt = resolveSubscriptionsGoLiveAt();
    const commercialLive = isSubscriptionsCommercialLive(now);
    const hasAccess = access.canSubmitProposal && !access.isExpired;
    const paidDaysRemaining =
      access.expiresAt && access.expiresAt > now
        ? Math.max(
            0,
            Math.ceil((access.expiresAt.getTime() - now.getTime()) / 86_400_000),
          )
        : 0;

    return {
      access,
      currentPlan: access.plan,
      trialDaysRemaining: access.trialDaysRemaining,
      quotas: {
        proposalLimit: access.proposalLimit,
        proposalUsed: access.proposalUsed,
        proposalRemaining: access.proposalRemaining,
        periodKey: access.periodKey,
        portfolioItemLimit:
          access.plan?.portfolioItemLimit ?? FREE_PORTFOLIO_ITEM_LIMIT,
        monthlyPointsGrant: access.plan?.monthlyPointsGrant ?? 0,
      },
      requiresIdentityVerification: false,
      hasAccess,
      /** Paid/admin badge only — not true for pre-commercial open access */
      isPro: access.kind === 'PAID' || access.kind === 'ADMIN_GRANT',
      daysRemaining: paidDaysRemaining,
      /** Explicit commercial go-live — unset means trials/paywall not started */
      subscriptionsGoLiveAt: goLiveAt?.toISOString() ?? null,
      subscriptionsCommercialLive: commercialLive,
      /**
       * Separate from go-live: paywall stays off until a real PSP is verified.
       * READY_FOR_SUBSCRIPTION_PAYWALL = NO until then.
       */
      readyForSubscriptionPaywall: false,
      subscription: latest ? this.formatSubscription(latest) : null,
      payment: {
        provider: this.paymentProvider.name,
        mode: this.paymentProvider.capabilities.supportsSyncCapture
          ? 'sync'
          : 'redirect',
        simulated: this.paymentProvider.name === SIMULATED_PAYMENT_PROVIDER,
        canActivateSimulated: await this.canActivateSimulatedPayment(),
      },
    };
  }

  /** Runtime access check — never trust client. */
  async hasAccess(userId: string, asOf: Date = new Date()): Promise<boolean> {
    const access = await this.entitlements.getCurrentAccess(userId, asOf);
    return access.canSubmitProposal && !access.isExpired;
  }

  /** @deprecated Prefer hasAccess — kept for portfolio/profile callers */
  async hasActivePro(userId: string, asOf: Date = new Date()): Promise<boolean> {
    return this.hasAccess(userId, asOf);
  }

  async getPortfolioItemLimit(userId: string): Promise<number> {
    const access = await this.entitlements.getCurrentAccess(userId);
    return access.plan?.portfolioItemLimit ?? FREE_PORTFOLIO_ITEM_LIMIT;
  }

  async checkout(
    userId: string,
    options: { planCode: string; returnUrl?: string; cancelUrl?: string },
  ) {
    await this.assertFreelancer(userId);
    await this.assertSubscriptionsFeatureEnabled();

    const planCode = options.planCode?.trim().toUpperCase();
    if (!planCode) {
      throw new BadRequestException('يجب تحديد رمز الباقة');
    }

    const plan = await this.prisma.subscriptionPlan.findFirst({
      where: { code: planCode, isActive: true },
    });
    if (!plan) throw new NotFoundException('الباقة غير متاحة');

    const access = await this.entitlements.getCurrentAccess(userId);
    const isRenewal =
      access.kind === 'PAID' ||
      access.kind === 'ADMIN_GRANT' ||
      (access.kind === 'TRIAL' && !!access.subscriptionId);

    await this.trackEvent(userId, ProductAnalyticsEventType.PRO_CHECKOUT_STARTED, {
      planCode: plan.code,
      isRenewal,
    });

    const amount = plan.price;
    const currency = plan.currency;
    const idempotencyKey = `sub-checkout:${plan.code}:${userId}:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`;

    const { subscription, payment } = await this.prisma.$transaction(async (tx) => {
      const paymentRow = await tx.payment.create({
        data: {
          clientId: userId,
          purpose: PaymentPurpose.SUBSCRIPTION,
          amount,
          currency,
          status: PaymentStatus.PENDING,
          provider: this.paymentProvider.name,
          idempotencyKey,
          metadata: {
            planCode: plan.code,
            userId,
            isRenewal,
            expectedAmount: Number(amount),
            expectedCurrency: currency,
          } as Prisma.InputJsonValue,
        },
      });

      const subscriptionRow = await tx.freelancerSubscription.create({
        data: {
          userId,
          planId: plan.id,
          status: FreelancerSubscriptionStatus.PENDING_PAYMENT,
          source: SubscriptionSource.PURCHASE,
          paymentId: paymentRow.id,
        },
        include: { plan: true, payment: true },
      });

      return { subscription: subscriptionRow, payment: paymentRow };
    });

    await this.notifications.create(
      userId,
      NotificationType.PRO_PAYMENT_PENDING,
      'بانتظار دفع الاشتراك',
      `أكمل الدفع لتفعيل ${plan.nameAr}.`,
      `/dashboard/subscriptions`,
    );

    const providerResult = await this.paymentProvider.createCheckout({
      paymentId: payment.id,
      amount: Number(amount),
      currency,
      description: `اشتراك ${plan.nameAr}`,
      clientId: userId,
      returnUrl: options.returnUrl,
      cancelUrl: options.cancelUrl,
      metadata: {
        purpose: PaymentPurpose.SUBSCRIPTION,
        subscriptionId: subscription.id,
        planCode: plan.code,
        expectedAmount: Number(amount),
        expectedCurrency: currency,
      },
    });

    if (providerResult.status === 'failed') {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.FAILED,
          failureMessage: 'فشل إنشاء عملية الدفع لدى مزود الخدمة',
        },
      });
      throw new BadRequestException('تعذر بدء عملية الدفع');
    }

    if (providerResult.status === 'succeeded') {
      const canActivate = await this.canActivateSimulatedPayment();
      if (!canActivate && this.paymentProvider.name === SIMULATED_PAYMENT_PROVIDER) {
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.PROCESSING,
            providerReference: providerResult.providerReference,
            metadata: {
              ...(typeof payment.metadata === 'object' && payment.metadata
                ? (payment.metadata as object)
                : {}),
              simulatedHeld: true,
              reason:
                'Simulated payment succeeded but subscription activation blocked in production without feature gate',
            } as Prisma.InputJsonValue,
          },
        });
        return {
          subscriptionId: subscription.id,
          paymentId: payment.id,
          status: FreelancerSubscriptionStatus.PENDING_PAYMENT,
          paymentStatus: PaymentStatus.PROCESSING,
          requiresRedirect: false,
          activationBlocked: true,
          message:
            'الدفع التجريبي نجح لكن تفعيل الاشتراك محظور في الإنتاج دون بوابة دفع حقيقية / علم تفعيل صريح.',
          plan: this.formatPlan(plan),
        };
      }

      const activated = await this.markPaymentSucceededAndActivate(
        payment.id,
        providerResult.providerReference ?? undefined,
      );
      return {
        subscriptionId: activated.id,
        paymentId: payment.id,
        status: activated.status,
        paymentStatus: PaymentStatus.SUCCEEDED,
        requiresRedirect: false,
        activationBlocked: false,
        isRenewal,
        plan: this.formatPlan(plan),
        subscription: activated,
      };
    }

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.PROCESSING,
        providerReference: providerResult.providerReference,
        checkoutUrl: providerResult.checkoutUrl ?? null,
      },
    });

    return {
      subscriptionId: subscription.id,
      paymentId: payment.id,
      status: FreelancerSubscriptionStatus.PENDING_PAYMENT,
      paymentStatus: PaymentStatus.PROCESSING,
      checkoutUrl: providerResult.checkoutUrl ?? null,
      requiresRedirect: true,
      activationBlocked: false,
      plan: this.formatPlan(plan),
    };
  }

  /**
   * Idempotent activation after a backend-verified SUCCEEDED payment.
   * Works for any plan code linked to the payment's subscription row.
   * Never call from frontend success redirects alone.
   */
  async activateFromConfirmedPayment(paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { freelancerSubscription: { include: { plan: true } } },
    });
    if (!payment) throw new NotFoundException('عملية الدفع غير موجودة');
    if (payment.purpose !== PaymentPurpose.SUBSCRIPTION) {
      throw new BadRequestException('هذه العملية ليست لاشتراك');
    }
    if (payment.status !== PaymentStatus.SUCCEEDED) {
      if (
        payment.status === PaymentStatus.PENDING ||
        payment.status === PaymentStatus.PROCESSING
      ) {
        throw new ConflictException('الدفع غير مؤكد بعد');
      }
      throw new ConflictException('حالة الدفع لا تسمح بالتفعيل');
    }

    const subscription = payment.freelancerSubscription;
    if (!subscription) throw new NotFoundException('الاشتراك غير مرتبط بالدفع');

    if (subscription.status === FreelancerSubscriptionStatus.ACTIVE) {
      return this.formatSubscription(
        await this.prisma.freelancerSubscription.findUniqueOrThrow({
          where: { id: subscription.id },
          include: { plan: true, payment: true },
        }),
      );
    }

    if (
      this.paymentProvider.name === SIMULATED_PAYMENT_PROVIDER &&
      !(await this.canActivateSimulatedPayment())
    ) {
      throw new ForbiddenException(
        'لا يمكن تفعيل الاشتراك عبر دفع تجريبي في الإنتاج دون علم تفعيل صريح',
      );
    }

    const now = new Date();
    const durationDays = subscription.plan.durationDays;
    const existingActive = await this.findStackableSubscription(
      subscription.userId,
      now,
    );
    const base =
      existingActive?.expiresAt && existingActive.expiresAt > now
        ? existingActive.expiresAt
        : now;
    const expiresAt = addDays(base, durationDays);
    const isRenewal = !!existingActive;
    const boost = this.planBoostScore(subscription.plan);

    const updated = await this.prisma.$transaction(async (tx) => {
      await this.expireOverlappingSubscriptions(
        tx,
        subscription.userId,
        subscription.id,
        now,
      );

      const row = await tx.freelancerSubscription.update({
        where: { id: subscription.id },
        data: {
          status: FreelancerSubscriptionStatus.ACTIVE,
          source: SubscriptionSource.PURCHASE,
          startedAt: now,
          expiresAt,
        },
        include: { plan: true, payment: true },
      });

      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.SUCCEEDED,
          paidAt: payment.paidAt ?? now,
        },
      });

      await tx.freelancerProfile.updateMany({
        where: { profile: { userId: subscription.userId } },
        data: { proBoostScore: boost },
      });

      await tx.productAnalyticsEvent.create({
        data: {
          userId: subscription.userId,
          eventType: isRenewal
            ? ProductAnalyticsEventType.PRO_RENEWED
            : ProductAnalyticsEventType.PRO_ACTIVATED,
          metadata: {
            subscriptionId: subscription.id,
            paymentId: payment.id,
            planCode: subscription.plan.code,
            expiresAt: expiresAt.toISOString(),
          },
        },
      });

      return row;
    });

    await this.notifications.create(
      subscription.userId,
      isRenewal ? NotificationType.PRO_RENEWED : NotificationType.PRO_ACTIVATED,
      isRenewal ? 'تم تجديد الاشتراك' : `تم تفعيل ${subscription.plan.nameAr}`,
      `اشتراكك فعّال حتى ${expiresAt.toISOString().slice(0, 10)}.`,
      `/dashboard/subscriptions`,
    );

    await this.trackEvent(
      subscription.userId,
      ProductAnalyticsEventType.PRO_PAYMENT_SUCCESS,
      {
        paymentId: payment.id,
        subscriptionId: subscription.id,
        planCode: subscription.plan.code,
      },
    );

    return this.formatSubscription(updated);
  }

  /** Mark SUCCEEDED payment then fulfill/activate — used when provider sync-succeeds. */
  async markPaymentSucceededAndActivate(
    paymentId: string,
    providerReference?: string,
  ) {
    await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.SUCCEEDED,
        providerReference: providerReference ?? undefined,
        paidAt: new Date(),
      },
    });
    await this.paymentFulfillment.fulfillSucceededPayment(paymentId);
    const row = await this.prisma.freelancerSubscription.findFirstOrThrow({
      where: { paymentId },
      include: { plan: true, payment: true },
    });
    return this.formatSubscription(row);
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
      select: { id: true, userId: true },
    });

    const result = await this.entitlements.expireDueSubscriptions(asOf);

    for (const row of due) {
      await this.notifications.create(
        row.userId,
        NotificationType.PRO_EXPIRED,
        'انتهى الاشتراك',
        'انتهى اشتراكك الحالي. يمكنك اختيار باقة جديدة في أي وقت. بياناتك محفوظة.',
        `/dashboard/subscriptions`,
      );
      await this.trackEvent(row.userId, ProductAnalyticsEventType.PRO_EXPIRED, {
        subscriptionId: row.id,
      });
    }

    return { expired: result.expired };
  }

  async notifyExpiring() {
    const now = new Date();
    const windows: Array<{ days: number; type: NotificationType }> = [
      { days: 7, type: NotificationType.PRO_EXPIRING_7_DAYS },
      { days: 3, type: NotificationType.PRO_EXPIRING_3_DAYS },
      { days: 1, type: NotificationType.PRO_EXPIRING_1_DAY },
    ];

    let sent = 0;
    for (const window of windows) {
      const start = addDays(now, window.days);
      const end = addDays(now, window.days + 1);
      const rows = await this.prisma.freelancerSubscription.findMany({
        where: {
          status: FreelancerSubscriptionStatus.ACTIVE,
          expiresAt: { gte: start, lt: end },
        },
        include: { plan: true },
      });
      for (const row of rows) {
        await this.notifications.create(
          row.userId,
          window.type,
          `اشتراك ${row.plan.nameAr} ينتهي خلال ${window.days} يوم`,
          'جدّد اشتراكك للحفاظ على مزايا باقتك.',
          `/dashboard/subscriptions`,
        );
        sent += 1;
      }
    }
    return { sent };
  }

  async trackPageView(userId: string | null) {
    await this.trackEvent(userId, ProductAnalyticsEventType.PRO_PAGE_VIEW);
    return { ok: true };
  }

  async recordProfileView(profileUserId: string, viewerUserId?: string | null) {
    if (viewerUserId && viewerUserId === profileUserId) return { ok: true };
    const day = startOfUtcDay(new Date());
    await this.prisma.profileViewDaily.upsert({
      where: {
        profileUserId_day: { profileUserId, day },
      },
      create: { profileUserId, day, viewCount: 1 },
      update: { viewCount: { increment: 1 } },
    });
    return { ok: true };
  }

  async getProAnalytics(userId: string) {
    const access = await this.entitlements.getCurrentAccess(userId);
    const statsAllowed =
      access.canSubmitProposal &&
      (access.plan?.features?.statistics === true ||
        access.plan?.features?.advancedStatistics === true ||
        access.kind === 'PAID' ||
        access.kind === 'ADMIN_GRANT' ||
        access.kind === 'TRIAL');
    if (!statsAllowed) {
      throw new ForbiddenException('تحليلات الملف متاحة للمشتركين');
    }
    const since = addDays(new Date(), -30);
    const views = await this.prisma.profileViewDaily.findMany({
      where: { profileUserId: userId, day: { gte: since } },
      orderBy: { day: 'asc' },
    });
    const proposals = await this.prisma.proposal.findMany({
      where: { freelancerId: userId, createdAt: { gte: since } },
      select: { id: true, status: true, createdAt: true },
    });
    return {
      profileViewsLast30Days: views.reduce((s, v) => s + v.viewCount, 0),
      viewsByDay: views.map((v) => ({
        day: v.day.toISOString().slice(0, 10),
        count: v.viewCount,
      })),
      proposalsLast30Days: proposals.length,
      proposalsByStatus: proposals.reduce<Record<string, number>>((acc, p) => {
        acc[p.status] = (acc[p.status] ?? 0) + 1;
        return acc;
      }, {}),
    };
  }

  async listPlansAdmin(includeInactive = true) {
    const plans = await this.prisma.subscriptionPlan.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { price: 'asc' }],
    });
    return plans.map((plan) => this.formatPlan(plan));
  }

  async createPlan(adminId: string, dto: CreateSubscriptionPlanDto) {
    const code = dto.code.trim().toUpperCase();
    try {
      const plan = await this.prisma.$transaction(async (tx) => {
        const created = await tx.subscriptionPlan.create({
          data: {
            code,
            nameAr: dto.nameAr.trim(),
            nameEn: dto.nameEn.trim(),
            price: dto.price,
            currency: (dto.currency ?? 'LYD').trim().toUpperCase(),
            durationDays: dto.durationDays,
            portfolioItemLimit: dto.portfolioItemLimit ?? 40,
            visibilityWeight: dto.visibilityWeight ?? 0,
            rankingBoostWeight: dto.rankingBoostWeight ?? 0,
            proposalQuotaMonthly: dto.proposalQuotaMonthly ?? 20,
            monthlyPointsGrant: dto.monthlyPointsGrant ?? 0,
            badgeKey: dto.badgeKey?.trim() || null,
            featuresJson: (dto.featuresJson ??
              {}) as Prisma.InputJsonValue,
            sortOrder: dto.sortOrder ?? 0,
            isActive: dto.isActive ?? true,
          },
        });
        await this.audit.log(
          adminId,
          AdminAuditAction.SUBSCRIPTION_PLAN_CREATED,
          'SubscriptionPlan',
          created.id,
          { code: created.code },
          tx,
        );
        return created;
      });
      return this.formatPlan(plan);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('رمز الباقة مستخدم مسبقاً');
      }
      throw error;
    }
  }

  async updatePlan(adminId: string, id: string, dto: UpdateSubscriptionPlanDto) {
    const existing = await this.prisma.subscriptionPlan.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('الباقة غير موجودة');

    const data: Prisma.SubscriptionPlanUpdateInput = {};
    if (dto.nameAr !== undefined) data.nameAr = dto.nameAr.trim();
    if (dto.nameEn !== undefined) data.nameEn = dto.nameEn.trim();
    if (dto.price !== undefined) data.price = dto.price;
    if (dto.currency !== undefined) {
      data.currency = dto.currency.trim().toUpperCase();
    }
    if (dto.durationDays !== undefined) data.durationDays = dto.durationDays;
    if (dto.portfolioItemLimit !== undefined) {
      data.portfolioItemLimit = dto.portfolioItemLimit;
    }
    if (dto.visibilityWeight !== undefined) {
      data.visibilityWeight = dto.visibilityWeight;
    }
    if (dto.rankingBoostWeight !== undefined) {
      data.rankingBoostWeight = dto.rankingBoostWeight;
    }
    if (dto.proposalQuotaMonthly !== undefined) {
      data.proposalQuotaMonthly = dto.proposalQuotaMonthly;
    }
    if (dto.monthlyPointsGrant !== undefined) {
      data.monthlyPointsGrant = dto.monthlyPointsGrant;
    }
    if (dto.badgeKey !== undefined) {
      data.badgeKey = dto.badgeKey?.trim() || null;
    }
    if (dto.featuresJson !== undefined) {
      data.featuresJson =
        dto.featuresJson === null
          ? Prisma.JsonNull
          : (dto.featuresJson as Prisma.InputJsonValue);
    }
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.subscriptionPlan.update({ where: { id }, data });
      await this.audit.log(
        adminId,
        AdminAuditAction.SUBSCRIPTION_PLAN_UPDATED,
        'SubscriptionPlan',
        id,
        { code: row.code, changes: Object.keys(dto) },
        tx,
      );
      return row;
    });

    return this.formatPlan(updated);
  }

  async grantSubscription(adminId: string, dto: GrantSubscriptionDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      select: {
        id: true,
        role: true,
        profile: { select: { freelancerProfile: { select: { id: true } } } },
      },
    });
    if (!user || user.role !== Role.FREELANCER || !user.profile?.freelancerProfile) {
      throw new BadRequestException('المستخدم ليس مستقلاً');
    }

    const plan = await this.prisma.subscriptionPlan.findFirst({
      where: { code: dto.planCode.trim().toUpperCase() },
    });
    if (!plan) throw new NotFoundException('الباقة غير موجودة');

    const now = new Date();
    const expiresAt = addDays(now, dto.days);
    const boost = this.planBoostScore(plan);

    const created = await this.prisma.$transaction(async (tx) => {
      await this.expireOverlappingSubscriptions(tx, dto.userId, null, now);

      const row = await tx.freelancerSubscription.create({
        data: {
          userId: dto.userId,
          planId: plan.id,
          status: FreelancerSubscriptionStatus.ACTIVE,
          source: SubscriptionSource.ADMIN_GRANT,
          startedAt: now,
          expiresAt,
          metadata: {
            grantedBy: adminId,
            reason: dto.reason.trim(),
          } as Prisma.InputJsonValue,
        },
        include: { plan: true, payment: true },
      });

      await tx.subscriptionAdminAction.create({
        data: {
          subscriptionId: row.id,
          actorId: adminId,
          action: SubscriptionAdminActionType.GRANT,
          reason: dto.reason.trim(),
          oldExpiresAt: null,
          newExpiresAt: expiresAt,
        },
      });

      await tx.freelancerProfile.updateMany({
        where: { profile: { userId: dto.userId } },
        data: { proBoostScore: boost },
      });

      await this.audit.log(
        adminId,
        AdminAuditAction.SUBSCRIPTION_GRANTED,
        'FreelancerSubscription',
        row.id,
        {
          userId: dto.userId,
          planCode: plan.code,
          days: dto.days,
          expiresAt: expiresAt.toISOString(),
          reason: dto.reason.trim(),
        },
        tx,
      );

      return row;
    });

    await this.notifications.create(
      dto.userId,
      NotificationType.PRO_ACTIVATED,
      `تم منحك اشتراك ${plan.nameAr}`,
      `اشتراكك فعّال حتى ${expiresAt.toISOString().slice(0, 10)}.`,
      `/dashboard/subscriptions`,
    );

    return this.formatSubscription(created);
  }

  async adminList(query: {
    status?: string;
    page?: number;
    limit?: number;
    q?: string;
  }) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(50, Math.max(1, query.limit ?? 20));
    const where: Prisma.FreelancerSubscriptionWhereInput = {};
    if (query.status) {
      where.status = query.status as FreelancerSubscriptionStatus;
    }
    if (query.q?.trim()) {
      const q = query.q.trim();
      where.user = {
        OR: [
          { email: { contains: q, mode: 'insensitive' } },
          {
            profile: {
              OR: [
                { username: { contains: q, mode: 'insensitive' } },
                { firstName: { contains: q, mode: 'insensitive' } },
                { lastName: { contains: q, mode: 'insensitive' } },
              ],
            },
          },
        ],
      };
    }

    const [total, items] = await this.prisma.$transaction([
      this.prisma.freelancerSubscription.count({ where }),
      this.prisma.freelancerSubscription.findMany({
        where,
        include: {
          plan: true,
          payment: true,
          user: {
            select: {
              id: true,
              email: true,
              profile: {
                select: { firstName: true, lastName: true, username: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      page,
      limit,
      total,
      items: items.map((item) => ({
        ...this.formatSubscription(item),
        user: {
          id: item.user.id,
          email: item.user.email,
          displayName: item.user.profile
            ? `${item.user.profile.firstName} ${item.user.profile.lastName}`
            : null,
          username: item.user.profile?.username ?? null,
        },
      })),
    };
  }

  async adminGet(id: string) {
    const item = await this.prisma.freelancerSubscription.findUnique({
      where: { id },
      include: {
        plan: true,
        payment: true,
        adminActions: { orderBy: { createdAt: 'desc' }, take: 50 },
        user: {
          select: {
            id: true,
            email: true,
            profile: {
              select: { firstName: true, lastName: true, username: true },
            },
          },
        },
      },
    });
    if (!item) throw new NotFoundException('الاشتراك غير موجود');
    return {
      ...this.formatSubscription(item),
      adminActions: item.adminActions,
      user: {
        id: item.user.id,
        email: item.user.email,
        displayName: item.user.profile
          ? `${item.user.profile.firstName} ${item.user.profile.lastName}`
          : null,
        username: item.user.profile?.username ?? null,
      },
    };
  }

  async adminExtend(adminId: string, id: string, dto: ExtendSubscriptionDto) {
    const item = await this.prisma.freelancerSubscription.findUnique({
      where: { id },
      include: { plan: true },
    });
    if (!item) throw new NotFoundException('الاشتراك غير موجود');

    const oldExpiresAt = item.expiresAt;
    let newExpiresAt: Date;
    if (dto.newExpiresAt) {
      newExpiresAt = new Date(dto.newExpiresAt);
    } else {
      const extra = dto.extraDays ?? item.plan.durationDays;
      const base =
        item.expiresAt && item.expiresAt > new Date() ? item.expiresAt : new Date();
      newExpiresAt = addDays(base, extra);
    }
    if (!(newExpiresAt > new Date())) {
      throw new BadRequestException('تاريخ الانتهاء الجديد يجب أن يكون في المستقبل');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.freelancerSubscription.update({
        where: { id },
        data: {
          expiresAt: newExpiresAt,
          status: FreelancerSubscriptionStatus.ACTIVE,
          startedAt: item.startedAt ?? new Date(),
        },
      });
      await tx.subscriptionAdminAction.create({
        data: {
          subscriptionId: id,
          actorId: adminId,
          action: SubscriptionAdminActionType.EXTEND,
          reason: dto.reason.trim(),
          oldExpiresAt,
          newExpiresAt,
        },
      });
      await tx.freelancerProfile.updateMany({
        where: { profile: { userId: item.userId } },
        data: { proBoostScore: this.planBoostScore(item.plan) },
      });
      await this.audit.log(
        adminId,
        AdminAuditAction.SUBSCRIPTION_EXTENDED,
        'FreelancerSubscription',
        id,
        {
          userId: item.userId,
          oldExpiresAt: oldExpiresAt?.toISOString() ?? null,
          newExpiresAt: newExpiresAt.toISOString(),
          reason: dto.reason.trim(),
        },
        tx,
      );
    });

    return this.adminGet(id);
  }

  async adminSuspend(adminId: string, id: string, dto: SubscriptionAdminReasonDto) {
    const item = await this.prisma.freelancerSubscription.findUnique({
      where: { id },
    });
    if (!item) throw new NotFoundException('الاشتراك غير موجود');

    await this.prisma.$transaction(async (tx) => {
      await tx.freelancerSubscription.update({
        where: { id },
        data: { status: FreelancerSubscriptionStatus.SUSPENDED },
      });
      await tx.subscriptionAdminAction.create({
        data: {
          subscriptionId: id,
          actorId: adminId,
          action: SubscriptionAdminActionType.SUSPEND,
          reason: dto.reason.trim(),
          oldExpiresAt: item.expiresAt,
          newExpiresAt: item.expiresAt,
        },
      });
      await tx.freelancerProfile.updateMany({
        where: { profile: { userId: item.userId } },
        data: { proBoostScore: 0 },
      });
      await this.audit.log(
        adminId,
        AdminAuditAction.SUBSCRIPTION_SUSPENDED,
        'FreelancerSubscription',
        id,
        { userId: item.userId, reason: dto.reason.trim() },
        tx,
      );
    });

    return this.adminGet(id);
  }

  async adminCancel(adminId: string, id: string, dto: SubscriptionAdminReasonDto) {
    const item = await this.prisma.freelancerSubscription.findUnique({
      where: { id },
    });
    if (!item) throw new NotFoundException('الاشتراك غير موجود');
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.freelancerSubscription.update({
        where: { id },
        data: {
          status: FreelancerSubscriptionStatus.CANCELLED,
          cancelledAt: now,
        },
      });
      await tx.subscriptionAdminAction.create({
        data: {
          subscriptionId: id,
          actorId: adminId,
          action: SubscriptionAdminActionType.CANCEL,
          reason: dto.reason.trim(),
          oldExpiresAt: item.expiresAt,
          newExpiresAt: item.expiresAt,
        },
      });
      await tx.freelancerProfile.updateMany({
        where: { profile: { userId: item.userId } },
        data: { proBoostScore: 0 },
      });
      await this.audit.log(
        adminId,
        AdminAuditAction.SUBSCRIPTION_CANCELLED,
        'FreelancerSubscription',
        id,
        { userId: item.userId, reason: dto.reason.trim() },
        tx,
      );
    });

    return this.adminGet(id);
  }

  private planBoostScore(plan: {
    visibilityWeight?: number | null;
    rankingBoostWeight?: number | null;
  }): number {
    const visibility = Number(plan.visibilityWeight ?? 0);
    const ranking = Number(plan.rankingBoostWeight ?? 0);
    return clampProBoostScore(visibility > 0 ? visibility : ranking);
  }

  private async findStackableSubscription(userId: string, asOf: Date = new Date()) {
    return this.prisma.freelancerSubscription.findFirst({
      where: {
        userId,
        status: {
          in: [
            FreelancerSubscriptionStatus.ACTIVE,
            FreelancerSubscriptionStatus.TRIAL,
            FreelancerSubscriptionStatus.PAST_DUE,
          ],
        },
        expiresAt: { gt: asOf },
        source: {
          in: [
            SubscriptionSource.PURCHASE,
            SubscriptionSource.ADMIN_GRANT,
            SubscriptionSource.MIGRATION,
          ],
        },
      },
      include: { plan: true, payment: true },
      orderBy: { expiresAt: 'desc' },
    });
  }

  private async expireOverlappingSubscriptions(
    tx: Prisma.TransactionClient,
    userId: string,
    keepId: string | null,
    now: Date,
  ) {
    await tx.freelancerSubscription.updateMany({
      where: {
        userId,
        id: keepId ? { not: keepId } : undefined,
        status: {
          in: [
            FreelancerSubscriptionStatus.ACTIVE,
            FreelancerSubscriptionStatus.TRIAL,
            FreelancerSubscriptionStatus.PAST_DUE,
          ],
        },
      },
      data: {
        status: FreelancerSubscriptionStatus.EXPIRED,
        cancelledAt: now,
      },
    });
  }

  private async canActivateSimulatedPayment(): Promise<boolean> {
    const nodeEnv = this.configService.get<string>('nodeEnv');
    const flag =
      (await this.platformPolicy.isFeatureEnabled('SUBSCRIPTIONS', false)) &&
      process.env.ALLOW_SIMULATED_PRO_ACTIVATION === 'true';
    return allowSimulatedProductActivation(nodeEnv, flag);
  }

  private async assertSubscriptionsFeatureEnabled() {
    const enabled = await this.platformPolicy.isFeatureEnabled(
      'SUBSCRIPTIONS',
      false,
    );
    const nodeEnv = this.configService.get<string>('nodeEnv');
    if (!enabled && nodeEnv === 'production') {
      throw new ForbiddenException('ميزة الاشتراكات غير مفعّلة حالياً');
    }
  }

  private async trackEvent(
    userId: string | null,
    eventType: ProductAnalyticsEventType,
    metadata?: Record<string, unknown>,
  ) {
    await this.prisma.productAnalyticsEvent.create({
      data: {
        userId: userId ?? undefined,
        eventType,
        metadata: metadata ? (metadata as Prisma.InputJsonValue) : undefined,
      },
    });
  }

  private formatPlan(plan: {
    id: string;
    code: string;
    nameAr: string;
    nameEn: string;
    price: Prisma.Decimal | number;
    currency: string;
    durationDays: number;
    portfolioItemLimit: number;
    visibilityWeight?: number;
    rankingBoostWeight: number;
    proposalQuotaMonthly?: number;
    monthlyPointsGrant?: number;
    badgeKey?: string | null;
    featuresJson?: Prisma.JsonValue | null;
    isActive: boolean;
    sortOrder?: number;
  }) {
    return {
      ...this.entitlements.formatPlan({
        id: plan.id,
        code: plan.code,
        nameAr: plan.nameAr,
        nameEn: plan.nameEn,
        price: plan.price,
        currency: plan.currency,
        durationDays: plan.durationDays,
        proposalQuotaMonthly: plan.proposalQuotaMonthly ?? 20,
        monthlyPointsGrant: plan.monthlyPointsGrant ?? 0,
        visibilityWeight: plan.visibilityWeight ?? 0,
        portfolioItemLimit: plan.portfolioItemLimit,
        badgeKey: plan.badgeKey ?? null,
        featuresJson: plan.featuresJson ?? null,
        isActive: plan.isActive,
        sortOrder: plan.sortOrder ?? 0,
      }),
      rankingBoostWeight: plan.rankingBoostWeight,
    };
  }

  private formatSubscription(row: {
    id: string;
    userId: string;
    planId: string;
    status: FreelancerSubscriptionStatus;
    source?: SubscriptionSource;
    startedAt: Date | null;
    expiresAt: Date | null;
    cancelledAt: Date | null;
    paymentId: string | null;
    createdAt: Date;
    updatedAt: Date;
    plan?: {
      id: string;
      code: string;
      nameAr: string;
      nameEn: string;
      price: Prisma.Decimal;
      currency: string;
      durationDays: number;
      portfolioItemLimit: number;
      visibilityWeight?: number;
      rankingBoostWeight: number;
      proposalQuotaMonthly?: number;
      monthlyPointsGrant?: number;
      badgeKey?: string | null;
      featuresJson?: Prisma.JsonValue | null;
      isActive: boolean;
      sortOrder?: number;
    };
    payment?: {
      id: string;
      status: PaymentStatus;
      amount: Prisma.Decimal;
      currency: string;
      provider: string;
      paidAt: Date | null;
    } | null;
  }) {
    const now = new Date();
    const isActive =
      (row.status === FreelancerSubscriptionStatus.ACTIVE ||
        row.status === FreelancerSubscriptionStatus.TRIAL ||
        row.status === FreelancerSubscriptionStatus.PAST_DUE) &&
      !!row.expiresAt &&
      row.expiresAt > now;
    return {
      id: row.id,
      userId: row.userId,
      planId: row.planId,
      status: row.status,
      source: row.source ?? SubscriptionSource.PURCHASE,
      startedAt: row.startedAt,
      expiresAt: row.expiresAt,
      cancelledAt: row.cancelledAt,
      paymentId: row.paymentId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      isActive,
      /** @deprecated Prefer isActive */
      isPro: isActive,
      plan: row.plan
        ? {
            ...this.formatPlan(row.plan),
            rankingBoostWeight: row.plan.rankingBoostWeight,
          }
        : undefined,
      payment: row.payment
        ? {
            id: row.payment.id,
            status: row.payment.status,
            amount: Number(row.payment.amount),
            currency: row.payment.currency,
            provider: row.payment.provider,
            paidAt: row.payment.paidAt,
          }
        : null,
    };
  }

  private async assertFreelancer(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
        profile: { select: { freelancerProfile: { select: { id: true } } } },
      },
    });
    if (!user || user.role !== Role.FREELANCER || !user.profile?.freelancerProfile) {
      throw new ForbiddenException('هذه الميزة للمستقلين فقط');
    }
  }
}

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}
