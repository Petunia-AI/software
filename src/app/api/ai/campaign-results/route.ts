import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrganization } from "@/lib/auth-helpers";

// GET /api/ai/campaign-results — list campaign results for the org
export async function GET() {
  try {
    const user = await requireOrganization();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const results = await prisma.campaignResult.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        campaignName: true,
        campaignType: true,
        platform: true,
        period: true,
        headline: true,
        primaryText: true,
        impressions: true,
        clicks: true,
        leads: true,
        spent: true,
        ctr: true,
        cpl: true,
        whatWorked: true,
        whatDidntWork: true,
        propertyType: true,
        targetCity: true,
        createdAt: true,
      },
    });

    return NextResponse.json(results);
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
}

// POST /api/ai/campaign-results — save a campaign result
export async function POST(req: NextRequest) {
  try {
    const user = await requireOrganization();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const {
      campaignName,
      campaignType,
      platform,
      period,
      headline,
      primaryText,
      impressions,
      clicks,
      leads,
      spent,
      ctr,
      cpl,
      whatWorked,
      whatDidntWork,
      propertyType,
      targetCity,
    } = await req.json();

    if (!campaignName?.trim()) return NextResponse.json({ error: "El nombre de la campaña es requerido" }, { status: 400 });
    if (!campaignType?.trim()) return NextResponse.json({ error: "El tipo de campaña es requerido" }, { status: 400 });
    if (!platform?.trim()) return NextResponse.json({ error: "La plataforma es requerida" }, { status: 400 });

    const result = await prisma.campaignResult.create({
      data: {
        campaignName: campaignName.trim(),
        campaignType: campaignType.trim(),
        platform: platform.trim(),
        period: period?.trim() || null,
        headline: headline?.trim() || null,
        primaryText: primaryText?.trim() || null,
        impressions: impressions ? parseInt(impressions) : null,
        clicks: clicks ? parseInt(clicks) : null,
        leads: leads ? parseInt(leads) : null,
        spent: spent ? parseFloat(spent) : null,
        ctr: ctr ? parseFloat(ctr) : null,
        cpl: cpl ? parseFloat(cpl) : null,
        whatWorked: whatWorked?.trim() || null,
        whatDidntWork: whatDidntWork?.trim() || null,
        propertyType: propertyType?.trim() || null,
        targetCity: targetCity?.trim() || null,
        organizationId: user.organizationId,
        createdById: user.id,
      },
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err: any) {
    console.error("Error saving campaign result:", err);
    return NextResponse.json({ error: err?.message || "Error al guardar el resultado" }, { status: 500 });
  }
}

// DELETE /api/ai/campaign-results?id=xxx
export async function DELETE(req: NextRequest) {
  try {
    const user = await requireOrganization();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

    const existing = await prisma.campaignResult.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!existing) return NextResponse.json({ error: "Resultado no encontrado" }, { status: 404 });

    await prisma.campaignResult.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Error al eliminar" }, { status: 500 });
  }
}
