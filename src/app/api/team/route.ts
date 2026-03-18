import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrganization, unauthorized } from "@/lib/auth-helpers";

// GET — List team members
export async function GET() {
  try {
    const user = await requireOrganization();
    if (!user) return unauthorized();

    const members = await prisma.organizationMember.findMany({
      where: { organizationId: user.organizationId },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const result = members.map((m) => ({
      id: m.id,
      userId: m.user.id,
      name: m.user.name,
      email: m.user.email,
      image: m.user.image,
      role: m.role,
      joinedAt: m.createdAt,
    }));

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "No autorizado" },
      { status: 401 }
    );
  }
}

// POST — Invite a new member by email
export async function POST(req: NextRequest) {
  try {
    const user = await requireOrganization();
    if (!user) return unauthorized();

    // Only OWNER/ADMIN can invite
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
        { error: "No tienes permisos para invitar miembros" },
        { status: 403 }
      );
    }

    const { email, role = "MEMBER" } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email requerido" },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles = ["ADMIN", "MEMBER"];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: "Rol inválido. Usa ADMIN o MEMBER" },
        { status: 400 }
      );
    }

    // Find existing user by email
    const targetUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: "No existe un usuario registrado con ese email. El usuario debe registrarse primero." },
        { status: 404 }
      );
    }

    // Check if already a member
    const existing = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: targetUser.id,
          organizationId: user.organizationId,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Este usuario ya es miembro de la organización" },
        { status: 409 }
      );
    }

    // Add member
    const member = await prisma.organizationMember.create({
      data: {
        userId: targetUser.id,
        organizationId: user.organizationId,
        role: role as "ADMIN" | "MEMBER",
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    });

    return NextResponse.json({
      id: member.id,
      userId: member.user.id,
      name: member.user.name,
      email: member.user.email,
      image: member.user.image,
      role: member.role,
      joinedAt: member.createdAt,
    });
  } catch {
    return NextResponse.json(
      { error: "Error al invitar miembro" },
      { status: 500 }
    );
  }
}
