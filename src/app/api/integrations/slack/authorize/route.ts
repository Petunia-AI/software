import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildSlackAuthorizeUrl } from "@/lib/slack";
import crypto from "crypto";

/**
 * GET /api/integrations/slack/authorize
 * Returns the Slack OAuth URL for the user to connect their workspace.
 * We embed organizationId in a signed state param to prevent CSRF.
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

    // Check env vars are set
    if (!process.env.SLACK_CLIENT_ID || !process.env.SLACK_CLIENT_SECRET) {
      return NextResponse.json(
        { error: "Slack no está configurado. Contacta al administrador." },
        { status: 503 },
      );
    }

    // Build a state token: orgId:userId:random — signed with NEXTAUTH_SECRET
    const random = crypto.randomBytes(16).toString("hex");
    const payload = `${user.organizationId}:${user.id}:${random}`;
    const hmac = crypto
      .createHmac("sha256", process.env.NEXTAUTH_SECRET || "secret")
      .update(payload)
      .digest("hex");
    const state = `${payload}:${hmac}`;

    // Store state temporarily in the DB via organization for validation
    await prisma.organization.update({
      where: { id: user.organizationId },
      data: { slackConnectedBy: state }, // reuse this field temporarily
    });

    const url = buildSlackAuthorizeUrl(state);

    return NextResponse.json({ url });
  } catch (error) {
    console.error("[Slack Authorize]", error);
    return NextResponse.json(
      { error: "Error al generar URL de autorización" },
      { status: 500 },
    );
  }
}
