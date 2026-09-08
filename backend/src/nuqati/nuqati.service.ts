import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  NotificationType,
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
import {
  calculateProfileCompletion,
  meetsProfileCompletionThreshold,
} from '../profiles/profile-completion.util.js';
import {
  NUQATI_CONFIG,
  NUQATI_REASON_LABELS,
  NUQATI_TASK_DEFINITIONS,
} from './nuqati.config.js';

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
  ) {}

  async getDashboard(userId: string, role: Role) {
    if (role !== Role.FREELANCER) {
      throw new ForbiddenException('نقاطي متاح للمستقلين فقط');
    }

    await this.ensureWallet(userId);
    const wallet = await this.prisma.pointsWallet.findUniqueOrThrow({
      where: { userId },
    });

    const [summary, tasks, streak] = await Promise.all([
      this.getSummary(userId),
      this.getTasks(userId),
      this.prisma.pointsStreakState.findUnique({ where: { userId } }),
    ]);

    const earnedThisMonth = await this.sumEarnedInMonth(userId);

    return {
      brand: 'نقاطي',
      balance: wallet.balance,
      summary,
      earnedThisMonth,
      monthlyCap: NUQATI_CONFIG.monthlyEarnableFromTasks,
      proposalCost: NUQATI_CONFIG.proposalSubmitCost,
      packages: NUQATI_CONFIG.purchasePackages,
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
   * Starts a Nuqati points purchase checkout.
   *
   * Until PAYMENT_POINTS_GATEWAY_ENABLED=true and a real provider is wired,
   * returns a structured "coming soon" response without crediting points.
   *
   * Future gateway flow:
   * 1. Create Payment (purpose POINTS_PURCHASE) via PaymentService
   * 2. Return checkoutUrl / requiresRedirect
   * 3. On webhook success → credit wallet + mark PointsPurchase SUCCEEDED
   */
  async initiatePurchaseCheckout(userId: string, role: Role, packageId: string) {
    if (role !== Role.FREELANCER) {
      throw new ForbiddenException('نقاطي متاح للمستقلين فقط');
    }

    const pkg = NUQATI_CONFIG.purchasePackages.find((p) => p.id === packageId);
    if (!pkg) throw new BadRequestException('باقة غير صالحة');

    const gatewayEnabled =
      this.configService.get<boolean>('payment.pointsGatewayEnabled') === true;

    const purchase = await this.prisma.pointsPurchase.create({
      data: {
        userId,
        pointsAmount: pkg.points,
        priceLyd: pkg.priceLyd,
        status: PaymentStatus.PENDING,
        provider: gatewayEnabled ? 'pending' : 'coming_soon',
        providerReference: gatewayEnabled
          ? null
          : `soon_pts_${randomUUID().slice(0, 8)}`,
      },
    });

    if (!gatewayEnabled) {
      return {
        purchaseId: purchase.id,
        package: {
          id: pkg.id,
          points: pkg.points,
          priceLyd: pkg.priceLyd,
        },
        status: 'COMING_SOON' as const,
        comingSoon: true,
        requiresRedirect: false,
        checkoutUrl: null as string | null,
        paymentMethods: [
          {
            id: 'electronic',
            type: 'electronic',
            available: false,
            comingSoon: true,
          },
        ],
        currency: this.configService.get<string>('payment.currency') ?? 'LYD',
        message: 'بوابة الدفع الإلكتروني قيد الإعداد — قريباً',
      };
    }

    // Placeholder for live gateway integration — keep pending until provider wired.
    return {
      purchaseId: purchase.id,
      package: {
        id: pkg.id,
        points: pkg.points,
        priceLyd: pkg.priceLyd,
      },
      status: 'PENDING' as const,
      comingSoon: true,
      requiresRedirect: false,
      checkoutUrl: null as string | null,
      paymentMethods: [
        {
          id: 'electronic',
          type: 'electronic',
          available: false,
          comingSoon: true,
        },
      ],
      currency: this.configService.get<string>('payment.currency') ?? 'LYD',
      message: 'بوابة الدفع الإلكتروني قيد الإعداد — قريباً',
    };
  }

  /** @deprecated Use initiatePurchaseCheckout — kept as alias for older clients. */
  async purchasePackage(userId: string, role: Role, packageId: string) {
    return this.initiatePurchaseCheckout(userId, role, packageId);
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
   * Single balance check for submit + boost, then two ledger charges when boost > 0
   * (PointsTransaction has no metadata field).
   */
  async chargeProposalSubmitWithBoost(
    userId: string,
    proposalId: string,
    boostPoints: number,
    tx: Tx,
  ) {
    const boost = Math.max(0, Math.floor(boostPoints || 0));
    const submitCost = NUQATI_CONFIG.proposalSubmitCost;
    const total = submitCost + boost;

    await this.ensureWallet(userId, tx);

    // Atomic conditional debit — prevents concurrent overdraft
    const updated = await tx.$queryRaw<{ balance: number }[]>`
      UPDATE "PointsWallet"
      SET balance = balance - ${total},
          "updatedAt" = CURRENT_TIMESTAMP
      WHERE "userId" = ${userId}
        AND balance >= ${total}
      RETURNING balance
    `;

    if (!updated.length) {
      throw new BadRequestException(
        boost > 0
          ? `ليس لديك نقاط كافية لإرسال هذا العرض. تحتاج ${total} نقاط (تقديم ${submitCost} + تعزيز ${boost}).`
          : 'ليس لديك نقاط كافية لإرسال هذا العرض.',
      );
    }

    const balanceAfterSubmit = updated[0].balance + boost;
    const balanceAfter = updated[0].balance;

    await tx.pointsTransaction.create({
      data: {
        userId,
        amount: -submitCost,
        type: PointsTransactionType.SPEND,
        reasonKey: 'PROPOSAL_SUBMIT',
        descriptionAr: 'تكلفة تقديم عرض على مشروع',
        referenceId: proposalId,
        balanceAfter: balanceAfterSubmit,
      },
    });

    if (boost > 0) {
      await tx.pointsTransaction.create({
        data: {
          userId,
          amount: -boost,
          type: PointsTransactionType.SPEND,
          reasonKey: 'PROPOSAL_BOOST',
          descriptionAr: `تعزيز ظهور العرض بـ ${boost} نقطة`,
          referenceId: proposalId,
          balanceAfter,
        },
      });
    }

    await this.launchProgram.trackAnalytics(
      userId,
      ProductAnalyticsEventType.PROPOSAL_POINTS_DEDUCTED,
      { proposalId, submitCost, boost, total },
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
}
