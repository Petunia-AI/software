import { NextResponse } from "next/server";
import { requireOrgAdmin, forbidden } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { revokeToken } from "@/lib/slack";

/**
 * DELETE /api/integrations/slack/disconnect
 * Revokes the Slack bot token and removes connection data.
 */
export async function DELETE() {
  try {
    const user = await requireOrgAdmin();
    if (!user) return forbidden();

    const org = await prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { slackBotToken: true },
    });

    if (org?.slackBotToken) {
      try { await revokeToken(org.slackBotToken); } catch (e) {
        console.warn("[Slack Disconnect] Failed to revoke token:", e);
      }
    }

    await prisma.organization.update({
      where: { id: user.organizationId },
      data: {
        slackTeamId: null,
        slackTeamName: null,
        slackBotToken: null,
        slackChannelId: null,
        slackChannelName: null,
        slackConnectedAt: null,
        slackConnectedBy: null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[Slack Disconnect]", error);
    return NextResponse.json(
      { error: "Error al desconectar Slack" },
      { status: 500 },
    );
  }
}
