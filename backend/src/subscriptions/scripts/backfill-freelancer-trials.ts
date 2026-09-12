/**
 * Go-live backfill: grant STARTER trial to freelancers without an active paid plan.
 *
 * Usage (from backend/):
 *   npx tsx src/subscriptions/scripts/backfill-freelancer-trials.ts --go-live-at=2026-10-01T00:00:00.000Z
 *   SUBSCRIPTIONS_GO_LIVE_AT=2026-10-01T00:00:00.000Z npm run subscriptions:backfill-trials
 *
 * Requires an explicit commercial go-live timestamp (CLI or env).
 * Does NOT default to "now" — deploy/migrate must not start trial countdowns.
 * Does NOT deploy migrations. Do NOT run against production until commercial
 * go-live is approved and a real PSP path is ready.
 */
import 'dotenv/config';
import { Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import { SubscriptionEntitlementService } from '../subscription-entitlement.service.js';
import { resolveBackfillGoLiveAt } from '../subscriptions-go-live.js';

function parseCliGoLiveAt(argv: string[]): string | null {
  const flag = argv.find((a) => a.startsWith('--go-live-at='));
  if (!flag) return null;
  return flag.slice('--go-live-at='.length);
}

async function main() {
  const logger = new Logger('BackfillFreelancerTrials');
  const goLiveAt = resolveBackfillGoLiveAt({
    cliGoLiveAt: parseCliGoLiveAt(process.argv.slice(2)),
  });
  const prisma = new PrismaClient();

  try {
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
