-- CreateEnum
CREATE TYPE "heygen_avatar_status" AS ENUM ('GENERATING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "ai_usage_type" AS ENUM ('CONTENT_GENERATION', 'LANDING_PAGE', 'VIDEO_SCRIPT', 'ASSISTANT_CHAT', 'AVATAR_GENERATION');

-- CreateEnum
CREATE TYPE "message_role" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "onboarding_status" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED');

-- AlterTable: organizations — add subscription + AI credits + stripe columns
ALTER TABLE "organizations"
  ADD COLUMN IF NOT EXISTS "ai_credits_limit" INTEGER NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS "ai_credits_used" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "ai_credits_reset_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "stripe_customer_id" TEXT,
  ADD COLUMN IF NOT EXISTS "stripe_subscription_id" TEXT,
  ADD COLUMN IF NOT EXISTS "stripe_price_id" TEXT;

-- Unique indexes for Stripe (idempotent with IF NOT EXISTS via DO block)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'organizations_stripe_customer_id_key') THEN
    CREATE UNIQUE INDEX "organizations_stripe_customer_id_key" ON "organizations"("stripe_customer_id");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'organizations_stripe_subscription_id_key') THEN
    CREATE UNIQUE INDEX "organizations_stripe_subscription_id_key" ON "organizations"("stripe_subscription_id");
  END IF;
END $$;

-- CreateTable: platform_ai_config
CREATE TABLE IF NOT EXISTS "platform_ai_config" (
    "id" TEXT NOT NULL,
    "provider" "ai_provider" NOT NULL DEFAULT 'CLAUDE',
    "api_key" TEXT NOT NULL,
    "model" TEXT,
    "heygen_api_key" TEXT,
    "fal_api_key" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "platform_ai_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ai_usage_logs
CREATE TABLE IF NOT EXISTS "ai_usage_logs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT,
    "type" "ai_usage_type" NOT NULL,
    "credits_used" INTEGER NOT NULL DEFAULT 1,
    "provider" "ai_provider" NOT NULL,
    "model" TEXT,
    "tokens_input" INTEGER,
    "tokens_output" INTEGER,
    "endpoint" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ai_usage_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable: conversations
CREATE TABLE IF NOT EXISTS "conversations" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "title" TEXT,
    "current_page" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable: messages
CREATE TABLE IF NOT EXISTS "messages" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "role" "message_role" NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable: onboarding_progress
CREATE TABLE IF NOT EXISTS "onboarding_progress" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "status" "onboarding_status" NOT NULL DEFAULT 'NOT_STARTED',
    "current_step" INTEGER NOT NULL DEFAULT 0,
    "completed_steps" JSONB NOT NULL DEFAULT '[]',
    "business_name" TEXT,
    "business_type" TEXT,
    "markets" JSONB,
    "buyer_budget" TEXT,
    "whatsapp_connected" BOOLEAN NOT NULL DEFAULT false,
    "whatsapp_phone" TEXT,
    "meta_connected" BOOLEAN NOT NULL DEFAULT false,
    "meta_ad_account_id" TEXT,
    "tiktok_connected" BOOLEAN NOT NULL DEFAULT false,
    "pipeline_configured" BOOLEAN NOT NULL DEFAULT false,
    "pipeline_stages" JSONB,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "onboarding_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable: heygen_avatars
CREATE TABLE IF NOT EXISTS "heygen_avatars" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "heygen_avatar_id" TEXT,
    "generation_id" TEXT,
    "status" "heygen_avatar_status" NOT NULL DEFAULT 'GENERATING',
    "preview_image_url" TEXT,
    "preview_video_url" TEXT,
    "gender" TEXT,
    "age" TEXT,
    "ethnicity" TEXT,
    "style" TEXT,
    "pose" TEXT,
    "appearance" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "heygen_avatars_pkey" PRIMARY KEY ("id")
);

-- Indexes for ai_usage_logs
CREATE INDEX IF NOT EXISTS "ai_usage_logs_organization_id_idx" ON "ai_usage_logs"("organization_id");
CREATE INDEX IF NOT EXISTS "ai_usage_logs_created_at_idx" ON "ai_usage_logs"("created_at");
CREATE INDEX IF NOT EXISTS "ai_usage_logs_type_idx" ON "ai_usage_logs"("type");

-- Indexes for conversations
CREATE INDEX IF NOT EXISTS "conversations_user_id_idx" ON "conversations"("user_id");
CREATE INDEX IF NOT EXISTS "conversations_organization_id_idx" ON "conversations"("organization_id");

-- Indexes for messages
CREATE INDEX IF NOT EXISTS "messages_conversation_id_idx" ON "messages"("conversation_id");

-- Indexes for onboarding_progress
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'onboarding_progress_organization_id_key') THEN
    CREATE UNIQUE INDEX "onboarding_progress_organization_id_key" ON "onboarding_progress"("organization_id");
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS "onboarding_progress_user_id_idx" ON "onboarding_progress"("user_id");

-- Indexes for heygen_avatars
CREATE INDEX IF NOT EXISTS "heygen_avatars_organization_id_idx" ON "heygen_avatars"("organization_id");
CREATE INDEX IF NOT EXISTS "heygen_avatars_created_by_id_idx" ON "heygen_avatars"("created_by_id");
CREATE INDEX IF NOT EXISTS "heygen_avatars_status_idx" ON "heygen_avatars"("status");

-- Foreign keys
ALTER TABLE "ai_usage_logs" DROP CONSTRAINT IF EXISTS "ai_usage_logs_organization_id_fkey";
ALTER TABLE "ai_usage_logs" ADD CONSTRAINT "ai_usage_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "messages" DROP CONSTRAINT IF EXISTS "messages_conversation_id_fkey";
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "heygen_avatars" DROP CONSTRAINT IF EXISTS "heygen_avatars_organization_id_fkey";
ALTER TABLE "heygen_avatars" ADD CONSTRAINT "heygen_avatars_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "heygen_avatars" DROP CONSTRAINT IF EXISTS "heygen_avatars_created_by_id_fkey";
ALTER TABLE "heygen_avatars" ADD CONSTRAINT "heygen_avatars_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
