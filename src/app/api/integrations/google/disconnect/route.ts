import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * DELETE /api/integrations/google/disconnect
 * Disconnects Google Ads from the organization.
 */
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const organizationId = (session.user as any).organizationId as string | null;
    if (!organizationId) {
      return NextResponse.json({ error: "Sin organización" }, { status: 400 });
    }

    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        googleAccessToken: null,
        googleRefreshToken: null,
        googleCustomerId: null,
        googleCustomerName: null,
        googleConnectedAt: null,
        googleConnectedBy: null,
        googleTokenExpiresAt: null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[google/disconnect]", error);
    return NextResponse.json(
      { error: "Error al desconectar Google Ads" },
      { status: 500 },
    );
  }
}
