import { Role } from '@prisma/client';
import {
  calculateProfileCompletion,
  meetsProfileCompletionThreshold,
  type ProfileCompletionInput,
} from '../profiles/profile-completion.util.js';
import { LAUNCH_PROGRAM_DEFAULTS } from '../launch/launch.config.js';

export type MarketplaceActivityCounts = {
  proposals: number;
  projectsAsClient: number;
  escrowsAsFreelancer: number;
  escrowsAsClient: number;
  reviewsGiven: number;
  reviewsReceived: number;
  conversationMembers: number;
  projectAgreementsAsFreelancer: number;
  projectAgreementsAsClient: number;
};

export type IncompleteDeleteDecision =
  | { allowed: true; profileCompletionPercent: number }
  | { allowed: false; reason: string; profileCompletionPercent?: number };

/**
 * Hard-delete is only for incomplete marketplace freelancers with no marketplace activity.
 * Prevents wiping accounts that have proposals, escrow, reviews, chats, or agreements.
 */
export function evaluateIncompleteFreelancerDeletion(input: {
  role: Role;
  profile: ProfileCompletionInput;
  activity: MarketplaceActivityCounts;
  threshold?: number;
}): IncompleteDeleteDecision {
  if (input.role !== Role.FREELANCER) {
    return {
      allowed: false,
      reason: 'يمكن حذف حسابات المستقلين غير المكتملة فقط من هذا الإجراء',
    };
  }

  const threshold =
    input.threshold ?? LAUNCH_PROGRAM_DEFAULTS.profileCompletionThreshold;
  const completion = calculateProfileCompletion(input.profile);

  if (meetsProfileCompletionThreshold(completion.percent, threshold)) {
    return {
      allowed: false,
      reason: 'لا يمكن حذف حساب مكتمل الملف الشخصي',
      profileCompletionPercent: completion.percent,
    };
  }

  const activityTotal = Object.values(input.activity).reduce((a, b) => a + b, 0);
  if (activityTotal > 0) {
    return {
      allowed: false,
      reason:
        'لا يمكن حذف الحساب لوجود نشاط مرتبط (عروض، مشاريع، محادثات، تقييمات، أو اتفاقيات)',
      profileCompletionPercent: completion.percent,
    };
  }

  return {
    allowed: true,
    profileCompletionPercent: completion.percent,
  };
}
