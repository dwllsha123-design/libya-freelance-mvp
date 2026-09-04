/**
 * Prisma CLI seed entry — re-exports the shared reference seed used at API boot.
 */
export {
  REFERENCE_CATEGORIES as categories,
  REFERENCE_CITIES as cities,
  REFERENCE_SKILLS as skills,
  seedReferenceData,
  slugifySkillName as slugify,
} from '../src/reference-data/seed-reference-data.js';
