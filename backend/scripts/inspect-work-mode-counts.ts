/**
 * Read-only production/staging inspection for Service Delivery Mode.
 * Do NOT run UPDATE/DELETE. Run against a read replica or with a read-only role when possible.
 *
 * Usage (Prisma):
 *   cd backend
 *   DATABASE_URL="..." npx tsx scripts/inspect-work-mode-counts.ts
 *
 * Or paste the SQL below into your SQL console.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const [projects, profiles] = await Promise.all([
    prisma.project.groupBy({
      by: ['workMode'],
      _count: { _all: true },
    }),
    prisma.profile.groupBy({
      by: ['workMode'],
      _count: { _all: true },
    }),
  ]);

  console.log('Project.workMode counts:');
  for (const row of projects) {
    console.log(`  ${row.workMode}: ${row._count._all}`);
  }

  console.log('Profile.workMode counts:');
  for (const row of profiles) {
    console.log(`  ${row.workMode}: ${row._count._all}`);
  }

  const remoteWithCity = await prisma.project.count({
    where: { workMode: 'REMOTE', cityId: { not: null } },
  });
  console.log(`REMOTE projects with cityId set: ${remoteWithCity}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
