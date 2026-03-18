import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * DELETE /api/integrations/meta/disconnect
 * Disconnects Meta from the organization.
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
        metaAccessToken: null,
        metaPageId: null,
        metaPageName: null,
        metaAdAccountId: null,
        metaAdAccountName: null,
        metaConnectedAt: null,
        metaConnectedBy: null,
        metaTokenExpiresAt: null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[meta/disconnect]", error);
    return NextResponse.json(
      { error: "Error al desconectar Meta" },
      { status: 500 },
    );
  }
}
