import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/campaigns — list campaigns for the organization
 * POST /api/campaigns — create a new draft campaign
 */

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const organizationId = (session.user as any).organizationId as string | null;
    if (!organizationId) {
      return NextResponse.json({ error: "Sin organización" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const campaigns = await prisma.metaCampaign.findMany({
      where: {
        organizationId,
        ...(status ? { status: status as any } : {}),
      },
      include: {
        property: { select: { id: true, title: true, images: true, city: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json({ campaigns });
  } catch (error) {
    console.error("[campaigns] GET error:", error);
    return NextResponse.json({ error: "Error listando campañas" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const userId = (session.user as any).id as string;
    const organizationId = (session.user as any).organizationId as string | null;
    if (!organizationId) {
      return NextResponse.json({ error: "Sin organización" }, { status: 400 });
    }

    const body = await req.json();

    const campaign = await prisma.metaCampaign.create({
      data: {
        organizationId,
        createdById: userId,
        name: body.name || "Nueva Campaña",
        objective: body.objective || "LEAD_GENERATION",
        status: "DRAFT",
        dailyBudget: body.dailyBudget || null,
        lifetimeBudget: body.lifetimeBudget || null,
        currency: body.currency || "USD",
        startDate: body.startDate ? new Date(body.startDate) : null,
        endDate: body.endDate ? new Date(body.endDate) : null,
        targetLocations: body.targetLocations || null,
        targetAgeMin: body.targetAgeMin ?? 25,
        targetAgeMax: body.targetAgeMax ?? 65,
        targetGenders: body.targetGenders || null,
        targetInterests: body.targetInterests || null,
        targetPlatforms: body.targetPlatforms || ["facebook", "instagram"],
        headline: body.headline || null,
        primaryText: body.primaryText || null,
        description: body.description || null,
        callToAction: body.callToAction || "LEARN_MORE",
        imageUrl: body.imageUrl || null,
        linkUrl: body.linkUrl || null,
        propertyId: body.propertyId || null,
      },
      include: {
        property: { select: { id: true, title: true } },
      },
    });

    return NextResponse.json({ campaign }, { status: 201 });
  } catch (error) {
    console.error("[campaigns] POST error:", error);
    return NextResponse.json({ error: "Error creando campaña" }, { status: 500 });
  }
}
