import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrganization } from "@/lib/auth-helpers";

// PATCH — Update member role
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const user = await requireOrganization();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const { memberId } = await params;

    // Only OWNER can change roles
    const currentMember = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: user.id,
          organizationId: user.organizationId,
        },
      },
    });

    if (!currentMember || currentMember.role !== "OWNER") {
      return NextResponse.json(
        { error: "Solo el Owner puede cambiar roles" },
        { status: 403 }
      );
    }

    const { role } = await req.json();
    const validRoles = ["ADMIN", "MEMBER"];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: "Rol inválido" },
        { status: 400 }
      );
    }

    // Find the member to update
    const targetMember = await prisma.organizationMember.findFirst({
      where: { id: memberId, organizationId: user.organizationId },
    });

    if (!targetMember) {
      return NextResponse.json(
        { error: "Miembro no encontrado" },
        { status: 404 }
      );
    }

    // Can't change owner's own role
    if (targetMember.role === "OWNER") {
      return NextResponse.json(
        { error: "No se puede cambiar el rol del Owner" },
        { status: 400 }
      );
    }

    const updated = await prisma.organizationMember.update({
      where: { id: memberId },
      data: { role: role as "ADMIN" | "MEMBER" },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    });

    return NextResponse.json({
      id: updated.id,
      userId: updated.user.id,
      name: updated.user.name,
      email: updated.user.email,
      image: updated.user.image,
      role: updated.role,
      joinedAt: updated.createdAt,
    });
  } catch {
    return NextResponse.json(
      { error: "Error al actualizar miembro" },
      { status: 500 }
    );
  }
}

// DELETE — Remove member from organization
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const user = await requireOrganization();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const { memberId } = await params;

    // Only OWNER/ADMIN can remove members
    const currentMember = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: user.id,
          organizationId: user.organizationId,
        },
      },
    });

    if (!currentMember || currentMember.role === "MEMBER") {
      return NextResponse.json(
        { error: "No tienes permisos para eliminar miembros" },
        { status: 403 }
      );
    }

    const targetMember = await prisma.organizationMember.findFirst({
      where: { id: memberId, organizationId: user.organizationId },
    });

    if (!targetMember) {
      return NextResponse.json(
        { error: "Miembro no encontrado" },
        { status: 404 }
      );
    }

    // Can't remove the owner
    if (targetMember.role === "OWNER") {
      return NextResponse.json(
        { error: "No se puede eliminar al Owner de la organización" },
        { status: 400 }
      );
    }

    // Admin can't remove other admins (only owner can)
    if (targetMember.role === "ADMIN" && currentMember.role !== "OWNER") {
      return NextResponse.json(
        { error: "Solo el Owner puede eliminar administradores" },
        { status: 403 }
      );
    }

    await prisma.organizationMember.delete({
      where: { id: memberId },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Error al eliminar miembro" },
      { status: 500 }
    );
  }
}
