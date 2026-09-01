-- Phase E: Messaging

ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "lastMessageAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Conversation_lastMessageAt_idx" ON "Conversation"("lastMessageAt");

-- One conversation per proposal
CREATE UNIQUE INDEX IF NOT EXISTS "Conversation_proposalId_key" ON "Conversation"("proposalId");
