import { NextRequest, NextResponse } from "next/server";
import { requireOrganization, unauthorized } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/integrations/google/credentials
 * Devuelve si la organización tiene credenciales de Google Ads configuradas.
 */
export async function GET() {
  try {
    const user = await requireOrganization();
    if (!user) return unauthorized();

    const org = await prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { googleClientId: true, googleClientSecret: true, googleDeveloperToken: true },
    });

    return NextResponse.json({
      configured: !!(org?.googleClientId && org?.googleClientSecret),
      clientId: org?.googleClientId || "",
      clientSecretHint: org?.googleClientSecret
        ? `••••••••${org.googleClientSecret.slice(-4)}`
        : "",
      hasDeveloperToken: !!org?.googleDeveloperToken,
    });
  } catch (error) {
    console.error("[google/credentials GET]", error);
    return NextResponse.json({ error: "Error al obtener credenciales" }, { status: 500 });
  }
}

/**
 * POST /api/integrations/google/credentials
 * Guarda las credenciales de Google Ads en la organización.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireOrganization();
    if (!user) return unauthorized();

    const body = await req.json();
    const { clientId, clientSecret, developerToken } = body;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: "Se requieren Client ID y Client Secret" },
        { status: 400 }
      );
    }

    await prisma.organization.update({
      where: { id: user.organizationId },
      data: {
        googleClientId: clientId.trim(),
        googleClientSecret: clientSecret.trim(),
        googleDeveloperToken: developerToken?.trim() || null,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Credenciales de Google Ads guardadas correctamente",
    });
  } catch (error) {
    console.error("[google/credentials POST]", error);
    return NextResponse.json(
      { error: "Error al guardar credenciales" },
      { status: 500 }
    );
  }
}
