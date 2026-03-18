import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/drip/[id]/enroll — enroll a specific lead
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const orgId = (session.user as any).organizationId as string;
  const { id: dripId } = await params;

  const body = await req.json();
  const { leadId } = body;
  if (!leadId) return NextResponse.json({ error: "leadId requerido" }, { status: 400 });

  // Verify both drip and lead belong to this org
  const [drip, lead] = await Promise.all([
    prisma.emailDrip.findFirst({
      where: { id: dripId, organizationId: orgId },
      include: { steps: { orderBy: { stepNumber: "asc" }, take: 1 } },
    }),
    prisma.lead.findFirst({ where: { id: leadId, organizationId: orgId } }),
  ]);

  if (!drip) return NextResponse.json({ error: "Drip no encontrado" }, { status: 404 });
  if (!lead) return NextResponse.json({ error: "Lead no encontrado" }, { status: 404 });
  if (!lead.email) return NextResponse.json({ error: "El lead no tiene email" }, { status: 400 });

  const firstStep = drip.steps[0];
  const nextSendAt = firstStep
    ? new Date(Date.now() + firstStep.delayDays * 24 * 60 * 60 * 1000)
    : null;

  const enrollment = await prisma.emailDripEnrollment.upsert({
    where: { dripId_leadId: { dripId, leadId } },
    create: {
      dripId,
      leadId,
      currentStep: 0,
      status: "ACTIVE",
      nextSendAt,
    },
    update: {
      status: "ACTIVE",
      currentStep: 0,
      nextSendAt,
      completedAt: null,
    },
  });

  await prisma.emailDrip.update({
    where: { id: dripId },
    data: { totalEnrolled: { increment: 1 } },
  });

  return NextResponse.json(enrollment, { status: 201 });
}
