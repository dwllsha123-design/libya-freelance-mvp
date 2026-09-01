type FreelancerVerificationInput = {
  emailVerified: boolean;
  profilePhoto: string | null;
  bio: string | null;
  completedProjects: number;
  averageRating: number;
  skillCount: number;
};

/** Simple trust criteria: verified email, complete profile, proven track record. */
export function isFreelancerVerified(input: FreelancerVerificationInput): boolean {
  const bio = input.bio?.trim() ?? '';
  return (
    input.emailVerified &&
    Boolean(input.profilePhoto) &&
    bio.length >= 20 &&
    input.skillCount >= 1 &&
    input.completedProjects >= 1 &&
    input.averageRating >= 4
  );
}
