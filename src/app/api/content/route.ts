import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrganization } from "@/lib/auth-helpers";

export async function GET() {
  try {
    const user = await requireOrganization();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const posts = await prisma.contentPost.findMany({
      where: { organizationId: user.organizationId },
      include: {
        property: { select: { title: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(posts);
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireOrganization();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const data = await req.json();

    const post = await prisma.contentPost.create({
      data: {
        ...data,
        organizationId: user.organizationId,
        createdById: user.id,
      },
    });

    return NextResponse.json(post, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Error al crear contenido" }, { status: 500 });
  }
}
