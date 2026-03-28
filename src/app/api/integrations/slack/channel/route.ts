import { NextRequest, NextResponse } from "next/server";
import { requireOrgAdmin, forbidden } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

/**
 * PATCH /api/integrations/slack/channel
 * Updates the Slack channel where notifications are sent.
 */
export async function PATCH(req: NextRequest) {
  try {
    const user = await requireOrgAdmin();
    if (!user) return forbidden();

    const body = await req.json();
    const { channelId, channelName } = body as { channelId: string; channelName: string };

    if (!channelId || !channelName) {
      return NextResponse.json({ error: "channelId y channelName son requeridos" }, { status: 400 });
    }

    await prisma.organization.update({
      where: { id: user.organizationId },
      data: { slackChannelId: channelId, slackChannelName: channelName },
    });

    return NextResponse.json({ ok: true, channelId, channelName });
  } catch (error) {
    console.error("[Slack Channel Update]", error);
    return NextResponse.json({ error: "Error al actualizar canal" }, { status: 500 });
  }
}
