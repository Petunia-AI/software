import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrganization, unauthorized } from "@/lib/auth-helpers";

export async function GET() {
  try {
    const user = await requireOrganization();
    if (!user) return unauthorized();

    const tasks = await prisma.followUpTask.findMany({
      where: { organizationId: user.organizationId },
      include: {
        lead: {
          select: {
            name: true,
            property: { select: { title: true } },
          },
        },
        sequence: { select: { name: true } },
      },
      orderBy: { scheduledAt: "asc" },
    });

    return NextResponse.json(tasks);
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireOrganization();
    if (!user) return unauthorized();
    const data = await req.json();

    const task = await prisma.followUpTask.create({
      data: {
        ...data,
        organizationId: user.organizationId,
        createdById: user.id,
      },
    });

    return NextResponse.json(task, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Error al crear seguimiento" }, { status: 500 });
  }
}
