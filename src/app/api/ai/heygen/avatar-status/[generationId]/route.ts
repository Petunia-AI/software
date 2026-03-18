import { NextRequest, NextResponse } from "next/server";
import { requireOrganization, unauthorized } from "@/lib/auth-helpers";
import { getPlatformHeygenKey } from "@/lib/ai";
import { prisma } from "@/lib/prisma";
import { getGenerationStatus } from "@/lib/heygen";

/**
 * GET /api/ai/heygen/avatar-status/[generationId]
 * Polls HeyGen for the generation status and updates the local DB record.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ generationId: string }> }
) {
  try {
    const user = await requireOrganization();
    if (!user) return unauthorized();
    const { generationId } = await params;

    // Resolve HeyGen API key
    let apiKey = await getPlatformHeygenKey();
    if (!apiKey) apiKey = process.env.HEYGEN_API_KEY ?? null;

    if (!apiKey) {
      return NextResponse.json(
        { error: "HeyGen no está configurado." },
        { status: 503 }
      );
    }

    // Find the local record
    const avatar = await prisma.heyGenAvatar.findFirst({
      where: {
        generationId,
        organizationId: user.organizationId,
      },
    });

    if (!avatar) {
      return NextResponse.json({ error: "Avatar no encontrado" }, { status: 404 });
    }

    // If already completed/failed, return cached status
    if (avatar.status === "READY" || avatar.status === "FAILED") {
      return NextResponse.json({
        id: avatar.id,
        status: avatar.status,
        heygenAvatarId: avatar.heygenAvatarId,
        previewImageUrl: avatar.previewImageUrl,
        previewVideoUrl: avatar.previewVideoUrl,
      });
    }

    // Poll HeyGen
    const heygenStatus = await getGenerationStatus(apiKey, generationId);

    // Update local DB based on HeyGen status
    if (heygenStatus.status === "completed") {
      await prisma.heyGenAvatar.update({
        where: { id: avatar.id },
        data: {
          status: "READY",
          heygenAvatarId: heygenStatus.avatar_id || null,
          previewImageUrl: heygenStatus.image_url || null,
        },
      });

      return NextResponse.json({
        id: avatar.id,
        status: "READY",
        heygenAvatarId: heygenStatus.avatar_id,
        previewImageUrl: heygenStatus.image_url,
      });
    }

    if (heygenStatus.status === "failed") {
      await prisma.heyGenAvatar.update({
        where: { id: avatar.id },
        data: { status: "FAILED" },
      });

      return NextResponse.json({
        id: avatar.id,
        status: "FAILED",
        error: heygenStatus.error || "La generación falló en HeyGen",
      });
    }

    // Still processing
    return NextResponse.json({
      id: avatar.id,
      status: "GENERATING",
      heygenStatus: heygenStatus.status,
    });
  } catch (error: any) {
    console.error("HeyGen avatar-status error:", error);
    return NextResponse.json(
      { error: error?.message || "Error al consultar el estado" },
      { status: 500 }
    );
  }
}
