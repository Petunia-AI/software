import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/integrations/google/status
 * Returns the Google Ads connection status for the current organization.
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
        googleAccessToken: true,
        googleRefreshToken: true,
        googleCustomerId: true,
        googleCustomerName: true,
        googleConnectedAt: true,
        googleTokenExpiresAt: true,
      },
    });

    if (!org || !org.googleAccessToken) {
      return NextResponse.json({
        connected: false,
        customerName: null,
        customerId: null,
        connectedAt: null,
        tokenExpiresAt: null,
      });
    }

    // Google tokens auto-refresh, but check if we have a refresh token
    const hasRefreshToken = !!org.googleRefreshToken;
    const tokenExpired = org.googleTokenExpiresAt
      ? new Date(org.googleTokenExpiresAt) < new Date()
      : false;

    return NextResponse.json({
      connected: true,
      tokenExpired: tokenExpired && !hasRefreshToken,
      canAutoRefresh: hasRefreshToken,
      customerName: org.googleCustomerName,
      customerId: org.googleCustomerId,
      connectedAt: org.googleConnectedAt,
      tokenExpiresAt: org.googleTokenExpiresAt,
    });
  } catch (error) {
    console.error("[google/status]", error);
    return NextResponse.json(
      { error: "Error obteniendo estado de Google Ads" },
      { status: 500 },
    );
  }
}
