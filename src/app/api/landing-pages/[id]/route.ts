import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrganization, unauthorized } from "@/lib/auth-helpers";

type Params = { params: Promise<{ id: string }> };

// PATCH /api/landing-pages/[id] — update a landing page
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const user = await requireOrganization();
    if (!user) return unauthorized();

    const { id } = await params;
    const body = await req.json();

    // Verify ownership
    const existing = await prisma.landingPage.findFirst({
      where: { id, organizationId: user.organizationId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Landing page no encontrada" },
        { status: 404 }
      );
    }

    const { title, description, status, html, nicho } = body;

    const updated = await prisma.landingPage.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(status !== undefined && { status }),
        ...(html !== undefined && { html }),
        ...(nicho !== undefined && { nicho }),
        ...(status === "ACTIVE" && !existing.publishedAt && { publishedAt: new Date() }),
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("[LANDING-PAGES PATCH]", error);
    return NextResponse.json(
      { error: error.message || "Error al actualizar landing page" },
      { status: 500 }
    );
  }
}

// DELETE /api/landing-pages/[id] — delete a landing page
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const user = await requireOrganization();
    if (!user) return unauthorized();

    const { id } = await params;

    // Verify ownership
    const existing = await prisma.landingPage.findFirst({
      where: { id, organizationId: user.organizationId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Landing page no encontrada" },
        { status: 404 }
      );
    }

    await prisma.landingPage.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[LANDING-PAGES DELETE]", error);
    return NextResponse.json(
      { error: error.message || "Error al eliminar landing page" },
      { status: 500 }
    );
  }
}
