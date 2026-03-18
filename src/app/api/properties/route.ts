import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrganization } from "@/lib/auth-helpers";

export async function GET() {
  try {
    const user = await requireOrganization();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const properties = await prisma.property.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(properties);
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireOrganization();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const data = await req.json();

    const property = await prisma.property.create({
      data: {
        ...data,
        organizationId: user.organizationId,
        createdById: user.id,
      },
    });

    return NextResponse.json(property, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Error al crear propiedad" }, { status: 500 });
  }
}
