import { NextRequest, NextResponse } from "next/server";
import { requireOrganization, unauthorized } from "@/lib/auth-helpers";
import { getPlatformHeygenKey, checkAndConsumeCredits, logAIUsage } from "@/lib/ai";
import { prisma } from "@/lib/prisma";
import { generateVideo } from "@/lib/heygen";

const VIDEO_CREDITS = 10;

/**
 * POST /api/ai/heygen/generate-video
 * Generates a video using a saved HeyGen avatar.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireOrganization();
    if (!user) return unauthorized();

    let apiKey = await getPlatformHeygenKey();
    if (!apiKey) apiKey = process.env.HEYGEN_API_KEY ?? null;

    if (!apiKey) {
      return NextResponse.json(
        { error: "HeyGen no está configurado. Contacta al administrador." },
        { status: 503 }
      );
    }

    const { avatarId, voiceId, script, title } = await req.json();

    if (!avatarId || !voiceId || !script) {
      return NextResponse.json(
        { error: "Se requiere avatarId, voiceId y script." },
        { status: 400 }
      );
    }

    // Verify the avatar belongs to this organization and is ready
    const avatar = await prisma.heyGenAvatar.findFirst({
      where: {
        id: avatarId,
        organizationId: user.organizationId,
        status: "READY",
      },
    });

    if (!avatar || !avatar.heygenAvatarId) {
      return NextResponse.json(
        { error: "Avatar no encontrado o aún no está listo." },
        { status: 404 }
      );
    }

    // Check credits
    const credits = await checkAndConsumeCredits(user.organizationId, VIDEO_CREDITS);
    if (!credits.allowed) {
      return NextResponse.json(
        {
          error: `No tienes suficientes créditos (necesitas ${VIDEO_CREDITS}). Te quedan ${credits.remaining} de ${credits.limit}.`,
          creditsRemaining: credits.remaining,
          creditsLimit: credits.limit,
        },
        { status: 429 }
      );
    }

    const result = await generateVideo(apiKey, {
      avatar_id: avatar.heygenAvatarId,
      voice_id: voiceId,
      script,
      title: title || `Video - ${avatar.name}`,
    });

    // Log usage
    await logAIUsage({
      organizationId: user.organizationId,
      userId: user.id,
      type: "VIDEO_SCRIPT",
      creditsUsed: VIDEO_CREDITS,
      provider: "openai",
      model: "heygen-video",
      endpoint: "/api/ai/heygen/generate-video",
    });

    return NextResponse.json({
      videoId: result.video_id,
      status: "processing",
      creditsRemaining: credits.remaining,
    });
  } catch (error: any) {
    console.error("HeyGen generate-video error:", error);
    return NextResponse.json(
      { error: error?.message || "Error al generar el video" },
      { status: 500 }
    );
  }
}
