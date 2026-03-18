"use client";

import { useState } from "react";
import {
  Sparkles, X, Loader2, Megaphone, Camera,
  DollarSign, CheckCircle2, Calendar, Image,
  Film, LayoutGrid, MessageCircle, Clock,
  Target, Zap, Facebook, Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

// ─── Types ───────────────────────────────────────────────────────────────────

interface GeneratedResult {
  summary: string;
  postsCreated: number;
  campaignsCreated: number;
  weeks: WeekPreview[];
  campaigns?: CampaignPreview[];
  kpis: KPI[];
}

interface WeekPreview {
  week: number;
  theme: string;
  posts: PostPreview[];
}

interface PostPreview {
  type: string;
  platform: string;
  title: string;
  caption: string;
  scheduledAt: string;
}

interface CampaignPreview {
  name: string;
  platform: string;
  budget: string;
  objective: string;
  audience: string;
}

interface KPI {
  metric: string;
  target: string;
}

// ─── Progress steps ───────────────────────────────────────────────────────────

const PROGRESS_STEPS = [
  "Analizando tu portafolio de propiedades...",
  "Definiendo estrategia y temáticas del mes...",
  "Creando posts, reels y captions en español...",
  "Programando fechas y horarios óptimos...",
  "Guardando publicaciones en tu calendario...",
  "Estructurando campañas de anuncios...",
  "Guardando todo en tu cuenta...",
];

// ─── Component ───────────────────────────────────────────────────────────────

export function MonthlyMarketingWizard({ onClose }: { onClose: () => void }) {
  const router = useRouter();

  const [wantsCampaigns, setWantsCampaigns] = useState<boolean | null>(null);
  const [campaignPlatform, setCampaignPlatform] = useState<"META" | "GOOGLE" | "AMBOS">("META");
  const [budget, setBudget] = useState("");

  const [generating, setGenerating] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const [result, setResult] = useState<GeneratedResult | null>(null);
  const [activeWeek, setActiveWeek] = useState(0);

  const canGenerate = wantsCampaigns !== null && (wantsCampaigns === false || budget.trim() !== "");

  const generate = async () => {
    setGenerating(true);
    setProgressStep(0);

    const stepInterval = setInterval(() => {
      setProgressStep(prev => {
        const next = prev + 1;
        if (next >= PROGRESS_STEPS.length - 1) clearInterval(stepInterval);
        return Math.min(next, PROGRESS_STEPS.length - 1);
      });
    }, 2000);

    try {
      const res = await fetch("/api/marketing/generate-monthly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wantsCampaigns,
          campaignPlatform: wantsCampaigns ? campaignPlatform : null,
          monthlyBudget: wantsCampaigns ? budget : null,
        }),
      });

      clearInterval(stepInterval);
      setProgressStep(PROGRESS_STEPS.length - 1);

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error generando plan");
      }

      const data = await res.json();
      setResult(data.result);
    } catch (e: unknown) {
      clearInterval(stepInterval);
      toast.error(e instanceof Error ? e.message : "Error generando plan");
    } finally {
      setGenerating(false);
    }
  };

  const typeIcon = (type: string) => {
    if (type === "REEL") return <Film className="size-3" />;
    if (type === "CAROUSEL") return <LayoutGrid className="size-3" />;
    if (type === "STORY") return <Zap className="size-3" />;
    if (type === "WHATSAPP") return <MessageCircle className="size-3" />;
    return <Image className="size-3" />;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-background border border-border/50 shadow-2xl overflow-hidden">

        {/* Header */}
        <div
          className="shrink-0 px-6 pt-5 pb-5 relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, #3D1140 0%, #4A154B 50%, #611f69 100%)" }}
        >
          <div
            className="absolute inset-0 opacity-[0.05]"
            style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "18px 18px" }}
          />
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-yellow-400/10 blur-3xl" />
          <div className="relative flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <div className="size-7 rounded-lg bg-yellow-400/20 flex items-center justify-center">
                  <Sparkles className="size-4 text-yellow-300" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">Petunia AI</span>
              </div>
              <h2 className="text-xl font-bold text-white leading-tight">Marketing Mensual IA</h2>
              <p className="text-white/60 text-xs mt-1">
                Petunia analiza tu negocio y crea todo el plan automáticamente
              </p>
            </div>
            <button onClick={onClose} className="text-white/40 hover:text-white transition-colors p-1">
              <X className="size-5" />
            </button>
          </div>

          {!generating && !result && (
            <div className="relative mt-4 flex flex-wrap gap-2">
              {[
                { icon: Calendar, label: "Plan 4 semanas" },
                { icon: Image, label: "Posts + captions" },
                { icon: Clock, label: "Calendario programado" },
                { icon: Target, label: "Hashtags optimizados" },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-1.5 bg-white/10 rounded-lg px-2.5 py-1">
                  <item.icon className="size-3 text-yellow-300" />
                  <span className="text-[11px] text-white/80 font-medium">{item.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">

          {/* QUESTION */}
          {!generating && !result && (
            <div className="p-6 space-y-6">
              <div className="space-y-3">
                <div>
                  <h3 className="text-base font-bold">¿Quieres crear campañas de anuncios este mes?</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Petunia ya se encarga de todo lo demás — contenido, calendario, copies y estrategia.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setWantsCampaigns(true)}
                    className={cn(
                      "p-4 rounded-2xl border-2 text-left transition-all",
                      wantsCampaigns === true
                        ? "border-[#4A154B] bg-[#4A154B]/5"
                        : "border-border/40 hover:border-[#4A154B]/40"
                    )}
                  >
                    <div className={cn(
                      "size-10 rounded-xl flex items-center justify-center mb-3",
                      wantsCampaigns === true ? "bg-[#4A154B]/10" : "bg-muted"
                    )}>
                      <Megaphone className={cn("size-5", wantsCampaigns === true ? "text-[#4A154B]" : "text-muted-foreground")} />
                    </div>
                    <p className="font-semibold text-sm">Sí, con campañas pagas</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                      Meta Ads / Google Ads — Petunia crea, segmenta y optimiza todo
                    </p>
                  </button>

                  <button
                    onClick={() => { setWantsCampaigns(false); setBudget(""); }}
                    className={cn(
                      "p-4 rounded-2xl border-2 text-left transition-all",
                      wantsCampaigns === false
                        ? "border-[#4A154B] bg-[#4A154B]/5"
                        : "border-border/40 hover:border-[#4A154B]/40"
                    )}
                  >
                    <div className={cn(
                      "size-10 rounded-xl flex items-center justify-center mb-3",
                      wantsCampaigns === false ? "bg-[#4A154B]/10" : "bg-muted"
                    )}>
                      <Camera className={cn("size-5", wantsCampaigns === false ? "text-[#4A154B]" : "text-muted-foreground")} />
                    </div>
                    <p className="font-semibold text-sm">Solo contenido orgánico</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                      Sin inversión publicitaria — posts, reels y stories planificados
                    </p>
                  </button>
                </div>
              </div>

              {wantsCampaigns === true && (
                <div className="space-y-4 pt-1 border-t border-border/30 animate-in slide-in-from-top-2 duration-200">
                  <div className="space-y-2">
                    <Label>Plataforma de publicidad</Label>
                    <div className="flex gap-2.5">
                      {[
                        { id: "META" as const, label: "Meta Ads", sub: "Instagram + Facebook", icon: Facebook },
                        { id: "GOOGLE" as const, label: "Google Ads", sub: "Search + Display", icon: Globe },
                        { id: "AMBOS" as const, label: "Meta + Google", sub: "Máxima cobertura", icon: Zap },
                      ].map(p => (
                        <button
                          key={p.id}
                          onClick={() => setCampaignPlatform(p.id)}
                          className={cn(
                            "flex-1 p-3 rounded-xl border-2 text-center transition-all",
                            campaignPlatform === p.id
                              ? "border-[#4A154B] bg-[#4A154B]/5"
                              : "border-border/40 hover:border-[#4A154B]/30"
                          )}
                        >
                          <p.icon className="size-4 mx-auto mb-1 text-muted-foreground" />
                          <p className="text-xs font-semibold">{p.label}</p>
                          <p className="text-[10px] text-muted-foreground">{p.sub}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5">
                      <DollarSign className="size-3.5" />
                      Presupuesto mensual total
                    </Label>
                    <div className="relative max-w-xs">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                      <Input
                        className="pl-7"
                        placeholder="500"
                        type="number"
                        value={budget}
                        onChange={e => setBudget(e.target.value)}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">USD/mes</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Petunia distribuirá el presupuesto, segmentará la audiencia y creará los creativos automáticamente.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* GENERATING */}
          {generating && (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="relative mb-6">
                <div className="size-20 rounded-full bg-[#4A154B]/10 flex items-center justify-center">
                  <Sparkles className="size-9 text-[#4A154B]" />
                </div>
                <div className="absolute inset-0 rounded-full border-4 border-[#4A154B]/20 border-t-[#4A154B] animate-spin" />
              </div>
              <h3 className="text-base font-bold mb-1">Petunia está trabajando...</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-xs">
                Analizando tu negocio y creando el plan completo del mes
              </p>
              <div className="w-full max-w-sm space-y-2">
                {PROGRESS_STEPS.map((step, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-sm transition-all duration-500",
                      i < progressStep ? "text-muted-foreground" :
                      i === progressStep ? "bg-[#4A154B]/8 text-[#4A154B] font-medium" :
                      "text-muted-foreground/30"
                    )}
                  >
                    {i < progressStep ? (
                      <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                    ) : i === progressStep ? (
                      <Loader2 className="size-4 animate-spin shrink-0 text-[#4A154B]" />
                    ) : (
                      <div className="size-4 rounded-full border-2 border-current shrink-0 opacity-30" />
                    )}
                    {step}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* RESULT */}
          {result && !generating && (
            <div className="p-6 space-y-6">
              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="size-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-emerald-800 mb-0.5">Plan creado y guardado en tu calendario ✅</p>
                    <p className="text-sm text-emerald-700 leading-relaxed">{result.summary}</p>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl border border-border/40 bg-card text-center">
                  <p className="text-2xl font-bold text-[#4A154B]">{result.postsCreated}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Posts creados</p>
                </div>
                <div className="p-3.5 rounded-xl border border-border/40 bg-card text-center">
                  <p className="text-2xl font-bold text-[#4A154B]">4</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Semanas planificadas</p>
                </div>
                <div className="p-3.5 rounded-xl border border-border/40 bg-card text-center">
                  <p className="text-2xl font-bold text-[#4A154B]">{result.campaignsCreated}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Campañas creadas</p>
                </div>
              </div>

              {/* KPIs */}
              {result.kpis?.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2.5">Objetivos del mes</p>
                  <div className="flex flex-wrap gap-2">
                    {result.kpis.map((kpi, i) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border/40 bg-card">
                        <span className="text-sm font-bold text-[#4A154B]">{kpi.target}</span>
                        <span className="text-xs text-muted-foreground">{kpi.metric}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Weekly preview */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Preview semanal</p>
                <div className="flex gap-2 mb-3 flex-wrap">
                  {result.weeks?.map((w, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveWeek(i)}
                      className={cn(
                        "px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all border",
                        activeWeek === i
                          ? "bg-[#4A154B] text-white border-[#4A154B]"
                          : "border-border/40 hover:border-[#4A154B]/40"
                      )}
                    >
                      Sem {w.week} — {w.theme}
                    </button>
                  ))}
                </div>

                {result.weeks?.[activeWeek] && (
                  <div className="space-y-2">
                    {result.weeks[activeWeek].posts?.map((post, j) => (
                      <div key={j} className="p-3.5 rounded-xl border border-border/40 bg-card hover:border-[#4A154B]/30 transition-colors">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <Badge className="text-[10px] px-2 py-0.5 bg-[#4A154B]/10 text-[#4A154B] border-0 flex items-center gap-1">
                            {typeIcon(post.type)}
                            {post.type}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] px-2 py-0.5">{post.platform}</Badge>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1 ml-auto">
                            <Clock className="size-3" />
                            {new Date(post.scheduledAt).toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" })}
                          </span>
                        </div>
                        <p className="text-sm font-semibold">{post.title}</p>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">{post.caption}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Campaign preview */}
              {result.campaigns && result.campaigns.length > 0 && (
                <div className="border-t border-border/30 pt-5">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Campañas creadas</p>
                  <div className="space-y-2">
                    {result.campaigns.map((camp, i) => (
                      <div key={i} className="flex items-center gap-3 p-3.5 rounded-xl border border-border/40 bg-card">
                        <div className="size-9 rounded-lg bg-[#4A154B]/10 flex items-center justify-center shrink-0">
                          <Megaphone className="size-4 text-[#4A154B]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{camp.name}</p>
                          <p className="text-[11px] text-muted-foreground">{camp.platform} · {camp.objective} · {camp.audience}</p>
                        </div>
                        <Badge className="bg-emerald-100 text-emerald-700 border-0 shrink-0">${camp.budget}/mes</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 px-6 py-4 border-t border-border/30 flex items-center justify-between bg-background">
          {!result ? (
            <>
              <Button variant="ghost" onClick={onClose} disabled={generating}>
                Cancelar
              </Button>
              <Button
                onClick={generate}
                disabled={!canGenerate || generating}
                className="bg-[#4A154B] hover:bg-[#611f69] text-white px-6 gap-2"
              >
                {generating ? (
                  <><Loader2 className="size-4 animate-spin" />Generando...</>
                ) : (
                  <><Sparkles className="size-4" />Generar plan completo</>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => { setResult(null); setWantsCampaigns(null); setBudget(""); }}>
                Nuevo plan
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => { router.push("/content"); onClose(); }}
                  className="gap-1.5"
                >
                  <Calendar className="size-4" />
                  Ver calendario
                </Button>
                {result.campaignsCreated > 0 && (
                  <Button
                    variant="outline"
                    onClick={() => { router.push("/campaigns"); onClose(); }}
                    className="gap-1.5"
                  >
                    <Megaphone className="size-4" />
                    Ver campañas
                  </Button>
                )}
                <Button
                  className="bg-[#4A154B] hover:bg-[#611f69] text-white gap-1.5"
                  onClick={onClose}
                >
                  <CheckCircle2 className="size-4" />
                  Listo
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
