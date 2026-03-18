-- CreateTable
CREATE TABLE "saved_avatars" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "video_url" TEXT NOT NULL,
    "thumbnail_url" TEXT,
    "script" TEXT,
    "voice_description" TEXT,
    "resolution" TEXT DEFAULT '480p',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saved_avatars_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "saved_avatars_organization_id_idx" ON "saved_avatars"("organization_id");

-- CreateIndex
CREATE INDEX "saved_avatars_created_by_id_idx" ON "saved_avatars"("created_by_id");

-- AddForeignKey
ALTER TABLE "saved_avatars" ADD CONSTRAINT "saved_avatars_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_avatars" ADD CONSTRAINT "saved_avatars_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
