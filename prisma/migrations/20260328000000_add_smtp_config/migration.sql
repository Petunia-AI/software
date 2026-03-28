-- AddColumn smtp configuration to organizations
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "smtp_host" TEXT;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "smtp_port" INTEGER;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "smtp_user" TEXT;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "smtp_pass" TEXT;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "smtp_from" TEXT;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "smtp_from_name" TEXT;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "smtp_secure" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "smtp_verified" BOOLEAN NOT NULL DEFAULT false;
