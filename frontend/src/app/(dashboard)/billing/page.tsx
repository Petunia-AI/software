"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { billingApi } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  CreditCard, Zap, Check, ArrowUpRight, AlertTriangle,
  Clock, TrendingUp, MessageSquare, Users,
} from "lucide-react";

const PLAN_LABELS: Record<string, string> = {
  trial:      "Trial",
  starter:    "Starter",
  pro:        "Pro",
  enterprise: "Enterprise",
};

const PLAN_COLORS: Record<string, string> = {
  trial:      "bg-gray-100 text-gray-700 border-gray-200",
  starter:    "bg-blue-50 text-blue-700 border-blue-200",
  pro:        "bg-violet-50 text-violet-700 border-violet-200",
  enterprise: "bg-amber-50 text-amber-700 border-amber-200",
};

const STATUS_COLORS: Record<string, string> = {
  trialing: "bg-blue-50 text-blue-700",
  active:   "bg-green-50 text-green-700",
  past_due: "bg-red-50 text-red-700",
  canceled: "bg-gray-100 text-gray-600",
  paused:   "bg-yellow-50 text-yellow-700",
};

const STATUS_LABELS: Record<string, string> = {
  trialing: "En prueba",
  active:   "Activo",
  past_due: "Pago pendiente",
  canceled: "Cancelado",
  paused:   "Pausado",
};

function UsageBar({ label, used, limit, icon: Icon }: {
  label: string; used: number; limit: number; icon: React.ElementType;
}) {
  const pct = limit === -1 ? 0 : Math.min(100, Math.round((used / limit) * 100));
  const isUnlimited = limit === -1;
  const isWarning = pct > 80;

  return (
    <div className="p-4 bg-secondary/40 rounded-xl border border-border">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon size={14} className="text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">{label}</span>
        </div>
        <span className={`text-xs font-semibold ${isWarning && !isUnlimited ? "text-red-500" : "text-muted-foreground"}`}>
          {isUnlimited ? `${used} / ∞` : `${used} / ${limit}`}
        </span>
      </div>
      {!isUnlimited && (
        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className={`h-full rounded-full ${isWarning ? "bg-red-500" : "bg-primary"}`}
          />
        </div>
      )}
      {isUnlimited && (
        <div className="h-1.5 bg-primary/20 rounded-full" />
      )}
    </div>
  );
}

export default function BillingPage() {
  const { data: sub, isLoading } = useQuery({
    queryKey: ["subscription"],
    queryFn: () => billingApi.getSubscription().then((r) => r.data),
  });

  const { data: plans } = useQuery({
    queryKey: ["plans"],
    queryFn: () => billingApi.getPlans().then((r) => r.data),
  });

  const portalMutation = useMutation({
    mutationFn: () =>
      billingApi.createPortalSession(window.location.href).then((r) => r.data),
    onSuccess: (data) => {
      window.location.href = data.url;
    },
    onError: () => toast.error("Error al abrir el portal de facturación"),
  });

  const checkoutMutation = useMutation({
    mutationFn: (planId: string) =>
      billingApi.createCheckout(
        planId,
        `${window.location.origin}/billing?upgraded=1`,
        `${window.location.origin}/billing`
      ).then((r) => r.data),
    onSuccess: (data) => {
      window.location.href = data.url;
    },
    onError: () => toast.error("Error al iniciar el proceso de pago"),
  });

  if (isLoading) {
    return (
      <div className="p-8 max-w-3xl mx-auto space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="card-stripe h-32 shimmer" />
        ))}
      </div>
    );
  }

  const plan       = sub?.plan ?? "trial";
  const status     = sub?.status ?? "trialing";
  const limits     = sub?.limits ?? {};
  const usage      = sub?.usage ?? { conversations: 0, leads: 0 };
  const trialEnd   = sub?.trial_ends_at ? new Date(sub.trial_ends_at) : null;
  const periodEnd  = sub?.current_period_end ? new Date(sub.current_period_end) : null;
  const daysLeft   = trialEnd
    ? Math.max(0, Math.ceil((trialEnd.getTime() - Date.now()) / 86400000))
    : null;

  const isTrialing = status === "trialing";
  const isPastDue  = status === "past_due";
  const isCanceled = status === "canceled";

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <PageHeader
        title="Facturación"
        subtitle="Gestiona tu plan y método de pago"
      />

      <div className="space-y-5">

        {/* ── Trial / Warning banner ── */}
        {isTrialing && daysLeft !== null && daysLeft <= 7 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200"
          >
            <AlertTriangle size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-800">
                Tu trial termina en {daysLeft} día{daysLeft !== 1 ? "s" : ""}
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                Elige un plan para no perder el acceso a tus agentes y datos.
              </p>
            </div>
          </motion.div>
        )}

        {isPastDue && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200"
          >
            <AlertTriangle size={16} className="text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-800">Pago fallido</p>
              <p className="text-xs text-red-700 mt-0.5">
                Actualiza tu método de pago para reactivar tus agentes.
              </p>
            </div>
            <button
              onClick={() => portalMutation.mutate()}
              className="ml-auto text-xs font-semibold text-red-700 hover:text-red-900 underline whitespace-nowrap"
            >
              Actualizar pago
            </button>
          </motion.div>
        )}

        {/* ── Current plan card ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-stripe p-6"
        >
          <div className="flex items-start justify-between mb-5">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-2">
                Plan actual
              </p>
              <div className="flex items-center gap-3">
                <span className={`text-2xl font-bold ${plan === "enterprise" ? "text-amber-600" : "text-foreground"}`}>
                  {PLAN_LABELS[plan] ?? plan}
                </span>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${PLAN_COLORS[plan] ?? ""}`}>
                  {PLAN_LABELS[plan]}
                </span>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${STATUS_COLORS[status] ?? ""}`}>
                  {STATUS_LABELS[status] ?? status}
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-foreground">
                ${sub?.price_usd ?? 0}
                <span className="text-sm font-normal text-muted-foreground">/mes</span>
              </p>
              {periodEnd && (
                <p className="text-xs text-muted-foreground mt-1">
                  Próximo cobro: {periodEnd.toLocaleDateString("es-MX", { day: "numeric", month: "short" })}
                </p>
              )}
              {isTrialing && daysLeft !== null && (
                <div className="flex items-center gap-1 justify-end mt-1">
                  <Clock size={11} className="text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">
                    Trial: {daysLeft} días restantes
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Usage */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
            <UsageBar
              label="Conversaciones"
              used={usage.conversations}
              limit={limits.conversations_per_month ?? 100}
              icon={MessageSquare}
            />
            <UsageBar
              label="Leads"
              used={usage.leads}
              limit={limits.leads_per_month ?? 50}
              icon={Users}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {sub?.stripe_customer_id && !isCanceled && (
              <button
                onClick={() => portalMutation.mutate()}
                disabled={portalMutation.isPending}
                className="btn-secondary flex items-center gap-2 text-sm py-2"
              >
                <CreditCard size={14} />
                {portalMutation.isPending ? "Abriendo..." : "Gestionar facturación"}
                <ArrowUpRight size={13} />
              </button>
            )}
          </div>
        </motion.div>

        {/* ── Upgrade plans ── */}
        {plan !== "enterprise" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="card-stripe p-6"
          >
            <div className="flex items-center gap-2 mb-5">
              <TrendingUp size={16} className="text-muted-foreground" />
              <p className="font-semibold text-foreground">
                {isTrialing || plan === "trial" ? "Elige tu plan" : "Cambia de plan"}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(plans ?? []).map((p: { id: string; price: number; limits: Record<string, number | string[]> }) => {
                const isCurrent = p.id === plan;
                const isHighlight = p.id === "pro";

                return (
                  <div
                    key={p.id}
                    className={`relative p-5 rounded-xl border transition-all ${
                      isHighlight
                        ? "border-primary bg-primary/5"
                        : isCurrent
                          ? "border-green-300 bg-green-50/50"
                          : "border-border hover:border-primary/40"
                    }`}
                  >
                    {isHighlight && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span className="px-3 py-0.5 bg-primary text-white text-[10px] font-bold rounded-full">
                          RECOMENDADO
                        </span>
                      </div>
                    )}

                    <div className="mb-3">
                      <p className="font-bold text-foreground">{PLAN_LABELS[p.id] ?? p.id}</p>
                      <p className="text-xl font-bold text-foreground mt-1">
                        ${p.price}
                        <span className="text-sm font-normal text-muted-foreground">/mes</span>
                      </p>
                    </div>

                    <ul className="space-y-1.5 mb-4">
                      {[
                        p.limits.conversations_per_month === -1
                          ? "Conversaciones ilimitadas"
                          : `${p.limits.conversations_per_month} conversaciones`,
                        p.limits.leads_per_month === -1
                          ? "Leads ilimitados"
                          : `${p.limits.leads_per_month} leads`,
                        `${p.limits.agents === -1 ? "∞" : p.limits.agents} agentes IA`,
                        `${(p.limits.channels as string[]).length} canal${(p.limits.channels as string[]).length !== 1 ? "es" : ""}`,
                      ].map((feat) => (
                        <li key={feat} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Check size={11} className="text-primary flex-shrink-0" />
                          {feat}
                        </li>
                      ))}
                    </ul>

                    {isCurrent ? (
                      <div className="flex items-center gap-1.5 justify-center py-2 text-xs font-semibold text-green-700">
                        <Check size={13} /> Plan actual
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          if (p.id === "enterprise") {
                            window.open("mailto:ventas@agenteventas.ai?subject=Enterprise");
                          } else {
                            checkoutMutation.mutate(p.id);
                          }
                        }}
                        disabled={checkoutMutation.isPending}
                        className={`w-full py-2 rounded-xl text-xs font-semibold transition-all ${
                          isHighlight
                            ? "btn-primary"
                            : "border border-border hover:border-primary/60 text-foreground hover:bg-secondary"
                        }`}
                      >
                        {checkoutMutation.isPending
                          ? "Procesando..."
                          : p.id === "enterprise"
                            ? "Hablar con ventas"
                            : `Cambiar a ${PLAN_LABELS[p.id]}`}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <p className="text-xs text-muted-foreground mt-4 text-center">
              14 días de prueba gratis. Cancela cuando quieras. Pago seguro con Stripe.
            </p>
          </motion.div>
        )}

        {/* ── Features summary ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16 }}
          className="card-stripe p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <Zap size={15} className="text-violet-500" />
            <p className="font-semibold text-foreground">Incluido en tu plan</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: `${limits.conversations_per_month === -1 ? "∞" : limits.conversations_per_month} conversaciones/mes`, ok: true },
              { label: `${limits.agents === -1 ? "∞" : limits.agents} agentes IA`, ok: true },
              { label: `${limits.team_members === -1 ? "∞" : limits.team_members} usuarios`, ok: true },
              { label: "Canal Webchat", ok: (limits.channels as string[] ?? []).includes("webchat") },
              { label: "WhatsApp Business", ok: (limits.channels as string[] ?? []).includes("whatsapp") },
              { label: "Instagram", ok: (limits.channels as string[] ?? []).includes("instagram") },
            ].map((item) => (
              <div key={item.label} className={`flex items-center gap-2 text-sm ${item.ok ? "text-foreground" : "text-muted-foreground/50"}`}>
                <Check size={13} className={item.ok ? "text-primary" : "text-muted-foreground/30"} />
                {item.label}
              </div>
            ))}
          </div>
        </motion.div>

      </div>
    </div>
  );
}
