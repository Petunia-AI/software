-- Add Google Ads OAuth fields to organizations
ALTER TABLE "organizations" ADD COLUMN "google_access_token" TEXT;
ALTER TABLE "organizations" ADD COLUMN "google_refresh_token" TEXT;
ALTER TABLE "organizations" ADD COLUMN "google_customer_id" TEXT;
ALTER TABLE "organizations" ADD COLUMN "google_customer_name" TEXT;
ALTER TABLE "organizations" ADD COLUMN "google_connected_at" TIMESTAMP(3);
ALTER TABLE "organizations" ADD COLUMN "google_connected_by" TEXT;
ALTER TABLE "organizations" ADD COLUMN "google_token_expires_at" TIMESTAMP(3);

-- Create google_campaigns table
CREATE TABLE "google_campaigns" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "google_campaign_id" TEXT,
    "google_ad_group_id" TEXT,
    "google_ad_id" TEXT,
    "name" TEXT NOT NULL,
    "objective" "campaign_objective" NOT NULL DEFAULT 'LEAD_GENERATION',
    "status" "campaign_status" NOT NULL DEFAULT 'DRAFT',
    "daily_budget" DECIMAL(12,2),
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "target_locations" JSONB,
    "target_age_min" INTEGER DEFAULT 25,
    "target_age_max" INTEGER DEFAULT 65,
    "target_genders" JSONB,
    "target_keywords" JSONB,
    "headlines" JSONB,
    "descriptions" JSONB,
    "final_url" TEXT,
    "display_url" TEXT,
    "call_to_action" TEXT DEFAULT 'LEARN_MORE',
    "image_url" TEXT,
    "property_id" TEXT,
    "impressions" INTEGER DEFAULT 0,
    "clicks" INTEGER DEFAULT 0,
    "leads" INTEGER DEFAULT 0,
    "spent" DECIMAL(12,2) DEFAULT 0,
    "cpl" DECIMAL(12,2),
    "ctr" DECIMAL(6,4),
    "conversions" INTEGER DEFAULT 0,
    "last_sync_at" TIMESTAMP(3),
    "error_message" TEXT,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "google_campaigns_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "google_campaigns_organization_id_idx" ON "google_campaigns"("organization_id");
CREATE INDEX "google_campaigns_created_by_id_idx" ON "google_campaigns"("created_by_id");
CREATE INDEX "google_campaigns_status_idx" ON "google_campaigns"("status");
CREATE INDEX "google_campaigns_google_campaign_id_idx" ON "google_campaigns"("google_campaign_id");
CREATE INDEX "google_campaigns_property_id_idx" ON "google_campaigns"("property_id");

-- Foreign keys
ALTER TABLE "google_campaigns" ADD CONSTRAINT "google_campaigns_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "google_campaigns" ADD CONSTRAINT "google_campaigns_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "google_campaigns" ADD CONSTRAINT "google_campaigns_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE SET NULL ON UPDATE CASCADE;
