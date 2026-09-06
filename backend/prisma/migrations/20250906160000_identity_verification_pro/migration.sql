-- AlterEnum
ALTER TYPE "PaymentPurpose" ADD VALUE IF NOT EXISTS 'SUBSCRIPTION';

ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'VERIFICATION_SUBMITTED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'VERIFICATION_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'VERIFICATION_REJECTED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'PRO_PAYMENT_PENDING';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'PRO_ACTIVATED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'PRO_EXPIRING_7_DAYS';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'PRO_EXPIRING_3_DAYS';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'PRO_EXPIRING_1_DAY';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'PRO_EXPIRED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'PRO_RENEWED';

ALTER TYPE "AdminAuditAction" ADD VALUE IF NOT EXISTS 'IDENTITY_VERIFICATION_APPROVED';
ALTER TYPE "AdminAuditAction" ADD VALUE IF NOT EXISTS 'IDENTITY_VERIFICATION_REJECTED';
ALTER TYPE "AdminAuditAction" ADD VALUE IF NOT EXISTS 'IDENTITY_VERIFICATION_SUSPENDED';
ALTER TYPE "AdminAuditAction" ADD VALUE IF NOT EXISTS 'SUBSCRIPTION_EXTENDED';
ALTER TYPE "AdminAuditAction" ADD VALUE IF NOT EXISTS 'SUBSCRIPTION_SUSPENDED';
ALTER TYPE "AdminAuditAction" ADD VALUE IF NOT EXISTS 'SUBSCRIPTION_CANCELLED';

ALTER TYPE "AdminPermission" ADD VALUE IF NOT EXISTS 'MANAGE_VERIFICATIONS';
ALTER TYPE "AdminPermission" ADD VALUE IF NOT EXISTS 'MANAGE_SUBSCRIPTIONS';

-- AlterTable FreelancerProfile
ALTER TABLE "FreelancerProfile" ADD COLUMN IF NOT EXISTS "proBoostScore" INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS "FreelancerProfile_proBoostScore_idx" ON "FreelancerProfile"("proBoostScore");
CREATE INDEX IF NOT EXISTS "FreelancerProfile_averageRating_idx" ON "FreelancerProfile"("averageRating");

-- CreateEnum
CREATE TYPE "IdentityVerificationStatus" AS ENUM ('NOT_SUBMITTED', 'PENDING', 'VERIFIED', 'REJECTED', 'SUSPENDED', 'EXPIRED');
CREATE TYPE "FreelancerSubscriptionStatus" AS ENUM ('PENDING_PAYMENT', 'ACTIVE', 'EXPIRED', 'CANCELLED', 'REFUNDED', 'SUSPENDED');
CREATE TYPE "SubscriptionAdminActionType" AS ENUM ('EXTEND', 'SUSPEND', 'CANCEL', 'REACTIVATE');
CREATE TYPE "ProductAnalyticsEventType" AS ENUM ('PRO_PAGE_VIEW', 'PRO_CHECKOUT_STARTED', 'PRO_PAYMENT_SUCCESS', 'PRO_ACTIVATED', 'PRO_RENEWED', 'PRO_EXPIRED');

CREATE TABLE "FreelancerIdentityVerification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "IdentityVerificationStatus" NOT NULL DEFAULT 'NOT_SUBMITTED',
    "fullNameAsOnId" TEXT,
    "nationalIdLast4" TEXT,
    "freelancerNote" TEXT,
    "rejectionReason" TEXT,
    "adminNote" TEXT,
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FreelancerIdentityVerification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IdentityVerificationDocument" (
    "id" TEXT NOT NULL,
    "verificationId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "IdentityVerificationDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SubscriptionPlan" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'LYD',
    "durationDays" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "portfolioItemLimit" INTEGER NOT NULL DEFAULT 40,
    "rankingBoostWeight" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SubscriptionPlan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FreelancerSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" "FreelancerSubscriptionStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "startedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "paymentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FreelancerSubscription_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SubscriptionAdminAction" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" "SubscriptionAdminActionType" NOT NULL,
    "reason" TEXT NOT NULL,
    "oldExpiresAt" TIMESTAMP(3),
    "newExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SubscriptionAdminAction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProfileViewDaily" (
    "id" TEXT NOT NULL,
    "profileUserId" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProfileViewDaily_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProductAnalyticsEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "eventType" "ProductAnalyticsEventType" NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProductAnalyticsEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FreelancerIdentityVerification_userId_key" ON "FreelancerIdentityVerification"("userId");
CREATE INDEX "FreelancerIdentityVerification_status_submittedAt_idx" ON "FreelancerIdentityVerification"("status", "submittedAt");
CREATE INDEX "FreelancerIdentityVerification_reviewedById_idx" ON "FreelancerIdentityVerification"("reviewedById");
CREATE INDEX "IdentityVerificationDocument_verificationId_idx" ON "IdentityVerificationDocument"("verificationId");
CREATE UNIQUE INDEX "SubscriptionPlan_code_key" ON "SubscriptionPlan"("code");
CREATE UNIQUE INDEX "FreelancerSubscription_paymentId_key" ON "FreelancerSubscription"("paymentId");
CREATE INDEX "FreelancerSubscription_userId_status_idx" ON "FreelancerSubscription"("userId", "status");
CREATE INDEX "FreelancerSubscription_status_expiresAt_idx" ON "FreelancerSubscription"("status", "expiresAt");
CREATE INDEX "FreelancerSubscription_planId_idx" ON "FreelancerSubscription"("planId");
CREATE INDEX "SubscriptionAdminAction_subscriptionId_createdAt_idx" ON "SubscriptionAdminAction"("subscriptionId", "createdAt");
CREATE INDEX "SubscriptionAdminAction_actorId_idx" ON "SubscriptionAdminAction"("actorId");
CREATE UNIQUE INDEX "ProfileViewDaily_profileUserId_day_key" ON "ProfileViewDaily"("profileUserId", "day");
CREATE INDEX "ProfileViewDaily_profileUserId_day_idx" ON "ProfileViewDaily"("profileUserId", "day");
CREATE INDEX "ProductAnalyticsEvent_eventType_createdAt_idx" ON "ProductAnalyticsEvent"("eventType", "createdAt");
CREATE INDEX "ProductAnalyticsEvent_userId_createdAt_idx" ON "ProductAnalyticsEvent"("userId", "createdAt");

ALTER TABLE "FreelancerIdentityVerification" ADD CONSTRAINT "FreelancerIdentityVerification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FreelancerIdentityVerification" ADD CONSTRAINT "FreelancerIdentityVerification_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "IdentityVerificationDocument" ADD CONSTRAINT "IdentityVerificationDocument_verificationId_fkey" FOREIGN KEY ("verificationId") REFERENCES "FreelancerIdentityVerification"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FreelancerSubscription" ADD CONSTRAINT "FreelancerSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FreelancerSubscription" ADD CONSTRAINT "FreelancerSubscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SubscriptionPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FreelancerSubscription" ADD CONSTRAINT "FreelancerSubscription_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SubscriptionAdminAction" ADD CONSTRAINT "SubscriptionAdminAction_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "FreelancerSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SubscriptionAdminAction" ADD CONSTRAINT "SubscriptionAdminAction_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProfileViewDaily" ADD CONSTRAINT "ProfileViewDaily_profileUserId_fkey" FOREIGN KEY ("profileUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductAnalyticsEvent" ADD CONSTRAINT "ProductAnalyticsEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed FREELANCER_PRO plan (49 LYD / 30 days)
INSERT INTO "SubscriptionPlan" ("id", "code", "nameAr", "nameEn", "price", "currency", "durationDays", "isActive", "portfolioItemLimit", "rankingBoostWeight", "createdAt", "updatedAt")
VALUES (
  '00000000-0000-4000-8000-000000000049',
  'FREELANCER_PRO',
  'ليبيا فريلانس برو',
  'Libya Freelance Pro',
  49.00,
  'LYD',
  30,
  true,
  40,
  1,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("code") DO UPDATE SET
  "price" = EXCLUDED."price",
  "durationDays" = EXCLUDED."durationDays",
  "nameAr" = EXCLUDED."nameAr",
  "nameEn" = EXCLUDED."nameEn",
  "isActive" = true,
  "updatedAt" = CURRENT_TIMESTAMP;
