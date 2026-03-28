import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrganization } from "@/lib/auth-helpers";

type Params = { params: Promise<{ id: string }> };

// PATCH /api/content/[id] — edit a content post
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const user = await requireOrganization();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.contentPost.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!existing) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    // Only allow editing DRAFT or PENDING_APPROVAL posts
    if (!["DRAFT", "PENDING_APPROVAL"].includes(existing.status)) {
      return NextResponse.json(
        { error: "Solo se puede editar contenido en borrador o pendiente de aprobación" },
        { status: 400 },
      );
    }

    const updated = await prisma.contentPost.update({
      where: { id },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.content !== undefined && { content: body.content }),
        ...(body.hashtags !== undefined && { hashtags: body.hashtags }),
        ...(body.type !== undefined && { type: body.type }),
        ...(body.platform !== undefined && { platform: body.platform }),
        ...(body.status !== undefined &&
          ["DRAFT", "PENDING_APPROVAL", "SCHEDULED", "PUBLISHED"].includes(body.status) && {
            status: body.status,
          }),
      },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Error actualizando contenido" }, { status: 500 });
  }
}

// DELETE /api/content/[id] — reject / delete a content post
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const user = await requireOrganization();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { id } = await params;

    const existing = await prisma.contentPost.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!existing) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    await prisma.contentPost.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Error eliminando contenido" }, { status: 500 });
  }
}
