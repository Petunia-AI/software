import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// GET /api/assistant/context
// ---------------------------------------------------------------------------

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const userId = (session.user as any).id as string;
    const organizationId = (session.user as any).organizationId as
      | string
      | null;

    if (!organizationId) {
      return NextResponse.json(
        { error: "Usuario sin organización" },
        { status: 400 },
      );
    }

    const [
      leadsCount,
      propertiesCount,
      pendingFollowUps,
      staleLeads,
      onboarding,
      org,
    ] = await Promise.all([
      prisma.lead.count({ where: { organizationId } }),
      prisma.property.count({ where: { organizationId } }),
      prisma.followUpTask.count({
        where: {
          organizationId,
          completedAt: null,
          scheduledAt: { lte: new Date() },
        },
      }),
      prisma.lead.count({
        where: {
          organizationId,
          status: "NEW",
          createdAt: {
            lte: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          },
          activities: { none: {} },
        },
      }),
      prisma.onboardingProgress.findFirst({
        where: { organizationId },
      }),
      prisma.organization.findUnique({
        where: { id: organizationId },
      }),
    ]);

    // Connected integrations
    const integrationsConnected: string[] = [];
    if (onboarding?.whatsappConnected) integrationsConnected.push("WhatsApp");
    if (onboarding?.metaConnected) integrationsConnected.push("Meta Ads");
    if (onboarding?.tiktokConnected) integrationsConnected.push("TikTok");

    // Recent issues
    const recentIssues: string[] = [];
    if (staleLeads > 0) {
      recentIssues.push(
        `${staleLeads} lead(s) sin seguimiento por más de 3 días`,
      );
    }
    if (pendingFollowUps > 0) {
      recentIssues.push(
        `${pendingFollowUps} seguimiento(s) pendiente(s) vencido(s)`,
      );
    }

    // Onboarding progress
    let onboardingProgress = 0;
    if (onboarding) {
      const completedSteps = Array.isArray(onboarding.completedSteps)
        ? (onboarding.completedSteps as unknown[]).length
        : 0;
      onboardingProgress = Math.round((completedSteps / 4) * 100);
      if (onboarding.status === "COMPLETED") onboardingProgress = 100;
    }

    return NextResponse.json({
      userName: session.user.name ?? "",
      organizationName: org?.name ?? "",
      onboardingProgress,
      leadsCount,
      propertiesCount,
      pendingFollowUps,
      integrationsConnected,
      recentIssues,
    });
  } catch (error) {
    console.error("[assistant/context] Error:", error);
    return NextResponse.json(
      { error: "Error al obtener contexto del asistente" },
      { status: 500 },
    );
  }
}
