"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Megaphone,
  Plus,
  Loader2,
  Eye,
  MousePointerClick,
  DollarSign,
  Users,
  Pause,
  Play,
  Trash2,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Clock,
  FileEdit,
  Sparkles,
  RefreshCw,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

// ─── Types ──────────────────────────────────────────────────────────────

interface Campaign {
  id: string;
  name: string;
  objective: string;
  status: string;
  dailyBudget: string | null;
  currency: string;
  headline?: string | null;
  primaryText?: string | null;
  description?: string | null;
  callToAction?: string | null;
  headlines?: string[] | null;
  descriptions?: string[] | null;
  finalUrl?: string | null;
  impressions: number | null;
  clicks: number | null;
  leads: number | null;
  spent: string | null;
  conversions?: number | null;
  publishedAt: string | null;
  createdAt: string;
  errorMessage: string | null;
  property: {
    id: string;
    title: string;
    images: string[] | null;
    city: string | null;
  } | null;
  createdBy: {
    id: string;
    name: string | null;
    email: string;
  };
  platform: "meta" | "google";
}

interface PlatformStatus {
  connected: boolean;
  tokenExpired?: boolean;
  pageName?: string;
  adAccountName?: string;
  customerName?: string;
  customerId?: string;
  canAutoRefresh?: boolean;
}

// ─── Status config ──────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; icon: React.ElementType }
> = {
  DRAFT: { label: "Borrador", color: "bg-gray-100 text-gray-700", icon: FileEdit },
  PENDING_REVIEW: { label: "En Revisión", color: "bg-yellow-100 text-yellow-700", icon: Clock },
  ACTIVE: { label: "Activa", color: "bg-green-100 text-green-700", icon: Play },
  PAUSED: { label: "Pausada", color: "bg-orange-100 text-orange-700", icon: Pause },
  COMPLETED: { label: "Completada", color: "bg-blue-100 text-blue-700", icon: CheckCircle2 },
  ERROR: { label: "Error", color: "bg-red-100 text-red-700", icon: AlertCircle },
};

const OBJECTIVES: Record<string, string> = {
  LEAD_GENERATION: "Generación de Leads",
  TRAFFIC: "Tráfico",
  BRAND_AWARENESS: "Reconocimiento de Marca",
  ENGAGEMENT: "Engagement",
  CONVERSIONS: "Conversiones",
  MESSAGES: "Mensajes",
};

// ─── Page ───────────────────────────────────────────────────────────────

export default function CampaignsPage() {
  const [allCampaigns, setAllCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [metaStatus, setMetaStatus] = useState<PlatformStatus | null>(null);
  const [googleStatus, setGoogleStatus] = useState<PlatformStatus | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [platformFilter, setPlatformFilter] = useState<"all" | "meta" | "google">("all");
  const [createPlatform, setCreatePlatform] = useState<"meta" | "google">("meta");

  const [metaForm, setMetaForm] = useState({
    name: "",
    objective: "LEAD_GENERATION",
    dailyBudget: "20",
    headline: "",
    primaryText: "",
    description: "",
    callToAction: "LEARN_MORE",
  });

  const [googleForm, setGoogleForm] = useState({
    name: "",
    objective: "LEAD_GENERATION",
    dailyBudget: "20",
    headline1: "",
    headline2: "",
    headline3: "",
    description1: "",
    description2: "",
    finalUrl: "",
  });

  const fetchCampaigns = useCallback(async () => {
    try {
      const [metaRes, googleRes] = await Promise.all([
        fetch("/api/campaigns"),
        fetch("/api/campaigns/google"),
      ]);

      const metaCampaigns: Campaign[] = [];
      const googleCampaigns: Campaign[] = [];

      if (metaRes.ok) {
        const data = await metaRes.json();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (data.campaigns || []).forEach((c: any) => {
          metaCampaigns.push({ ...c, platform: "meta" as const });
        });
      }

      if (googleRes.ok) {
        const data = await googleRes.json();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (data.campaigns || []).forEach((c: any) => {
          googleCampaigns.push({ ...c, platform: "google" as const });
        });
      }

      const all = [...metaCampaigns, ...googleCampaigns].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      setAllCampaigns(all);
    } catch {
      toast.error("Error cargando campañas");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStatuses = useCallback(async () => {
    try {
      const [metaRes, googleRes] = await Promise.all([
        fetch("/api/integrations/meta/status"),
        fetch("/api/integrations/google/status"),
      ]);
      if (metaRes.ok) setMetaStatus(await metaRes.json());
      if (googleRes.ok) setGoogleStatus(await googleRes.json());
    } catch {
      // Ignore
    }
  }, []);

  useEffect(() => {
    fetchCampaigns();
    fetchStatuses();
  }, [fetchCampaigns, fetchStatuses]);

  // ─── Handlers ───────────────────────────────────────────────────────

  const handleCreateMeta = async () => {
    if (!metaForm.name || !metaForm.headline || !metaForm.primaryText) {
      toast.error("Nombre, headline y texto son requeridos");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: metaForm.name,
          objective: metaForm.objective,
          dailyBudget: parseFloat(metaForm.dailyBudget),
          headline: metaForm.headline,
          primaryText: metaForm.primaryText,
          description: metaForm.description,
          callToAction: metaForm.callToAction,
        }),
      });
      if (res.ok) {
        toast.success("Campaña de Meta creada en borrador");
        setShowCreate(false);
        setMetaForm({ name: "", objective: "LEAD_GENERATION", dailyBudget: "20", headline: "", primaryText: "", description: "", callToAction: "LEARN_MORE" });
        fetchCampaigns();
      } else {
        const data = await res.json();
        toast.error(data.error || "Error creando campaña");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setCreating(false);
    }
  };

  const handleCreateGoogle = async () => {
    if (!googleForm.name || !googleForm.headline1 || !googleForm.description1) {
      toast.error("Nombre, al menos 1 headline y 1 descripción son requeridos");
      return;
    }
    setCreating(true);
    try {
      const headlines = [googleForm.headline1, googleForm.headline2, googleForm.headline3].filter(Boolean);
      const descriptions = [googleForm.description1, googleForm.description2].filter(Boolean);
      const res = await fetch("/api/campaigns/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: googleForm.name,
          objective: googleForm.objective,
          dailyBudget: parseFloat(googleForm.dailyBudget),
          headlines,
          descriptions,
          finalUrl: googleForm.finalUrl || undefined,
        }),
      });
      if (res.ok) {
        toast.success("Campaña de Google creada en borrador");
        setShowCreate(false);
        setGoogleForm({ name: "", objective: "LEAD_GENERATION", dailyBudget: "20", headline1: "", headline2: "", headline3: "", description1: "", description2: "", finalUrl: "" });
        fetchCampaigns();
      } else {
        const data = await res.json();
        toast.error(data.error || "Error creando campaña");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setCreating(false);
    }
  };

  const handlePublish = async (campaign: Campaign) => {
    const basePath = campaign.platform === "google" ? "/api/campaigns/google" : "/api/campaigns";
    setPublishing(campaign.id);
    try {
      const res = await fetch(basePath + "/" + campaign.id + "/publish", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        toast.success("¡Campaña publicada en " + (campaign.platform === "google" ? "Google Ads" : "Meta Ads") + "!");
        fetchCampaigns();
      } else {
        toast.error(data.error || "Error publicando");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setPublishing(null);
    }
  };

  const handleDelete = async (campaign: Campaign) => {
    const basePath = campaign.platform === "google" ? "/api/campaigns/google" : "/api/campaigns";
    setDeleting(campaign.id);
    try {
      const res = await fetch(basePath + "/" + campaign.id, { method: "DELETE" });
      if (res.ok) {
        toast.success("Campaña eliminada");
        fetchCampaigns();
      } else {
        toast.error("Error eliminando campaña");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setDeleting(null);
    }
  };

  const handlePause = async (campaign: Campaign) => {
    const basePath = campaign.platform === "google" ? "/api/campaigns/google" : "/api/campaigns";
    try {
      const res = await fetch(basePath + "/" + campaign.id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "DRAFT" }),
      });
      if (res.ok) {
        toast.success("Campaña pausada");
        fetchCampaigns();
      }
    } catch {
      toast.error("Error pausando campaña");
    }
  };

  // ─── Filtered campaigns ──────────────────────────────────────────────

  const campaigns = platformFilter === "all"
    ? allCampaigns
    : allCampaigns.filter((c) => c.platform === platformFilter);

  // ─── Metrics ─────────────────────────────────────────────────────────

  const totalImpressions = campaigns.reduce((s, c) => s + (c.impressions || 0), 0);
  const totalClicks = campaigns.reduce((s, c) => s + (c.clicks || 0), 0);
  const totalLeads = campaigns.reduce((s, c) => s + (c.leads || 0), 0);
  const totalSpent = campaigns.reduce(
    (s, c) => s + (c.spent ? parseFloat(c.spent) : 0),
    0,
  );
  const activeCampaigns = campaigns.filter((c) => c.status === "ACTIVE").length;

  const isPublishDisabled = (campaign: Campaign) => {
    if (campaign.platform === "meta") return !metaStatus?.connected;
    if (campaign.platform === "google") return !googleStatus?.connected;
    return true;
  };

  // ─── Render ──────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-primary" />
            Campañas
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestiona tus campañas de Meta Ads y Google Ads
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl"
            onClick={() => {
              setLoading(true);
              fetchCampaigns();
            }}
          >
            <RefreshCw className={"h-4 w-4 mr-1 " + (loading ? "animate-spin" : "")} />
            Actualizar
          </Button>
          <Button
            className="bg-primary text-white rounded-xl hover:bg-foreground/90"
            onClick={() => setShowCreate(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Nueva Campaña
          </Button>
        </div>
      </div>

      {/* Platform filter tabs */}
      <Tabs value={platformFilter} onValueChange={(v) => setPlatformFilter(v as "all" | "meta" | "google")}>
        <TabsList className="rounded-xl bg-muted/50">
          <TabsTrigger value="all" className="rounded-lg text-xs">
            Todas ({allCampaigns.length})
          </TabsTrigger>
          <TabsTrigger value="meta" className="rounded-lg text-xs">
            <span className="mr-1">📱</span> Meta ({allCampaigns.filter((c) => c.platform === "meta").length})
          </TabsTrigger>
          <TabsTrigger value="google" className="rounded-lg text-xs">
            <Search className="h-3 w-3 mr-1" /> Google ({allCampaigns.filter((c) => c.platform === "google").length})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Connection banners */}
      {metaStatus && !metaStatus.connected && (platformFilter === "all" || platformFilter === "meta") && (
        <Card className="rounded-2xl border-yellow-200 bg-yellow-50">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-sm font-medium text-yellow-800">Meta Ads no está conectado</p>
                <p className="text-xs text-yellow-600">Conecta tu cuenta para publicar campañas en Facebook e Instagram</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="rounded-xl border-yellow-300 text-yellow-800 hover:bg-yellow-100" onClick={() => (window.location.href = "/settings?tab=integrations")}>
              Conectar Meta
            </Button>
          </CardContent>
        </Card>
      )}

      {googleStatus && !googleStatus.connected && (platformFilter === "all" || platformFilter === "google") && (
        <Card className="rounded-2xl border-blue-200 bg-blue-50">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-blue-800">Google Ads no está conectado</p>
                <p className="text-xs text-blue-600">Conecta tu cuenta para publicar campañas en Google Search y Display</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="rounded-xl border-blue-300 text-blue-800 hover:bg-blue-100" onClick={() => (window.location.href = "/settings?tab=integrations")}>
              Conectar Google
            </Button>
          </CardContent>
        </Card>
      )}

      {metaStatus?.connected && metaStatus.tokenExpired && (
        <Card className="rounded-2xl border-red-200 bg-red-50">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <p className="text-sm font-medium text-red-800">Tu token de Meta expiró. Reconecta tu cuenta.</p>
            </div>
            <Button variant="outline" size="sm" className="rounded-xl border-red-300" onClick={() => (window.location.href = "/settings?tab=integrations")}>
              Reconectar
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Megaphone className="h-3.5 w-3.5" />
              <span className="text-xs">Activas</span>
            </div>
            <p className="text-2xl font-bold">{activeCampaigns}</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Eye className="h-3.5 w-3.5" />
              <span className="text-xs">Impresiones</span>
            </div>
            <p className="text-2xl font-bold">
              {totalImpressions >= 1000 ? (totalImpressions / 1000).toFixed(1) + "k" : totalImpressions}
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <MousePointerClick className="h-3.5 w-3.5" />
              <span className="text-xs">Clics</span>
            </div>
            <p className="text-2xl font-bold">{totalClicks}</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Users className="h-3.5 w-3.5" />
              <span className="text-xs">Leads</span>
            </div>
            <p className="text-2xl font-bold">{totalLeads}</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <DollarSign className="h-3.5 w-3.5" />
              <span className="text-xs">Gastado</span>
            </div>
            <p className="text-2xl font-bold">{"$" + totalSpent.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Campaigns list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : campaigns.length === 0 ? (
        <Card className="rounded-2xl">
          <CardContent className="p-12 text-center">
            <Megaphone className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No tienes campañas aún</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Crea tu primera campaña de Meta o Google Ads, o pídele a Petunia que la cree por ti 🌸
            </p>
            <div className="flex items-center justify-center gap-2">
              <Button className="bg-primary text-white rounded-xl" onClick={() => setShowCreate(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Crear Campaña
              </Button>
              <Button
                variant="outline"
                className="rounded-xl"
                onClick={() => {
                  const event = new CustomEvent("petunia:open", {
                    detail: { message: "Quiero crear una campaña publicitaria para una de mis propiedades." },
                  });
                  window.dispatchEvent(event);
                }}
              >
                <Sparkles className="h-4 w-4 mr-1" />
                Pedir a Petunia
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {campaigns.map((campaign) => {
            const statusConfig = STATUS_CONFIG[campaign.status] || STATUS_CONFIG.DRAFT;
            const StatusIcon = statusConfig.icon;
            return (
              <Card
                key={campaign.platform + "-" + campaign.id}
                className="rounded-2xl border border-border/40 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300"
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold truncate">{campaign.name}</h3>
                        <Badge className={statusConfig.color + " text-[10px] shrink-0"}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusConfig.label}
                        </Badge>
                        {campaign.platform === "meta" ? (
                          <Badge className="bg-blue-100 text-blue-700 text-[10px] shrink-0">📱 Meta</Badge>
                        ) : (
                          <Badge className="bg-emerald-100 text-emerald-700 text-[10px] shrink-0">
                            <Search className="h-2.5 w-2.5 mr-0.5" />Google
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                        <span>{OBJECTIVES[campaign.objective] || campaign.objective}</span>
                        {campaign.dailyBudget && (
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            {parseFloat(campaign.dailyBudget).toFixed(0)}/día
                          </span>
                        )}
                        {campaign.property && (
                          <span className="truncate max-w-[200px]">🏠 {campaign.property.title}</span>
                        )}
                      </div>
                      {campaign.platform === "meta" && campaign.headline && (
                        <div className="rounded-xl bg-muted/30 p-3 mt-2 max-w-md">
                          <p className="text-xs font-semibold">{campaign.headline}</p>
                          {campaign.primaryText && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{campaign.primaryText}</p>
                          )}
                        </div>
                      )}
                      {campaign.platform === "google" && campaign.headlines && (campaign.headlines as string[]).length > 0 && (
                        <div className="rounded-xl bg-muted/30 p-3 mt-2 max-w-md">
                          <p className="text-xs font-semibold text-blue-700">
                            {(campaign.headlines as string[]).slice(0, 3).join(" | ")}
                          </p>
                          {campaign.descriptions && (campaign.descriptions as string[]).length > 0 && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {(campaign.descriptions as string[])[0]}
                            </p>
                          )}
                          {campaign.finalUrl && (
                            <p className="text-[10px] text-green-700 mt-1 truncate">{campaign.finalUrl}</p>
                          )}
                        </div>
                      )}
                      {campaign.status === "ERROR" && campaign.errorMessage && (
                        <div className="mt-2 rounded-lg bg-red-50 p-2 text-xs text-red-700">
                          <AlertCircle className="h-3 w-3 inline mr-1" />
                          {campaign.errorMessage}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      {campaign.publishedAt && (
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-right text-xs">
                          <div>
                            <span className="text-muted-foreground">Impresiones</span>
                            <p className="font-semibold">{(campaign.impressions || 0).toLocaleString()}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Clics</span>
                            <p className="font-semibold">{campaign.clicks || 0}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Leads</span>
                            <p className="font-semibold">{campaign.leads || 0}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Gastado</span>
                            <p className="font-semibold">{"$" + (campaign.spent ? parseFloat(campaign.spent).toFixed(2) : "0.00")}</p>
                          </div>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 mt-1">
                        {(campaign.status === "DRAFT" || campaign.status === "ERROR") && (
                          <>
                            <Button
                              size="sm"
                              className="rounded-lg bg-primary text-white text-xs h-7 px-3"
                              onClick={() => handlePublish(campaign)}
                              disabled={publishing === campaign.id || isPublishDisabled(campaign)}
                            >
                              {publishing === campaign.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <>
                                  <ExternalLink className="h-3 w-3 mr-1" />
                                  Publicar
                                </>
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="rounded-lg text-xs h-7 px-2 text-red-500 hover:text-red-700"
                              onClick={() => handleDelete(campaign)}
                              disabled={deleting === campaign.id}
                            >
                              {deleting === campaign.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Trash2 className="h-3 w-3" />
                              )}
                            </Button>
                          </>
                        )}
                        {campaign.status === "ACTIVE" && (
                          <Button size="sm" variant="outline" className="rounded-lg text-xs h-7 px-3" onClick={() => handlePause(campaign)}>
                            <Pause className="h-3 w-3 mr-1" />
                            Pausar
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Campaign Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-primary" />
              Nueva Campaña
            </DialogTitle>
          </DialogHeader>

          <Tabs value={createPlatform} onValueChange={(v) => setCreatePlatform(v as "meta" | "google")}>
            <TabsList className="w-full rounded-xl">
              <TabsTrigger value="meta" className="flex-1 rounded-lg text-xs">
                <span className="mr-1">📱</span> Meta Ads
              </TabsTrigger>
              <TabsTrigger value="google" className="flex-1 rounded-lg text-xs">
                <Search className="h-3 w-3 mr-1" /> Google Ads
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {createPlatform === "meta" && (
            <div className="space-y-4 mt-2">
              <div className="grid gap-2">
                <Label>Nombre de la Campaña</Label>
                <Input className="rounded-xl" placeholder="Ej: Campaña Departamento Centro" value={metaForm.name} onChange={(e) => setMetaForm({ ...metaForm, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label>Objetivo</Label>
                  <Select value={metaForm.objective} onValueChange={(v) => v && setMetaForm({ ...metaForm, objective: v })}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LEAD_GENERATION">Generación de Leads</SelectItem>
                      <SelectItem value="TRAFFIC">Tráfico</SelectItem>
                      <SelectItem value="BRAND_AWARENESS">Reconocimiento</SelectItem>
                      <SelectItem value="ENGAGEMENT">Engagement</SelectItem>
                      <SelectItem value="MESSAGES">Mensajes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Presupuesto diario (USD)</Label>
                  <Input className="rounded-xl" type="number" min="1" step="1" value={metaForm.dailyBudget} onChange={(e) => setMetaForm({ ...metaForm, dailyBudget: e.target.value })} />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Headline del Anuncio</Label>
                <Input className="rounded-xl" placeholder="Ej: Tu nuevo hogar te espera" maxLength={40} value={metaForm.headline} onChange={(e) => setMetaForm({ ...metaForm, headline: e.target.value })} />
                <p className="text-[10px] text-muted-foreground text-right">{metaForm.headline.length}/40</p>
              </div>
              <div className="grid gap-2">
                <Label>Texto Principal</Label>
                <Textarea className="rounded-xl resize-none" rows={3} placeholder="Describe tu propiedad en 1-2 oraciones..." maxLength={125} value={metaForm.primaryText} onChange={(e) => setMetaForm({ ...metaForm, primaryText: e.target.value })} />
                <p className="text-[10px] text-muted-foreground text-right">{metaForm.primaryText.length}/125</p>
              </div>
              <div className="grid gap-2">
                <Label>Descripción (opcional)</Label>
                <Input className="rounded-xl" placeholder="Breve descripción extra" maxLength={30} value={metaForm.description} onChange={(e) => setMetaForm({ ...metaForm, description: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Botón de Acción</Label>
                <Select value={metaForm.callToAction} onValueChange={(v) => v && setMetaForm({ ...metaForm, callToAction: v })}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LEARN_MORE">Más Información</SelectItem>
                    <SelectItem value="CONTACT_US">Contáctanos</SelectItem>
                    <SelectItem value="SIGN_UP">Registrarse</SelectItem>
                    <SelectItem value="GET_QUOTE">Obtener Cotización</SelectItem>
                    <SelectItem value="SEND_WHATSAPP_MESSAGE">WhatsApp</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" className="rounded-xl" onClick={() => setShowCreate(false)}>Cancelar</Button>
                <Button className="bg-primary text-white rounded-xl hover:bg-foreground/90" onClick={handleCreateMeta} disabled={creating}>
                  {creating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
                  Crear Borrador
                </Button>
              </div>
            </div>
          )}

          {createPlatform === "google" && (
            <div className="space-y-4 mt-2">
              <div className="grid gap-2">
                <Label>Nombre de la Campaña</Label>
                <Input className="rounded-xl" placeholder="Ej: Google Ads - Departamento Centro" value={googleForm.name} onChange={(e) => setGoogleForm({ ...googleForm, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label>Objetivo</Label>
                  <Select value={googleForm.objective} onValueChange={(v) => v && setGoogleForm({ ...googleForm, objective: v })}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LEAD_GENERATION">Generación de Leads</SelectItem>
                      <SelectItem value="TRAFFIC">Tráfico</SelectItem>
                      <SelectItem value="BRAND_AWARENESS">Reconocimiento</SelectItem>
                      <SelectItem value="CONVERSIONS">Conversiones</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Presupuesto diario (USD)</Label>
                  <Input className="rounded-xl" type="number" min="1" step="1" value={googleForm.dailyBudget} onChange={(e) => setGoogleForm({ ...googleForm, dailyBudget: e.target.value })} />
                </div>
              </div>
              <div className="rounded-xl bg-muted/20 p-3 space-y-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Headlines (máx 30 caracteres)</p>
                <Input className="rounded-xl" placeholder="Headline 1 *" maxLength={30} value={googleForm.headline1} onChange={(e) => setGoogleForm({ ...googleForm, headline1: e.target.value })} />
                <Input className="rounded-xl" placeholder="Headline 2 (opcional)" maxLength={30} value={googleForm.headline2} onChange={(e) => setGoogleForm({ ...googleForm, headline2: e.target.value })} />
                <Input className="rounded-xl" placeholder="Headline 3 (opcional)" maxLength={30} value={googleForm.headline3} onChange={(e) => setGoogleForm({ ...googleForm, headline3: e.target.value })} />
              </div>
              <div className="rounded-xl bg-muted/20 p-3 space-y-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Descripciones (máx 90 caracteres)</p>
                <Textarea className="rounded-xl resize-none" rows={2} placeholder="Descripción 1 *" maxLength={90} value={googleForm.description1} onChange={(e) => setGoogleForm({ ...googleForm, description1: e.target.value })} />
                <Textarea className="rounded-xl resize-none" rows={2} placeholder="Descripción 2 (opcional)" maxLength={90} value={googleForm.description2} onChange={(e) => setGoogleForm({ ...googleForm, description2: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>URL de Destino (opcional)</Label>
                <Input className="rounded-xl" placeholder="https://tu-sitio.com/propiedad" value={googleForm.finalUrl} onChange={(e) => setGoogleForm({ ...googleForm, finalUrl: e.target.value })} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" className="rounded-xl" onClick={() => setShowCreate(false)}>Cancelar</Button>
                <Button className="bg-primary text-white rounded-xl hover:bg-foreground/90" onClick={handleCreateGoogle} disabled={creating}>
                  {creating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
                  Crear Borrador
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
