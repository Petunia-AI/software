import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET    /api/campaigns/google/[id] — get Google campaign detail
 * PATCH  /api/campaigns/google/[id] — update draft Google campaign
 * DELETE /api/campaigns/google/[id] — delete a draft Google campaign
 */

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
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

    const campaign = await prisma.googleCampaign.findFirst({
      where: { id, organizationId },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            images: true,
            city: true,
            state: true,
            price: true,
            currency: true,
          },
        },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaña no encontrada" }, { status: 404 });
    }

    return NextResponse.json({ campaign });
  } catch (error) {
    console.error("[campaigns/google/id] GET error:", error);
    return NextResponse.json({ error: "Error obteniendo campaña" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
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
    const body = await req.json();

    const existing = await prisma.googleCampaign.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Campaña no encontrada" }, { status: 404 });
    }

    if (!["DRAFT", "ERROR", "PENDING_APPROVAL"].includes(existing.status)) {
      return NextResponse.json(
        { error: "Solo se pueden editar campañas en borrador o pendiente de aprobación" },
        { status: 400 },
      );
    }

    const campaign = await prisma.googleCampaign.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.objective !== undefined && { objective: body.objective }),
        ...(body.dailyBudget !== undefined && { dailyBudget: body.dailyBudget }),
        ...(body.currency !== undefined && { currency: body.currency }),
        ...(body.startDate !== undefined && { startDate: body.startDate ? new Date(body.startDate) : null }),
        ...(body.endDate !== undefined && { endDate: body.endDate ? new Date(body.endDate) : null }),
        ...(body.targetLocations !== undefined && { targetLocations: body.targetLocations }),
        ...(body.targetAgeMin !== undefined && { targetAgeMin: body.targetAgeMin }),
        ...(body.targetAgeMax !== undefined && { targetAgeMax: body.targetAgeMax }),
        ...(body.targetGenders !== undefined && { targetGenders: body.targetGenders }),
        ...(body.targetKeywords !== undefined && { targetKeywords: body.targetKeywords }),
        ...(body.headlines !== undefined && { headlines: body.headlines }),
        ...(body.descriptions !== undefined && { descriptions: body.descriptions }),
        ...(body.finalUrl !== undefined && { finalUrl: body.finalUrl }),
        ...(body.displayUrl !== undefined && { displayUrl: body.displayUrl }),
        ...(body.callToAction !== undefined && { callToAction: body.callToAction }),
        ...(body.imageUrl !== undefined && { imageUrl: body.imageUrl }),
        ...(body.propertyId !== undefined && { propertyId: body.propertyId }),
      },
    });

    return NextResponse.json({ campaign });
  } catch (error) {
    console.error("[campaigns/google/id] PATCH error:", error);
    return NextResponse.json({ error: "Error actualizando campaña" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
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

    const existing = await prisma.googleCampaign.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Campaña no encontrada" }, { status: 404 });
    }

    if (!["DRAFT", "ERROR"].includes(existing.status)) {
      return NextResponse.json(
        { error: "Solo se pueden eliminar campañas en borrador" },
        { status: 400 },
      );
    }

    await prisma.googleCampaign.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[campaigns/google/id] DELETE error:", error);
    return NextResponse.json({ error: "Error eliminando campaña" }, { status: 500 });
  }
}
