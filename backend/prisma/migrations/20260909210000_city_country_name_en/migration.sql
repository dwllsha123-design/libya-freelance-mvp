-- AlterTable
ALTER TABLE "City" ADD COLUMN "nameEn" TEXT;
ALTER TABLE "City" ADD COLUMN "country" TEXT NOT NULL DEFAULT 'Libya';

-- CreateIndex
CREATE INDEX "City_country_isActive_sortOrder_idx" ON "City"("country", "isActive", "sortOrder");
