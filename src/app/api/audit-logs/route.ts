import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const orgId = (session.user as any).organizationId as string | undefined;
  if (!orgId) return NextResponse.json({ error: "Sin organización" }, { status: 400 });

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = 50;
  const action = searchParams.get("action") ?? undefined;
  const resourceType = searchParams.get("resourceType") ?? undefined;

  const where = {
    organizationId: orgId,
    ...(action ? { action } : {}),
    ...(resourceType ? { resourceType } : {}),
  };

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        // join user name via userId
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  // Enrich with user names
  const userIds = [...new Set(logs.map((l) => l.userId).filter(Boolean))] as string[];
  const users =
    userIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true, email: true },
        })
      : [];
  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

  const enriched = logs.map((l) => ({
    id: l.id,
    action: l.action,
    resourceType: l.resourceType,
    resourceId: l.resourceId,
    details: l.details,
    ipAddress: l.ipAddress,
    createdAt: l.createdAt,
    user: l.userId ? (userMap[l.userId] ?? null) : null,
  }));

  // Distinct actions for filter
  const distinctActions = await prisma.auditLog.findMany({
    where: { organizationId: orgId },
    select: { action: true },
    distinct: ["action"],
    orderBy: { action: "asc" },
  });

  return NextResponse.json({
    logs: enriched,
    total,
    page,
    pages: Math.ceil(total / limit),
    actions: distinctActions.map((a) => a.action),
  });
}
