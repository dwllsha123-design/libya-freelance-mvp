/** Public launch program status from GET /launch/program */
export type LaunchPublicProgram = {
  enabled: boolean;
  freelancerCommissionPercent: number;
  welcomePoints: number;
  profileCompletionReward: number;
  profileCompletionThreshold: number;
  foundingFreelancerLimit: number;
  foundingPermanentCount: number;
  slotsRemaining: number;
  paymentProtectionActive: boolean;
  paymentProtectionStatus: 'COMING_SOON' | string;
};

export type LaunchProgramConfigSnapshot = {
  enabled: boolean;
  freelancerCommissionPercent: number;
  welcomePoints: number;
  profileCompletionReward: number;
  profileCompletionThreshold: number;
  foundingFreelancerLimit: number;
  foundingPermanentCount: number;
  slotsRemaining: number;
};

/** Authenticated launch status from GET /launch/me */
export type LaunchUserStatus = {
  config: LaunchProgramConfigSnapshot;
  balance: number;
  welcomeAwarded: boolean;
  profileRewardAwarded: boolean;
  profileCompletionPercent: number;
  profileCompletionMissing?: string[];
  meetsProfileThreshold: boolean;
  isFoundingFreelancer: boolean;
  foundingSlotNumber: number | null;
  foundingFreelancerAt: string | null;
  role: string;
  emailVerified: boolean;
  paymentProtectionActive: boolean;
};

export type LaunchAdminOverview = LaunchPublicProgram;

export type FoundingFreelancerBadge = {
  earned: boolean;
  awardedAt: string | null;
  slotNumber: number | null;
};

export const LAUNCH_DEFAULTS = {
  welcomePoints: 55,
  profileCompletionReward: 5,
  profileCompletionThreshold: 80,
  foundingFreelancerLimit: 1000,
  freelancerCommissionPercent: 0,
} as const;

export function isLaunchProgramActive(
  program: Pick<LaunchPublicProgram, 'enabled'> | null | undefined,
): boolean {
  return Boolean(program?.enabled);
}

export function showProfileCompletionRewardCta(
  status: Pick<LaunchUserStatus, 'profileRewardAwarded' | 'config'> | null | undefined,
): boolean {
  if (!status?.config.enabled) return false;
  return !status.profileRewardAwarded;
}

export function foundingCountLabel(
  program: Pick<
    LaunchPublicProgram,
    'foundingPermanentCount' | 'foundingFreelancerLimit'
  > | null | undefined,
): { count: number; limit: number } | null {
  if (!program) return null;
  const limit = program.foundingFreelancerLimit || LAUNCH_DEFAULTS.foundingFreelancerLimit;
  const count = Math.max(0, program.foundingPermanentCount ?? 0);
  return { count, limit };
}
