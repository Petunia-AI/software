import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrganization, unauthorized } from "@/lib/auth-helpers";

// ---------------------------------------------------------------------------
// GET /api/ai/usage — Get AI usage and credits for current organization
// ---------------------------------------------------------------------------
export async function GET() {
  try {
    const user = await requireOrganization();
    if (!user) return unauthorized();

    const org = await prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: {
        aiCreditsLimit: true,
        aiCreditsUsed: true,
        aiCreditsResetAt: true,
        plan: true,
      },
    });

    if (!org) {
      return NextResponse.json({ error: "Organización no encontrada" }, { status: 404 });
    }

    // Auto-reset if new month
    const now = new Date();
    const resetAt = org.aiCreditsResetAt;
    let creditsUsed = org.aiCreditsUsed;
    if (!resetAt || now.getMonth() !== resetAt.getMonth() || now.getFullYear() !== resetAt.getFullYear()) {
      await prisma.organization.update({
        where: { id: user.organizationId },
        data: { aiCreditsUsed: 0, aiCreditsResetAt: now },
      });
      creditsUsed = 0;
    }

    // Usage breakdown for current month
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const usageByType = await prisma.aIUsageLog.groupBy({
      by: ["type"],
      where: {
        organizationId: user.organizationId,
        createdAt: { gte: monthStart },
      },
      _sum: { creditsUsed: true },
      _count: { id: true },
    });

    // Recent usage (last 10)
    const recentUsage = await prisma.aIUsageLog.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        type: true,
        creditsUsed: true,
        provider: true,
        endpoint: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      credits: {
        used: creditsUsed,
        limit: org.aiCreditsLimit,
        remaining: org.aiCreditsLimit === -1 ? -1 : org.aiCreditsLimit - creditsUsed,
        resetAt: org.aiCreditsResetAt,
        plan: org.plan,
      },
      usageByType: usageByType.map((u) => ({
        type: u.type,
        calls: u._count.id,
        credits: u._sum.creditsUsed ?? 0,
      })),
      recentUsage,
    });
  } catch (error) {
    console.error("[AI_USAGE_GET]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
