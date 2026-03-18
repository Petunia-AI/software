import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET  /api/campaigns/google — list Google campaigns for the organization
 * POST /api/campaigns/google — create a new draft Google campaign
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

    const campaigns = await prisma.googleCampaign.findMany({
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
    console.error("[campaigns/google] GET error:", error);
    return NextResponse.json({ error: "Error listando campañas de Google" }, { status: 500 });
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

    const campaign = await prisma.googleCampaign.create({
      data: {
        organizationId,
        createdById: userId,
        name: body.name || "Nueva Campaña Google",
        objective: body.objective || "LEAD_GENERATION",
        status: "DRAFT",
        dailyBudget: body.dailyBudget || null,
        currency: body.currency || "USD",
        startDate: body.startDate ? new Date(body.startDate) : null,
        endDate: body.endDate ? new Date(body.endDate) : null,
        targetLocations: body.targetLocations || null,
        targetAgeMin: body.targetAgeMin ?? 25,
        targetAgeMax: body.targetAgeMax ?? 65,
        targetGenders: body.targetGenders || null,
        targetKeywords: body.targetKeywords || null,
        headlines: body.headlines || null,
        descriptions: body.descriptions || null,
        finalUrl: body.finalUrl || null,
        displayUrl: body.displayUrl || null,
        callToAction: body.callToAction || "LEARN_MORE",
        imageUrl: body.imageUrl || null,
        propertyId: body.propertyId || null,
      },
      include: {
        property: { select: { id: true, title: true } },
      },
    });

    return NextResponse.json({ campaign }, { status: 201 });
  } catch (error) {
    console.error("[campaigns/google] POST error:", error);
    return NextResponse.json({ error: "Error creando campaña de Google" }, { status: 500 });
  }
}
