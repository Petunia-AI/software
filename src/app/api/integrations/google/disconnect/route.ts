import { NextResponse } from "next/server";
import { requireOrgAdmin, forbidden } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

/**
 * DELETE /api/integrations/google/disconnect
 * Disconnects Google Ads from the organization.
 */
export async function DELETE() {
  try {
    const user = await requireOrgAdmin();
    if (!user) return forbidden();

    await prisma.organization.update({
      where: { id: user.organizationId },
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
