"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Shield,
  Users,
  Building2,
  DollarSign,
  AlertTriangle,
  Crown,
  Loader2,
  Mail,
  Phone,
  TrendingUp,
  Clock,
  CheckCircle2,
  Search,
  Eye,
  Bot,
  Key,
  Save,
  Zap,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface ClientData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  plan: string;
  planStatus: string;
  balance: number | string | null;
  monthlyRate: number | string | null;
  currency: string;
  trialEndsAt: string | null;
  lastPaymentAt: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  maxProperties: number;
  maxLeads: number;
  createdAt: string;
  owner: { id: string; name: string; email: string } | null;
  counts: {
    properties: number;
    leads: number;
    contentPosts: number;
    members: number;
  };
}

interface Summary {
  totalClients: number;
  activePlans: number;
  trialPlans: number;
  pastDue: number;
  totalRevenue: number;
  totalBalance: number;
}

const planLabels: Record<string, string> = {
  trial: "Trial",
  starter: "Starter",
  professional: "Professional",
  enterprise: "Enterprise",
};

const planColors: Record<string, string> = {
  trial: "bg-gray-100 text-gray-700",
  starter: "bg-blue-100 text-blue-700",
  professional: "bg-[#611f69]/10 text-[#4A154B]",
  enterprise: "bg-primary/10 text-primary",
};

const statusLabels: Record<string, string> = {
  active: "Activo",
  past_due: "Pago vencido",
  canceled: "Cancelado",
  suspended: "Suspendido",
};

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  past_due: "bg-red-100 text-red-700",
  canceled: "bg-gray-100 text-gray-500",
  suspended: "bg-orange-100 text-orange-700",
};

function formatMoney(amount: number | string | null | undefined, currency: string = "USD") {
  if (amount == null) return `$0 ${currency}`;
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return `$0 ${currency}`;
  return `$${num.toLocaleString("es-MX", { minimumFractionDigits: 0 })} ${currency}`;
}

function daysUntil(dateStr: string | null) {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

interface AIConfigData {
  config: { id: string; provider: string; model: string | null; hasApiKey: boolean; hasHeygenKey: boolean; isActive: boolean } | null;
  usage: {
    month: string;
    totalCalls: number;
    totalCredits: number;
    totalTokensInput: number;
    totalTokensOutput: number;
    byType: { type: string; calls: number; credits: number }[];
    topOrganizations: { organizationId: string; name: string; plan: string; creditsUsed: number; creditsLimit: number; calls: number }[];
  };
}

export default function AdminPage() {
  const [adminTab, setAdminTab] = useState<"clients" | "ai">("clients");
  const [data, setData] = useState<{ clients: ClientData[]; summary: Summary } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filterPlan, setFilterPlan] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedClient, setSelectedClient] = useState<ClientData | null>(null);

  // AI Config state
  const [aiConfig, setAiConfig] = useState<AIConfigData | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [aiProvider, setAiProvider] = useState("claude");
  const [aiApiKey, setAiApiKey] = useState("");
  const [aiModel, setAiModel] = useState("");
  const [heygenApiKey, setHeygenApiKey] = useState("");
  const [savingAi, setSavingAi] = useState(false);
  const [savingHeygen, setSavingHeygen] = useState(false);

  const fetchAiConfig = useCallback(async () => {
    setLoadingAi(true);
    try {
      const res = await fetch("/api/admin/ai-settings");
      if (res.ok) {
        const data = await res.json();
        setAiConfig(data);
        if (data.config) {
          setAiProvider("claude");
          setAiModel(data.config.model || "claude-sonnet-4-6");
        }
      }
    } catch { /* silent */ } finally { setLoadingAi(false); }
  }, []);

  const saveAiConfig = async () => {
    if (!aiApiKey.trim()) {
      toast.error("Ingresa la API key");
      return;
    }
    setSavingAi(true);
    try {
      const res = await fetch("/api/admin/ai-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "claude", apiKey: aiApiKey, model: aiModel || "claude-sonnet-4-6" }),
      });
      if (res.ok) {
        toast.success("Motor de IA configurado correctamente");
        setAiApiKey("");
        fetchAiConfig();
      } else {
        const err = await res.json();
        toast.error(err.error || "Error al guardar");
      }
    } catch { toast.error("Error de conexión"); } finally { setSavingAi(false); }
  };

  const saveHeygenConfig = async () => {
    if (!heygenApiKey.trim()) {
      toast.error("Ingresa la API key de HeyGen");
      return;
    }
    setSavingHeygen(true);
    try {
      // We need an existing AI config to add HeyGen key to
      const currentConfig = aiConfig?.config;
      if (!currentConfig?.hasApiKey) {
        toast.error("Primero configura el motor de IA (Claude)");
        setSavingHeygen(false);
        return;
      }
      const res = await fetch("/api/admin/ai-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: currentConfig.provider.toLowerCase(),
          apiKey: "__keep_existing__",
          model: currentConfig.model,
          heygenApiKey: heygenApiKey,
        }),
      });
      if (res.ok) {
        toast.success("HeyGen configurado correctamente");
        setHeygenApiKey("");
        fetchAiConfig();
      } else {
        const err = await res.json();
        toast.error(err.error || "Error al guardar");
      }
    } catch { toast.error("Error de conexión"); } finally { setSavingHeygen(false); }
  };

  useEffect(() => {
    fetch("/api/admin/clients")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) {
          setError(d.error);
        } else {
          setData(d);
        }
      })
      .catch(() => setError("Error de conexión"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (adminTab === "ai") fetchAiConfig();
  }, [adminTab, fetchAiConfig]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <Shield className="h-12 w-12 text-red-400 mb-3" />
        <h2 className="text-lg font-semibold">Acceso restringido</h2>
        <p className="text-sm text-muted-foreground mt-1">{error}</p>
        <p className="text-xs text-muted-foreground mt-3">Solo los administradores pueden acceder a este panel</p>
      </div>
    );
  }

  if (!data) return null;

  const { clients, summary } = data;

  const filtered = clients.filter((c) => {
    const matchSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.owner?.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.owner?.email || "").toLowerCase().includes(search.toLowerCase());
    const matchPlan = filterPlan === "all" || c.plan === filterPlan;
    const matchStatus = filterStatus === "all" || c.planStatus === filterStatus;
    return matchSearch && matchPlan && matchStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl p-6 text-white" style={{ background: 'linear-gradient(135deg, #4A154B 0%, #350d36 60%, #1a0a1a 100%)' }}>
        <div className="absolute inset-0 opacity-50" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23fff' fill-opacity='0.03'%3E%3Cpath d='M36 18c0-9.94-8.06-18-18-18S0 8.06 0 18 18 36 36 18'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />
        <div className="relative flex items-center justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-white/10 backdrop-blur-sm">
                <Crown className="h-5 w-5" />
              </div>
              <Badge className="bg-white/10 text-white/80 border-white/10 text-[10px] font-medium backdrop-blur-sm">
                Super Admin
              </Badge>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Panel Super Admin</h1>
            <p className="text-white/70 text-sm max-w-md">
              Gestión de clientes, motor de IA y facturación
            </p>
          </div>
        </div>
      </div>

      {/* Admin Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setAdminTab("clients")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            adminTab === "clients" ? "bg-primary text-white shadow-sm" : "bg-muted/50 text-muted-foreground hover:bg-muted"
          }`}
        >
          <Users className="h-4 w-4" />
          Clientes
        </button>
        <button
          onClick={() => setAdminTab("ai")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            adminTab === "ai" ? "bg-primary text-white shadow-sm" : "bg-muted/50 text-muted-foreground hover:bg-muted"
          }`}
        >
          <Bot className="h-4 w-4" />
          Motor de IA
        </button>
      </div>

      {/* AI Config Tab */}
      {adminTab === "ai" && (
        <div className="space-y-4">
          {loadingAi ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* AI Config Card */}
              <Card className="rounded-2xl border border-border/40">
                <CardContent className="p-6 space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest">
                        Configuración del Motor de IA
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Estas API keys se usan para TODOS los clientes de la plataforma
                      </p>
                    </div>
                    {aiConfig?.config?.hasApiKey && (
                      <Badge className="bg-emerald-100 text-emerald-700 border-0">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Activo
                      </Badge>
                    )}
                  </div>

                  {/* Current config info */}
                  {aiConfig?.config?.hasApiKey && (
                    <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 space-y-1.5">
                      <p className="text-sm font-semibold text-emerald-800">
                        Motor configurado: Claude AI (Anthropic)
                      </p>
                      {aiConfig.config.model && (
                        <p className="text-xs text-emerald-600">Modelo: {aiConfig.config.model}</p>
                      )}
                      <p className="text-xs text-emerald-600">Para cambiar la configuración, ingresa nueva API key abajo.</p>
                    </div>
                  )}

                  {/* Provider — Claude only */}
                  <div className="grid gap-3">
                    <Label>Proveedor de IA</Label>
                    <div className="p-4 rounded-2xl border-2 border-[#4A154B] bg-[#F9F0FA] flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-[#4A154B]/10 flex items-center justify-center shrink-0">
                        <Bot className="h-4 w-4 text-[#4A154B]" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">Claude AI — Anthropic</p>
                        <p className="text-xs text-muted-foreground mt-0.5">claude-sonnet-4-6 · Mejor rendimiento en español</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label className="flex items-center gap-2">
                      <Key className="h-3.5 w-3.5" />
                      API Key — Anthropic
                    </Label>
                    <Input
                      type="password"
                      placeholder="sk-ant-api03-..."
                      value={aiApiKey}
                      onChange={(e) => setAiApiKey(e.target.value)}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Esta API key se usa para procesar TODAS las solicitudes de IA de los clientes.
                    </p>
                  </div>

                  <div className="grid gap-2">
                    <Label>Modelo</Label>
                    <Select value={aiModel || "claude-sonnet-4-6"} onValueChange={(v) => setAiModel(v ?? "claude-sonnet-4-6")}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar modelo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="claude-sonnet-4-6">Claude Sonnet 4.6 ⚡ Recomendado</SelectItem>
                        <SelectItem value="claude-sonnet-4-5-20250929">Claude Sonnet 4.5</SelectItem>
                        <SelectItem value="claude-haiku-4-5-20251001">Claude Haiku 4.5 (más económico)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button onClick={saveAiConfig} disabled={savingAi || !aiApiKey.trim()} className="w-full h-11">
                    {savingAi ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Guardando...</>
                      : <><Save className="h-4 w-4 mr-2" />Guardar configuración de IA</>}
                  </Button>
                </CardContent>
              </Card>

              {/* HeyGen Config Card */}
              <Card className="rounded-2xl border border-border/40">
                <CardContent className="p-6 space-y-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-pink-100 flex items-center justify-center">
                        <span className="text-lg">🎬</span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold">HeyGen — Video Avatar IA</p>
                        <p className="text-xs text-muted-foreground">
                          API centralizada para generar videos con avatares hablando sobre propiedades
                        </p>
                      </div>
                    </div>
                    {aiConfig?.config?.hasHeygenKey && (
                      <Badge className="bg-emerald-100 text-emerald-700 border-0">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Conectado
                      </Badge>
                    )}
                  </div>

                  {aiConfig?.config?.hasHeygenKey && (
                    <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50">
                      <p className="text-sm text-emerald-700 font-medium">HeyGen API conectada. Los clientes pueden generar videos sin necesidad de su propia key.</p>
                    </div>
                  )}

                  <div className="grid gap-2">
                    <Label className="flex items-center gap-2">
                      <Key className="h-3.5 w-3.5" />
                      API Key de HeyGen
                    </Label>
                    <Input
                      type="password"
                      placeholder="Tu API key de HeyGen"
                      value={heygenApiKey}
                      onChange={(e) => setHeygenApiKey(e.target.value)}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Obtén tu key en heygen.com → Settings → API Keys. Esta key se usa para todos los clientes.
                    </p>
                  </div>

                  <Button onClick={saveHeygenConfig} disabled={savingHeygen || !heygenApiKey.trim()} className="w-full h-11">
                    {savingHeygen ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Guardando...</>
                      : <><Save className="h-4 w-4 mr-2" />Guardar HeyGen API Key</>}
                  </Button>
                </CardContent>
              </Card>

              {/* Usage summary */}
              {aiConfig?.usage && (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: "Llamadas este mes", value: aiConfig.usage.totalCalls, icon: Zap, color: "text-[#4A154B]", bg: "bg-[#F9F0FA]" },
                      { label: "Créditos consumidos", value: aiConfig.usage.totalCredits, icon: Bot, color: "text-blue-600", bg: "bg-blue-50" },
                      { label: "Tokens de entrada", value: (aiConfig.usage.totalTokensInput || 0).toLocaleString(), icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50", isString: true },
                      { label: "Tokens de salida", value: (aiConfig.usage.totalTokensOutput || 0).toLocaleString(), icon: TrendingUp, color: "text-orange-600", bg: "bg-orange-50", isString: true },
                    ].map((stat) => (
                      <Card key={stat.label} className="rounded-2xl border border-border/40">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <div className={`p-1.5 rounded-lg ${stat.bg}`}>
                              <stat.icon className={`h-3.5 w-3.5 ${stat.color}`} />
                            </div>
                          </div>
                          <p className="text-lg font-bold">{stat.value}</p>
                          <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Usage by type */}
                  {aiConfig.usage.byType.length > 0 && (
                    <Card className="rounded-2xl border border-border/40">
                      <CardContent className="p-6 space-y-4">
                        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest">
                          Uso por tipo
                        </p>
                        <div className="space-y-2">
                          {aiConfig.usage.byType.map((u) => {
                            const labels: Record<string, string> = {
                              CONTENT_GENERATION: "Contenido",
                              LANDING_PAGE: "Landing Pages",
                              VIDEO_SCRIPT: "Videos IA",
                              ASSISTANT_CHAT: "Chat Asistente",
                              AVATAR_GENERATION: "Avatares",
                            };
                            return (
                              <div key={u.type} className="flex items-center justify-between py-2 border-b border-border/20 last:border-0">
                                <span className="text-sm font-medium">{labels[u.type] || u.type}</span>
                                <div className="flex items-center gap-3">
                                  <span className="text-sm text-muted-foreground">{u.calls} llamadas</span>
                                  <Badge>{u.credits} créditos</Badge>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Top organizations */}
                  {aiConfig.usage.topOrganizations.length > 0 && (
                    <Card className="rounded-2xl border border-border/40">
                      <CardContent className="p-6 space-y-4">
                        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest">
                          Top clientes por consumo de IA
                        </p>
                        <div className="space-y-2">
                          {aiConfig.usage.topOrganizations.map((org, i) => (
                            <div key={org.organizationId} className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-muted/20 transition-colors">
                              <div className="flex items-center gap-3">
                                <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}.</span>
                                <div>
                                  <p className="text-sm font-semibold">{org.name}</p>
                                  <p className="text-[10px] text-muted-foreground">{org.calls} llamadas</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge className={`text-[10px] ${planColors[org.plan] || ""}`}>
                                  {planLabels[org.plan] || org.plan}
                                </Badge>
                                <span className="text-sm font-bold">{org.creditsUsed}/{org.creditsLimit === -1 ? "∞" : org.creditsLimit}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* Clients Tab */}
      {adminTab === "clients" && (<>
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Clientes total", value: summary.totalClients, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Planes activos", value: summary.activePlans, icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50" },
          { label: "En trial", value: summary.trialPlans, icon: Clock, color: "text-orange-600", bg: "bg-orange-50" },
          { label: "Pagos vencidos", value: summary.pastDue, icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50" },
          { label: "Ingreso mensual", value: formatMoney(summary.totalRevenue), icon: TrendingUp, color: "text-primary", bg: "bg-primary/10", isString: true },
          { label: "Balance total", value: formatMoney(summary.totalBalance), icon: DollarSign, color: "text-green-600", bg: "bg-green-50", isString: true },
        ].map((stat) => (
          <Card key={stat.label} className="rounded-2xl border border-border/40 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className={`p-1.5 rounded-lg ${stat.bg}`}>
                  <stat.icon className={`h-3.5 w-3.5 ${stat.color}`} />
                </div>
              </div>
              <p className="text-lg font-bold">{stat.value}</p>
              <p className="text-[10px] text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar cliente..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 rounded-xl bg-muted/40 border-0" />
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-muted-foreground mr-1">Plan:</span>
          {[{ key: "all", label: "Todos" }, ...Object.entries(planLabels).map(([k, v]) => ({ key: k, label: v }))].map((item) => (
            <button
              key={item.key}
              onClick={() => setFilterPlan(item.key)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                filterPlan === item.key
                  ? "bg-primary text-white"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              }`}
            >
              {item.label}
            </button>
          ))}
          <span className="text-xs text-muted-foreground ml-3 mr-1">Estado:</span>
          {[{ key: "all", label: "Todos" }, ...Object.entries(statusLabels).map(([k, v]) => ({ key: k, label: v }))].map((item) => (
            <button
              key={item.key}
              onClick={() => setFilterStatus(item.key)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                filterStatus === item.key
                  ? "bg-primary text-white"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Clients Table */}
      <Card className="rounded-2xl border border-border/40 overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/40">
                  <th className="text-left text-xs font-medium text-muted-foreground p-4">Organización</th>
                  <th className="text-left text-xs font-medium text-muted-foreground p-4">Responsable</th>
                  <th className="text-left text-xs font-medium text-muted-foreground p-4">Plan</th>
                  <th className="text-left text-xs font-medium text-muted-foreground p-4">Estado</th>
                  <th className="text-right text-xs font-medium text-muted-foreground p-4">Mensualidad</th>
                  <th className="text-right text-xs font-medium text-muted-foreground p-4">Balance</th>
                  <th className="text-center text-xs font-medium text-muted-foreground p-4">Uso</th>
                  <th className="text-center text-xs font-medium text-muted-foreground p-4">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((client) => {
                  const bal = typeof client.balance === "string" ? parseFloat(client.balance) : (client.balance ?? 0);
                  const trialDays = daysUntil(client.trialEndsAt);

                  return (
                    <tr key={client.id} className="border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-primary text-white flex items-center justify-center shrink-0">
                            <Building2 className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold">{client.name}</p>
                            {client.description && (
                              <p className="text-[11px] text-muted-foreground truncate max-w-[200px]">{client.description}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        {client.owner ? (
                          <div>
                            <p className="text-sm font-medium">{client.owner.name}</p>
                            <p className="text-[11px] text-muted-foreground">{client.owner.email}</p>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="p-3">
                        <Badge className={`text-[10px] ${planColors[client.plan]}`}>
                          {planLabels[client.plan] || client.plan}
                        </Badge>
                        {client.plan === "trial" && trialDays !== null && (
                          <p className="text-[10px] text-orange-600 mt-0.5">
                            {trialDays > 0 ? `${trialDays}d restantes` : "Expirado"}
                          </p>
                        )}
                      </td>
                      <td className="p-3">
                        <Badge className={`text-[10px] ${statusColors[client.planStatus]}`}>
                          {statusLabels[client.planStatus] || client.planStatus}
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        <p className="text-sm font-medium">
                          {Number(client.monthlyRate) > 0 ? formatMoney(client.monthlyRate, client.currency) : "—"}
                        </p>
                      </td>
                      <td className="p-3 text-right">
                        <p className={`text-sm font-bold ${bal < 0 ? "text-red-600" : bal > 0 ? "text-green-600" : "text-muted-foreground"}`}>
                          {formatMoney(client.balance, client.currency)}
                        </p>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="text-[10px] text-muted-foreground">
                            {client.counts.properties}/{client.maxProperties} prop
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {client.counts.leads}/{client.maxLeads} leads
                          </span>
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => setSelectedClient(client)}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Ver
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Client Detail Dialog */}
      <Dialog open={!!selectedClient} onOpenChange={() => setSelectedClient(null)}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              {selectedClient?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedClient && (
            <div className="space-y-5 pt-2">
              {/* Description */}
              {selectedClient.description && (
                <p className="text-sm text-muted-foreground">{selectedClient.description}</p>
              )}

              {/* Plan & Status */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl border border-border/40">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Plan</p>
                  <Badge className={`${planColors[selectedClient.plan]}`}>
                    {planLabels[selectedClient.plan]}
                  </Badge>
                </div>
                <div className="p-3 rounded-xl border border-border/40">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Estado</p>
                  <Badge className={`${statusColors[selectedClient.planStatus]}`}>
                    {statusLabels[selectedClient.planStatus]}
                  </Badge>
                </div>
              </div>

              {/* Financials */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl border border-border/40">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Mensualidad</p>
                  <p className="text-lg font-bold">{formatMoney(selectedClient.monthlyRate, selectedClient.currency)}</p>
                </div>
                <div className="p-3 rounded-xl border border-border/40">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Balance</p>
                  <p className={`text-lg font-bold ${Number(selectedClient.balance) < 0 ? "text-red-600" : "text-green-600"}`}>
                    {formatMoney(selectedClient.balance, selectedClient.currency)}
                  </p>
                </div>
              </div>

              {/* Usage */}
              <div className="p-3 rounded-xl border border-border/40">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Uso del sistema</p>
                <div className="grid grid-cols-4 gap-3 text-center">
                  <div>
                    <p className="text-lg font-bold">{selectedClient.counts.properties}</p>
                    <p className="text-[10px] text-muted-foreground">Propiedades</p>
                    <p className="text-[9px] text-muted-foreground">de {selectedClient.maxProperties}</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold">{selectedClient.counts.leads}</p>
                    <p className="text-[10px] text-muted-foreground">Leads</p>
                    <p className="text-[9px] text-muted-foreground">de {selectedClient.maxLeads}</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold">{selectedClient.counts.contentPosts}</p>
                    <p className="text-[10px] text-muted-foreground">Contenido</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold">{selectedClient.counts.members}</p>
                    <p className="text-[10px] text-muted-foreground">Miembros</p>
                  </div>
                </div>
              </div>

              {/* Contact */}
              <div className="p-3 rounded-xl border border-border/40">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Contacto</p>
                <div className="space-y-2">
                  {selectedClient.owner && (
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-medium">{selectedClient.owner.name}</span>
                      <span className="text-muted-foreground">({selectedClient.owner.email})</span>
                    </div>
                  )}
                  {selectedClient.contactEmail && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-3.5 w-3.5" />
                      {selectedClient.contactEmail}
                    </div>
                  )}
                  {selectedClient.contactPhone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-3.5 w-3.5" />
                      {selectedClient.contactPhone}
                    </div>
                  )}
                </div>
              </div>

              {/* Dates */}
              <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/40">
                <span>Registrado: {new Date(selectedClient.createdAt).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}</span>
                {selectedClient.lastPaymentAt && (
                  <span>Último pago: {new Date(selectedClient.lastPaymentAt).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}</span>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      </>)}
    </div>
  );
}
