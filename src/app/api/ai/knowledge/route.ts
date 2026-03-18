import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrganization } from "@/lib/auth-helpers";

// GET /api/ai/knowledge — list knowledge entries for the org
export async function GET() {
  try {
    const user = await requireOrganization();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const entries = await prisma.knowledgeEntry.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        category: true,
        title: true,
        content: true,
        isActive: true,
        createdAt: true,
      },
    });

    return NextResponse.json(entries);
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
}

// POST /api/ai/knowledge — create a knowledge entry
export async function POST(req: NextRequest) {
  try {
    const user = await requireOrganization();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { category, title, content } = await req.json();

    if (!category?.trim()) return NextResponse.json({ error: "La categoría es requerida" }, { status: 400 });
    if (!title?.trim()) return NextResponse.json({ error: "El título es requerido" }, { status: 400 });
    if (!content?.trim()) return NextResponse.json({ error: "El contenido es requerido" }, { status: 400 });

    const entry = await prisma.knowledgeEntry.create({
      data: {
        category: category.trim(),
        title: title.trim(),
        content: content.trim(),
        organizationId: user.organizationId,
        createdById: user.id,
      },
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (err: any) {
    console.error("Error creating knowledge entry:", err);
    return NextResponse.json({ error: err?.message || "Error al guardar el conocimiento" }, { status: 500 });
  }
}

// PATCH /api/ai/knowledge — toggle isActive or update entry
export async function PATCH(req: NextRequest) {
  try {
    const user = await requireOrganization();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { id, isActive, title, content, category } = await req.json();
    if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

    const existing = await prisma.knowledgeEntry.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!existing) return NextResponse.json({ error: "Entrada no encontrada" }, { status: 404 });

    const updated = await prisma.knowledgeEntry.update({
      where: { id },
      data: {
        ...(isActive !== undefined && { isActive }),
        ...(title !== undefined && { title: title.trim() }),
        ...(content !== undefined && { content: content.trim() }),
        ...(category !== undefined && { category: category.trim() }),
      },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Error al actualizar" }, { status: 500 });
  }
}

// DELETE /api/ai/knowledge?id=xxx
export async function DELETE(req: NextRequest) {
  try {
    const user = await requireOrganization();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

    const existing = await prisma.knowledgeEntry.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!existing) return NextResponse.json({ error: "Entrada no encontrada" }, { status: 404 });

    await prisma.knowledgeEntry.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Error al eliminar" }, { status: 500 });
  }
}
