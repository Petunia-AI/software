import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createFullCampaign, type MetaTargeting } from "@/lib/meta-ads";

/**
 * POST /api/campaigns/[id]/publish
 * Publishes a draft campaign to Meta Ads — creates Campaign → AdSet → Creative → Ad.
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
    const campaign = await prisma.metaCampaign.findFirst({
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

    // 2. Verify Meta is connected
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        metaAccessToken: true,
        metaAdAccountId: true,
        metaPageId: true,
        metaTokenExpiresAt: true,
      },
    });

    if (!org?.metaAccessToken || !org?.metaAdAccountId || !org?.metaPageId) {
      return NextResponse.json(
        { error: "Meta Ads no está conectado. Ve a Configuración → Integraciones." },
        { status: 400 },
      );
    }

    if (org.metaTokenExpiresAt && new Date(org.metaTokenExpiresAt) < new Date()) {
      return NextResponse.json(
        { error: "Tu token de Meta expiró. Reconecta tu cuenta en Configuración." },
        { status: 400 },
      );
    }

    // 3. Validate required fields
    if (!campaign.headline || !campaign.primaryText || !campaign.dailyBudget) {
      return NextResponse.json(
        { error: "La campaña necesita headline, texto y presupuesto diario." },
        { status: 400 },
      );
    }

    // 4. Mark as pending
    await prisma.metaCampaign.update({
      where: { id },
      data: { status: "PENDING_REVIEW", errorMessage: null },
    });

    // 5. Build targeting
    const targeting: MetaTargeting = {
      age_min: campaign.targetAgeMin ?? 25,
      age_max: campaign.targetAgeMax ?? 65,
    };

    // Genders
    if (campaign.targetGenders && Array.isArray(campaign.targetGenders)) {
      targeting.genders = campaign.targetGenders as number[];
    }

    // Locations
    if (campaign.targetLocations && Array.isArray(campaign.targetLocations)) {
      const locations = campaign.targetLocations as any[];
      const cities = locations.filter((l) => l.type === "city");
      const countries = locations.filter((l) => l.type === "country");

      targeting.geo_locations = {};
      if (cities.length > 0) {
        targeting.geo_locations.cities = cities.map((c) => ({
          key: c.key,
          radius: 15,
          distance_unit: "kilometer",
        }));
      }
      if (countries.length > 0) {
        targeting.geo_locations.countries = countries.map((c) => c.key);
      }
    }

    // Interests
    if (campaign.targetInterests && Array.isArray(campaign.targetInterests)) {
      targeting.flexible_spec = [
        { interests: campaign.targetInterests as { id: string; name: string }[] },
      ];
    }

    // Platforms
    if (campaign.targetPlatforms && Array.isArray(campaign.targetPlatforms)) {
      targeting.publisher_platforms = campaign.targetPlatforms as string[];
    }

    // 6. Publish to Meta
    try {
      const result = await createFullCampaign({
        adAccountId: org.metaAdAccountId,
        pageId: org.metaPageId,
        accessToken: org.metaAccessToken,
        name: campaign.name,
        objective: campaign.objective,
        dailyBudget: Math.round(Number(campaign.dailyBudget) * 100), // API expects cents
        currency: campaign.currency,
        startDate: campaign.startDate?.toISOString(),
        endDate: campaign.endDate?.toISOString(),
        targeting,
        headline: campaign.headline,
        primaryText: campaign.primaryText,
        description: campaign.description || undefined,
        callToAction: campaign.callToAction || "LEARN_MORE",
        linkUrl: campaign.linkUrl || `${process.env.NEXTAUTH_URL || "https://petunia.ai"}/p/${campaign.propertyId || ""}`,
        imageUrl: campaign.imageUrl || undefined,
      });

      // 7. Save Meta IDs back to our record
      const updated = await prisma.metaCampaign.update({
        where: { id },
        data: {
          metaCampaignId: result.campaignId,
          metaAdSetId: result.adSetId,
          metaCreativeId: result.creativeId,
          metaAdId: result.adId,
          status: "ACTIVE",
          publishedAt: new Date(),
          errorMessage: null,
        },
      });

      return NextResponse.json({ campaign: updated, metaIds: result });
    } catch (metaError: any) {
      // Meta API error — mark campaign as ERROR
      await prisma.metaCampaign.update({
        where: { id },
        data: {
          status: "ERROR",
          errorMessage: metaError.message || "Error desconocido de Meta API",
        },
      });

      return NextResponse.json(
        {
          error: "Error publicando en Meta",
          details: metaError.metaError || metaError.message,
        },
        { status: 502 },
      );
    }
  } catch (error: any) {
    console.error("[campaigns/publish]", error);
    return NextResponse.json(
      { error: "Error publicando campaña" },
      { status: 500 },
    );
  }
}
