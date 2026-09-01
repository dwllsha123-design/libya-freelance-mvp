-- Phase I: Admin dashboard — review visibility, skill isActive, audit log

ALTER TABLE "Skill" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
CREATE INDEX "Skill_isActive_idx" ON "Skill"("isActive");

ALTER TABLE "Review" ADD COLUMN "isVisible" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Review" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
CREATE INDEX "Review_reviewedUserId_isVisible_idx" ON "Review"("reviewedUserId", "isVisible");

CREATE TYPE "AdminAuditAction" AS ENUM (
  'USER_SUSPENDED',
  'USER_BANNED',
  'USER_REACTIVATED',
  'PROJECT_CLOSED',
  'REVIEW_HIDDEN',
  'REVIEW_RESTORED',
  'CATEGORY_CREATED',
  'CATEGORY_UPDATED',
  'CATEGORY_DEACTIVATED',
  'CATEGORY_ACTIVATED',
  'SKILL_CREATED',
  'SKILL_UPDATED',
  'SKILL_DEACTIVATED',
  'SKILL_ACTIVATED'
);

CREATE TABLE "AdminAuditLog" (
  "id" TEXT NOT NULL,
  "adminId" TEXT NOT NULL,
  "action" "AdminAuditAction" NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AdminAuditLog_adminId_idx" ON "AdminAuditLog"("adminId");
CREATE INDEX "AdminAuditLog_action_idx" ON "AdminAuditLog"("action");
CREATE INDEX "AdminAuditLog_createdAt_idx" ON "AdminAuditLog"("createdAt");
CREATE INDEX "AdminAuditLog_entityType_entityId_idx" ON "AdminAuditLog"("entityType", "entityId");

ALTER TABLE "AdminAuditLog" ADD CONSTRAINT "AdminAuditLog_adminId_fkey"
  FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
