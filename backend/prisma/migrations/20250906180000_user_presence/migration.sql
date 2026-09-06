-- CreateEnum
CREATE TYPE "PresenceVisibility" AS ENUM ('EVERYONE', 'CLIENTS_ONLY', 'NOBODY');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "lastSeenAt" TIMESTAMP(3),
ADD COLUMN "presenceVisibility" "PresenceVisibility" NOT NULL DEFAULT 'EVERYONE';

-- AlterTable
ALTER TABLE "Message" ADD COLUMN "deliveredAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "User_lastSeenAt_idx" ON "User"("lastSeenAt");
