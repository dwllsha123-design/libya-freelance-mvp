export type PerformanceLevel =
  | 'NONE'
  | 'RISING'
  | 'PROVEN'
  | 'TOP_PERFORMER'
  | 'ELITE';

export type BadgeRequirementProgress = {
  required: number;
  current: number;
  completed: boolean;
  enabled?: boolean;
};

export type PerformanceBadgeProgress = {
  id: Exclude<PerformanceLevel, 'NONE'>;
  earned: boolean;
  requirements: {
    completedProjects: BadgeRequirementProgress;
    averageRating: BadgeRequirementProgress;
    totalPlatformEarnings?: BadgeRequirementProgress;
  };
};

export type FreelancerBadgesResponse = {
  currentLevel: PerformanceLevel;
  verifiedTalent: boolean;
  verifiedTalentAt: string | null;
  nextLevel: Exclude<PerformanceLevel, 'NONE'> | null;
  earningsRequirementEnabled: boolean;
  stats: {
    completedProjects: number;
    averageRating: number;
    reviewCount: number;
    totalPlatformEarnings: number;
  };
  badges: PerformanceBadgeProgress[];
  verifiedTalentBadge: {
    id: 'VERIFIED_TALENT';
    earned: boolean;
    adminGranted: boolean;
  };
  nextLevelProgress: PerformanceBadgeProgress | null;
};
