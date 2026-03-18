-- CreateEnum
CREATE TYPE "landing_page_status" AS ENUM ('DRAFT', 'ACTIVE');

-- CreateTable
CREATE TABLE "landing_pages" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "slug" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "nicho" TEXT,
    "status" "landing_page_status" NOT NULL DEFAULT 'DRAFT',
    "html" TEXT,
    "views" INTEGER NOT NULL DEFAULT 0,
    "leads" INTEGER NOT NULL DEFAULT 0,
    "conversion_rate" DECIMAL(6,2) DEFAULT 0,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "landing_pages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "landing_pages_organization_id_idx" ON "landing_pages"("organization_id");
CREATE INDEX "landing_pages_created_by_id_idx" ON "landing_pages"("created_by_id");
CREATE INDEX "landing_pages_status_idx" ON "landing_pages"("status");
CREATE UNIQUE INDEX "landing_pages_organization_id_slug_key" ON "landing_pages"("organization_id", "slug");

-- AddForeignKey
ALTER TABLE "landing_pages" ADD CONSTRAINT "landing_pages_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "landing_pages" ADD CONSTRAINT "landing_pages_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
