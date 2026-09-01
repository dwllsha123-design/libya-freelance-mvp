-- Phase H: optimize notification list query (userId + createdAt DESC)

CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt" DESC);

DROP INDEX IF EXISTS "Notification_createdAt_idx";
