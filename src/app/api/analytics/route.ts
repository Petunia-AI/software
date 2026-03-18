import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const orgId = (session.user as any).organizationId as string | undefined;
  if (!orgId) return NextResponse.json({ error: "Sin organización" }, { status: 400 });

  const [
    leadsByStatus,
    leadsBySource,
    avgScore,
    totalLeads,
    metaCampaigns,
    landingPages,
  ] = await Promise.all([
    // Leads grouped by status
    prisma.lead.groupBy({
      by: ["status"],
      where: { organizationId: orgId },
      _count: { _all: true },
    }),

    // Leads grouped by source
    prisma.lead.groupBy({
      by: ["source"],
      where: { organizationId: orgId },
      _count: { _all: true },
    }),

    // Average lead score
    prisma.lead.aggregate({
      where: { organizationId: orgId },
      _avg: { score: true },
      _max: { score: true },
    }),

    // Total leads
    prisma.lead.count({ where: { organizationId: orgId } }),

    // Meta campaigns with metrics
    prisma.metaCampaign.findMany({
      where: {
        organizationId: orgId,
        status: { in: ["ACTIVE", "COMPLETED", "PAUSED"] },
      },
      select: {
        id: true,
        name: true,
        status: true,
        impressions: true,
        clicks: true,
        leads: true,
        spent: true,
        ctr: true,
        cpl: true,
        lastSyncAt: true,
        startDate: true,
        endDate: true,
      },
      orderBy: { leads: "desc" },
      take: 10,
    }),

    // Landing pages performance
    prisma.landingPage.findMany({
      where: { organizationId: orgId },
      select: {
        id: true,
        title: true,
        template: true,
        status: true,
        views: true,
        leads: true,
        conversionRate: true,
      },
      orderBy: { leads: "desc" },
      take: 5,
    }),
  ]);

  // Pipeline funnel conversion rates
  const statusOrder = ["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON"];
  const pipeline = statusOrder.map((s) => ({
    status: s,
    count: leadsByStatus.find((r) => r.status === s)?._count._all ?? 0,
  }));

  // Source breakdown
  const sources = leadsBySource.map((r) => ({
    source: r.source,
    count: r._count._all,
    pct: totalLeads > 0 ? Math.round((r._count._all / totalLeads) * 100) : 0,
  })).sort((a, b) => b.count - a.count);

  // Meta totals
  const metaTotals = metaCampaigns.reduce(
    (acc, c) => ({
      impressions: acc.impressions + (c.impressions ?? 0),
      clicks: acc.clicks + (c.clicks ?? 0),
      leads: acc.leads + (c.leads ?? 0),
      spent: acc.spent + Number(c.spent ?? 0),
    }),
    { impressions: 0, clicks: 0, leads: 0, spent: 0 }
  );

  const avgCpl =
    metaTotals.leads > 0 ? metaTotals.spent / metaTotals.leads : null;

  return NextResponse.json({
    overview: {
      totalLeads,
      wonLeads: leadsByStatus.find((r) => r.status === "WON")?._count._all ?? 0,
      lostLeads: leadsByStatus.find((r) => r.status === "LOST")?._count._all ?? 0,
      avgScore: Math.round(avgScore._avg.score ?? 0),
      maxScore: avgScore._max.score ?? 0,
    },
    pipeline,
    sources,
    meta: {
      totals: metaTotals,
      avgCpl,
      campaigns: metaCampaigns.map((c) => ({
        ...c,
        spent: Number(c.spent ?? 0),
        ctr: Number(c.ctr ?? 0),
        cpl: Number(c.cpl ?? 0),
      })),
    },
    landingPages,
  });
}
