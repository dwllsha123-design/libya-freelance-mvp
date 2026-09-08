-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'WELCOME_POINTS_AWARDED';
ALTER TYPE "NotificationType" ADD VALUE 'PROFILE_COMPLETION_REWARD';
ALTER TYPE "NotificationType" ADD VALUE 'FOUNDING_FREELANCER_AWARDED';

ALTER TYPE "ProductAnalyticsEventType" ADD VALUE 'SIGNUP_COMPLETED';
ALTER TYPE "ProductAnalyticsEventType" ADD VALUE 'WELCOME_POINTS_AWARDED';
ALTER TYPE "ProductAnalyticsEventType" ADD VALUE 'PROFILE_COMPLETION_REWARD_AWARDED';
ALTER TYPE "ProductAnalyticsEventType" ADD VALUE 'FOUNDING_FREELANCER_AWARDED';
ALTER TYPE "ProductAnalyticsEventType" ADD VALUE 'PROPOSAL_SUBMITTED';
ALTER TYPE "ProductAnalyticsEventType" ADD VALUE 'PROPOSAL_POINTS_DEDUCTED';
ALTER TYPE "ProductAnalyticsEventType" ADD VALUE 'CLIENT_PROJECT_CREATED';

-- AlterTable
ALTER TABLE "FreelancerProfile" ADD COLUMN "isFoundingFreelancer" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "FreelancerProfile" ADD COLUMN "foundingFreelancerAt" TIMESTAMP(3);
ALTER TABLE "FreelancerProfile" ADD COLUMN "foundingSlotNumber" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "FreelancerProfile_foundingSlotNumber_key" ON "FreelancerProfile"("foundingSlotNumber");
CREATE INDEX "FreelancerProfile_isFoundingFreelancer_idx" ON "FreelancerProfile"("isFoundingFreelancer");

-- CreateTable
CREATE TABLE "LaunchProgramState" (
    "id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "freelancerCommissionPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "welcomePoints" INTEGER NOT NULL DEFAULT 55,
    "profileCompletionReward" INTEGER NOT NULL DEFAULT 5,
    "profileCompletionThreshold" INTEGER NOT NULL DEFAULT 80,
    "foundingFreelancerLimit" INTEGER NOT NULL DEFAULT 1000,
    "foundingPermanentCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LaunchProgramState_pkey" PRIMARY KEY ("id")
);

INSERT INTO "LaunchProgramState" (
  "id",
  "enabled",
  "freelancerCommissionPercent",
  "welcomePoints",
  "profileCompletionReward",
  "profileCompletionThreshold",
  "foundingFreelancerLimit",
  "foundingPermanentCount",
  "updatedAt"
) VALUES (
  'default',
  true,
  0,
  55,
  5,
  80,
  1000,
  0,
  CURRENT_TIMESTAMP
);
