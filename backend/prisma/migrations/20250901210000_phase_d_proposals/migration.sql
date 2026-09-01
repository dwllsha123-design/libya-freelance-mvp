-- Phase D: Proposal duration as integer days + concurrency index

ALTER TABLE "Proposal" DROP COLUMN IF EXISTS "estimatedDuration";
ALTER TABLE "Proposal" ADD COLUMN IF NOT EXISTS "estimatedDurationDays" INTEGER;

UPDATE "Proposal" SET "estimatedDurationDays" = 14 WHERE "estimatedDurationDays" IS NULL;

ALTER TABLE "Proposal" ALTER COLUMN "estimatedDurationDays" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "Proposal_projectId_status_idx" ON "Proposal"("projectId", "status");

-- At most one ACCEPTED proposal per project (database-level invariant)
CREATE UNIQUE INDEX IF NOT EXISTS "Proposal_one_accepted_per_project"
  ON "Proposal"("projectId")
  WHERE status = 'ACCEPTED';
