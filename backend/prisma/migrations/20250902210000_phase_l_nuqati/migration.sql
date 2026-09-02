-- CreateEnum
CREATE TYPE "PointsTransactionType" AS ENUM ('EARN', 'SPEND', 'PURCHASE', 'REFUND');

-- AlterEnum
ALTER TYPE "PaymentPurpose" ADD VALUE 'POINTS_PURCHASE';

-- AlterTable
ALTER TABLE "Payment" ALTER COLUMN "escrowId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "PointsWallet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PointsWallet_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PointsTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "type" "PointsTransactionType" NOT NULL,
    "reasonKey" TEXT NOT NULL,
    "descriptionAr" TEXT NOT NULL,
    "referenceId" TEXT,
    "balanceAfter" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PointsTransaction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PointsTaskCompletion" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "taskKey" TEXT NOT NULL,
    "periodKey" TEXT NOT NULL DEFAULT '',
    "progress" INTEGER NOT NULL DEFAULT 1,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PointsTaskCompletion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PointsStreakState" (
    "userId" TEXT NOT NULL,
    "currentStreakDays" INTEGER NOT NULL DEFAULT 0,
    "lastApplicationDate" TIMESTAMP(3),
    "claimedMilestones" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PointsStreakState_pkey" PRIMARY KEY ("userId")
);

CREATE TABLE "PointsPurchase" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pointsAmount" INTEGER NOT NULL,
    "priceLyd" DECIMAL(12,2) NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "provider" TEXT NOT NULL DEFAULT 'simulated',
    "providerReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "PointsPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PointsWallet_userId_key" ON "PointsWallet"("userId");
CREATE INDEX "PointsWallet_userId_idx" ON "PointsWallet"("userId");
CREATE INDEX "PointsTransaction_userId_createdAt_idx" ON "PointsTransaction"("userId", "createdAt");
CREATE INDEX "PointsTransaction_userId_type_idx" ON "PointsTransaction"("userId", "type");
CREATE INDEX "PointsTransaction_reasonKey_idx" ON "PointsTransaction"("reasonKey");
CREATE UNIQUE INDEX "PointsTaskCompletion_userId_taskKey_periodKey_key" ON "PointsTaskCompletion"("userId", "taskKey", "periodKey");
CREATE INDEX "PointsTaskCompletion_userId_taskKey_idx" ON "PointsTaskCompletion"("userId", "taskKey");
CREATE INDEX "PointsPurchase_userId_idx" ON "PointsPurchase"("userId");
CREATE INDEX "PointsPurchase_status_idx" ON "PointsPurchase"("status");

-- AddForeignKey
ALTER TABLE "PointsWallet" ADD CONSTRAINT "PointsWallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PointsTransaction" ADD CONSTRAINT "PointsTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PointsTaskCompletion" ADD CONSTRAINT "PointsTaskCompletion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PointsStreakState" ADD CONSTRAINT "PointsStreakState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PointsPurchase" ADD CONSTRAINT "PointsPurchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
