import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const orgId = (session.user as any).organizationId as string;
  const { id } = await params;

  const test = await prisma.abTest.findFirst({
    where: { id, organizationId: orgId },
    include: { variants: { orderBy: { createdAt: "asc" } } },
  });

  if (!test) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json(test);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const orgId = (session.user as any).organizationId as string;
  const { id } = await params;

  const body = await req.json();

  // Handle variant metric updates (sync from Meta)
  if (body.variantUpdates) {
    await Promise.all(
      body.variantUpdates.map((vu: any) =>
        prisma.abTestVariant.update({
          where: { id: vu.id },
          data: {
            impressions: vu.impressions,
            clicks: vu.clicks,
            leads: vu.leads,
            spent: vu.spent,
            ctr: vu.ctr ?? 0,
            cpl: vu.cpl ?? null,
          },
        })
      )
    );
  }

  const { variantUpdates: _, ...fields } = body;

  const test = await prisma.abTest.update({
    where: { id, organizationId: orgId },
    data: fields,
    include: { variants: { orderBy: { createdAt: "asc" } } },
  });

  return NextResponse.json(test);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const orgId = (session.user as any).organizationId as string;
  const { id } = await params;

  await prisma.abTest.delete({ where: { id, organizationId: orgId } });
  return NextResponse.json({ ok: true });
}
