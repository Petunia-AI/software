import { NextRequest, NextResponse } from "next/server";
import { requireOrganization, requireOrgAdmin, unauthorized, forbidden } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/integrations/meta/credentials
 * Devuelve si la organización tiene credenciales de Meta configuradas (sin exponer el secret).
 * Si la organización no tiene las suyas, verifica si la plataforma tiene Meta App configurada.
 */
export async function GET() {
  try {
    const user = await requireOrganization();
    if (!user) return unauthorized();

    const org = await prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { metaAppId: true, metaAppSecret: true },
    });

    const orgHasOwn = !!(org?.metaAppId && org?.metaAppSecret);
    const platformHas = !!(process.env.META_APP_ID && process.env.META_APP_SECRET);

    return NextResponse.json({
      configured: orgHasOwn || platformHas,
      usingPlatformCredentials: platformHas && !orgHasOwn,
      appId: org?.metaAppId || "",
      // Solo mostramos los últimos 4 caracteres del secret
      appSecretHint: org?.metaAppSecret
        ? `••••••••${org.metaAppSecret.slice(-4)}`
        : "",
    });
  } catch (error) {
    console.error("[meta/credentials GET]", error);
    return NextResponse.json({ error: "Error al obtener credenciales" }, { status: 500 });
  }
}

/**
 * POST /api/integrations/meta/credentials
 * Guarda el META_APP_ID y META_APP_SECRET en la organización.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireOrgAdmin();
    if (!user) return forbidden();

    const body = await req.json();
    const { appId, appSecret } = body;

    if (!appId || !appSecret) {
      return NextResponse.json(
        { error: "Se requieren App ID y App Secret" },
        { status: 400 }
      );
    }

    // Validar formato básico
    if (appId.length < 10) {
      return NextResponse.json(
        { error: "El App ID no parece válido (muy corto)" },
        { status: 400 }
      );
    }

    if (appSecret.length < 10) {
      return NextResponse.json(
        { error: "El App Secret no parece válido (muy corto)" },
        { status: 400 }
      );
    }

    await prisma.organization.update({
      where: { id: user.organizationId },
      data: {
        metaAppId: appId.trim(),
        metaAppSecret: appSecret.trim(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Credenciales de Meta guardadas correctamente",
    });
  } catch (error) {
    console.error("[meta/credentials POST]", error);
    return NextResponse.json(
      { error: "Error al guardar credenciales" },
      { status: 500 }
    );
  }
}
