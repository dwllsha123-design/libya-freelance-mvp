import { FreelancerPerformanceLevel } from '@prisma/client';

/** Earnings gating is prepared but disabled until payment protection is live. */
export const EARNINGS_REQUIREMENT_ENABLED = false;

export type PerformanceBadgeId = Exclude<
  FreelancerPerformanceLevel,
  'NONE'
>;

export type BadgeRequirementConfig = {
  id: PerformanceBadgeId;
  minCompletedProjects: number;
  minAverageRating: number;
  /** Future: min verified platform earnings. Null / ignored while disabled. */
  minPlatformEarnings: number | null;
};

export const PERFORMANCE_BADGE_REQUIREMENTS: readonly BadgeRequirementConfig[] = [
  {
    id: FreelancerPerformanceLevel.RISING,
    minCompletedProjects: 2,
    minAverageRating: 4.5,
    minPlatformEarnings: null,
  },
  {
    id: FreelancerPerformanceLevel.PROVEN,
    minCompletedProjects: 10,
    minAverageRating: 4.7,
    minPlatformEarnings: null,
  },
  {
    id: FreelancerPerformanceLevel.TOP_PERFORMER,
    minCompletedProjects: 25,
    minAverageRating: 4.8,
    minPlatformEarnings: null,
  },
  {
    id: FreelancerPerformanceLevel.ELITE,
    minCompletedProjects: 50,
    minAverageRating: 4.8,
    minPlatformEarnings: null,
  },
] as const;

const LEVEL_RANK: Record<FreelancerPerformanceLevel, number> = {
  NONE: 0,
  RISING: 1,
  PROVEN: 2,
  TOP_PERFORMER: 3,
  ELITE: 4,
};

export function performanceLevelRank(level: FreelancerPerformanceLevel): number {
  return LEVEL_RANK[level] ?? 0;
}

export function isPerformanceRequirementMet(
  config: BadgeRequirementConfig,
  stats: {
    completedProjects: number;
    averageRating: number;
    totalPlatformEarnings: number;
  },
): boolean {
  if (stats.completedProjects < config.minCompletedProjects) return false;
  if (stats.averageRating < config.minAverageRating) return false;
  if (
    EARNINGS_REQUIREMENT_ENABLED &&
    config.minPlatformEarnings != null &&
    stats.totalPlatformEarnings < config.minPlatformEarnings
  ) {
    return false;
  }
  return true;
}

/** Highest badge whose requirements are fully satisfied; otherwise NONE. */
export function resolvePerformanceLevel(stats: {
  completedProjects: number;
  averageRating: number;
  totalPlatformEarnings: number;
}): FreelancerPerformanceLevel {
  let current: FreelancerPerformanceLevel = FreelancerPerformanceLevel.NONE;
  for (const config of PERFORMANCE_BADGE_REQUIREMENTS) {
    if (isPerformanceRequirementMet(config, stats)) {
      current = config.id;
    }
  }
  return current;
}

export function nextPerformanceLevel(
  current: FreelancerPerformanceLevel,
): BadgeRequirementConfig | null {
  const rank = performanceLevelRank(current);
  return (
    PERFORMANCE_BADGE_REQUIREMENTS.find(
      (c) => performanceLevelRank(c.id) === rank + 1,
    ) ?? null
  );
}
