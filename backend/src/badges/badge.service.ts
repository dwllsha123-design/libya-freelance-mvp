import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AdminAuditAction,
  FreelancerPerformanceLevel,
  NotificationType,
  Prisma,
  ProjectStatus,
  Role,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { AdminAuditService } from '../admin/admin-audit.service.js';
import {
  EARNINGS_REQUIREMENT_ENABLED,
  PERFORMANCE_BADGE_REQUIREMENTS,
  isPerformanceRequirementMet,
  nextPerformanceLevel,
  performanceLevelRank,
  resolvePerformanceLevel,
  type BadgeRequirementConfig,
} from './badge-requirements.js';

export type FreelancerBadgeStats = {
  completedProjects: number;
  averageRating: number;
  totalPlatformEarnings: number;
  reviewCount: number;
};

@Injectable()
export class BadgeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly audit: AdminAuditService,
  ) {}

  /**
   * Source-of-truth stats for badge calculation.
   * - completedProjects: COMPLETED projects where this user is the accepted freelancer
   * - averageRating: visible reviews on COMPLETED projects only
   * - totalPlatformEarnings: cached verified earnings (not used for badges yet)
   */
  async computeStats(
    userId: string,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<FreelancerBadgeStats> {
    const [completedProjects, ratingAgg, profile] = await Promise.all([
      tx.project.count({
        where: {
          status: ProjectStatus.COMPLETED,
          acceptedProposal: { freelancerId: userId },
        },
      }),
      tx.review.aggregate({
        where: {
          reviewedUserId: userId,
          isVisible: true,
          project: { status: ProjectStatus.COMPLETED },
        },
        _avg: { rating: true },
        _count: { rating: true },
      }),
      tx.freelancerProfile.findFirst({
        where: { profile: { userId } },
        select: { totalPlatformEarnings: true },
      }),
    ]);

    return {
      completedProjects,
      averageRating: Number(ratingAgg._avg.rating ?? 0),
      reviewCount: ratingAgg._count.rating,
      totalPlatformEarnings: profile
        ? Number(profile.totalPlatformEarnings)
        : 0,
    };
  }

  resolveLevel(stats: FreelancerBadgeStats): FreelancerPerformanceLevel {
    return resolvePerformanceLevel(stats);
  }

  async getMyBadgeProgress(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
        profile: {
          select: {
            freelancerProfile: {
              select: {
                performanceLevel: true,
                isVerifiedTalent: true,
                verifiedTalentAt: true,
                isFoundingFreelancer: true,
                foundingFreelancerAt: true,
                foundingSlotNumber: true,
              },
            },
          },
        },
      },
    });

    if (!user || user.role !== Role.FREELANCER || !user.profile?.freelancerProfile) {
      throw new ForbiddenException('شارات الأداء متاحة للمستقلين فقط');
    }

    const stats = await this.computeStats(userId);
    const currentLevel = this.resolveLevel(stats);
    const fp = user.profile.freelancerProfile;

    return {
      ...this.buildProgressPayload({
        currentLevel,
        verifiedTalent: fp.isVerifiedTalent,
        verifiedTalentAt: fp.verifiedTalentAt,
        stats,
      }),
      foundingFreelancer: {
        earned: fp.isFoundingFreelancer,
        awardedAt: fp.foundingFreelancerAt?.toISOString() ?? null,
        slotNumber: fp.foundingSlotNumber,
      },
    };
  }

  buildProgressPayload(input: {
    currentLevel: FreelancerPerformanceLevel;
    verifiedTalent: boolean;
    verifiedTalentAt?: Date | null;
    stats: FreelancerBadgeStats;
  }) {
    const { currentLevel, verifiedTalent, stats } = input;
    const next = nextPerformanceLevel(currentLevel);

    return {
      currentLevel,
      verifiedTalent,
      verifiedTalentAt: input.verifiedTalentAt?.toISOString() ?? null,
      nextLevel: next?.id ?? null,
      earningsRequirementEnabled: EARNINGS_REQUIREMENT_ENABLED,
      stats: {
        completedProjects: stats.completedProjects,
        averageRating: Number(stats.averageRating.toFixed(2)),
        reviewCount: stats.reviewCount,
        totalPlatformEarnings: stats.totalPlatformEarnings,
      },
      badges: PERFORMANCE_BADGE_REQUIREMENTS.map((config) =>
        this.formatBadgeProgress(config, stats),
      ),
      verifiedTalentBadge: {
        id: 'VERIFIED_TALENT',
        earned: verifiedTalent,
        adminGranted: true,
      },
      nextLevelProgress: next
        ? this.formatBadgeProgress(next, stats)
        : null,
    };
  }

  private formatBadgeProgress(
    config: BadgeRequirementConfig,
    stats: FreelancerBadgeStats,
  ) {
    const projectsDone = stats.completedProjects >= config.minCompletedProjects;
    const ratingDone = stats.averageRating >= config.minAverageRating;
    const earningsConfigured = config.minPlatformEarnings != null;
    const earningsDone =
      !EARNINGS_REQUIREMENT_ENABLED ||
      !earningsConfigured ||
      stats.totalPlatformEarnings >= (config.minPlatformEarnings ?? 0);

    const earned = isPerformanceRequirementMet(config, stats);

    return {
      id: config.id,
      earned,
      requirements: {
        completedProjects: {
          required: config.minCompletedProjects,
          current: stats.completedProjects,
          completed: projectsDone,
        },
        averageRating: {
          required: config.minAverageRating,
          current: Number(stats.averageRating.toFixed(2)),
          completed: ratingDone,
        },
        ...(earningsConfigured
          ? {
              totalPlatformEarnings: {
                required: config.minPlatformEarnings,
                current: stats.totalPlatformEarnings,
                completed: earningsDone,
                enabled: EARNINGS_REQUIREMENT_ENABLED,
              },
            }
          : {}),
      },
    };
  }

  /**
   * Recalculate performance level + sync cached stats.
   * Sends a one-time notification when the freelancer climbs to a new level.
   */
  async recalculateForUser(
    userId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<FreelancerPerformanceLevel> {
    if (tx) {
      const result = await this.recalculateInTx(userId, tx);
      // Caller owns the transaction — notification may be delayed until after commit.
      if (result.notifyLevel) {
        await this.sendBadgeNotification(userId, result.notifyLevel, tx);
        await tx.freelancerProfile.update({
          where: { id: result.profileId },
          data: { performanceLevelNotified: result.notifyLevel },
        });
      }
      return result.level;
    }

    const result = await this.prisma.$transaction((inner) =>
      this.recalculateInTx(userId, inner),
    );

    if (result.notifyLevel) {
      await this.sendBadgeNotification(userId, result.notifyLevel);
      await this.prisma.freelancerProfile.update({
        where: { id: result.profileId },
        data: { performanceLevelNotified: result.notifyLevel },
      });
    }

    return result.level;
  }

  private async recalculateInTx(
    userId: string,
    tx: Prisma.TransactionClient,
  ): Promise<{
    level: FreelancerPerformanceLevel;
    profileId: string;
    notifyLevel: FreelancerPerformanceLevel | null;
  }> {
    const fp = await tx.freelancerProfile.findFirst({
      where: { profile: { userId } },
      select: {
        id: true,
        performanceLevel: true,
        performanceLevelNotified: true,
        isVerifiedTalent: true,
      },
    });

    if (!fp) {
      return {
        level: FreelancerPerformanceLevel.NONE,
        profileId: '',
        notifyLevel: null,
      };
    }

    const stats = await this.computeStats(userId, tx);
    const nextLevel = this.resolveLevel(stats);

    await tx.freelancerProfile.update({
      where: { id: fp.id },
      data: {
        completedProjects: stats.completedProjects,
        averageRating: stats.averageRating,
        performanceLevel: nextLevel,
      },
    });

    const shouldNotify =
      performanceLevelRank(nextLevel) >
        performanceLevelRank(fp.performanceLevelNotified) &&
      nextLevel !== FreelancerPerformanceLevel.NONE;

    return {
      level: nextLevel,
      profileId: fp.id,
      notifyLevel: shouldNotify ? nextLevel : null,
    };
  }

  private async sendBadgeNotification(
    userId: string,
    level: FreelancerPerformanceLevel,
    tx?: Prisma.TransactionClient,
  ) {
    const { title, message } = this.badgeNotificationCopy(level);
    await this.notifications.create(
      userId,
      NotificationType.PERFORMANCE_BADGE_EARNED,
      title,
      message,
      '/dashboard',
      tx,
    );
  }

  private badgeNotificationCopy(level: FreelancerPerformanceLevel): {
    title: string;
    message: string;
  } {
    const names: Record<Exclude<FreelancerPerformanceLevel, 'NONE'>, string> = {
      RISING: 'مستقل صاعد',
      PROVEN: 'مستقل مُثبت',
      TOP_PERFORMER: 'أداء متميز',
      ELITE: 'مستقل نخبة',
    };
    const name = names[level as Exclude<FreelancerPerformanceLevel, 'NONE'>];
    if (level === FreelancerPerformanceLevel.ELITE) {
      return {
        title: 'إنجاز جديد 🎉',
        message: `وصلت إلى مستوى "${name}".`,
      };
    }
    return {
      title: 'مبروك 🎉',
      message: `حصلت على شارة "${name}".`,
    };
  }

  async grantVerifiedTalent(adminId: string, freelancerUserId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: freelancerUserId },
      include: { profile: { include: { freelancerProfile: true } } },
    });

    if (!user || user.role !== Role.FREELANCER || !user.profile?.freelancerProfile) {
      throw new NotFoundException('المستقل غير موجود');
    }

    const fp = user.profile.freelancerProfile;
    if (fp.isVerifiedTalent) {
      return this.getPublicBadgeSnapshot(freelancerUserId);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.freelancerProfile.update({
        where: { id: fp.id },
        data: {
          isVerifiedTalent: true,
          verifiedTalentAt: new Date(),
          verifiedTalentByAdminId: adminId,
        },
      });
      await this.audit.log(
        adminId,
        AdminAuditAction.VERIFIED_TALENT_GRANTED,
        'FreelancerProfile',
        fp.id,
        { freelancerUserId },
        tx,
      );
    });

    return this.getPublicBadgeSnapshot(freelancerUserId);
  }

  async revokeVerifiedTalent(adminId: string, freelancerUserId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: freelancerUserId },
      include: { profile: { include: { freelancerProfile: true } } },
    });

    if (!user || user.role !== Role.FREELANCER || !user.profile?.freelancerProfile) {
      throw new NotFoundException('المستقل غير موجود');
    }

    const fp = user.profile.freelancerProfile;
    if (!fp.isVerifiedTalent) {
      return this.getPublicBadgeSnapshot(freelancerUserId);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.freelancerProfile.update({
        where: { id: fp.id },
        data: {
          isVerifiedTalent: false,
          verifiedTalentAt: null,
          verifiedTalentByAdminId: null,
        },
      });
      await this.audit.log(
        adminId,
        AdminAuditAction.VERIFIED_TALENT_REMOVED,
        'FreelancerProfile',
        fp.id,
        { freelancerUserId },
        tx,
      );
    });

    return this.getPublicBadgeSnapshot(freelancerUserId);
  }

  async getPublicBadgeSnapshot(userId: string) {
    const fp = await this.prisma.freelancerProfile.findFirst({
      where: { profile: { userId } },
      select: {
        performanceLevel: true,
        isVerifiedTalent: true,
        verifiedTalentAt: true,
        completedProjects: true,
        averageRating: true,
        totalPlatformEarnings: true,
      },
    });

    if (!fp) {
      return {
        performanceLevel: FreelancerPerformanceLevel.NONE,
        isVerifiedTalent: false,
        verifiedTalentAt: null,
        completedProjects: 0,
        averageRating: 0,
        totalPlatformEarnings: 0,
      };
    }

    return {
      performanceLevel: fp.performanceLevel,
      isVerifiedTalent: fp.isVerifiedTalent,
      verifiedTalentAt: fp.verifiedTalentAt?.toISOString() ?? null,
      completedProjects: fp.completedProjects,
      averageRating: fp.averageRating,
      totalPlatformEarnings: Number(fp.totalPlatformEarnings),
    };
  }
}
