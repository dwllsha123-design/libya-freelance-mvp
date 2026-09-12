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
  NotificationType,
  PaymentPurpose,
  PaymentStatus,
  PointsTransactionType,
  Prisma,
  ProductAnalyticsEventType,
  Role,
} from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { LaunchProgramService } from '../launch/launch.service.js';
import { AdminAuditService } from '../admin/admin-audit.service.js';
import { assertPaymentProviderAvailable } from '../payments/payment-provider-availability.js';
import { PAYMENT_PROVIDER } from '../payments/payment.types.js';
import type { PaymentProvider } from '../payments/payment.types.js';
import type { PaymentFulfillmentService } from '../payments/payment-fulfillment.service.js';
import { PAYMENT_FULFILLMENT_SERVICE } from '../payments/payment-fulfillment.tokens.js';
import {
  calculateProfileCompletion,
  meetsProfileCompletionThreshold,
} from '../profiles/profile-completion.util.js';
import {
  NUQATI_CONFIG,
  NUQATI_REASON_LABELS,
  NUQATI_TASK_DEFINITIONS,
} from './nuqati.config.js';
import type {
  CreatePointsPackageDto,
  UpdatePointsPackageDto,
} from './dto/points-package.dto.js';

type Tx = Prisma.TransactionClient;

function monthKey(date = new Date()) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function dayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function isSameUtcDay(a: Date, b: Date) {
  return dayKey(a) === dayKey(b);
}

function isYesterdayUtc(today: Date, previous: Date) {
  const y = new Date(today);
  y.setUTCDate(y.getUTCDate() - 1);
  return isSameUtcDay(y, previous);
}

@Injectable()
export class NuqatiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly notifications: NotificationsService,
    private readonly launchProgram: LaunchProgramService,
    private readonly audit: AdminAuditService,
    @Inject(PAYMENT_PROVIDER) private readonly paymentProvider: PaymentProvider,
    @Inject(PAYMENT_FULFILLMENT_SERVICE)
    private readonly paymentFulfillment: PaymentFulfillmentService,
  ) {}

  async listPointsPackages() {
    const packages = await this.prisma.pointsPackage.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { priceLyd: 'asc' }],
    });
    return packages.map((pkg) => this.formatPackage(pkg));
  }

  async getDashboard(userId: string, role: Role) {
    if (role !== Role.FREELANCER) {
      throw new ForbiddenException('نقاطي متاح للمستقلين فقط');
    }

    await this.ensureWallet(userId);
    const wallet = await this.prisma.pointsWallet.findUniqueOrThrow({
      where: { userId },
    });

    const [summary, tasks, streak, packages] = await Promise.all([
      this.getSummary(userId),
      this.getTasks(userId),
      this.prisma.pointsStreakState.findUnique({ where: { userId } }),
      this.listPointsPackages(),
    ]);

    const earnedThisMonth = await this.sumEarnedInMonth(userId);

    return {
      brand: 'نقاطي',
      balance: wallet.balance,
      summary,
      earnedThisMonth,
      monthlyCap: NUQATI_CONFIG.monthlyEarnableFromTasks,
      proposalCost: NUQATI_CONFIG.proposalSubmitCost,
      packages:
        packages.length > 0
          ? packages
          : NUQATI_CONFIG.purchasePackages.map((p) => ({
              id: p.id,
              code: p.id.toUpperCase(),
              nameAr: `${p.points} نقطة`,
              nameEn: `${p.points} Points`,
              points: p.points,
              bonusPoints: 0,
              priceLyd: p.priceLyd,
              currency: 'LYD',
              isActive: true,
              sortOrder: 0,
            })),
      tasks,
      streak: {
        currentDays: streak?.currentStreakDays ?? 0,
        lastApplicationDate: streak?.lastApplicationDate?.toISOString() ?? null,
        claimedMilestones: streak?.claimedMilestones ?? [],
      },
    };
  }

  async getBalance(userId: string) {
    const wallet = await this.ensureWallet(userId);
    return { balance: wallet.balance, brand: 'نقاطي' };
  }

  async listTransactions(
    userId: string,
    role: Role,
    query: { type?: string; page?: number; limit?: number },
  ) {
    if (role !== Role.FREELANCER) {
      throw new ForbiddenException('نقاطي متاح للمستقلين فقط');
    }

    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 30, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.PointsTransactionWhereInput = { userId };
    if (query.type === 'earn') where.amount = { gt: 0 };
    if (query.type === 'spend') where.amount = { lt: 0 };
    if (query.type === 'purchase') where.type = PointsTransactionType.PURCHASE;
    if (query.type === 'reward') where.type = PointsTransactionType.EARN;

    const [items, total] = await Promise.all([
      this.prisma.pointsTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.pointsTransaction.count({ where }),
    ]);

    return {
      items: items.map((t) => this.formatTransaction(t)),
      total,
      page,
      limit,
    };
  }

  /**
   * Starts a Nuqati points purchase checkout via Payment (POINTS_PURCHASE).
   * Credits happen only after verified SUCCEEDED fulfillment (idempotent).
   */
  async initiatePurchaseCheckout(
    userId: string,
    role: Role,
    packageIdOrCode: string,
    options: { returnUrl?: string; cancelUrl?: string } = {},
  ) {
    if (role !== Role.FREELANCER) {
      throw new ForbiddenException('نقاطي متاح للمستقلين فقط');
    }

    if (typeof packageIdOrCode !== 'string' || !packageIdOrCode.trim()) {
      throw new BadRequestException({
        code: 'PACKAGE_IDENTIFIER_REQUIRED',
        message: 'packageId or packageCode is required',
      });
    }

    const key = packageIdOrCode.trim();
    const pkg = await this.prisma.pointsPackage.findFirst({
      where: {
        OR: [{ id: key }, { code: key.toUpperCase() }],
      },
    });
    if (!pkg) {
      throw new NotFoundException({
        code: 'POINTS_PACKAGE_NOT_FOUND',
        message: 'Points package not found',
      });
    }
    if (!pkg.isActive) {
      throw new BadRequestException({
        code: 'POINTS_PACKAGE_INACTIVE',
        message: 'Points package is not available',
      });
    }

    // Fail before any Payment / PointsPurchase rows when PSP is not available.
    assertPaymentProviderAvailable(this.paymentProvider);

    const currency = pkg.currency || 'LYD';
    const amount = Number(pkg.priceLyd);
    const totalPoints = pkg.points + pkg.bonusPoints;
    const idempotencyKey = `points-purchase:${pkg.code}:${userId}:${Date.now()}:${randomUUID().slice(0, 8)}`;

    const { payment, purchase } = await this.prisma.$transaction(async (tx) => {
      const paymentRow = await tx.payment.create({
        data: {
          clientId: userId,
          purpose: PaymentPurpose.POINTS_PURCHASE,
          amount,
          currency,
          status: PaymentStatus.PENDING,
          provider: this.paymentProvider.name,
          idempotencyKey,
          metadata: {
            packageId: pkg.id,
            packageCode: pkg.code,
            pointsAmount: pkg.points,
            bonusPoints: pkg.bonusPoints,
            expectedAmount: amount,
            expectedCurrency: currency,
          } as Prisma.InputJsonValue,
        },
      });

      const purchaseRow = await tx.pointsPurchase.create({
        data: {
          userId,
          packageId: pkg.id,
          pointsAmount: pkg.points,
          bonusPoints: pkg.bonusPoints,
          priceLyd: pkg.priceLyd,
          status: PaymentStatus.PENDING,
          provider: this.paymentProvider.name,
          paymentId: paymentRow.id,
        },
      });

      return { payment: paymentRow, purchase: purchaseRow };
    });

    const providerResult = await this.paymentProvider.createCheckout({
      paymentId: payment.id,
      amount,
      currency,
      description: `شراء ${totalPoints} نقطة — ${pkg.nameAr}`,
      clientId: userId,
      returnUrl: options.returnUrl,
      cancelUrl: options.cancelUrl,
      metadata: {
        purpose: PaymentPurpose.POINTS_PURCHASE,
        purchaseId: purchase.id,
        packageCode: pkg.code,
        expectedAmount: amount,
        expectedCurrency: currency,
      },
    });

    if (providerResult.status === 'failed') {
      await this.prisma.$transaction([
        this.prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.FAILED,
            failedAt: new Date(),
            failureMessage: 'فشل إنشاء عملية الدفع لدى مزود الخدمة',
          },
        }),
        this.prisma.pointsPurchase.update({
          where: { id: purchase.id },
          data: { status: PaymentStatus.FAILED },
        }),
      ]);
      throw new BadRequestException('تعذر بدء عملية الدفع');
    }

    if (providerResult.status === 'succeeded') {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.SUCCEEDED,
          providerReference: providerResult.providerReference,
          paidAt: new Date(),
        },
      });
      await this.paymentFulfillment.fulfillSucceededPayment(payment.id);
      return {
        purchaseId: purchase.id,
        paymentId: payment.id,
        package: this.formatPackage(pkg),
        status: 'SUCCEEDED' as const,
        comingSoon: false,
        requiresRedirect: false,
        checkoutUrl: null as string | null,
        currency,
        pointsCredited: totalPoints,
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
      purchaseId: purchase.id,
      paymentId: payment.id,
      package: this.formatPackage(pkg),
      status: 'PROCESSING' as const,
      comingSoon: false,
      requiresRedirect: true,
      checkoutUrl: providerResult.checkoutUrl ?? null,
      currency,
    };
  }

  /**
   * Idempotent credit after verified POINTS_PURCHASE payment.
   * Keeps historical PointsPurchase + PointsTransaction rows.
   */
  async creditPointsPurchaseFulfillment(params: {
    userId: string;
    purchaseId: string;
    pointsAmount: number;
    bonusPoints: number;
    paymentId: string;
    fulfillmentKey: string;
  }) {
    const existing = await this.prisma.pointsTransaction.findUnique({
      where: { fulfillmentKey: params.fulfillmentKey },
    });
    if (existing) {
      return { credited: false, alreadyCredited: true, amount: existing.amount };
    }

    const total = params.pointsAmount + Math.max(0, params.bonusPoints);
    if (total <= 0) {
      throw new BadRequestException('كمية النقاط غير صالحة');
    }

    await this.prisma.$transaction(async (tx) => {
      await this.credit(
        params.userId,
        total,
        PointsTransactionType.PURCHASE,
        'PURCHASE',
        `شراء ${params.pointsAmount} نقطة` +
          (params.bonusPoints > 0 ? ` (+${params.bonusPoints} مكافأة)` : ''),
        params.purchaseId,
        tx,
        {
          fulfillmentKey: params.fulfillmentKey,
          source: 'PAYMENT',
          metadata: {
            paymentId: params.paymentId,
            purchaseId: params.purchaseId,
            pointsAmount: params.pointsAmount,
            bonusPoints: params.bonusPoints,
          },
        },
      );

      await tx.pointsPurchase.update({
        where: { id: params.purchaseId },
        data: {
          status: PaymentStatus.SUCCEEDED,
          paidAt: new Date(),
          providerReference: params.paymentId,
        },
      });
    });

    return { credited: true, alreadyCredited: false, amount: total };
  }

  /** @deprecated Use initiatePurchaseCheckout — kept as alias for older clients. */
  async purchasePackage(userId: string, role: Role, packageId: string) {
    return this.initiatePurchaseCheckout(userId, role, packageId);
  }

  async adminListPackages(includeInactive = true) {
    const packages = await this.prisma.pointsPackage.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { points: 'asc' }],
    });
    return packages.map((pkg) => this.formatPackage(pkg));
  }

  async adminCreatePackage(adminId: string, dto: CreatePointsPackageDto) {
    const code = dto.code.trim().toUpperCase();
    try {
      const created = await this.prisma.$transaction(async (tx) => {
        const row = await tx.pointsPackage.create({
          data: {
            code,
            nameAr: dto.nameAr.trim(),
            nameEn: dto.nameEn.trim(),
            points: dto.points,
            bonusPoints: dto.bonusPoints ?? 0,
            priceLyd: dto.priceLyd,
            currency: (dto.currency ?? 'LYD').trim().toUpperCase(),
            sortOrder: dto.sortOrder ?? 0,
            isActive: dto.isActive ?? true,
          },
        });
        await this.audit.log(
          adminId,
          AdminAuditAction.POINTS_PACKAGE_CREATED,
          'PointsPackage',
          row.id,
          { code: row.code },
          tx,
        );
        return row;
      });
      return this.formatPackage(created);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('رمز باقة النقاط مستخدم مسبقاً');
      }
      throw error;
    }
  }

  async adminUpdatePackage(
    adminId: string,
    id: string,
    dto: UpdatePointsPackageDto,
  ) {
    const existing = await this.prisma.pointsPackage.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('باقة النقاط غير موجودة');

    const data: Prisma.PointsPackageUpdateInput = {};
    if (dto.nameAr !== undefined) data.nameAr = dto.nameAr.trim();
    if (dto.nameEn !== undefined) data.nameEn = dto.nameEn.trim();
    if (dto.points !== undefined) data.points = dto.points;
    if (dto.bonusPoints !== undefined) data.bonusPoints = dto.bonusPoints;
    if (dto.priceLyd !== undefined) data.priceLyd = dto.priceLyd;
    if (dto.currency !== undefined) {
      data.currency = dto.currency.trim().toUpperCase();
    }
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.pointsPackage.update({ where: { id }, data });
      await this.audit.log(
        adminId,
        AdminAuditAction.POINTS_PACKAGE_UPDATED,
        'PointsPackage',
        id,
        { code: row.code, changes: Object.keys(dto) },
        tx,
      );
      return row;
    });

    return this.formatPackage(updated);
  }

  async submitSocialShare(userId: string, role: Role, postUrl: string) {
    if (role !== Role.FREELANCER) {
      throw new ForbiddenException('نقاطي متاح للمستقلين فقط');
    }

    const trimmed = postUrl.trim();
    if (!trimmed.startsWith('http')) {
      throw new BadRequestException('أدخل رابط منشور صالح');
    }

    const period = monthKey();
    const existing = await this.prisma.pointsTaskCompletion.findUnique({
      where: {
        userId_taskKey_periodKey: {
          userId,
          taskKey: 'SOCIAL_SHARE',
          periodKey: period,
        },
      },
    });

    const progress = existing?.progress ?? 0;
    if (progress >= NUQATI_CONFIG.socialShareMonthlyCap) {
      throw new BadRequestException('استنفدت مكافآت المشاركة لهذا الشهر');
    }

    await this.prisma.pointsTaskCompletion.upsert({
      where: {
        userId_taskKey_periodKey: {
          userId,
          taskKey: 'SOCIAL_SHARE',
          periodKey: period,
        },
      },
      create: {
        userId,
        taskKey: 'SOCIAL_SHARE',
        periodKey: period,
        progress: progress + 1,
      },
      update: { progress: progress + 1 },
    });

    await this.credit(
      userId,
      NUQATI_CONFIG.socialShareReward,
      PointsTransactionType.EARN,
      'SOCIAL_SHARE',
      'مكافأة مشاركة على وسائل التواصل',
      trimmed,
    );

    return { awarded: NUQATI_CONFIG.socialShareReward };
  }

  async onFreelancerRegistered(userId: string, tx?: Tx) {
    return this.awardWelcomeBonus(userId, tx);
  }

  /**
   * Exactly-once welcome points for a new account (ledger + task completion).
   * Safe across logout, role switch, profile edits, and concurrent retries.
   */
  async awardWelcomeBonus(userId: string, tx?: Tx) {
    const run = async (db: Tx) => {
      const config = await this.launchProgram.getConfig(db);
      const amount = config.welcomePoints;

      // Claim idempotency row first (unique userId+taskKey+periodKey)
      try {
        await db.pointsTaskCompletion.create({
          data: {
            userId,
            taskKey: 'WELCOME_BONUS',
            periodKey: '',
            progress: 1,
          },
        });
      } catch (err) {
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === 'P2002'
        ) {
          return null;
        }
        throw err;
      }

      await this.credit(
        userId,
        amount,
        PointsTransactionType.EARN,
        'WELCOME_BONUS',
        'مكافأة التسجيل في Libyan Freelance',
        undefined,
        db,
      );

      await this.notifications.create(
        userId,
        NotificationType.WELCOME_POINTS_AWARDED,
        'مرحبًا بك في Libyan Freelance 🎉',
        `تمت إضافة ${amount} نقطة ترحيبية إلى حسابك.`,
        '/dashboard/nuqati',
        db,
      );

      await this.launchProgram.trackAnalytics(
        userId,
        ProductAnalyticsEventType.WELCOME_POINTS_AWARDED,
        { amount },
        db,
      );

      return { awarded: amount };
    };

    if (tx) return run(tx);
    return this.prisma.$transaction((inner) => run(inner));
  }

  async onFreelancerLogin(userId: string) {
    const period = monthKey();
    const day = dayKey();

    const dailyRecord = await this.prisma.pointsTaskCompletion.findUnique({
      where: {
        userId_taskKey_periodKey: {
          userId,
          taskKey: 'DAILY_LOGIN',
          periodKey: day,
        },
      },
    });
    if (dailyRecord) return null;

    const monthly = await this.prisma.pointsTaskCompletion.findUnique({
      where: {
        userId_taskKey_periodKey: {
          userId,
          taskKey: 'DAILY_LOGIN',
          periodKey: period,
        },
      },
    });

    const monthlyCount = monthly?.progress ?? 0;
    if (monthlyCount >= NUQATI_CONFIG.dailyLoginMonthlyCap) return null;

    await this.prisma.pointsTaskCompletion.create({
      data: {
        userId,
        taskKey: 'DAILY_LOGIN',
        periodKey: day,
        progress: 1,
      },
    });

    await this.prisma.pointsTaskCompletion.upsert({
      where: {
        userId_taskKey_periodKey: {
          userId,
          taskKey: 'DAILY_LOGIN',
          periodKey: period,
        },
      },
      create: {
        userId,
        taskKey: 'DAILY_LOGIN',
        periodKey: period,
        progress: 1,
      },
      update: { progress: monthlyCount + 1 },
    });

    return this.credit(
      userId,
      NUQATI_CONFIG.dailyLoginReward,
      PointsTransactionType.EARN,
      'DAILY_LOGIN',
      'مكافأة تسجيل الدخول اليومي',
    );
  }

  async chargeProposalSubmit(userId: string, proposalId: string, tx: Tx) {
    return this.chargeProposalSubmitWithBoost(userId, proposalId, 0, tx);
  }

  /**
   * Optional promotional boost only — proposal submit itself is free (quota-gated).
   * No-op when boostPoints <= 0.
   */
  async chargeProposalSubmitWithBoost(
    userId: string,
    proposalId: string,
    boostPoints: number,
    tx: Tx,
  ) {
    const boost = Math.max(0, Math.floor(boostPoints || 0));
    if (boost <= 0) {
      return;
    }

    await this.ensureWallet(userId, tx);

    const updated = await tx.$queryRaw<{ balance: number }[]>`
      UPDATE "PointsWallet"
      SET balance = balance - ${boost},
          "updatedAt" = CURRENT_TIMESTAMP
      WHERE "userId" = ${userId}
        AND balance >= ${boost}
      RETURNING balance
    `;

    if (!updated.length) {
      throw new BadRequestException(
        `ليس لديك نقاط كافية لتعزيز هذا العرض. تحتاج ${boost} نقطة.`,
      );
    }

    await tx.pointsTransaction.create({
      data: {
        userId,
        amount: -boost,
        type: PointsTransactionType.SPEND,
        reasonKey: 'PROPOSAL_BOOST',
        descriptionAr: `تعزيز ظهور العرض بـ ${boost} نقطة`,
        referenceId: proposalId,
        source: 'BOOST',
        balanceAfter: updated[0].balance,
      },
    });

    await this.launchProgram.trackAnalytics(
      userId,
      ProductAnalyticsEventType.PROPOSAL_POINTS_DEDUCTED,
      { proposalId, submitCost: 0, boost, total: boost },
      tx,
    );
  }

  async onProposalSubmitted(userId: string, proposalId: string, tx?: Tx) {
    const db = tx ?? this.prisma;
    const period = monthKey();
    const today = new Date();

    const monthly = await db.pointsTaskCompletion.findUnique({
      where: {
        userId_taskKey_periodKey: {
          userId,
          taskKey: 'MONTHLY_APPLY',
          periodKey: period,
        },
      },
    });

    if (!monthly) {
      await this.markTaskDone(userId, 'MONTHLY_APPLY', period, tx);
      await this.credit(
        userId,
        NUQATI_CONFIG.monthlyApplyReward,
        PointsTransactionType.EARN,
        'MONTHLY_APPLY',
        'مكافأة تقديم عرض هذا الشهر',
        proposalId,
        tx,
      );
    }

    await this.updateApplicationStreak(userId, today, tx);
  }

  async onPortfolioItemCreated(userId: string, itemId: string) {
    const done = await this.prisma.pointsTaskCompletion.findFirst({
      where: { userId, taskKey: 'FIRST_PORTFOLIO' },
    });
    if (done) return null;

    await this.markTaskDone(userId, 'FIRST_PORTFOLIO', '');
    return this.credit(
      userId,
      NUQATI_CONFIG.firstPortfolioReward,
      PointsTransactionType.EARN,
      'FIRST_PORTFOLIO',
      'أضفت أول عنصر في معرض أعمالك!',
      itemId,
    );
  }

  async checkProfileComplete(userId: string) {
    const config = await this.launchProgram.getConfig();
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      include: {
        freelancerProfile: {
          include: {
            skills: true,
            portfolio: { where: { isVisible: true }, select: { id: true } },
          },
        },
        city: true,
      },
    });

    if (!profile?.freelancerProfile) return null;

    const completion = calculateProfileCompletion({
      profilePhoto: profile.profilePhoto,
      professionalTitle: profile.freelancerProfile.professionalTitle,
      bio: profile.bio,
      cityId: profile.cityId,
      skillCount: profile.freelancerProfile.skills.length,
      portfolioCount: profile.freelancerProfile.portfolio.length,
    });

    const meets = meetsProfileCompletionThreshold(
      completion.percent,
      config.profileCompletionThreshold,
    );

    let rewardAwarded = false;

    if (meets) {
      try {
        await this.prisma.pointsTaskCompletion.create({
          data: {
            userId,
            taskKey: 'PROFILE_COMPLETE',
            periodKey: '',
            progress: 1,
          },
        });

        await this.credit(
          userId,
          config.profileCompletionReward,
          PointsTransactionType.EARN,
          'PROFILE_COMPLETE',
          'إكمال الملف الشخصي',
        );

        await this.notifications.create(
          userId,
          NotificationType.PROFILE_COMPLETION_REWARD,
          'أحسنت!',
          `تمت إضافة ${config.profileCompletionReward} نقاط بعد إكمال ملفك الشخصي.`,
          '/dashboard/nuqati',
        );

        await this.launchProgram.trackAnalytics(
          userId,
          ProductAnalyticsEventType.PROFILE_COMPLETION_REWARD_AWARDED,
          {
            amount: config.profileCompletionReward,
            percent: completion.percent,
          },
        );

        rewardAwarded = true;
      } catch (err) {
        if (
          !(
            err instanceof Prisma.PrismaClientKnownRequestError &&
            err.code === 'P2002'
          )
        ) {
          throw err;
        }
      }
    }

    await this.launchProgram.evaluateFoundingFreelancer(userId).catch(() => undefined);

    return {
      percent: completion.percent,
      meetsThreshold: meets,
      rewardAwarded,
      rewardAmount: config.profileCompletionReward,
      missing: completion.missing,
    };
  }

  async onFirstJobCompleted(userId: string, projectId: string) {
    const done = await this.prisma.pointsTaskCompletion.findFirst({
      where: { userId, taskKey: 'FIRST_JOB' },
    });
    if (done) return null;

    await this.markTaskDone(userId, 'FIRST_JOB', '');
    return this.credit(
      userId,
      NUQATI_CONFIG.firstJobReward,
      PointsTransactionType.EARN,
      'FIRST_JOB',
      'أكملت أول مشروع على المنصة!',
      projectId,
    );
  }

  private async updateApplicationStreak(userId: string, today: Date, tx?: Tx) {
    const db = tx ?? this.prisma;
    const existing = await db.pointsStreakState.findUnique({ where: { userId } });
    const todayStart = startOfUtcDay(today);

    let streak = 1;
    if (existing?.lastApplicationDate) {
      if (isSameUtcDay(existing.lastApplicationDate, today)) {
        streak = existing.currentStreakDays;
      } else if (isYesterdayUtc(today, existing.lastApplicationDate)) {
        streak = existing.currentStreakDays + 1;
      }
    }

    const claimed = existing?.claimedMilestones ?? [];
    const milestones = Object.keys(NUQATI_CONFIG.streakMilestones).map(Number);

    await db.pointsStreakState.upsert({
      where: { userId },
      create: {
        userId,
        currentStreakDays: streak,
        lastApplicationDate: todayStart,
        claimedMilestones: claimed,
      },
      update: {
        currentStreakDays: streak,
        lastApplicationDate: todayStart,
      },
    });

    for (const milestone of milestones) {
      if (streak >= milestone && !claimed.includes(milestone)) {
        const reward = NUQATI_CONFIG.streakMilestones[milestone];
        const key = `STREAK_${milestone}` as const;
        await this.markTaskDone(userId, key, '', tx);
        await this.credit(
          userId,
          reward,
          PointsTransactionType.EARN,
          key,
          `مكافأة سلسلة تقديمات ${milestone} يوماً`,
          undefined,
          tx,
        );
        claimed.push(milestone);
        await db.pointsStreakState.update({
          where: { userId },
          data: { claimedMilestones: claimed },
        });
      }
    }
  }

  private async getSummary(userId: string) {
    const agg = await this.prisma.pointsTransaction.groupBy({
      by: ['type'],
      where: { userId },
      _sum: { amount: true },
    });

    let totalEarned = 0;
    let totalSpent = 0;
    let totalPurchased = 0;
    let totalRefunded = 0;

    for (const row of agg) {
      const sum = row._sum.amount ?? 0;
      if (row.type === PointsTransactionType.EARN) totalEarned += sum;
      if (row.type === PointsTransactionType.SPEND) totalSpent += Math.abs(sum);
      if (row.type === PointsTransactionType.PURCHASE) totalPurchased += sum;
      if (row.type === PointsTransactionType.REFUND) totalRefunded += sum;
    }

    return { totalEarned, totalSpent, totalPurchased, totalRefunded };
  }

  private async sumEarnedInMonth(userId: string) {
    const start = new Date();
    start.setUTCDate(1);
    start.setUTCHours(0, 0, 0, 0);

    const result = await this.prisma.pointsTransaction.aggregate({
      where: {
        userId,
        type: PointsTransactionType.EARN,
        createdAt: { gte: start },
      },
      _sum: { amount: true },
    });

    return result._sum.amount ?? 0;
  }

  private async getTasks(userId: string) {
    const period = monthKey();
    const [completions, streak, launch] = await Promise.all([
      this.prisma.pointsTaskCompletion.findMany({
        where: { userId },
      }),
      this.prisma.pointsStreakState.findUnique({
        where: { userId },
      }),
      this.launchProgram.getConfig(),
    ]);

    return NUQATI_TASK_DEFINITIONS.map((task) => {
      let progress = 0;
      let completed = false;
      const reward =
        task.key === 'PROFILE_COMPLETE'
          ? launch.profileCompletionReward
          : task.reward;

      if (task.key === 'STREAK_7' || task.key === 'STREAK_15' || task.key === 'STREAK_30') {
        const milestone = Number(task.key.split('_')[1]);
        progress = streak?.currentStreakDays ?? 0;
        completed = (streak?.claimedMilestones ?? []).includes(milestone);
      } else if (task.key === 'DAILY_LOGIN') {
        const monthly = completions.find(
          (c) => c.taskKey === 'DAILY_LOGIN' && c.periodKey === period,
        );
        progress = monthly?.progress ?? 0;
        completed = progress >= (task.maxProgress ?? 1);
      } else if (task.key === 'MONTHLY_APPLY' || task.key === 'SOCIAL_SHARE') {
        const record = completions.find(
          (c) => c.taskKey === task.key && c.periodKey === period,
        );
        progress = record?.progress ?? 0;
        completed = progress >= (task.maxProgress ?? 1);
      } else {
        completed = completions.some((c) => c.taskKey === task.key);
        progress = completed ? 1 : 0;
      }

      return {
        ...task,
        reward,
        progress,
        maxProgress: task.maxProgress ?? 1,
        completed,
      };
    });
  }

  private async ensureWallet(userId: string, tx?: Tx) {
    const db = tx ?? this.prisma;
    return db.pointsWallet.upsert({
      where: { userId },
      create: { userId, balance: 0 },
      update: {},
    });
  }

  private async markTaskDone(
    userId: string,
    taskKey: string,
    periodKey: string,
    tx?: Tx,
  ) {
    const db = tx ?? this.prisma;
    await db.pointsTaskCompletion.upsert({
      where: {
        userId_taskKey_periodKey: { userId, taskKey, periodKey },
      },
      create: { userId, taskKey, periodKey, progress: 1 },
      update: { progress: 1 },
    });
  }

  private async credit(
    userId: string,
    amount: number,
    type: PointsTransactionType,
    reasonKey: string,
    descriptionAr: string,
    referenceId?: string,
    tx?: Tx,
    extras?: {
      fulfillmentKey?: string;
      source?: string;
      metadata?: Prisma.InputJsonValue;
    },
  ) {
    const db = tx ?? this.prisma;
    const wallet = await this.ensureWallet(userId, db);
    const balanceAfter = wallet.balance + amount;

    await db.pointsWallet.update({
      where: { userId },
      data: { balance: balanceAfter },
    });

    const transaction = await db.pointsTransaction.create({
      data: {
        userId,
        amount,
        type,
        reasonKey,
        descriptionAr,
        referenceId,
        fulfillmentKey: extras?.fulfillmentKey,
        source: extras?.source,
        metadata: extras?.metadata,
        balanceAfter,
      },
    });

    return transaction;
  }

  private async debit(
    userId: string,
    amount: number,
    type: PointsTransactionType,
    reasonKey: string,
    descriptionAr: string,
    referenceId?: string,
    tx?: Tx,
  ) {
    return this.credit(
      userId,
      -amount,
      type,
      reasonKey,
      descriptionAr,
      referenceId,
      tx,
    );
  }

  private formatTransaction(t: {
    id: string;
    amount: number;
    type: PointsTransactionType;
    reasonKey: string;
    descriptionAr: string;
    referenceId: string | null;
    balanceAfter: number;
    createdAt: Date;
  }) {
    return {
      id: t.id,
      amount: t.amount,
      type: t.type,
      reasonKey: t.reasonKey,
      reasonLabel: NUQATI_REASON_LABELS[t.reasonKey] ?? t.reasonKey,
      descriptionAr: t.descriptionAr,
      referenceId: t.referenceId,
      balanceAfter: t.balanceAfter,
      createdAt: t.createdAt.toISOString(),
    };
  }

  private formatPackage(pkg: {
    id: string;
    code: string;
    nameAr: string;
    nameEn: string;
    points: number;
    bonusPoints: number;
    priceLyd: Prisma.Decimal | number;
    currency: string;
    isActive: boolean;
    sortOrder: number;
  }) {
    return {
      id: pkg.id,
      code: pkg.code,
      nameAr: pkg.nameAr,
      nameEn: pkg.nameEn,
      points: pkg.points,
      bonusPoints: pkg.bonusPoints,
      priceLyd: Number(pkg.priceLyd),
      currency: pkg.currency,
      isActive: pkg.isActive,
      sortOrder: pkg.sortOrder,
    };
  }
}
