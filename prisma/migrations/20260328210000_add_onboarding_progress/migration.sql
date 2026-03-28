-- CreateEnum (if not exists)
DO $$ BEGIN
  CREATE TYPE "onboarding_status" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateTable
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
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "onboarding_progress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "onboarding_progress_organization_id_key" ON "onboarding_progress"("organization_id");
CREATE INDEX IF NOT EXISTS "onboarding_progress_user_id_idx" ON "onboarding_progress"("user_id");
