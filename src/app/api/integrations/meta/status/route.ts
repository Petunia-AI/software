import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/integrations/meta/status
 * Returns the Meta connection status for the current organization.
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

    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        metaAccessToken: true,
        metaPageId: true,
        metaPageName: true,
        metaAdAccountId: true,
        metaAdAccountName: true,
        metaConnectedAt: true,
        metaTokenExpiresAt: true,
      },
    });

    if (!org || !org.metaAccessToken) {
      return NextResponse.json({
        connected: false,
        pageName: null,
        adAccountName: null,
        connectedAt: null,
        tokenExpiresAt: null,
      });
    }

    const tokenExpired = org.metaTokenExpiresAt
      ? new Date(org.metaTokenExpiresAt) < new Date()
      : false;

    return NextResponse.json({
      connected: true,
      tokenExpired,
      pageName: org.metaPageName,
      pageId: org.metaPageId,
      adAccountName: org.metaAdAccountName,
      adAccountId: org.metaAdAccountId,
      connectedAt: org.metaConnectedAt,
      tokenExpiresAt: org.metaTokenExpiresAt,
    });
  } catch (error) {
    console.error("[meta/status]", error);
    return NextResponse.json(
      { error: "Error obteniendo estado de Meta" },
      { status: 500 },
    );
  }
}
