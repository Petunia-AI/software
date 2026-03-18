import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrganization } from "@/lib/auth-helpers";
import { calculateLeadScore } from "@/lib/lead-scoring";
import { audit } from "@/lib/audit";

export async function GET() {
  try {
    const user = await requireOrganization();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const leads = await prisma.lead.findMany({
      where: { organizationId: user.organizationId },
      include: {
        property: { select: { title: true } },
        assignedTo: { select: { name: true } },
        _count: { select: { activities: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(leads);
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireOrganization();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const data = await req.json();

    // Calculate initial score
    const scoreResult = calculateLeadScore({
      source: data.source ?? "OTHER",
      status: "NEW",
      email: data.email,
      phone: data.phone,
      notes: data.notes,
      propertyId: data.propertyId,
    });

    const lead = await prisma.lead.create({
      data: {
        ...data,
        organizationId: user.organizationId,
        score: scoreResult.score,
        scoreDetails: scoreResult.details,
        scoreUpdatedAt: new Date(),
      },
    });

    await audit.leadCreated({
      organizationId: user.organizationId,
      userId: user.id,
      leadId: lead.id,
      leadName: lead.name,
      source: lead.source,
      score: scoreResult.score,
    });

    return NextResponse.json(lead, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Error al crear lead" }, { status: 500 });
  }
}
