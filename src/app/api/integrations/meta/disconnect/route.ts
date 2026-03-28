import { NextResponse } from "next/server";
import { requireOrgAdmin, forbidden } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

/**
 * DELETE /api/integrations/meta/disconnect
 * Disconnects Meta from the organization.
 */
export async function DELETE() {
  try {
    const user = await requireOrgAdmin();
    if (!user) return forbidden();

    await prisma.organization.update({
      where: { id: user.organizationId },
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
