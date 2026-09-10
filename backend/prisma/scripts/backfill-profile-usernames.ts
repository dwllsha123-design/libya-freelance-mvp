/**
 * One-off / ops backfill for Profile.username permalinks.
 *
 * Profile.username already exists (@unique + indexed). This script only
 * repairs invalid, reserved, or non-normalized usernames without touching
 * other profile fields. Valid usernames are left unchanged (permalinks stay).
 *
 * Usage (from backend/):
 *   npx tsx prisma/scripts/backfill-profile-usernames.ts
 *   npx tsx prisma/scripts/backfill-profile-usernames.ts --dry-run
 */
import { PrismaClient } from '@prisma/client';
import {
  isValidPublicUsername,
  normalizeUsername,
  usernameBaseFromName,
  usernameCandidate,
} from '../../src/common/utils/username.util.js';

const prisma = new PrismaClient();
const dryRun = process.argv.includes('--dry-run');

async function allocateUnique(
  base: string,
  taken: Set<string>,
  excludeProfileId: string,
): Promise<string> {
  for (let collisionIndex = 0; collisionIndex < 500; collisionIndex += 1) {
    const candidate = usernameCandidate(base, collisionIndex);
    if (taken.has(candidate)) continue;
    const existing = await prisma.profile.findUnique({
      where: { username: candidate },
      select: { id: true },
    });
    if (!existing || existing.id === excludeProfileId) {
      taken.add(candidate);
      return candidate;
    }
  }
  const fallback = usernameCandidate(`${base}-${Date.now().toString(36)}`, 0);
  taken.add(fallback);
  return fallback;
}

async function main() {
  const profiles = await prisma.profile.findMany({
    select: {
      id: true,
      firstName: true,
      lastName: true,
      username: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  const taken = new Set(profiles.map((p) => p.username));
  let updated = 0;
  let skipped = 0;

  for (const profile of profiles) {
    const normalized = normalizeUsername(profile.username);
    const ok =
      normalized === profile.username && isValidPublicUsername(normalized);

    if (ok) {
      skipped += 1;
      continue;
    }

    const base = usernameBaseFromName(profile.firstName, profile.lastName);
    // Prefer keeping the normalized form of the old username when still valid
    const preferredBase =
      normalized && isValidPublicUsername(normalized)
        ? normalized
        : normalized &&
            normalizeUsername(normalized).length >= 3 &&
            !isValidPublicUsername(normalized)
          ? usernameBaseFromName(profile.firstName, profile.lastName)
          : base;

    const next = await allocateUnique(preferredBase || base, taken, profile.id);

    console.log(
      `${dryRun ? '[dry-run] ' : ''}${profile.username} → ${next} (${profile.firstName} ${profile.lastName})`,
    );

    if (!dryRun) {
      await prisma.profile.update({
        where: { id: profile.id },
        data: { username: next },
      });
    }

    taken.delete(profile.username);
    taken.add(next);
    updated += 1;
  }

  console.log(
    `Done. ${dryRun ? 'Would update' : 'Updated'}: ${updated}, unchanged: ${skipped}`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
