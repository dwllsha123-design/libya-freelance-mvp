/**
 * Central Launch Program defaults.
 * Runtime values live in LaunchProgramState (DB) and are read via LaunchProgramService.
 * Do not scatter these numbers across the frontend.
 */
export const LAUNCH_PROGRAM_DEFAULTS = {
  enabled: true,
  freelancerCommissionPercent: 0,
  welcomePoints: 55,
  profileCompletionReward: 5,
  profileCompletionThreshold: 80,
  foundingFreelancerLimit: 1000,
} as const;

export const LAUNCH_PROGRAM_STATE_ID = 'default';

export type LaunchProgramConfig = {
  enabled: boolean;
  freelancerCommissionPercent: number;
  welcomePoints: number;
  profileCompletionReward: number;
  profileCompletionThreshold: number;
  foundingFreelancerLimit: number;
  foundingPermanentCount: number;
  slotsRemaining: number;
};
