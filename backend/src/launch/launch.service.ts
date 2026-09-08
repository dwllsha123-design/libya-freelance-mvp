import { Injectable } from '@nestjs/common';
import {
  NotificationType,
  ProductAnalyticsEventType,
  Prisma,
  Role,
  UserStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import {
  calculateProfileCompletion,
  meetsProfileCompletionThreshold,
} from '../profiles/profile-completion.util.js';
import {
  LAUNCH_PROGRAM_DEFAULTS,
  LAUNCH_PROGRAM_STATE_ID,
  type LaunchProgramConfig,
} from './launch.config.js';

type Tx = Prisma.TransactionClient;

@Injectable()
export class LaunchProgramService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async ensureState(tx?: Tx) {
    const db = tx ?? this.prisma;
    return db.launchProgramState.upsert({
      where: { id: LAUNCH_PROGRAM_STATE_ID },
      create: {
        id: LAUNCH_PROGRAM_STATE_ID,
        enabled: LAUNCH_PROGRAM_DEFAULTS.enabled,
        freelancerCommissionPercent:
          LAUNCH_PROGRAM_DEFAULTS.freelancerCommissionPercent,
        welcomePoints: LAUNCH_PROGRAM_DEFAULTS.welcomePoints,
        profileCompletionReward:
          LAUNCH_PROGRAM_DEFAULTS.profileCompletionReward,
        profileCompletionThreshold:
          LAUNCH_PROGRAM_DEFAULTS.profileCompletionThreshold,
        foundingFreelancerLimit:
          LAUNCH_PROGRAM_DEFAULTS.foundingFreelancerLimit,
        foundingPermanentCount: 0,
      },
      update: {},
    });
  }

  async getConfig(tx?: Tx): Promise<LaunchProgramConfig> {
    const state = await this.ensureState(tx);
    const limit = state.foundingFreelancerLimit;
    const count = state.foundingPermanentCount;
    return {
      enabled: state.enabled,
      freelancerCommissionPercent: Number(state.freelancerCommissionPercent),
      welcomePoints: state.welcomePoints,
      profileCompletionReward: state.profileCompletionReward,
      profileCompletionThreshold: state.profileCompletionThreshold,
      foundingFreelancerLimit: limit,
      foundingPermanentCount: count,
      slotsRemaining: Math.max(0, limit - count),
    };
  }

  async getPublicStatus() {
    const config = await this.getConfig();
    return {
      enabled: config.enabled,
      freelancerCommissionPercent: config.freelancerCommissionPercent,
      welcomePoints: config.welcomePoints,
      profileCompletionReward: config.profileCompletionReward,
      profileCompletionThreshold: config.profileCompletionThreshold,
      foundingFreelancerLimit: config.foundingFreelancerLimit,
      foundingPermanentCount: config.foundingPermanentCount,
      slotsRemaining: config.slotsRemaining,
      paymentProtectionActive: false,
      paymentProtectionStatus: 'COMING_SOON' as const,
    };
  }

  async getAdminOverview() {
    const config = await this.getConfig();
    return {
      ...config,
      paymentProtectionActive: false,
      paymentProtectionStatus: 'COMING_SOON' as const,
    };
  }

  async getUserLaunchStatus(userId: string) {
    const config = await this.getConfig();
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: {
          include: {
            freelancerProfile: {
              include: {
                skills: true,
                portfolio: { where: { isVisible: true }, select: { id: true } },
              },
            },
          },
        },
        pointsWallet: true,
        pointsTaskCompletions: {
          where: {
            taskKey: { in: ['WELCOME_BONUS', 'PROFILE_COMPLETE'] },
            periodKey: '',
          },
        },
      },
    });

    if (!user) {
      return null;
    }

    const fp = user.profile?.freelancerProfile;
    const completion = calculateProfileCompletion({
      profilePhoto: user.profile?.profilePhoto,
      professionalTitle: fp?.professionalTitle,
      bio: user.profile?.bio,
      cityId: user.profile?.cityId,
      skillCount: fp?.skills.length ?? 0,
      portfolioCount: fp?.portfolio.length ?? 0,
    });

    const welcomeAwarded = user.pointsTaskCompletions.some(
      (t) => t.taskKey === 'WELCOME_BONUS',
    );
    const profileRewardAwarded = user.pointsTaskCompletions.some(
      (t) => t.taskKey === 'PROFILE_COMPLETE',
    );

    return {
      config: {
        enabled: config.enabled,
        freelancerCommissionPercent: config.freelancerCommissionPercent,
        welcomePoints: config.welcomePoints,
        profileCompletionReward: config.profileCompletionReward,
        profileCompletionThreshold: config.profileCompletionThreshold,
        foundingFreelancerLimit: config.foundingFreelancerLimit,
        foundingPermanentCount: config.foundingPermanentCount,
        slotsRemaining: config.slotsRemaining,
      },
      balance: user.pointsWallet?.balance ?? 0,
      welcomeAwarded,
      profileRewardAwarded,
      profileCompletionPercent: completion.percent,
      profileCompletionMissing: completion.missing,
      meetsProfileThreshold: meetsProfileCompletionThreshold(
        completion.percent,
        config.profileCompletionThreshold,
      ),
      isFoundingFreelancer: fp?.isFoundingFreelancer ?? false,
      foundingSlotNumber: fp?.foundingSlotNumber ?? null,
      foundingFreelancerAt: fp?.foundingFreelancerAt?.toISOString() ?? null,
      role: user.role,
      emailVerified: user.emailVerified,
      paymentProtectionActive: false,
    };
  }

  /**
   * Atomically award Founding Freelancer if qualified and slots remain.
   * Never exceeds foundingFreelancerLimit under concurrency.
   */
  async evaluateFoundingFreelancer(userId: string, tx?: Tx) {
    const run = async (db: Tx) => {
      const config = await this.getConfig(db);
      if (!config.enabled) {
        return { awarded: false as const, reason: 'disabled' as const };
      }

      const user = await db.user.findUnique({
        where: { id: userId },
        include: {
          profile: {
            include: {
              freelancerProfile: {
                include: {
                  skills: true,
                  portfolio: {
                    where: { isVisible: true },
                    select: { id: true },
                  },
                },
              },
            },
          },
        },
      });

      if (!user?.profile?.freelancerProfile) {
        return { awarded: false as const, reason: 'not_freelancer' as const };
      }

      const fp = user.profile.freelancerProfile;
      if (fp.isFoundingFreelancer) {
        return {
          awarded: false as const,
          reason: 'already_founding' as const,
          slot: fp.foundingSlotNumber,
        };
      }

      if (user.status !== UserStatus.ACTIVE) {
        return { awarded: false as const, reason: 'inactive' as const };
      }

      if (user.role !== Role.FREELANCER) {
        return { awarded: false as const, reason: 'wrong_role' as const };
      }

      if (!user.emailVerified) {
        return {
          awarded: false as const,
          reason: 'email_unverified' as const,
        };
      }

      const completion = calculateProfileCompletion({
        profilePhoto: user.profile.profilePhoto,
        professionalTitle: fp.professionalTitle,
        bio: user.profile.bio,
        cityId: user.profile.cityId,
        skillCount: fp.skills.length,
        portfolioCount: fp.portfolio.length,
      });

      if (
        !meetsProfileCompletionThreshold(
          completion.percent,
          config.profileCompletionThreshold,
        )
      ) {
        return {
          awarded: false as const,
          reason: 'profile_incomplete' as const,
          percent: completion.percent,
        };
      }

      // Lock counter row and reserve a slot atomically
      const reserved = await db.$queryRaw<
        { foundingPermanentCount: number; foundingFreelancerLimit: number }[]
      >`
        UPDATE "LaunchProgramState"
        SET "foundingPermanentCount" = "foundingPermanentCount" + 1,
            "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = ${LAUNCH_PROGRAM_STATE_ID}
          AND "foundingPermanentCount" < "foundingFreelancerLimit"
        RETURNING "foundingPermanentCount", "foundingFreelancerLimit"
      `;

      if (!reserved.length) {
        return { awarded: false as const, reason: 'slots_full' as const };
      }

      const slot = reserved[0].foundingPermanentCount;
      const now = new Date();

      try {
        await db.freelancerProfile.update({
          where: { id: fp.id },
          data: {
            isFoundingFreelancer: true,
            foundingFreelancerAt: now,
            foundingSlotNumber: slot,
          },
        });
      } catch (err) {
        // Roll back counter if profile update fails (e.g. unique slot race)
        await db.$executeRaw`
          UPDATE "LaunchProgramState"
          SET "foundingPermanentCount" = GREATEST("foundingPermanentCount" - 1, 0),
              "updatedAt" = CURRENT_TIMESTAMP
          WHERE "id" = ${LAUNCH_PROGRAM_STATE_ID}
        `;
        throw err;
      }

      await db.productAnalyticsEvent.create({
        data: {
          userId,
          eventType: ProductAnalyticsEventType.FOUNDING_FREELANCER_AWARDED,
          metadata: { slot },
        },
      });

      await this.notifications.create(
        userId,
        NotificationType.FOUNDING_FREELANCER_AWARDED,
        'مبروك 🎉',
        'أصبحت من المستقلين المؤسسين في Libyan Freelance.',
        '/dashboard',
        db,
      );

      return { awarded: true as const, slot };
    };

    if (tx) {
      return run(tx);
    }

    return this.prisma.$transaction((inner) => run(inner));
  }

  async trackAnalytics(
    userId: string | null,
    eventType: ProductAnalyticsEventType,
    metadata?: Prisma.InputJsonValue,
    tx?: Tx,
  ) {
    const db = tx ?? this.prisma;
    await db.productAnalyticsEvent.create({
      data: {
        userId: userId ?? undefined,
        eventType,
        metadata: metadata ?? undefined,
      },
    });
  }
}
