"use client";

import { useState, useEffect, useCallback } from "react";
import {
  LayoutTemplate,
  Plus,
  Eye,
  Pencil,
  Copy,
  Users,
  TrendingUp,
  Globe,
  FileText,
  Sparkles,
  Loader2,
  ExternalLink,
  BarChart3,
  MousePointerClick,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

/* ── Types ── */

interface LandingPage {
  id: string;
  title: string;
  description: string | null;
  template: string;
  status: "ACTIVE" | "DRAFT";
  leads: number;
  views: number;
  conversionRate: number | null;
  createdAt: string;
  slug: string;
  nicho: string | null;
  html: string | null;
}

/* ── Template config ── */

const templateTypes = [
  {
    value: "compradores",
    label: "Compradores Florida",
    description: "Landing para captar compradores interesados en propiedades en Florida",
    icon: Users,
  },
  {
    value: "sellers",
    label: "Valuacion para Sellers",
    description: "Pagina de valuacion gratuita para captar propietarios que quieren vender",
    icon: TrendingUp,
  },
  {
    value: "inversores",
    label: "Inversion en Terrenos",
    description: "Captura de leads interesados en oportunidades de inversion en terrenos",
    icon: BarChart3,
  },
  {
    value: "proyecto",
    label: "Proyecto Especifico",
    description: "Landing personalizada para un desarrollo o proyecto inmobiliario",
    icon: FileText,
  },
];

const nichoOptions = [
  { value: "residencial-lujo", label: "Residencial de lujo" },
  { value: "primera-vivienda", label: "Primera vivienda" },
  { value: "inversion", label: "Inversion" },
  { value: "comercial", label: "Comercial" },
  { value: "terrenos", label: "Terrenos" },
  { value: "preventa", label: "Preventa" },
];

const statusConfig: Record<string, { label: string; classes: string }> = {
  ACTIVE: {
    label: "Activa",
    classes: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  },
  DRAFT: {
    label: "Borrador",
    classes: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  },
};

/* ── Component ── */

export default function LandingPagesPage() {
  const [pages, setPages] = useState<LandingPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState("");

  const [form, setForm] = useState({
    title: "",
    template: "",
    nicho: "",
  });

  /* ── Fetch pages from DB ── */

  const fetchPages = useCallback(async () => {
    try {
      const res = await fetch("/api/landing-pages");
      if (!res.ok) throw new Error("Error al cargar");
      const data = await res.json();
      setPages(data);
    } catch {
      setPages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPages();
  }, [fetchPages]);

  /* ── Stats ── */

  const totalPages = pages.length;
  const totalLeads = pages.reduce((sum, p) => sum + (p.leads || 0), 0);
  const avgConversion =
    pages.length > 0
      ? (pages.reduce((sum, p) => sum + Number(p.conversionRate || 0), 0) / pages.length).toFixed(1)
      : "0";
  const activePages = pages.filter((p) => p.status === "ACTIVE").length;

  const stats = [
    {
      label: "Total paginas",
      value: totalPages,
      icon: LayoutTemplate,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      label: "Leads capturados",
      value: totalLeads,
      icon: Users,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    {
      label: "Tasa de conversion",
      value: `${avgConversion}%`,
      icon: MousePointerClick,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    },
    {
      label: "Paginas activas",
      value: activePages,
      icon: Globe,
      color: "text-[#611f69]",
      bg: "bg-[#4A154B]/10",
    },
  ];

  /* ── Handlers ── */

  const handleCreate = async () => {
    if (!form.title.trim()) {
      toast.error("El titulo es requerido");
      return;
    }
    if (!form.template) {
      toast.error("Selecciona un tipo de template");
      return;
    }
    if (!form.nicho) {
      toast.error("Selecciona un nicho de mercado");
      return;
    }

    setCreating(true);

    try {
      const nichoLabel = nichoOptions.find((n) => n.value === form.nicho)?.label || form.nicho;

      // Step 1: Generate HTML with AI
      const aiRes = await fetch("/api/ai/landing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          template: form.template,
          market: nichoLabel,
        }),
      });

      if (!aiRes.ok) {
        const data = await aiRes.json().catch(() => ({}));
        throw new Error(data.error || "Error al generar la landing page");
      }

      const aiData = await aiRes.json();
      const templateInfo = templateTypes.find((t) => t.value === form.template);

      // Step 2: Save to database
      const saveRes = await fetch("/api/landing-pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: templateInfo?.description || "Landing page creada con IA",
          template: form.template,
          nicho: form.nicho,
          html: aiData.html,
          status: "DRAFT",
        }),
      });

      if (!saveRes.ok) {
        const data = await saveRes.json().catch(() => ({}));
        throw new Error(data.error || "Error al guardar la landing page");
      }

      const savedPage = await saveRes.json();

      setPages((prev) => [savedPage, ...prev]);
      setShowCreateDialog(false);
      setForm({ title: "", template: "", nicho: "" });
      setCreating(false);

      // Show preview immediately after creation
      setPreviewHtml(aiData.html);
      setPreviewTitle(form.title);

      toast.success("Landing page generada con IA", {
        description: "La pagina fue creada y guardada exitosamente",
      });
    } catch (err: any) {
      setCreating(false);
      toast.error(err.message || "Error al generar la landing page", {
        description: "Verifica tu API key en Configuracion > Motor IA",
      });
    }
  };

  const handleCopyUrl = (slug: string) => {
    const url = `https://app.petunia.ai/lp/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success("URL copiada al portapapeles", {
      description: url,
    });
  };

  const handlePreview = (page: LandingPage) => {
    if (page.html) {
      setPreviewHtml(page.html);
      setPreviewTitle(page.title);
    } else {
      toast.info(`Vista previa: ${page.title}`, {
        description: "Esta pagina no tiene HTML generado. Crea una nueva con IA.",
      });
    }
  };

  const handleOpenInNewTab = () => {
    if (!previewHtml) return;
    const blob = new Blob([previewHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  };

  const handleDownloadHtml = () => {
    if (!previewHtml) return;
    const blob = new Blob([previewHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${previewTitle.toLowerCase().replace(/\s+/g, "-") || "landing"}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("HTML descargado");
  };

  const handleEdit = (page: LandingPage) => {
    if (page.html) {
      setPreviewHtml(page.html);
      setPreviewTitle(page.title);
    } else {
      toast.info(`Editando: ${page.title}`, {
        description: "El editor de landing pages estara disponible proximamente",
      });
    }
  };

  const handleToggleStatus = async (pageId: string) => {
    const page = pages.find((p) => p.id === pageId);
    if (!page) return;

    const newStatus = page.status === "ACTIVE" ? "DRAFT" : "ACTIVE";

    // Optimistic update
    setPages((prev) =>
      prev.map((p) => (p.id === pageId ? { ...p, status: newStatus } : p))
    );

    try {
      const res = await fetch(`/api/landing-pages/${pageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) throw new Error("Error al actualizar");

      const statusLabel = newStatus === "ACTIVE" ? "Activa" : "Borrador";
      toast.success(`Estado actualizado a ${statusLabel}`);
    } catch {
      // Revert optimistic update
      setPages((prev) =>
        prev.map((p) => (p.id === pageId ? { ...p, status: page.status } : p))
      );
      toast.error("Error al actualizar el estado");
    }
  };

  const handleDelete = async (pageId: string) => {
    const page = pages.find((p) => p.id === pageId);
    if (!page) return;

    // Optimistic removal
    setPages((prev) => prev.filter((p) => p.id !== pageId));

    try {
      const res = await fetch(`/api/landing-pages/${pageId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Error al eliminar");

      toast.success("Landing page eliminada");
    } catch {
      // Revert
      setPages((prev) => [page, ...prev]);
      toast.error("Error al eliminar la landing page");
    }
  };

  /* ── Empty state ── */

  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
        <LayoutTemplate className="h-8 w-8 text-muted-foreground/40" />
      </div>
      <p className="text-sm font-medium text-muted-foreground">
        No tienes landing pages creadas
      </p>
      <p className="text-xs text-muted-foreground/60 mt-1 max-w-[280px]">
        Crea tu primera pagina de captura para empezar a generar leads organicos con IA
      </p>
      <Button
        className="mt-6 rounded-xl gold-gradient text-white border-0"
        onClick={() => setShowCreateDialog(true)}
      >
        <Plus className="h-4 w-4 mr-2" />
        Crear primera landing page
      </Button>
    </div>
  );

  /* ── Loading state ── */

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  /* ── Render ── */

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl p-6 text-white" style={{ background: 'linear-gradient(135deg, #4A154B 0%, #350d36 60%, #1a0a1a 100%)' }}>
        <div className="absolute inset-0 opacity-50" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23fff' fill-opacity='0.03'%3E%3Cpath d='M36 18c0-9.94-8.06-18-18-18S0 8.06 0 18 18 36 36 18'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />
        <div className="relative flex items-center justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-white/10 backdrop-blur-sm">
                <LayoutTemplate className="h-5 w-5" />
              </div>
              <Badge className="bg-white/10 text-white/80 border-white/10 text-[10px] font-medium backdrop-blur-sm">
                Generación de leads
              </Badge>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Landing Pages</h1>
            <p className="text-white/70 text-sm max-w-md">
              Crea páginas de captura para generar leads orgánicos con IA
            </p>
          </div>
          <Button
            className="rounded-xl bg-white text-[#4A154B] hover:bg-white/90 font-semibold"
            onClick={() => setShowCreateDialog(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Nueva Landing Page
          </Button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.06)] p-4"
            style={{ border: '1.5px solid transparent', background: 'linear-gradient(#fff, #fff) padding-box, linear-gradient(135deg, #9B3FCB 0%, #4A154B 50%, #611f69 100%) border-box' }}
          >
            <div className="flex items-center gap-3">
              <div
                className={`h-10 w-10 rounded-xl ${stat.bg} flex items-center justify-center`}
              >
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                  {stat.label}
                </p>
                <p className="text-xl font-bold tracking-tight">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Landing Page Cards Grid */}
      {pages.length === 0 ? (
        renderEmptyState()
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
          {pages.map((page) => {
            const TemplateIcon =
              templateTypes.find((t) => t.value === page.template)?.icon ||
              LayoutTemplate;
            const statusInfo = statusConfig[page.status] || statusConfig.DRAFT;

            return (
              <Card
                key={page.id}
                className="rounded-2xl border-[#C4A0D4]/40 shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:-translate-y-1 hover:shadow-xl hover:border-[#4A154B]/30 transition-all duration-300 group overflow-hidden"
              >
                <CardContent className="p-0">
                  {/* Preview thumbnail area */}
                  <div className="h-40 bg-gradient-to-br from-muted/80 to-muted/30 flex items-center justify-center relative">
                    <TemplateIcon className="h-12 w-12 text-muted-foreground/15" />
                    {/* Status badge */}
                    <div className="absolute top-3 left-3 flex gap-1.5">
                      <Badge
                        className={`rounded-full text-[10px] border cursor-pointer ${statusInfo.classes}`}
                        onClick={() => handleToggleStatus(page.id)}
                      >
                        {statusInfo.label}
                      </Badge>
                    </div>
                    {/* Template type badge */}
                    <div className="absolute top-3 right-3">
                      <Badge className="rounded-full text-[10px] bg-background/80 text-foreground/70 border border-border/40">
                        {templateTypes.find((t) => t.value === page.template)?.label ||
                          page.template}
                      </Badge>
                    </div>
                    {/* Preview overlay on hover */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="rounded-xl"
                          onClick={() => handlePreview(page)}
                        >
                          <Eye className="h-4 w-4 mr-1.5" />
                          Ver preview
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="rounded-xl text-red-500 hover:text-red-600"
                          onClick={() => handleDelete(page.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Card body */}
                  <div className="p-4 space-y-3">
                    <div>
                      <h3 className="font-semibold text-sm leading-tight">
                        {page.title}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {page.description || "Sin descripción"}
                      </p>
                    </div>

                    {/* Metrics row */}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t border-border/30">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {page.leads} leads
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {page.views} visitas
                      </span>
                      <span className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        {Number(page.conversionRate || 0).toFixed(1)}% conv.
                      </span>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2 pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 rounded-xl text-xs h-8 border-[#C4A0D4] text-[#4A154B] hover:bg-[#FAF5FA] hover:border-[#4A154B]"
                        onClick={() => handleEdit(page)}
                      >
                        <Pencil className="h-3 w-3 mr-1.5" />
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 rounded-xl text-xs h-8 border-[#C4A0D4] text-[#4A154B] hover:bg-[#FAF5FA] hover:border-[#4A154B]"
                        onClick={() => handlePreview(page)}
                      >
                        <ExternalLink className="h-3 w-3 mr-1.5" />
                        Ver preview
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl text-xs h-8 px-2.5 border-[#C4A0D4] text-[#4A154B] hover:bg-[#FAF5FA] hover:border-[#4A154B]"
                        onClick={() => handleCopyUrl(page.slug)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
              Crear nueva
            </p>
            <DialogTitle>Nueva Landing Page</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 pt-2">
            {/* Template type selector */}
            <div className="grid gap-2">
              <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                Tipo de template
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {templateTypes.map((tmpl) => (
                  <button
                    key={tmpl.value}
                    onClick={() => setForm({ ...form, template: tmpl.value })}
                    className={`p-3 rounded-xl text-left transition-all duration-200 border-2 ${
                      form.template === tmpl.value
                        ? "border-[#4A154B] bg-[#F5EFF5] text-[#4A154B] shadow-sm"
                        : "border-[#C4A0D4] bg-white text-[#1D1C1D] hover:border-[#4A154B] hover:bg-[#FAF5FA]"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <tmpl.icon className={`h-4 w-4 ${form.template === tmpl.value ? "text-[#4A154B]" : ""}`} />
                      <span className="text-xs font-semibold">{tmpl.label}</span>
                    </div>
                    <p
                      className={`text-[10px] leading-snug ${
                        form.template === tmpl.value
                          ? "text-[#4A154B]/70"
                          : "text-muted-foreground/60"
                      }`}
                    >
                      {tmpl.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Title input */}
            <div className="grid gap-2">
              <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                Titulo de la pagina *
              </Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Ej: Propiedades de lujo en Miami Beach"
                className="h-10 rounded-xl bg-white border border-[#E0E0E0] focus-visible:ring-1 focus-visible:ring-[#4A154B]/30 placeholder:text-[#AAAAAA]"
              />
            </div>

            {/* Nicho / Market selector */}
            <div className="grid gap-2">
              <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                Nicho / Mercado
              </Label>
              <Select
                value={form.nicho}
                onValueChange={(v) => setForm({ ...form, nicho: v ?? "" })}
              >
                <SelectTrigger className="h-10 rounded-xl bg-white border border-[#E0E0E0] focus-visible:ring-1 focus-visible:ring-[#4A154B]/30">
                  <SelectValue placeholder="Seleccionar nicho de mercado" />
                </SelectTrigger>
                <SelectContent>
                  {nichoOptions.map((n) => (
                    <SelectItem key={n.value} value={n.value}>
                      {n.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* AI info box */}
            <div className="rounded-xl bg-[#FAF5FA] border border-[#C4A0D4]/40 p-4 flex gap-3">
              <div className="h-9 w-9 rounded-lg gold-gradient flex items-center justify-center shrink-0">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-xs font-semibold">Generacion con IA</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Petunia AI generara automaticamente el copy, estructura y diseno
                  optimizado para conversion basado en el template y nicho seleccionados.
                </p>
              </div>
            </div>

            {/* Create button */}
            <Button
              onClick={handleCreate}
              disabled={creating}
              className="w-full gold-gradient text-white rounded-2xl h-12 font-bold border-0 hover:opacity-90 transition-opacity"
            >
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generando con IA...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Crear con IA
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewHtml} onOpenChange={(open) => { if (!open) { setPreviewHtml(null); setPreviewTitle(""); } }}>
        <DialogContent className="max-w-5xl h-[90vh] flex flex-col rounded-2xl p-0 gap-0">
          <div className="flex items-center justify-between px-5 py-3 border-b border-border/40 shrink-0">
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                Vista previa
              </p>
              <DialogTitle className="text-sm">{previewTitle}</DialogTitle>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl text-xs"
                onClick={handleDownloadHtml}
              >
                <Copy className="h-3 w-3 mr-1.5" />
                Descargar HTML
              </Button>
              <Button
                size="sm"
                className="rounded-xl text-xs gold-gradient text-white border-0"
                onClick={handleOpenInNewTab}
              >
                <ExternalLink className="h-3 w-3 mr-1.5" />
                Abrir en nueva ventana
              </Button>
            </div>
          </div>
          <div className="flex-1 overflow-hidden bg-white rounded-b-2xl">
            {previewHtml && (
              <iframe
                srcDoc={previewHtml}
                className="w-full h-full border-0"
                title={`Preview: ${previewTitle}`}
                sandbox="allow-scripts"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
