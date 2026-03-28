-- CreateEnum (if not exists)
DO $$ BEGIN
  CREATE TYPE "ai_provider" AS ENUM ('CLAUDE', 'OPENAI');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "platform_ai_config" (
    "id" TEXT NOT NULL,
    "provider" "ai_provider" NOT NULL DEFAULT 'CLAUDE',
    "api_key" TEXT NOT NULL,
    "model" TEXT,
    "heygen_api_key" TEXT,
    "fal_api_key" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_ai_config_pkey" PRIMARY KEY ("id")
);
