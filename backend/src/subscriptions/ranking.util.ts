/**
 * Freelancer list ranking factors (quality first, Pro boost last).
 * Pro boost is a limited tie-breaker only — never the primary sort key.
 *
 * Documented order used by ProfilesService.listFreelancers:
 * 1. averageRating DESC
 * 2. completedProjects DESC
 * 3. proBoostScore DESC (0 or 1)
 * 4. createdAt DESC
 */
export type RankingCandidate = {
  averageRating: number;
  completedProjects: number;
  proBoostScore: number;
  createdAtMs: number;
};

export function compareFreelancerRanking(a: RankingCandidate, b: RankingCandidate): number {
  if (b.averageRating !== a.averageRating) return b.averageRating - a.averageRating;
  if (b.completedProjects !== a.completedProjects) {
    return b.completedProjects - a.completedProjects;
  }
  if (b.proBoostScore !== a.proBoostScore) return b.proBoostScore - a.proBoostScore;
  return b.createdAtMs - a.createdAtMs;
}

/** Clamp Pro boost to 0|1 so it cannot dominate ranking. */
export function clampProBoostScore(weight: number): number {
  if (!Number.isFinite(weight) || weight <= 0) return 0;
  return Math.min(1, Math.round(weight));
}
