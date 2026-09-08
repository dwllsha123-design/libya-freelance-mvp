-- CreateEnum
CREATE TYPE "FreelancerPerformanceLevel" AS ENUM ('NONE', 'RISING', 'PROVEN', 'TOP_PERFORMER', 'ELITE');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'PERFORMANCE_BADGE_EARNED';
ALTER TYPE "AdminAuditAction" ADD VALUE 'VERIFIED_TALENT_GRANTED';
ALTER TYPE "AdminAuditAction" ADD VALUE 'VERIFIED_TALENT_REMOVED';

-- AlterTable
ALTER TABLE "FreelancerProfile" ADD COLUMN "performanceLevel" "FreelancerPerformanceLevel" NOT NULL DEFAULT 'NONE';
ALTER TABLE "FreelancerProfile" ADD COLUMN "performanceLevelNotified" "FreelancerPerformanceLevel" NOT NULL DEFAULT 'NONE';
ALTER TABLE "FreelancerProfile" ADD COLUMN "totalPlatformEarnings" DECIMAL(14,2) NOT NULL DEFAULT 0;
ALTER TABLE "FreelancerProfile" ADD COLUMN "isVerifiedTalent" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "FreelancerProfile" ADD COLUMN "verifiedTalentAt" TIMESTAMP(3);
ALTER TABLE "FreelancerProfile" ADD COLUMN "verifiedTalentByAdminId" TEXT;

-- CreateIndex
CREATE INDEX "FreelancerProfile_performanceLevel_idx" ON "FreelancerProfile"("performanceLevel");
CREATE INDEX "FreelancerProfile_isVerifiedTalent_idx" ON "FreelancerProfile"("isVerifiedTalent");

-- AddForeignKey
ALTER TABLE "FreelancerProfile" ADD CONSTRAINT "FreelancerProfile_verifiedTalentByAdminId_fkey" FOREIGN KEY ("verifiedTalentByAdminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
