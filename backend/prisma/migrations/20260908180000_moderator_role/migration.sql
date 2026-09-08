-- Add MODERATOR as a staff role (admin control center, not marketplace).
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'MODERATOR';
