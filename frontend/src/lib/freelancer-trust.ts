import type { PublicProfile } from '@/lib/api';

export function isFreelancerVerified(profile: PublicProfile): boolean {
  if (profile.freelancer?.isVerified !== undefined) {
    return profile.freelancer.isVerified;
  }

  const bio = profile.bio?.trim() ?? '';
  const skills = profile.freelancer?.skills?.length ?? 0;

  return (
    Boolean(profile.profilePhoto) &&
    bio.length >= 20 &&
    skills >= 1 &&
    (profile.freelancer?.completedProjects ?? 0) >= 1 &&
    (profile.freelancer?.averageRating ?? 0) >= 4
  );
}

export const VERIFICATION_CRITERIA_AR = [
  'بريد إلكتروني مُفعَّل',
  'صورة شخصية ونبذة مهنية',
  'مهارة واحدة على الأقل',
  'مشروع مكتمل واحد على الأقل',
  'تقييم 4 نجوم فأعلى',
] as const;
