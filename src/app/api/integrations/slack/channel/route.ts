import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * PATCH /api/integrations/slack/channel
 * Updates the Slack channel where notifications are sent.
 */
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const user = session.user as { id: string; organizationId?: string };
    if (!user.organizationId) {
      return NextResponse.json({ error: "Sin organización" }, { status: 400 });
    }

    const body = await req.json();
    const { channelId, channelName } = body as {
      channelId: string;
      channelName: string;
    };

    if (!channelId || !channelName) {
      return NextResponse.json(
        { error: "channelId y channelName son requeridos" },
        { status: 400 },
      );
    }

    await prisma.organization.update({
      where: { id: user.organizationId },
      data: {
        slackChannelId: channelId,
        slackChannelName: channelName,
      },
    });

    return NextResponse.json({ ok: true, channelId, channelName });
  } catch (error) {
    console.error("[Slack Channel Update]", error);
    return NextResponse.json(
      { error: "Error al actualizar canal" },
      { status: 500 },
    );
  }
}
