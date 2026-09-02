-- Phase O: Admin Control Center persistence
-- Settings, feature flags, CMS, banners, featured, broadcasts, payouts, statements, portfolio moderation

-- Enum extensions
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'ADMIN_BROADCAST';

ALTER TYPE "AdminAuditAction" ADD VALUE IF NOT EXISTS 'SETTING_CHANGED';
ALTER TYPE "AdminAuditAction" ADD VALUE IF NOT EXISTS 'FEATURE_FLAG_CHANGED';
ALTER TYPE "AdminAuditAction" ADD VALUE IF NOT EXISTS 'MAINTENANCE_CHANGED';
ALTER TYPE "AdminAuditAction" ADD VALUE IF NOT EXISTS 'CMS_UPDATED';
ALTER TYPE "AdminAuditAction" ADD VALUE IF NOT EXISTS 'BANNER_CREATED';
ALTER TYPE "AdminAuditAction" ADD VALUE IF NOT EXISTS 'BANNER_UPDATED';
ALTER TYPE "AdminAuditAction" ADD VALUE IF NOT EXISTS 'BANNER_PUBLISHED';
ALTER TYPE "AdminAuditAction" ADD VALUE IF NOT EXISTS 'BROADCAST_SENT';
ALTER TYPE "AdminAuditAction" ADD VALUE IF NOT EXISTS 'ADMIN_CREATED';
ALTER TYPE "AdminAuditAction" ADD VALUE IF NOT EXISTS 'ADMIN_SUSPENDED';
ALTER TYPE "AdminAuditAction" ADD VALUE IF NOT EXISTS 'ADMIN_REACTIVATED';
ALTER TYPE "AdminAuditAction" ADD VALUE IF NOT EXISTS 'PERMISSION_GRANTED';
ALTER TYPE "AdminAuditAction" ADD VALUE IF NOT EXISTS 'PERMISSION_REVOKED';
ALTER TYPE "AdminAuditAction" ADD VALUE IF NOT EXISTS 'PORTFOLIO_HIDDEN';
ALTER TYPE "AdminAuditAction" ADD VALUE IF NOT EXISTS 'PORTFOLIO_RESTORED';
ALTER TYPE "AdminAuditAction" ADD VALUE IF NOT EXISTS 'INVESTOR_PAYOUT_CREATED';
ALTER TYPE "AdminAuditAction" ADD VALUE IF NOT EXISTS 'INVESTOR_PAYOUT_APPROVED';
ALTER TYPE "AdminAuditAction" ADD VALUE IF NOT EXISTS 'INVESTOR_PAYOUT_PAID';
ALTER TYPE "AdminAuditAction" ADD VALUE IF NOT EXISTS 'INVESTOR_PAYOUT_CANCELLED';
ALTER TYPE "AdminAuditAction" ADD VALUE IF NOT EXISTS 'INVESTOR_STATEMENT_FINALIZED';
ALTER TYPE "AdminAuditAction" ADD VALUE IF NOT EXISTS 'FEATURED_UPDATED';

ALTER TYPE "AdminPermission" ADD VALUE IF NOT EXISTS 'VIEW_SYSTEM';
ALTER TYPE "AdminPermission" ADD VALUE IF NOT EXISTS 'VIEW_FINANCE';
ALTER TYPE "AdminPermission" ADD VALUE IF NOT EXISTS 'SEND_BROADCASTS';

DO $$ BEGIN
  CREATE TYPE "PlatformSettingType" AS ENUM ('BOOLEAN', 'STRING', 'NUMBER', 'JSON');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "BroadcastAudience" AS ENUM ('ALL', 'CLIENTS', 'FREELANCERS', 'INVESTORS', 'SPECIFIC_USER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "InvestorPayoutStatus" AS ENUM ('PENDING', 'APPROVED', 'PAID', 'FAILED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "InvestorStatementStatus" AS ENUM ('DRAFT', 'FINALIZED', 'PAID');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "FeaturedEntityType" AS ENUM ('CATEGORY', 'FREELANCER', 'PROJECT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "PortfolioItem" ADD COLUMN IF NOT EXISTS "isVisible" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "PortfolioItem" ADD COLUMN IF NOT EXISTS "moderationReason" TEXT;
ALTER TABLE "PortfolioItem" ADD COLUMN IF NOT EXISTS "moderatedById" TEXT;
ALTER TABLE "PortfolioItem" ADD COLUMN IF NOT EXISTS "moderatedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "PortfolioItem_isVisible_idx" ON "PortfolioItem"("isVisible");

DO $$ BEGIN
  ALTER TABLE "PortfolioItem"
    ADD CONSTRAINT "PortfolioItem_moderatedById_fkey"
    FOREIGN KEY ("moderatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "PlatformSetting" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "valueJson" JSONB NOT NULL,
  "type" "PlatformSettingType" NOT NULL DEFAULT 'JSON',
  "updatedById" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlatformSetting_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PlatformSetting_key_key" ON "PlatformSetting"("key");
CREATE INDEX IF NOT EXISTS "PlatformSetting_updatedAt_idx" ON "PlatformSetting"("updatedAt");

DO $$ BEGIN
  ALTER TABLE "PlatformSetting"
    ADD CONSTRAINT "PlatformSetting_updatedById_fkey"
    FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "FeatureFlag" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "updatedById" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FeatureFlag_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "FeatureFlag_key_key" ON "FeatureFlag"("key");

DO $$ BEGIN
  ALTER TABLE "FeatureFlag"
    ADD CONSTRAINT "FeatureFlag_updatedById_fkey"
    FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "CmsContent" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "contentJson" JSONB NOT NULL,
  "updatedById" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CmsContent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CmsContent_key_key" ON "CmsContent"("key");

DO $$ BEGIN
  ALTER TABLE "CmsContent"
    ADD CONSTRAINT "CmsContent_updatedById_fkey"
    FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "SiteBanner" (
  "id" TEXT NOT NULL,
  "text" TEXT NOT NULL,
  "link" TEXT,
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "isActive" BOOLEAN NOT NULL DEFAULT false,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SiteBanner_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "SiteBanner_isActive_sortOrder_idx" ON "SiteBanner"("isActive", "sortOrder");
CREATE INDEX IF NOT EXISTS "SiteBanner_startsAt_endsAt_idx" ON "SiteBanner"("startsAt", "endsAt");

DO $$ BEGIN
  ALTER TABLE "SiteBanner"
    ADD CONSTRAINT "SiteBanner_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "FeaturedItem" (
  "id" TEXT NOT NULL,
  "entityType" "FeaturedEntityType" NOT NULL,
  "entityId" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FeaturedItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "FeaturedItem_entityType_entityId_key" ON "FeaturedItem"("entityType", "entityId");
CREATE INDEX IF NOT EXISTS "FeaturedItem_entityType_isActive_sortOrder_idx" ON "FeaturedItem"("entityType", "isActive", "sortOrder");

DO $$ BEGIN
  ALTER TABLE "FeaturedItem"
    ADD CONSTRAINT "FeaturedItem_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "NotificationBroadcast" (
  "id" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "audience" "BroadcastAudience" NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "targetUrl" TEXT,
  "specificUserId" TEXT,
  "recipientCount" INTEGER NOT NULL DEFAULT 0,
  "idempotencyKey" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "NotificationBroadcast_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "NotificationBroadcast_idempotencyKey_key" ON "NotificationBroadcast"("idempotencyKey");
CREATE INDEX IF NOT EXISTS "NotificationBroadcast_createdAt_idx" ON "NotificationBroadcast"("createdAt");
CREATE INDEX IF NOT EXISTS "NotificationBroadcast_audience_idx" ON "NotificationBroadcast"("audience");

DO $$ BEGIN
  ALTER TABLE "NotificationBroadcast"
    ADD CONSTRAINT "NotificationBroadcast_actorId_fkey"
    FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "InvestorStatement" (
  "id" TEXT NOT NULL,
  "investorId" TEXT NOT NULL,
  "periodYear" INTEGER NOT NULL,
  "periodMonth" INTEGER NOT NULL,
  "openingBalance" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "accrualsTotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "adjustments" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "paymentsTotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "closingBalance" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "status" "InvestorStatementStatus" NOT NULL DEFAULT 'DRAFT',
  "finalizedAt" TIMESTAMP(3),
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InvestorStatement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "InvestorStatement_investorId_periodYear_periodMonth_key"
  ON "InvestorStatement"("investorId", "periodYear", "periodMonth");
CREATE INDEX IF NOT EXISTS "InvestorStatement_status_periodYear_periodMonth_idx"
  ON "InvestorStatement"("status", "periodYear", "periodMonth");

DO $$ BEGIN
  ALTER TABLE "InvestorStatement"
    ADD CONSTRAINT "InvestorStatement_investorId_fkey"
    FOREIGN KEY ("investorId") REFERENCES "Investor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "InvestorStatement"
    ADD CONSTRAINT "InvestorStatement_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "InvestorPayout" (
  "id" TEXT NOT NULL,
  "investorId" TEXT NOT NULL,
  "statementId" TEXT,
  "amount" DECIMAL(14,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'LYD',
  "paymentMethod" TEXT NOT NULL DEFAULT 'EXTERNAL',
  "paymentReference" TEXT,
  "status" "InvestorPayoutStatus" NOT NULL DEFAULT 'PENDING',
  "notes" TEXT,
  "createdById" TEXT,
  "approvedById" TEXT,
  "approvedAt" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InvestorPayout_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "InvestorPayout_investorId_status_idx" ON "InvestorPayout"("investorId", "status");
CREATE INDEX IF NOT EXISTS "InvestorPayout_status_createdAt_idx" ON "InvestorPayout"("status", "createdAt");

DO $$ BEGIN
  ALTER TABLE "InvestorPayout"
    ADD CONSTRAINT "InvestorPayout_investorId_fkey"
    FOREIGN KEY ("investorId") REFERENCES "Investor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "InvestorPayout"
    ADD CONSTRAINT "InvestorPayout_statementId_fkey"
    FOREIGN KEY ("statementId") REFERENCES "InvestorStatement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "InvestorPayout"
    ADD CONSTRAINT "InvestorPayout_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "InvestorPayout"
    ADD CONSTRAINT "InvestorPayout_approvedById_fkey"
    FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Seed defaults (stable features ON, future features OFF)
INSERT INTO "FeatureFlag" ("id", "key", "enabled", "updatedAt", "createdAt")
VALUES
  (gen_random_uuid()::text, 'MESSAGING', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'PORTFOLIO', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'REVIEWS', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'INVESTOR_PORTAL', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'PAYMENTS', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'ESCROW', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'SUBSCRIPTIONS', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'AI_MATCHING', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "PlatformSetting" ("id", "key", "valueJson", "type", "updatedAt", "createdAt")
VALUES
  (gen_random_uuid()::text, 'allowClientRegistration', 'true'::jsonb, 'BOOLEAN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'allowFreelancerRegistration', 'true'::jsonb, 'BOOLEAN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'allowNewProjects', 'true'::jsonb, 'BOOLEAN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'allowNewProposals', 'true'::jsonb, 'BOOLEAN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'allowMessaging', 'true'::jsonb, 'BOOLEAN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'allowReviews', 'true'::jsonb, 'BOOLEAN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'allowPortfolio', 'true'::jsonb, 'BOOLEAN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'investorPortalEnabled', 'true'::jsonb, 'BOOLEAN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'maintenanceEnabled', 'false'::jsonb, 'BOOLEAN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'maintenanceMessage', '""'::jsonb, 'STRING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'platformName', '"Libya Freelance"'::jsonb, 'STRING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'supportEmail', '"support@libyafreelance.ly"'::jsonb, 'STRING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'currency', '"LYD"'::jsonb, 'STRING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "CmsContent" ("id", "key", "contentJson", "updatedAt", "createdAt")
VALUES
  (
    gen_random_uuid()::text,
    'HOMEPAGE_HERO',
    '{"heroTitle":"Libya Freelance","heroSubtitle":"منصة العمل الحر الليبية","primaryCTA":"ابدأ الآن","secondaryCTA":"تصفح المشاريع"}'::jsonb,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    gen_random_uuid()::text,
    'FAQ',
    '{"items":[]}'::jsonb,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    gen_random_uuid()::text,
    'FOOTER',
    '{"text":"© Libya Freelance"}'::jsonb,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    gen_random_uuid()::text,
    'CONTACT',
    '{"email":"support@libyafreelance.ly","phone":""}'::jsonb,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    gen_random_uuid()::text,
    'SOCIAL_LINKS',
    '{"twitter":"","facebook":"","instagram":"","linkedin":""}'::jsonb,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  )
ON CONFLICT ("key") DO NOTHING;
