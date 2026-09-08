import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  FreelancerPerformanceLevel,
  NotificationType,
  ProjectStatus,
  Role,
} from '@prisma/client';
import { BadgeService } from '../src/badges/badge.service.js';
import { resolvePerformanceLevel } from '../src/badges/badge-requirements.js';

describe('BadgeService', () => {
  let prisma: {
    user: { findUnique: ReturnType<typeof vi.fn> };
    project: { count: ReturnType<typeof vi.fn> };
    review: { aggregate: ReturnType<typeof vi.fn> };
    freelancerProfile: {
      findFirst: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    $transaction: ReturnType<typeof vi.fn>;
  };
  let notifications: { create: ReturnType<typeof vi.fn> };
  let audit: { log: ReturnType<typeof vi.fn> };
  let service: BadgeService;

  beforeEach(() => {
    prisma = {
      user: { findUnique: vi.fn() },
      project: { count: vi.fn() },
      review: { aggregate: vi.fn() },
      freelancerProfile: {
        findFirst: vi.fn(),
        update: vi.fn(),
      },
      $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn(prisma)),
    };
    notifications = { create: vi.fn() };
    audit = { log: vi.fn() };
    service = new BadgeService(
      prisma as never,
      notifications as never,
      audit as never,
    );
  });

  it('excludes non-visible reviews from rating aggregate query', async () => {
    prisma.project.count.mockResolvedValue(2);
    prisma.review.aggregate.mockResolvedValue({
      _avg: { rating: 4.5 },
      _count: { rating: 2 },
    });
    prisma.freelancerProfile.findFirst.mockResolvedValue({
      totalPlatformEarnings: 0,
    });

    await service.computeStats('u1');

    expect(prisma.review.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          reviewedUserId: 'u1',
          isVisible: true,
          project: { status: ProjectStatus.COMPLETED },
        }),
      }),
    );
  });

  it('notifies once when climbing to a new performance level', async () => {
    prisma.freelancerProfile.findFirst.mockResolvedValue({
      id: 'fp1',
      performanceLevel: FreelancerPerformanceLevel.NONE,
      performanceLevelNotified: FreelancerPerformanceLevel.NONE,
      isVerifiedTalent: false,
      totalPlatformEarnings: 0,
    });
    prisma.project.count.mockResolvedValue(2);
    prisma.review.aggregate.mockResolvedValue({
      _avg: { rating: 4.6 },
      _count: { rating: 2 },
    });
    prisma.freelancerProfile.update.mockResolvedValue({});

    const level = await service.recalculateForUser('u1');

    expect(level).toBe(FreelancerPerformanceLevel.RISING);
    expect(notifications.create).toHaveBeenCalledWith(
      'u1',
      NotificationType.PERFORMANCE_BADGE_EARNED,
      expect.any(String),
      expect.stringContaining('مستقل صاعد'),
      '/dashboard',
      undefined,
    );
    expect(prisma.freelancerProfile.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          performanceLevelNotified: FreelancerPerformanceLevel.RISING,
        }),
      }),
    );
  });

  it('does not re-notify the same performance level', async () => {
    prisma.freelancerProfile.findFirst.mockResolvedValue({
      id: 'fp1',
      performanceLevel: FreelancerPerformanceLevel.RISING,
      performanceLevelNotified: FreelancerPerformanceLevel.RISING,
      isVerifiedTalent: false,
      totalPlatformEarnings: 0,
    });
    prisma.project.count.mockResolvedValue(3);
    prisma.review.aggregate.mockResolvedValue({
      _avg: { rating: 4.6 },
      _count: { rating: 3 },
    });
    prisma.freelancerProfile.update.mockResolvedValue({});

    await service.recalculateForUser('u1');

    expect(notifications.create).not.toHaveBeenCalled();
  });

  it('grants verified talent with audit log', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      role: Role.FREELANCER,
      profile: {
        freelancerProfile: {
          id: 'fp1',
          isVerifiedTalent: false,
        },
      },
    });
    prisma.freelancerProfile.findFirst.mockResolvedValue({
      performanceLevel: FreelancerPerformanceLevel.RISING,
      isVerifiedTalent: true,
      verifiedTalentAt: new Date(),
      completedProjects: 2,
      averageRating: 4.5,
      totalPlatformEarnings: 0,
    });
    prisma.freelancerProfile.update.mockResolvedValue({});

    const result = await service.grantVerifiedTalent('admin1', 'u1');

    expect(audit.log).toHaveBeenCalled();
    expect(result.isVerifiedTalent).toBe(true);
  });

  it('rejects verified talent grant for non-freelancers', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      role: Role.CLIENT,
      profile: { freelancerProfile: null },
    });

    await expect(service.grantVerifiedTalent('admin1', 'u1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('blocks non-freelancer badge progress endpoint', async () => {
    prisma.user.findUnique.mockResolvedValue({
      role: Role.CLIENT,
      profile: null,
    });

    await expect(service.getMyBadgeProgress('u1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});

describe('resolvePerformanceLevel edge cases', () => {
  it('chooses highest satisfied badge only', () => {
    expect(
      resolvePerformanceLevel({
        completedProjects: 30,
        averageRating: 4.75,
        totalPlatformEarnings: 0,
      }),
    ).toBe(FreelancerPerformanceLevel.PROVEN);
  });
});
