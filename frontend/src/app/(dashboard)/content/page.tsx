"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/store/auth";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Send, Calendar, Clock, Trash2, CheckCircle,
  RefreshCw, Instagram, Linkedin, Facebook, Video,
  ChevronDown, Plus, Filter, LayoutGrid, List, X,
  TrendingUp, Eye, Image, Lock, Crown,
  Wand2, Film, FileImage, Newspaper, Zap, Building2,
  Pencil, AlertCircle, ImagePlus, HardDrive,
  ChevronLeft, ChevronRight, CalendarDays, MapPin, Layers, Rocket,
} from "lucide-react";
import toast from "react-hot-toast";
import MediaLibrary, { type MediaAsset } from "./MediaLibrary";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

/**
 * Normaliza URLs de media del backend a rutas relativas (/uploads/...) para que
 * vayan siempre por el proxy de Next.js (mismo origen → sin CORS, sin CSP issues).
 * URLs de R2/CDN externas (sin "/uploads/" en el path) se devuelven sin cambios.
 */
function normalizeMediaUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  const idx = url.indexOf("/uploads/");
  if (idx !== -1) return url.slice(idx); // → "/uploads/media/business_id/file.mp4"
  return url;
}

type PostStatus = "draft" | "approved" | "scheduled" | "published" | "failed";
type Channel = "instagram" | "facebook" | "linkedin" | "twitter" | "tiktok";
type ContentType = "educational" | "testimonial" | "product" | "engagement" | "trend" | "behind_scenes";
type FormatType = "post" | "story" | "reel";

interface Post {
  id: string;
  channel: Channel;
  content_type: ContentType;
  format_type: FormatType;
  status: PostStatus;
  hook: string | null;
  caption: string;
  hashtags: string[];
  image_url: string | null;
  image_prompt: string | null;
  animation_style: string | null;
  video_url: string | null;
  video_job_id: string | null;
  platform_url: string | null;
  error_message: string | null;
  scheduled_at: string | null;
  published_at: string | null;
  ai_metadata: Record<string, unknown>;
  created_at: string;
}

interface PlanFeatures {
  content_channels: Channel[];
  content_formats: FormatType[];
  image_generation: boolean;
  video_generation: boolean;
  heygen: boolean;
  content_posts_per_month: number;
}

// TikTok icon
function TikTokIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.32 6.32 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.27 8.27 0 004.83 1.55V6.79a4.85 4.85 0 01-1.06-.1z"/>
    </svg>
  );
}

const CHANNEL_CONFIG: Record<Channel, {
  icon: React.ReactNode; label: string; gradient: string; light: string; emoji: string;
}> = {
  instagram: { icon: <Instagram size={13} />, label: "Instagram", gradient: "linear-gradient(135deg, #E1306C, #833AB4)", light: "rgba(225,48,108,0.1)", emoji: "📸" },
  facebook:  { icon: <Facebook size={13} />,  label: "Facebook",  gradient: "linear-gradient(135deg, #1877F2, #4293F5)", light: "rgba(24,119,242,0.1)",  emoji: "👤" },
  linkedin:  { icon: <Linkedin size={13} />,  label: "LinkedIn",  gradient: "linear-gradient(135deg, #0A66C2, #0E86E8)", light: "rgba(10,102,194,0.1)",  emoji: "💼" },
  twitter:   { icon: <span className="text-xs font-bold">𝕏</span>, label: "X", gradient: "linear-gradient(135deg, #0F1419, #536471)", light: "rgba(15,20,25,0.08)", emoji: "𝕏" },
  tiktok:    { icon: <TikTokIcon size={13} />, label: "TikTok",  gradient: "linear-gradient(135deg, #010101, #69C9D0)", light: "rgba(105,201,208,0.12)", emoji: "🎵" },
};

const FORMAT_CONFIG: Record<FormatType, { label: string; icon: React.ReactNode; desc: string; ratio: string }> = {
  post:  { label: "Post",  icon: <FileImage size={14} />, desc: "Imagen cuadrada", ratio: "1:1"  },
  story: { label: "Story", icon: <Newspaper size={14} />, desc: "Vertical 9:16",   ratio: "9:16" },
  reel:  { label: "Reel",  icon: <Film size={14} />,      desc: "Video vertical",  ratio: "9:16" },
};

const STATUS_CONFIG: Record<PostStatus, { label: string; dot: string; badge: string }> = {
  draft:     { label: "Borrador",   dot: "#94A3B8", badge: "bg-slate-50 text-slate-600 border-slate-200"   },
  approved:  { label: "Aprobado",   dot: "#10B981", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  scheduled: { label: "Programado", dot: "#3B82F6", badge: "bg-blue-50 text-blue-700 border-blue-200"      },
  published: { label: "Publicado",  dot: "#8B5CF6", badge: "bg-violet-50 text-violet-700 border-violet-200" },
  failed:    { label: "Error",      dot: "#EF4444", badge: "bg-red-50 text-red-700 border-red-200"          },
};

const CONTENT_TYPES: { value: ContentType; label: string; emoji: string }[] = [
  { value: "educational",   label: "Educativo",        emoji: "📚" },
  { value: "testimonial",   label: "Testimonio",       emoji: "⭐" },
  { value: "product",       label: "Producto",         emoji: "🎯" },
  { value: "engagement",    label: "Engagement",       emoji: "💬" },
  { value: "trend",         label: "Tendencia",        emoji: "🔥" },
  { value: "behind_scenes", label: "Detrás de cámara", emoji: "🎬" },
];

const CONTENT_THEMES = [
  { id: "mixed",       emoji: "🎯", title: "Mixto",          desc: "Combinación balanceada de tipos" },
  { id: "properties",  emoji: "🏘️", title: "Propiedades",    desc: "Publicita tu catálogo de inmuebles" },
  { id: "informativo", emoji: "📰", title: "Informativo",    desc: "Tips, mercado, consejos del sector" },
  { id: "marca",       emoji: "✨", title: "Marca personal", desc: "Branding, equipo, valores" },
  { id: "testimonios", emoji: "⭐", title: "Testimonios",    desc: "Casos de éxito y reseñas" },
  { id: "tendencias",  emoji: "🔥", title: "Tendencias",     desc: "Noticias y trends del sector" },
  { id: "promocional", emoji: "💰", title: "Promocional",    desc: "Ofertas, precios, urgencia" },
];

// ── Helpers ────────────────────────────────────────────────────────────────

function getPostDate(post: Post): string {
  return (post.scheduled_at || post.created_at).split("T")[0];
}

function groupByDate(posts: Post[]): Record<string, Post[]> {
  const groups: Record<string, Post[]> = {};
  posts.forEach((post) => {
    const date = getPostDate(post);
    if (!groups[date]) groups[date] = [];
    groups[date].push(post);
  });
  return groups;
}

const ALL_CHANNELS: Channel[] = ["instagram", "facebook", "linkedin", "tiktok"];
const PREMIUM_CHANNELS: Channel[] = ["linkedin", "tiktok"];

// ── Stat strip ────────────────────────────────────────────────────────────

function StatStrip({ total, byStatus }: { total: number; byStatus: Record<string, number> }) {
  const stats = [
    { label: "Total",      value: total,                   icon: Zap,         color: "text-violet-600", bg: "bg-violet-50"  },
    { label: "Borradores", value: byStatus.draft ?? 0,     icon: Eye,         color: "text-slate-500",  bg: "bg-slate-50"   },
    { label: "Aprobados",  value: byStatus.approved ?? 0,  icon: CheckCircle, color: "text-emerald-600",bg: "bg-emerald-50" },
    { label: "Programados",value: byStatus.scheduled ?? 0, icon: Clock,       color: "text-blue-600",   bg: "bg-blue-50"    },
    { label: "Publicados", value: byStatus.published ?? 0, icon: TrendingUp,  color: "text-violet-600", bg: "bg-violet-50"  },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 md:gap-3">
      {stats.map(({ label, value, icon: Icon, color, bg }, i) => (
        <motion.div key={label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05, duration: 0.4 }} className="card-stripe p-4">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${bg}`}>
              <Icon size={15} className={color} />
            </div>
            <div>
              <p className={`text-xl font-bold tracking-tight ${color.includes("violet") ? "gradient-text-violet" : color.includes("emerald") ? "gradient-text-green" : color.includes("blue") ? "gradient-text-blue" : "text-slate-700"}`}>{value}</p>
              <p className="text-xs text-muted-foreground leading-tight">{label}</p>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ── Channel Selector ──────────────────────────────────────────────────────

function ChannelSelector({ value, onChange, features }: { value: Channel; onChange: (c: Channel) => void; features: PlanFeatures | null }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {ALL_CHANNELS.map((ch) => {
        const cfg = CHANNEL_CONFIG[ch];
        const allowed = features?.content_channels.includes(ch) ?? false;
        const isPremiumLocked = PREMIUM_CHANNELS.includes(ch) && !allowed;
        return (
          <button key={ch} onClick={() => allowed && onChange(ch)} disabled={!allowed}
            className={`relative flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border text-xs font-medium transition-all ${value === ch ? "border-transparent text-white shadow-sm" : allowed ? "border-border bg-white text-muted-foreground hover:border-violet-300 hover:text-foreground" : "border-border bg-slate-50 text-slate-300 cursor-not-allowed opacity-70"}`}
            style={value === ch ? { background: cfg.gradient } : {}}
          >
            <span className={value === ch ? "text-white" : ""}>{cfg.icon}</span>
            <span>{cfg.label}</span>
            {isPremiumLocked && (
              <span className="absolute -top-1.5 -right-1.5 flex items-center gap-0.5 bg-amber-400 text-amber-900 text-[9px] font-bold px-1 py-0.5 rounded-full leading-none">
                <Crown size={7} />PRO
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ── Format Selector ───────────────────────────────────────────────────────

function FormatSelector({ value, onChange, features }: { value: FormatType; onChange: (f: FormatType) => void; features: PlanFeatures | null }) {
  const formats: FormatType[] = ["post", "story", "reel"];
  return (
    <div className="flex gap-2">
      {formats.map((fmt) => {
        const cfg = FORMAT_CONFIG[fmt];
        const allowed = features?.content_formats.includes(fmt) ?? fmt !== "reel";
        return (
          <button key={fmt} onClick={() => allowed && onChange(fmt)} disabled={!allowed}
            className={`relative flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-all flex-1 justify-center ${value === fmt ? "border-violet-400 bg-violet-50 text-violet-700" : allowed ? "border-border bg-white text-muted-foreground hover:border-violet-200 hover:text-foreground" : "border-border bg-slate-50 text-slate-300 cursor-not-allowed"}`}
          >
            {cfg.icon}<span>{cfg.label}</span><span className="text-[10px] opacity-60">{cfg.ratio}</span>
            {!allowed && <Crown size={9} className="text-amber-500 ml-auto" />}
          </button>
        );
      })}
    </div>
  );
}

// ── Generator Panel ───────────────────────────────────────────────────────

interface PropImageItem {
  url: string;
  caption: string | null;
  property_id: string;
  property_title: string;
  property_price: number | null;
  property_currency: string;
}

function GeneratorPanel({ onClose, onGenerate, onGenerateSmart, generating, features, token, initialDate }: {
  onClose: () => void;
  onGenerate: (opts: { channel: Channel; type: ContentType; topic: string; format: FormatType; genImage: boolean; genVideo: boolean; propImageUrl?: string; scheduledAt?: string }) => void;
  onGenerateSmart: (opts: { description: string; genImage: boolean }) => void;
  generating: boolean;
  features: PlanFeatures | null;
  token: string;
  initialDate?: string; // YYYY-MM-DD
}) {
  const [mode, setMode] = useState<"ai" | "manual">("ai");

  // Manual mode state
  const [channel, setChannel] = useState<Channel>(features?.content_channels[0] ?? "instagram");
  const [type, setType] = useState<ContentType>("educational");
  const [topic, setTopic] = useState("");
  const [format, setFormat] = useState<FormatType>("post");
  const [genImage, setGenImage] = useState(false);
  const [genVideo, setGenVideo] = useState(false);
  const [usePropImage, setUsePropImage] = useState(false);
  const [useLibraryImage, setUseLibraryImage] = useState(false);
  const [selectedLibraryUrl, setSelectedLibraryUrl] = useState<string | null>(null);
  // Fecha de publicación opcional
  const [schedulePost, setSchedulePost] = useState(!!initialDate);
  const [scheduledAt, setScheduledAt] = useState(initialDate ? `${initialDate}T10:00` : "");
  const [propImages, setPropImages] = useState<PropImageItem[]>([]);
  const [loadingProps, setLoadingProps] = useState(false);
  const [selectedPropImage, setSelectedPropImage] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // AI mode state
  const [description, setDescription] = useState("");
  const [aiGenImage, setAiGenImage] = useState(false);

  const canImage = features?.image_generation ?? false;
  const canVideo = features?.heygen ?? false;
  const isTikTok = channel === "tiktok";

  // TikTok siempre usa formato reel
  function handleChannelChange(ch: Channel) {
    setChannel(ch);
    if (ch === "tiktok") {
      setFormat("reel");
      setGenImage(false);
      setUsePropImage(false);
      setSelectedPropImage(null);
    }
  }

  async function loadPropertyImages() {
    if (propImages.length > 0) return;
    setLoadingProps(true);
    try {
      const res = await fetch(`${API}/properties/images/all`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { const data = await res.json(); setPropImages(data.images ?? []); }
    } finally { setLoadingProps(false); }
  }

  function toggleUsePropImage() {
    const next = !usePropImage;
    setUsePropImage(next);
    if (next) { loadPropertyImages(); setGenImage(false); setUseLibraryImage(false); setSelectedLibraryUrl(null); }
    else { setSelectedPropImage(null); }
  }

  function toggleUseLibraryImage() {
    const next = !useLibraryImage;
    setUseLibraryImage(next);
    if (next) { setGenImage(false); setUsePropImage(false); setSelectedPropImage(null); }
    else { setSelectedLibraryUrl(null); }
  }

  function validateManual() {
    const e: Record<string, string> = {};
    if (!topic.trim()) e.topic = "El tema es obligatorio";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleManualSubmit() {
    if (!validateManual()) return;
    const propUrl = useLibraryImage ? (selectedLibraryUrl ?? undefined) : (selectedPropImage ?? undefined);
    onGenerate({ channel, type, topic, format, genImage, genVideo, propImageUrl: propUrl, scheduledAt: schedulePost && scheduledAt ? scheduledAt : undefined });
  }

  function handleSmartSubmit() {
    if (!description.trim()) { setErrors({ description: "Describe qué quieres publicar" }); return; }
    setErrors({});
    onGenerateSmart({ description, genImage: aiGenImage });
  }

  return (
    <motion.div initial={{ opacity: 0, y: -8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.98 }} transition={{ duration: 0.2 }} className="card-stripe overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between" style={{ background: "linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)" }}>
        <div className="flex items-center gap-2">
          <Wand2 size={16} className="text-white" />
          <span className="text-sm font-semibold text-white">Crear post con IA</span>
        </div>
        <button onClick={onClose} className="text-white/60 hover:text-white transition-colors"><X size={16} /></button>
      </div>

      {/* Mode toggle */}
      <div className="px-5 pt-4 pb-0">
        <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
          <button onClick={() => { setMode("ai"); setErrors({}); }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${mode === "ai" ? "bg-white text-violet-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
            <Sparkles size={12} />✨ Crear con IA
          </button>
          <button onClick={() => { setMode("manual"); setErrors({}); }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${mode === "manual" ? "bg-white text-slate-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
            <Pencil size={12} />Manual
          </button>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* ── AI MODE ── */}
        {mode === "ai" && (
          <>
            <div className="bg-violet-50 border border-violet-100 rounded-xl px-4 py-3 flex items-start gap-2.5">
              <Sparkles size={14} className="text-violet-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-violet-700 leading-relaxed">
                El agente IA analizará tu descripción y configurará automáticamente el <strong>canal, formato, tipo de contenido</strong> y <strong>tema</strong> óptimos para tu negocio.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                ¿Qué quieres publicar? <span className="text-red-500">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => { setDescription(e.target.value); if (errors.description) setErrors({}); }}
                placeholder="ej: un post mostrando los beneficios de comprar casa en Miami, enfocado en familias jóvenes..."
                rows={4}
                className={`w-full px-3 py-2.5 rounded-xl text-sm bg-white border outline-none focus:ring-2 transition-all text-foreground placeholder:text-muted-foreground resize-none ${errors.description ? "border-red-400 focus:border-red-400 focus:ring-red-100" : "border-border focus:border-violet-400 focus:ring-violet-100"}`}
              />
              {errors.description && <p className="mt-1 text-xs text-red-500 flex items-center gap-1"><AlertCircle size={10} />{errors.description}</p>}
            </div>

            <button onClick={() => canImage && setAiGenImage(!aiGenImage)} disabled={!canImage}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all w-full justify-center ${!canImage ? "border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed" : aiGenImage ? "border-violet-400 bg-violet-50 text-violet-700" : "border-border bg-white text-muted-foreground hover:border-violet-300"}`}>
              {canImage ? <ImagePlus size={14} className={aiGenImage ? "text-violet-600" : ""} /> : <Lock size={14} />}
              <span>Generar imagen IA también</span>
              {!canImage && <span className="ml-auto flex items-center gap-0.5 bg-amber-100 text-amber-700 text-[9px] font-bold px-1.5 py-0.5 rounded-full"><Crown size={7} />Starter+</span>}
            </button>

            <div className="flex gap-2 pt-1">
              <button onClick={handleSmartSubmit} disabled={generating}
                className="btn-primary flex-1 justify-center"
                style={{ background: generating ? undefined : "linear-gradient(135deg, #4F46E5, #7C3AED)" }}>
                {generating ? <><RefreshCw size={14} className="animate-spin" />Configurando y generando...</> : <><Sparkles size={14} />✨ Crear con IA</>}
              </button>
              <button onClick={onClose} className="btn-secondary">Cancelar</button>
            </div>
          </>
        )}

        {/* ── MANUAL MODE ── */}
        {mode === "manual" && (
          <>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Canal <span className="text-red-500 normal-case font-normal">*</span></label>
              <ChannelSelector value={channel} onChange={handleChannelChange} features={features} />
            </div>

            {isTikTok ? (
              <div className="flex items-center gap-2 bg-black/5 border border-black/10 rounded-xl px-4 py-2.5">
                <Film size={14} className="text-gray-500" />
                <span className="text-sm text-gray-600">Formato: <strong>Reel / Video</strong></span>
                <span className="ml-auto text-[10px] bg-black text-white font-bold px-2 py-0.5 rounded-full">TikTok solo acepta video</span>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Formato <span className="text-red-500 normal-case font-normal">*</span></label>
                <FormatSelector value={format} onChange={setFormat} features={features} />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Tipo de contenido <span className="text-red-500 normal-case font-normal">*</span></label>
                <select value={type} onChange={(e) => setType(e.target.value as ContentType)} className="w-full px-3 py-2 rounded-xl text-sm bg-white border border-border outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all text-foreground">
                  {CONTENT_TYPES.map((ct) => (<option key={ct.value} value={ct.value}>{ct.emoji} {ct.label}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Tema <span className="text-red-500 normal-case font-normal">*</span></label>
                <input type="text" value={topic} onChange={(e) => { setTopic(e.target.value); if (errors.topic) setErrors({}); }}
                  placeholder="ej: ventajas de vivir en Miraflores"
                  className={`w-full px-3 py-2 rounded-xl text-sm bg-white border outline-none focus:ring-2 transition-all text-foreground placeholder:text-muted-foreground ${errors.topic ? "border-red-400 focus:border-red-400 focus:ring-red-100" : "border-border focus:border-violet-400 focus:ring-violet-100"}`} />
                {errors.topic && <p className="mt-1 text-xs text-red-500 flex items-center gap-1"><AlertCircle size={10} />{errors.topic}</p>}
              </div>
            </div>

            <div className="space-y-2">
              {isTikTok ? (
                /* TikTok: solo video de biblioteca o HeyGen */
                <>
                  <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                    <AlertCircle size={13} className="text-amber-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-amber-700">TikTok solo acepta videos. Sube un video a tu biblioteca o genera uno con HeyGen.</p>
                  </div>
                  <button onClick={() => canVideo && setGenVideo(!genVideo)} disabled={!canVideo}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all w-full justify-center ${!canVideo ? "border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed" : genVideo ? "border-pink-400 bg-pink-50 text-pink-700" : "border-border bg-white text-muted-foreground hover:border-pink-300"}`}>
                    {canVideo ? <Video size={14} className={genVideo ? "text-pink-600" : ""} /> : <Lock size={14} />}
                    <span>Generar video con HeyGen</span>
                    {!canVideo && <span className="ml-auto flex items-center gap-0.5 bg-amber-100 text-amber-700 text-[9px] font-bold px-1.5 py-0.5 rounded-full"><Crown size={7} />Premium</span>}
                  </button>
                  <button onClick={toggleUseLibraryImage}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all w-full justify-center ${useLibraryImage ? "border-violet-400 bg-violet-50 text-violet-700" : "border-border bg-white text-muted-foreground hover:border-violet-300 hover:text-violet-700"}`}>
                    <HardDrive size={14} className={useLibraryImage ? "text-violet-600" : ""} />
                    <span>Video de mi biblioteca</span>
                    {selectedLibraryUrl && <span className="ml-auto text-[9px] font-bold bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full">✓ Seleccionado</span>}
                  </button>
                </>
              ) : (
                /* Otros canales: todas las opciones */
                <>
                  <div className="flex gap-3">
                    <button onClick={() => { if (!usePropImage) canImage && setGenImage(!genImage); }} disabled={!canImage || usePropImage}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all flex-1 justify-center ${!canImage || usePropImage ? "border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed" : genImage ? "border-violet-400 bg-violet-50 text-violet-700" : "border-border bg-white text-muted-foreground hover:border-violet-300"}`}>
                      {canImage ? <Image size={14} className={genImage ? "text-violet-600" : ""} /> : <Lock size={14} />}
                      <span>Generar imagen</span>
                      {!canImage && <span className="ml-auto flex items-center gap-0.5 bg-amber-100 text-amber-700 text-[9px] font-bold px-1.5 py-0.5 rounded-full"><Crown size={7} />Starter+</span>}
                    </button>
                    <button onClick={() => canVideo && setGenVideo(!genVideo)} disabled={!canVideo}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all flex-1 justify-center ${!canVideo ? "border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed" : genVideo ? "border-pink-400 bg-pink-50 text-pink-700" : "border-border bg-white text-muted-foreground hover:border-pink-300"}`}>
                      {canVideo ? <Video size={14} className={genVideo ? "text-pink-600" : ""} /> : <Lock size={14} />}
                      <span>Video HeyGen</span>
                      {!canVideo && <span className="ml-auto flex items-center gap-0.5 bg-amber-100 text-amber-700 text-[9px] font-bold px-1.5 py-0.5 rounded-full"><Crown size={7} />Premium</span>}
                    </button>
                  </div>
                  <button onClick={toggleUsePropImage}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all w-full justify-center ${usePropImage ? "border-teal-400 bg-teal-50 text-teal-700" : "border-border bg-white text-muted-foreground hover:border-teal-300 hover:text-teal-700"}`}>
                    <Building2 size={14} className={usePropImage ? "text-teal-600" : ""} />
                    <span>Foto de propiedad</span>
                    {selectedPropImage && <span className="ml-auto text-[9px] font-bold bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded-full">✓ Seleccionada</span>}
                  </button>
                  <button onClick={toggleUseLibraryImage}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all w-full justify-center ${useLibraryImage ? "border-violet-400 bg-violet-50 text-violet-700" : "border-border bg-white text-muted-foreground hover:border-violet-300 hover:text-violet-700"}`}>
                    <HardDrive size={14} className={useLibraryImage ? "text-violet-600" : ""} />
                    <span>De mi biblioteca</span>
                    {selectedLibraryUrl && <span className="ml-auto text-[9px] font-bold bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full">✓ Seleccionada</span>}
                  </button>
                </>
              )}
            </div>

            {useLibraryImage && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="overflow-hidden space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Elige un archivo de tu biblioteca</p>
                <div className="max-h-72 overflow-y-auto">
                  <MediaLibrary
                    token={token}
                    onSelect={(asset: MediaAsset) => setSelectedLibraryUrl(asset.public_url)}
                    selectedUrl={selectedLibraryUrl}
                  />
                </div>
              </motion.div>
            )}

            {usePropImage && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="overflow-hidden space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Elige una foto del catálogo</p>
                {loadingProps ? (
                  <div className="flex items-center justify-center py-6"><RefreshCw size={16} className="animate-spin text-teal-500" /></div>
                ) : propImages.length === 0 ? (
                  <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-xl">
                    <Building2 size={28} className="text-slate-300 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">No hay imágenes. Agrégalas en <strong>Propiedades</strong>.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2 max-h-52 overflow-y-auto rounded-xl">
                    {propImages.map((img) => (
                      <button key={img.url} type="button" onClick={() => setSelectedPropImage(selectedPropImage === img.url ? null : img.url)}
                        className={`relative rounded-xl overflow-hidden border-2 transition-all text-left ${selectedPropImage === img.url ? "border-teal-400 ring-2 ring-teal-200" : "border-transparent hover:border-slate-300"}`}>
                        <div style={{ aspectRatio: "4/3" }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={img.url} alt={img.property_title} className="w-full h-full object-cover" />
                        </div>
                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent px-1.5 py-1.5">
                          <p className="text-[9px] text-white font-medium leading-tight line-clamp-1">{img.property_title}</p>
                        </div>
                        {selectedPropImage === img.url && (
                          <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-teal-400 rounded-full flex items-center justify-center shadow-sm">
                            <CheckCircle size={11} className="text-white" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* Fecha de publicación */}
            <div>
              <button
                type="button"
                onClick={() => { setSchedulePost(!schedulePost); if (schedulePost) setScheduledAt(""); }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all w-full justify-center ${
                  schedulePost ? "border-blue-400 bg-blue-50 text-blue-700" : "border-border bg-white text-muted-foreground hover:border-blue-300 hover:text-blue-600"
                }`}>
                <Calendar size={14} className={schedulePost ? "text-blue-600" : ""} />
                <span>{schedulePost ? "Programar para:" : "Programar fecha de publicación"}</span>
              </button>
              {schedulePost && (
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={e => setScheduledAt(e.target.value)}
                  className="mt-2 w-full px-3 py-2 rounded-xl text-sm bg-white border border-blue-200 text-foreground outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                />
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <button onClick={handleManualSubmit} disabled={generating} className="btn-primary flex-1 justify-center">
                {generating ? <><RefreshCw size={14} className="animate-spin" />Generando...</> : schedulePost && scheduledAt ? <><Calendar size={14} />Generar y programar</> : <><Sparkles size={14} />Generar post</>}
              </button>
              <button onClick={onClose} className="btn-secondary">Cancelar</button>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}

// ── Monthly Marketing Campaign Panel ────────────────────────────────────

function MonthlyMarketingPanel({ onClose, onGenerate, generating, features }: {
  onClose: () => void;
  onGenerate: (channels: Channel[]) => void;
  generating: boolean;
  features: PlanFeatures | null;
}) {
  const allowed = (features?.content_channels ?? ["instagram", "facebook"]) as Channel[];
  const [selChannels, setSelChannels] = useState<Channel[]>(allowed.slice(0, 2));

  function toggleCh(ch: Channel) {
    setSelChannels(prev => prev.includes(ch) ? prev.filter(c => c !== ch) : [...prev, ch]);
  }

  // Frecuencia real: publica cada 2 días = 15 posts por canal al mes
  const activeDays = 15;
  const estPosts = activeDays * (selChannels.length || 2);

  return (
    <motion.div initial={{ opacity: 0, y: -8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.98 }} transition={{ duration: 0.2 }} className="card-stripe overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between" style={{ background: "linear-gradient(135deg, #D97706 0%, #DC2626 60%, #9333EA 100%)" }}>
        <div className="flex items-center gap-2">
          <Rocket size={16} className="text-white" />
          <span className="text-sm font-semibold text-white">Campaña de marketing mensual</span>
          <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full font-medium">30 días · IA</span>
        </div>
        <button onClick={onClose} className="text-white/60 hover:text-white transition-colors"><X size={16} /></button>
      </div>

      <div className="p-5 space-y-4">
        {/* What AI does */}
        <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3.5 space-y-2.5">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-amber-600" />
            <p className="text-sm font-semibold text-amber-800">El agente IA construye todo por ti</p>
          </div>
          <ul className="space-y-1.5">
            {[
              "Lee los datos de tu negocio, producto y audiencia objetivo",
              "Diseña una estrategia de campaña personalizada con pilares de contenido",
              "Define mensajes clave, tono y enfoque para cada tipo de post",
              "Genera posts para todo el mes (1 cada 2 días por canal)",
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-amber-700">
                <span className="w-4 h-4 rounded-full bg-amber-200 text-amber-800 text-[9px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                {step}
              </li>
            ))}
          </ul>
        </div>

        {/* Channels */}
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
            Canales <span className="normal-case font-normal">(la IA también puede elegir)</span>
          </label>
          <div className="flex gap-2 flex-wrap">
            {allowed.map((ch) => {
              const cfg = CHANNEL_CONFIG[ch];
              if (!cfg) return null;
              const active = selChannels.includes(ch);
              return (
                <button key={ch} onClick={() => toggleCh(ch)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                    active ? "text-white border-transparent shadow-sm" : "border-border bg-white text-muted-foreground hover:border-amber-300"
                  }`}
                  style={active ? { background: cfg.gradient } : {}}>
                  {cfg.icon}{cfg.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Stats preview */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Cobertura", value: "30 días", emoji: "📅" },
            { label: "Posts aprox.", value: `~${estPosts}`, emoji: "📝" },
            { label: "Frec. por canal", value: "c/2 días", emoji: "⏰" },
          ].map(({ label, value, emoji }) => (
            <div key={label} className="bg-slate-50 border border-border rounded-xl px-3 py-3 text-center">
              <p className="text-xl mb-1">{emoji}</p>
              <p className="text-sm font-bold text-foreground">{value}</p>
              <p className="text-[10px] text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={() => onGenerate(selChannels)}
            disabled={generating}
            className="btn-primary flex-1 justify-center disabled:opacity-60 text-sm"
            style={{ background: generating ? undefined : "linear-gradient(135deg, #D97706, #DC2626)" }}>
            {generating
              ? <><RefreshCw size={14} className="animate-spin" />Creando campaña...</>
              : <><Rocket size={14} />Generar campaña mensual</>}
          </button>
          <button onClick={onClose} className="btn-secondary">Cancelar</button>
        </div>
      </div>
    </motion.div>
  );
}

// ── Content Theme Wizard ──────────────────────────────────────────────────

interface Property { id: string; title: string; property_type: string; price: number | null; currency: string; neighborhood: string | null; city: string | null; cover_image_url: string | null; bedrooms: number | null; bathrooms: number | null; }

function ContentThemeWizard({ onClose, onGenerate, generating, features, token }: {
  onClose: () => void;
  onGenerate: (days: number, channels: Channel[], theme: string, propertyId?: string) => void;
  generating: boolean;
  features: PlanFeatures | null;
  token: string;
}) {
  const [theme, setTheme] = useState("mixed");
  const [days, setDays] = useState(7);
  const [selChannels, setSelChannels] = useState<Channel[]>(
    (features?.content_channels ?? ["instagram", "facebook"]).filter((c) => ["instagram", "facebook"].includes(c)) as Channel[]
  );
  const [properties, setProperties] = useState<Property[]>([]);
  const [loadingProps, setLoadingProps] = useState(false);
  const [selectedPropId, setSelectedPropId] = useState<string | undefined>(undefined);
  const allowed = (features?.content_channels ?? ["instagram", "facebook"]) as Channel[];

  function toggleCh(ch: Channel) {
    setSelChannels((prev) => prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]);
  }

  async function loadProperties() {
    if (properties.length > 0) return;
    setLoadingProps(true);
    try {
      const res = await fetch(`${API}/properties/`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { const data = await res.json(); setProperties(data.properties ?? []); }
    } finally { setLoadingProps(false); }
  }

  function handleThemeSelect(id: string) {
    setTheme(id);
    if (id === "properties") loadProperties();
  }

  const selectedTheme = CONTENT_THEMES.find(t => t.id === theme);
  const totalPosts = days * (selChannels.length || 1);

  return (
    <motion.div initial={{ opacity: 0, y: -8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.98 }} transition={{ duration: 0.2 }} className="card-stripe overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between" style={{ background: "linear-gradient(135deg, #2563EB 0%, #4F46E5 100%)" }}>
        <div className="flex items-center gap-2">
          <CalendarDays size={16} className="text-white" />
          <span className="text-sm font-semibold text-white">Generar calendario de contenido</span>
        </div>
        <button onClick={onClose} className="text-white/60 hover:text-white transition-colors"><X size={16} /></button>
      </div>

      <div className="p-5 space-y-5">

        {/* Tema */}
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-2.5 uppercase tracking-wide">Tema del calendario</label>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {CONTENT_THEMES.map((t) => (
              <button key={t.id} onClick={() => handleThemeSelect(t.id)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-center ${theme === t.id ? "border-indigo-400 bg-indigo-50" : "border-border bg-white hover:border-indigo-200 hover:bg-indigo-50/30"}`}>
                <span className="text-2xl leading-none">{t.emoji}</span>
                <span className={`text-[10px] font-bold leading-tight ${theme === t.id ? "text-indigo-700" : "text-foreground"}`}>{t.title}</span>
              </button>
            ))}
          </div>
          {selectedTheme && (
            <p className="mt-2 text-xs text-muted-foreground">{selectedTheme.emoji} <span className="font-medium text-foreground">{selectedTheme.title}:</span> {selectedTheme.desc}</p>
          )}
        </div>

        {/* Property picker (solo si tema = properties) */}
        {theme === "properties" && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="overflow-hidden">
            <label className="block text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Propiedad a publicitar</label>
            {loadingProps ? (
              <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground"><RefreshCw size={14} className="animate-spin" />Cargando propiedades...</div>
            ) : (
              <div className="space-y-1.5 max-h-44 overflow-y-auto">
                <button onClick={() => setSelectedPropId(undefined)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl border text-sm font-medium transition-all ${!selectedPropId ? "border-indigo-400 bg-indigo-50 text-indigo-700" : "border-border bg-white text-foreground hover:border-indigo-200"}`}>
                  <Layers size={13} className="flex-shrink-0" />
                  <div className="text-left">
                    <p className="font-semibold text-xs">Todas las propiedades</p>
                    <p className="text-[10px] text-muted-foreground">El agente rotará entre todas</p>
                  </div>
                  {!selectedPropId && <CheckCircle size={13} className="ml-auto text-indigo-600" />}
                </button>
                {properties.map((p) => (
                  <button key={p.id} onClick={() => setSelectedPropId(p.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl border text-sm transition-all ${selectedPropId === p.id ? "border-indigo-400 bg-indigo-50 text-indigo-700" : "border-border bg-white text-foreground hover:border-indigo-200"}`}>
                    {p.cover_image_url
                      ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={p.cover_image_url} alt={p.title} className="w-9 h-7 rounded-lg object-cover flex-shrink-0" />
                      : <div className="w-9 h-7 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0"><Building2 size={11} className="text-slate-400" /></div>
                    }
                    <div className="text-left flex-1 min-w-0">
                      <p className="font-medium truncate text-xs">{p.title}</p>
                      <p className="text-[10px] text-muted-foreground">{p.currency} {p.price ? p.price.toLocaleString("en-US") : "—"} · {p.neighborhood ?? p.city}</p>
                    </div>
                    {selectedPropId === p.id && <CheckCircle size={13} className="ml-auto text-indigo-600 flex-shrink-0" />}
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Días + Canales */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Días a generar</label>
            <div className="flex gap-2 flex-wrap">
              {[7, 14, 21, 30].map((d) => (
                <button key={d} onClick={() => setDays(d)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${days === d ? "text-white shadow-sm" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
                  style={days === d ? { background: "linear-gradient(135deg, #4F46E5, #7C3AED)" } : {}}>{d}d</button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Canales</label>
            <div className="flex gap-2 flex-wrap">
              {allowed.map((ch) => {
                const cfg = CHANNEL_CONFIG[ch];
                if (!cfg) return null;
                const active = selChannels.includes(ch);
                return (
                  <button key={ch} onClick={() => toggleCh(ch)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${active ? "text-white border-transparent" : "border-border bg-white text-muted-foreground hover:border-indigo-200"}`}
                    style={active ? { background: cfg.gradient } : {}}>
                    {cfg.icon}{cfg.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Resumen + acción */}
        <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-indigo-800">
              {totalPosts} posts · {days} días
            </p>
            <p className="text-xs text-indigo-600 mt-0.5">
              {selChannels.map(c => CHANNEL_CONFIG[c]?.label).join(", ") || "Sin canales"} · {selectedTheme?.emoji} {selectedTheme?.title}
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => onGenerate(days, selChannels, theme, selectedPropId)} disabled={generating || selChannels.length === 0}
              className="btn-primary disabled:opacity-60 text-xs px-4"
              style={{ background: "linear-gradient(135deg, #2563EB, #4F46E5)" }}>
              {generating ? <><RefreshCw size={13} className="animate-spin" />Generando...</> : <><CalendarDays size={13} />Generar</>}
            </button>
            <button onClick={onClose} className="btn-secondary text-xs px-3">Cancelar</button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Week Calendar ─────────────────────────────────────────────────────────

function WeekCalendar({ posts, onClickPost, onClickDay, calendarDate, onNavigate }: {
  posts: Post[]; onClickPost: (p: Post) => void; onClickDay?: (date: string) => void; calendarDate: Date; onNavigate: (delta: number) => void;
}) {
  const weekStart = new Date(calendarDate);
  const dow = weekStart.getDay();
  weekStart.setDate(weekStart.getDate() - (dow === 0 ? 6 : dow - 1));
  weekStart.setHours(0, 0, 0, 0);
  const days: Date[] = Array.from({ length: 7 }, (_, i) => { const d = new Date(weekStart); d.setDate(d.getDate() + i); return d; });
  const byDate = groupByDate(posts);
  const today = new Date().toISOString().split("T")[0];
  const DAY_NAMES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-slate-50/50">
        <button onClick={() => onNavigate(-7)} className="p-1.5 rounded-lg hover:bg-slate-200 transition-colors"><ChevronLeft size={15} className="text-slate-600" /></button>
        <span className="text-sm font-semibold text-foreground">
          {days[0].toLocaleDateString("es-MX", { day: "numeric", month: "short" })} — {days[6].toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })}
        </span>
        <button onClick={() => onNavigate(7)} className="p-1.5 rounded-lg hover:bg-slate-200 transition-colors"><ChevronRight size={15} className="text-slate-600" /></button>
      </div>
      <div className="grid grid-cols-7 divide-x divide-border" style={{ minHeight: 380 }}>
        {days.map((date, i) => {
          const key = date.toISOString().split("T")[0];
          const dayPosts = byDate[key] ?? [];
          const isToday = key === today;
          return (
            <div key={key} className={`flex flex-col ${isToday ? "bg-violet-50/40" : ""}`}>
              <div className={`flex flex-col items-center py-2 border-b ${isToday ? "border-violet-200 bg-violet-50" : "border-border"}`}>
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{DAY_NAMES[i]}</span>
                <span className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full mt-0.5 ${isToday ? "bg-violet-600 text-white" : "text-foreground"}`}>{date.getDate()}</span>
              </div>
              <div className="flex flex-col gap-1 p-1.5 flex-1">
                {dayPosts.map((post) => {
                  const ch = CHANNEL_CONFIG[post.channel] ?? CHANNEL_CONFIG.instagram;
                  return (
                    <button key={post.id} onClick={() => onClickPost(post)}
                      className="w-full text-left px-1.5 py-1 rounded-lg text-[9px] font-semibold text-white leading-tight transition-opacity hover:opacity-75 shadow-sm"
                      style={{ background: ch.gradient }}>
                      <span className="flex items-center gap-0.5 truncate">
                        <span className="flex-shrink-0">{ch.icon}</span>
                        <span className="truncate">{post.hook?.slice(0, 22) || post.caption.slice(0, 22)}</span>
                      </span>
                    </button>
                  );
                })}
                {dayPosts.length === 0 && (
                  <div className="flex-1 flex items-center justify-center">
                    <button onClick={() => onClickDay?.(key)} className="text-[9px] text-slate-300 hover:text-violet-400 hover:bg-violet-50 rounded-lg px-2 py-1 transition-colors">+ post</button>
                  </div>
                )}
                {dayPosts.length > 0 && (
                  <button onClick={() => onClickDay?.(key)} className="text-[9px] text-slate-400 hover:text-violet-500 text-center mt-0.5 transition-colors">+ añadir</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Month Calendar ────────────────────────────────────────────────────────

function MonthCalendar({ posts, onClickPost, onClickDay, calendarDate, onNavigate }: {
  posts: Post[]; onClickPost: (p: Post) => void; onClickDay?: (date: string) => void; calendarDate: Date; onNavigate: (delta: number) => void;
}) {
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const firstDow = new Date(year, month, 1).getDay();
  const startOffset = firstDow === 0 ? 6 : firstDow - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const byDate = groupByDate(posts);
  const today = new Date().toISOString().split("T")[0];
  const MONTH_NAMES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  const DAY_HEADERS = ["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"];
  const cells: (number | null)[] = [...Array(startOffset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-slate-50/50">
        <button onClick={() => onNavigate(-1)} className="p-1.5 rounded-lg hover:bg-slate-200 transition-colors"><ChevronLeft size={15} className="text-slate-600" /></button>
        <span className="text-sm font-semibold text-foreground capitalize">{MONTH_NAMES[month]} {year}</span>
        <button onClick={() => onNavigate(1)} className="p-1.5 rounded-lg hover:bg-slate-200 transition-colors"><ChevronRight size={15} className="text-slate-600" /></button>
      </div>
      <div className="grid grid-cols-7 border-b border-border">
        {DAY_HEADERS.map((d) => <div key={d} className="text-center py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 divide-x divide-y divide-border">
        {cells.map((day, i) => {
          if (day === null) return <div key={`e-${i}`} className="min-h-[80px] bg-slate-50/50" />;
          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const dayPosts = byDate[dateStr] ?? [];
          const isToday = dateStr === today;
          return (
            <div key={dateStr} className={`min-h-[80px] flex flex-col p-1 transition-colors ${isToday ? "bg-violet-50/40" : "bg-white hover:bg-slate-50/80"}`}>
              <span className={`self-end text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full mb-0.5 ${isToday ? "bg-violet-600 text-white" : "text-muted-foreground"}`}>{day}</span>
              <div className="flex flex-col gap-0.5">
                {dayPosts.slice(0, 2).map((post) => {
                  const ch = CHANNEL_CONFIG[post.channel] ?? CHANNEL_CONFIG.instagram;
                  return (
                    <button key={post.id} onClick={() => onClickPost(post)}
                      className="w-full text-left px-1 py-0.5 rounded text-[9px] font-medium text-white leading-tight truncate hover:opacity-75 transition-opacity"
                      style={{ background: ch.gradient }}>
                      {post.hook?.slice(0, 18) || post.caption.slice(0, 18)}
                    </button>
                  );
                })}
                {dayPosts.length > 2 && <span className="text-[8px] text-muted-foreground pl-0.5">+{dayPosts.length - 2} más</span>}
                <button onClick={() => onClickDay?.(dateStr)} className="text-[8px] text-slate-300 hover:text-violet-500 text-left mt-0.5 transition-colors">+ post</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Post Card ─────────────────────────────────────────────────────────────

function PostCard({ post, onApprove, onPublish, onSchedule, onDelete, onCheckVideo, onEdit, onGenerateImage }: {
  post: Post; onApprove: () => void; onPublish: () => void; onSchedule: () => void; onDelete: () => void; onCheckVideo: () => void; onEdit: () => void; onGenerateImage: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const ch = CHANNEL_CONFIG[post.channel] ?? CHANNEL_CONFIG.instagram;
  const st = STATUS_CONFIG[post.status];
  const fmt = FORMAT_CONFIG[post.format_type ?? "post"];

  return (
    <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }} className="card flex flex-col gap-3 p-4 group overflow-hidden">
      
      {post.image_url && (() => {
        const isVideo = /\.(mp4|mov|webm|avi|mkv)(\?.*)?$/i.test(post.image_url ?? "");
        const mediaUrl = normalizeMediaUrl(post.image_url);
        return (
          <div className="relative rounded-xl overflow-hidden bg-slate-100" style={{ aspectRatio: post.format_type === "post" ? "1/1" : "9/16", maxHeight: post.format_type === "post" ? 220 : 300 }}>
            {isVideo ? (
              <video
                key={mediaUrl}
                controls
                playsInline
                preload="auto"
                className="w-full h-full"
                style={{ objectFit: "contain", background: "#0f0f0f" }}
              >
                <source src={mediaUrl} type="video/mp4" />
                <source src={mediaUrl} />
              </video>
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={mediaUrl} alt="Imagen generada por IA" className="w-full h-full object-cover" />
            )}
            <div className="absolute top-2 left-2 flex items-center gap-1.5 pointer-events-none">
              <span className="text-[10px] font-bold bg-black/60 text-white px-2 py-0.5 rounded-full backdrop-blur-sm">{isVideo ? "📹" : "AI"} · {fmt.ratio}</span>
            </div>
            {!isVideo && post.channel !== "tiktok" && (
              <button onClick={onGenerateImage} className="absolute top-2 right-2 flex items-center gap-1 text-[10px] font-bold bg-black/60 hover:bg-violet-600 text-white px-2 py-1 rounded-full backdrop-blur-sm transition-colors" title="Regenerar imagen">
                <RefreshCw size={9} />Regenerar
              </button>
            )}
          </div>
        );
      })()}

      {post.video_job_id && !post.video_url && (
        <div className="flex items-center gap-2 bg-pink-50 border border-pink-100 rounded-xl px-3 py-2.5">
          <Film size={13} className="text-pink-500 flex-shrink-0" />
          <div className="flex-1"><p className="text-xs font-medium text-pink-700">Video HeyGen en proceso...</p><p className="text-[10px] text-pink-500">Puede tardar 5-10 min</p></div>
          <button onClick={onCheckVideo} className="text-[10px] font-semibold text-pink-600 hover:text-pink-700 underline">Verificar</button>
        </div>
      )}

      {post.video_url && (
        <div className="rounded-xl overflow-hidden bg-slate-900">
          <video src={normalizeMediaUrl(post.video_url)} controls playsInline preload="auto" className="w-full max-h-48" />
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold text-white" style={{ background: ch.gradient }}>{ch.icon}{ch.label}</span>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-50 text-slate-600 border border-slate-200">{fmt.icon}{fmt.label}</span>
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${st.badge}`}>
          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: st.dot, boxShadow: `0 0 4px ${st.dot}` }} />{st.label}
        </span>
        <span className="ml-auto text-[10px] text-muted-foreground capitalize">{post.content_type.replace("_", " ")}</span>
      </div>

      {post.hook && <p className="text-sm font-semibold text-foreground leading-snug line-clamp-2">{post.hook}</p>}

      <div>
        <p className={`text-xs text-muted-foreground leading-relaxed ${!expanded ? "line-clamp-3" : ""}`}>{post.caption}</p>
        {post.caption.length > 120 && (
          <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-0.5 text-xs text-violet-600 hover:text-violet-700 font-medium mt-1 transition-colors">
            {expanded ? "Ver menos" : "Ver más"}<ChevronDown size={11} className={`transition-transform ${expanded ? "rotate-180" : ""}`} />
          </button>
        )}
      </div>

      {post.hashtags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {post.hashtags.slice(0, 5).map((tag) => (
            <span key={tag} className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-violet-50 text-violet-600 border border-violet-100">#{tag.replace(/^#/, "")}</span>
          ))}
          {post.hashtags.length > 5 && <span className="text-[10px] text-muted-foreground">+{post.hashtags.length - 5}</span>}
        </div>
      )}

      {!post.image_url && post.image_prompt && post.channel !== "tiktok" && (
        <div className="rounded-xl border border-dashed border-violet-200 bg-violet-50/40 p-3 flex flex-col gap-2">
          <p className="text-[10px] font-semibold text-violet-700 flex items-center gap-1"><ImagePlus size={11} />Imagen pendiente de generar</p>
          <p className="text-[9px] text-violet-500 leading-relaxed line-clamp-2 italic">{post.image_prompt.slice(0, 120)}...</p>
          <button onClick={onGenerateImage}
            className="self-start flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all hover:opacity-90 shadow-sm"
            style={{ background: "linear-gradient(135deg, #7C3AED, #4F46E5)" }}>
            <Wand2 size={11} />Generar imagen IA
          </button>
        </div>
      )}

      {post.status === "scheduled" && post.scheduled_at && (
        <div className="flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 px-2.5 py-1.5 rounded-lg border border-blue-100">
          <Clock size={11} />Programado: {new Date(post.scheduled_at).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" })}
        </div>
      )}
      {post.status === "published" && post.published_at && (
        <div className="flex items-center gap-1.5 text-xs text-violet-600 bg-violet-50 px-2.5 py-1.5 rounded-lg border border-violet-100">
          <CheckCircle size={11} />Publicado {new Date(post.published_at).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" })}
          {post.platform_url && <a href={post.platform_url} target="_blank" rel="noopener noreferrer" className="ml-auto font-semibold underline">ver →</a>}
        </div>
      )}
      {(post.status === "draft" || post.status === "approved") && post.created_at && (
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Clock size={10} />Creado {new Date(post.created_at).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" })}
        </div>
      )}
      {post.error_message && <p className="text-xs text-red-600 bg-red-50 border border-red-100 px-2.5 py-1.5 rounded-lg">{post.error_message}</p>}

      {/* Approval workflow notice for drafts */}
      {post.status === "draft" && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
          <AlertCircle size={12} className="text-amber-500 flex-shrink-0" />
          <p className="text-[11px] text-amber-700 font-medium">Revisa y aprueba antes de publicar</p>
        </div>
      )}

      <div className="flex items-center gap-1.5 pt-1 border-t border-border/50 mt-auto flex-wrap">
        {/* Edit — available on draft and approved */}
        {(post.status === "draft" || post.status === "approved") && (
          <button onClick={onEdit} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors">
            <Pencil size={12} /> Editar
          </button>
        )}
        {/* Approve — only for drafts */}
        {post.status === "draft" && (
          <button onClick={onApprove} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold border border-emerald-200 transition-colors">
            <CheckCircle size={12} /> Aprobar
          </button>
        )}
        {/* Publish + Schedule — for approved or failed (retry) */}
        {(post.status === "approved" || post.status === "failed") && (
          <>
            <button onClick={onPublish} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90" style={{ background: "linear-gradient(135deg, #635BFF, #7C3AED)" }}><Send size={12} />{post.status === "failed" ? "Reintentar" : "Publicar"}</button>
            {post.status === "approved" && <button onClick={onSchedule} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold border border-blue-200 transition-colors"><Clock size={12} /> Programar</button>}
          </>
        )}
        {post.status !== "published" && (
          <button onClick={onDelete} className="ml-auto p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={13} /></button>
        )}
      </div>
    </motion.div>
  );
}

// ── Edit Post Modal ───────────────────────────────────────────────────────

function EditPostModal({ post, token, onClose, onSaved, onPublish, onSchedule }: {
  post: Post; token: string; onClose: () => void; onSaved: (updated: Post) => void;
  onPublish?: () => void; onSchedule?: () => void;
}) {
  const [hook, setHook] = useState(post.hook ?? "");
  const [caption, setCaption] = useState(post.caption);
  const [hashtagsRaw, setHashtagsRaw] = useState(post.hashtags.join(", "));
  const [imageUrl, setImageUrl] = useState(post.image_url ?? "");
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [scheduleMode, setScheduleMode] = useState<"none" | "now" | "schedule">("none");
  const [scheduleDate, setScheduleDate] = useState("");
  const [showLibrary, setShowLibrary] = useState(false);

  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  function parseHashtags(raw: string): string[] {
    return raw.split(/[,\n]+/).map(t => t.trim().replace(/^#/, "")).filter(Boolean);
  }

  async function handleSave(andApprove = false) {
    andApprove ? setApproving(true) : setSaving(true);
    try {
      const body: Record<string, unknown> = {
        hook: hook || null,
        caption,
        hashtags: parseHashtags(hashtagsRaw),
        image_url: imageUrl || null,
      };
      if (andApprove) body.status = "approved";
      const res = await fetch(`${API}/content/posts/${post.id}`, { method: "PATCH", headers, body: JSON.stringify(body) });
      if (res.ok) {
        const updated: Post = { ...post, hook: (body.hook as string | null), caption, hashtags: body.hashtags as string[], image_url: (body.image_url as string | null), status: andApprove ? "approved" : post.status };
        toast.success(andApprove ? "Post editado y aprobado ✅" : "Cambios guardados");
        onSaved(updated);
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.detail || "Error al guardar");
      }
    } finally { setSaving(false); setApproving(false); }
  }

  async function handleSaveAndPublish() {
    // 1. Guardar cambios y aprobar
    setSaving(true);
    try {
      const body = { hook: hook || null, caption, hashtags: parseHashtags(hashtagsRaw), image_url: imageUrl || null, status: "approved" };
      const res = await fetch(`${API}/content/posts/${post.id}`, { method: "PATCH", headers, body: JSON.stringify(body) });
      if (!res.ok) { const err = await res.json().catch(() => ({})); toast.error(err.detail || "Error al guardar"); return; }
    } finally { setSaving(false); }
    // 2. Publicar
    onClose();
    onPublish?.();
  }

  async function handleSaveAndSchedule() {
    if (!scheduleDate) return;
    // 1. Guardar cambios
    setSaving(true);
    try {
      const body = { hook: hook || null, caption, hashtags: parseHashtags(hashtagsRaw), image_url: imageUrl || null };
      const res = await fetch(`${API}/content/posts/${post.id}`, { method: "PATCH", headers, body: JSON.stringify(body) });
      if (!res.ok) { const err = await res.json().catch(() => ({})); toast.error(err.detail || "Error al guardar"); return; }
    } finally { setSaving(false); }
    // 2. Aprobar + programar
    const apRes = await fetch(`${API}/content/posts/${post.id}/approve`, { method: "POST", headers });
    if (!apRes.ok) { toast.error("Error al aprobar"); return; }
    const schRes = await fetch(`${API}/content/posts/${post.id}/schedule`, {
      method: "POST", headers,
      body: JSON.stringify({ post_id: post.id, scheduled_at: new Date(scheduleDate).toISOString() }),
    });
    if (schRes.ok) {
      toast.success("Post programado ✅");
      const updated: Post = { ...post, status: "scheduled", scheduled_at: scheduleDate };
      onSaved(updated);
    } else {
      toast.error("Error al programar");
    }
  }

  const inputCls = "w-full px-3 py-2 rounded-xl text-sm bg-white border border-border outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all text-foreground placeholder:text-muted-foreground";
  const labelCls = "block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide";
  const ch = CHANNEL_CONFIG[post.channel] ?? CHANNEL_CONFIG.instagram;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border"
          style={{ background: "linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)" }}>
          <div className="flex items-center gap-2.5">
            <Pencil size={16} className="text-white" />
            <span className="text-sm font-semibold text-white">Editar borrador</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white">
              {ch.icon} {ch.label}
            </span>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white transition-colors"><X size={18} /></button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">

          {/* (image section moved below) */}

          {/* Media from library */}
          <div>
            <label className={labelCls}>Imagen / Video</label>
            <div className="flex gap-2 mb-2">
              <input value={imageUrl} onChange={e => setImageUrl(e.target.value)}
                placeholder="URL de imagen o video (deja vacío para quitar)" className={inputCls} />
              <button
                type="button"
                onClick={() => setShowLibrary(!showLibrary)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${showLibrary ? "border-violet-400 bg-violet-50 text-violet-700" : "border-border bg-white text-muted-foreground hover:border-violet-300 hover:text-violet-600"}`}>
                <HardDrive size={13} />
                Biblioteca
              </button>
            </div>
            {imageUrl && (() => {
              const isVid = /\.(mp4|mov|webm|avi|mkv)(\?.*)?$/i.test(imageUrl);
              return (
                <div className="relative rounded-xl overflow-hidden bg-slate-100 mb-2" style={{ aspectRatio: "16/9", maxHeight: 160 }}>
                  {isVid ? (
                    <video src={imageUrl} controls className="w-full h-full object-cover" />
                  ) : (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={imageUrl} alt="preview" className="w-full h-full object-cover" />
                  )}
                  <button onClick={() => setImageUrl("")} className="absolute top-2 right-2 p-1 rounded-full bg-black/50 text-white hover:bg-red-500 transition-colors">
                    <X size={12} />
                  </button>
                </div>
              );
            })()}
            {showLibrary && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="overflow-hidden mt-2 max-h-72 overflow-y-auto rounded-xl border border-border">
                <MediaLibrary
                  token={token}
                  onSelect={(asset: MediaAsset) => { setImageUrl(asset.public_url); setShowLibrary(false); }}
                  selectedUrl={imageUrl}
                />
              </motion.div>
            )}
          </div>

          <div>
            <label className={labelCls}>Hook / Título</label>
            <input value={hook} onChange={e => setHook(e.target.value)}
              placeholder="Primera línea que engancha al lector..." className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>Caption</label>
            <textarea value={caption} onChange={e => setCaption(e.target.value)}
              rows={6} className={`${inputCls} resize-none leading-relaxed`} />
            <p className="text-[10px] text-muted-foreground mt-1 text-right">{caption.length} caracteres</p>
          </div>

          <div>
            <label className={labelCls}>Hashtags <span className="normal-case font-normal">(separados por coma)</span></label>
            <textarea value={hashtagsRaw} onChange={e => setHashtagsRaw(e.target.value)}
              rows={2} placeholder="realestate, orlando, florida, casas" className={`${inputCls} resize-none`} />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-slate-50/50 space-y-3">
          {/* Publish action selector */}
          <div className="flex gap-2">
            <button onClick={() => setScheduleMode(scheduleMode === "now" ? "none" : "now")}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                scheduleMode === "now" ? "border-violet-400 bg-violet-50 text-violet-700" : "border-border bg-white text-muted-foreground hover:border-violet-300 hover:text-violet-600"
              }`}>
              <Send size={12} /> Publicar ahora
            </button>
            <button onClick={() => setScheduleMode(scheduleMode === "schedule" ? "none" : "schedule")}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                scheduleMode === "schedule" ? "border-blue-400 bg-blue-50 text-blue-700" : "border-border bg-white text-muted-foreground hover:border-blue-300 hover:text-blue-600"
              }`}>
              <Calendar size={12} /> Programar
            </button>
          </div>

          {/* Schedule date picker */}
          {scheduleMode === "schedule" && (
            <div className="flex gap-2 items-center">
              <input type="datetime-local" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl text-sm bg-white border border-blue-200 text-foreground outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all" />
              <button onClick={handleSaveAndSchedule} disabled={!scheduleDate || saving}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all"
                style={{ background: "linear-gradient(135deg, #2563EB, #4F46E5)" }}>
                {saving ? <RefreshCw size={13} className="animate-spin" /> : <Clock size={13} />} Programar
              </button>
            </div>
          )}

          {/* Bottom row */}
          <div className="flex items-center gap-2">
            <button onClick={() => handleSave(false)} disabled={saving || approving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-white border border-border text-foreground hover:bg-slate-50 disabled:opacity-60 transition-all">
              {saving ? <><RefreshCw size={13} className="animate-spin" />Guardando...</> : <><CheckCircle size={13} />Guardar</>}
            </button>
            {post.status === "draft" && scheduleMode !== "schedule" && (
              <button onClick={() => handleSave(true)} disabled={saving || approving}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-60 transition-all hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #10B981, #059669)" }}>
                {approving ? <><RefreshCw size={13} className="animate-spin" />Aprobando...</> : <><CheckCircle size={13} />Guardar y aprobar</>}
              </button>
            )}
            {scheduleMode === "now" && (
              <button onClick={handleSaveAndPublish} disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-60 transition-all hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #635BFF, #7C3AED)" }}>
                {saving ? <><RefreshCw size={13} className="animate-spin" />Guardando...</> : <><Send size={13} />Guardar y publicar</>}
              </button>
            )}
            <button onClick={onClose} className="ml-auto text-sm text-muted-foreground hover:text-foreground transition-colors">Cancelar</button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ── Plan Badge ────────────────────────────────────────────────────────────

function PlanBadge({ features }: { features: PlanFeatures | null }) {
  if (!features) return null;
  if (features.heygen) return (
    <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-amber-400 to-orange-400 text-white shadow-sm"><Crown size={11} /> Premium</span>
  );
  if (features.image_generation) return (
    <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-violet-500 to-indigo-500 text-white shadow-sm"><Zap size={11} /> Profesional</span>
  );
  return <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">Starter</span>;
}

// ── Main Page ─────────────────────────────────────────────────────────────

export default function ContentPage() {
  const { token } = useAuthStore();
  const [posts, setPosts] = useState<Post[]>([]);
  const [stats, setStats] = useState<{ total: number; by_status: Record<string, number>; by_channel: Record<string, number> }>({ total: 0, by_status: {}, by_channel: {} });
  const [features, setFeatures] = useState<PlanFeatures | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generatingCalendar, setGeneratingCalendar] = useState(false);
  const [generatingMonthly, setGeneratingMonthly] = useState(false);
  const [filterChannel, setFilterChannel] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [calendarViewMode, setCalendarViewMode] = useState<"week" | "month">("week");
  const [calendarAnchorDate, setCalendarAnchorDate] = useState(new Date());
  const [panel, setPanel] = useState<"none" | "generate" | "calendar" | "monthly">("none");
  const [activeMainTab, setActiveMainTab] = useState<"posts" | "biblioteca">("posts");
  const [schedulingPost, setSchedulingPost] = useState<string | null>(null);
  const [scheduleDate, setScheduleDate] = useState("");
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [viewingPost, setViewingPost] = useState<Post | null>(null);
  const [calendarClickDate, setCalendarClickDate] = useState<string | undefined>(undefined);

  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (filterChannel) params.set("channel", filterChannel);
      if (filterStatus) params.set("status", filterStatus);
      const [postsRes, statsRes, featRes] = await Promise.all([
        fetch(`${API}/content/posts?${params}`, { headers }),
        fetch(`${API}/content/stats`, { headers }),
        fetch(`${API}/content/plan-features`, { headers }),
      ]);
      if (postsRes.ok) setPosts(await postsRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
      if (featRes.ok) setFeatures(await featRes.json());
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, filterChannel, filterStatus]);

  const silentRefresh = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (filterChannel) params.set("channel", filterChannel);
      if (filterStatus) params.set("status", filterStatus);
      const [postsRes, statsRes] = await Promise.all([
        fetch(`${API}/content/posts?${params}`, { headers }),
        fetch(`${API}/content/stats`, { headers }),
      ]);
      if (postsRes.ok) setPosts(await postsRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
    } catch { /* silent */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, filterChannel, filterStatus]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function generatePost(opts: { channel: Channel; type: ContentType; topic: string; format: FormatType; genImage: boolean; genVideo: boolean; propImageUrl?: string; scheduledAt?: string }) {
    setGenerating(true);
    const parts = ["Generando post con Petunia AI"];
    if (opts.propImageUrl) parts.push("+ foto de propiedad");
    else if (opts.genImage) parts.push("+ imagen fal.ai");
    if (opts.genVideo) parts.push("+ video HeyGen");
    const toastId = toast.loading(parts.join(" "));
    try {
      const res = await fetch(`${API}/content/generate`, {
        method: "POST", headers,
        body: JSON.stringify({ channel: opts.channel, content_type: opts.type, format_type: opts.format, topic: opts.topic || undefined, generate_image: opts.genImage && !opts.propImageUrl, generate_video: opts.genVideo, use_image_url: opts.propImageUrl || undefined }),
      });
      if (res.ok) {
        const post = await res.json();
        // Si hay fecha de publicación, aprobar + programar automáticamente
        if (opts.scheduledAt) {
          try {
            await fetch(`${API}/content/posts/${post.id}/approve`, { method: "POST", headers });
            await fetch(`${API}/content/posts/${post.id}/schedule`, {
              method: "POST", headers,
              body: JSON.stringify({ post_id: post.id, scheduled_at: new Date(opts.scheduledAt).toISOString() }),
            });
            post.status = "scheduled";
            post.scheduled_at = opts.scheduledAt;
          } catch { /* si falla el schedule, el post queda como draft */ }
        }
        setPosts((prev) => [post, ...prev]);
        setStats((s) => ({ ...s, total: s.total + 1, by_status: { ...s.by_status, draft: (s.by_status.draft ?? 0) + 1 } }));
        setPanel("none");
        let msg = opts.scheduledAt ? `Post programado para ${new Date(opts.scheduledAt).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" })} 📅` : "Post generado exitosamente";
        if (post.image_url) msg += " con imagen ✨";
        if (post.video_job_id) msg += " · video HeyGen en proceso 🎬";
        toast.success(msg, { id: toastId });
        silentRefresh();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.detail || "Error al generar el post", { id: toastId });
      }
    } catch {
      toast.error("Error de conexión al generar el post", { id: toastId });
    } finally {
      setGenerating(false);
    }
  }

  async function generateSmart(opts: { description: string; genImage: boolean }) {
    setGenerating(true);
    const toastId = toast.loading("El agente IA está configurando y generando tu post...");
    try {
      const res = await fetch(`${API}/content/generate-smart`, {
        method: "POST", headers,
        body: JSON.stringify({ description: opts.description, generate_image: opts.genImage }),
      });
      if (res.ok) {
        const post = await res.json();
        setPosts((prev) => [post, ...prev]);
        setStats((s) => ({ ...s, total: s.total + 1, by_status: { ...s.by_status, draft: (s.by_status.draft ?? 0) + 1 } }));
        setPanel("none");
        const p = post._smart_params;
        const channelLabel = CHANNEL_CONFIG[post.channel as Channel]?.label ?? post.channel;
        let msg = `Post creado para ${channelLabel} · ${post.content_type}`;
        if (p?.rationale) msg += ` — ${p.rationale}`;
        if (post.image_url) msg += " 🎨";
        toast.success(msg, { id: toastId, duration: 5000 });
        silentRefresh();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.detail || "Error al generar el post con IA", { id: toastId });
      }
    } catch {
      toast.error("Error de conexión", { id: toastId });
    } finally {
      setGenerating(false);
    }
  }

  async function generateCalendar(days: number, channels: Channel[], theme: string = "mixed", propertyId?: string) {
    setGeneratingCalendar(true);
    const toastId = toast.loading(`Generando ${days * channels.length} posts con IA... (puede tardar ~${Math.max(15, days * channels.length * 3)}s)`);
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 180_000);
      let res: Response;
      try {
        res = await fetch(`${API}/content/generate-calendar`, {
          method: "POST", headers,
          body: JSON.stringify({ days, channels, content_theme: theme, property_id: propertyId ?? null }),
          signal: ctrl.signal,
        });
      } finally { clearTimeout(timer); }
      if (res.ok) {
        const data = await res.json();
        toast.success(`✅ ${data.total} posts generados exitosamente`, { id: toastId });
        setPanel("none");
        await fetchData();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.detail || "Error al generar el calendario", { id: toastId });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error && e.name === "AbortError"
        ? "Tiempo agotado — intenta con menos días o canales"
        : "Error de conexión al generar el calendario";
      toast.error(msg, { id: toastId });
    }
    finally { setGeneratingCalendar(false); }
  }

  async function generateMonthlyCampaign(channels: Channel[]) {
    setGeneratingMonthly(true);
    const toastId = toast.loading("🧠 Diseñando estrategia de campaña mensual...");
    try {
      const res = await fetch(`${API}/content/generate-monthly-campaign`, {
        method: "POST", headers,
        body: JSON.stringify({ channels }),
      });
      const data = await res.json();
      if (res.ok) {
        setPanel("none");
        const brief = data.campaign;
        const channelLabels = (data.channels as Channel[]).map((c: Channel) => CHANNEL_CONFIG[c]?.label).join(", ");
        toast.success(
          `🎯 "${brief?.campaign_name}" iniciada · ~${data.total_posts} posts · ${channelLabels} — se generarán en segundos`,
          { id: toastId, duration: 8000 }
        );
        // Refresca la lista cuando los posts en background terminen (~30 s)
        setTimeout(() => fetchData(), 15000);
        setTimeout(() => fetchData(), 35000);
        setTimeout(() => fetchData(), 60000);
      } else {
        toast.error(data.detail || "Error al crear la campaña", { id: toastId });
      }
    } catch {
      toast.error("Error de conexión", { id: toastId });
    } finally {
      setGeneratingMonthly(false);
    }
  }

  async function generatePostImage(postId: string) {
    const toastId = toast.loading("⏳ Claude analizando post y generando imagen...");
    try {
      const res = await fetch(`${API}/content/posts/${postId}/generate-image`, { method: "POST", headers });
      let data: Record<string, string> = {};
      try { data = await res.json(); } catch { data = { error: `Error HTTP ${res.status}` }; }
      if (res.ok && data.image_url) {
        setPosts((p) => p.map((x) => x.id === postId ? { ...x, image_url: data.image_url } : x));
        const modeLabel = data.mode === "image-to-image" ? " desde foto de propiedad \uD83C\uDFD8\uFE0F" : "";
        toast.success(`Imagen generada${modeLabel} ✨`, { id: toastId });
      } else {
        const errMsg = data.error || data.detail || `Error ${res.status}`;
        toast.error(errMsg, { id: toastId, duration: 6000 });
      }
    } catch (err: unknown) {
      const msg = err instanceof TypeError && (err as TypeError).message.includes("fetch")
        ? "No se pudo conectar al servidor — ¿está corriendo el backend?"
        : `Error: ${err instanceof Error ? err.message : String(err)}`;
      toast.error(msg, { id: toastId, duration: 7000 });
    }
  }

  async function approvePost(id: string) {
    await fetch(`${API}/content/posts/${id}/approve`, { method: "POST", headers });
    setPosts((p) => p.map((x) => x.id === id ? { ...x, status: "approved" as PostStatus } : x));
    setStats((s) => ({ ...s, by_status: { ...s.by_status, draft: Math.max(0, (s.by_status.draft ?? 0) - 1), approved: (s.by_status.approved ?? 0) + 1 } }));
    toast.success("Post aprobado ✅");
  }

  function handlePostSaved(updated: Post) {
    setPosts((p) => p.map((x) => x.id === updated.id ? updated : x));
    if (updated.status === "approved" && editingPost?.status === "draft") {
      setStats((s) => ({ ...s, by_status: { ...s.by_status, draft: Math.max(0, (s.by_status.draft ?? 0) - 1), approved: (s.by_status.approved ?? 0) + 1 } }));
    }
    setEditingPost(null);
  }

  async function publishPost(id: string) {
    const toastId = toast.loading("Publicando en redes sociales...");
    const res = await fetch(`${API}/content/posts/${id}/publish`, { method: "POST", headers });
    if (res.ok) {
      setPosts((p) => p.map((x) => x.id === id ? { ...x, status: "scheduled" as PostStatus } : x));
      toast.success("Publicando… el estado se actualizará en segundos", { id: toastId });
      // Refresh after a few seconds to show published/failed status from background task
      setTimeout(() => silentRefresh(), 5000);
      setTimeout(() => silentRefresh(), 12000);
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.detail || "Error al publicar", { id: toastId });
    }
  }

  async function schedulePost() {
    if (!schedulingPost || !scheduleDate) return;
    await fetch(`${API}/content/posts/${schedulingPost}/schedule`, { method: "POST", headers, body: JSON.stringify({ post_id: schedulingPost, scheduled_at: new Date(scheduleDate).toISOString() }) });
    setPosts((p) => p.map((x) => x.id === schedulingPost ? { ...x, status: "scheduled" as PostStatus, scheduled_at: scheduleDate } : x));
    setSchedulingPost(null); setScheduleDate("");
  }

  async function deletePost(id: string) {
    await fetch(`${API}/content/posts/${id}`, { method: "DELETE", headers });
    setPosts((p) => p.filter((x) => x.id !== id));
    setStats((s) => ({ ...s, total: Math.max(0, s.total - 1) }));
  }

  async function checkVideoStatus(postId: string) {
    const toastId = toast.loading("Verificando estado del video...");
    try {
      const res = await fetch(`${API}/content/posts/${postId}/video-status`, { headers });
      const data = await res.json();
      if (data.status === "completed" && data.video_url) {
        setPosts((p) => p.map((x) => x.id === postId ? { ...x, video_url: data.video_url } : x));
        toast.success("¡Video listo! ��", { id: toastId });
      } else if (data.status === "failed") {
        toast.error(`Video falló: ${data.error || "error desconocido"}`, { id: toastId });
      } else {
        toast("Video aún en proceso, intenta en unos minutos ⏳", { id: toastId });
      }
    } catch { toast.error("Error al verificar el video", { id: toastId }); }
  }

  return (
    <div className="p-4 md:p-8 max-w-[1280px] mx-auto space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight gradient-text-violet flex items-center gap-2"><Sparkles size={20} />Contenido con IA</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Genera posts y stories para Instagram, Facebook{features?.content_channels.includes("tiktok") ? ", TikTok" : ""}{features?.content_channels.includes("linkedin") ? " y LinkedIn" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <PlanBadge features={features} />
          <button onClick={() => setPanel(panel === "monthly" ? "none" : "monthly")} className={`btn-secondary text-xs ${panel === "monthly" ? "border-orange-300 text-orange-700 bg-orange-50" : ""}`}><Rocket size={14} />Campaña mensual</button>
          <button onClick={() => setPanel(panel === "calendar" ? "none" : "calendar")} className={`btn-secondary ${panel === "calendar" ? "border-blue-300 text-blue-700 bg-blue-50" : ""}`}><Calendar size={14} />Calendario IA</button>
          <button onClick={() => setPanel(panel === "generate" ? "none" : "generate")} className="btn-primary"><Plus size={14} />Nuevo post</button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveMainTab("posts")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeMainTab === "posts" ? "bg-white text-violet-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <Sparkles size={13} /> Posts
        </button>
        <button
          onClick={() => setActiveMainTab("biblioteca")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeMainTab === "biblioteca" ? "bg-white text-violet-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <HardDrive size={13} /> Biblioteca de medios
        </button>
      </div>

      {/* Biblioteca tab */}
      {activeMainTab === "biblioteca" && (
        <MediaLibrary token={token ?? ""} />
      )}

      {activeMainTab === "posts" && <>

      <StatStrip total={stats.total} byStatus={stats.by_status} />

      {/* Panels */}
      <AnimatePresence mode="wait">
        {panel === "generate" && <GeneratorPanel key={`generate-${calendarClickDate ?? "new"}`} onClose={() => { setPanel("none"); setCalendarClickDate(undefined); }} onGenerate={generatePost} onGenerateSmart={generateSmart} generating={generating} features={features} token={token ?? ""} initialDate={calendarClickDate} />}
        {panel === "calendar" && <ContentThemeWizard key="calendar" onClose={() => setPanel("none")} onGenerate={generateCalendar} generating={generatingCalendar} features={features} token={token ?? ""} />}
        {panel === "monthly" && <MonthlyMarketingPanel key="monthly" onClose={() => setPanel("none")} onGenerate={generateMonthlyCampaign} generating={generatingMonthly} features={features} />}
      </AnimatePresence>

      {/* Filter + view toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <Filter size={14} className="text-muted-foreground flex-shrink-0" />
        <select value={filterChannel} onChange={(e) => setFilterChannel(e.target.value)} className="flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-sm bg-white border border-border text-foreground outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all">
          <option value="">Todos los canales</option>
          <option value="instagram">📸 Instagram</option>
          <option value="facebook">👥 Facebook</option>
          <option value="linkedin">💼 LinkedIn</option>
          <option value="tiktok">🎵 TikTok</option>
          <option value="twitter">𝕏 Twitter</option>
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-sm bg-white border border-border text-foreground outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all">
          <option value="">Todos los estados</option>
          <option value="draft">Borradores</option>
          <option value="approved">Aprobados</option>
          <option value="scheduled">Programados</option>
          <option value="published">Publicados</option>
          <option value="failed">Con error</option>
        </select>
        <span className="text-xs text-muted-foreground">{posts.length} posts</span>

        {/* View mode toggle */}
        <div className="ml-auto flex rounded-lg overflow-hidden border border-border bg-white">
          {([
            { mode: "grid" as const, Icon: LayoutGrid, label: "Grilla" },
            { mode: "list" as const, Icon: List, label: "Lista" },
          ]).map(({ mode, Icon, label }) => (
            <button key={mode} onClick={() => setViewMode(mode)} className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium transition-colors ${viewMode === mode && calendarViewMode !== "week" && calendarViewMode !== "month" ? "text-violet-600 bg-violet-50" : viewMode === mode ? "text-violet-600 bg-violet-50" : "text-muted-foreground hover:text-foreground"}`}
              title={label}><Icon size={13} /></button>
          ))}
          <div className="w-px bg-border" />
          {([
            { mode: "week" as const, icon: <CalendarDays size={13} />, label: "Semana" },
            { mode: "month" as const, icon: <Calendar size={13} />, label: "Mes" },
          ]).map(({ mode, icon, label }) => (
            <button key={mode} onClick={() => setCalendarViewMode(mode)} title={label}
              className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium transition-colors ${"cal_"+calendarViewMode === "cal_"+mode ? "text-blue-600 bg-blue-50" : "text-muted-foreground hover:text-foreground"}`}>
              {icon}<span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Calendar views */}
      {calendarViewMode === "week" && !loading && posts.length > 0 && (
        <WeekCalendar
          posts={posts}
          calendarDate={calendarAnchorDate}
          onNavigate={(delta) => setCalendarAnchorDate(d => { const nd = new Date(d); nd.setDate(nd.getDate() + delta); return nd; })}
          onClickPost={(p) => setViewingPost(p)}
          onClickDay={(date) => { setCalendarClickDate(date); setPanel("generate"); }}
        />
      )}
      {calendarViewMode === "month" && !loading && posts.length > 0 && (
        <MonthCalendar
          posts={posts}
          calendarDate={calendarAnchorDate}
          onNavigate={(delta) => setCalendarAnchorDate(d => { const nd = new Date(d); nd.setMonth(nd.getMonth() + delta); return nd; })}
          onClickPost={(p) => setViewingPost(p)}
          onClickDay={(date) => { setCalendarClickDate(date); setPanel("generate"); }}
        />
      )}

      {/* Grid / List view */}
      {loading ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card p-4 space-y-3">
              <div className="shimmer h-5 w-40 rounded-lg" /><div className="shimmer h-4 w-full rounded-lg" /><div className="shimmer h-4 w-3/4 rounded-lg" /><div className="shimmer h-16 w-full rounded-lg" /><div className="shimmer h-8 w-48 rounded-lg" />
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="card-stripe flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-violet-50 flex items-center justify-center mb-4" style={{ boxShadow: "0 0 0 8px rgba(99,91,255,0.06)" }}>
            <Sparkles size={28} className="text-violet-500" />
          </div>
          <p className="text-lg font-semibold text-foreground mb-1">Sin posts todavía</p>
          <p className="text-sm text-muted-foreground mb-6">Genera tu primer post con IA o crea un calendario completo</p>
          <div className="flex gap-3">
            <button onClick={() => setPanel("generate")} className="btn-primary"><Wand2 size={14} /> Generar post</button>
            <button onClick={() => setPanel("calendar")} className="btn-secondary"><Calendar size={14} /> Calendario IA</button>
          </div>
        </div>
      ) : (
        <AnimatePresence>
          <div className={viewMode === "grid" ? "grid grid-cols-1 xl:grid-cols-2 gap-4" : "space-y-3"}>
            {posts.map((post) => (
              <PostCard key={post.id} post={post} onApprove={() => approvePost(post.id)} onPublish={() => publishPost(post.id)} onSchedule={() => setSchedulingPost(post.id)} onDelete={() => deletePost(post.id)} onCheckVideo={() => checkVideoStatus(post.id)} onEdit={() => setEditingPost(post)} onGenerateImage={() => generatePostImage(post.id)} />
            ))}
          </div>
        </AnimatePresence>
      )}

      {/* Schedule modal */}
      <AnimatePresence>
        {schedulingPost && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 8 }} className="card-stripe w-full max-w-sm overflow-hidden">
              <div className="px-5 py-4" style={{ background: "linear-gradient(135deg, #2563EB, #4F46E5)" }}>
                <div className="flex items-center gap-2"><Clock size={16} className="text-white" /><span className="text-sm font-semibold text-white">Programar publicación</span></div>
              </div>
              <div className="p-5">
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Fecha y hora</label>
                <input type="datetime-local" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} className="w-full px-3 py-2 rounded-xl text-sm bg-white border border-border text-foreground outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all mb-4" />
                <div className="flex gap-2">
                  <button onClick={schedulePost} disabled={!scheduleDate} className="flex-1 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all" style={{ background: "linear-gradient(135deg, #2563EB, #4F46E5)" }}>Programar</button>
                  <button onClick={() => { setSchedulingPost(null); setScheduleDate(""); }} className="flex-1 btn-secondary py-2">Cancelar</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit post modal */}
      <AnimatePresence>
        {editingPost && (
          <EditPostModal post={editingPost} token={token ?? ""} onClose={() => setEditingPost(null)} onSaved={handlePostSaved}
            onPublish={() => publishPost(editingPost.id)}
            onSchedule={() => { setSchedulingPost(editingPost.id); setEditingPost(null); }} />
        )}
      </AnimatePresence>
      </>}

      {/* View post modal (from calendar click) */}
      <AnimatePresence>
        {viewingPost && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setViewingPost(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 8 }} className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-white/80 uppercase tracking-wide">Vista previa</span>
                <button onClick={() => setViewingPost(null)} className="text-white/60 hover:text-white transition-colors bg-white/10 rounded-lg p-1"><X size={14} /></button>
              </div>
              <PostCard
                post={viewingPost}
                onApprove={() => { approvePost(viewingPost.id); setViewingPost(null); }}
                onPublish={() => { publishPost(viewingPost.id); setViewingPost(null); }}
                onSchedule={() => { setSchedulingPost(viewingPost.id); setViewingPost(null); }}
                onDelete={() => { deletePost(viewingPost.id); setViewingPost(null); }}
                onCheckVideo={() => checkVideoStatus(viewingPost.id)}
                onEdit={() => { setEditingPost(viewingPost); setViewingPost(null); }}
                onGenerateImage={() => { generatePostImage(viewingPost.id); setViewingPost(null); }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
