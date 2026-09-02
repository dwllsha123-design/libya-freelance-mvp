-- Phase M: commercial control (commission versioning, investor agreements, finance permissions)

-- AlterEnum Role
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';

-- AlterEnum AdminAuditAction
ALTER TYPE "AdminAuditAction" ADD VALUE IF NOT EXISTS 'PLATFORM_COMMISSION_SCHEDULED';
ALTER TYPE "AdminAuditAction" ADD VALUE IF NOT EXISTS 'CATEGORY_COMMISSION_SET';
ALTER TYPE "AdminAuditAction" ADD VALUE IF NOT EXISTS 'CATEGORY_COMMISSION_CLEARED';
ALTER TYPE "AdminAuditAction" ADD VALUE IF NOT EXISTS 'PROJECT_COMMISSION_OVERRIDE_SET';
ALTER TYPE "AdminAuditAction" ADD VALUE IF NOT EXISTS 'PROJECT_COMMISSION_OVERRIDE_ENDED';
ALTER TYPE "AdminAuditAction" ADD VALUE IF NOT EXISTS 'INVESTOR_CREATED';
ALTER TYPE "AdminAuditAction" ADD VALUE IF NOT EXISTS 'INVESTMENT_AGREEMENT_CREATED';
ALTER TYPE "AdminAuditAction" ADD VALUE IF NOT EXISTS 'INVESTMENT_AGREEMENT_TERMINATED';
ALTER TYPE "AdminAuditAction" ADD VALUE IF NOT EXISTS 'FINANCE_PERMISSION_GRANTED';
ALTER TYPE "AdminAuditAction" ADD VALUE IF NOT EXISTS 'FINANCE_PERMISSION_REVOKED';

CREATE TYPE "CommissionPolicyStatus" AS ENUM ('SCHEDULED', 'ACTIVE', 'SUPERSEDED', 'CANCELLED');
CREATE TYPE "CommissionSource" AS ENUM ('PLATFORM_DEFAULT', 'CATEGORY_OVERRIDE', 'PROJECT_OVERRIDE');
CREATE TYPE "InvestorRevenueBase" AS ENUM ('PLATFORM_COMMISSION');
CREATE TYPE "InvestmentAgreementStatus" AS ENUM ('SCHEDULED', 'ACTIVE', 'ENDED', 'TERMINATED');
CREATE TYPE "AdminPermission" AS ENUM ('FINANCE_VIEW', 'FINANCE_WRITE');
CREATE TYPE "CommercialAuditAction" AS ENUM (
  'PLATFORM_COMMISSION_CHANGED',
  'CATEGORY_COMMISSION_CHANGED',
  'PROJECT_COMMISSION_OVERRIDE_CHANGED',
  'INVESTOR_SHARE_CHANGED',
  'INVESTMENT_AGREEMENT_TERMINATED',
  'FINANCE_PERMISSION_CHANGED',
  'FUTURE_FEE_SETTING_CHANGED'
);

CREATE TABLE "UserAdminPermission" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "permission" "AdminPermission" NOT NULL,
    "grantedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserAdminPermission_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserAdminPermission_userId_permission_key" ON "UserAdminPermission"("userId", "permission");
CREATE INDEX "UserAdminPermission_permission_idx" ON "UserAdminPermission"("permission");

ALTER TABLE "UserAdminPermission" ADD CONSTRAINT "UserAdminPermission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "PlatformCommissionPolicy" (
    "id" TEXT NOT NULL,
    "defaultCommissionPercentage" DECIMAL(5,2) NOT NULL,
    "minimumCommissionAmount" DECIMAL(12,2),
    "maximumCommissionAmount" DECIMAL(12,2),
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "status" "CommissionPolicyStatus" NOT NULL DEFAULT 'SCHEDULED',
    "reason" TEXT,
    "createdById" TEXT,
    "previousPolicyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PlatformCommissionPolicy_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlatformCommissionPolicy_previousPolicyId_key" ON "PlatformCommissionPolicy"("previousPolicyId");
CREATE INDEX "PlatformCommissionPolicy_status_effectiveFrom_idx" ON "PlatformCommissionPolicy"("status", "effectiveFrom");
CREATE INDEX "PlatformCommissionPolicy_effectiveFrom_idx" ON "PlatformCommissionPolicy"("effectiveFrom");

ALTER TABLE "PlatformCommissionPolicy" ADD CONSTRAINT "PlatformCommissionPolicy_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PlatformCommissionPolicy" ADD CONSTRAINT "PlatformCommissionPolicy_previousPolicyId_fkey" FOREIGN KEY ("previousPolicyId") REFERENCES "PlatformCommissionPolicy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "CategoryCommissionOverride" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "commissionPercentage" DECIMAL(5,2),
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "status" "CommissionPolicyStatus" NOT NULL DEFAULT 'SCHEDULED',
    "reason" TEXT,
    "createdById" TEXT,
    "previousOverrideId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CategoryCommissionOverride_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CategoryCommissionOverride_previousOverrideId_key" ON "CategoryCommissionOverride"("previousOverrideId");
CREATE INDEX "CategoryCommissionOverride_categoryId_status_effectiveFrom_idx" ON "CategoryCommissionOverride"("categoryId", "status", "effectiveFrom");
CREATE INDEX "CategoryCommissionOverride_effectiveFrom_idx" ON "CategoryCommissionOverride"("effectiveFrom");

ALTER TABLE "CategoryCommissionOverride" ADD CONSTRAINT "CategoryCommissionOverride_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CategoryCommissionOverride" ADD CONSTRAINT "CategoryCommissionOverride_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CategoryCommissionOverride" ADD CONSTRAINT "CategoryCommissionOverride_previousOverrideId_fkey" FOREIGN KEY ("previousOverrideId") REFERENCES "CategoryCommissionOverride"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "ProjectCommissionOverride" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "commissionPercentage" DECIMAL(5,2) NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "status" "CommissionPolicyStatus" NOT NULL DEFAULT 'ACTIVE',
    "reason" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProjectCommissionOverride_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProjectCommissionOverride_projectId_status_effectiveFrom_idx" ON "ProjectCommissionOverride"("projectId", "status", "effectiveFrom");

ALTER TABLE "ProjectCommissionOverride" ADD CONSTRAINT "ProjectCommissionOverride_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectCommissionOverride" ADD CONSTRAINT "ProjectCommissionOverride_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "Investor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Investor_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Investor_isActive_idx" ON "Investor"("isActive");
ALTER TABLE "Investor" ADD CONSTRAINT "Investor_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "InvestmentAgreement" (
    "id" TEXT NOT NULL,
    "investorId" TEXT NOT NULL,
    "investmentAmount" DECIMAL(14,2) NOT NULL,
    "sharePercentage" DECIMAL(5,2) NOT NULL,
    "revenueBase" "InvestorRevenueBase" NOT NULL DEFAULT 'PLATFORM_COMMISSION',
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "returnCap" DECIMAL(14,2),
    "status" "InvestmentAgreementStatus" NOT NULL DEFAULT 'SCHEDULED',
    "reason" TEXT,
    "createdById" TEXT,
    "previousAgreementId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InvestmentAgreement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InvestmentAgreement_previousAgreementId_key" ON "InvestmentAgreement"("previousAgreementId");
CREATE INDEX "InvestmentAgreement_investorId_status_effectiveFrom_idx" ON "InvestmentAgreement"("investorId", "status", "effectiveFrom");
CREATE INDEX "InvestmentAgreement_status_effectiveFrom_idx" ON "InvestmentAgreement"("status", "effectiveFrom");

ALTER TABLE "InvestmentAgreement" ADD CONSTRAINT "InvestmentAgreement_investorId_fkey" FOREIGN KEY ("investorId") REFERENCES "Investor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InvestmentAgreement" ADD CONSTRAINT "InvestmentAgreement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InvestmentAgreement" ADD CONSTRAINT "InvestmentAgreement_previousAgreementId_fkey" FOREIGN KEY ("previousAgreementId") REFERENCES "InvestmentAgreement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "InvestorAccrual" (
    "id" TEXT NOT NULL,
    "agreementId" TEXT NOT NULL,
    "escrowId" TEXT NOT NULL,
    "sharePercentageSnapshot" DECIMAL(5,2) NOT NULL,
    "platformCommissionAmount" DECIMAL(12,2) NOT NULL,
    "accrualAmount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'LYD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InvestorAccrual_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InvestorAccrual_agreementId_escrowId_key" ON "InvestorAccrual"("agreementId", "escrowId");
CREATE INDEX "InvestorAccrual_escrowId_idx" ON "InvestorAccrual"("escrowId");
CREATE INDEX "InvestorAccrual_createdAt_idx" ON "InvestorAccrual"("createdAt");

ALTER TABLE "InvestorAccrual" ADD CONSTRAINT "InvestorAccrual_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "InvestmentAgreement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "CommercialAuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" "CommercialAuditAction" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "oldValue" JSONB,
    "newValue" JSONB,
    "effectiveDate" TIMESTAMP(3),
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CommercialAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CommercialAuditLog_actorId_idx" ON "CommercialAuditLog"("actorId");
CREATE INDEX "CommercialAuditLog_action_idx" ON "CommercialAuditLog"("action");
CREATE INDEX "CommercialAuditLog_entityType_entityId_idx" ON "CommercialAuditLog"("entityType", "entityId");
CREATE INDEX "CommercialAuditLog_createdAt_idx" ON "CommercialAuditLog"("createdAt");

ALTER TABLE "CommercialAuditLog" ADD CONSTRAINT "CommercialAuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "FutureFeeSetting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "labelAr" TEXT NOT NULL,
    "valueJson" JSONB NOT NULL,
    "effectiveFrom" TIMESTAMP(3),
    "notes" TEXT,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FutureFeeSetting_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FutureFeeSetting_key_key" ON "FutureFeeSetting"("key");

-- Escrow commission snapshot columns
ALTER TABLE "Escrow" ADD COLUMN "commissionPercentage" DECIMAL(5,2);
ALTER TABLE "Escrow" ADD COLUMN "commissionSource" "CommissionSource";
ALTER TABLE "Escrow" ADD COLUMN "platformCommissionPolicyId" TEXT;
ALTER TABLE "Escrow" ADD COLUMN "categoryCommissionOverrideId" TEXT;
ALTER TABLE "Escrow" ADD COLUMN "projectCommissionOverrideId" TEXT;
ALTER TABLE "Escrow" ADD COLUMN "settledCommissionPercentage" DECIMAL(5,2);
ALTER TABLE "Escrow" ADD COLUMN "settledPlatformFee" DECIMAL(12,2);

ALTER TABLE "Escrow" ADD CONSTRAINT "Escrow_platformCommissionPolicyId_fkey" FOREIGN KEY ("platformCommissionPolicyId") REFERENCES "PlatformCommissionPolicy"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Escrow" ADD CONSTRAINT "Escrow_categoryCommissionOverrideId_fkey" FOREIGN KEY ("categoryCommissionOverrideId") REFERENCES "CategoryCommissionOverride"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Escrow" ADD CONSTRAINT "Escrow_projectCommissionOverrideId_fkey" FOREIGN KEY ("projectCommissionOverrideId") REFERENCES "ProjectCommissionOverride"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "InvestorAccrual" ADD CONSTRAINT "InvestorAccrual_escrowId_fkey" FOREIGN KEY ("escrowId") REFERENCES "Escrow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Bootstrap default 10% platform commission (active from epoch of migration)
INSERT INTO "PlatformCommissionPolicy" (
  "id",
  "defaultCommissionPercentage",
  "minimumCommissionAmount",
  "maximumCommissionAmount",
  "effectiveFrom",
  "effectiveTo",
  "status",
  "reason",
  "createdById",
  "previousPolicyId",
  "createdAt"
) VALUES (
  '00000000-0000-4000-8000-000000000001',
  10.00,
  NULL,
  NULL,
  CURRENT_TIMESTAMP,
  NULL,
  'ACTIVE',
  'القيمة الابتدائية لعمولة المنصة',
  NULL,
  NULL,
  CURRENT_TIMESTAMP
);

INSERT INTO "FutureFeeSetting" ("id", "key", "labelAr", "valueJson", "effectiveFrom", "notes", "updatedById", "updatedAt", "createdAt")
VALUES (
  '00000000-0000-4000-8000-000000000010',
  'featured_listing_fee',
  'رسوم الإعلان المميز (مستقبلي)',
  '{"enabled":false,"amountLyd":0}',
  NULL,
  'إعداد مستقبلي — غير مفعّل',
  NULL,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);
