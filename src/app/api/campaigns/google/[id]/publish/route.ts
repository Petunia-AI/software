import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  createFullGoogleCampaign,
  getValidAccessToken,
  extractResourceId,
  type GoogleKeywordTarget,
} from "@/lib/google-ads";

/**
 * POST /api/campaigns/google/[id]/publish
 * Publishes a draft Google campaign — creates Campaign → AdGroup → Keywords → Ad.
 */

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const organizationId = (session.user as any).organizationId as string | null;
    if (!organizationId) {
      return NextResponse.json({ error: "Sin organización" }, { status: 400 });
    }

    const { id } = await params;

    // 1. Get the campaign
    const campaign = await prisma.googleCampaign.findFirst({
      where: { id, organizationId },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaña no encontrada" }, { status: 404 });
    }

    if (!["DRAFT", "ERROR"].includes(campaign.status)) {
      return NextResponse.json(
        { error: "Solo se pueden publicar campañas en borrador" },
        { status: 400 },
      );
    }

    // 2. Verify Google Ads is connected
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        googleAccessToken: true,
        googleRefreshToken: true,
        googleCustomerId: true,
        googleTokenExpiresAt: true,
      },
    });

    if (!org?.googleAccessToken || !org?.googleCustomerId) {
      return NextResponse.json(
        { error: "Google Ads no está conectado. Ve a Configuración → Integraciones." },
        { status: 400 },
      );
    }

    // 3. Validate required fields
    const headlines = (campaign.headlines as string[]) || [];
    const descriptions = (campaign.descriptions as string[]) || [];

    if (headlines.length < 1 || descriptions.length < 1 || !campaign.dailyBudget) {
      return NextResponse.json(
        { error: "La campaña necesita al menos 1 headline, 1 descripción y presupuesto diario." },
        { status: 400 },
      );
    }

    // 4. Mark as pending
    await prisma.googleCampaign.update({
      where: { id },
      data: { status: "PENDING_REVIEW", errorMessage: null },
    });

    // 5. Get valid access token (refresh if needed)
    let accessToken = org.googleAccessToken;
    try {
      const tokenResult = await getValidAccessToken(
        org.googleAccessToken,
        org.googleRefreshToken,
        org.googleTokenExpiresAt,
      );
      accessToken = tokenResult.accessToken;

      // If refreshed, save new token
      if (tokenResult.refreshed) {
        await prisma.organization.update({
          where: { id: organizationId },
          data: {
            googleAccessToken: accessToken,
            googleTokenExpiresAt: new Date(Date.now() + 3600 * 1000),
          },
        });
      }
    } catch {
      // Use existing token
    }

    // 6. Build keyword targets
    const keywords: GoogleKeywordTarget[] =
      (campaign.targetKeywords as unknown as GoogleKeywordTarget[]) || [];

    // Location IDs
    const locationIds: string[] = campaign.targetLocations
      ? (campaign.targetLocations as unknown as any[]).map((l: any) => l.id || l.key).filter(Boolean)
      : [];

    // 7. Publish to Google Ads
    try {
      const dailyBudgetMicros = Math.round(Number(campaign.dailyBudget) * 1_000_000);

      const result = await createFullGoogleCampaign({
        accessToken,
        customerId: org.googleCustomerId,
        name: campaign.name,
        objective: campaign.objective,
        dailyBudget: dailyBudgetMicros,
        headlines,
        descriptions,
        finalUrl: campaign.finalUrl || `${process.env.NEXTAUTH_URL || "https://petunia.ai"}/p/${campaign.propertyId || ""}`,
        displayPath1: campaign.displayUrl?.split("/")[0] || undefined,
        keywords: keywords.length > 0 ? keywords : undefined,
        locationIds: locationIds.length > 0 ? locationIds : undefined,
      });

      // 8. Save Google IDs back to our record
      const updated = await prisma.googleCampaign.update({
        where: { id },
        data: {
          googleCampaignId: extractResourceId(result.campaignResourceName),
          googleAdGroupId: extractResourceId(result.adGroupResourceName),
          googleAdId: extractResourceId(result.adResourceName),
          status: "ACTIVE",
          publishedAt: new Date(),
          errorMessage: null,
        },
      });

      return NextResponse.json({
        campaign: updated,
        googleIds: {
          campaignId: extractResourceId(result.campaignResourceName),
          adGroupId: extractResourceId(result.adGroupResourceName),
          adId: extractResourceId(result.adResourceName),
        },
      });
    } catch (googleError: any) {
      // Google API error — mark campaign as ERROR
      await prisma.googleCampaign.update({
        where: { id },
        data: {
          status: "ERROR",
          errorMessage: googleError.message || "Error desconocido de Google Ads API",
        },
      });

      return NextResponse.json(
        {
          error: "Error publicando en Google Ads",
          details: googleError.googleError || googleError.message,
        },
        { status: 502 },
      );
    }
  } catch (error: any) {
    console.error("[campaigns/google/publish]", error);
    return NextResponse.json(
      { error: "Error publicando campaña" },
      { status: 500 },
    );
  }
}
