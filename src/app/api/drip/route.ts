import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

// GET /api/drip — list all drip campaigns for the org
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const orgId = (session.user as any).organizationId as string;

  const drips = await prisma.emailDrip.findMany({
    where: { organizationId: orgId },
    include: {
      steps: { orderBy: { stepNumber: "asc" } },
      _count: { select: { enrollments: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(drips);
}

// POST /api/drip — create a new drip sequence
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const orgId = (session.user as any).organizationId as string;
  const userId = (session.user as any).id as string;

  const body = await req.json();
  const { name, description, trigger, triggerStatus, fromName, fromEmail, replyTo, steps } = body;

  if (!name) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });

  const drip = await prisma.emailDrip.create({
    data: {
      organizationId: orgId,
      createdById: userId,
      name,
      description,
      trigger: trigger ?? "lead.created",
      triggerStatus,
      fromName,
      fromEmail,
      replyTo,
      steps: steps?.length
        ? {
            create: steps.map((s: any, i: number) => ({
              stepNumber: i + 1,
              delayDays: s.delayDays ?? 0,
              subject: s.subject,
              bodyHtml: s.bodyHtml,
              bodyText: s.bodyText,
            })),
          }
        : undefined,
    },
    include: { steps: { orderBy: { stepNumber: "asc" } } },
  });

  await audit.dripCreated({ organizationId: orgId, userId, dripId: drip.id, name });

  return NextResponse.json(drip, { status: 201 });
}
