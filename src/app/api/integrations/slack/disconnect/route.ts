import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revokeToken } from "@/lib/slack";

/**
 * DELETE /api/integrations/slack/disconnect
 * Revokes the Slack bot token and removes connection data.
 */
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const user = session.user as { id: string; organizationId?: string };
    if (!user.organizationId) {
      return NextResponse.json({ error: "Sin organización" }, { status: 400 });
    }

    const org = await prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { slackBotToken: true },
    });

    // Revoke the token at Slack (best-effort)
    if (org?.slackBotToken) {
      try {
        await revokeToken(org.slackBotToken);
      } catch (e) {
        console.warn("[Slack Disconnect] Failed to revoke token:", e);
      }
    }

    // Clear all Slack fields
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
