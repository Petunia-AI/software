import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendMessage } from "@/lib/slack";

/**
 * POST /api/integrations/slack/send-test
 * Sends a test message to the configured Slack channel.
 */
export async function POST(req: NextRequest) {
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
    const channelId = body.channelId as string | undefined;

    const org = await prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { slackBotToken: true, slackChannelId: true, name: true },
    });

    if (!org?.slackBotToken) {
      return NextResponse.json(
        { error: "Slack no está conectado" },
        { status: 400 },
      );
    }

    const targetChannel = channelId || org.slackChannelId;
    if (!targetChannel) {
      return NextResponse.json(
        { error: "No hay canal configurado" },
        { status: 400 },
      );
    }

    const blocks = [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "✅ Petunia conectado correctamente",
          emoji: true,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*${org.name}* ha conectado Petunia a este canal.\n\nRecibirás notificaciones sobre:\n• 🎉 Nuevos leads\n• ⏰ Seguimientos pendientes\n• 📊 Resúmenes de actividad`,
        },
      },
      { type: "divider" },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: "Petunia AI · Plataforma inmobiliaria con IA",
          },
        ],
      },
    ];

    await sendMessage(
      org.slackBotToken,
      targetChannel,
      `✅ Petunia conectado correctamente para ${org.name}`,
      blocks,
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[Slack Send Test]", error);
    return NextResponse.json(
      { error: "Error al enviar mensaje de prueba" },
      { status: 500 },
    );
  }
}
