import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const orgId = (session.user as any).organizationId as string;

  const tests = await prisma.abTest.findMany({
    where: { organizationId: orgId },
    include: { variants: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(tests);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const orgId = (session.user as any).organizationId as string;
  const userId = (session.user as any).id as string;

  const body = await req.json();
  const { name, description, platform, goalMetric, variants } = body;

  if (!name) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
  if (!variants || variants.length < 2)
    return NextResponse.json({ error: "Se necesitan al menos 2 variantes" }, { status: 400 });

  const test = await prisma.abTest.create({
    data: {
      organizationId: orgId,
      createdById: userId,
      name,
      description,
      platform: platform ?? "meta",
      goalMetric: goalMetric ?? "leads",
      variants: {
        create: variants.map((v: any) => ({
          name: v.name,
          headline: v.headline,
          primaryText: v.primaryText,
          imageUrl: v.imageUrl,
          callToAction: v.callToAction,
        })),
      },
    },
    include: { variants: true },
  });

  await audit.abTestCreated({ organizationId: orgId, userId, testId: test.id, name });

  return NextResponse.json(test, { status: 201 });
}
