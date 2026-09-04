-- Link cities to countries so Tunisia/Egypt/etc. do not show Libyan cities.
ALTER TABLE "City" ADD COLUMN IF NOT EXISTS "country" TEXT NOT NULL DEFAULT 'Libya';

DROP INDEX IF EXISTS "City_nameAr_key";
DROP INDEX IF EXISTS "City_slug_key";

CREATE UNIQUE INDEX IF NOT EXISTS "City_country_slug_key" ON "City"("country", "slug");
CREATE UNIQUE INDEX IF NOT EXISTS "City_country_nameAr_key" ON "City"("country", "nameAr");
CREATE INDEX IF NOT EXISTS "City_country_isActive_sortOrder_idx" ON "City"("country", "isActive", "sortOrder");
