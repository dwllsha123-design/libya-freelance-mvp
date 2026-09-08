import { FreelancerPerformanceLevel } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import {
  EARNINGS_REQUIREMENT_ENABLED,
  isPerformanceRequirementMet,
  resolvePerformanceLevel,
} from '../src/badges/badge-requirements.js';

describe('badge-requirements', () => {
  it('returns NONE for 0 projects', () => {
    expect(
      resolvePerformanceLevel({
        completedProjects: 0,
        averageRating: 5,
        totalPlatformEarnings: 0,
      }),
    ).toBe(FreelancerPerformanceLevel.NONE);
  });

  it('returns NONE for 1 project even with high rating', () => {
    expect(
      resolvePerformanceLevel({
        completedProjects: 1,
        averageRating: 5,
        totalPlatformEarnings: 0,
      }),
    ).toBe(FreelancerPerformanceLevel.NONE);
  });

  it('awards RISING at 2 projects and 4.5 rating', () => {
    expect(
      resolvePerformanceLevel({
        completedProjects: 2,
        averageRating: 4.5,
        totalPlatformEarnings: 0,
      }),
    ).toBe(FreelancerPerformanceLevel.RISING);
  });

  it('awards PROVEN at 10 projects and 4.7 rating', () => {
    expect(
      resolvePerformanceLevel({
        completedProjects: 10,
        averageRating: 4.7,
        totalPlatformEarnings: 0,
      }),
    ).toBe(FreelancerPerformanceLevel.PROVEN);
  });

  it('awards TOP_PERFORMER at 25 projects and 4.8 rating', () => {
    expect(
      resolvePerformanceLevel({
        completedProjects: 25,
        averageRating: 4.8,
        totalPlatformEarnings: 0,
      }),
    ).toBe(FreelancerPerformanceLevel.TOP_PERFORMER);
  });

  it('awards ELITE at 50 projects and 4.8 rating', () => {
    expect(
      resolvePerformanceLevel({
        completedProjects: 50,
        averageRating: 4.8,
        totalPlatformEarnings: 0,
      }),
    ).toBe(FreelancerPerformanceLevel.ELITE);
  });

  it('falls back to lower eligible badge when elite rating is missing', () => {
    expect(
      resolvePerformanceLevel({
        completedProjects: 50,
        averageRating: 4.6,
        totalPlatformEarnings: 0,
      }),
    ).toBe(FreelancerPerformanceLevel.RISING);
  });

  it('does not use earnings while the gate is disabled', () => {
    expect(EARNINGS_REQUIREMENT_ENABLED).toBe(false);
    expect(
      isPerformanceRequirementMet(
        {
          id: FreelancerPerformanceLevel.RISING,
          minCompletedProjects: 2,
          minAverageRating: 4.5,
          minPlatformEarnings: 1000,
        },
        {
          completedProjects: 2,
          averageRating: 4.5,
          totalPlatformEarnings: 0,
        },
      ),
    ).toBe(true);
  });
});
