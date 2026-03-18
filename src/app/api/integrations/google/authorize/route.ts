import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildGoogleOAuthUrl } from "@/lib/google-ads";

/**
 * GET /api/integrations/google/authorize
 * Returns the Google OAuth URL for the user to connect their Google Ads account.
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

    // Leer credenciales de la BD (prioridad) o env vars (fallback)
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { googleClientId: true, googleClientSecret: true },
    });

    const clientId = org?.googleClientId || process.env.GOOGLE_ADS_CLIENT_ID;
    const clientSecret = org?.googleClientSecret || process.env.GOOGLE_ADS_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: "Google Ads no configurado. Ve a Configuración → Integraciones y agrega tu Client ID y Client Secret." },
        { status: 400 },
      );
    }

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const redirectUri = `${baseUrl}/api/integrations/google/callback`;
    const state = Buffer.from(
      JSON.stringify({ organizationId, userId: (session.user as any).id }),
    ).toString("base64url");

    const url = buildGoogleOAuthUrl(redirectUri, state, clientId);

    return NextResponse.json({ url });
  } catch (error) {
    console.error("[google/authorize]", error);
    return NextResponse.json(
      { error: "Error generando URL de autorización" },
      { status: 500 },
    );
  }
}
