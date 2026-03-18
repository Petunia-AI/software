import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/drip/[id]
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const orgId = (session.user as any).organizationId as string;
  const { id } = await params;

  const drip = await prisma.emailDrip.findFirst({
    where: { id, organizationId: orgId },
    include: {
      steps: { orderBy: { stepNumber: "asc" } },
      enrollments: {
        include: { lead: { select: { id: true, name: true, email: true, status: true } } },
        orderBy: { enrolledAt: "desc" },
        take: 50,
      },
      _count: { select: { enrollments: true } },
    },
  });

  if (!drip) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json(drip);
}

// PATCH /api/drip/[id]
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const orgId = (session.user as any).organizationId as string;
  const { id } = await params;

  const body = await req.json();
  const { steps, ...fields } = body;

  const drip = await prisma.emailDrip.update({
    where: { id, organizationId: orgId },
    data: {
      ...fields,
      ...(steps
        ? {
            steps: {
              deleteMany: {},
              create: steps.map((s: any, i: number) => ({
                stepNumber: i + 1,
                delayDays: s.delayDays ?? 0,
                subject: s.subject,
                bodyHtml: s.bodyHtml,
                bodyText: s.bodyText,
              })),
            },
          }
        : {}),
    },
    include: { steps: { orderBy: { stepNumber: "asc" } } },
  });

  return NextResponse.json(drip);
}

// DELETE /api/drip/[id]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const orgId = (session.user as any).organizationId as string;
  const { id } = await params;

  await prisma.emailDrip.delete({ where: { id, organizationId: orgId } });
  return NextResponse.json({ ok: true });
}
