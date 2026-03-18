import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const TOTAL_STEPS = 4

// ---------------------------------------------------------------------------
// GET /api/onboarding/status
// Returns whether the authenticated user needs onboarding
// ---------------------------------------------------------------------------
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "No autenticado. Inicia sesión para continuar." },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        organizationMembers: {
          take: 1,
        },
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: "Usuario no encontrado." },
        { status: 404 }
      )
    }

    const orgMember = user.organizationMembers[0]

    // No organization yet — definitely needs onboarding
    if (!orgMember) {
      return NextResponse.json({
        needsOnboarding: true,
        progress: 0,
        currentStep: 0,
      })
    }

    const onboarding = await prisma.onboardingProgress.findUnique({
      where: { organizationId: orgMember.organizationId },
    })

    // No progress record — needs onboarding
    if (!onboarding) {
      return NextResponse.json({
        needsOnboarding: true,
        progress: 0,
        currentStep: 0,
      })
    }

    const completedSteps = (onboarding.completedSteps as number[]) ?? []
    const progressPercent = Math.round(
      (completedSteps.length / TOTAL_STEPS) * 100
    )

    const isCompleted =
      onboarding.status === "COMPLETED" || onboarding.status === "SKIPPED"

    return NextResponse.json({
      needsOnboarding: !isCompleted,
      progress: progressPercent,
      currentStep: onboarding.currentStep,
    })
  } catch (error) {
    console.error("[ONBOARDING_STATUS]", error)
    return NextResponse.json(
      { error: "Error interno del servidor. Intenta de nuevo más tarde." },
      { status: 500 }
    )
  }
}
