-- AlterTable
ALTER TABLE "organizations" ADD COLUMN "slack_team_id" TEXT,
ADD COLUMN "slack_team_name" TEXT,
ADD COLUMN "slack_bot_token" TEXT,
ADD COLUMN "slack_channel_id" TEXT,
ADD COLUMN "slack_channel_name" TEXT,
ADD COLUMN "slack_connected_at" TIMESTAMP(3),
ADD COLUMN "slack_connected_by" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slack_team_id_key" ON "organizations"("slack_team_id");
