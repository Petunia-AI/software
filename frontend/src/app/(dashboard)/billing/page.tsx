"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { billingApi } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import {
  CreditCard, Zap, Check, ArrowUpRight, AlertTriangle,
  Clock, TrendingUp, MessageSquare, Users, Shield,
  Lock, Plus, ChevronRight, Sparkles, Star,
  RefreshCw, X,
} from "lucide-react";

// ── Stripe init ─────────────────────────────────────────────────────────────
const STRIPE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = STRIPE_KEY ? loadStripe(STRIPE_KEY) : null;

const PLAN_LABELS: Record<string, string> = {
  trial:      "Trial",
  starter:    "Starter",
  pro:        "Pro",
  enterprise: "Enterprise",
};

const PLAN_GRADIENT: Record<string, string> = {
  trial:      "from-slate-500 to-gray-600",
  starter:    "from-blue-500 to-blue-600",
  pro:        "from-violet-600 to-purple-700",
  enterprise: "from-amber-500 to-orange-600",
};

const STATUS_CONFIG: Record<string, { label: string; dot: string }> = {
  trialing: { label: "En prueba",       dot: "bg-blue-400" },
  active:   { label: "Activo",          dot: "bg-emerald-400" },
  past_due: { label: "Pago pendiente",  dot: "bg-red-400" },
  canceled: { label: "Cancelado",       dot: "bg-gray-400" },
  paused:   { label: "Pausado",         dot: "bg-amber-400" },
};

// ── Usage bar ───────────────────────────────────────────────────────────────
function UsageBar({ label, used, limit, icon: Icon, barColor = "bg-primary" }: {
  label: string; used: number; limit: number; icon: React.ElementType; barColor?: string;
}) {
  const isUnlimited = limit === -1;
  const pct         = isUnlimited ? 0 : Math.min(100, Math.round((used / limit) * 100));
  const isCritical  = pct > 95 && !isUnlimited;
  const isWarning   = pct > 80 && !isUnlimited;

  return (
    <div className="p-4 rounded-xl bg-secondary/50 border border-border">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
            isCritical ? "bg-red-100" : isWarning ? "bg-amber-100" : "bg-primary/10"
          }`}>
            <Icon size={12} className={isCritical ? "text-red-600" : isWarning ? "text-amber-600" : "text-primary"} />
          </div>
          <span className="text-sm font-medium text-foreground">{label}</span>
        </div>
        <span className={`text-xs font-bold tabular-nums ${
          isCritical ? "text-red-600" : isWarning ? "text-amber-600" : "text-muted-foreground"
        }`}>
          {isUnlimited
            ? <span className="text-primary font-semibold">∞ ilimitado</span>
            : `${used.toLocaleString()} / ${limit.toLocaleString()}`}
        </span>
      </div>
      {!isUnlimited && (
        <>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className={`h-full rounded-full ${isCritical ? "bg-red-500" : isWarning ? "bg-amber-500" : barColor}`}
            />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5">{pct}% utilizado</p>
        </>
      )}
    </div>
  );
}

// ── Card form (Stripe) ───────────────────────────────────────────────────────
function CardForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const stripe      = useStripe();
  const elements    = useElements();
  const queryClient = useQueryClient();
  const [loading, setLoading]           = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [initError, setInitError]       = useState<string | null>(null);

  useEffect(() => {
    if (!STRIPE_KEY) {
      setInitError("Stripe no está configurado aún. Agrega NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.");
      return;
    }
    billingApi.createSetupIntent()
      .then((r) => setClientSecret(r.data.client_secret))
      .catch(() => setInitError("No se pudo conectar con Stripe. Intenta de nuevo."));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements || !clientSecret) return;
    setLoading(true);

    const cardEl = elements.getElement(CardElement);
    if (!cardEl) { setLoading(false); return; }

    const { error, setupIntent } = await stripe.confirmCardSetup(clientSecret, {
      payment_method: { card: cardEl },
    });

    if (error) {
      toast.error(error.message ?? "Error al guardar la tarjeta");
      setLoading(false);
      return;
    }

    if (setupIntent?.payment_method) {
      try {
        await billingApi.attachPaymentMethod(setupIntent.payment_method as string);
        await queryClient.invalidateQueries({ queryKey: ["payment-method"] });
        toast.success("Tarjeta guardada correctamente 🎉");
        onSuccess();
      } catch {
        toast.error("Error al confirmar la tarjeta");
      }
    }
    setLoading(false);
  };

  return (
    <motion.form
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      onSubmit={handleSubmit}
      className="space-y-4"
    >
      {initError ? (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800">
          {initError}
        </div>
      ) : (
        <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 focus-within:border-primary transition-colors">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: "15px",
                  color: "hsl(220,9%,15%)",
                  fontFamily: "Inter, system-ui, sans-serif",
                  "::placeholder": { color: "hsl(220,9%,65%)" },
                },
                invalid: { color: "#ef4444" },
              },
              hidePostalCode: true,
            }}
          />
        </div>
      )}

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Lock size={11} className="text-emerald-500 flex-shrink-0" />
        Datos cifrados con SSL · PCI DSS Compliant · Powered by Stripe
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading || !clientSecret}
          className="btn-primary flex items-center justify-center gap-2 text-sm py-2.5 flex-1"
        >
          {loading
            ? <><RefreshCw size={14} className="animate-spin" /> Guardando...</>
            : <><CreditCard size={14} /> Guardar tarjeta</>}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="btn-secondary text-sm py-2.5 px-4 flex items-center"
        >
          <X size={14} />
        </button>
      </div>
    </motion.form>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function BillingPage() {
  const [showCardForm, setShowCardForm] = useState(false);
  // Client-only date values to avoid SSR hydration mismatch
  const [daysLeft, setDaysLeft]     = useState<number | null>(null);
  const [periodStr, setPeriodStr]   = useState<string | null>(null);
  const [mounted, setMounted]       = useState(false);

  const { data: sub, isLoading } = useQuery({
    queryKey: ["subscription"],
    queryFn: () => billingApi.getSubscription().then((r) => r.data),
  });

  const { data: plans } = useQuery({
    queryKey: ["plans"],
    queryFn: () => billingApi.getPlans().then((r) => r.data),
  });

  const { data: cardInfo, refetch: refetchCard } = useQuery({
    queryKey: ["payment-method"],
    queryFn: () => billingApi.getPaymentMethod().then((r) => r.data),
  });

  const portalMutation = useMutation({
    mutationFn: () =>
      billingApi.createPortalSession(window.location.href).then((r) => r.data),
    onSuccess: (data) => { window.location.href = data.url; },
    onError: () => toast.error("Error al abrir el portal de facturación"),
  });

  const checkoutMutation = useMutation({
    mutationFn: (planId: string) =>
      billingApi.createCheckout(
        planId,
        `${window.location.origin}/billing?upgraded=1`,
        `${window.location.origin}/billing`
      ).then((r) => r.data),
    onSuccess: (data) => { window.location.href = data.url; },
    onError: () => toast.error("Error al iniciar el proceso de pago"),
  });

  // Calculate date-dependent values client-side only to avoid SSR hydration mismatch
  useEffect(() => {
    setMounted(true);
    if (sub?.trial_ends_at) {
      const trialEnd = new Date(sub.trial_ends_at);
      setDaysLeft(Math.max(0, Math.ceil((trialEnd.getTime() - Date.now()) / 86400000)));
    }
    if (sub?.current_period_end) {
      const periodEnd = new Date(sub.current_period_end);
      setPeriodStr(periodEnd.toLocaleDateString("es-MX", { day: "numeric", month: "long" }));
    }
  }, [sub]);

  if (isLoading || !mounted) {
    return (
      <div className="p-8 max-w-[1280px] mx-auto space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-2xl h-36 animate-pulse bg-secondary" />
        ))}
      </div>
    );
  }

  const plan   = sub?.plan ?? "trial";
  const status = sub?.status ?? "trialing";
  const limits = sub?.limits ?? {};
  const usage  = sub?.usage ?? { conversations: 0, leads: 0 };

  const statusConf = STATUS_CONFIG[status] ?? STATUS_CONFIG.trialing;

  return (
    <Elements stripe={stripePromise}>
      <div className="p-8 max-w-[1280px] mx-auto space-y-5">

        {/* ── Alert banners ── */}
        <AnimatePresence>
          {status === "trialing" && daysLeft !== null && daysLeft <= 7 && (
            <motion.div
              key="trial-warn"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200"
            >
              <AlertTriangle size={16} className="text-amber-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-800">
                  Tu trial termina en {daysLeft} día{daysLeft !== 1 ? "s" : ""}
                </p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Elige un plan para mantener acceso a tus agentes IA y todos tus datos.
                </p>
              </div>
            </motion.div>
          )}
          {status === "past_due" && (
            <motion.div
              key="past-due"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200"
            >
              <AlertTriangle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-800">Pago fallido</p>
                <p className="text-xs text-red-700 mt-0.5">
                  Actualiza tu método de pago para reactivar tus agentes.
                </p>
              </div>
              <button
                onClick={() => portalMutation.mutate()}
                className="text-xs font-bold text-red-700 hover:text-red-900 underline whitespace-nowrap flex items-center gap-1"
              >
                Actualizar <ArrowUpRight size={11} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Hero plan card ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl border border-border"
          style={{ boxShadow: "0 4px 30px rgba(0,0,0,0.07)" }}
        >
          {/* Gradient header */}
          <div className={`relative overflow-hidden bg-gradient-to-br ${PLAN_GRADIENT[plan] ?? PLAN_GRADIENT.trial} px-8 py-8`}>
            <div className="absolute -top-10 -right-10 w-52 h-52 rounded-full bg-white/10 pointer-events-none" />
            <div className="absolute bottom-0 left-1/3 w-32 h-32 rounded-full bg-white/5 translate-y-1/2 pointer-events-none" />
            <div className="relative flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-white/20 text-white">
                    <span className={`w-1.5 h-1.5 rounded-full ${statusConf.dot} animate-pulse`} />
                    {statusConf.label}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <h2 className="text-3xl font-black text-white">{PLAN_LABELS[plan] ?? plan}</h2>
                  {plan === "pro" && <Star size={18} className="text-yellow-300 fill-yellow-300" />}
                </div>
                <p className="text-white/60 text-sm mt-2">
                  {plan === "trial"
                    ? "Acceso completo durante el período de prueba"
                    : plan === "starter"
                      ? "Perfecto para empezar a escalar"
                      : plan === "pro"
                        ? "El plan más popular — todas las funcionalidades"
                        : "Acceso total sin límites"}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-4xl font-black text-white tabular-nums">
                  ${sub?.price_usd ?? 0}
                  <span className="text-base font-normal text-white/60">/mes</span>
                </p>
                {periodStr && (
                  <p className="text-xs text-white/55 mt-1.5 flex items-center gap-1 justify-end">
                    <Clock size={10} />
                    Renueva {periodStr}
                  </p>
                )}
                {status === "trialing" && daysLeft !== null && (
                  <p className="text-xs text-white/55 mt-1 flex items-center gap-1 justify-end">
                    <Clock size={10} />
                    {daysLeft} días de trial restantes
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* White card body */}
          <div className="bg-white px-8 py-6">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3">
              Uso este período
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              <UsageBar
                label="Conversaciones"
                used={usage.conversations}
                limit={limits.conversations_per_month ?? 100}
                icon={MessageSquare}
                barColor="bg-violet-500"
              />
              <UsageBar
                label="Leads"
                used={usage.leads}
                limit={limits.leads_per_month ?? 50}
                icon={Users}
                barColor="bg-blue-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {sub?.stripe_customer_id && status !== "canceled" && (
                <button
                  onClick={() => portalMutation.mutate()}
                  disabled={portalMutation.isPending}
                  className="btn-secondary flex items-center gap-2 text-sm"
                >
                  <CreditCard size={14} />
                  {portalMutation.isPending ? "Abriendo..." : "Portal de facturación"}
                  <ArrowUpRight size={13} className="opacity-60" />
                </button>
              )}
              {plan !== "enterprise" && (
                <button
                  onClick={() => document.getElementById("plans-section")?.scrollIntoView({ behavior: "smooth" })}
                  className="flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  <TrendingUp size={13} />
                  Cambiar plan
                  <ChevronRight size={12} />
                </button>
              )}
            </div>
          </div>
        </motion.div>

        {/* ── Payment method ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06 }}
          className="card-stripe p-6"
        >
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm">
                <CreditCard size={15} className="text-white" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Método de pago</p>
                <p className="text-xs text-muted-foreground">Para pagos recurrentes automáticos</p>
              </div>
            </div>
            {cardInfo?.has_card && !showCardForm && (
              <button
                onClick={() => setShowCardForm(true)}
                className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
              >
                <Plus size={12} /> Cambiar tarjeta
              </button>
            )}
          </div>

          <AnimatePresence mode="wait">
            {showCardForm ? (
              <CardForm
                key="form"
                onSuccess={() => { setShowCardForm(false); refetchCard(); }}
                onCancel={() => setShowCardForm(false)}
              />
            ) : cardInfo?.has_card ? (
              <motion.div
                key="card-saved"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200"
              >
                <div className="w-14 h-10 rounded-lg bg-white border border-emerald-200 flex items-center justify-center text-2xl shadow-sm flex-shrink-0">
                  💳
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground capitalize">
                    {cardInfo.brand} •••• {cardInfo.last4}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Vence {String(cardInfo.exp_month).padStart(2, "0")}/{cardInfo.exp_year}
                  </p>
                </div>
                <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
                  <Check size={11} /> Predeterminada
                </span>
              </motion.div>
            ) : (
              <motion.div key="no-card" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                <div className="flex items-center gap-3 p-4 rounded-xl border border-dashed border-border bg-secondary/30">
                  <CreditCard size={18} className="text-muted-foreground/40 flex-shrink-0" />
                  <p className="text-sm text-muted-foreground">
                    Sin tarjeta guardada. Agrega una para pagos automáticos.
                  </p>
                </div>
                <button
                  onClick={() => setShowCardForm(true)}
                  className="btn-primary flex items-center gap-2 text-sm"
                >
                  <Plus size={14} /> Agregar tarjeta de crédito
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Security badges */}
          <div className="flex flex-wrap items-center gap-4 mt-5 pt-5 border-t border-border">
            {[
              { icon: Lock,     label: "SSL 256-bit" },
              { icon: Shield,   label: "PCI DSS" },
              { icon: Sparkles, label: "Powered by Stripe" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Icon size={11} className="text-emerald-500" />
                {label}
              </div>
            ))}
          </div>
        </motion.div>

        {/* ── Plans grid ── */}
        {plan !== "enterprise" && (
          <motion.div
            id="plans-section"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="card-stripe p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm">
                <Zap size={15} className="text-white" />
              </div>
              <div>
                <p className="font-semibold text-foreground">
                  {plan === "trial" ? "Elige tu plan" : "Cambiar de plan"}
                </p>
                <p className="text-xs text-muted-foreground">Sin contratos · Cancela cuando quieras</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(plans ?? []).map((p: {
                id: string; name: string; price: number;
                limits: Record<string, number | string[]>;
                features?: string[];
              }) => {
                const isCurrent = p.id === plan;
                const isPopular = p.id === "pro";
                const headerGrads: Record<string, string> = {
                  starter:    "from-blue-500 to-blue-600",
                  pro:        "from-violet-600 to-purple-700",
                  enterprise: "from-amber-500 to-orange-600",
                };

                return (
                  <div
                    key={p.id}
                    className={`relative flex flex-col rounded-xl border overflow-hidden transition-all ${
                      isPopular
                        ? "border-primary shadow-lg shadow-primary/15 scale-[1.02]"
                        : isCurrent
                          ? "border-emerald-300 bg-emerald-50/20"
                          : "border-border hover:border-primary/40 hover:shadow-md"
                    }`}
                  >
                    {isPopular && (
                      <div className="absolute -top-px inset-x-0 h-0.5 bg-gradient-to-r from-violet-500 to-purple-600" />
                    )}
                    {isPopular && (
                      <div className="absolute top-3 right-3">
                        <span className="px-2 py-0.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white text-[9px] font-black rounded-full tracking-wider uppercase">
                          ✦ Popular
                        </span>
                      </div>
                    )}

                    {/* Card header */}
                    <div className={`p-5 ${headerGrads[p.id] ? `bg-gradient-to-br ${headerGrads[p.id]}` : "bg-secondary/50"}`}>
                      <p className={`font-bold text-base ${headerGrads[p.id] ? "text-white" : "text-foreground"}`}>
                        {PLAN_LABELS[p.id] ?? p.id}
                      </p>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className={`text-3xl font-black ${headerGrads[p.id] ? "text-white" : "text-foreground"}`}>
                          ${p.price}
                        </span>
                        <span className={`text-sm ${headerGrads[p.id] ? "text-white/65" : "text-muted-foreground"}`}>
                          /mes
                        </span>
                      </div>
                    </div>

                    {/* Features */}
                    <div className="p-5 flex-1 flex flex-col bg-white">
                      <ul className="space-y-2 mb-5 flex-1">
                        {[
                          p.limits.conversations_per_month === -1
                            ? "Conversaciones ilimitadas"
                            : `${(p.limits.conversations_per_month as number).toLocaleString()} conversaciones/mes`,
                          p.limits.leads_per_month === -1
                            ? "Leads ilimitados"
                            : `${(p.limits.leads_per_month as number).toLocaleString()} leads/mes`,
                          `${p.limits.agents === -1 ? "∞" : p.limits.agents} agentes IA`,
                          `${p.limits.team_members === -1 ? "∞" : p.limits.team_members} usuarios del equipo`,
                          `${(p.limits.channels as string[]).length} canal${(p.limits.channels as string[]).length !== 1 ? "es" : ""}`,
                          ...(p.features ?? []),
                        ].map((feat) => (
                          <li key={feat} className="flex items-start gap-2 text-xs text-muted-foreground">
                            <Check size={11} className="text-primary flex-shrink-0 mt-0.5" />
                            {feat}
                          </li>
                        ))}
                      </ul>

                      {isCurrent ? (
                        <div className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
                          <Check size={12} /> Plan actual
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            if (p.id === "enterprise") {
                              window.open("mailto:ventas@aipetunia.com?subject=Enterprise");
                            } else {
                              checkoutMutation.mutate(p.id);
                            }
                          }}
                          disabled={checkoutMutation.isPending}
                          className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all ${
                            isPopular
                              ? "bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:from-violet-700 hover:to-purple-700 shadow-sm hover:shadow-md"
                              : "border border-border hover:border-primary/50 text-foreground hover:bg-secondary"
                          }`}
                        >
                          {checkoutMutation.isPending ? "Procesando..." :
                           p.id === "enterprise" ? "Hablar con ventas" :
                           `Activar ${PLAN_LABELS[p.id]}`}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-5 mt-5 pt-4 border-t border-border">
              {[
                { icon: Shield,   label: "Pagos 100% seguros" },
                { icon: RefreshCw, label: "Cancela cuando quieras" },
                { icon: Lock,     label: "SSL + PCI DSS" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Icon size={11} className="text-muted-foreground/50" />
                  {label}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Included features ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          className="card-stripe p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={15} className="text-violet-500" />
            <p className="font-semibold text-foreground">Incluido en tu plan</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {[
              { label: `${limits.conversations_per_month === -1 ? "∞" : limits.conversations_per_month} conversaciones`, ok: true },
              { label: `${limits.agents === -1 ? "∞" : limits.agents} agentes IA`, ok: true },
              { label: `${limits.team_members === -1 ? "∞" : limits.team_members} usuarios`, ok: true },
              { label: "Canal Webchat", ok: (limits.channels as string[] ?? []).includes("webchat") },
              { label: "WhatsApp Business", ok: (limits.channels as string[] ?? []).includes("whatsapp") },
              { label: "Instagram DM", ok: (limits.channels as string[] ?? []).includes("instagram") },
            ].map((item) => (
              <div
                key={item.label}
                className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-medium transition-all ${
                  item.ok
                    ? "border-primary/20 bg-primary/5 text-foreground"
                    : "border-border bg-secondary/20 text-muted-foreground/40"
                }`}
              >
                <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
                  item.ok ? "bg-primary/15" : "bg-border"
                }`}>
                  {item.ok
                    ? <Check size={9} className="text-primary" />
                    : <X size={9} className="text-muted-foreground/30" />}
                </div>
                {item.label}
              </div>
            ))}
          </div>
        </motion.div>

      </div>
    </Elements>
  );
}
