-- Subscription marketplace pivot (additive; preserves historical rows).

-- Enums (append-only)
ALTER TYPE "AdminAuditAction" ADD VALUE IF NOT EXISTS 'SUBSCRIPTION_GRANTED';
ALTER TYPE "AdminAuditAction" ADD VALUE IF NOT EXISTS 'SUBSCRIPTION_PLAN_CREATED';
ALTER TYPE "AdminAuditAction" ADD VALUE IF NOT EXISTS 'SUBSCRIPTION_PLAN_UPDATED';
ALTER TYPE "AdminAuditAction" ADD VALUE IF NOT EXISTS 'POINTS_PACKAGE_CREATED';
ALTER TYPE "AdminAuditAction" ADD VALUE IF NOT EXISTS 'POINTS_PACKAGE_UPDATED';
ALTER TYPE "AdminAuditAction" ADD VALUE IF NOT EXISTS 'POINTS_MANUAL_ADJUSTED';

ALTER TYPE "FreelancerSubscriptionStatus" ADD VALUE IF NOT EXISTS 'TRIAL';
ALTER TYPE "FreelancerSubscriptionStatus" ADD VALUE IF NOT EXISTS 'PAST_DUE';

CREATE TYPE "SubscriptionSource" AS ENUM ('TRIAL', 'PURCHASE', 'ADMIN_GRANT', 'MIGRATION');
CREATE TYPE "PaymentFulfillmentStatus" AS ENUM ('NONE', 'PENDING', 'FULFILLED', 'FAILED');

ALTER TYPE "SubscriptionAdminActionType" ADD VALUE IF NOT EXISTS 'GRANT';

-- User trial fields
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "trialStartedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "trialEndsAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "hasUsedTrial" BOOLEAN NOT NULL DEFAULT false;

-- Payment fulfillment fields
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "failedAt" TIMESTAMP(3);
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "fulfillmentStatus" "PaymentFulfillmentStatus" NOT NULL DEFAULT 'NONE';
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "fulfilledAt" TIMESTAMP(3);
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "fulfillmentKey" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Payment_fulfillmentKey_key" ON "Payment"("fulfillmentKey");
CREATE INDEX IF NOT EXISTS "Payment_purpose_status_idx" ON "Payment"("purpose", "status");

-- Points ledger extensions
ALTER TABLE "PointsTransaction" ADD COLUMN IF NOT EXISTS "source" TEXT;
ALTER TABLE "PointsTransaction" ADD COLUMN IF NOT EXISTS "metadata" JSONB;
ALTER TABLE "PointsTransaction" ADD COLUMN IF NOT EXISTS "fulfillmentKey" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "PointsTransaction_fulfillmentKey_key" ON "PointsTransaction"("fulfillmentKey");
CREATE INDEX IF NOT EXISTS "PointsTransaction_referenceId_idx" ON "PointsTransaction"("referenceId");

-- Points packages
CREATE TABLE IF NOT EXISTS "PointsPackage" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "bonusPoints" INTEGER NOT NULL DEFAULT 0,
    "priceLyd" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'LYD',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PointsPackage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PointsPackage_code_key" ON "PointsPackage"("code");
CREATE INDEX IF NOT EXISTS "PointsPackage_isActive_sortOrder_idx" ON "PointsPackage"("isActive", "sortOrder");

-- PointsPurchase extensions
ALTER TABLE "PointsPurchase" ADD COLUMN IF NOT EXISTS "packageId" TEXT;
ALTER TABLE "PointsPurchase" ADD COLUMN IF NOT EXISTS "bonusPoints" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "PointsPurchase" ADD COLUMN IF NOT EXISTS "paymentId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "PointsPurchase_paymentId_key" ON "PointsPurchase"("paymentId");
CREATE INDEX IF NOT EXISTS "PointsPurchase_packageId_idx" ON "PointsPurchase"("packageId");

DO $$ BEGIN
  ALTER TABLE "PointsPurchase" ADD CONSTRAINT "PointsPurchase_packageId_fkey"
    FOREIGN KEY ("packageId") REFERENCES "PointsPackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "PointsPurchase" ADD CONSTRAINT "PointsPurchase_paymentId_fkey"
    FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- SubscriptionPlan entitlement columns
ALTER TABLE "SubscriptionPlan" ADD COLUMN IF NOT EXISTS "visibilityWeight" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "SubscriptionPlan" ADD COLUMN IF NOT EXISTS "proposalQuotaMonthly" INTEGER NOT NULL DEFAULT 20;
ALTER TABLE "SubscriptionPlan" ADD COLUMN IF NOT EXISTS "monthlyPointsGrant" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "SubscriptionPlan" ADD COLUMN IF NOT EXISTS "badgeKey" TEXT;
ALTER TABLE "SubscriptionPlan" ADD COLUMN IF NOT EXISTS "featuresJson" JSONB;
ALTER TABLE "SubscriptionPlan" ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS "SubscriptionPlan_isActive_sortOrder_idx" ON "SubscriptionPlan"("isActive", "sortOrder");

-- Align legacy rankingBoostWeight default semantics for new rows (existing rows unchanged)
-- FreelancerSubscription source / migration metadata
ALTER TABLE "FreelancerSubscription" ADD COLUMN IF NOT EXISTS "source" "SubscriptionSource" NOT NULL DEFAULT 'PURCHASE';
ALTER TABLE "FreelancerSubscription" ADD COLUMN IF NOT EXISTS "migrationBatch" TEXT;
ALTER TABLE "FreelancerSubscription" ADD COLUMN IF NOT EXISTS "metadata" JSONB;

CREATE INDEX IF NOT EXISTS "FreelancerSubscription_migrationBatch_idx" ON "FreelancerSubscription"("migrationBatch");

-- Proposal usage periods
CREATE TABLE IF NOT EXISTS "ProposalUsagePeriod" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "periodKey" TEXT NOT NULL,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProposalUsagePeriod_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ProposalUsagePeriod_userId_periodKey_key" ON "ProposalUsagePeriod"("userId", "periodKey");
CREATE INDEX IF NOT EXISTS "ProposalUsagePeriod_userId_idx" ON "ProposalUsagePeriod"("userId");

DO $$ BEGIN
  ALTER TABLE "ProposalUsagePeriod" ADD CONSTRAINT "ProposalUsagePeriod_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Deactivate legacy FREELANCER_PRO for new checkouts (row preserved for FK/history)
UPDATE "SubscriptionPlan"
SET "isActive" = false,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "code" = 'FREELANCER_PRO';

-- Seed new catalog (idempotent upserts)
INSERT INTO "SubscriptionPlan" (
  "id", "code", "nameAr", "nameEn", "price", "currency", "durationDays", "isActive",
  "portfolioItemLimit", "visibilityWeight", "rankingBoostWeight", "proposalQuotaMonthly",
  "monthlyPointsGrant", "badgeKey", "featuresJson", "sortOrder", "createdAt", "updatedAt"
) VALUES
(
  '00000000-0000-4000-8000-000000000022',
  'STARTER',
  'البداية',
  'Starter',
  22.00,
  'LYD',
  30,
  true,
  20,
  1,
  0,
  20,
  0,
  NULL,
  '{"messaging":true,"publicProfile":true,"standardVisibility":true}'::jsonb,
  10,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
),
(
  '00000000-0000-4000-8000-000000000042',
  'PRO',
  'احترافي',
  'Pro',
  42.00,
  'LYD',
  30,
  true,
  40,
  5,
  1,
  60,
  30,
  'pro',
  '{"messaging":true,"publicProfile":true,"proBadge":true,"statistics":true,"higherVisibility":true}'::jsonb,
  20,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
),
(
  '00000000-0000-4000-8000-000000000072',
  'PREMIUM',
  'مميز',
  'Premium',
  72.00,
  'LYD',
  30,
  true,
  80,
  10,
  1,
  120,
  80,
  'premium',
  '{"messaging":true,"publicProfile":true,"premiumBadge":true,"advancedStatistics":true,"highestVisibility":true,"promotionalBenefits":true}'::jsonb,
  30,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("code") DO UPDATE SET
  "nameAr" = EXCLUDED."nameAr",
  "nameEn" = EXCLUDED."nameEn",
  "price" = EXCLUDED."price",
  "durationDays" = EXCLUDED."durationDays",
  "isActive" = EXCLUDED."isActive",
  "portfolioItemLimit" = EXCLUDED."portfolioItemLimit",
  "visibilityWeight" = EXCLUDED."visibilityWeight",
  "rankingBoostWeight" = EXCLUDED."rankingBoostWeight",
  "proposalQuotaMonthly" = EXCLUDED."proposalQuotaMonthly",
  "monthlyPointsGrant" = EXCLUDED."monthlyPointsGrant",
  "badgeKey" = EXCLUDED."badgeKey",
  "featuresJson" = EXCLUDED."featuresJson",
  "sortOrder" = EXCLUDED."sortOrder",
  "updatedAt" = CURRENT_TIMESTAMP;

-- Seed editable point packages
INSERT INTO "PointsPackage" (
  "id", "code", "nameAr", "nameEn", "points", "bonusPoints", "priceLyd", "currency",
  "isActive", "sortOrder", "createdAt", "updatedAt"
) VALUES
(
  '00000000-0000-4000-8000-000000000101',
  'P100',
  '100 نقطة',
  '100 Points',
  100,
  0,
  30.00,
  'LYD',
  true,
  10,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
),
(
  '00000000-0000-4000-8000-000000000102',
  'P250',
  '250 نقطة',
  '250 Points',
  250,
  15,
  65.00,
  'LYD',
  true,
  20,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
),
(
  '00000000-0000-4000-8000-000000000103',
  'P500',
  '500 نقطة',
  '500 Points',
  500,
  50,
  120.00,
  'LYD',
  true,
  30,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("code") DO UPDATE SET
  "nameAr" = EXCLUDED."nameAr",
  "nameEn" = EXCLUDED."nameEn",
  "points" = EXCLUDED."points",
  "bonusPoints" = EXCLUDED."bonusPoints",
  "priceLyd" = EXCLUDED."priceLyd",
  "isActive" = EXCLUDED."isActive",
  "sortOrder" = EXCLUDED."sortOrder",
  "updatedAt" = CURRENT_TIMESTAMP;

-- Remap ACTIVE legacy FREELANCER_PRO subscriptions to new PRO plan (preserve expiresAt)
UPDATE "FreelancerSubscription" fs
SET "planId" = '00000000-0000-4000-8000-000000000042',
    "metadata" = COALESCE(fs."metadata", '{}'::jsonb) || jsonb_build_object(
      'legacyPlanCode', 'FREELANCER_PRO',
      'remappedAt', to_char(CURRENT_TIMESTAMP AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    ),
    "updatedAt" = CURRENT_TIMESTAMP
FROM "SubscriptionPlan" sp
WHERE fs."planId" = sp."id"
  AND sp."code" = 'FREELANCER_PRO'
  AND fs."status" = 'ACTIVE'
  AND fs."expiresAt" IS NOT NULL
  AND fs."expiresAt" > CURRENT_TIMESTAMP
  AND (fs."metadata"->>'legacyPlanCode' IS DISTINCT FROM 'FREELANCER_PRO');
