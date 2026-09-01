-- Phase F: Portfolio images, sort order, completed date

CREATE TABLE "PortfolioImage" (
    "id" TEXT NOT NULL,
    "portfolioItemId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PortfolioImage_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "PortfolioItem" ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP(3);
ALTER TABLE "PortfolioItem" ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER NOT NULL DEFAULT 0;

INSERT INTO "PortfolioImage" ("id", "portfolioItemId", "imageUrl", "sortOrder", "createdAt")
SELECT
    gen_random_uuid()::text,
    "id",
    "imageUrl",
    0,
    NOW()
FROM "PortfolioItem"
WHERE "imageUrl" IS NOT NULL AND "imageUrl" <> '';

ALTER TABLE "PortfolioItem" DROP COLUMN IF EXISTS "imageUrl";

CREATE INDEX IF NOT EXISTS "PortfolioItem_freelancerProfileId_sortOrder_idx"
  ON "PortfolioItem"("freelancerProfileId", "sortOrder");

CREATE INDEX IF NOT EXISTS "PortfolioImage_portfolioItemId_idx"
  ON "PortfolioImage"("portfolioItemId");

ALTER TABLE "PortfolioImage" ADD CONSTRAINT "PortfolioImage_portfolioItemId_fkey"
  FOREIGN KEY ("portfolioItemId") REFERENCES "PortfolioItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
