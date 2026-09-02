-- Lightweight proposal boost: points spent to rank higher in client listing

ALTER TABLE "Proposal" ADD COLUMN IF NOT EXISTS "boostPoints" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS "Proposal_projectId_boostPoints_idx"
  ON "Proposal"("projectId", "boostPoints" DESC);
