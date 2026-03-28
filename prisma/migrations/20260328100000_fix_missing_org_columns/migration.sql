-- Fix: add missing columns that existed in Prisma schema but were never applied to production Neon DB
-- These caused "The column (not available) does not exist in the current database" errors
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS "whatsapp_phone_number_id" TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS "whatsapp_auto_reply" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS "instagram_auto_reply" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS "messenger_auto_reply" BOOLEAN NOT NULL DEFAULT false;
