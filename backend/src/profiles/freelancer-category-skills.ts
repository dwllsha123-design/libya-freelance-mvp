/**
 * MVP COMPATIBILITY LAYER — NOT an authoritative freelancer↔category relation.
 *
 * Prisma has no FreelancerProfile.categoryId (Category is project-scoped).
 * Discovery therefore approximates specialization by mapping category slugs to
 * existing Skill.slug values. This is intentionally soft and incomplete.
 *
 * Rules:
 * - Only categories with a non-empty skill list participate in filtering.
 * - Empty / missing mappings must NOT silently return the unfiltered directory
 *   (callers should treat them as "no usable mapping" → empty result set).
 * - Do not present this map as a durable product taxonomy until a real schema
 *   relation exists.
 *
 * Unmapped / empty as of this file (no usable skill filter):
 * - engineering-architecture
 * - photography
 * - voice-over
 * - education-training
 * - consulting
 * - (any unknown slug not listed below)
 */
export const CATEGORY_SKILL_SLUGS: Record<string, readonly string[]> = {
  'programming-tech': ['react', 'next-js', 'node-js', 'nestjs', 'flutter'],
  ai: ['artificial-intelligence', 'data-analysis'],
  'design-graphic': ['figma', 'ui-ux', 'graphic-design'],
  'digital-marketing': ['digital-marketing', 'social-media'],
  'social-media': ['social-media', 'digital-marketing'],
  'writing-translation': ['translation'],
  'video-motion': ['video-editing'],
  'accounting-business': ['accounting'],
  /** Empty — no skill mapping; discovery must not fake category results. */
  'engineering-architecture': [],
  photography: [],
  'voice-over': [],
  'data-entry': ['data-analysis'],
  'education-training': [],
  consulting: [],
};

export function skillSlugsForCategory(categorySlug: string): string[] {
  return [...(CATEGORY_SKILL_SLUGS[categorySlug.toLowerCase()] ?? [])];
}

/** True when the soft map has at least one skill slug for this category. */
export function categoryHasSkillMapping(categorySlug: string): boolean {
  return skillSlugsForCategory(categorySlug).length > 0;
}
