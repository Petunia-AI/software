import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrganization, unauthorized } from "@/lib/auth-helpers";

export async function GET() {
  try {
    const user = await requireOrganization();
    if (!user) return unauthorized();

    const org = await prisma.organization.findUnique({
      where: { id: user.organizationId! },
      select: {
        plan: true,
        planStatus: true,
        maxProperties: true,
        maxLeads: true,
        trialEndsAt: true,
        stripeSubscriptionId: true,
        _count: {
          select: {
            properties: true,
            leads: true,
          },
        },
      },
    });

    if (!org) {
      return NextResponse.json({ error: "Organización no encontrada" }, { status: 404 });
    }

    return NextResponse.json(org);
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
}
