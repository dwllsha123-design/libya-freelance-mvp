-- Phase C: Project marketplace schema

ALTER TYPE "ProjectStatus" ADD VALUE IF NOT EXISTS 'CLOSED';

CREATE TYPE "ProjectBudgetType" AS ENUM ('FIXED', 'HOURLY');
CREATE TYPE "ProjectExperienceLevel" AS ENUM ('ENTRY', 'INTERMEDIATE', 'EXPERT');

ALTER TABLE "Project" ADD COLUMN "budgetType" "ProjectBudgetType" NOT NULL DEFAULT 'FIXED';
ALTER TABLE "Project" ADD COLUMN "experienceLevel" "ProjectExperienceLevel" NOT NULL DEFAULT 'INTERMEDIATE';
ALTER TABLE "Project" ADD COLUMN "workMode" "WorkMode" NOT NULL DEFAULT 'REMOTE';
ALTER TABLE "Project" ADD COLUMN "publishedAt" TIMESTAMP(3);
ALTER TABLE "Project" ADD COLUMN "closedAt" TIMESTAMP(3);

ALTER TABLE "Project" DROP COLUMN IF EXISTS "remote";
DROP INDEX IF EXISTS "Project_remote_idx";

ALTER TABLE "Project" ADD CONSTRAINT "Project_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "Project_publishedAt_idx" ON "Project"("publishedAt");
CREATE INDEX IF NOT EXISTS "Project_budgetType_idx" ON "Project"("budgetType");
CREATE INDEX IF NOT EXISTS "Project_experienceLevel_idx" ON "Project"("experienceLevel");
CREATE INDEX IF NOT EXISTS "Project_workMode_idx" ON "Project"("workMode");
CREATE INDEX IF NOT EXISTS "ProjectSkill_projectId_idx" ON "ProjectSkill"("projectId");
CREATE INDEX IF NOT EXISTS "ProjectSkill_skillId_idx" ON "ProjectSkill"("skillId");
