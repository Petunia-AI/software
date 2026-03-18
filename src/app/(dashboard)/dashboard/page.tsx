"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  Users,
  CalendarDays,
  Bell,
  TrendingUp,
  ArrowUpRight,
  Sparkles,
  Eye,
  Target,
  Loader2,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { MonthlyMarketingWizard } from "@/components/marketing/monthly-marketing-wizard";

const pipelineColors: Record<string, string> = {
  NEW: "bg-blue-500",
  CONTACTED: "bg-yellow-500",
  QUALIFIED: "bg-[#4A154B]",
  PROPOSAL: "bg-orange-500",
  NEGOTIATION: "bg-primary",
  WON: "bg-green-500",
};

const statusColors: Record<string, string> = {
  NEW: "bg-blue-100 text-blue-700",
  CONTACTED: "bg-yellow-100 text-yellow-700",
  QUALIFIED: "bg-[#611f69]/10 text-[#4A154B]",
  PROPOSAL: "bg-orange-100 text-orange-700",
  NEGOTIATION: "bg-primary/10 text-primary",
  WON: "bg-green-100 text-green-700",
  LOST: "bg-red-100 text-red-700",
};

const statusLabels: Record<string, string> = {
  NEW: "Nuevo",
  CONTACTED: "Contactado",
  QUALIFIED: "Calificado",
  PROPOSAL: "Propuesta",
  NEGOTIATION: "Negociación",
  WON: "Ganado",
  LOST: "Perdido",
};

const sourceLabels: Record<string, string> = {
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
  WHATSAPP: "WhatsApp",
  WEBSITE: "Website",
  REFERRAL: "Referido",
  OTHER: "Otro",
};

const typeLabels: Record<string, string> = {
  POST: "Post",
  STORY: "Story",
  REEL: "Reel",
  CAROUSEL: "Carrusel",
  WHATSAPP: "WhatsApp",
  EMAIL: "Email",
};

const platformLabels: Record<string, string> = {
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
  TIKTOK: "TikTok",
  WHATSAPP: "WhatsApp",
  EMAIL: "Email",
  LINKEDIN: "LinkedIn",
};

interface DashboardData {
  stats: {
    properties: number;
    totalProperties: number;
    leads: number;
    content: number;
    totalContent: number;
    followUps: number;
  };
  pipeline: { name: string; status: string; count: number }[];
  conversionRate: string;
  recentLeads: {
    id: string;
    name: string;
    source: string;
    status: string;
    createdAt: string;
    property?: { title: string } | null;
  }[];
  upcomingContent: {
    id: string;
    title: string | null;
    platform: string;
    type: string;
    scheduledAt: string | null;
    status: string;
  }[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [wizardOpen, setWizardOpen] = useState(false);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((res) => res.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-foreground" />
      </div>
    );
  }

  if (!data || data.stats === undefined) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <p className="text-muted-foreground">No se pudieron cargar los datos</p>
        <p className="text-xs text-muted-foreground mt-1">Verifica que hayas iniciado sesión</p>
      </div>
    );
  }

  const totalPipeline = data.pipeline.reduce((a, b) => a + b.count, 0);

  const stats = [
    {
      title: "Propiedades activas",
      value: data.stats.properties.toString(),
      subtitle: `${data.stats.totalProperties} total`,
      icon: Building2,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Leads activos",
      value: data.stats.leads.toString(),
      subtitle: `${data.conversionRate}% conversión`,
      icon: Users,
      color: "text-blue-400",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Contenido programado",
      value: data.stats.content.toString(),
      subtitle: `${data.stats.totalContent} total`,
      icon: CalendarDays,
      color: "text-[#611f69]",
      bgColor: "bg-[#4A154B]/10",
    },
    {
      title: "Seguimientos pendientes",
      value: data.stats.followUps.toString(),
      subtitle: "por completar",
      icon: Bell,
      color: "text-orange-400",
      bgColor: "bg-orange-500/10",
    },
  ];

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return "Hace minutos";
    if (hours < 24) return `Hace ${hours}h`;
    const days = Math.floor(hours / 24);
    return `Hace ${days}d`;
  }

  function formatSchedule(dateStr: string | null, status: string) {
    if (!dateStr) return status === "DRAFT" ? "Sin programar" : "";
    const date = new Date(dateStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow = date.toDateString() === tomorrow.toDateString();

    const time = date.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
    if (isToday) return `Hoy, ${time}`;
    if (isTomorrow) return `Mañana, ${time}`;
    return date.toLocaleDateString("es-MX", { day: "numeric", month: "short" }) + `, ${time}`;
  }

  return (
    <div className="space-y-6">
      {wizardOpen && <MonthlyMarketingWizard onClose={() => setWizardOpen(false)} />}

      {/* Hero banner — gradient aubergine */}
      <div
        className="relative overflow-hidden rounded-2xl p-7 text-white"
        style={{ background: "linear-gradient(135deg, #3D1140 0%, #4A154B 40%, #611f69 100%)" }}
      >
        {/* Dot pattern */}
        <div
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{ backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)", backgroundSize: "24px 24px" }}
        />
        {/* Glow */}
        <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-[#611f69]/40 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-1.5">Panel de control</p>
            <h1 className="text-2xl font-bold tracking-tight text-white">Dashboard</h1>
            <p className="text-white/60 text-sm mt-1">
              Resumen general de tu operación inmobiliaria
            </p>
          </div>
          <div className="flex gap-2.5 shrink-0 flex-wrap">
            <button
              onClick={() => setWizardOpen(true)}
              className="inline-flex items-center h-9 gap-1.5 rounded-xl bg-yellow-400 text-[#3D1140] px-4 text-[13px] font-bold hover:bg-yellow-300 shadow-[0_2px_12px_rgba(250,204,21,0.4)] transition-all duration-150 animate-pulse hover:animate-none"
            >
              <Zap className="h-3.5 w-3.5" />
              Marketing Mensual IA
            </button>
            <Link
              href="/properties"
              className="inline-flex items-center h-9 gap-1.5 rounded-xl border border-white/20 bg-white/10 backdrop-blur-sm px-4 text-[13px] font-semibold text-white hover:bg-white/20 transition-all duration-150"
            >
              <Building2 className="h-3.5 w-3.5" />
              Nueva propiedad
            </Link>
            <Link
              href="/content"
              className="inline-flex items-center h-9 gap-1.5 rounded-xl bg-white text-[#4A154B] px-4 text-[13px] font-semibold hover:bg-white/90 shadow-[0_2px_8px_rgba(0,0,0,0.2)] transition-all duration-150"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Generar contenido
            </Link>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="hover:-translate-y-0.5 cursor-default">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className={`p-2.5 rounded-xl ${stat.bgColor}`}>
                  <stat.icon className={`h-[18px] w-[18px] ${stat.color}`} />
                </div>
                <ArrowUpRight className="h-4 w-4 text-[#CCCCCC]" />
              </div>
              <div className="mt-4">
                <p className="text-[26px] font-bold text-[#1D1C1D] leading-none">{stat.value}</p>
                <p className="text-[13px] font-medium text-[#616061] mt-1.5">{stat.title}</p>
                <p className="text-[11px] text-[#AAAAAA] mt-0.5">{stat.subtitle}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main content grid */}
      <div className="grid gap-5 lg:grid-cols-3">
        {/* Pipeline Overview */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2 border-b border-[#F4F4F4]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-[#AAAAAA] uppercase tracking-widest mb-0.5">Ventas</p>
                <CardTitle className="text-[15px] font-bold text-[#1D1C1D]">Pipeline Comercial</CardTitle>
              </div>
              <Link
                href="/crm"
                className="inline-flex items-center gap-1 text-[12px] font-semibold bg-[#4A154B] text-white rounded-xl px-3.5 py-1.5 hover:bg-[#611f69] transition-colors"
              >
                Ver pipeline
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-5 space-y-4">
            {data.pipeline.map((stage) => (
              <div key={stage.name} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-semibold text-[#1D1C1D]">{stage.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-bold text-[#1D1C1D]">{stage.count}</span>
                    <span className="text-[11px] text-[#AAAAAA]">leads</span>
                  </div>
                </div>
                <div className="h-2 rounded-full bg-[#F4F4F4] overflow-hidden">
                  <div
                    className={`h-full rounded-full ${pipelineColors[stage.status]} transition-all duration-700`}
                    style={{ width: `${totalPipeline > 0 ? (stage.count / totalPipeline) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
            <div className="pt-4 mt-2 border-t border-[#F4F4F4] flex items-center justify-between">
              <span className="text-[13px] font-semibold text-[#616061]">Total en pipeline</span>
              <span className="text-[13px] font-bold bg-[#4A154B] text-white px-3.5 py-1 rounded-full">{totalPipeline} leads</span>
            </div>
          </CardContent>
        </Card>

        {/* Quick metrics — 2x2 grid */}
        <div className="grid grid-cols-2 lg:grid-cols-1 gap-4 content-start">
          {[
            { icon: Target, bg: "bg-emerald-50", color: "text-emerald-600", label: "Tasa de conversión", value: `${data.conversionRate}%` },
            { icon: Eye, bg: "bg-[#F5EFF5]", color: "text-[#4A154B]", label: "Publicaciones totales", value: data.stats.totalContent },
            { icon: Building2, bg: "bg-[#EEF3FF]", color: "text-blue-600", label: "Propiedades totales", value: data.stats.totalProperties },
            { icon: TrendingUp, bg: "bg-amber-50", color: "text-amber-600", label: "Leads en pipeline", value: totalPipeline },
          ].map((metric) => (
            <Card key={metric.label} className="hover:-translate-y-0.5 cursor-default">
              <CardContent className="p-4">
                <div className={`w-8 h-8 rounded-lg ${metric.bg} flex items-center justify-center mb-3`}>
                  <metric.icon className={`h-4 w-4 ${metric.color}`} />
                </div>
                <p className="text-[11px] font-semibold text-[#AAAAAA] uppercase tracking-widest leading-tight">{metric.label}</p>
                <p className="text-[22px] font-bold text-[#1D1C1D] mt-1 leading-none">{metric.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Bottom section */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Recent Leads */}
        <Card>
          <CardHeader className="pb-2 border-b border-[#F4F4F4]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-[#AAAAAA] uppercase tracking-widest mb-0.5">CRM</p>
                <CardTitle className="text-[15px] font-bold text-[#1D1C1D]">Leads Recientes</CardTitle>
              </div>
              <Link
                href="/crm"
                className="inline-flex items-center gap-1 text-[12px] font-semibold bg-[#4A154B] text-white rounded-xl px-3.5 py-1.5 hover:bg-[#611f69] transition-colors"
              >
                Ver todos
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-1">
            <div>
              {data.recentLeads.map((lead) => (
                <div
                  key={lead.id}
                  className="flex items-center justify-between py-3 border-b border-[#F8F8F8] last:border-0 hover:bg-[#FAFAFA] -mx-4 px-4 rounded-lg transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#4A154B]/10 to-[#611f69]/15 flex items-center justify-center shrink-0">
                      <span className="text-[11px] font-bold text-[#4A154B]">
                        {lead.name.split(" ").slice(0, 2).map((n) => n[0]).join("")}
                      </span>
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-[#1D1C1D]">{lead.name}</p>
                      <p className="text-[11px] text-[#AAAAAA]">
                        {lead.property?.title || "Sin propiedad"} · {sourceLabels[lead.source] || lead.source}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge className={`text-[10px] ${statusColors[lead.status]}`} variant="secondary">
                      {statusLabels[lead.status]}
                    </Badge>
                    <span className="text-[11px] text-[#CCCCCC]">{timeAgo(lead.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Content */}
        <Card>
          <CardHeader className="pb-2 border-b border-[#F4F4F4]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-[#AAAAAA] uppercase tracking-widest mb-0.5">Marketing</p>
                <CardTitle className="text-[15px] font-bold text-[#1D1C1D]">Contenido Próximo</CardTitle>
              </div>
              <Link
                href="/calendar"
                className="inline-flex items-center gap-1 text-[12px] font-semibold bg-[#4A154B] text-white rounded-xl px-3.5 py-1.5 hover:bg-[#611f69] transition-colors"
              >
                Ver calendario
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-1">
            <div>
              {data.upcomingContent.length > 0 ? (
                data.upcomingContent.map((content) => (
                  <div
                    key={content.id}
                    className="flex items-center justify-between py-3 border-b border-[#F8F8F8] last:border-0 hover:bg-[#FAFAFA] -mx-4 px-4 rounded-lg transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-[#611f69]/10 to-[#ECB22E]/15 flex items-center justify-center shrink-0">
                        <Sparkles className="h-3.5 w-3.5 text-[#611f69]" />
                      </div>
                      <div>
                        <p className="text-[13px] font-semibold text-[#1D1C1D]">{content.title || "Sin título"}</p>
                        <p className="text-[11px] text-[#AAAAAA]">{platformLabels[content.platform]}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className="text-[10px]">
                        {typeLabels[content.type] || content.type}
                      </Badge>
                      <span className="text-[11px] text-[#CCCCCC]">
                        {formatSchedule(content.scheduledAt, content.status)}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-10">
                  <div className="w-12 h-12 rounded-2xl bg-[#F4F4F4] flex items-center justify-center mx-auto mb-3">
                    <CalendarDays className="h-5 w-5 text-[#CCCCCC]" />
                  </div>
                  <p className="text-[13px] font-medium text-[#616061]">Sin contenido programado</p>
                  <p className="text-[12px] text-[#AAAAAA] mt-0.5 mb-4">Crea tu primer post con IA</p>
                  <Link
                    href="/calendar"
                    className="inline-flex items-center gap-1.5 text-[12px] font-semibold bg-[#4A154B] text-white rounded-xl px-4 py-2 hover:bg-[#611f69] transition-colors"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Programar con IA
                  </Link>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
