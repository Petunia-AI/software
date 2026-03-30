import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildMetaOAuthUrl } from "@/lib/meta-ads";

/**
 * GET /api/integrations/meta/authorize
 * Returns the Facebook OAuth URL for the user to connect their Meta account.
 * Reads credentials from DB first, falls back to env vars.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const organizationId = (session.user as any).organizationId as string | null;
    if (!organizationId) {
      return NextResponse.json({ error: "Sin organización" }, { status: 400 });
    }

    // Leer credenciales: org propia → plataforma BD → env vars
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { metaAppId: true, metaAppSecret: true },
    });

    let appId = org?.metaAppId;
    let appSecret = org?.metaAppSecret;

    if (!appId || !appSecret) {
      // Fallback: credenciales de plataforma en la BD
      const platformConfig = await prisma.platformAIConfig.findFirst({
        where: { isActive: true },
        select: { metaAppId: true, metaAppSecret: true },
      });
      appId = appId || platformConfig?.metaAppId || process.env.META_APP_ID;
      appSecret = appSecret || platformConfig?.metaAppSecret || process.env.META_APP_SECRET;
    }

    if (!appId || !appSecret) {
      return NextResponse.json(
        { error: "Meta App no configurada. Ve a Configuración → Integraciones y agrega tu App ID y App Secret." },
        { status: 400 },
      );
    }

    const baseUrl = (process.env.NEXTAUTH_URL || "http://localhost:3000").replace(/\/$/, "");
    const redirectUri = `${baseUrl}/api/integrations/meta/callback`;
    const state = Buffer.from(
      JSON.stringify({ organizationId, userId: (session.user as any).id }),
    ).toString("base64url");

    const url = buildMetaOAuthUrl(redirectUri, state, appId);

    return NextResponse.json({ url, redirectUri });
  } catch (error) {
    console.error("[meta/authorize]", error);
    return NextResponse.json(
      { error: "Error generando URL de autorización" },
      { status: 500 },
    );
  }
}
