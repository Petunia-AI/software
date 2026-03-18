import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrganization, unauthorized } from "@/lib/auth-helpers";

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const _user = await requireOrganization();
    if (!_user) return unauthorized();
    const { id } = await params;

    const task = await prisma.followUpTask.update({
      where: { id },
      data: { completedAt: new Date() },
    });

    return NextResponse.json(task);
  } catch {
    return NextResponse.json({ error: "Error al completar" }, { status: 500 });
  }
}
