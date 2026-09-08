export type ProfileCompletionInput = {
  profilePhoto?: string | null;
  professionalTitle?: string | null;
  bio?: string | null;
  cityId?: string | null;
  skillCount?: number;
  portfolioCount?: number;
};

export const PROFILE_COMPLETION_FIELDS = [
  'profilePhoto',
  'professionalTitle',
  'bio',
  'cityId',
  'skills',
  'portfolio',
] as const;

/**
 * Single source of truth for freelancer profile completion %.
 * Equal weight across fields that exist on Libyan Freelance today.
 */
export function calculateProfileCompletion(input: ProfileCompletionInput): {
  percent: number;
  completedFields: number;
  totalFields: number;
  missing: string[];
} {
  const checks: { key: string; ok: boolean }[] = [
    { key: 'profilePhoto', ok: Boolean(input.profilePhoto?.trim()) },
    {
      key: 'professionalTitle',
      ok: Boolean(input.professionalTitle?.trim()),
    },
    { key: 'bio', ok: Boolean(input.bio?.trim()) },
    { key: 'cityId', ok: Boolean(input.cityId) },
    { key: 'skills', ok: (input.skillCount ?? 0) > 0 },
    { key: 'portfolio', ok: (input.portfolioCount ?? 0) > 0 },
  ];

  const completedFields = checks.filter((c) => c.ok).length;
  const totalFields = checks.length;
  const percent = Math.round((completedFields / totalFields) * 100);
  const missing = checks.filter((c) => !c.ok).map((c) => c.key);

  return { percent, completedFields, totalFields, missing };
}

export function meetsProfileCompletionThreshold(
  percent: number,
  threshold = 80,
) {
  return percent >= threshold;
}
