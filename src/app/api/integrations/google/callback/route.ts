import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  exchangeCodeForTokens,
  getAccessibleCustomers,
  getCustomerInfo,
} from "@/lib/google-ads";

/**
 * GET /api/integrations/google/callback?code=...&state=...
 * Google OAuth callback — exchanges code for tokens and stores on Organization.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const stateParam = searchParams.get("state");
    const errorParam = searchParams.get("error");

    if (errorParam) {
      const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
      return NextResponse.redirect(
        `${baseUrl}/settings?tab=integrations&google=error&reason=${encodeURIComponent(errorParam)}`,
      );
    }

    if (!code || !stateParam) {
      return NextResponse.json({ error: "Parámetros faltantes" }, { status: 400 });
    }

    // Decode state
    let state: { organizationId: string; userId: string };
    try {
      state = JSON.parse(
        Buffer.from(stateParam, "base64url").toString("utf-8"),
      );
    } catch {
      return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
    }

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const redirectUri = `${baseUrl}/api/integrations/google/callback`;

    // Leer credenciales de la BD (prioridad) o env vars (fallback)
    const org = await prisma.organization.findUnique({
      where: { id: state.organizationId },
      select: { googleClientId: true, googleClientSecret: true },
    });

    const credentials = (org?.googleClientId && org?.googleClientSecret)
      ? { clientId: org.googleClientId, clientSecret: org.googleClientSecret }
      : undefined;

    // 1. Exchange code for tokens (includes refresh_token on first auth)
    const tokens = await exchangeCodeForTokens(code, redirectUri, credentials);

    // 2. Discover accessible customer accounts
    const customerResourceNames = await getAccessibleCustomers(tokens.access_token);

    // Pick first customer account
    let customerId = "";
    let customerName = "";

    if (customerResourceNames.length > 0) {
      const firstCustomerPath = customerResourceNames[0]; // e.g. "customers/1234567890"
      customerId = firstCustomerPath.split("/").pop() || "";

      try {
        const info = await getCustomerInfo(tokens.access_token, customerId);
        customerName = info.descriptiveName || `Customer ${customerId}`;
      } catch {
        customerName = `Google Ads ${customerId}`;
      }
    }

    // 3. Save on the organization
    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000)
      : new Date(Date.now() + 60 * 60 * 1000); // default 1 hour

    await prisma.organization.update({
      where: { id: state.organizationId },
      data: {
        googleAccessToken: tokens.access_token,
        googleRefreshToken: tokens.refresh_token || null,
        googleCustomerId: customerId || null,
        googleCustomerName: customerName || null,
        googleConnectedAt: new Date(),
        googleConnectedBy: state.userId,
        googleTokenExpiresAt: expiresAt,
      },
    });

    // Redirect back to settings
    return NextResponse.redirect(
      `${baseUrl}/settings?tab=integrations&google=connected`,
    );
  } catch (error: any) {
    console.error("[google/callback]", error);
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    return NextResponse.redirect(
      `${baseUrl}/settings?tab=integrations&google=error&reason=${encodeURIComponent(error.message || "unknown")}`,
    );
  }
}
