import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  exchangeCodeForToken,
  getLongLivedToken,
  getAdAccounts,
  getPages,
} from "@/lib/meta-ads";

/**
 * GET /api/integrations/meta/callback?code=...&state=...
 * Facebook OAuth callback — exchanges code for token and stores on Organization.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const stateParam = searchParams.get("state");
    const errorParam = searchParams.get("error");

    if (errorParam) {
      // User denied or error from Facebook
      const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
      return NextResponse.redirect(
        `${baseUrl}/settings?tab=integrations&meta=error&reason=${encodeURIComponent(errorParam)}`,
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
    const redirectUri = `${baseUrl}/api/integrations/meta/callback`;

    // Leer credenciales: org propia → plataforma BD → env vars
    const org = await prisma.organization.findUnique({
      where: { id: state.organizationId },
      select: { metaAppId: true, metaAppSecret: true },
    });

    let credAppId = org?.metaAppId;
    let credAppSecret = org?.metaAppSecret;

    if (!credAppId || !credAppSecret) {
      const platformConfig = await prisma.platformAIConfig.findFirst({
        where: { isActive: true },
        select: { metaAppId: true, metaAppSecret: true },
      });
      credAppId = credAppId || platformConfig?.metaAppId || process.env.META_APP_ID;
      credAppSecret = credAppSecret || platformConfig?.metaAppSecret || process.env.META_APP_SECRET;
    }

    const credentials = (credAppId && credAppSecret)
      ? { appId: credAppId, appSecret: credAppSecret }
      : undefined;

    // 1. Exchange code for short-lived token
    const shortToken = await exchangeCodeForToken(code, redirectUri, credentials);

    // 2. Exchange for long-lived token (~60 days)
    const longToken = await getLongLivedToken(shortToken.access_token, credentials);

    // 3. Discover ad accounts and pages
    const [adAccounts, pages] = await Promise.all([
      getAdAccounts(longToken.access_token),
      getPages(longToken.access_token),
    ]);

    // Pick first active ad account and page (user can change later)
    const activeAccount = adAccounts.find((a) => a.account_status === 1) || adAccounts[0];
    const firstPage = pages[0];

    // 4. Save everything on the organization
    const expiresAt = longToken.expires_in
      ? new Date(Date.now() + longToken.expires_in * 1000)
      : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000); // default 60 days

    await prisma.organization.update({
      where: { id: state.organizationId },
      data: {
        metaAccessToken: longToken.access_token,
        metaPageId: firstPage?.id || null,
        metaPageName: firstPage?.name || null,
        metaAdAccountId: activeAccount?.id || null,
        metaAdAccountName: activeAccount?.name || null,
        metaConnectedAt: new Date(),
        metaConnectedBy: state.userId,
        metaTokenExpiresAt: expiresAt,
      },
    });

    // Redirect back to settings
    return NextResponse.redirect(
      `${baseUrl}/settings?tab=integrations&meta=connected`,
    );
  } catch (error: any) {
    console.error("[meta/callback]", error);
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    return NextResponse.redirect(
      `${baseUrl}/settings?tab=integrations&meta=error&reason=${encodeURIComponent(error.message || "unknown")}`,
    );
  }
}
