import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCampaignInsights } from "@/lib/meta-ads";
import { audit } from "@/lib/audit";

/**
 * GET /api/cron/sync-metrics
 *
 * Syncs Meta Ads campaign metrics from the API into the DB.
 * Also saves top-performing campaigns to the CampaignResult knowledge base
 * so Petunia can learn from real data.
 *
 * Protected by CRON_SECRET env variable.
 * Can also be triggered manually from the admin panel.
 */
export async function GET(req: NextRequest) {
  // Auth: Vercel cron passes Authorization header OR allow super admin via query param
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const results = {
    orgs: 0,
    campaignsSynced: 0,
    knowledgeAdded: 0,
    errors: [] as string[],
  };

  try {
    // Get all orgs with Meta connected
    const orgs = await prisma.organization.findMany({
      where: {
        metaAccessToken: { not: null },
        metaAdAccountId: { not: null },
      },
      select: {
        id: true,
        name: true,
        metaAccessToken: true,
        metaAdAccountId: true,
      },
    });

    results.orgs = orgs.length;

    for (const org of orgs) {
      try {
        // Get all active/completed Meta campaigns with Meta IDs
        const campaigns = await prisma.metaCampaign.findMany({
          where: {
            organizationId: org.id,
            metaCampaignId: { not: null },
            status: { in: ["ACTIVE", "COMPLETED", "PAUSED"] },
          },
          select: {
            id: true,
            metaCampaignId: true,
            name: true,
            headline: true,
            primaryText: true,
            targetLocations: true,
            property: { select: { propertyType: true, city: true } },
          },
          take: 20,
        });

        for (const campaign of campaigns) {
          try {
            const insights = await getCampaignInsights(
              campaign.metaCampaignId!,
              org.metaAccessToken!,
              "last_30d"
            );

            if (insights.length === 0) continue;

            const insight = insights[0];
            const impressions = parseInt(insight.impressions || "0");
            const clicks = parseInt(insight.clicks || "0");
            const spend = parseFloat(insight.spend || "0");
            const ctr = parseFloat(insight.ctr || "0");

            // Count leads from actions
            const leads =
              insight.actions?.find(
                (a: any) => a.action_type === "lead" || a.action_type === "onsite_conversion.lead_grouped"
              )?.value ?? 0;
            const leadsInt = parseInt(String(leads));
            const cpl = leadsInt > 0 ? spend / leadsInt : null;

            // Update MetaCampaign with fresh metrics
            await prisma.metaCampaign.update({
              where: { id: campaign.id },
              data: {
                impressions,
                clicks,
                leads: leadsInt,
                spent: spend,
                ctr: ctr / 100, // convert percentage to decimal
                cpl: cpl,
                lastSyncAt: new Date(),
              },
            });

            results.campaignsSynced++;

            // Save good performers (CTR > 1% or CPL < $20) to knowledge base
            const isGoodPerformer = ctr > 1 || (cpl !== null && cpl < 20);
            if (isGoodPerformer && leadsInt > 0) {
              const existingEntry = await prisma.campaignResult.findFirst({
                where: {
                  organizationId: org.id,
                  campaignName: campaign.name,
                },
              });

              if (!existingEntry) {
                await prisma.campaignResult.create({
                  data: {
                    organizationId: org.id,
                    createdById: (await prisma.organizationMember.findFirst({
                      where: { organizationId: org.id },
                      orderBy: { createdAt: "asc" },
                    }))!.userId,
                    campaignName: campaign.name,
                    campaignType: "meta",
                    platform: "Instagram/Facebook",
                    period: new Date().toLocaleDateString("es-MX", { month: "long", year: "numeric" }),
                    headline: campaign.headline,
                    primaryText: campaign.primaryText,
                    impressions,
                    clicks,
                    leads: leadsInt,
                    spent: spend,
                    ctr: ctr / 100,
                    cpl,
                    propertyType: campaign.property?.propertyType ?? null,
                    targetCity: campaign.property?.city ?? null,
                    whatWorked: `CTR: ${ctr.toFixed(2)}% | ${leadsInt} leads | CPL: $${cpl?.toFixed(2) ?? "N/A"}`,
                  },
                });
                results.knowledgeAdded++;
              }
            }
          } catch (err: any) {
            results.errors.push(`Campaign ${campaign.id}: ${err.message}`);
          }
        }

        await audit.metricsSynced({
          organizationId: org.id,
          campaigns: campaigns.length,
          platform: "meta",
        });
      } catch (err: any) {
        results.errors.push(`Org ${org.id}: ${err.message}`);
      }
    }

    return NextResponse.json({
      ok: true,
      ...results,
      syncedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

// Allow POST for manual trigger from admin
export async function POST(req: NextRequest) {
  return GET(req);
}
