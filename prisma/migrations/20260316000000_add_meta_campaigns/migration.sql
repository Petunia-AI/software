-- CreateEnum
CREATE TYPE "campaign_status" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ERROR');

-- CreateEnum
CREATE TYPE "campaign_objective" AS ENUM ('LEAD_GENERATION', 'TRAFFIC', 'BRAND_AWARENESS', 'ENGAGEMENT', 'CONVERSIONS', 'MESSAGES');

-- AlterEnum
ALTER TYPE "ai_usage_type" ADD VALUE 'CAMPAIGN_CREATION';

-- AlterTable: Add Meta OAuth fields to organizations
ALTER TABLE "organizations" ADD COLUMN "meta_access_token" TEXT;
ALTER TABLE "organizations" ADD COLUMN "meta_page_id" TEXT;
ALTER TABLE "organizations" ADD COLUMN "meta_page_name" TEXT;
ALTER TABLE "organizations" ADD COLUMN "meta_ad_account_id" TEXT;
ALTER TABLE "organizations" ADD COLUMN "meta_ad_account_name" TEXT;
ALTER TABLE "organizations" ADD COLUMN "meta_connected_at" TIMESTAMP(3);
ALTER TABLE "organizations" ADD COLUMN "meta_connected_by" TEXT;
ALTER TABLE "organizations" ADD COLUMN "meta_token_expires_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "meta_campaigns" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "meta_campaign_id" TEXT,
    "meta_ad_set_id" TEXT,
    "meta_ad_id" TEXT,
    "meta_creative_id" TEXT,
    "name" TEXT NOT NULL,
    "objective" "campaign_objective" NOT NULL DEFAULT 'LEAD_GENERATION',
    "status" "campaign_status" NOT NULL DEFAULT 'DRAFT',
    "daily_budget" DECIMAL(12,2),
    "lifetime_budget" DECIMAL(12,2),
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "target_locations" JSONB,
    "target_age_min" INTEGER DEFAULT 25,
    "target_age_max" INTEGER DEFAULT 65,
    "target_genders" JSONB,
    "target_interests" JSONB,
    "target_platforms" JSONB,
    "headline" TEXT,
    "primary_text" TEXT,
    "description" TEXT,
    "call_to_action" TEXT DEFAULT 'LEARN_MORE',
    "image_url" TEXT,
    "link_url" TEXT,
    "property_id" TEXT,
    "impressions" INTEGER DEFAULT 0,
    "clicks" INTEGER DEFAULT 0,
    "leads" INTEGER DEFAULT 0,
    "spent" DECIMAL(12,2) DEFAULT 0,
    "cpl" DECIMAL(12,2),
    "ctr" DECIMAL(6,4),
    "last_sync_at" TIMESTAMP(3),
    "error_message" TEXT,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meta_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "meta_campaigns_organization_id_idx" ON "meta_campaigns"("organization_id");
CREATE INDEX "meta_campaigns_created_by_id_idx" ON "meta_campaigns"("created_by_id");
CREATE INDEX "meta_campaigns_status_idx" ON "meta_campaigns"("status");
CREATE INDEX "meta_campaigns_meta_campaign_id_idx" ON "meta_campaigns"("meta_campaign_id");
CREATE INDEX "meta_campaigns_property_id_idx" ON "meta_campaigns"("property_id");

-- AddForeignKey
ALTER TABLE "meta_campaigns" ADD CONSTRAINT "meta_campaigns_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "meta_campaigns" ADD CONSTRAINT "meta_campaigns_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "meta_campaigns" ADD CONSTRAINT "meta_campaigns_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE SET NULL ON UPDATE CASCADE;
