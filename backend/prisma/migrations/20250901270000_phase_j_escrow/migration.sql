-- Escrow payment system
CREATE TYPE "EscrowStatus" AS ENUM ('PENDING_FUNDING', 'FUNDED', 'RELEASED', 'REFUNDED', 'DISPUTED');
CREATE TYPE "EscrowTransactionType" AS ENUM ('DEPOSIT', 'RELEASE', 'REFUND', 'PLATFORM_FEE');
CREATE TYPE "DisputeStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'RESOLVED_REFUND_CLIENT', 'RESOLVED_RELEASE_FREELANCER', 'CLOSED');

ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'ESCROW_FUNDED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'ESCROW_RELEASED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'ESCROW_DISPUTED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'ESCROW_DISPUTE_RESOLVED';

ALTER TYPE "AdminAuditAction" ADD VALUE IF NOT EXISTS 'ESCROW_DISPUTE_RESOLVED';

CREATE TABLE "Escrow" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "freelancerId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "platformFee" DECIMAL(12,2) NOT NULL,
    "freelancerPayout" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'LYD',
    "status" "EscrowStatus" NOT NULL DEFAULT 'PENDING_FUNDING',
    "fundedAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Escrow_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EscrowTransaction" (
    "id" TEXT NOT NULL,
    "escrowId" TEXT NOT NULL,
    "type" "EscrowTransactionType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'LYD',
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EscrowTransaction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EscrowDispute" (
    "id" TEXT NOT NULL,
    "escrowId" TEXT NOT NULL,
    "openedById" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "DisputeStatus" NOT NULL DEFAULT 'OPEN',
    "resolution" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EscrowDispute_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Escrow_projectId_key" ON "Escrow"("projectId");
CREATE UNIQUE INDEX "Escrow_proposalId_key" ON "Escrow"("proposalId");
CREATE INDEX "Escrow_clientId_idx" ON "Escrow"("clientId");
CREATE INDEX "Escrow_freelancerId_idx" ON "Escrow"("freelancerId");
CREATE INDEX "Escrow_status_idx" ON "Escrow"("status");

CREATE INDEX "EscrowTransaction_escrowId_idx" ON "EscrowTransaction"("escrowId");
CREATE INDEX "EscrowTransaction_createdAt_idx" ON "EscrowTransaction"("createdAt");

CREATE UNIQUE INDEX "EscrowDispute_escrowId_key" ON "EscrowDispute"("escrowId");
CREATE INDEX "EscrowDispute_status_idx" ON "EscrowDispute"("status");

ALTER TABLE "Escrow" ADD CONSTRAINT "Escrow_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Escrow" ADD CONSTRAINT "Escrow_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Escrow" ADD CONSTRAINT "Escrow_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Escrow" ADD CONSTRAINT "Escrow_freelancerId_fkey" FOREIGN KEY ("freelancerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EscrowTransaction" ADD CONSTRAINT "EscrowTransaction_escrowId_fkey" FOREIGN KEY ("escrowId") REFERENCES "Escrow"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EscrowTransaction" ADD CONSTRAINT "EscrowTransaction_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "EscrowDispute" ADD CONSTRAINT "EscrowDispute_escrowId_fkey" FOREIGN KEY ("escrowId") REFERENCES "Escrow"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EscrowDispute" ADD CONSTRAINT "EscrowDispute_openedById_fkey" FOREIGN KEY ("openedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EscrowDispute" ADD CONSTRAINT "EscrowDispute_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
