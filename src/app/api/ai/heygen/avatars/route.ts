import { NextResponse } from "next/server";
import { requireOrganization, unauthorized } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/ai/heygen/avatars
 * Lists all HeyGen avatars saved for the user's organization.
 */
export async function GET() {
  try {
    const user = await requireOrganization();
    if (!user) return unauthorized();

    const avatars = await prisma.heyGenAvatar.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        heygenAvatarId: true,
        generationId: true,
        status: true,
        previewImageUrl: true,
        previewVideoUrl: true,
        gender: true,
        age: true,
        ethnicity: true,
        style: true,
        pose: true,
        appearance: true,
        createdAt: true,
        createdBy: {
          select: { name: true, email: true },
        },
      },
    });

    return NextResponse.json({ avatars });
  } catch (error: any) {
    console.error("HeyGen list avatars error:", error);
    return NextResponse.json(
      { error: error?.message || "Error al listar avatares" },
      { status: 500 }
    );
  }
}
