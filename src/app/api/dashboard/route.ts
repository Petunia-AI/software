import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrganization } from "@/lib/auth-helpers";

export async function GET() {
  try {
    const user = await requireOrganization();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const orgId = user.organizationId;

    const [
      propertiesCount,
      availableProperties,
      leadsCount,
      leadsByStatus,
      contentCount,
      scheduledContent,
      pendingFollowUps,
      recentLeads,
      upcomingContent,
    ] = await Promise.all([
      prisma.property.count({ where: { organizationId: orgId } }),
      prisma.property.count({ where: { organizationId: orgId, status: "AVAILABLE" } }),
      prisma.lead.count({ where: { organizationId: orgId } }),
      prisma.lead.groupBy({
        by: ["status"],
        where: { organizationId: orgId },
        _count: true,
      }),
      prisma.contentPost.count({ where: { organizationId: orgId } }),
      prisma.contentPost.count({
        where: { organizationId: orgId, status: "SCHEDULED" },
      }),
      prisma.followUpTask.count({
        where: { organizationId: orgId, completedAt: null },
      }),
      prisma.lead.findMany({
        where: { organizationId: orgId },
        include: {
          property: { select: { title: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.contentPost.findMany({
        where: {
          organizationId: orgId,
          status: { in: ["SCHEDULED", "DRAFT"] },
        },
        orderBy: { scheduledAt: "asc" },
        take: 4,
      }),
    ]);

    const pipeline = [
      { name: "Nuevos", status: "NEW", count: 0 },
      { name: "Contactados", status: "CONTACTED", count: 0 },
      { name: "Calificados", status: "QUALIFIED", count: 0 },
      { name: "Propuesta", status: "PROPOSAL", count: 0 },
      { name: "Negociación", status: "NEGOTIATION", count: 0 },
      { name: "Ganados", status: "WON", count: 0 },
    ];

    for (const group of leadsByStatus) {
      const stage = pipeline.find((s) => s.status === group.status);
      if (stage) stage.count = group._count;
    }

    const wonCount = pipeline.find((s) => s.status === "WON")?.count || 0;
    const totalLeads = leadsCount || 1;
    const conversionRate = ((wonCount / totalLeads) * 100).toFixed(1);

    return NextResponse.json({
      stats: {
        properties: availableProperties,
        totalProperties: propertiesCount,
        leads: leadsCount,
        content: scheduledContent,
        totalContent: contentCount,
        followUps: pendingFollowUps,
      },
      pipeline,
      conversionRate,
      recentLeads,
      upcomingContent,
    });
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
}
