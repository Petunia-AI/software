import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { listChannels } from "@/lib/slack";

/**
 * GET /api/integrations/slack/status
 * Returns the current Slack connection info for the organization.
 */
export async function GET() {
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
      select: {
        slackTeamId: true,
        slackTeamName: true,
        slackChannelId: true,
        slackChannelName: true,
        slackConnectedAt: true,
        slackBotToken: true,
      },
    });

    if (!org || !org.slackBotToken) {
      return NextResponse.json({ connected: false });
    }

    // Try to fetch channels so user can pick one
    let channels: { id: string; name: string }[] = [];
    try {
      const fullChannels = await listChannels(org.slackBotToken);
      channels = fullChannels.map((c) => ({ id: c.id, name: c.name }));
    } catch (e) {
      console.warn("[Slack Status] Could not list channels:", e);
    }

    return NextResponse.json({
      connected: true,
      teamId: org.slackTeamId,
      teamName: org.slackTeamName,
      channelId: org.slackChannelId,
      channelName: org.slackChannelName,
      connectedAt: org.slackConnectedAt,
      channels,
    });
  } catch (error) {
    console.error("[Slack Status]", error);
    return NextResponse.json(
      { error: "Error al obtener estado de Slack" },
      { status: 500 },
    );
  }
}
