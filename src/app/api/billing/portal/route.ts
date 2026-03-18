import { NextResponse } from "next/server";
import { requireOrganization, unauthorized } from "@/lib/auth-helpers";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const user = await requireOrganization();
    if (!user) return unauthorized();
    const stripe = getStripe();

    const organization = await prisma.organization.findUnique({
      where: { id: user.organizationId! },
      select: { stripeCustomerId: true },
    });

    if (!organization?.stripeCustomerId) {
      return NextResponse.json(
        { error: "No hay suscripción activa" },
        { status: 400 }
      );
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: organization.stripeCustomerId,
      return_url: process.env.NEXTAUTH_URL + "/billing",
    });

    return NextResponse.json({ url: session.url });
  } catch {
    return NextResponse.json(
      { error: "Error al crear portal de facturación" },
      { status: 500 }
    );
  }
}
