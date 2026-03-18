"use client";

import { useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Instagram,
  Facebook,
  Send,
  MessageCircle,
  Mail,
  Linkedin,
  Sparkles,
  RefreshCw,
  Zap,
  CheckCircle2,
  X,
  Clock,
  Trash2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

const platformIcons: Record<string, any> = {
  INSTAGRAM: Instagram,
  FACEBOOK: Facebook,
  TIKTOK: Send,
  WHATSAPP: MessageCircle,
  EMAIL: Mail,
  LINKEDIN: Linkedin,
};

const platformColors: Record<string, string> = {
  INSTAGRAM: "bg-pink-100 text-pink-700 border-pink-200",
  FACEBOOK: "bg-blue-100 text-blue-700 border-blue-200",
  TIKTOK: "bg-gray-100 text-gray-700 border-gray-200",
  WHATSAPP: "bg-green-100 text-green-700 border-green-200",
  EMAIL: "bg-orange-100 text-orange-700 border-orange-200",
  LINKEDIN: "bg-sky-100 text-sky-700 border-sky-200",
};

const months = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const daysOfWeek = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

interface ScheduledContent {
  id: string;
  title: string;
  platform: string;
  time: string;
  type: string;
  status: "DRAFT" | "SCHEDULED" | "PUBLISHED";
  aiGenerated?: boolean;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

// Plantillas de contenido que la IA "genera"
const aiContentTemplates = {
  INSTAGRAM: [
    { type: "POST", titles: ["Propiedad destacada de la semana", "Tips para comprar tu primer depto", "Zona exclusiva: por qué invertir aquí", "Antes y después: remodelación premium"] },
    { type: "CAROUSEL", titles: ["5 razones para invertir en bienes raíces", "Tour virtual — propiedad nueva", "Checklist del comprador inteligente", "Las mejores zonas para vivir en CDMX"] },
    { type: "REEL", titles: ["Tour express — propiedad de lujo", "Un día como broker inmobiliario", "3 errores al comprar casa", "Transformación de espacios"] },
    { type: "STORY", titles: ["Propiedad nueva disponible", "¿Sabías esto del mercado?", "Detrás de cámaras — visita a propiedad", "Pregunta del día"] },
  ],
  FACEBOOK: [
    { type: "POST", titles: ["Análisis del mercado inmobiliario", "Nueva propiedad en catálogo", "Guía completa para inversionistas", "Caso de éxito: cliente satisfecho"] },
  ],
  LINKEDIN: [
    { type: "POST", titles: ["Tendencias del mercado inmobiliario 2026", "ROI en bienes raíces vs otras inversiones", "Caso de éxito profesional"] },
  ],
  WHATSAPP: [
    { type: "WHATSAPP", titles: ["Seguimiento personalizado — leads activos", "Promoción exclusiva de la semana", "Recordatorio de visita programada"] },
  ],
  EMAIL: [
    { type: "EMAIL", titles: ["Newsletter semanal — nuevas propiedades", "Reporte mensual del mercado", "Invitación a open house"] },
  ],
};

const timeSlots = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"];

function generateAISchedule(
  year: number,
  month: number,
  startDay: number,
  endDay: number,
  selectedPlatforms: string[],
  postsPerDay: number
): Record<string, ScheduledContent[]> {
  const schedule: Record<string, ScheduledContent[]> = {};
  let idCounter = 1000;

  for (let day = startDay; day <= endDay; day++) {
    const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const dayOfWeek = new Date(year, month, day).getDay();

    // Menos contenido en fin de semana
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const count = isWeekend ? Math.max(1, postsPerDay - 1) : postsPerDay;

    const dayContent: ScheduledContent[] = [];

    for (let i = 0; i < count; i++) {
      const platform = selectedPlatforms[i % selectedPlatforms.length];
      const templates = aiContentTemplates[platform as keyof typeof aiContentTemplates] || aiContentTemplates.INSTAGRAM;
      const template = templates[Math.floor(Math.random() * templates.length)];
      const title = template.titles[Math.floor(Math.random() * template.titles.length)];

      // Horarios estratégicos según plataforma
      let timeIndex: number;
      if (platform === "INSTAGRAM") timeIndex = [4, 6, 8, 10][i % 4]; // 12, 14, 16, 18
      else if (platform === "FACEBOOK") timeIndex = [3, 7, 9][i % 3]; // 11, 15, 17
      else if (platform === "LINKEDIN") timeIndex = [1, 2][i % 2]; // 9, 10
      else if (platform === "EMAIL") timeIndex = 0; // 8am
      else timeIndex = [2, 5][i % 2]; // 10, 13

      dayContent.push({
        id: `ai-${idCounter++}`,
        title: `${title}`,
        platform,
        time: timeSlots[timeIndex] || "12:00",
        type: template.type,
        status: "SCHEDULED",
        aiGenerated: true,
      });
    }

    // Ordenar por hora
    dayContent.sort((a, b) => a.time.localeCompare(b.time));
    schedule[dateKey] = dayContent;
  }

  return schedule;
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 2, 1));
  const [selectedDate, setSelectedDate] = useState("2026-03-10");
  const [schedule, setSchedule] = useState<Record<string, ScheduledContent[]>>({});
  const [showAIDialog, setShowAIDialog] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);

  // Configuración de programación IA
  const [aiScope, setAiScope] = useState<"week" | "month">("week");
  const [postsPerDay, setPostsPerDay] = useState("3");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["INSTAGRAM", "FACEBOOK"]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const getDateKey = (day: number) =>
    `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  const selectedContent = schedule[selectedDate] || [];

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform]
    );
  };

  const totalScheduled = Object.values(schedule).reduce((sum, items) => sum + items.length, 0);

  const handleAIGenerate = async () => {
    if (selectedPlatforms.length === 0) {
      toast.error("Selecciona al menos una plataforma");
      return;
    }

    setIsGenerating(true);
    setGenerationStep(1);

    // Simular pasos de generación con IA
    await new Promise((r) => setTimeout(r, 800));
    setGenerationStep(2);
    await new Promise((r) => setTimeout(r, 1000));
    setGenerationStep(3);
    await new Promise((r) => setTimeout(r, 800));
    setGenerationStep(4);

    // Calcular rango de días
    const today = new Date().getDate();
    let startDay = today;
    let endDay: number;

    if (aiScope === "week") {
      endDay = Math.min(today + 6, daysInMonth);
    } else {
      endDay = daysInMonth;
    }

    const newSchedule = generateAISchedule(
      year,
      month,
      startDay,
      endDay,
      selectedPlatforms,
      parseInt(postsPerDay)
    );

    await new Promise((r) => setTimeout(r, 600));

    // Merge con schedule existente
    setSchedule((prev) => {
      const merged = { ...prev };
      for (const [key, items] of Object.entries(newSchedule)) {
        merged[key] = [...(merged[key] || []).filter((i) => !i.aiGenerated), ...items];
      }
      return merged;
    });

    setIsGenerating(false);
    setGenerationStep(0);
    setShowAIDialog(false);

    const totalNew = Object.values(newSchedule).reduce((sum, items) => sum + items.length, 0);
    const daysCount = endDay - startDay + 1;
    toast.success(
      `${totalNew} publicaciones programadas para ${daysCount} días`,
      { description: "Revisa el calendario y ajusta lo que necesites" }
    );
  };

  const handleClearAI = () => {
    setSchedule((prev) => {
      const cleaned: Record<string, ScheduledContent[]> = {};
      for (const [key, items] of Object.entries(prev)) {
        const manual = items.filter((i) => !i.aiGenerated);
        if (manual.length > 0) cleaned[key] = manual;
      }
      return cleaned;
    });
    toast.success("Programación IA eliminada");
  };

  const generationSteps = [
    "Analizando tu inventario de propiedades...",
    "Creando estrategia de contenido...",
    "Generando copies y asignando horarios...",
    "Optimizando distribución por plataforma...",
  ];

  return (
    <div className="space-y-8">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl p-6 text-white" style={{ background: 'linear-gradient(135deg, #4A154B 0%, #350d36 60%, #1a0a1a 100%)' }}>
        <div className="absolute inset-0 opacity-50" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23fff' fill-opacity='0.03'%3E%3Cpath d='M36 18c0-9.94-8.06-18-18-18S0 8.06 0 18 18 36 36 18'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />
        <div className="relative flex items-center justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-white/10 backdrop-blur-sm">
                <CalendarDays className="h-5 w-5" />
              </div>
              <Badge className="bg-white/10 text-white/80 border-white/10 text-[10px] font-medium backdrop-blur-sm">
                Planificación IA
              </Badge>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Calendario de Contenido</h1>
            <p className="text-white/70 text-sm max-w-md">
              Organiza y programa tus publicaciones
            </p>
          </div>
          <div className="hidden lg:flex gap-2">
            {totalScheduled > 0 && (
              <Button variant="outline" size="sm" className="rounded-xl border-white/20 text-white bg-white/10 hover:bg-white/20" onClick={handleClearAI}>
                <Trash2 className="h-4 w-4 mr-2" />
                Limpiar IA
              </Button>
            )}
            <Button variant="outline" size="sm" className="rounded-xl border-white/20 text-white bg-white/10 hover:bg-white/20">
              <Plus className="h-4 w-4 mr-2" />
              Agregar manual
            </Button>
            <Button
              size="sm"
              className="rounded-xl bg-white text-[#4A154B] hover:bg-white/90 font-semibold"
              onClick={() => setShowAIDialog(true)}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Programar con IA
            </Button>
          </div>
        </div>
      </div>

      {/* Stats bar si hay contenido programado */}
      {totalScheduled > 0 && (
        <div className="flex items-center gap-4 p-4 rounded-2xl border border-border/40 bg-muted/30">
          <div className="p-2.5 rounded-xl bg-primary">
            <Zap className="h-4 w-4 text-foreground" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">
              {totalScheduled} publicaciones programadas con IA
            </p>
            <p className="text-xs text-muted-foreground">
              {Object.keys(schedule).length} días con contenido · {selectedPlatforms.length} plataformas activas
            </p>
          </div>
          <div className="flex gap-1.5">
            {selectedPlatforms.map((p) => {
              const Icon = platformIcons[p];
              return (
                <Badge key={p} className={`rounded-full px-2 py-1 ${platformColors[p]}`}>
                  <Icon className="h-3 w-3" />
                </Badge>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Calendar grid */}
        <div className="lg:col-span-2 rounded-2xl border border-border/40 p-5">
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="icon" className="rounded-xl" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-base font-semibold">
              {months[month]} {year}
            </h2>
            <Button variant="ghost" size="icon" className="rounded-xl" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-7 mb-2">
            {daysOfWeek.map((day) => (
              <div key={day} className="text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-widest py-2">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {days.map((day, i) => {
              if (!day) return <div key={`empty-${i}`} />;
              const dateKey = getDateKey(day);
              const content = schedule[dateKey] || [];
              const isSelected = dateKey === selectedDate;
              const isToday = dateKey === "2026-03-10";
              const hasAI = content.some((c) => c.aiGenerated);

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDate(dateKey)}
                  className={`min-h-[80px] p-1.5 rounded-xl text-left transition-all hover:bg-muted/30 ${
                    isSelected
                      ? "border-2 border-foreground bg-foreground/5"
                      : hasAI
                        ? "bg-muted/10"
                        : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-medium inline-flex h-6 w-6 items-center justify-center ${
                        isToday ? "bg-primary text-white rounded-lg" : ""
                      }`}
                    >
                      {day}
                    </span>
                    {hasAI && (
                      <Sparkles className="h-2.5 w-2.5 text-foreground/50" />
                    )}
                  </div>
                  <div className="mt-1 space-y-0.5">
                    {content.slice(0, 2).map((item) => {
                      const Icon = platformIcons[item.platform];
                      return (
                        <div
                          key={item.id}
                          className={`flex items-center gap-1 px-1 py-0.5 rounded-full text-[9px] font-medium ${
                            platformColors[item.platform]
                          }`}
                        >
                          {Icon && <Icon className="h-2.5 w-2.5" />}
                          <span className="truncate">{item.time}</span>
                        </div>
                      );
                    })}
                    {content.length > 2 && (
                      <span className="text-[9px] text-muted-foreground px-1">
                        +{content.length - 2} más
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Detalle del día seleccionado */}
        <div className="rounded-2xl border border-border/40 p-5">
          <div className="mb-4">
            <h2 className="text-base font-semibold">
              {new Date(selectedDate + "T12:00:00").toLocaleDateString("es-MX", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </h2>
            {selectedContent.length > 0 && (
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mt-1">
                {selectedContent.length} publicaciones programadas
              </p>
            )}
          </div>

          {selectedContent.length > 0 ? (
            <div className="space-y-3">
              {selectedContent.map((item) => {
                const Icon = platformIcons[item.platform];
                return (
                  <div
                    key={item.id}
                    className="p-3 rounded-2xl border border-border/40 hover:bg-muted/30 transition-colors group"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-xl ${platformColors[item.platform]}`}>
                        {Icon && <Icon className="h-4 w-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <p className="text-sm font-medium leading-tight">{item.title}</p>
                          {item.aiGenerated && (
                            <Sparkles className="h-3 w-3 text-foreground/40 shrink-0 ml-1" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {item.time}
                          </span>
                          <Badge variant="outline" className="text-[10px] rounded-full">
                            {item.type}
                          </Badge>
                          <Badge
                            className={`text-[10px] rounded-full ${
                              item.status === "SCHEDULED"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {item.status === "SCHEDULED" ? "Programado" : "Borrador"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CalendarDays className="h-8 w-8 text-muted-foreground/30 mb-2" />
              <p className="text-sm font-medium text-muted-foreground">Sin contenido programado</p>
              <p className="text-xs text-muted-foreground mt-1">
                Usa &quot;Programar con IA&quot; para llenar el calendario automáticamente
              </p>
              <Button
                size="sm"
                className="mt-3 bg-primary text-white rounded-xl hover:bg-foreground/90"
                onClick={() => setShowAIDialog(true)}
              >
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                Programar con IA
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Dialog de Programar con IA */}
      <Dialog open={showAIDialog} onOpenChange={setShowAIDialog}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-primary">
                <Sparkles className="h-4 w-4 text-foreground" />
              </div>
              Programar con IA
            </DialogTitle>
          </DialogHeader>

          {!isGenerating ? (
            <div className="space-y-5 pt-2">
              <p className="text-sm text-muted-foreground">
                La IA analizará tus propiedades y generará un plan de contenido optimizado con los mejores horarios para cada plataforma.
              </p>

              {/* Alcance */}
              <div className="grid gap-2">
                <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                  ¿Cuánto quieres programar?
                </Label>
                <div className="flex gap-1 p-1 rounded-xl bg-muted/50">
                  <button
                    onClick={() => setAiScope("week")}
                    className={`flex-1 px-4 py-2.5 text-sm font-medium transition-all rounded-lg ${
                      aiScope === "week"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <p className="text-sm font-semibold">Semana</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Próximos 7 días</p>
                  </button>
                  <button
                    onClick={() => setAiScope("month")}
                    className={`flex-1 px-4 py-2.5 text-sm font-medium transition-all rounded-lg ${
                      aiScope === "month"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <p className="text-sm font-semibold">Mes completo</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Resto del mes</p>
                  </button>
                </div>
              </div>

              {/* Posts por día */}
              <div className="grid gap-2">
                <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                  Publicaciones por día
                </Label>
                <Select value={postsPerDay} onValueChange={(v) => setPostsPerDay(v ?? "3")}>
                  <SelectTrigger className="rounded-xl bg-muted/30 border-0 focus-visible:ring-1 focus-visible:ring-foreground/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 publicación/día — Conservador</SelectItem>
                    <SelectItem value="2">2 publicaciones/día — Moderado</SelectItem>
                    <SelectItem value="3">3 publicaciones/día — Activo</SelectItem>
                    <SelectItem value="4">4 publicaciones/día — Intensivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Plataformas */}
              <div className="grid gap-2">
                <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                  Plataformas
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  {(["INSTAGRAM", "FACEBOOK", "LINKEDIN", "WHATSAPP", "EMAIL", "TIKTOK"] as const).map((platform) => {
                    const Icon = platformIcons[platform];
                    const isActive = selectedPlatforms.includes(platform);
                    const labels: Record<string, string> = {
                      INSTAGRAM: "Instagram",
                      FACEBOOK: "Facebook",
                      LINKEDIN: "LinkedIn",
                      WHATSAPP: "WhatsApp",
                      EMAIL: "Email",
                      TIKTOK: "TikTok",
                    };
                    return (
                      <button
                        key={platform}
                        onClick={() => togglePlatform(platform)}
                        className={`flex items-center gap-2 p-2.5 rounded-xl text-xs font-medium transition-all ${
                          isActive
                            ? "bg-primary text-white"
                            : "border border-border/40 text-muted-foreground hover:border-foreground/20"
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {labels[platform]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Resumen */}
              <div className="p-3 rounded-xl bg-muted/30">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Zap className="h-3.5 w-3.5 text-foreground" />
                  <span>
                    Se generarán aprox. <strong className="text-foreground">
                      {parseInt(postsPerDay) * (aiScope === "week" ? 7 : daysInMonth - 10 + 1)}
                    </strong> publicaciones en <strong className="text-foreground">
                      {selectedPlatforms.length}
                    </strong> plataformas para los próximos{" "}
                    <strong className="text-foreground">
                      {aiScope === "week" ? "7" : `${daysInMonth - 10 + 1}`} días
                    </strong>
                  </span>
                </div>
              </div>

              <Button
                onClick={handleAIGenerate}
                className="w-full bg-primary text-white rounded-xl hover:bg-foreground/90"
                disabled={selectedPlatforms.length === 0}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Generar programación con IA
              </Button>
            </div>
          ) : (
            /* Estado de generación */
            <div className="py-8 space-y-6">
              <div className="flex flex-col items-center text-center">
                <div className="relative">
                  <div className="p-4 rounded-full bg-primary">
                    <Sparkles className="h-6 w-6 text-foreground animate-pulse" />
                  </div>
                  <div className="absolute inset-0 rounded-full bg-primary opacity-20 animate-ping" />
                </div>
                <h3 className="font-semibold mt-4">Generando programación...</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Esto puede tardar unos segundos
                </p>
              </div>

              <div className="space-y-3">
                {generationSteps.map((step, i) => {
                  const stepNum = i + 1;
                  const isActive = generationStep === stepNum;
                  const isDone = generationStep > stepNum;

                  return (
                    <div
                      key={i}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                        isActive
                          ? "border-foreground/30 bg-foreground/5"
                          : isDone
                            ? "border-foreground/20 bg-foreground/5"
                            : "border-border/40 opacity-40"
                      }`}
                    >
                      {isDone ? (
                        <CheckCircle2 className="h-4 w-4 text-foreground shrink-0" />
                      ) : isActive ? (
                        <RefreshCw className="h-4 w-4 text-foreground animate-spin shrink-0" />
                      ) : (
                        <div className="h-4 w-4 rounded-full border border-border shrink-0" />
                      )}
                      <span className={`text-sm ${isActive ? "font-medium" : ""}`}>
                        {step}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
