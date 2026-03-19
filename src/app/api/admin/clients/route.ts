import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, unauthorized } from "@/lib/auth-helpers";

export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) return unauthorized();

    const organizations = await prisma.organization.findMany({
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
          where: { role: "OWNER" },
          take: 1,
        },
        _count: {
          select: {
            properties: true,
            leads: true,
            contentPosts: true,
            members: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const clients = organizations.map((org) => ({
      id: org.id,
      name: org.name,
      slug: org.slug,
      description: org.description,
      plan: org.plan,
      planStatus: org.planStatus,
      balance: org.balance,
      monthlyRate: org.monthlyRate,
      currency: org.currency,
      trialEndsAt: org.trialEndsAt,
      lastPaymentAt: org.lastPaymentAt,
      contactEmail: org.contactEmail,
      contactPhone: org.contactPhone,
      maxProperties: org.maxProperties,
      maxLeads: org.maxLeads,
      createdAt: org.createdAt,
      owner: org.members[0]?.user || null,
      counts: org._count,
    }));

    // Summary stats
    const totalRevenue = organizations.reduce(
      (sum, o) => sum + Number(o.monthlyRate),
      0
    );
    const totalBalance = organizations.reduce(
      (sum, o) => sum + Number(o.balance),
      0
    );
    const activePlans = organizations.filter(
      (o) => o.planStatus === "active"
    ).length;
    const trialPlans = organizations.filter((o) => o.plan === "trial").length;
    const pastDue = organizations.filter(
      (o) => o.planStatus === "past_due"
    ).length;

    return NextResponse.json({
      clients,
      summary: {
        totalClients: organizations.length,
        activePlans,
        trialPlans,
        pastDue,
        totalRevenue,
        totalBalance,
      },
    });
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) return unauthorized();

    const { organizationId } = await req.json();
    if (!organizationId) {
      return NextResponse.json({ error: "organizationId requerido" }, { status: 400 });
    }

    // Find the owner user before deleting
    const member = await prisma.organizationMember.findFirst({
      where: { organizationId, role: "OWNER" },
      select: { userId: true },
    });

    // Delete organization (cascades: members, properties, leads, content, etc.)
    await prisma.organization.delete({ where: { id: organizationId } });

    // Delete owner user if found
    if (member?.userId) {
      await prisma.user.delete({ where: { id: member.userId } }).catch(() => {
        // Ignore if user already deleted or has other memberships
      });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Error al eliminar cliente" }, { status: 500 });
  }
}
