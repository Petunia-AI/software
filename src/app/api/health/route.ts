import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const { prisma } = await import("@/lib/prisma");
    const [userCount, orgCount] = await Promise.all([
      prisma.user.count(),
      prisma.organization.findMany({
        include: {
          members: {
            include: { user: { select: { id: true, name: true, email: true } } },
            where: { role: "OWNER" },
            take: 1,
          },
          _count: { select: { properties: true, leads: true, contentPosts: true, members: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);
    return NextResponse.json({ ok: true, userCount, orgCount: orgCount.length });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
