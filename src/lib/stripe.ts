import Stripe from "stripe";

// Lazy-init: only fails when actually used, not at import time
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      typescript: true,
    });
  }
  return _stripe;
}

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { typescript: true })
  : (null as unknown as Stripe);

// Plan definitions — match these to your Stripe Price IDs
export const PLANS = {
  starter: {
    name: "Starter",
    description: "Para agentes independientes",
    monthlyPrice: 29,
    priceId: process.env.STRIPE_PRICE_STARTER || "",
    maxProperties: 15,
    maxLeads: 100,
    aiCreditsLimit: 50,
    features: [
      "15 propiedades activas",
      "100 leads",
      "50 créditos IA/mes",
      "1 usuario",
      "Soporte por email",
    ],
  },
  professional: {
    name: "Professional",
    description: "Para equipos en crecimiento",
    monthlyPrice: 79,
    priceId: process.env.STRIPE_PRICE_PROFESSIONAL || "",
    maxProperties: 50,
    maxLeads: 500,
    aiCreditsLimit: 200,
    features: [
      "50 propiedades activas",
      "500 leads",
      "200 créditos IA/mes",
      "5 usuarios",
      "CRM completo",
      "Seguimiento automatizado",
      "Integraciones (Meta, WhatsApp)",
      "Soporte prioritario",
    ],
    popular: true,
  },
  enterprise: {
    name: "Enterprise",
    description: "Para inmobiliarias y desarrolladoras",
    monthlyPrice: 199,
    priceId: process.env.STRIPE_PRICE_ENTERPRISE || "",
    maxProperties: -1, // unlimited
    maxLeads: -1,
    aiCreditsLimit: -1, // unlimited
    features: [
      "Propiedades ilimitadas",
      "Leads ilimitados",
      "IA ilimitada",
      "Usuarios ilimitados",
      "Avatar IA",
      "API access",
      "Onboarding dedicado",
      "Soporte 24/7",
    ],
  },
} as const;

export type PlanKey = keyof typeof PLANS;
