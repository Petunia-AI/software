"use client";

import { useEffect, useState, Suspense } from "react";
import {
  CreditCard,
  Check,
  Loader2,
  Zap,
  Building2,
  Crown,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useSearchParams } from "next/navigation";

interface OrgBilling {
  plan: string;
  planStatus: string;
  maxProperties: number;
  maxLeads: number;
  trialEndsAt: string | null;
  stripeSubscriptionId: string | null;
  _count: { properties: number; leads: number };
}

const plans = [
  {
    key: "starter",
    name: "Starter",
    description: "Para agentes independientes",
    price: 29,
    icon: Zap,
    features: [
      "15 propiedades activas",
      "100 leads",
      "Contenido IA básico",
      "1 usuario",
      "Soporte por email",
    ],
  },
  {
    key: "professional",
    name: "Professional",
    description: "Para equipos en crecimiento",
    price: 79,
    icon: Building2,
    popular: true,
    features: [
      "50 propiedades activas",
      "500 leads",
      "Contenido IA avanzado",
      "5 usuarios",
      "CRM completo",
      "Seguimiento automatizado",
      "Integraciones (Meta, WhatsApp)",
      "Soporte prioritario",
    ],
  },
  {
    key: "enterprise",
    name: "Enterprise",
    description: "Para inmobiliarias y desarrolladoras",
    price: 199,
    icon: Crown,
    features: [
      "Propiedades ilimitadas",
      "Leads ilimitados",
      "IA personalizada con tu marca",
      "Usuarios ilimitados",
      "Avatar IA",
      "API access",
      "Onboarding dedicado",
      "Soporte 24/7",
    ],
  },
];

export default function BillingPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <BillingContent />
    </Suspense>
  );
}

function BillingContent() {
  const searchParams = useSearchParams();
  const [billing, setBilling] = useState<OrgBilling | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    if (searchParams.get("success") === "true") {
      toast.success("Suscripción activada exitosamente");
    } else if (searchParams.get("canceled") === "true") {
      toast("Pago cancelado");
    }
  }, [searchParams]);

  useEffect(() => {
    fetch("/api/billing")
      .then((r) => r.json())
      .then((data) => setBilling(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleCheckout = async (planKey: string) => {
    setCheckoutLoading(planKey);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planKey }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || "Error al iniciar el pago");
      }
    } catch {
      toast.error("Error de conexión");
    }
    setCheckoutLoading(null);
  };

  const handlePortal = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || "Error al abrir el portal");
      }
    } catch {
      toast.error("Error de conexión");
    }
    setPortalLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-foreground" />
      </div>
    );
  }

  const currentPlan = billing?.plan || "trial";
  const isTrialOrFree = currentPlan === "trial" || currentPlan === "free";
  const isCanceled = billing?.planStatus === "canceled";
  const isPastDue = billing?.planStatus === "past_due";
  const isCanceling = billing?.planStatus === "canceling";

  const trialDaysLeft = billing?.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(billing.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl p-6 text-white" style={{ background: 'linear-gradient(135deg, #4A154B 0%, #350d36 60%, #1a0a1a 100%)' }}>
        <div className="absolute inset-0 opacity-50" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23fff' fill-opacity='0.03'%3E%3Cpath d='M36 18c0-9.94-8.06-18-18-18S0 8.06 0 18 18 36 36 18'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />
        <div className="relative flex items-center justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-white/10 backdrop-blur-sm">
                <CreditCard className="h-5 w-5" />
              </div>
              <Badge className="bg-white/10 text-white/80 border-white/10 text-[10px] font-medium backdrop-blur-sm">
                Suscripción
              </Badge>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Planes y Pagos</h1>
            <p className="text-white/70 text-sm max-w-md">
              Administra tu suscripción y método de pago
            </p>
          </div>
          {billing?.stripeSubscriptionId && (
            <Button
              size="sm"
              className="rounded-xl bg-white/10 text-white border border-white/20 hover:bg-white/20 backdrop-blur-sm"
              onClick={handlePortal}
              disabled={portalLoading}
            >
              {portalLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <ExternalLink className="h-4 w-4 mr-2" />
              )}
              Gestionar suscripción
            </Button>
          )}
        </div>
      </div>

      {/* Current Plan Status */}
      <Card className="rounded-2xl border border-border/40">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary text-white flex items-center justify-center">
                <CreditCard className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold capitalize">{currentPlan === "trial" ? "Periodo de prueba" : `Plan ${currentPlan}`}</h2>
                  {isPastDue && (
                    <Badge className="bg-red-100 text-red-700 text-[10px]">Pago pendiente</Badge>
                  )}
                  {isCanceling && (
                    <Badge className="bg-yellow-100 text-yellow-700 text-[10px]">Se cancela al final del periodo</Badge>
                  )}
                  {isCanceled && (
                    <Badge className="bg-muted text-muted-foreground text-[10px]">Cancelado</Badge>
                  )}
                  {!isPastDue && !isCanceling && !isCanceled && billing?.planStatus === "active" && (
                    <Badge className="bg-green-100 text-green-700 text-[10px]">Activo</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isTrialOrFree && trialDaysLeft > 0
                    ? `${trialDaysLeft} días restantes de prueba`
                    : isTrialOrFree
                    ? "Tu periodo de prueba ha terminado"
                    : `Próximo cobro automático via Stripe`}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div>
                  <span className="font-semibold text-foreground">{billing?._count?.properties || 0}</span>
                  <span>/{billing?.maxProperties === -1 ? "∞" : billing?.maxProperties || 0} propiedades</span>
                </div>
                <div className="h-4 w-px bg-border/60" />
                <div>
                  <span className="font-semibold text-foreground">{billing?._count?.leads || 0}</span>
                  <span>/{billing?.maxLeads === -1 ? "∞" : billing?.maxLeads || 0} leads</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alert banners */}
      {isPastDue && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40">
          <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-700 dark:text-red-400">Pago fallido</p>
            <p className="text-xs text-red-600 dark:text-red-500 mt-0.5">
              Tu último pago no pudo procesarse. Actualiza tu método de pago para evitar interrupciones.
            </p>
            <Button
              size="sm"
              className="mt-2 rounded-xl bg-red-600 text-white hover:bg-red-700"
              onClick={handlePortal}
            >
              Actualizar método de pago
            </Button>
          </div>
        </div>
      )}

      {isTrialOrFree && trialDaysLeft > 0 && trialDaysLeft <= 7 && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900/40">
          <AlertCircle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
              Tu prueba termina en {trialDaysLeft} día{trialDaysLeft !== 1 ? "s" : ""}
            </p>
            <p className="text-xs text-yellow-600 dark:text-yellow-500 mt-0.5">
              Elige un plan para mantener acceso a todas las funcionalidades.
            </p>
          </div>
        </div>
      )}

      {/* Plans */}
      <div>
        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest mb-4 px-1">
          Elige tu plan
        </p>
        <div className="grid grid-cols-3 gap-4">
          {plans.map((plan) => {
            const isCurrent = currentPlan === plan.key;
            return (
              <div
                key={plan.key}
                className={`relative rounded-2xl border-2 p-6 transition-all hover:-translate-y-0.5 hover:shadow-lg ${
                  plan.popular
                    ? "border-foreground bg-foreground/[0.02]"
                    : "border-border/40"
                } ${isCurrent ? "ring-2 ring-foreground ring-offset-2" : ""}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-white text-[10px] px-3">
                      Más popular
                    </Badge>
                  </div>
                )}

                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${plan.popular ? "bg-primary text-white" : "bg-muted/50"}`}>
                      <plan.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold">{plan.name}</h3>
                      <p className="text-[11px] text-muted-foreground">{plan.description}</p>
                    </div>
                  </div>

                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold">${plan.price}</span>
                    <span className="text-sm text-muted-foreground">USD/mes</span>
                  </div>

                  <div className="space-y-2 pt-2">
                    {plan.features.map((feature) => (
                      <div key={feature} className="flex items-start gap-2">
                        <Check className="h-3.5 w-3.5 text-green-600 shrink-0 mt-0.5" />
                        <span className="text-xs text-muted-foreground">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2">
                    {isCurrent && !isCanceled ? (
                      <Button
                        className="w-full rounded-xl bg-muted text-muted-foreground cursor-default"
                        disabled
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Plan actual
                      </Button>
                    ) : (
                      <Button
                        className={`w-full rounded-xl ${
                          plan.popular
                            ? "bg-primary text-white hover:bg-foreground/90"
                            : "bg-foreground/10 text-foreground hover:bg-foreground/20"
                        }`}
                        onClick={() => handleCheckout(plan.key)}
                        disabled={checkoutLoading !== null}
                      >
                        {checkoutLoading === plan.key ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : null}
                        {isCurrent && isCanceled ? "Reactivar" : isTrialOrFree ? "Comenzar" : "Cambiar plan"}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* FAQ */}
      <Card className="rounded-2xl border border-border/40">
        <CardContent className="p-6 space-y-4">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest">
            Preguntas frecuentes
          </p>
          <div className="grid grid-cols-2 gap-4">
            {[
              {
                q: "¿Puedo cambiar de plan en cualquier momento?",
                a: "Sí, puedes subir o bajar de plan cuando quieras. El cambio se aplica de inmediato y se prorratea.",
              },
              {
                q: "¿Qué métodos de pago aceptan?",
                a: "Aceptamos todas las tarjetas de crédito y débito principales (Visa, Mastercard, Amex) a través de Stripe.",
              },
              {
                q: "¿Puedo cancelar cuando quiera?",
                a: "Sí, sin contratos. Puedes cancelar desde el portal de pagos y mantener acceso hasta el final del periodo.",
              },
              {
                q: "¿Qué pasa si excedo mis límites?",
                a: "Te notificaremos cuando estés cerca del límite. No perderás datos, pero deberás subir de plan para agregar más.",
              },
            ].map((faq) => (
              <div key={faq.q} className="space-y-1">
                <p className="text-sm font-medium">{faq.q}</p>
                <p className="text-xs text-muted-foreground">{faq.a}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
