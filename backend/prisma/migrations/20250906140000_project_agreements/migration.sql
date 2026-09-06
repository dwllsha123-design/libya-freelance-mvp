-- CreateEnum
CREATE TYPE "ProjectAgreementStatus" AS ENUM ('PENDING_APPROVAL', 'APPROVED', 'PAYMENT_PENDING', 'FUNDED', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "AgreementPartyRole" AS ENUM ('CLIENT', 'FREELANCER');

-- CreateEnum
CREATE TYPE "AgreementChangeType" AS ENUM ('PRICE', 'DEADLINE', 'SCOPE', 'DELIVERABLES', 'REVISIONS', 'OTHER');

-- CreateEnum
CREATE TYPE "AgreementChangeRequestStatus" AS ENUM ('PENDING', 'APPLIED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AgreementMilestoneStatus" AS ENUM ('PENDING', 'FUNDED', 'IN_PROGRESS', 'SUBMITTED', 'APPROVED', 'RELEASED', 'DISPUTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AgreementAuditAction" AS ENUM ('AGREEMENT_CREATED', 'VERSION_CREATED', 'CLIENT_ACCEPTED', 'FREELANCER_ACCEPTED', 'AGREEMENT_APPROVED', 'CHANGE_REQUESTED', 'PAYMENT_PENDING', 'FUNDED', 'ACTIVATED', 'DISPUTE_OPENED', 'CANCELLED', 'COMPLETED');

-- AlterEnum NotificationType
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'AGREEMENT_CREATED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'AGREEMENT_APPROVAL_REQUIRED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'AGREEMENT_ACCEPTED_BY_CLIENT';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'AGREEMENT_ACCEPTED_BY_FREELANCER';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'AGREEMENT_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'AGREEMENT_CHANGE_REQUESTED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'AGREEMENT_FUNDED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'AGREEMENT_CANCELLED';

-- CreateTable
CREATE TABLE "ProjectAgreement" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "freelancerId" TEXT NOT NULL,
    "currentVersionId" TEXT,
    "status" "ProjectAgreementStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "approvedAt" TIMESTAMP(3),
    "fundedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),

    CONSTRAINT "ProjectAgreement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgreementVersion" (
    "id" TEXT NOT NULL,
    "agreementId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "deliverables" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'LYD',
    "grossAmount" DECIMAL(12,2) NOT NULL,
    "platformFee" DECIMAL(12,2) NOT NULL,
    "freelancerNet" DECIMAL(12,2) NOT NULL,
    "durationDays" INTEGER NOT NULL,
    "deliveryDate" TIMESTAMP(3),
    "revisionCount" INTEGER NOT NULL DEFAULT 2,
    "paymentTerms" TEXT NOT NULL,
    "cancellationTerms" TEXT NOT NULL,
    "disputeTerms" TEXT NOT NULL,
    "snapshotJson" JSONB NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgreementVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgreementAcceptance" (
    "id" TEXT NOT NULL,
    "agreementVersionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "AgreementPartyRole" NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userAgent" TEXT,
    "ipHash" TEXT,

    CONSTRAINT "AgreementAcceptance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgreementMilestone" (
    "id" TEXT NOT NULL,
    "agreementVersionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "dueDate" TIMESTAMP(3),
    "status" "AgreementMilestoneStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgreementMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgreementChangeRequest" (
    "id" TEXT NOT NULL,
    "agreementId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "changeType" "AgreementChangeType" NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "AgreementChangeRequestStatus" NOT NULL DEFAULT 'PENDING',
    "proposedTitle" TEXT,
    "proposedScope" TEXT,
    "proposedDeliverables" TEXT,
    "proposedGrossAmount" DECIMAL(12,2),
    "proposedDurationDays" INTEGER,
    "proposedRevisionCount" INTEGER,
    "proposedDeliveryDate" TIMESTAMP(3),
    "resultingVersionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "appliedAt" TIMESTAMP(3),

    CONSTRAINT "AgreementChangeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgreementAuditLog" (
    "id" TEXT NOT NULL,
    "agreementId" TEXT NOT NULL,
    "actorId" TEXT,
    "action" "AgreementAuditAction" NOT NULL,
    "versionId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgreementAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectAgreement_proposalId_key" ON "ProjectAgreement"("proposalId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectAgreement_currentVersionId_key" ON "ProjectAgreement"("currentVersionId");

-- CreateIndex
CREATE INDEX "ProjectAgreement_projectId_status_idx" ON "ProjectAgreement"("projectId", "status");

-- CreateIndex
CREATE INDEX "ProjectAgreement_clientId_status_idx" ON "ProjectAgreement"("clientId", "status");

-- CreateIndex
CREATE INDEX "ProjectAgreement_freelancerId_status_idx" ON "ProjectAgreement"("freelancerId", "status");

-- CreateIndex
CREATE INDEX "ProjectAgreement_status_createdAt_idx" ON "ProjectAgreement"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AgreementVersion_agreementId_versionNumber_key" ON "AgreementVersion"("agreementId", "versionNumber");

-- CreateIndex
CREATE INDEX "AgreementVersion_agreementId_createdAt_idx" ON "AgreementVersion"("agreementId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AgreementAcceptance_agreementVersionId_userId_key" ON "AgreementAcceptance"("agreementVersionId", "userId");

-- CreateIndex
CREATE INDEX "AgreementAcceptance_userId_idx" ON "AgreementAcceptance"("userId");

-- CreateIndex
CREATE INDEX "AgreementMilestone_agreementVersionId_sortOrder_idx" ON "AgreementMilestone"("agreementVersionId", "sortOrder");

-- CreateIndex
CREATE INDEX "AgreementChangeRequest_agreementId_createdAt_idx" ON "AgreementChangeRequest"("agreementId", "createdAt");

-- CreateIndex
CREATE INDEX "AgreementChangeRequest_requestedById_idx" ON "AgreementChangeRequest"("requestedById");

-- CreateIndex
CREATE INDEX "AgreementChangeRequest_status_idx" ON "AgreementChangeRequest"("status");

-- CreateIndex
CREATE INDEX "AgreementAuditLog_agreementId_createdAt_idx" ON "AgreementAuditLog"("agreementId", "createdAt");

-- CreateIndex
CREATE INDEX "AgreementAuditLog_action_idx" ON "AgreementAuditLog"("action");

-- AddForeignKey
ALTER TABLE "ProjectAgreement" ADD CONSTRAINT "ProjectAgreement_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProjectAgreement" ADD CONSTRAINT "ProjectAgreement_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProjectAgreement" ADD CONSTRAINT "ProjectAgreement_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProjectAgreement" ADD CONSTRAINT "ProjectAgreement_freelancerId_fkey" FOREIGN KEY ("freelancerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AgreementVersion" ADD CONSTRAINT "AgreementVersion_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "ProjectAgreement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AgreementVersion" ADD CONSTRAINT "AgreementVersion_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProjectAgreement" ADD CONSTRAINT "ProjectAgreement_currentVersionId_fkey" FOREIGN KEY ("currentVersionId") REFERENCES "AgreementVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AgreementAcceptance" ADD CONSTRAINT "AgreementAcceptance_agreementVersionId_fkey" FOREIGN KEY ("agreementVersionId") REFERENCES "AgreementVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AgreementAcceptance" ADD CONSTRAINT "AgreementAcceptance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AgreementMilestone" ADD CONSTRAINT "AgreementMilestone_agreementVersionId_fkey" FOREIGN KEY ("agreementVersionId") REFERENCES "AgreementVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AgreementChangeRequest" ADD CONSTRAINT "AgreementChangeRequest_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "ProjectAgreement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AgreementChangeRequest" ADD CONSTRAINT "AgreementChangeRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AgreementAuditLog" ADD CONSTRAINT "AgreementAuditLog_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "ProjectAgreement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AgreementAuditLog" ADD CONSTRAINT "AgreementAuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
