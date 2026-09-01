-- Phase G: Project completion + reviews

ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'PROJECT_COMPLETION_REQUESTED';

ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "completionRequestedAt" TIMESTAMP(3);
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "completionRequestedById" TEXT;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP(3);

ALTER TABLE "Project" ADD CONSTRAINT "Project_completionRequestedById_fkey"
  FOREIGN KEY ("completionRequestedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "Project_completionRequestedAt_idx" ON "Project"("completionRequestedAt");
CREATE INDEX IF NOT EXISTS "Project_completedAt_idx" ON "Project"("completedAt");
