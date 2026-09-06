import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  PreconditionFailedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AdminAuditAction,
  FreelancerSubscriptionStatus,
  IdentityVerificationStatus,
  NotificationType,
  PaymentPurpose,
  PaymentStatus,
  Prisma,
  ProductAnalyticsEventType,
  Role,
  SubscriptionAdminActionType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { AdminAuditService } from '../admin/admin-audit.service.js';
import { PlatformPolicyService } from '../platform/platform-policy.service.js';
import { PAYMENT_PROVIDER } from '../payments/payment.types.js';
import type { PaymentProvider } from '../payments/payment.types.js';
import { SIMULATED_PAYMENT_PROVIDER } from '../payments/providers/simulated-payment.provider.js';
import { VerificationService } from '../verification/verification.service.js';
import {
  FREE_PORTFOLIO_ITEM_LIMIT,
  PRO_PLAN_CODE,
  allowSimulatedProActivation,
} from './subscriptions.constants.js';
import { clampProBoostScore } from './ranking.util.js';
import type {
  ExtendSubscriptionDto,
  SubscriptionAdminReasonDto,
} from './dto/subscriptions.dto.js';

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly audit: AdminAuditService,
    private readonly platformPolicy: PlatformPolicyService,
    private readonly verification: VerificationService,
    private readonly configService: ConfigService,
    @Inject(PAYMENT_PROVIDER) private readonly paymentProvider: PaymentProvider,
  ) {}

  async getProPlan() {
    const plan = await this.prisma.subscriptionPlan.findFirst({
      where: { code: PRO_PLAN_CODE, isActive: true },
    });
    if (!plan) throw new NotFoundException('خطة Pro غير متاحة');
    return this.formatPlan(plan);
  }

  async getMine(userId: string) {
    await this.assertFreelancer(userId);
    const plan = await this.getProPlan();
    const identityVerified = await this.verification.isIdentityVerified(userId);
    const active = await this.findActiveSubscription(userId);
    const latest = await this.prisma.freelancerSubscription.findFirst({
      where: { userId },
      include: { plan: true, payment: true },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();
    const isPro = !!active && active.expiresAt !== null && active.expiresAt > now;
    const daysRemaining =
      isPro && active?.expiresAt
        ? Math.max(
            0,
            Math.ceil((active.expiresAt.getTime() - now.getTime()) / 86_400_000),
          )
        : 0;

    return {
      plan,
      identityVerified,
      requiresIdentityVerification: true,
      isPro,
      daysRemaining,
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

  /** Runtime Pro check — never trust client. */
  async hasActivePro(userId: string, asOf: Date = new Date()): Promise<boolean> {
    const sub = await this.findActiveSubscription(userId, asOf);
    return !!sub;
  }

  async getPortfolioItemLimit(userId: string): Promise<number> {
    if (await this.hasActivePro(userId)) {
      const plan = await this.prisma.subscriptionPlan.findFirst({
        where: { code: PRO_PLAN_CODE, isActive: true },
        select: { portfolioItemLimit: true },
      });
      return plan?.portfolioItemLimit ?? 40;
    }
    return FREE_PORTFOLIO_ITEM_LIMIT;
  }

  async checkout(userId: string, options: { returnUrl?: string; cancelUrl?: string } = {}) {
    await this.assertFreelancer(userId);
    await this.assertSubscriptionsFeatureEnabled();

    if (!(await this.verification.isIdentityVerified(userId))) {
      throw new PreconditionFailedException(
        'يجب توثيق الهوية قبل الاشتراك في Libya Freelance Pro',
      );
    }

    const plan = await this.prisma.subscriptionPlan.findFirst({
      where: { code: PRO_PLAN_CODE, isActive: true },
    });
    if (!plan) throw new NotFoundException('خطة Pro غير متاحة');

    const active = await this.findActiveSubscription(userId);
    const isRenewal = !!active;

    await this.trackEvent(userId, ProductAnalyticsEventType.PRO_CHECKOUT_STARTED, {
      planCode: plan.code,
      isRenewal,
    });

    const amount = plan.price;
    const currency = plan.currency;
    const idempotencyKey = `pro-checkout:${userId}:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`;

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
          } as Prisma.InputJsonValue,
        },
      });

      const subscriptionRow = await tx.freelancerSubscription.create({
        data: {
          userId,
          planId: plan.id,
          status: FreelancerSubscriptionStatus.PENDING_PAYMENT,
          paymentId: paymentRow.id,
        },
        include: { plan: true, payment: true },
      });

      return { subscription: subscriptionRow, payment: paymentRow };
    });

    await this.notifications.create(
      userId,
      NotificationType.PRO_PAYMENT_PENDING,
      'بانتظار دفع اشتراك Pro',
      `أكمل الدفع لتفعيل ${plan.nameAr}.`,
      `/dashboard/pro`,
    );

    const providerResult = await this.paymentProvider.createPayment({
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
                'Simulated payment succeeded but PRO activation blocked in production without feature gate',
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
            'الدفع التجريبي نجح لكن تفعيل Pro محظور في الإنتاج دون بوابة دفع حقيقية / علم تفعيل صريح.',
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
      // Mark succeeded if provider already confirmed but row not updated
      if (payment.status === PaymentStatus.PENDING || payment.status === PaymentStatus.PROCESSING) {
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
        'لا يمكن تفعيل Pro عبر دفع تجريبي في الإنتاج دون علم تفعيل صريح',
      );
    }

    const now = new Date();
    const durationDays = subscription.plan.durationDays;
    const existingActive = await this.findActiveSubscription(subscription.userId, now);
    const base =
      existingActive?.expiresAt && existingActive.expiresAt > now
        ? existingActive.expiresAt
        : now;
    const expiresAt = addDays(base, durationDays);
    const isRenewal = !!existingActive;
    const boost = clampProBoostScore(subscription.plan.rankingBoostWeight);

    const updated = await this.prisma.$transaction(async (tx) => {
      if (existingActive && existingActive.id !== subscription.id) {
        await tx.freelancerSubscription.update({
          where: { id: existingActive.id },
          data: {
            status: FreelancerSubscriptionStatus.EXPIRED,
            cancelledAt: now,
          },
        });
      }

      const row = await tx.freelancerSubscription.update({
        where: { id: subscription.id },
        data: {
          status: FreelancerSubscriptionStatus.ACTIVE,
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
            expiresAt: expiresAt.toISOString(),
          },
        },
      });

      return row;
    });

    await this.notifications.create(
      subscription.userId,
      isRenewal ? NotificationType.PRO_RENEWED : NotificationType.PRO_ACTIVATED,
      isRenewal ? 'تم تجديد اشتراك Pro' : 'تم تفعيل Libya Freelance Pro',
      `اشتراكك فعّال حتى ${expiresAt.toISOString().slice(0, 10)}.`,
      `/dashboard/pro`,
    );

    await this.trackEvent(
      subscription.userId,
      ProductAnalyticsEventType.PRO_PAYMENT_SUCCESS,
      { paymentId: payment.id, subscriptionId: subscription.id },
    );

    return this.formatSubscription(updated);
  }

  /** Mark SUCCEEDED payment then activate — used when provider sync-succeeds. */
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
    return this.activateFromConfirmedPayment(paymentId);
  }

  async expireDueSubscriptions(asOf: Date = new Date()) {
    const due = await this.prisma.freelancerSubscription.findMany({
      where: {
        status: FreelancerSubscriptionStatus.ACTIVE,
        expiresAt: { lte: asOf },
      },
      select: { id: true, userId: true },
    });

    for (const row of due) {
      await this.prisma.$transaction(async (tx) => {
        await tx.freelancerSubscription.update({
          where: { id: row.id },
          data: { status: FreelancerSubscriptionStatus.EXPIRED },
        });
        const stillActive = await tx.freelancerSubscription.findFirst({
          where: {
            userId: row.userId,
            status: FreelancerSubscriptionStatus.ACTIVE,
            expiresAt: { gt: asOf },
          },
        });
        if (!stillActive) {
          await tx.freelancerProfile.updateMany({
            where: { profile: { userId: row.userId } },
            data: { proBoostScore: 0 },
          });
        }
        await tx.productAnalyticsEvent.create({
          data: {
            userId: row.userId,
            eventType: ProductAnalyticsEventType.PRO_EXPIRED,
            metadata: { subscriptionId: row.id },
          },
        });
      });

      await this.notifications.create(
        row.userId,
        NotificationType.PRO_EXPIRED,
        'انتهى اشتراك Pro',
        'انتهى اشتراك Libya Freelance Pro. يمكنك التجديد في أي وقت. بياناتك محفوظة.',
        `/dashboard/pro`,
      );
    }

    return { expired: due.length };
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
      });
      for (const row of rows) {
        await this.notifications.create(
          row.userId,
          window.type,
          `اشتراك Pro ينتهي خلال ${window.days} يوم`,
          'جدّد اشتراكك للحفاظ على مزايا Pro.',
          `/dashboard/pro`,
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
    if (!(await this.hasActivePro(userId))) {
      throw new ForbiddenException('تحليلات الملف متاحة لمشتركي Pro');
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

  async adminList(query: { status?: string; page?: number; limit?: number; q?: string }) {
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
              profile: { select: { firstName: true, lastName: true, username: true } },
              identityVerification: { select: { status: true, expiresAt: true } },
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
        verificationStatus: item.user.identityVerification?.status ?? 'NOT_SUBMITTED',
        identityVerified: isIdentityVerifiedNow(item.user.identityVerification),
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
            profile: { select: { firstName: true, lastName: true, username: true } },
            identityVerification: { select: { status: true, expiresAt: true } },
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
      verificationStatus: item.user.identityVerification?.status ?? 'NOT_SUBMITTED',
      identityVerified: isIdentityVerifiedNow(item.user.identityVerification),
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
        data: { proBoostScore: clampProBoostScore(item.plan.rankingBoostWeight) },
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
    const item = await this.prisma.freelancerSubscription.findUnique({ where: { id } });
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
    const item = await this.prisma.freelancerSubscription.findUnique({ where: { id } });
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

  private async findActiveSubscription(userId: string, asOf: Date = new Date()) {
    return this.prisma.freelancerSubscription.findFirst({
      where: {
        userId,
        status: FreelancerSubscriptionStatus.ACTIVE,
        expiresAt: { gt: asOf },
      },
      include: { plan: true, payment: true },
      orderBy: { expiresAt: 'desc' },
    });
  }

  private async canActivateSimulatedPayment(): Promise<boolean> {
    const nodeEnv = this.configService.get<string>('nodeEnv');
    const flag =
      (await this.platformPolicy.isFeatureEnabled('SUBSCRIPTIONS', false)) &&
      process.env.ALLOW_SIMULATED_PRO_ACTIVATION === 'true';
    return allowSimulatedProActivation(nodeEnv, flag);
  }

  private async assertSubscriptionsFeatureEnabled() {
    const enabled = await this.platformPolicy.isFeatureEnabled('SUBSCRIPTIONS', false);
    // Allow checkout in non-production even if flag off (dev/test)
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
    price: Prisma.Decimal;
    currency: string;
    durationDays: number;
    portfolioItemLimit: number;
    rankingBoostWeight: number;
    isActive: boolean;
  }) {
    return {
      id: plan.id,
      code: plan.code,
      nameAr: plan.nameAr,
      nameEn: plan.nameEn,
      price: Number(plan.price),
      currency: plan.currency,
      durationDays: plan.durationDays,
      portfolioItemLimit: plan.portfolioItemLimit,
      rankingBoostWeight: plan.rankingBoostWeight,
      isActive: plan.isActive,
    };
  }

  private formatSubscription(
    row: {
      id: string;
      userId: string;
      planId: string;
      status: FreelancerSubscriptionStatus;
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
        rankingBoostWeight: number;
        isActive: boolean;
      };
      payment?: {
        id: string;
        status: PaymentStatus;
        amount: Prisma.Decimal;
        currency: string;
        provider: string;
        paidAt: Date | null;
      } | null;
    },
  ) {
    const now = new Date();
    const isPro =
      row.status === FreelancerSubscriptionStatus.ACTIVE &&
      !!row.expiresAt &&
      row.expiresAt > now;
    return {
      id: row.id,
      userId: row.userId,
      planId: row.planId,
      status: row.status,
      startedAt: row.startedAt,
      expiresAt: row.expiresAt,
      cancelledAt: row.cancelledAt,
      paymentId: row.paymentId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      isPro,
      plan: row.plan ? this.formatPlan(row.plan) : undefined,
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

function addDays(from: Date, days: number): Date {
  const d = new Date(from.getTime());
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function isIdentityVerifiedNow(
  row: { status: IdentityVerificationStatus; expiresAt: Date | null } | null | undefined,
): boolean {
  if (!row || row.status !== IdentityVerificationStatus.VERIFIED) return false;
  if (row.expiresAt && row.expiresAt <= new Date()) return false;
  return true;
}
