/**
 * Go-live backfill: grant STARTER trial to freelancers without an active paid plan.
 *
 * Usage (from backend/):
 *   npx tsx src/subscriptions/scripts/backfill-freelancer-trials.ts
 *   npx tsx src/subscriptions/scripts/backfill-freelancer-trials.ts --go-live-at=2026-09-12T00:00:00.000Z
 *   npm run subscriptions:backfill-trials
 *
 * Requires DATABASE_URL. Does NOT deploy migrations.
 */
import 'dotenv/config';
import { Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import { SubscriptionEntitlementService } from '../subscription-entitlement.service.js';

function parseGoLiveAt(argv: string[]): Date {
  const flag = argv.find((a) => a.startsWith('--go-live-at='));
  if (flag) {
    const raw = flag.slice('--go-live-at='.length);
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) {
      throw new Error(`Invalid --go-live-at value: ${raw}`);
    }
    return d;
  }
  return new Date();
}

async function main() {
  const logger = new Logger('BackfillFreelancerTrials');
  const goLiveAt = parseGoLiveAt(process.argv.slice(2));
  const prisma = new PrismaClient();

  try {
    // PrismaService is a thin Nest wrapper — PrismaClient is sufficient for this script.
    const entitlements = new SubscriptionEntitlementService(
      prisma as unknown as PrismaService,
    );
    logger.log(`Starting trial backfill goLiveAt=${goLiveAt.toISOString()}`);
    const result = await entitlements.backfillExistingFreelancerTrials(goLiveAt);
    logger.log(
      `Done granted=${result.granted} skipped=${result.skipped} endsAt=${result.endsAt.toISOString()} batch=${result.batch}`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
