-- Phase A hardening + Phase B schema changes

-- UserStatus: replace PENDING_VERIFICATION with BANNED
CREATE TYPE "UserStatus_new" AS ENUM ('ACTIVE', 'SUSPENDED', 'BANNED');

ALTER TABLE "User" ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "User" ALTER COLUMN "status" TYPE "UserStatus_new" USING (
  CASE "status"::text
    WHEN 'PENDING_VERIFICATION' THEN 'ACTIVE'::"UserStatus_new"
    WHEN 'ACTIVE' THEN 'ACTIVE'::"UserStatus_new"
    WHEN 'SUSPENDED' THEN 'SUSPENDED'::"UserStatus_new"
    ELSE 'ACTIVE'::"UserStatus_new"
  END
);

DROP TYPE "UserStatus";
ALTER TYPE "UserStatus_new" RENAME TO "UserStatus";
ALTER TABLE "User" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';

-- New enums
CREATE TYPE "WorkMode" AS ENUM ('ON_SITE', 'REMOTE', 'HYBRID');
CREATE TYPE "FreelancerAvailability" AS ENUM ('AVAILABLE', 'BUSY', 'UNAVAILABLE');

-- City table
CREATE TABLE "City" (
    "id" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isRemote" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "City_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "City_nameAr_key" ON "City"("nameAr");
CREATE UNIQUE INDEX "City_slug_key" ON "City"("slug");
CREATE INDEX "City_isActive_sortOrder_idx" ON "City"("isActive", "sortOrder");

-- Profile: migrate city string to cityId + workMode
ALTER TABLE "Profile" ADD COLUMN "cityId" TEXT;
ALTER TABLE "Profile" ADD COLUMN "workMode" "WorkMode" NOT NULL DEFAULT 'ON_SITE';
ALTER TABLE "Profile" DROP COLUMN IF EXISTS "city";
DROP INDEX IF EXISTS "Profile_city_idx";

ALTER TABLE "Profile" ADD CONSTRAINT "Profile_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Profile_cityId_idx" ON "Profile"("cityId");

-- FreelancerProfile extensions
ALTER TABLE "FreelancerProfile" ADD COLUMN "availability" "FreelancerAvailability" NOT NULL DEFAULT 'AVAILABLE';
ALTER TABLE "FreelancerProfile" ADD COLUMN "hourlyRate" DECIMAL(12,2);

-- ClientProfile extensions
ALTER TABLE "ClientProfile" ADD COLUMN "displayName" TEXT;

-- Category extensions
ALTER TABLE "Category" ADD COLUMN "description" TEXT;
ALTER TABLE "Category" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Category" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;
CREATE INDEX "Category_isActive_sortOrder_idx" ON "Category"("isActive", "sortOrder");

-- Project: city string to cityId
ALTER TABLE "Project" ADD COLUMN "cityId" TEXT;
ALTER TABLE "Project" DROP COLUMN IF EXISTS "city";
DROP INDEX IF EXISTS "Project_city_idx";
CREATE INDEX "Project_cityId_idx" ON "Project"("cityId");

-- Token cleanup indexes
CREATE INDEX IF NOT EXISTS "PasswordResetToken_expiresAt_idx" ON "PasswordResetToken"("expiresAt");
CREATE INDEX IF NOT EXISTS "EmailVerificationToken_expiresAt_idx" ON "EmailVerificationToken"("expiresAt");
