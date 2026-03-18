import { NextRequest, NextResponse } from "next/server";
import { requireOrganization, unauthorized } from "@/lib/auth-helpers";
import { getStripe, PLANS, PlanKey } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const user = await requireOrganization();
    if (!user) return unauthorized();
    const stripe = getStripe();
    const { planKey } = await req.json();

    if (!planKey || !(planKey in PLANS)) {
      return NextResponse.json(
        { error: "Plan inválido" },
        { status: 400 }
      );
    }

    const plan = PLANS[planKey as PlanKey];
    const priceId = plan.priceId;

    if (!priceId) {
      return NextResponse.json(
        { error: "Este plan no está configurado en Stripe aún" },
        { status: 400 }
      );
    }

    const organization = await prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: {
        id: true,
        name: true,
        contactEmail: true,
        stripeCustomerId: true,
      },
    });

    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    let stripeCustomerId = organization.stripeCustomerId;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        name: organization.name,
        email: organization.contactEmail ?? undefined,
        metadata: { organizationId: organization.id },
      });

      stripeCustomerId = customer.id;

      await prisma.organization.update({
        where: { id: organization.id },
        data: { stripeCustomerId },
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: stripeCustomerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXTAUTH_URL}/billing?success=true`,
      cancel_url: `${process.env.NEXTAUTH_URL}/billing?canceled=true`,
      metadata: { organizationId: organization.id },
      subscription_data: {
        metadata: { organizationId: organization.id },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch {
    return NextResponse.json(
      { error: "Error al crear sesión de checkout" },
      { status: 500 }
    );
  }
}
