-- Non-destructive: change Profile.workMode default for new rows only.
-- Existing ON_SITE / HYBRID rows are preserved.
ALTER TABLE "Profile" ALTER COLUMN "workMode" SET DEFAULT 'REMOTE'::"WorkMode";
