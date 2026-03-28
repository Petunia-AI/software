"use client";

import { useState, useRef, useEffect } from "react";
import { usePlan } from "@/hooks/use-plan";
import { EnterpriseGate } from "@/components/ui/enterprise-gate";
import {
  Sparkles,
  Download,
  Loader2,
  Camera,
  Film,
  User,
  RefreshCw,
  AlertCircle,
  Upload,
  X,
  Wand2,
  ExternalLink,
  CheckCircle2,
  Mic,
  Play,
  Settings2,
  Save,
  Trash2,
  BookMarked,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

const VOICE_PRESETS = [
  { label: "Profesional y confiado", value: "Confident professional voice" },
  { label: "Carismatico y cercano", value: "Warm, friendly and approachable voice" },
  { label: "Energetico y dinamico", value: "Energetic and dynamic voice" },
  { label: "Elegante y sofisticado", value: "Elegant, sophisticated voice with authority" },
  { label: "Jovial y entusiasta", value: "Enthusiastic and upbeat voice" },
  { label: "Serio y ejecutivo", value: "Serious, authoritative executive voice" },
];

interface SavedAvatarItem {
  id: string;
  name: string;
  videoUrl: string;
  thumbnailUrl: string | null;
  sourceImageUrl: string | null;
  script: string | null;
  voiceDescription: string | null;
  resolution: string | null;
  createdAt: string;
}

export default function AvatarPage() {
  const { isEnterprise, loading: planLoading } = usePlan();
  const [imageUrl, setImageUrl] = useState("");
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadMode, setUploadMode] = useState<"url" | "file">("url");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [script, setScript] = useState("");
  const [scriptGenerating, setScriptGenerating] = useState(false);

  const [voiceDescription, setVoiceDescription] = useState("");
  const [resolution, setResolution] = useState<"480p" | "720p">("480p");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [generating, setGenerating] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [status, setStatus] = useState<"idle" | "generating" | "completed" | "failed">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  // Saved avatars
  const [savedAvatars, setSavedAvatars] = useState<SavedAvatarItem[]>([]);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveName, setSaveName] = useState("");

  const loadSavedAvatars = () => {
    fetch("/api/ai/avatars")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setSavedAvatars(data); })
      .catch(() => {});
  };

  useEffect(() => {
    loadSavedAvatars();
  }, []);

  const handleSaveAvatar = async () => {
    if (!saveName.trim()) { toast.error("Agrega un nombre para el avatar"); return; }
    setSavingAvatar(true);
    try {
      const res = await fetch("/api/ai/avatars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: saveName.trim(),
          videoUrl,
          sourceImageUrl: imageUrl || undefined,
          script: script || undefined,
          voiceDescription: voiceDescription || undefined,
          resolution,
        }),
      });
      const data = await res.json();
      if (res.ok && data.id) {
        toast.success("Avatar guardado correctamente");
        setShowSaveDialog(false);
        setSaveName("");
        loadSavedAvatars();
      } else {
        toast.error(data.error || "Error al guardar");
      }
    } catch {
      toast.error("Error de conexion");
    }
    setSavingAvatar(false);
  };

  const handleDeleteAvatar = async (id: string) => {
    try {
      await fetch(`/api/ai/avatars?id=${id}`, { method: "DELETE" });
      setSavedAvatars((prev) => prev.filter((a) => a.id !== id));
      toast.success("Avatar eliminado");
    } catch {
      toast.error("Error al eliminar");
    }
  };

  const handleFileSelect = (file: File) => {
    const valid = ["image/jpeg", "image/png", "image/webp"];
    if (!valid.includes(file.type)) { toast.error("Solo JPG, PNG o WebP"); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("Maximo 10 MB"); return; }
    setUploading(true);
    const preview = URL.createObjectURL(file);
    setUploadPreview(preview);
    const reader = new FileReader();
    reader.onload = (e) => {
      setImageUrl(e.target?.result as string);
      setUploading(false);
    };
    reader.onerror = () => { toast.error("Error leyendo el archivo"); setUploading(false); };
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setImageUrl("");
    setUploadPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleGenerateScript = async () => {
    setScriptGenerating(true);
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "REEL",
          platform: "INSTAGRAM",
          tone: "profesional",
          provider: "claude",
          customPrompt:
            "Genera un guion de voz corto (25-35 segundos, maximo 70 palabras) para un agente inmobiliario presentando una propiedad de lujo. Directo, persuasivo y profesional. Termina con un call-to-action claro. Devuelve UNICAMENTE el texto que dira el agente, sin indicaciones de escena ni etiquetas.",
        }),
      });
      const data = await res.json();
      if (res.ok && data.content) {
        setScript(data.content);
        toast.success("Guion generado");
      } else {
        toast.error("No se pudo generar el guion");
      }
    } catch {
      toast.error("Error de conexion");
    }
    setScriptGenerating(false);
  };

  const handleGenerate = async () => {
    const finalImage = imageUrl.trim();
    if (!finalImage) { toast.error("Agrega la foto del avatar primero"); return; }
    if (!script.trim()) { toast.error("Escribe el guion que dira el avatar"); return; }

    setGenerating(true);
    setStatus("generating");
    setVideoUrl("");
    setErrorMsg("");

    try {
      const res = await fetch("/api/ai/ai-avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: finalImage,
          textInput: script,
          voiceDescription: voiceDescription.trim() || undefined,
          resolution,
        }),
      });
      const data = await res.json();
      if (res.ok && data.videoUrl) {
        setVideoUrl(data.videoUrl);
        setStatus("completed");
        toast.success("Video avatar generado con VEED Fabric 1.0!");
      } else {
        setStatus("failed");
        setErrorMsg(data.error || "Error desconocido");
        toast.error(data.error || "Error generando el video");
      }
    } catch {
      setStatus("failed");
      setErrorMsg("Error de conexion");
      toast.error("Error de conexion");
    }
    setGenerating(false);
  };

  const previewImageSrc = uploadPreview || (imageUrl.startsWith("http") ? imageUrl : null);

  if (!planLoading && !isEnterprise) {
    return <EnterpriseGate feature="Avatar IA" description="Generate AI-powered video avatars to present your properties professionally. Available exclusively on the Enterprise plan." />;
  }

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div
        className="relative overflow-hidden rounded-2xl p-8 text-white"
        style={{ background: "linear-gradient(135deg, #4A154B 0%, #350d36 60%, #1a0a1a 100%)" }}
      >
        <div
          className="absolute inset-0 opacity-50"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Ccircle cx='30' cy='30' r='10'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }}
        />
        <div className="relative flex items-start justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-white/10 backdrop-blur-sm">
                <Camera className="h-5 w-5" />
              </div>
              <Badge className="bg-white/10 text-white/80 border-white/10 text-[10px] font-medium backdrop-blur-sm">
                VEED Fabric 1.0
              </Badge>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Avatar IA</h1>
            <p className="text-white/70 text-sm max-w-md">
              Sube una foto, escribe el guion y elige la voz. La IA genera un video donde esa persona habla con lip-sync perfecto.
            </p>
          </div>
          <div className="hidden lg:flex flex-col gap-2 text-right shrink-0">
            {[
              { emoji: "📸", text: "Cualquier foto de rostro" },
              { emoji: "✍️", text: "Guion generado por Claude" },
              { emoji: "🎙️", text: "Voz auto-detectada por IA" },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-2 justify-end text-white/60 text-xs">
                <span>{item.text}</span>
                <span>{item.emoji}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* LEFT: Config */}
        <div className="lg:col-span-5 space-y-4">

          {/* Step 1: Image */}
          <div
            className="rounded-2xl p-5 space-y-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
            style={{ border: "1.5px solid transparent", background: "linear-gradient(#fff, #fff) padding-box, linear-gradient(135deg, #9B3FCB 0%, #4A154B 50%, #611f69 100%) border-box" }}
          >
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg gold-gradient flex items-center justify-center text-white text-xs font-bold">1</div>
              <h3 className="text-sm font-semibold">Foto del avatar</h3>
              <span className="text-[10px] text-muted-foreground ml-auto">Rostro frontal, buena iluminacion</span>
            </div>

            <div className="flex gap-1 p-1 bg-[#F5EFF5] rounded-xl">
              {(["url", "file"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setUploadMode(m)}
                  className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                    uploadMode === m ? "bg-white text-[#4A154B] shadow-sm" : "text-[#7A7A7A] hover:text-[#4A154B]"
                  }`}
                >
                  {m === "url" ? "🔗 Pegar URL" : "📁 Subir archivo"}
                </button>
              ))}
            </div>

            {uploadMode === "url" ? (
              <Input
                value={imageUrl.startsWith("data:") ? "" : imageUrl}
                onChange={(e) => { setImageUrl(e.target.value); setUploadPreview(null); }}
                placeholder="https://... URL publica de la imagen con rostro"
                className="h-9 rounded-xl bg-white border border-[#E0E0E0] focus-visible:ring-1 focus-visible:ring-[#4A154B]/30 text-sm placeholder:text-[#AAAAAA]"
              />
            ) : (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }}
                />
                {!uploadPreview && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleFileSelect(f); }}
                    className="w-full h-24 rounded-xl border-2 border-dashed border-[#C4A0D4] bg-[#FAF5FA] hover:bg-[#F5EFF5] hover:border-[#4A154B] transition-all flex flex-col items-center justify-center gap-2 cursor-pointer"
                  >
                    {uploading ? (
                      <Loader2 className="h-5 w-5 animate-spin text-[#4A154B]" />
                    ) : (
                      <>
                        <Upload className="h-5 w-5 text-[#4A154B]/50" />
                        <p className="text-xs text-muted-foreground">JPG, PNG, WebP max 10 MB</p>
                      </>
                    )}
                  </button>
                )}
              </>
            )}

            {previewImageSrc && (
              <div className="relative rounded-xl overflow-hidden bg-[#F5EFF5] aspect-square max-h-48 mx-auto">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewImageSrc}
                  alt="Avatar preview"
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.3"; }}
                />
                <button
                  onClick={clearImage}
                  className="absolute top-2 right-2 h-6 w-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
                <Badge className="absolute bottom-2 left-2 bg-emerald-500/90 text-white text-[10px] border-0">
                  <CheckCircle2 className="h-2.5 w-2.5 mr-1" />Foto lista
                </Badge>
              </div>
            )}
          </div>

          {/* Step 2: Script */}
          <div
            className="rounded-2xl p-5 space-y-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
            style={{ border: "1.5px solid transparent", background: "linear-gradient(#fff, #fff) padding-box, linear-gradient(135deg, #9B3FCB 0%, #4A154B 50%, #611f69 100%) border-box" }}
          >
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg gold-gradient flex items-center justify-center text-white text-xs font-bold">2</div>
              <h3 className="text-sm font-semibold">Guion</h3>
              <span className="text-[10px] text-muted-foreground ml-auto">30-60 seg recomendado</span>
            </div>

            <Textarea
              value={script}
              onChange={(e) => setScript(e.target.value)}
              placeholder="Escribe aqui lo que dira el avatar. Ej: Hola, soy Maria Lopez de Petunia Realty. Hoy les presento esta increible propiedad en el corazon de Miami..."
              rows={5}
              className="rounded-xl bg-white border border-[#E0E0E0] focus-visible:ring-1 focus-visible:ring-[#4A154B]/30 text-sm placeholder:text-[#AAAAAA] resize-none leading-relaxed"
            />

            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">
                {script.length} caracteres &middot; ~{Math.max(1, Math.ceil(script.split(" ").filter(Boolean).length / 2.5))}s
              </span>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl h-8 text-xs border-[#C4A0D4] text-[#4A154B] hover:bg-[#FAF5FA] hover:border-[#4A154B]"
                disabled={scriptGenerating}
                onClick={handleGenerateScript}
              >
                {scriptGenerating ? (
                  <><Loader2 className="h-3 w-3 mr-1.5 animate-spin" />Generando...</>
                ) : (
                  <><Wand2 className="h-3 w-3 mr-1.5" />Generar con Claude</>
                )}
              </Button>
            </div>
          </div>

          {/* Step 3: Voice description */}
          <div
            className="rounded-2xl p-5 space-y-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
            style={{ border: "1.5px solid transparent", background: "linear-gradient(#fff, #fff) padding-box, linear-gradient(135deg, #9B3FCB 0%, #4A154B 50%, #611f69 100%) border-box" }}
          >
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg gold-gradient flex items-center justify-center text-white text-xs font-bold">3</div>
              <h3 className="text-sm font-semibold">Estilo de voz</h3>
              <Badge className="text-[10px] bg-[#F5EFF5] text-[#4A154B] border-[#C4A0D4] ml-auto">Opcional</Badge>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              VEED Fabric analiza la foto y genera la voz automaticamente. Puedes indicar un estilo adicional para ajustarla.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {VOICE_PRESETS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setVoiceDescription(voiceDescription === p.value ? "" : p.value)}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all border ${
                    voiceDescription === p.value
                      ? "border-[#4A154B] bg-[#F5EFF5] text-[#4A154B]"
                      : "border-[#E0E0E0] bg-white text-[#7A7A7A] hover:border-[#C4A0D4] hover:text-[#4A154B]"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <Input
              value={voiceDescription}
              onChange={(e) => setVoiceDescription(e.target.value)}
              placeholder="Ej: British accent, confident · o deja vacio para auto-detectar"
              className="h-9 rounded-xl bg-white border border-[#E0E0E0] focus-visible:ring-1 focus-visible:ring-[#4A154B]/30 text-xs placeholder:text-[#AAAAAA]"
            />
          </div>

          {/* Step 4: Advanced */}
          <div
            className="rounded-2xl p-5 space-y-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
            style={{ border: "1.5px solid transparent", background: "linear-gradient(#fff, #fff) padding-box, linear-gradient(135deg, #9B3FCB 0%, #4A154B 50%, #611f69 100%) border-box" }}
          >
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center justify-between w-full"
            >
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-[#EEE8EE] flex items-center justify-center text-[#7A7A7A] text-xs font-bold">4</div>
                <h3 className="text-sm font-semibold">Configuracion avanzada</h3>
                <Badge className="text-[10px] bg-[#F5EFF5] text-[#4A154B] border-[#C4A0D4]">Opcional</Badge>
              </div>
              <Settings2 className={`h-4 w-4 text-muted-foreground transition-transform ${showAdvanced ? "rotate-90" : ""}`} />
            </button>

            {showAdvanced && (
              <div className="space-y-4 pt-1">
                <div>
                  <Label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Resolucion</Label>
                  <div className="grid grid-cols-2 gap-2 mt-1.5">
                    {([
                      { v: "480p" as const, label: "480p", desc: "Rapido - Redes sociales" },
                      { v: "720p" as const, label: "720p HD", desc: "Alta calidad - Mas lento" },
                    ]).map((r) => (
                      <button
                        key={r.v}
                        onClick={() => setResolution(r.v)}
                        className={`p-3 rounded-xl text-left border-2 transition-all ${
                          resolution === r.v
                            ? "border-[#4A154B] bg-[#F5EFF5] text-[#4A154B]"
                            : "border-[#C4A0D4] bg-white text-[#1D1C1D] hover:border-[#4A154B]"
                        }`}
                      >
                        <p className="text-xs font-bold">{r.label}</p>
                        <p className="text-[10px] mt-0.5 opacity-60">{r.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>


              </div>
            )}
          </div>

          {/* Generate Button */}
          <Button
            onClick={handleGenerate}
            disabled={generating || !imageUrl.trim() || !script.trim()}
            className="w-full gold-gradient text-white rounded-2xl h-14 font-bold border-0 hover:opacity-90 transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          >
            {generating ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generando video avatar...</>
            ) : (
              <><Mic className="h-4 w-4 mr-2" />Generar Video Avatar con FAL AI</>
            )}
          </Button>
          <p className="text-center text-[10px] text-muted-foreground">
            VEED Fabric 1.0 - Lip-sync automatico - 2-4 min segun duracion
          </p>
        </div>

        {/* RIGHT: Result */}
        <div className="lg:col-span-7 space-y-4">

          {/* Idle */}
          {status === "idle" && (
            <div
              className="rounded-2xl p-6 space-y-5 shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
              style={{ border: "1.5px solid transparent", background: "linear-gradient(#fff, #fff) padding-box, linear-gradient(135deg, #9B3FCB 0%, #4A154B 50%, #611f69 100%) border-box" }}
            >
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#4A154B]" />
                Como funciona
              </h3>
              <div className="space-y-4">
                {[
                  { icon: "📸", title: "Foto de rostro", desc: "Sube o pega la URL de cualquier foto con rostro visible. Funciona con fotos reales o avatares generados con IA." },
                  { icon: "✍️", title: "Guion de texto", desc: "Escribe lo que dira el avatar o usa Claude para generarlo automaticamente. Recomendado: 30-60 segundos." },
                  { icon: "🎙️", title: "Voz automatica con lip-sync", desc: "VEED Fabric analiza la foto y genera la voz automaticamente. Puedes ajustarla con un descriptor de estilo opcional." },
                  { icon: "🎬", title: "Video listo en minutos", desc: "Obtienes un MP4 listo para Reels, TikTok, historias o presentaciones de propiedades." },
                ].map((step) => (
                  <div key={step.title} className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-2xl bg-[#F5EFF5] border border-[#C4A0D4]/40 flex items-center justify-center text-xl shrink-0">
                      {step.icon}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{step.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="p-5 rounded-3xl bg-[#F5EFF5] mb-4 relative">
                  <User className="h-12 w-12 text-[#4A154B]/20" />
                  <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-[#4A154B]/10 flex items-center justify-center">
                    <Mic className="h-3 w-3 text-[#4A154B]/40" />
                  </div>
                </div>
                <p className="text-sm font-semibold text-muted-foreground">Configura y genera tu primer video avatar</p>
                <p className="text-xs text-muted-foreground mt-1">El resultado aparecera aqui</p>
              </div>
            </div>
          )}

          {/* Generating */}
          {status === "generating" && (
            <div
              className="rounded-2xl p-10 flex flex-col items-center justify-center gap-5 min-h-[400px] shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
              style={{ border: "1.5px solid transparent", background: "linear-gradient(#fff, #fff) padding-box, linear-gradient(135deg, #9B3FCB 0%, #4A154B 50%, #611f69 100%) border-box" }}
            >
              <div className="relative w-20 h-20">
                <div className="absolute inset-0 rounded-full border-4 border-[#C4A0D4] border-t-[#4A154B] animate-spin" />
                <div className="absolute inset-3 rounded-full border-2 border-[#C4A0D4]/40 border-t-[#9B3FCB]/60 animate-spin" style={{ animationDirection: "reverse", animationDuration: "1.5s" }} />
                <Film className="absolute inset-0 m-auto h-7 w-7 text-[#4A154B]" />
              </div>
              <div className="text-center space-y-1.5">
                <p className="text-base font-bold text-[#4A154B]">Generando video avatar...</p>
                <p className="text-xs text-muted-foreground">VEED Fabric 1.0 analiza la foto y sincroniza lip-sync automaticamente</p>
              </div>
              <div className="w-full max-w-xs space-y-2">
                {[
                  { label: "Analizando foto del avatar", done: true },
                  { label: "Generando voz a partir del texto", done: true },
                  { label: "VEED Fabric: renderizando lip-sync", done: false },
                ].map((step) => (
                  <div key={step.label} className="flex items-center gap-3">
                    <div className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 ${step.done ? "bg-emerald-100" : "bg-[#F5EFF5] animate-pulse"}`}>
                      {step.done ? (
                        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                      ) : (
                        <Loader2 className="h-3 w-3 text-[#4A154B] animate-spin" />
                      )}
                    </div>
                    <p className={`text-xs ${step.done ? "text-foreground" : "text-muted-foreground"}`}>{step.label}</p>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground">Aproximadamente 2-4 minutos segun la duracion del guion</p>
            </div>
          )}

          {/* Failed */}
          {status === "failed" && !generating && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 space-y-3">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-800">Error generando el video</p>
                  <p className="text-xs text-red-600 mt-0.5 leading-relaxed">
                    {errorMsg || "Verifica que FAL_API_KEY tenga saldo y que la imagen sea accesible publicamente."}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl border-red-200 text-red-700 hover:bg-red-100"
                onClick={() => setStatus("idle")}
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />Intentar de nuevo
              </Button>
            </div>
          )}

          {/* Completed */}
          {status === "completed" && videoUrl && (
            <div className="space-y-4">
              <div className="rounded-2xl overflow-hidden bg-black aspect-video shadow-xl">
                <video src={videoUrl} controls autoPlay loop className="w-full h-full object-contain" />
              </div>

              <div className="flex gap-2">
                <Button
                  className="flex-1 gold-gradient text-white rounded-2xl h-11 font-bold border-0 hover:opacity-90 shadow-lg"
                  onClick={() => {
                    const a = document.createElement("a");
                    a.href = videoUrl;
                    a.download = `petunia-avatar-${Date.now()}.mp4`;
                    a.target = "_blank";
                    a.click();
                    toast.success("Descargando video...");
                  }}
                >
                  <Download className="h-4 w-4 mr-1.5" />Descargar MP4
                </Button>
                <Button
                  variant="outline"
                  className="rounded-2xl h-11 border-[#C4A0D4] text-[#4A154B] hover:bg-[#FAF5FA] px-4"
                  onClick={() => window.open(videoUrl, "_blank")}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>

              <Button
                variant="ghost"
                className="w-full rounded-2xl h-10 text-sm text-[#4A154B] hover:bg-[#FAF5FA]"
                onClick={() => { setStatus("idle"); setVideoUrl(""); }}
              >
                <RefreshCw className="h-3.5 w-3.5 mr-2" />Generar otro video
              </Button>

              {/* Save dialog */}
              {showSaveDialog ? (
                <div className="rounded-2xl border border-[#C4A0D4] bg-[#F5EFF5] p-4 space-y-3">
                  <p className="text-sm font-semibold text-[#4A154B]">Guardar avatar</p>
                  <input
                    autoFocus
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleSaveAvatar(); if (e.key === "Escape") setShowSaveDialog(false); }}
                    placeholder={`Avatar ${new Date().toLocaleDateString("es", { day: "2-digit", month: "short" })}`}
                    className="w-full h-9 px-3 text-sm rounded-xl border border-[#C4A0D4] bg-white focus:outline-none focus:ring-1 focus:ring-[#4A154B]/30"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1 gold-gradient text-white rounded-xl border-0 h-9 font-bold hover:opacity-90"
                      disabled={savingAvatar}
                      onClick={handleSaveAvatar}
                    >
                      {savingAvatar ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Save className="h-3.5 w-3.5 mr-1.5" />Guardar</>}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-xl h-9 border-[#C4A0D4] text-[#4A154B] hover:bg-white"
                      onClick={() => { setShowSaveDialog(false); setSaveName(""); }}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  className="w-full rounded-2xl h-10 border-[#C4A0D4] text-[#4A154B] hover:bg-[#FAF5FA] font-semibold"
                  onClick={() => { setSaveName(`Avatar ${new Date().toLocaleDateString("es", { day: "2-digit", month: "short", year: "numeric" })}`); setShowSaveDialog(true); }}
                >
                  <Save className="h-4 w-4 mr-1.5" />Guardar avatar
                </Button>
              )}

              <div className="flex items-start gap-3 p-4 rounded-2xl bg-[#F5EFF5] border border-[#C4A0D4]">
                <div className="p-2 rounded-xl bg-[#4A154B]/10 shrink-0">
                  <Play className="h-4 w-4 text-[#4A154B]" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#1D1C1D]">Combina con Video IA</p>
                  <p className="text-[11px] text-[#616061] leading-relaxed mt-0.5">
                    Guarda el avatar y luego seleccionalo en la pestana <strong>Contenido IA &rarr; Video IA &rarr; Avatares</strong> para usarlo como imagen base.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Saved Avatars Gallery */}
      {savedAvatars.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <BookMarked className="h-4 w-4 text-[#4A154B]" />
            <h2 className="text-sm font-semibold">Mis avatares guardados</h2>
            <Badge className="bg-[#F5EFF5] text-[#4A154B] border-[#C4A0D4] text-[10px]">{savedAvatars.length}</Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {savedAvatars.map((avatar) => (
              <div
                key={avatar.id}
                className="rounded-2xl overflow-hidden bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-[#EEE8EE] group"
              >
                <div className="relative aspect-video bg-black">
                  <video
                    src={avatar.videoUrl}
                    className="w-full h-full object-contain"
                    muted
                    loop
                    playsInline
                    onMouseEnter={(e) => (e.target as HTMLVideoElement).play()}
                    onMouseLeave={(e) => { const v = e.target as HTMLVideoElement; v.pause(); v.currentTime = 0; }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="h-10 w-10 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center">
                      <Play className="h-4 w-4 text-[#4A154B] ml-0.5" />
                    </div>
                  </div>
                  <Badge className="absolute top-2 left-2 bg-black/50 text-white text-[9px] border-0 backdrop-blur-sm">
                    {avatar.resolution || "480p"}
                  </Badge>
                  <button
                    onClick={() => handleDeleteAvatar(avatar.id)}
                    className="absolute top-2 right-2 h-6 w-6 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600/80"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
                <div className="p-3 space-y-2">
                  <p className="text-xs font-semibold truncate text-[#1D1C1D]">{avatar.name}</p>
                  {avatar.script && (
                    <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">{avatar.script}</p>
                  )}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[9px] text-muted-foreground">
                      {new Date(avatar.createdAt).toLocaleDateString("es", { day: "2-digit", month: "short", year: "numeric" })}
                    </span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => window.open(avatar.videoUrl, "_blank")}
                        className="h-6 w-6 rounded-lg bg-[#F5EFF5] text-[#4A154B] flex items-center justify-center hover:bg-[#EEE8EE] transition-colors"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => {
                          const a = document.createElement("a");
                          a.href = avatar.videoUrl;
                          a.download = `${avatar.name.replace(/\s+/g, "-")}.mp4`;
                          a.target = "_blank";
                          a.click();
                        }}
                        className="h-6 w-6 rounded-lg bg-[#F5EFF5] text-[#4A154B] flex items-center justify-center hover:bg-[#EEE8EE] transition-colors"
                      >
                        <Download className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
