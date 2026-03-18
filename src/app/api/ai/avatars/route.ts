import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrganization } from "@/lib/auth-helpers";

// GET /api/ai/avatars — list saved avatars for the org
export async function GET() {
  try {
    const user = await requireOrganization();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const avatars = await prisma.savedAvatar.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        videoUrl: true,
        thumbnailUrl: true,
        sourceImageUrl: true,
        script: true,
        voiceDescription: true,
        resolution: true,
        createdAt: true,
      },
    });

    return NextResponse.json(avatars);
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
}

// POST /api/ai/avatars — save a generated avatar
export async function POST(req: NextRequest) {
  try {
    const user = await requireOrganization();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { name, videoUrl, thumbnailUrl, sourceImageUrl, script, voiceDescription, resolution } = await req.json();

    if (!name?.trim()) return NextResponse.json({ error: "El nombre es requerido" }, { status: 400 });
    if (!videoUrl?.trim()) return NextResponse.json({ error: "La URL del video es requerida" }, { status: 400 });

    const avatar = await prisma.savedAvatar.create({
      data: {
        name: name.trim(),
        videoUrl,
        thumbnailUrl: thumbnailUrl || null,
        sourceImageUrl: sourceImageUrl || null,
        script: script || null,
        voiceDescription: voiceDescription || null,
        resolution: resolution || "480p",
        organizationId: user.organizationId,
        createdById: user.id,
      },
    });

    return NextResponse.json(avatar, { status: 201 });
  } catch (err: any) {
    console.error("Error saving avatar:", err);
    return NextResponse.json({ error: err?.message || "Error al guardar el avatar" }, { status: 500 });
  }
}

// DELETE /api/ai/avatars?id=xxx
export async function DELETE(req: NextRequest) {
  try {
    const user = await requireOrganization();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

    // Ensure the avatar belongs to the org
    const avatar = await prisma.savedAvatar.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!avatar) return NextResponse.json({ error: "Avatar no encontrado" }, { status: 404 });

    await prisma.savedAvatar.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Error al eliminar el avatar" }, { status: 500 });
  }
}
