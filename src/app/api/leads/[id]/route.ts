import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrganization } from "@/lib/auth-helpers";
import { calculateLeadScore } from "@/lib/lead-scoring";
import { audit } from "@/lib/audit";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireOrganization();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const { id } = await params;
    const data = await req.json();

    // Fetch current lead to re-score
    const existing = await prisma.lead.findFirst({
      where: { id, organizationId: user.organizationId },
      include: { _count: { select: { activities: true } } },
    });

    if (!existing) return NextResponse.json({ error: "Lead no encontrado" }, { status: 404 });

    // Re-calculate score with updated data
    const scoreResult = calculateLeadScore({
      source: data.source ?? existing.source,
      status: data.status ?? existing.status,
      email: data.email ?? existing.email,
      phone: data.phone ?? existing.phone,
      notes: data.notes ?? existing.notes,
      propertyId: data.propertyId ?? existing.propertyId,
      activityCount: existing._count.activities,
    });

    const lead = await prisma.lead.update({
      where: { id },
      data: {
        ...data,
        score: scoreResult.score,
        scoreDetails: scoreResult.details,
        scoreUpdatedAt: new Date(),
      },
    });

    // Audit status change specifically
    if (data.status && data.status !== existing.status) {
      await audit.leadStatusChanged({
        organizationId: user.organizationId,
        userId: user.id,
        leadId: id,
        from: existing.status,
        to: data.status,
      });
    } else {
      await audit.leadUpdated({
        organizationId: user.organizationId,
        userId: user.id,
        leadId: id,
        changes: data,
      });
    }

    return NextResponse.json(lead);
  } catch {
    return NextResponse.json({ error: "Error al actualizar" }, { status: 500 });
  }
}
