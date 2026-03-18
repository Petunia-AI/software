import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrganization, unauthorized } from "@/lib/auth-helpers";

export async function GET() {
  try {
    const user = await requireOrganization();
    if (!user) return unauthorized();

    const sequences = await prisma.followUpSequence.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(sequences);
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
}
