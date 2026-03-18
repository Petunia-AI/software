-- CreateTable: knowledge_entries
CREATE TABLE "knowledge_entries" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "knowledge_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable: campaign_results
CREATE TABLE "campaign_results" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "campaign_name" TEXT NOT NULL,
    "campaign_type" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "period" TEXT,
    "headline" TEXT,
    "primary_text" TEXT,
    "impressions" INTEGER DEFAULT 0,
    "clicks" INTEGER DEFAULT 0,
    "leads" INTEGER DEFAULT 0,
    "spent" DECIMAL(12,2),
    "ctr" DECIMAL(6,4),
    "cpl" DECIMAL(12,2),
    "what_worked" TEXT,
    "what_didnt_work" TEXT,
    "property_type" TEXT,
    "target_city" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaign_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "knowledge_entries_organization_id_idx" ON "knowledge_entries"("organization_id");
CREATE INDEX "knowledge_entries_category_idx" ON "knowledge_entries"("category");
CREATE INDEX "campaign_results_organization_id_idx" ON "campaign_results"("organization_id");

-- AddForeignKey
ALTER TABLE "knowledge_entries" ADD CONSTRAINT "knowledge_entries_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "knowledge_entries" ADD CONSTRAINT "knowledge_entries_created_by_id_fkey"
    FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_results" ADD CONSTRAINT "campaign_results_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "campaign_results" ADD CONSTRAINT "campaign_results_created_by_id_fkey"
    FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
