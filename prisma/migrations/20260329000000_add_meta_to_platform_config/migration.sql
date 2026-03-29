-- AlterTable
ALTER TABLE "platform_ai_config" ADD COLUMN IF NOT EXISTS "meta_app_id" TEXT;
ALTER TABLE "platform_ai_config" ADD COLUMN IF NOT EXISTS "meta_app_secret" TEXT;
