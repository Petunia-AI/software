import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, unauthorized } from "@/lib/auth-helpers";

// ---------------------------------------------------------------------------
// GET /api/admin/ai-settings — Get platform AI config
// ---------------------------------------------------------------------------
export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) return unauthorized();

    const config = await prisma.platformAIConfig.findFirst({
      where: { isActive: true },
    });

    // Get usage summary across all organizations (current month)
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const usageSummary = await prisma.aIUsageLog.groupBy({
      by: ["type"],
      where: { createdAt: { gte: monthStart } },
      _sum: { creditsUsed: true, tokensInput: true, tokensOutput: true },
      _count: { id: true },
    });

    const totalUsage = await prisma.aIUsageLog.aggregate({
      where: { createdAt: { gte: monthStart } },
      _sum: { creditsUsed: true, tokensInput: true, tokensOutput: true },
      _count: { id: true },
    });

    // Top organizations by usage
    const topOrgs = await prisma.aIUsageLog.groupBy({
      by: ["organizationId"],
      where: { createdAt: { gte: monthStart } },
      _sum: { creditsUsed: true },
      _count: { id: true },
      orderBy: { _sum: { creditsUsed: "desc" } },
      take: 10,
    });

    // Fetch org names for top orgs
    const orgIds = topOrgs.map((o) => o.organizationId);
    const orgs = await prisma.organization.findMany({
      where: { id: { in: orgIds } },
      select: { id: true, name: true, plan: true, aiCreditsLimit: true, aiCreditsUsed: true },
    });

    const topOrgsWithNames = topOrgs.map((o) => {
      const org = orgs.find((org) => org.id === o.organizationId);
      return {
        organizationId: o.organizationId,
        name: org?.name ?? "Desconocido",
        plan: org?.plan ?? "trial",
        creditsUsed: o._sum.creditsUsed ?? 0,
        creditsLimit: org?.aiCreditsLimit ?? 0,
        calls: o._count.id,
      };
    });

    return NextResponse.json({
      config: config
        ? {
            id: config.id,
            provider: config.provider,
            model: config.model,
            hasApiKey: !!config.apiKey,
            hasHeygenKey: !!config.heygenApiKey,
            isActive: config.isActive,
          }
        : null,
      usage: {
        month: monthStart.toISOString(),
        totalCalls: totalUsage._count.id,
        totalCredits: totalUsage._sum.creditsUsed ?? 0,
        totalTokensInput: totalUsage._sum.tokensInput ?? 0,
        totalTokensOutput: totalUsage._sum.tokensOutput ?? 0,
        byType: usageSummary.map((u) => ({
          type: u.type,
          calls: u._count.id,
          credits: u._sum.creditsUsed ?? 0,
        })),
        topOrganizations: topOrgsWithNames,
      },
    });
  } catch (error) {
    console.error("[ADMIN_AI_SETTINGS_GET]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST /api/admin/ai-settings — Save platform AI config
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) return unauthorized();

    const { provider, apiKey, model, heygenApiKey } = await req.json();

    if (!provider || !apiKey) {
      return NextResponse.json(
        { error: "Provider y API key son requeridos" },
        { status: 400 }
      );
    }

    // Check if there's an existing active config to update
    const existing = await prisma.platformAIConfig.findFirst({
      where: { isActive: true },
    });

    let config;
    if (existing) {
      // Update existing config (keep existing apiKey if sentinel value)
      config = await prisma.platformAIConfig.update({
        where: { id: existing.id },
        data: {
          provider: provider.toUpperCase(),
          apiKey: apiKey === "__keep_existing__" ? existing.apiKey : apiKey,
          model: model || null,
          heygenApiKey: heygenApiKey || existing.heygenApiKey,
        },
      });
    } else {
      // Create new config
      config = await prisma.platformAIConfig.create({
        data: {
          provider: provider.toUpperCase(),
          apiKey,
          model: model || null,
          heygenApiKey: heygenApiKey || null,
          isActive: true,
        },
      });
    }

    return NextResponse.json({
      id: config.id,
      provider: config.provider,
      model: config.model,
      hasApiKey: true,
      hasHeygenKey: !!config.heygenApiKey,
      isActive: true,
      message: "Configuración de IA de plataforma guardada correctamente",
    });
  } catch (error) {
    console.error("[ADMIN_AI_SETTINGS_POST]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
