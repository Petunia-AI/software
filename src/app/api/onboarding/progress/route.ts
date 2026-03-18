import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// ---------------------------------------------------------------------------
// GET /api/onboarding/progress
// Returns the current onboarding progress for the authenticated user
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
          include: { organization: true },
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
    if (!orgMember) {
      return NextResponse.json({
        status: "NOT_STARTED",
        currentStep: 0,
        completedSteps: [],
        data: {
          whatsappConnected: false,
          metaConnected: false,
          tiktokConnected: false,
          pipelineConfigured: false,
        },
      })
    }

    const progress = await prisma.onboardingProgress.findUnique({
      where: { organizationId: orgMember.organizationId },
    })

    if (!progress) {
      return NextResponse.json({
        status: "NOT_STARTED",
        currentStep: 0,
        completedSteps: [],
        data: {
          whatsappConnected: false,
          metaConnected: false,
          tiktokConnected: false,
          pipelineConfigured: false,
        },
      })
    }

    return NextResponse.json({
      status: progress.status,
      currentStep: progress.currentStep,
      completedSteps: progress.completedSteps as number[],
      data: {
        businessName: progress.businessName,
        businessType: progress.businessType,
        markets: progress.markets as string[] | undefined,
        buyerBudget: progress.buyerBudget,
        whatsappConnected: progress.whatsappConnected,
        metaConnected: progress.metaConnected,
        tiktokConnected: progress.tiktokConnected,
        pipelineConfigured: progress.pipelineConfigured,
      },
    })
  } catch (error) {
    console.error("[ONBOARDING_PROGRESS_GET]", error)
    return NextResponse.json(
      { error: "Error interno del servidor. Intenta de nuevo más tarde." },
      { status: 500 }
    )
  }
}

// ---------------------------------------------------------------------------
// POST /api/onboarding/progress
// Updates onboarding progress for the authenticated user
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "No autenticado. Inicia sesión para continuar." },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { step, data, completed } = body as {
      step: number
      data: Record<string, any>
      completed?: boolean
    }

    if (step === undefined || step < 0 || step > 3) {
      return NextResponse.json(
        { error: "Paso inválido. Debe ser un número entre 0 y 3." },
        { status: 400 }
      )
    }

    if (!data || typeof data !== "object") {
      return NextResponse.json(
        { error: "Los datos del paso son requeridos." },
        { status: 400 }
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
    if (!orgMember) {
      return NextResponse.json(
        { error: "No perteneces a ninguna organización." },
        { status: 400 }
      )
    }

    // Build step-specific fields
    const stepFields = mapStepToFields(step, data)

    // Get existing progress to merge completedSteps
    const existing = await prisma.onboardingProgress.findUnique({
      where: { organizationId: orgMember.organizationId },
    })

    const existingCompletedSteps = (existing?.completedSteps as number[]) ?? []
    let completedSteps = [...existingCompletedSteps]

    if (completed && !completedSteps.includes(step)) {
      completedSteps.push(step)
      completedSteps.sort((a, b) => a - b)
    }

    // Determine next currentStep
    const nextStep = completed ? Math.min(step + 1, 3) : step

    // Check if all 4 steps are completed
    const allCompleted = [0, 1, 2, 3].every((s) => completedSteps.includes(s))

    const progress = await prisma.onboardingProgress.upsert({
      where: { organizationId: orgMember.organizationId },
      create: {
        userId: user.id,
        organizationId: orgMember.organizationId,
        status: allCompleted ? "COMPLETED" : "IN_PROGRESS",
        currentStep: allCompleted ? 3 : nextStep,
        completedSteps: completedSteps,
        completedAt: allCompleted ? new Date() : null,
        ...stepFields,
      },
      update: {
        status: allCompleted ? "COMPLETED" : "IN_PROGRESS",
        currentStep: allCompleted ? 3 : nextStep,
        completedSteps: completedSteps,
        completedAt: allCompleted ? new Date() : undefined,
        ...stepFields,
      },
    })

    return NextResponse.json({
      status: progress.status,
      currentStep: progress.currentStep,
      completedSteps: progress.completedSteps as number[],
      data: {
        businessName: progress.businessName,
        businessType: progress.businessType,
        markets: progress.markets as string[] | undefined,
        buyerBudget: progress.buyerBudget,
        whatsappConnected: progress.whatsappConnected,
        metaConnected: progress.metaConnected,
        tiktokConnected: progress.tiktokConnected,
        pipelineConfigured: progress.pipelineConfigured,
      },
    })
  } catch (error) {
    console.error("[ONBOARDING_PROGRESS_POST]", error)
    return NextResponse.json(
      { error: "Error interno del servidor. Intenta de nuevo más tarde." },
      { status: 500 }
    )
  }
}

// ---------------------------------------------------------------------------
// Helper: map step number to Prisma fields
// ---------------------------------------------------------------------------
function mapStepToFields(step: number, data: Record<string, any>) {
  switch (step) {
    case 0:
      return {
        businessName: data.businessName as string | undefined,
        businessType: data.businessType as string | undefined,
        markets: data.markets ?? undefined,
        buyerBudget: data.buyerBudget as string | undefined,
      }
    case 1:
      return {
        whatsappConnected: Boolean(data.whatsappConnected),
        whatsappPhone: data.whatsappPhone as string | undefined,
      }
    case 2:
      return {
        metaConnected: Boolean(data.metaConnected),
        metaAdAccountId: data.metaAdAccountId as string | undefined,
        tiktokConnected: Boolean(data.tiktokConnected),
      }
    case 3:
      return {
        pipelineConfigured: Boolean(data.pipelineConfigured),
        pipelineStages: data.pipelineStages ?? undefined,
      }
    default:
      return {}
  }
}
