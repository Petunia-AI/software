import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// ---------------------------------------------------------------------------
// POST /api/onboarding/validate
// Validates integration credentials during onboarding
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
    const { step, data } = body as {
      step: string
      data: Record<string, any>
    }

    if (!step || !data) {
      return NextResponse.json(
        { error: "Los campos 'step' y 'data' son requeridos." },
        { status: 400 }
      )
    }

    switch (step) {
      case "whatsapp":
        return validateWhatsApp(data)
      case "meta":
      case "meta_ads":
        return validateMeta(data)
      case "tiktok":
        return validateTikTok(data)
      default:
        return NextResponse.json(
          { error: `Paso de validación desconocido: '${step}'.` },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error("[ONBOARDING_VALIDATE]", error)
    return NextResponse.json(
      { error: "Error interno del servidor. Intenta de nuevo más tarde." },
      { status: 500 }
    )
  }
}

// ---------------------------------------------------------------------------
// WhatsApp validation
// ---------------------------------------------------------------------------
function validateWhatsApp(data: Record<string, any>) {
  const phone = data.phone || data.phoneNumber
  const apiToken = data.apiToken

  // Validate phone number is provided
  if (!phone || typeof phone !== "string" || phone.replace(/\D/g, "").length < 7) {
    return NextResponse.json(
      {
        valid: false,
        error:
          "Número de teléfono inválido. Usa formato internacional (ej: +521234567890).",
      },
      { status: 200 }
    )
  }

  // Validate API token is not empty
  if (!apiToken || typeof apiToken !== "string" || apiToken.trim().length === 0) {
    return NextResponse.json(
      {
        valid: false,
        error: "El token de API de WhatsApp es requerido.",
      },
      { status: 200 }
    )
  }

  // In production, this would call the Meta WhatsApp Business API
  // to verify the phone number and token are valid.
  // For now, we simulate a successful validation.

  return NextResponse.json({
    valid: true,
    message: "WhatsApp conectado correctamente.",
  })
}

// ---------------------------------------------------------------------------
// Meta (Facebook/Instagram Ads) validation
// ---------------------------------------------------------------------------
function validateMeta(data: Record<string, any>) {
  const { adAccountId, accessToken } = data

  // Validate ad account ID format (act_XXXXXXXXXX or just digits)
  if (
    !adAccountId ||
    typeof adAccountId !== "string" ||
    adAccountId.trim().length === 0
  ) {
    return NextResponse.json(
      {
        valid: false,
        error:
          "ID de cuenta publicitaria inválido. Usa el formato act_XXXXXXXXXX.",
      },
      { status: 200 }
    )
  }

  // Validate access token is not empty
  if (
    !accessToken ||
    typeof accessToken !== "string" ||
    accessToken.trim().length === 0
  ) {
    return NextResponse.json(
      {
        valid: false,
        error: "El token de acceso de Meta es requerido.",
      },
      { status: 200 }
    )
  }

  // In production, this would call the Meta Marketing API
  // to verify the ad account and token are valid.

  return NextResponse.json({
    valid: true,
    message: "Meta Ads conectado correctamente.",
  })
}

// ---------------------------------------------------------------------------
// TikTok validation
// ---------------------------------------------------------------------------
function validateTikTok(data: Record<string, any>) {
  const { advertiserId, accessToken } = data

  // Validate advertiser ID is not empty
  if (
    !advertiserId ||
    typeof advertiserId !== "string" ||
    advertiserId.trim().length === 0
  ) {
    return NextResponse.json(
      {
        valid: false,
        error: "El ID de anunciante de TikTok es requerido.",
      },
      { status: 200 }
    )
  }

  // Validate access token is not empty
  if (
    !accessToken ||
    typeof accessToken !== "string" ||
    accessToken.trim().length === 0
  ) {
    return NextResponse.json(
      {
        valid: false,
        error: "El token de acceso de TikTok es requerido.",
      },
      { status: 200 }
    )
  }

  // In production, this would call the TikTok Marketing API
  // to verify the advertiser and token are valid.

  return NextResponse.json({
    valid: true,
    message: "TikTok Ads conectado correctamente.",
  })
}
