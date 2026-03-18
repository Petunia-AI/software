import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe, PLANS } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

type PlanKey = keyof typeof PLANS;

function findPlanByPriceId(priceId: string): { key: PlanKey; plan: (typeof PLANS)[PlanKey] } | null {
  for (const [key, plan] of Object.entries(PLANS)) {
    if (plan.priceId === priceId) {
      return { key: key as PlanKey, plan };
    }
  }
  return null;
}

export async function POST(request: NextRequest) {
  const stripe = getStripe();
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ received: true }, { status: 200 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ received: true }, { status: 200 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const organizationId = session.metadata?.organizationId;

        if (!organizationId || !session.subscription) {
          console.error("Missing organizationId or subscription in checkout session");
          break;
        }

        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string
        );
        const priceId = subscription.items.data[0]?.price?.id;
        const match = priceId ? findPlanByPriceId(priceId) : null;
        const planKey = match?.key ?? "starter";
        const planConfig = match?.plan ?? PLANS.starter;

        await prisma.organization.update({
          where: { id: organizationId },
          data: {
            plan: planKey,
            planStatus: "active",
            stripeSubscriptionId: subscription.id,
            stripePriceId: priceId ?? null,
            monthlyRate: planConfig.monthlyPrice,
            maxProperties: planConfig.maxProperties,
            maxLeads: planConfig.maxLeads,
            aiCreditsLimit: planConfig.aiCreditsLimit,
            aiCreditsUsed: 0,
            aiCreditsResetAt: new Date(),
            lastPaymentAt: new Date(),
          },
        });
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice & { subscription?: string };
        const subscriptionId = invoice.subscription;

        if (!subscriptionId) break;

        await prisma.organization.updateMany({
          where: { stripeSubscriptionId: subscriptionId },
          data: {
            lastPaymentAt: new Date(),
            planStatus: "active",
          },
        });
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice & { subscription?: string };
        const subscriptionId = invoice.subscription;

        if (!subscriptionId) break;

        await prisma.organization.updateMany({
          where: { stripeSubscriptionId: subscriptionId },
          data: {
            planStatus: "past_due",
          },
        });
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;

        await prisma.organization.updateMany({
          where: { stripeSubscriptionId: subscription.id },
          data: {
            plan: "canceled",
            planStatus: "canceled",
            stripeSubscriptionId: null,
            stripePriceId: null,
          },
        });
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;

        const updateData: Record<string, string> = {};

        if (subscription.status === "active") {
          updateData.planStatus = "active";
        }

        if (subscription.cancel_at_period_end) {
          updateData.planStatus = "canceling";
        }

        if (Object.keys(updateData).length > 0) {
          await prisma.organization.updateMany({
            where: { stripeSubscriptionId: subscription.id },
            data: updateData,
          });
        }
        break;
      }

      default:
        // Unhandled event type — no action needed
        break;
    }
  } catch (err) {
    console.error(`Error processing webhook event ${event.type}:`, err);
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
