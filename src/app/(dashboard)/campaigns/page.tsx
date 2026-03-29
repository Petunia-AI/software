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
  Pencil,
  ShieldCheck,
  Brain,
  MapPin,
  TrendingUp,
  Zap,
  ArrowRight,
  ChevronLeft,
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

  // Edit / approval state
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editMetaForm, setEditMetaForm] = useState({
    name: "", objective: "LEAD_GENERATION", dailyBudget: "20",
    headline: "", primaryText: "", description: "", callToAction: "LEARN_MORE",
  });
  const [editGoogleForm, setEditGoogleForm] = useState({
    name: "", objective: "LEAD_GENERATION", dailyBudget: "20",
    headline1: "", headline2: "", headline3: "",
    description1: "", description2: "", finalUrl: "",
  });

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

  // ─── AI Wizard state ─────────────────────────────────────────────────
  const [showAiWizard, setShowAiWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardGoal, setWizardGoal] = useState("");
  const [wizardLocation, setWizardLocation] = useState("");
  const [wizardPropertyType, setWizardPropertyType] = useState("");
  const [wizardPriceRange, setWizardPriceRange] = useState("");
  const [wizardBudget, setWizardBudget] = useState("20");
  const [wizardCustomBudget, setWizardCustomBudget] = useState("");
  const [wizardGenerating, setWizardGenerating] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [wizardResult, setWizardResult] = useState<Record<string, any> | null>(null);
  const [wizardLaunching, setWizardLaunching] = useState<"draft" | "publish" | null>(null);

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

  const handleEditOpen = (campaign: Campaign) => {
    setEditingCampaign(campaign);
    if (campaign.platform === "meta") {
      setEditMetaForm({
        name: campaign.name,
        objective: campaign.objective,
        dailyBudget: campaign.dailyBudget ? parseFloat(campaign.dailyBudget).toFixed(0) : "20",
        headline: campaign.headline || "",
        primaryText: campaign.primaryText || "",
        description: campaign.description || "",
        callToAction: campaign.callToAction || "LEARN_MORE",
      });
    } else {
      const headlines = (campaign.headlines as string[] | null) || [];
      const descs = (campaign.descriptions as string[] | null) || [];
      setEditGoogleForm({
        name: campaign.name,
        objective: campaign.objective,
        dailyBudget: campaign.dailyBudget ? parseFloat(campaign.dailyBudget).toFixed(0) : "20",
        headline1: headlines[0] || "",
        headline2: headlines[1] || "",
        headline3: headlines[2] || "",
        description1: descs[0] || "",
        description2: descs[1] || "",
        finalUrl: campaign.finalUrl || "",
      });
    }
  };

  const handleEditSave = async () => {
    if (!editingCampaign) return;
    setSavingEdit(true);
    const basePath = editingCampaign.platform === "google" ? "/api/campaigns/google" : "/api/campaigns";
    const body =
      editingCampaign.platform === "meta"
        ? {
            name: editMetaForm.name,
            objective: editMetaForm.objective,
            dailyBudget: parseFloat(editMetaForm.dailyBudget),
            headline: editMetaForm.headline,
            primaryText: editMetaForm.primaryText,
            description: editMetaForm.description,
            callToAction: editMetaForm.callToAction,
          }
        : {
            name: editGoogleForm.name,
            objective: editGoogleForm.objective,
            dailyBudget: parseFloat(editGoogleForm.dailyBudget),
            headlines: [editGoogleForm.headline1, editGoogleForm.headline2, editGoogleForm.headline3].filter(Boolean),
            descriptions: [editGoogleForm.description1, editGoogleForm.description2].filter(Boolean),
            finalUrl: editGoogleForm.finalUrl || undefined,
          };
    try {
      const res = await fetch(`${basePath}/${editingCampaign.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        toast.success("Cambios guardados");
        setEditingCampaign(null);
        fetchCampaigns();
      } else {
        const data = await res.json();
        toast.error(data.error || "Error guardando cambios");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSavingEdit(false);
    }
  };

  // ─── AI Wizard handlers ──────────────────────────────────────────────

  const handleAiGenerate = async () => {
    const effectiveBudget = wizardBudget === "custom" ? wizardCustomBudget : wizardBudget;
    setWizardGenerating(true);
    try {
      const res = await fetch("/api/ai/campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal: wizardGoal,
          location: wizardLocation,
          budget: effectiveBudget,
          propertyType: wizardPropertyType || undefined,
          priceRange: wizardPriceRange || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error generando campaña");
      setWizardResult(data.campaign);
      setWizardStep(4);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error generando campaña");
    } finally {
      setWizardGenerating(false);
    }
  };

  const handleAiLaunch = async (publishNow: boolean) => {
    if (!wizardResult) return;
    setWizardLaunching(publishNow ? "publish" : "draft");
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: wizardResult.campaignName,
          objective: wizardResult.objective,
          dailyBudget: wizardResult.dailyBudget,
          headline: wizardResult.headline,
          primaryText: wizardResult.primaryText,
          description: wizardResult.description,
          callToAction: wizardResult.callToAction,
          targetAgeMin: wizardResult.targetAgeMin,
          targetAgeMax: wizardResult.targetAgeMax,
          targetGenders: wizardResult.targetGenders,
          targetLocations: wizardResult.targetLocations,
          targetInterests: wizardResult.targetInterests,
          targetPlatforms: wizardResult.targetPlatforms,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error creando campaña");

      const campaignId = data.campaign?.id;
      if (publishNow && campaignId) {
        const pubRes = await fetch(`/api/campaigns/${campaignId}/publish`, { method: "POST" });
        const pubData = await pubRes.json();
        if (!pubRes.ok) throw new Error(pubData.error || "Error publicando campaña");
        toast.success("¡Campaña lanzada en Meta Ads! 🚀");
      } else {
        toast.success("Borrador guardado ✓");
      }

      setShowAiWizard(false);
      setWizardStep(1);
      setWizardResult(null);
      setWizardGoal("");
      setWizardLocation("");
      setWizardPropertyType("");
      setWizardPriceRange("");
      setWizardBudget("20");
      setWizardCustomBudget("");
      fetchCampaigns();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setWizardLaunching(null);
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
      {allCampaigns.length === 0 && metaStatus && !metaStatus.connected && googleStatus && !googleStatus.connected ? null : (
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
      )}

      {/* ── Pending Approval section ─────────────────────────────────── */}
      {!loading && campaigns.filter((c) => c.status === "DRAFT" || c.status === "ERROR").length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <ShieldCheck className="h-4 w-4 text-amber-600" />
            <h2 className="text-sm font-semibold text-amber-800">
              Pendientes de aprobación ({campaigns.filter((c) => c.status === "DRAFT" || c.status === "ERROR").length})
            </h2>
            <span className="text-xs text-amber-600">— Revisa y aprueba antes de publicar</span>
          </div>
          {campaigns
            .filter((c) => c.status === "DRAFT" || c.status === "ERROR")
            .map((campaign) => {
              const statusConfig = STATUS_CONFIG[campaign.status] || STATUS_CONFIG.DRAFT;
              const StatusIcon = statusConfig.icon;
              return (
                <Card
                  key={"draft-" + campaign.platform + "-" + campaign.id}
                  className="rounded-2xl border-2 border-amber-200 bg-amber-50/50"
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
                          <div className="rounded-xl bg-white border border-amber-200 p-3 mt-2 max-w-md">
                            <p className="text-xs font-semibold">{campaign.headline}</p>
                            {campaign.primaryText && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{campaign.primaryText}</p>
                            )}
                          </div>
                        )}
                        {campaign.platform === "google" && campaign.headlines && (campaign.headlines as string[]).length > 0 && (
                          <div className="rounded-xl bg-white border border-amber-200 p-3 mt-2 max-w-md">
                            <p className="text-xs font-semibold text-blue-700">
                              {(campaign.headlines as string[]).slice(0, 3).join(" | ")}
                            </p>
                            {campaign.descriptions && (campaign.descriptions as string[]).length > 0 && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {(campaign.descriptions as string[])[0]}
                              </p>
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
                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-lg text-xs h-7 px-3 border-amber-300 text-amber-700 hover:bg-amber-100"
                            onClick={() => handleEditOpen(campaign)}
                          >
                            <Pencil className="h-3 w-3 mr-1" />
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            className="rounded-lg text-xs h-7 px-3 bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => handlePublish(campaign)}
                            disabled={publishing === campaign.id || isPublishDisabled(campaign)}
                          >
                            {publishing === campaign.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <>
                                <ShieldCheck className="h-3 w-3 mr-1" />
                                Aprobar y Publicar
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
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
        </div>
      )}

      {/* ── Published / Active Campaigns list ──────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : campaigns.filter((c) => c.status !== "DRAFT" && c.status !== "ERROR").length === 0 &&
        campaigns.filter((c) => c.status === "DRAFT" || c.status === "ERROR").length === 0 ? (
        <Card className="rounded-2xl">
          <CardContent className="p-12 text-center">
            <Megaphone className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No tienes campañas aún</h3>
            <p className="text-sm text-muted-foreground mb-2">
              Crea tu primera campaña de Meta o Google Ads, o pídele a Petunia que la cree por ti 🌸
            </p>
            <p className="text-xs text-muted-foreground/70 mb-6">
              Para publicar campañas, primero conecta tu cuenta publicitaria en{" "}
              <a href="/settings" className="text-primary underline underline-offset-2">
                Configuración →
              </a>
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
      ) : campaigns.filter((c) => c.status !== "DRAFT" && c.status !== "ERROR").length > 0 ? (
        <div className="space-y-3">
          {campaigns
            .filter((c) => c.status !== "DRAFT" && c.status !== "ERROR")
            .map((campaign) => {
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
      ) : null}

      {/* ── Edit Campaign Dialog ──────────────────────────────────────── */}
      <Dialog open={!!editingCampaign} onOpenChange={(open) => { if (!open) setEditingCampaign(null); }}>
        <DialogContent className="max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary" />
              Editar Campaña
            </DialogTitle>
          </DialogHeader>

          {editingCampaign?.platform === "meta" && (
            <div className="space-y-4 mt-2">
              <div className="grid gap-2">
                <Label>Nombre</Label>
                <Input className="rounded-xl" value={editMetaForm.name} onChange={(e) => setEditMetaForm({ ...editMetaForm, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label>Objetivo</Label>
                  <Select value={editMetaForm.objective} onValueChange={(v) => v && setEditMetaForm({ ...editMetaForm, objective: v })}>
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
                  <Input className="rounded-xl" type="number" min="1" step="1" value={editMetaForm.dailyBudget} onChange={(e) => setEditMetaForm({ ...editMetaForm, dailyBudget: e.target.value })} />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Headline del Anuncio</Label>
                <Input className="rounded-xl" maxLength={40} value={editMetaForm.headline} onChange={(e) => setEditMetaForm({ ...editMetaForm, headline: e.target.value })} />
                <p className="text-[10px] text-muted-foreground text-right">{editMetaForm.headline.length}/40</p>
              </div>
              <div className="grid gap-2">
                <Label>Texto Principal</Label>
                <Textarea className="rounded-xl resize-none" rows={4} maxLength={125} value={editMetaForm.primaryText} onChange={(e) => setEditMetaForm({ ...editMetaForm, primaryText: e.target.value })} />
                <p className="text-[10px] text-muted-foreground text-right">{editMetaForm.primaryText.length}/125</p>
              </div>
              <div className="grid gap-2">
                <Label>Descripción (opcional)</Label>
                <Input className="rounded-xl" maxLength={30} value={editMetaForm.description} onChange={(e) => setEditMetaForm({ ...editMetaForm, description: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Botón de Acción</Label>
                <Select value={editMetaForm.callToAction} onValueChange={(v) => v && setEditMetaForm({ ...editMetaForm, callToAction: v })}>
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
                <Button variant="outline" className="rounded-xl" onClick={() => setEditingCampaign(null)}>Cancelar</Button>
                <Button className="bg-primary text-white rounded-xl" onClick={handleEditSave} disabled={savingEdit}>
                  {savingEdit ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                  Guardar cambios
                </Button>
              </div>
            </div>
          )}

          {editingCampaign?.platform === "google" && (
            <div className="space-y-4 mt-2">
              <div className="grid gap-2">
                <Label>Nombre</Label>
                <Input className="rounded-xl" value={editGoogleForm.name} onChange={(e) => setEditGoogleForm({ ...editGoogleForm, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label>Objetivo</Label>
                  <Select value={editGoogleForm.objective} onValueChange={(v) => v && setEditGoogleForm({ ...editGoogleForm, objective: v })}>
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
                  <Input className="rounded-xl" type="number" min="1" step="1" value={editGoogleForm.dailyBudget} onChange={(e) => setEditGoogleForm({ ...editGoogleForm, dailyBudget: e.target.value })} />
                </div>
              </div>
              <div className="rounded-xl bg-muted/20 p-3 space-y-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Headlines (máx 30 caracteres)</p>
                <Input className="rounded-xl" placeholder="Headline 1 *" maxLength={30} value={editGoogleForm.headline1} onChange={(e) => setEditGoogleForm({ ...editGoogleForm, headline1: e.target.value })} />
                <Input className="rounded-xl" placeholder="Headline 2" maxLength={30} value={editGoogleForm.headline2} onChange={(e) => setEditGoogleForm({ ...editGoogleForm, headline2: e.target.value })} />
                <Input className="rounded-xl" placeholder="Headline 3" maxLength={30} value={editGoogleForm.headline3} onChange={(e) => setEditGoogleForm({ ...editGoogleForm, headline3: e.target.value })} />
              </div>
              <div className="rounded-xl bg-muted/20 p-3 space-y-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Descripciones (máx 90 caracteres)</p>
                <Textarea className="rounded-xl resize-none" rows={2} maxLength={90} value={editGoogleForm.description1} onChange={(e) => setEditGoogleForm({ ...editGoogleForm, description1: e.target.value })} />
                <Textarea className="rounded-xl resize-none" rows={2} maxLength={90} value={editGoogleForm.description2} onChange={(e) => setEditGoogleForm({ ...editGoogleForm, description2: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>URL de Destino (opcional)</Label>
                <Input className="rounded-xl" value={editGoogleForm.finalUrl} onChange={(e) => setEditGoogleForm({ ...editGoogleForm, finalUrl: e.target.value })} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" className="rounded-xl" onClick={() => setEditingCampaign(null)}>Cancelar</Button>
                <Button className="bg-primary text-white rounded-xl" onClick={handleEditSave} disabled={savingEdit}>
                  {savingEdit ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                  Guardar cambios
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

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

      {/* ── AI Campaign Wizard ─────────────────────────────────────────── */}
      <Dialog
        open={showAiWizard}
        onOpenChange={(open) => {
          if (!open) { setShowAiWizard(false); setWizardStep(1); setWizardResult(null); }
        }}
      >
        <DialogContent className="max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              {wizardStep === 1 && "¿Cuál es tu objetivo?"}
              {wizardStep === 2 && "Detalles de la campaña"}
              {wizardStep === 3 && "Presupuesto diario"}
              {wizardStep === 4 && "Tu campaña está lista ✨"}
            </DialogTitle>
          </DialogHeader>

          {/* Progress pills */}
          <div className="flex items-center gap-1.5 justify-center py-1">
            {[1, 2, 3, 4].map((step) => (
              <div
                key={step}
                className={`rounded-full transition-all ${
                  wizardStep >= step
                    ? "w-6 h-2 bg-primary"
                    : "w-2 h-2 bg-muted-foreground/25"
                }`}
              />
            ))}
          </div>

          {/* ── Step 1: Goal ── */}
          {wizardStep === 1 && (
            <div className="space-y-3 mt-1">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: "captar compradores", icon: "🏠", label: "Captar compradores", desc: "Personas buscando comprar" },
                  { id: "captar vendedores",  icon: "💰", label: "Captar vendedores",  desc: "Propietarios que quieren vender" },
                  { id: "generar tráfico",    icon: "🔗", label: "Generar tráfico",    desc: "Visitas a tu sitio web" },
                  { id: "reconocimiento de marca", icon: "⭐", label: "Brand awareness", desc: "Dar a conocer tu marca" },
                ].map((goal) => (
                  <button
                    key={goal.id}
                    onClick={() => { setWizardGoal(goal.id); setWizardStep(2); }}
                    className={`flex flex-col items-center text-center p-4 rounded-2xl border-2 transition-all hover:border-primary/50 hover:bg-primary/5 cursor-pointer ${
                      wizardGoal === goal.id ? "border-primary bg-primary/5" : "border-border"
                    }`}
                  >
                    <span className="text-2xl mb-2">{goal.icon}</span>
                    <span className="font-semibold text-sm">{goal.label}</span>
                    <span className="text-xs text-muted-foreground mt-1">{goal.desc}</span>
                  </button>
                ))}
              </div>
              <div className="text-center pt-1">
                <button
                  onClick={() => { setShowAiWizard(false); setShowCreate(true); }}
                  className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
                >
                  Prefiero crear la campaña manualmente →
                </button>
              </div>
            </div>
          )}

          {/* ── Step 2: Details ── */}
          {wizardStep === 2 && (
            <div className="space-y-4 mt-2">
              <div className="grid gap-2">
                <Label className="flex items-center gap-1.5 text-sm">
                  <MapPin className="h-3.5 w-3.5" /> Ubicación *
                </Label>
                <Input
                  className="rounded-xl"
                  placeholder="Ej: Miami, Florida"
                  value={wizardLocation}
                  onChange={(e) => setWizardLocation(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-sm">Tipo de propiedad</Label>
                <div className="flex flex-wrap gap-2">
                  {["Casas", "Condos", "Terrenos", "Comercial", "Lujo", "Multifamiliar"].map((type) => (
                    <button
                      key={type}
                      onClick={() => setWizardPropertyType(wizardPropertyType === type ? "" : type)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer ${
                        wizardPropertyType === type
                          ? "bg-primary text-white border-primary"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid gap-2">
                <Label className="text-sm">Rango de precio <span className="text-muted-foreground">(opcional)</span></Label>
                <Input
                  className="rounded-xl"
                  placeholder="Ej: $300,000 – $600,000"
                  value={wizardPriceRange}
                  onChange={(e) => setWizardPriceRange(e.target.value)}
                />
              </div>
              <div className="flex justify-between pt-2">
                <Button variant="outline" className="rounded-xl" onClick={() => setWizardStep(1)}>
                  <ChevronLeft className="h-4 w-4 mr-1" /> Atrás
                </Button>
                <Button
                  className="bg-primary text-white rounded-xl"
                  onClick={() => setWizardStep(3)}
                  disabled={!wizardLocation.trim()}
                >
                  Continuar <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* ── Step 3: Budget ── */}
          {wizardStep === 3 && (
            <div className="space-y-4 mt-2">
              <p className="text-sm text-muted-foreground">Selecciona tu presupuesto diario en USD</p>
              <div className="grid grid-cols-4 gap-2">
                {["10", "20", "50", "100"].map((amount) => (
                  <button
                    key={amount}
                    onClick={() => { setWizardBudget(amount); setWizardCustomBudget(""); }}
                    className={`flex flex-col items-center justify-center py-4 rounded-2xl border-2 transition-all cursor-pointer ${
                      wizardBudget === amount && wizardCustomBudget === ""
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <span className="font-bold text-base">${amount}</span>
                    <span className="text-[10px] text-muted-foreground">/día</span>
                  </button>
                ))}
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs text-muted-foreground">O ingresa un monto personalizado</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">$</span>
                  <Input
                    className="rounded-xl pl-7"
                    type="number"
                    min="5"
                    placeholder="Monto personalizado"
                    value={wizardCustomBudget}
                    onChange={(e) => {
                      setWizardCustomBudget(e.target.value);
                      if (e.target.value) setWizardBudget("custom");
                      else setWizardBudget("20");
                    }}
                  />
                </div>
              </div>
              <div className="flex justify-between pt-2">
                <Button variant="outline" className="rounded-xl" onClick={() => setWizardStep(2)}>
                  <ChevronLeft className="h-4 w-4 mr-1" /> Atrás
                </Button>
                <Button
                  className="bg-primary text-white rounded-xl"
                  onClick={handleAiGenerate}
                  disabled={wizardGenerating || (!wizardBudget || (wizardBudget === "custom" && !wizardCustomBudget))}
                >
                  {wizardGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Generando...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generar con IA
                    </>
                  )}
                </Button>
              </div>
              {wizardGenerating && (
                <div className="rounded-xl bg-primary/5 border border-primary/20 p-3 text-center animate-pulse">
                  <p className="text-xs text-primary font-medium">✨ Petunia está diseñando tu campaña perfecta...</p>
                </div>
              )}
            </div>
          )}

          {/* ── Step 4: AI Preview ── */}
          {wizardStep === 4 && wizardResult && (
            <div className="space-y-4 mt-2">

              {/* Ad copy preview */}
              <div className="rounded-2xl border bg-card overflow-hidden">
                <div className="px-4 py-2.5 border-b bg-muted/20 flex items-center gap-1.5">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Vista previa del anuncio</span>
                  <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium ml-auto">📱 Meta Ads</span>
                </div>
                <div className="p-4 space-y-2">
                  <p className="font-bold text-sm leading-snug">{wizardResult.headline}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{wizardResult.primaryText}</p>
                  {wizardResult.description && (
                    <p className="text-xs text-muted-foreground">{wizardResult.description}</p>
                  )}
                  <div className="flex items-center gap-2 flex-wrap mt-2">
                    <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                      {wizardResult.callToAction}
                    </span>
                    {(wizardResult.targetPlatforms as string[]).map((p: string) => (
                      <span key={p} className="text-[10px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground capitalize">{p}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Estimates */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-green-50 border border-green-100 p-3 text-center">
                  <TrendingUp className="h-4 w-4 text-green-600 mx-auto mb-1" />
                  <p className="text-lg font-bold text-green-700">{wizardResult.estimatedLeadsPerDay}</p>
                  <p className="text-[10px] text-green-600">leads/día estimados</p>
                </div>
                <div className="rounded-xl bg-blue-50 border border-blue-100 p-3 text-center">
                  <DollarSign className="h-4 w-4 text-blue-600 mx-auto mb-1" />
                  <p className="text-lg font-bold text-blue-700">{wizardResult.estimatedCostPerLead}</p>
                  <p className="text-[10px] text-blue-600">costo por lead est.</p>
                </div>
              </div>

              {/* Targeting summary */}
              <div className="rounded-xl bg-muted/30 p-3 space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Segmentación automática</p>
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-xs bg-background px-2 py-0.5 rounded-full border">
                    👥 {wizardResult.targetAgeMin}–{wizardResult.targetAgeMax} años
                  </span>
                  {(wizardResult.targetLocations as string[]).map((loc: string) => (
                    <span key={loc} className="text-xs bg-background px-2 py-0.5 rounded-full border">
                      📍 {loc}
                    </span>
                  ))}
                  {(wizardResult.targetInterests as string[]).slice(0, 3).map((interest: string) => (
                    <span key={interest} className="text-xs bg-background px-2 py-0.5 rounded-full border">
                      🎯 {interest}
                    </span>
                  ))}
                </div>
              </div>

              {/* Rationale */}
              <div className="rounded-xl bg-primary/5 border border-primary/20 p-3">
                <p className="text-[10px] font-semibold text-primary uppercase tracking-widest mb-1.5">¿Por qué va a funcionar?</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{wizardResult.rationale}</p>
              </div>

              {/* Campaign name + budget */}
              <div className="flex items-center justify-between text-xs text-muted-foreground px-0.5">
                <span className="font-medium truncate mr-2">{wizardResult.campaignName}</span>
                <span className="shrink-0">${wizardResult.dailyBudget}/día</span>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 pt-1">
                <Button
                  variant="outline"
                  className="rounded-xl text-xs px-3"
                  onClick={() => setWizardStep(3)}
                  disabled={!!wizardLaunching}
                >
                  <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                  Cambiar
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 rounded-xl text-xs"
                  onClick={() => handleAiLaunch(false)}
                  disabled={!!wizardLaunching}
                >
                  {wizardLaunching === "draft" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                  ) : null}
                  Guardar borrador
                </Button>
                {metaStatus?.connected && (
                  <Button
                    className="flex-1 bg-primary text-white rounded-xl text-xs"
                    onClick={() => handleAiLaunch(true)}
                    disabled={!!wizardLaunching}
                  >
                    {wizardLaunching === "publish" ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                    ) : (
                      <Zap className="h-3.5 w-3.5 mr-1" />
                    )}
                    Lanzar ahora
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
