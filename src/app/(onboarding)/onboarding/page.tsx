"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Loader2,
  MessageSquare,
  Megaphone,
  Kanban,
  PartyPopper,
  Phone,
  Rocket,
  Shield,
  Sparkles,
  User,
  Users,
  Mic,
  Globe,
  Zap,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface BusinessProfile {
  name: string;
  businessType: string;
  markets: string[];
  buyerBudget: string;
}

interface WhatsAppConfig {
  metaBusinessId: string;
  phoneNumber: string;
  apiToken: string;
  connected: boolean;
  skipped: boolean;
}

interface LeadChannelConfig {
  adAccountId: string;
  accessToken: string;
  hasLeadForms: string;
  connected: boolean;
  skipped: boolean;
}

interface TikTokConfig {
  advertiserId: string;
  accessToken: string;
  connected: boolean;
}

interface CRMConfig {
  useDefaultPipeline: string;
  qualificationCriteria: string[];
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: "Perfil de Negocio", icon: User },
  { id: 2, label: "WhatsApp", icon: MessageSquare },
  { id: 3, label: "Canal de Leads", icon: Megaphone },
  { id: 4, label: "CRM Pipeline", icon: Kanban },
];

const MARKETS = ["Florida", "Texas", "California", "Arizona", "New York", "Otro"];

const BUDGET_OPTIONS = [
  { value: "100k-300k", label: "$100k - $300k" },
  { value: "300k-500k", label: "$300k - $500k" },
  { value: "500k-1m", label: "$500k - $1M" },
  { value: "1m+", label: "$1M+" },
];

const PIPELINE_STAGES = [
  { name: "New Lead", color: "bg-blue-500" },
  { name: "Qualified", color: "bg-[#4A154B]" },
  { name: "Showing Booked", color: "bg-amber-500" },
  { name: "Offer Made", color: "bg-orange-500" },
  { name: "Closed Won", color: "bg-emerald-500" },
  { name: "Closed Lost", color: "bg-red-500" },
];

const QUALIFICATION_CRITERIA = [
  { id: "budget", label: "Presupuesto confirmado", points: 20 },
  { id: "timeline", label: "Timeline < 90 dias", points: 30 },
  { id: "property_type", label: "Tipo de propiedad definido", points: 15 },
  { id: "preapproval", label: "Pre-aprobacion de credito", points: 35 },
];

// ─── Shared card wrapper ─────────────────────────────────────────────────────

function StepCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.35)] overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-400">
      {children}
    </div>
  );
}

function StepHeader({ icon: Icon, iconColor, title, description }: {
  icon: React.ElementType;
  iconColor: string;
  title: string;
  description: string;
}) {
  return (
    <div className="px-8 pt-8 pb-2">
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-10 h-10 rounded-xl ${iconColor} flex items-center justify-center shadow-sm`}>
          <Icon className="size-5 text-white" />
        </div>
        <h2 className="text-xl font-bold text-[#1D1C1D]">{title}</h2>
      </div>
      <p className="text-[#616061] text-sm leading-relaxed ml-[52px]">{description}</p>
    </div>
  );
}

function StepBody({ children }: { children: React.ReactNode }) {
  return <div className="px-8 py-6 space-y-5">{children}</div>;
}

function StepFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-8 py-5 bg-[#F8F8F8] border-t border-[#EBEBEB] flex items-center justify-between">
      {children}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [completed, setCompleted] = useState(false);

  const [profile, setProfile] = useState<BusinessProfile>({
    name: "", businessType: "", markets: [], buyerBudget: "",
  });

  const [whatsapp, setWhatsapp] = useState<WhatsAppConfig>({
    metaBusinessId: "", phoneNumber: "", apiToken: "", connected: false, skipped: false,
  });

  const [leadChannel, setLeadChannel] = useState<LeadChannelConfig>({
    adAccountId: "", accessToken: "", hasLeadForms: "", connected: false, skipped: false,
  });

  const [tiktok, setTikTok] = useState<TikTokConfig>({
    advertiserId: "", accessToken: "", connected: false,
  });

  const [showTikTokForm, setShowTikTokForm] = useState(false);

  const [crm, setCRM] = useState<CRMConfig>({
    useDefaultPipeline: "default",
    qualificationCriteria: ["budget", "timeline", "property_type", "preapproval"],
  });

  // ─── Helpers ─────────────────────────────────────────────────────────────

  const progressPercent = completed ? 100 : ((currentStep - 1) / STEPS.length) * 100;

  const toggleMarket = useCallback((market: string) => {
    setProfile((prev) => ({
      ...prev,
      markets: prev.markets.includes(market)
        ? prev.markets.filter((m) => m !== market)
        : [...prev.markets, market],
    }));
  }, []);

  const toggleCriteria = useCallback((id: string) => {
    setCRM((prev) => ({
      ...prev,
      qualificationCriteria: prev.qualificationCriteria.includes(id)
        ? prev.qualificationCriteria.filter((c) => c !== id)
        : [...prev.qualificationCriteria, id],
    }));
  }, []);

  const saveProgress = useCallback(async (step: number, data: Record<string, unknown>) => {
    try {
      await fetch("/api/onboarding/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step, data }),
      });
    } catch { /* best-effort */ }
  }, []);

  const handleNext = useCallback(async () => {
    const apiStep = currentStep - 1;
    const stepDataMap: Record<number, Record<string, unknown>> = {
      0: { businessName: profile.name, businessType: profile.businessType, markets: profile.markets, buyerBudget: profile.buyerBudget },
      1: { whatsappConnected: whatsapp.connected, whatsappPhone: whatsapp.phoneNumber },
      2: { metaConnected: leadChannel.connected, metaAdAccountId: leadChannel.adAccountId, tiktokConnected: tiktok.connected, tiktokAdvertiserId: tiktok.advertiserId },
      3: { pipelineConfigured: true, pipelineStages: crm.useDefaultPipeline === "default" ? PIPELINE_STAGES.map(s => s.name) : null },
    };
    await saveProgress(apiStep, stepDataMap[apiStep]);
    if (currentStep < 4) setCurrentStep((s) => s + 1);
    else setCompleted(true);
  }, [currentStep, profile, whatsapp, leadChannel, crm, saveProgress]);

  const handleBack = useCallback(() => {
    if (currentStep > 1) setCurrentStep((s) => s - 1);
  }, [currentStep]);

  const connectWhatsApp = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/onboarding/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "whatsapp", data: { metaBusinessId: whatsapp.metaBusinessId, phoneNumber: whatsapp.phoneNumber, apiToken: whatsapp.apiToken } }),
      });
      if (res.ok) setWhatsapp((prev) => ({ ...prev, connected: true }));
    } catch { /* silently */ } finally { setIsLoading(false); }
  }, [whatsapp.metaBusinessId, whatsapp.phoneNumber, whatsapp.apiToken]);

  const connectMeta = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/onboarding/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "meta_ads", data: { adAccountId: leadChannel.adAccountId, accessToken: leadChannel.accessToken } }),
      });
      if (res.ok) setLeadChannel((prev) => ({ ...prev, connected: true }));
    } catch { /* silently */ } finally { setIsLoading(false); }
  }, [leadChannel.adAccountId, leadChannel.accessToken]);

  const connectTikTok = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/onboarding/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "tiktok", data: { advertiserId: tiktok.advertiserId, accessToken: tiktok.accessToken } }),
      });
      const result = await res.json();
      if (res.ok && result.valid) setTikTok((prev) => ({ ...prev, connected: true }));
    } catch { /* silently */ } finally { setIsLoading(false); }
  }, [tiktok.advertiserId, tiktok.accessToken]);

  // ─── Step 1: Perfil de Negocio ───────────────────────────────────────────

  const renderStep1 = () => (
    <StepCard>
      <StepHeader
        icon={User}
        iconColor="bg-[#4A154B]"
        title="Perfil de Negocio"
        description="Cuentanos sobre tu negocio inmobiliario para personalizar tu experiencia."
      />
      <StepBody>
        <div className="space-y-2">
          <Label className="text-[13px] font-semibold text-[#1D1C1D]">Tu nombre completo</Label>
          <Input
            placeholder="Ej. Maria Garcia"
            value={profile.name}
            onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
            className="h-11"
          />
        </div>

        <div className="space-y-3">
          <Label className="text-[13px] font-semibold text-[#1D1C1D]">Tipo de negocio</Label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { value: "individual", label: "Agente individual", icon: User },
              { value: "team", label: "Equipo (2-10)", icon: Users },
              { value: "brokerage", label: "Brokerage", icon: Building2 },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setProfile((p) => ({ ...p, businessType: option.value }))}
                className={`flex flex-col items-center gap-2.5 rounded-xl border-2 p-5 text-sm transition-all duration-200 cursor-pointer hover:shadow-md hover:-translate-y-0.5 ${
                  profile.businessType === option.value
                    ? "border-[#4A154B] bg-[#F9F0FA] shadow-[0_0_0_1px_#4A154B]"
                    : "border-[#E8D5E0] bg-white hover:border-[#D4B5D6]"
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  profile.businessType === option.value ? "bg-[#4A154B] text-white" : "bg-[#F4EDE4] text-[#616061]"
                }`}>
                  <option.icon className="size-5" />
                </div>
                <span className={`font-semibold text-center text-[13px] ${
                  profile.businessType === option.value ? "text-[#4A154B]" : "text-[#1D1C1D]"
                }`}>{option.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <Label className="text-[13px] font-semibold text-[#1D1C1D]">Mercados donde operas</Label>
          <div className="flex flex-wrap gap-2">
            {MARKETS.map((market) => (
              <button
                key={market}
                type="button"
                onClick={() => toggleMarket(market)}
                className={`rounded-full px-4 py-2 text-[13px] font-medium transition-all duration-200 cursor-pointer border ${
                  profile.markets.includes(market)
                    ? "bg-[#4A154B] text-white border-[#4A154B] shadow-sm"
                    : "bg-white text-[#616061] border-[#E8D5E0] hover:border-[#D4B5D6] hover:bg-[#F9F0FA]"
                }`}
              >
                {profile.markets.includes(market) && <Check className="size-3.5 inline mr-1.5 -mt-0.5" />}
                {market}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <Label className="text-[13px] font-semibold text-[#1D1C1D]">Presupuesto promedio de compradores</Label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {BUDGET_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setProfile((p) => ({ ...p, buyerBudget: opt.value }))}
                className={`rounded-xl border-2 px-3 py-3 text-[13px] font-semibold transition-all duration-200 cursor-pointer ${
                  profile.buyerBudget === opt.value
                    ? "border-[#4A154B] bg-[#F9F0FA] text-[#4A154B] shadow-sm"
                    : "border-[#E8D5E0] bg-white text-[#1D1C1D] hover:border-[#D4B5D6]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </StepBody>
      <StepFooter>
        <div />
        <Button size="lg" onClick={handleNext} disabled={!profile.name || !profile.businessType} className="h-11 px-6">
          Continuar
          <ArrowRight className="size-4 ml-1.5" data-icon="inline-end" />
        </Button>
      </StepFooter>
    </StepCard>
  );

  // ─── Step 2: WhatsApp Business ───────────────────────────────────────────

  const renderStep2 = () => (
    <StepCard>
      <StepHeader
        icon={MessageSquare}
        iconColor="bg-emerald-600"
        title="WhatsApp Business"
        description="Conecta tu WhatsApp Business para automatizar la comunicacion con tus leads. El 78% de los leads inmobiliarios prefieren WhatsApp."
      />
      <StepBody>
        {whatsapp.connected ? (
          <div className="flex items-center gap-4 rounded-xl border-2 border-emerald-300 bg-emerald-50 p-5 animate-in fade-in zoom-in-95 duration-300">
            <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0">
              <CheckCircle2 className="size-6 text-white" />
            </div>
            <div>
              <p className="font-bold text-emerald-800 text-[15px]">WhatsApp conectado</p>
              <p className="text-sm text-emerald-600 mt-0.5">
                Tu numero {whatsapp.phoneNumber} esta listo para recibir mensajes.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="rounded-xl border border-[#E8D5E0] bg-[#F9F0FA] p-4 text-sm text-[#616061] flex items-start gap-3">
              <Shield className="size-5 mt-0.5 shrink-0 text-[#4A154B]" />
              <p>Necesitas una cuenta de <strong className="text-[#1D1C1D]">Meta Business verificada</strong>. Tus credenciales se almacenan de forma segura y encriptada.</p>
            </div>

            <div className="space-y-2">
              <Label className="text-[13px] font-semibold text-[#1D1C1D]">Meta Business Account ID</Label>
              <Input placeholder="Ej. 123456789012345" value={whatsapp.metaBusinessId}
                onChange={(e) => setWhatsapp((w) => ({ ...w, metaBusinessId: e.target.value }))} className="h-11" />
            </div>

            <div className="space-y-2">
              <Label className="text-[13px] font-semibold text-[#1D1C1D]">Numero de WhatsApp</Label>
              <div className="flex gap-2">
                <div className="flex items-center rounded-xl border border-[#D4B5D6] bg-[#F9F0FA] px-4 text-sm text-[#616061] font-medium shrink-0">+1</div>
                <Input placeholder="(555) 123-4567" value={whatsapp.phoneNumber}
                  onChange={(e) => setWhatsapp((w) => ({ ...w, phoneNumber: e.target.value }))} className="h-11" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[13px] font-semibold text-[#1D1C1D]">API Token</Label>
              <Input type="password" placeholder="Tu token de acceso de WhatsApp Business API" value={whatsapp.apiToken}
                onChange={(e) => setWhatsapp((w) => ({ ...w, apiToken: e.target.value }))} className="h-11" />
            </div>

            <Button size="lg" className="w-full h-12"
              onClick={connectWhatsApp}
              disabled={isLoading || !whatsapp.metaBusinessId || !whatsapp.phoneNumber || !whatsapp.apiToken}>
              {isLoading ? <><Loader2 className="size-4 animate-spin mr-2" />Conectando...</>
                : <><Phone className="size-4 mr-2" />Conectar WhatsApp</>}
            </Button>
          </>
        )}
      </StepBody>
      <StepFooter>
        <Button variant="ghost" size="lg" onClick={handleBack} className="h-11">
          <ArrowLeft className="size-4 mr-1.5" data-icon="inline-start" />Atras
        </Button>
        <div className="flex gap-2">
          {!whatsapp.connected && (
            <Button variant="outline" size="lg" className="h-11"
              onClick={() => { setWhatsapp((w) => ({ ...w, skipped: true })); handleNext(); }}>
              Saltar por ahora
            </Button>
          )}
          <Button size="lg" onClick={handleNext} disabled={!whatsapp.connected && !whatsapp.skipped} className="h-11 px-6">
            Continuar<ArrowRight className="size-4 ml-1.5" data-icon="inline-end" />
          </Button>
        </div>
      </StepFooter>
    </StepCard>
  );

  // ─── Step 3: Canal de Leads ──────────────────────────────────────────────

  const renderStep3 = () => (
    <StepCard>
      <StepHeader
        icon={Megaphone}
        iconColor="bg-blue-600"
        title="Canal de Leads"
        description="Conecta tu cuenta de Meta Ads para capturar leads automaticamente desde Facebook e Instagram."
      />
      <StepBody>
        {leadChannel.connected ? (
          <div className="flex items-center gap-4 rounded-xl border-2 border-blue-300 bg-blue-50 p-5 animate-in fade-in zoom-in-95 duration-300">
            <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center shrink-0">
              <CheckCircle2 className="size-6 text-white" />
            </div>
            <div>
              <p className="font-bold text-blue-800 text-[15px]">Meta Ads conectado</p>
              <p className="text-sm text-blue-600 mt-0.5">Tu cuenta de ads esta lista para capturar leads.</p>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              <p className="text-[13px] font-semibold text-[#1D1C1D]">Opcion 1: Conexion rapida</p>
              <button
                onClick={() => window.open("https://www.facebook.com/v18.0/dialog/oauth", "_blank")}
                className="w-full h-12 rounded-xl bg-[#1877F2] hover:bg-[#166FE5] text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
              >
                <ExternalLink className="size-4" />
                Conectar con Facebook OAuth
              </button>
            </div>

            <div className="flex items-center gap-4">
              <div className="h-px flex-1 bg-[#E8D5E0]" />
              <span className="text-xs text-[#616061] font-medium">O configuracion manual</span>
              <div className="h-px flex-1 bg-[#E8D5E0]" />
            </div>

            <div className="space-y-4">
              <p className="text-[13px] font-semibold text-[#1D1C1D]">Opcion 2: Configuracion manual</p>
              <div className="space-y-2">
                <Label className="text-[13px] font-semibold text-[#1D1C1D]">Ad Account ID</Label>
                <Input placeholder="Ej. act_123456789" value={leadChannel.adAccountId}
                  onChange={(e) => setLeadChannel((l) => ({ ...l, adAccountId: e.target.value }))} className="h-11" />
              </div>
              <div className="space-y-2">
                <Label className="text-[13px] font-semibold text-[#1D1C1D]">Access Token</Label>
                <Input type="password" placeholder="Tu token de acceso de Meta" value={leadChannel.accessToken}
                  onChange={(e) => setLeadChannel((l) => ({ ...l, accessToken: e.target.value }))} className="h-11" />
              </div>

              <div className="space-y-3">
                <Label className="text-[13px] font-semibold text-[#1D1C1D]">Ya tienes Lead Forms configurados?</Label>
                <div className="flex gap-3">
                  {[
                    { value: "yes", label: "Si, ya tengo" },
                    { value: "no", label: "No, ayudame a crear uno" },
                  ].map((opt) => (
                    <button key={opt.value} type="button"
                      onClick={() => setLeadChannel((l) => ({ ...l, hasLeadForms: opt.value }))}
                      className={`flex-1 rounded-xl border-2 px-4 py-3 text-[13px] font-semibold transition-all duration-200 cursor-pointer ${
                        leadChannel.hasLeadForms === opt.value
                          ? "border-[#4A154B] bg-[#F9F0FA] text-[#4A154B]"
                          : "border-[#E8D5E0] bg-white text-[#1D1C1D] hover:border-[#D4B5D6]"
                      }`}
                    >{opt.label}</button>
                  ))}
                </div>
              </div>

              <Button size="lg" className="w-full h-12" onClick={connectMeta}
                disabled={isLoading || !leadChannel.adAccountId || !leadChannel.accessToken}>
                {isLoading ? <><Loader2 className="size-4 animate-spin mr-2" />Conectando...</>
                  : <><Megaphone className="size-4 mr-2" />Conectar Meta</>}
              </Button>
            </div>

            {/* TikTok Ads */}
            <div className="rounded-xl border-2 border-[#E8D5E0] bg-white p-5 space-y-4 transition-all duration-200">
              {tiktok.connected ? (
                <div className="flex items-center gap-4 rounded-xl border-2 border-emerald-300 bg-emerald-50 p-4 animate-in fade-in zoom-in-95 duration-300">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="size-5 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-emerald-800 text-[14px]">TikTok Ads conectado</p>
                    <p className="text-xs text-emerald-600 mt-0.5">Tu cuenta esta lista para capturar leads.</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center">
                        <span className="text-sm text-white font-bold">T</span>
                      </div>
                      <div>
                        <span className="text-[13px] font-semibold text-[#1D1C1D]">TikTok Ads</span>
                        <p className="text-xs text-[#616061]">Captura leads del publico mas joven</p>
                      </div>
                    </div>
                    <Button
                      variant={showTikTokForm ? "secondary" : "outline"}
                      size="sm"
                      onClick={() => setShowTikTokForm(!showTikTokForm)}
                      className="h-8 text-xs"
                    >
                      {showTikTokForm ? "Cerrar" : "Conectar"}
                    </Button>
                  </div>

                  {showTikTokForm && (
                    <div className="space-y-3 pt-2 border-t border-[#E8D5E0] animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="rounded-lg border border-[#E8D5E0] bg-[#F9F0FA] p-3 text-xs text-[#616061] flex items-start gap-2.5">
                        <Shield className="size-4 mt-0.5 shrink-0 text-[#4A154B]" />
                        <p>Necesitas una cuenta de <strong className="text-[#1D1C1D]">TikTok for Business</strong> con acceso al Marketing API.</p>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-[13px] font-semibold text-[#1D1C1D]">Advertiser ID</Label>
                        <Input placeholder="Ej. 7123456789012345678" value={tiktok.advertiserId}
                          onChange={(e) => setTikTok((t) => ({ ...t, advertiserId: e.target.value }))} className="h-10" />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-[13px] font-semibold text-[#1D1C1D]">Access Token</Label>
                        <Input type="password" placeholder="Tu token de acceso de TikTok Marketing API" value={tiktok.accessToken}
                          onChange={(e) => setTikTok((t) => ({ ...t, accessToken: e.target.value }))} className="h-10" />
                      </div>

                      <Button size="sm" className="w-full h-10" onClick={connectTikTok}
                        disabled={isLoading || !tiktok.advertiserId || !tiktok.accessToken}>
                        {isLoading ? <><Loader2 className="size-4 animate-spin mr-2" />Conectando...</>
                          : <>Conectar TikTok Ads</>}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </StepBody>
      <StepFooter>
        <Button variant="ghost" size="lg" onClick={handleBack} className="h-11">
          <ArrowLeft className="size-4 mr-1.5" data-icon="inline-start" />Atras
        </Button>
        <div className="flex gap-2">
          {!leadChannel.connected && (
            <Button variant="outline" size="lg" className="h-11"
              onClick={() => { setLeadChannel((l) => ({ ...l, skipped: true })); handleNext(); }}>
              Saltar por ahora
            </Button>
          )}
          <Button size="lg" onClick={handleNext} disabled={!leadChannel.connected && !leadChannel.skipped} className="h-11 px-6">
            Continuar<ArrowRight className="size-4 ml-1.5" data-icon="inline-end" />
          </Button>
        </div>
      </StepFooter>
    </StepCard>
  );

  // ─── Step 4: CRM Pipeline ───────────────────────────────────────────────

  const renderStep4 = () => {
    const totalPoints = QUALIFICATION_CRITERIA.filter((c) =>
      crm.qualificationCriteria.includes(c.id)
    ).reduce((sum, c) => sum + c.points, 0);

    return (
      <StepCard>
        <StepHeader
          icon={Kanban}
          iconColor="bg-[#4A154B]"
          title="CRM Pipeline"
          description="Configura las etapas de tu pipeline de ventas y los criterios de calificacion de leads."
        />
        <StepBody>
          <div className="space-y-3">
            <Label className="text-[13px] font-semibold text-[#1D1C1D]">Etapas del pipeline sugeridas</Label>
            <div className="flex flex-wrap gap-2">
              {PIPELINE_STAGES.map((stage, i) => (
                <div key={stage.name} className="flex items-center gap-1.5">
                  <div className="flex items-center gap-2 rounded-xl border border-[#E8D5E0] bg-white px-3.5 py-2.5 shadow-sm">
                    <div className={`w-3 h-3 rounded-full ${stage.color}`} />
                    <span className="text-[13px] font-medium text-[#1D1C1D]">{stage.name}</span>
                  </div>
                  {i < PIPELINE_STAGES.length - 1 && (
                    <ChevronRight className="size-3.5 text-[#D4B5D6] shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-[13px] font-semibold text-[#1D1C1D]">Como quieres configurar tu pipeline?</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { value: "default", label: "Usar estas etapas", desc: "Recomendado para empezar rapido", icon: Sparkles },
                { value: "custom", label: "Personalizar mi pipeline", desc: "Agrega o modifica etapas despues", icon: Kanban },
              ].map((opt) => (
                <button key={opt.value} type="button"
                  onClick={() => setCRM((c) => ({ ...c, useDefaultPipeline: opt.value }))}
                  className={`flex items-start gap-3 rounded-xl border-2 p-5 text-left transition-all duration-200 cursor-pointer hover:-translate-y-0.5 hover:shadow-md ${
                    crm.useDefaultPipeline === opt.value
                      ? "border-[#4A154B] bg-[#F9F0FA] shadow-sm"
                      : "border-[#E8D5E0] bg-white hover:border-[#D4B5D6]"
                  }`}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    crm.useDefaultPipeline === opt.value ? "bg-[#4A154B] text-white" : "bg-[#F4EDE4] text-[#616061]"
                  }`}>
                    <opt.icon className="size-4" />
                  </div>
                  <div>
                    <span className={`text-[13px] font-semibold block ${
                      crm.useDefaultPipeline === opt.value ? "text-[#4A154B]" : "text-[#1D1C1D]"
                    }`}>{opt.label}</span>
                    <span className="text-xs text-[#616061]">{opt.desc}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-[13px] font-semibold text-[#1D1C1D]">Criterios de calificacion</Label>
              <Badge className="text-[11px] bg-[#F9F0FA] text-[#4A154B] border border-[#E8D5E0] font-bold">
                {totalPoints} pts total
              </Badge>
            </div>
            <div className="space-y-2">
              {QUALIFICATION_CRITERIA.map((criteria) => {
                const isChecked = crm.qualificationCriteria.includes(criteria.id);
                return (
                  <button key={criteria.id} type="button" onClick={() => toggleCriteria(criteria.id)}
                    className={`flex w-full items-center justify-between rounded-xl border-2 px-5 py-4 text-left transition-all duration-200 cursor-pointer ${
                      isChecked
                        ? "border-[#4A154B]/30 bg-[#F9F0FA]"
                        : "border-[#E8D5E0] bg-white hover:border-[#D4B5D6]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex size-6 items-center justify-center rounded-lg border-2 transition-all ${
                        isChecked ? "border-[#4A154B] bg-[#4A154B] text-white" : "border-[#D4B5D6] bg-white"
                      }`}>
                        {isChecked && <Check className="size-3.5" />}
                      </div>
                      <span className="text-[13px] font-medium text-[#1D1C1D]">{criteria.label}</span>
                    </div>
                    <span className={`text-xs font-bold ${isChecked ? "text-[#4A154B]" : "text-[#616061]"}`}>
                      +{criteria.points} pts
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-[#616061] bg-[#FAFAFA] rounded-lg p-3 border border-[#E8D5E0]">
              Los leads que alcancen <strong>70+ puntos</strong> seran marcados automaticamente como &quot;Qualified&quot; en tu pipeline.
            </p>
          </div>
        </StepBody>
        <StepFooter>
          <Button variant="ghost" size="lg" onClick={handleBack} className="h-11">
            <ArrowLeft className="size-4 mr-1.5" data-icon="inline-start" />Atras
          </Button>
          <Button size="lg" onClick={handleNext} className="h-11 px-6">
            <Sparkles className="size-4 mr-2" />Finalizar Setup
          </Button>
        </StepFooter>
      </StepCard>
    );
  };

  // ─── Completion Screen ───────────────────────────────────────────────────

  const renderCompletion = () => {
    const configuredItems = [
      { label: "Perfil de negocio", done: true },
      { label: "WhatsApp Business", done: whatsapp.connected, skipped: whatsapp.skipped },
      { label: "Canal de Leads (Meta)", done: leadChannel.connected, skipped: leadChannel.skipped },
      { label: "TikTok Ads", done: tiktok.connected, skipped: !tiktok.connected },
      { label: "CRM Pipeline", done: true },
    ];

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-500">
        {/* Celebration header — sobre fondo gradiente */}
        <div className="text-center space-y-5 py-4">
          <div className="relative inline-flex items-center justify-center mx-auto">
            <div className="w-24 h-24 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/25 flex items-center justify-center shadow-[0_0_40px_rgba(255,255,255,0.15)] animate-in zoom-in-50 duration-500">
              <PartyPopper className="size-12 text-white" />
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">
              ¡Tu cuenta está lista!
            </h1>
            <p className="text-white/65 mt-2 text-[15px] leading-relaxed">
              {profile.name ? `Felicidades ${profile.name}, ` : "Felicidades, "}
              Petunia AI está configurada y lista para ayudarte a crecer tu negocio.
            </p>
          </div>
        </div>

        {/* Configuration summary */}
        <div className="bg-white rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.35)] overflow-hidden">
          <div className="px-8 pt-6 pb-2 border-b border-[#EBEBEB]">
            <h3 className="text-[15px] font-bold text-[#1D1C1D]">Resumen de configuración</h3>
          </div>
          <div className="px-8 py-5 space-y-3">
            {configuredItems.map((item) => (
              <div key={item.label} className="flex items-center gap-3 text-sm">
                {item.done ? (
                  <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="size-4 text-white" />
                  </div>
                ) : item.skipped ? (
                  <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                    <span className="text-xs text-amber-500 font-bold">–</span>
                  </div>
                ) : (
                  <div className="w-7 h-7 rounded-lg border-2 border-[#E0E0E0] shrink-0" />
                )}
                <span className={`font-medium ${
                  item.done ? "text-[#1D1C1D]" : item.skipped ? "text-amber-600" : "text-[#616061]"
                }`}>
                  {item.label}
                  {item.skipped && !item.done && <span className="text-[11px] ml-1.5 opacity-60">(pendiente)</span>}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Next steps */}
        <div className="space-y-3">
          <h2 className="text-[14px] font-bold text-white/80 tracking-wide uppercase">Próximos pasos recomendados</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              ...(!tiktok.connected ? [{ icon: Zap, title: "Conectar TikTok", desc: "Captura leads del público joven", color: "bg-pink-500", href: "/settings" }] : []),
              { icon: Globe, title: "Crear Landing Page", desc: "Página de captura con IA", color: "bg-blue-500", href: "/landing-pages" },
              { icon: Mic, title: "Activar Voice AI", desc: "Asistente de voz para llamadas", color: "bg-[#4A154B]", href: "/settings" },
            ].map((step) => (
              <button key={step.title} type="button" onClick={() => router.push(step.href)}
                className="flex flex-col items-start gap-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/15 p-5 text-left transition-all duration-200 hover:bg-white/18 hover:border-white/30 hover:-translate-y-1 cursor-pointer group"
              >
                <div className={`w-10 h-10 rounded-xl ${step.color} flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-200`}>
                  <step.icon className="size-5 text-white" />
                </div>
                <div>
                  <p className="text-[13px] font-bold text-white">{step.title}</p>
                  <p className="text-xs text-white/55 mt-0.5">{step.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button
            size="lg"
            className="flex-1 h-12 bg-white text-[#4A154B] hover:bg-white/90 font-semibold shadow-lg"
            onClick={() => router.push("/dashboard")}
          >
            <Rocket className="size-4 mr-2" />Ver dashboard
          </Button>
          <Button
            size="lg"
            className="flex-1 h-12 bg-white/15 border border-white/25 text-white hover:bg-white/25 backdrop-blur-sm"
            onClick={async () => {
              try { await fetch("/api/onboarding/test-lead", { method: "POST" }); router.push("/crm"); } catch { /* silently */ }
            }}
          >
            <Sparkles className="size-4 mr-2" />Generar lead de prueba
          </Button>
        </div>
      </div>
    );
  };

  // ─── Main Render ─────────────────────────────────────────────────────────

  if (completed) return renderCompletion();

  return (
    <div className="space-y-8">
      {/* Progress section */}
      <div className="space-y-5">
        {/* Step indicators */}
        <div className="flex items-center justify-between">
          {STEPS.map((step, i) => {
            const StepIcon = step.icon;
            const isActive = currentStep === step.id;
            const isDone = currentStep > step.id;
            return (
              <div key={step.id} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => { if (isDone) setCurrentStep(step.id); }}
                  className={`flex items-center gap-2.5 transition-all duration-200 ${isDone ? "cursor-pointer" : "cursor-default"}`}
                >
                  <div className={`flex size-10 items-center justify-center rounded-xl transition-all duration-300 ${
                    isActive
                      ? "bg-white text-[#4A154B] shadow-[0_0_0_3px_rgba(255,255,255,0.25)] scale-110"
                      : isDone
                      ? "bg-emerald-500 text-white shadow-sm"
                      : "bg-white/15 text-white/55 border border-white/20"
                  }`}>
                    {isDone ? <Check className="size-5" /> : <StepIcon className="size-5" />}
                  </div>
                  <span className={`hidden sm:inline text-[13px] font-semibold ${
                    isActive ? "text-white" : isDone ? "text-emerald-400" : "text-white/45"
                  }`}>
                    {step.label}
                  </span>
                </button>
                {i < STEPS.length - 1 && (
                  <div className={`hidden sm:block w-8 lg:w-16 h-px mx-1 rounded-full transition-all duration-500 ${
                    currentStep > step.id + 1 ? "bg-emerald-400" : currentStep > step.id ? "bg-white/70" : "bg-white/20"
                  }`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Progress bar */}
        <div className="relative h-1.5 w-full rounded-full bg-white/20 overflow-hidden">
          <div
            className="h-full bg-white rounded-full transition-all duration-700 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <p className="text-xs text-white/50 text-center font-medium tracking-wide">
          Paso {currentStep} de {STEPS.length}
        </p>
      </div>

      {/* Step content */}
      {currentStep === 1 && renderStep1()}
      {currentStep === 2 && renderStep2()}
      {currentStep === 3 && renderStep3()}
      {currentStep === 4 && renderStep4()}
    </div>
  );
}
