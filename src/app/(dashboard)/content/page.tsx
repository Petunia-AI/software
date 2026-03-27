"use client";

import { useEffect, useState } from "react";
import {
  Sparkles,
  Copy,
  RefreshCw,
  Instagram,
  Facebook,
  Send,
  MessageCircle,
  Mail,
  Linkedin,
  Wand2,
  FileText,
  Image,
  Image as ImageIcon,
  Film,
  LayoutGrid,
  Loader2,
  Save,
  Video,
  Camera,
  Play,
  Download,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Paintbrush,
  User,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

const contentTypes = [
  { value: "POST", label: "Publicación", icon: FileText },
  { value: "STORY", label: "Historia", icon: Image },
  { value: "REEL", label: "Reel / Video", icon: Film },
  { value: "CAROUSEL", label: "Carrusel", icon: LayoutGrid },
  { value: "WHATSAPP", label: "WhatsApp", icon: MessageCircle },
  { value: "EMAIL", label: "Email", icon: Mail },
];

const platformsList = [
  { value: "INSTAGRAM", label: "Instagram", icon: Instagram },
  { value: "FACEBOOK", label: "Facebook", icon: Facebook },
  { value: "TIKTOK", label: "TikTok", icon: Send },
  { value: "WHATSAPP", label: "WhatsApp", icon: MessageCircle },
  { value: "EMAIL", label: "Email", icon: Mail },
  { value: "LINKEDIN", label: "LinkedIn", icon: Linkedin },
];

const tones = [
  { value: "profesional", label: "Profesional" },
  { value: "cercano", label: "Cercano y amigable" },
  { value: "lujo", label: "Lujo y exclusividad" },
  { value: "urgente", label: "Urgente / Escasez" },
  { value: "informativo", label: "Informativo" },
  { value: "persuasivo", label: "Persuasivo" },
];

interface SimpleProperty {
  id: string;
  title: string;
  images?: string[];
}

interface ContentPost {
  id: string;
  title: string | null;
  content: string | null;
  type: string;
  platform: string;
  status: string;
  createdAt: string;
  mediaUrls?: string[] | null;
  property?: { title: string } | null;
}

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

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  SCHEDULED: "bg-blue-100 text-blue-700",
  PUBLISHED: "bg-green-100 text-green-700",
};

const statusLabels: Record<string, string> = {
  DRAFT: "Borrador",
  SCHEDULED: "Programado",
  PUBLISHED: "Publicado",
};

interface CarouselSlide {
  slideNumber: number;
  type: string;
  headline: string;
  body: string;
  cta?: string | null;
  imageBrief: string;
  imageStyle: string;
  imageUrl?: string;
  imageLoading?: boolean;
}

export default function ContentPage() {
  const [selectedType, setSelectedType] = useState("POST");
  const [selectedPlatform, setSelectedPlatform] = useState("INSTAGRAM");
  const [selectedTone, setSelectedTone] = useState("profesional");
  const [selectedProperty, setSelectedProperty] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [generatedContent, setGeneratedContent] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [provider, setProvider] = useState<"claude" | "openai">("claude");
  const [properties, setProperties] = useState<SimpleProperty[]>([]);
  const [history, setHistory] = useState<ContentPost[]>([]);
  const [savingContent, setSavingContent] = useState(false);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<ContentPost | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState("");
  const [previewImageLoading, setPreviewImageLoading] = useState(false);

  // Carousel state
  const [carouselSlides, setCarouselSlides] = useState<CarouselSlide[]>([]);
  const [carouselActiveSlide, setCarouselActiveSlide] = useState(0);
  const [carouselStrategy, setCarouselStrategy] = useState("");

  // Marketing image overlay data (user-provided)
  const [imgPrice, setImgPrice] = useState("");
  const [imgArea, setImgArea] = useState("");
  const [imgBedrooms, setImgBedrooms] = useState("");
  const [imgBathrooms, setImgBathrooms] = useState("");
  const [imgLocation, setImgLocation] = useState("");
  const [imgTagline, setImgTagline] = useState("");

  // Image AI state
  const [imageBrief, setImageBrief] = useState("");
  const [imageStyle, setImageStyle] = useState("luxury real estate, cinematic");
  const [imageGenerating, setImageGenerating] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState("");
  const [imageOptimizedPrompt, setImageOptimizedPrompt] = useState("");
  const [imageError, setImageError] = useState("");
  const [imageRequiresKey, setImageRequiresKey] = useState(false);

  const handleGenerateImage = async () => {
    if (!imageBrief.trim()) return;
    setImageGenerating(true);
    setImageError("");
    setGeneratedImageUrl("");
    setImageOptimizedPrompt("");
    setImageRequiresKey(false);
    try {
      const res = await fetch("/api/ai/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief: imageBrief, style: imageStyle }),
      });
      const data = await res.json();
      if (res.status === 402) {
        setImageOptimizedPrompt(data.optimizedPrompt || "");
        setImageRequiresKey(true);
        setImageError("Agrega tu FAL_API_KEY en .env.local para generar la imagen.");
        toast.info("Prompt optimizado listo — falta configurar FAL_API_KEY");
      } else if (!res.ok) {
        setImageError(data.error || "Error al generar imagen");
        toast.error(data.error || "Error al generar imagen");
      } else {
        setGeneratedImageUrl(data.imageUrl);
        setImageOptimizedPrompt(data.optimizedPrompt || "");
        toast.success("Imagen generada con Flux 1.1 Pro Ultra");
      }
    } catch {
      setImageError("Error de conexión");
      toast.error("Error de conexión");
    }
    setImageGenerating(false);
  };

  // Video AI state
  const [videoProperty, setVideoProperty] = useState("");
  const [videoPropertyTitle, setVideoPropertyTitle] = useState("");
  const [videoPropertyDesc, setVideoPropertyDesc] = useState("");
  const [videoPropertyPrice, setVideoPropertyPrice] = useState("");
  const [videoPropertyCity, setVideoPropertyCity] = useState("");
  const [videoType, setVideoType] = useState<"reel" | "story">("reel");
  const [videoAvatarUrl, setVideoAvatarUrl] = useState("");
  const [videoGenerating, setVideoGenerating] = useState(false);
  const [videoScript, setVideoScript] = useState("");
  const [videoId, setVideoId] = useState("");
  const [videoStatus, setVideoStatus] = useState<"idle" | "generating" | "processing" | "completed" | "failed">("idle");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoThumbnail, setVideoThumbnail] = useState("");
  const [avatarGallery, setAvatarGallery] = useState<string[]>([]);
  const [videoVoices, setVideoVoices] = useState<{ voice_id: string; name: string; gender: string }[]>([]);
  const [selectedVoiceId, setSelectedVoiceId] = useState("");
  const [loadingVoices, setLoadingVoices] = useState(false);

  // Kling image-to-video state
  const [klingSourceImageUrl, setKlingSourceImageUrl] = useState("");
  const [klingImageGenerating, setKlingImageGenerating] = useState(false);
  const [klingVideoUrl, setKlingVideoUrl] = useState("");
  const [klingVideoGenerating, setKlingVideoGenerating] = useState(false);
  const [klingVideoStatus, setKlingVideoStatus] = useState<"idle" | "generating" | "completed" | "failed">("idle");
  const [klingMotionPrompt, setKlingMotionPrompt] = useState("");
  const [klingDuration, setKlingDuration] = useState<"5" | "10">("5");
  const [klingAspectRatio, setKlingAspectRatio] = useState<"reel" | "landscape">("reel");
  const [klingCustomPrompt, setKlingCustomPrompt] = useState("");
  const [klingPromptGenerating, setKlingPromptGenerating] = useState(false);
  const [useAvatarOverlay, setUseAvatarOverlay] = useState(false);
  const [klingImagePickerTab, setKlingImagePickerTab] = useState<"flux" | "properties" | "history">("flux");

  // Avatar video generated alongside Kling (video pack)
  const [klingAvatarVideoUrl, setKlingAvatarVideoUrl] = useState("");
  const [klingAvatarVideoGenerating, setKlingAvatarVideoGenerating] = useState(false);
  const [klingAvatarScript, setKlingAvatarScript] = useState("");

  // Saved avatars for Kling picker
  const [klingAvatarList, setKlingAvatarList] = useState<SavedAvatarItem[]>([]);

  useEffect(() => {
    fetch("/api/properties")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setProperties(data.map((p: any) => ({ id: p.id, title: p.title, images: Array.isArray(p.images) ? p.images : [] })));
      })
      .catch(() => {});

    loadHistory();

    fetch("/api/ai/avatars")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setKlingAvatarList(data); })
      .catch(() => {});
  }, []);

  const loadHistory = () => {
    fetch("/api/content")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setHistory(data);
      })
      .catch(() => {});
  };

  const generateDemoContent = () => {
    const property = properties.find((p) => p.id === selectedProperty);
    const propName = property?.title || "nuestra propiedad destacada";

    const templates: Record<string, string> = {
      POST: `✨ ${propName}\n\nDescubre un espacio que redefine el concepto de vivir bien. Ubicación privilegiada, acabados de primera y amenidades que elevan tu estilo de vida.\n\n🏠 Características premium\n📍 Ubicación estratégica\n💎 Acabados de lujo\n\n¿Te gustaría conocerla? Envíanos un mensaje directo.\n\n#BienesRaíces #Inmobiliaria #PetuniaAI #LuxuryRealEstate`,
      STORY: `🏡 ¡Nueva propiedad disponible!\n\n${propName}\n\nDesliza para ver más detalles →\n\n💬 Escríbenos para agendar tu visita`,
      REEL: `🎬 GUIÓN PARA REEL\n\n[Toma 1 - Exterior]\n"Bienvenidos a ${propName}"\n\n[Toma 2 - Interior]\n"Miren estos acabados increíbles..."\n\n[Toma 3 - Amenidades]\n"Y lo mejor: las amenidades"\n\n[Toma 4 - CTA]\n"¿Te interesa? Link en bio"\n\n🎵 Audio sugerido: tendencia actual\n⏱ Duración: 15-30 segundos`,
      CAROUSEL: `📱 CARRUSEL — ${propName}\n\n[Slide 1] Portada llamativa\n"El hogar que estabas buscando"\n\n[Slide 2] Ubicación\n"En la mejor zona de la ciudad"\n\n[Slide 3] Características\n"3 recámaras | 2 baños | Estacionamiento"\n\n[Slide 4] Amenidades\n"Gym, alberca, rooftop y más"\n\n[Slide 5] CTA\n"Agenda tu visita hoy"`,
      WHATSAPP: `¡Hola! 👋\n\nTe comparto información sobre ${propName}.\n\nUbicación privilegiada, acabados de primera calidad y amenidades premium.\n\n¿Te gustaría agendar una visita esta semana?\n\n📞 Llámanos o responde este mensaje.`,
      EMAIL: `Asunto: ${propName} — Oportunidad exclusiva\n\nEstimado/a cliente,\n\nLe presentamos una oportunidad excepcional:\n\n${propName}\n\nDestaca por ubicación privilegiada, acabados de primer nivel y amenidades premium.\n\nCoordinemos una visita privada.\n\nSaludos cordiales,\nEquipo Petunia AI`,
    };

    return templates[selectedType] || templates.POST;
  };

  const generateCarouselImages = async (slides: CarouselSlide[]) => {
    await Promise.all(
      slides.map(async (slide, idx) => {
        try {
          const res = await fetch("/api/ai/image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ brief: slide.imageBrief, style: slide.imageStyle }),
          });
          const data = await res.json();
          setCarouselSlides((prev) =>
            prev.map((s, i) =>
              i === idx ? { ...s, imageUrl: res.ok && data.imageUrl ? data.imageUrl : undefined, imageLoading: false } : s
            )
          );
        } catch {
          setCarouselSlides((prev) =>
            prev.map((s, i) => (i === idx ? { ...s, imageLoading: false } : s))
          );
        }
      })
    );
  };

  const generatePreviewImage = async (content: string) => {
    setPreviewImageLoading(true);
    setPreviewImageUrl("");
    try {
      const property = properties.find((p) => p.id === selectedProperty);
      const propName = property?.title || "";
      const brief = [
        propName && `Propiedad: ${propName}`,
        imgLocation && `Ubicación: ${imgLocation}`,
        imgPrice && `Precio: ${imgPrice}`,
        imgArea && `Superficie: ${imgArea} m²`,
        imgBedrooms && `${imgBedrooms} recámaras`,
        imgBathrooms && `${imgBathrooms} baños`,
        imgTagline && `Mensaje principal: ${imgTagline}`,
        customPrompt && `Contexto adicional: ${customPrompt}`,
        `Plataforma: ${platformsList.find((p) => p.value === selectedPlatform)?.label || selectedPlatform}`,
        `Tono: ${selectedTone}`,
        selectedType === "CAROUSEL" ? "Estilo carrusel inmobiliario, composición amplia" : "",
      ].filter(Boolean).join(". ");

      const styleMap: Record<string, string> = {
        lujo:        "luxury real estate, cinematic golden hour",
        profesional: "professional real estate photography, clean bright daylight",
        cercano:     "warm lifestyle photography, natural light, inviting atmosphere",
        urgente:     "editorial magazine photography, bold dramatic lighting",
        informativo: "modern architecture photography, clean minimalist",
        persuasivo:  "luxury lifestyle photography, aspirational mood",
      };
      const style = styleMap[selectedTone] || "luxury real estate, professional photography";

      const res = await fetch("/api/ai/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief, style }),
      });
      const data = await res.json();
      if (res.ok && data.imageUrl) {
        setPreviewImageUrl(data.imageUrl);
      }
    } catch {
      // silently fail — copy is still shown
    }
    setPreviewImageLoading(false);
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setPreviewImageUrl("");
    setPreviewImageLoading(false);
    setCarouselSlides([]);
    setCarouselActiveSlide(0);
    setCarouselStrategy("");

    // ── CAROUSEL mode ──
    if (selectedType === "CAROUSEL") {
      try {
        const property = properties.find((p) => p.id === selectedProperty);
        const res = await fetch("/api/ai/carousel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            propertyName: property?.title || "",
            price: imgPrice || undefined,
            area: imgArea || undefined,
            bedrooms: imgBedrooms || undefined,
            bathrooms: imgBathrooms || undefined,
            location: imgLocation || undefined,
            tagline: imgTagline || undefined,
            platform: selectedPlatform,
            tone: selectedTone,
            customPrompt: customPrompt || undefined,
            slideCount: 5,
          }),
        });
        const data = await res.json();
        if (res.ok && data.slides?.length) {
          setCarouselStrategy(data.strategy || "");
          const initial: CarouselSlide[] = data.slides.map((s: CarouselSlide) => ({
            ...s,
            imageLoading: true,
            imageUrl: undefined,
          }));
          setCarouselSlides(initial);
          // Save combined text copy
          const fullText = data.slides
            .map((s: CarouselSlide) =>
              `[Slide ${s.slideNumber} — ${s.type}]\n${s.headline}\n${s.body}${s.cta ? `\n→ ${s.cta}` : ""}`
            )
            .join("\n\n");
          setGeneratedContent(fullText);
          toast.success("Estrategia de carrusel creada con IA — generando imágenes...");
          // Fire all image generations in parallel
          generateCarouselImages(initial);
        } else {
          toast.error(data.error || "Error generando el carrusel");
        }
      } catch {
        toast.error("Error de conexión al generar carrusel");
      }
      setIsGenerating(false);
      return;
    }
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: selectedProperty && selectedProperty !== "none" ? selectedProperty : undefined,
          contentType: selectedType,
          platform: selectedPlatform,
          tone: selectedTone,
          customPrompt: customPrompt || undefined,
          provider,
        }),
      });

      const data = await res.json();

      if (res.ok && data.content) {
        setGeneratedContent(data.content);
        toast.success("Contenido generado con IA");
        // Fire image generation in parallel — don’t await so copy shows immediately
        generatePreviewImage(data.content);
      } else {
        const demo = generateDemoContent();
        setGeneratedContent(demo);
        toast.info("Contenido demo generado", {
          description: data.error || "Configura tu API key en Ajustes para usar IA real",
        });
        generatePreviewImage(demo);
      }
    } catch {
      const demo = generateDemoContent();
      setGeneratedContent(demo);
      toast.info("Contenido demo generado");
      generatePreviewImage(demo);
    }
    setIsGenerating(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedContent);
    toast.success("Copiado al portapapeles");
  };

  const handleSave = async (status: "DRAFT" | "SCHEDULED") => {
    setSavingContent(true);
    try {
      const firstLine = generatedContent.split("\n")[0].replace(/[✨🏡🎬📱📊]/g, "").trim().slice(0, 100);
      const res = await fetch("/api/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: firstLine || "Contenido generado",
          content: generatedContent,
          type: selectedType,
          platform: selectedPlatform,
          status,
          propertyId: selectedProperty && selectedProperty !== "none" ? selectedProperty : null,
          scheduledAt: status === "SCHEDULED" ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : null,
          mediaUrls: previewImageUrl ? [previewImageUrl] : undefined,
        }),
      });
      if (res.ok) {
        toast.success(status === "DRAFT" ? "Guardado como borrador" : "Publicación programada");
        loadHistory();
      } else {
        toast.error("Error al guardar");
      }
    } catch {
      toast.error("Error de conexión");
    }
    setSavingContent(false);
  };

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return "Hace minutos";
    if (hours < 24) return `Hace ${hours}h`;
    return `Hace ${Math.floor(hours / 24)}d`;
  }

  const loadVoices = async () => {
    setLoadingVoices(true);
    try {
      const res = await fetch("/api/ai/video/voices");
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Error al cargar voces");
        setLoadingVoices(false);
        return;
      }
      if (data.voices && data.voices.length > 0) {
        setVideoVoices(data.voices);
        toast.success(`${data.voices.length} voces en español disponibles`);
      } else {
        toast.info("No se encontraron voces en español. Se usará la voz por defecto.");
      }
    } catch {
      toast.error("Error al cargar voces");
    }
    setLoadingVoices(false);
  };

  // Video generation handler
  const handleGenerateVideo = async () => {
    if (!videoAvatarUrl) {
      toast.error("Selecciona o pega la URL de tu avatar");
      return;
    }

    setVideoGenerating(true);
    setVideoStatus("generating");
    setVideoScript("");
    setVideoUrl("");

    try {
      const res = await fetch("/api/ai/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyTitle: videoPropertyTitle || "Propiedad exclusiva",
          propertyDescription: videoPropertyDesc || undefined,
          propertyPrice: videoPropertyPrice || undefined,
          propertyCity: videoPropertyCity || undefined,
          avatarImageUrl: videoAvatarUrl,
          videoType,
          voiceId: selectedVoiceId || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al generar el video");
      }

      setVideoScript(data.script);
      setVideoId(data.videoId);
      setVideoStatus("processing");
      toast.success("Video en proceso de generación", {
        description: "HeyGen está creando tu video. Esto puede tomar 1-3 minutos.",
      });

      // Start polling for video status
      pollVideoStatus(data.videoId);
    } catch (err: any) {
      setVideoStatus("failed");
      toast.error(err.message || "Error al generar el video");
    }
    setVideoGenerating(false);
  };

  const pollVideoStatus = (vId: string) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/ai/video/status?videoId=${vId}`
        );
        const data = await res.json();

        if (data.status === "completed") {
          clearInterval(interval);
          setVideoStatus("completed");
          setVideoUrl(data.videoUrl || "");
          setVideoThumbnail(data.thumbnailUrl || "");
          toast.success("Video generado exitosamente", {
            description: "Tu video publicitario está listo para descargar",
          });
        } else if (data.status === "failed") {
          clearInterval(interval);
          setVideoStatus("failed");
          toast.error("Error en la generación del video", {
            description: data.error || "Intenta de nuevo",
          });
        }
      } catch {
        // Keep polling on network errors
      }
    }, 5000); // Poll every 5 seconds

    // Stop polling after 5 minutes
    setTimeout(() => {
      clearInterval(interval);
      if (videoStatus === "processing") {
        setVideoStatus("failed");
        toast.error("Tiempo de espera agotado. Revisa tu cuenta de HeyGen.");
      }
    }, 300000);
  };

  return (
    <div className="space-y-6">
      {/* Dark Hero Header */}
      <div className="relative overflow-hidden rounded-2xl p-6 text-white" style={{ background: 'linear-gradient(135deg, #4A154B 0%, #350d36 60%, #1a0a1a 100%)' }}>
        <div className="absolute inset-0 opacity-50" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23fff' fill-opacity='0.03'%3E%3Cpath d='M36 18c0-9.94-8.06-18-18-18S0 8.06 0 18 18 36 36 18'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />
        <div className="relative space-y-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-white/10 backdrop-blur-sm">
              <Sparkles className="h-5 w-5" />
            </div>
            <Badge className="bg-white/10 text-white/80 border-white/10 text-[10px] font-medium backdrop-blur-sm">
              IA Generativa
            </Badge>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Motor de Contenido IA</h1>
          <p className="text-white/70 text-sm max-w-md">
            Genera contenido de marketing inmobiliario con inteligencia artificial
          </p>
        </div>
      </div>

      <Tabs defaultValue="generate" className="space-y-6">
        {/* Segmented Control Tab Switcher */}
        <div className="flex gap-1 p-1 rounded-xl bg-[#F4F4F4] border border-[#C4A0D4] w-fit">
          <TabsList className="bg-transparent p-0 h-auto">
            <TabsTrigger
              value="generate"
              className="data-[state=active]:bg-white data-[state=active]:text-[#1D1C1D] data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-[#C4A0D4] rounded-lg px-4 py-2.5 text-sm font-medium text-[#7A7A7A] transition-all duration-200"
            >
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              Generar contenido
            </TabsTrigger>
            <TabsTrigger
              value="video"
              className="data-[state=active]:bg-white data-[state=active]:text-[#1D1C1D] data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-[#C4A0D4] rounded-lg px-4 py-2.5 text-sm font-medium text-[#7A7A7A] transition-all duration-200"
            >
              <Video className="h-3.5 w-3.5 mr-1.5" />
              Video IA
            </TabsTrigger>

            <TabsTrigger
              value="history"
              className="data-[state=active]:bg-white data-[state=active]:text-[#1D1C1D] data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-[#C4A0D4] rounded-lg px-4 py-2.5 text-sm font-medium text-[#7A7A7A] transition-all duration-200"
            >
              Historial ({history.length})
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="generate">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Config */}
            <div className="rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.06)]" style={{ border: '1.5px solid transparent', background: 'linear-gradient(#fff, #fff) padding-box, linear-gradient(135deg, #9B3FCB 0%, #4A154B 50%, #611f69 100%) border-box' }}>
              <div className="p-5 pb-4">
                <h3 className="text-base font-semibold flex items-center gap-2">
                  <Wand2 className="h-4 w-4 text-[#4A154B]" />
                  Configuración
                </h3>
              </div>
              <div className="px-5 pb-5 space-y-5">
                {/* Property Selector */}
                <div className="grid gap-2">
                  <Label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Propiedad (opcional)</Label>
                  <Select value={selectedProperty} onValueChange={(v) => setSelectedProperty(v ?? "")}>
                    <SelectTrigger className="h-10 rounded-xl bg-white border border-[#E0E0E0] focus-visible:ring-1 focus-visible:ring-[#4A154B]/30"><SelectValue placeholder="Seleccionar propiedad" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin propiedad específica</SelectItem>
                      {properties.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Content Type Chips */}
                <div className="grid gap-2">
                  <Label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Tipo de contenido</Label>
                  <div className="flex flex-wrap gap-2">
                    {contentTypes.map((type) => (
                      <button
                        key={type.value}
                        onClick={() => setSelectedType(type.value)}
                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold transition-all duration-200 border ${
                          selectedType === type.value
                            ? "border-[#4A154B] bg-[#F5EFF5] text-[#4A154B] shadow-sm"
                            : "border-[#C4A0D4] bg-white text-[#1D1C1D] hover:border-[#4A154B] hover:bg-[#FAF5FA]"
                        }`}
                      >
                        <type.icon className={`h-3.5 w-3.5 ${selectedType === type.value ? "text-[#4A154B]" : ""}`} />
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Platform Chips */}
                <div className="grid gap-2">
                  <Label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Plataforma</Label>
                  <div className="flex flex-wrap gap-2">
                    {platformsList.map((platform) => (
                      <button
                        key={platform.value}
                        onClick={() => setSelectedPlatform(platform.value)}
                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold transition-all duration-200 border ${
                          selectedPlatform === platform.value
                            ? "border-[#4A154B] bg-[#F5EFF5] text-[#4A154B] shadow-sm"
                            : "border-[#C4A0D4] bg-white text-[#1D1C1D] hover:border-[#4A154B] hover:bg-[#FAF5FA]"
                        }`}
                      >
                        <platform.icon className={`h-3.5 w-3.5 ${selectedPlatform === platform.value ? "text-[#4A154B]" : ""}`} />
                        {platform.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tone Selector */}
                <div className="grid gap-2">
                  <Label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Tono</Label>
                  <Select value={selectedTone} onValueChange={(v) => setSelectedTone(v ?? "profesional")}>
                    <SelectTrigger className="h-10 rounded-xl bg-white border border-[#E0E0E0] focus-visible:ring-1 focus-visible:ring-[#4A154B]/30"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {tones.map((tone) => (
                        <SelectItem key={tone.value} value={tone.value}>{tone.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Custom Prompt */}
                <div className="grid gap-2">
                  <Label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Instrucciones adicionales (opcional)</Label>
                  <Textarea
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="Ej: Enfócate en el ROI de inversión, menciona la cercanía al metro..."
                    rows={3}
                    className="rounded-xl bg-white border border-[#E0E0E0] focus-visible:ring-1 focus-visible:ring-[#4A154B]/30 placeholder:text-[#AAAAAA]"
                  />
                </div>

                {/* Marketing Image Data */}
                <div className="grid gap-3 border-t border-[#EEE8EE] pt-4">
                  <Label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                    <Paintbrush className="h-3 w-3 text-[#4A154B]" />
                    Datos para imagen marketing
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[10px] text-muted-foreground font-medium">Precio</Label>
                      <Input value={imgPrice} onChange={(e) => setImgPrice(e.target.value)} placeholder="$450,000" className="h-9 rounded-xl text-xs bg-white border border-[#E0E0E0] focus-visible:ring-1 focus-visible:ring-[#4A154B]/30 mt-1 placeholder:text-[#AAAAAA]" />
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted-foreground font-medium">Superficie</Label>
                      <Input value={imgArea} onChange={(e) => setImgArea(e.target.value)} placeholder="150 m²" className="h-9 rounded-xl text-xs bg-white border border-[#E0E0E0] focus-visible:ring-1 focus-visible:ring-[#4A154B]/30 mt-1 placeholder:text-[#AAAAAA]" />
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted-foreground font-medium">Recámaras</Label>
                      <Input value={imgBedrooms} onChange={(e) => setImgBedrooms(e.target.value)} placeholder="3" className="h-9 rounded-xl text-xs bg-white border border-[#E0E0E0] focus-visible:ring-1 focus-visible:ring-[#4A154B]/30 mt-1 placeholder:text-[#AAAAAA]" />
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted-foreground font-medium">Baños</Label>
                      <Input value={imgBathrooms} onChange={(e) => setImgBathrooms(e.target.value)} placeholder="2" className="h-9 rounded-xl text-xs bg-white border border-[#E0E0E0] focus-visible:ring-1 focus-visible:ring-[#4A154B]/30 mt-1 placeholder:text-[#AAAAAA]" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground font-medium">Ubicación / Zona</Label>
                    <Input value={imgLocation} onChange={(e) => setImgLocation(e.target.value)} placeholder="Brickell, Miami FL" className="h-9 rounded-xl text-xs bg-white border border-[#E0E0E0] focus-visible:ring-1 focus-visible:ring-[#4A154B]/30 mt-1 placeholder:text-[#AAAAAA]" />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground font-medium">Tagline del anuncio</Label>
                    <Input value={imgTagline} onChange={(e) => setImgTagline(e.target.value)} placeholder="Tu nuevo hogar te espera" className="h-9 rounded-xl text-xs bg-white border border-[#E0E0E0] focus-visible:ring-1 focus-visible:ring-[#4A154B]/30 mt-1 placeholder:text-[#AAAAAA]" />
                  </div>
                </div>

                {/* Generate Button */}
                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="w-full gold-gradient text-white rounded-2xl h-14 font-bold border-0 hover:opacity-90 transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
                >
                  {isGenerating ? (
                    <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Generando...</>
                  ) : (
                    <><Sparkles className="h-4 w-4 mr-2" />Generar contenido</>
                  )}
                </Button>
              </div>
            </div>

            {/* Preview */}
            <div className="rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.06)]" style={{ border: '1.5px solid transparent', background: 'linear-gradient(#fff, #fff) padding-box, linear-gradient(135deg, #9B3FCB 0%, #4A154B 50%, #611f69 100%) border-box' }}>
              <div className="p-5 pb-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold">Vista previa</h3>
                  {generatedContent && (
                    <div className="flex gap-1.5 p-1 rounded-xl bg-muted/30">
                      <Button variant="ghost" size="sm" onClick={handleCopy} className="rounded-lg h-8">
                        <Copy className="h-3.5 w-3.5 mr-1.5" />Copiar
                      </Button>
                      <Button size="sm" onClick={handleGenerate} disabled={isGenerating} variant="ghost" className="rounded-lg h-8">
                        <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isGenerating ? "animate-spin" : ""}`} />Regenerar
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              <div className="px-5 pb-5">
                {/* ── CAROUSEL preview ── */}
                {selectedType === "CAROUSEL" && carouselSlides.length > 0 ? (
                  <div className="space-y-4">
                    {/* Strategy pill */}
                    {carouselStrategy && (
                      <div className="rounded-xl bg-[#F5EFF5] border border-[#C4A0D4]/40 px-4 py-3 flex items-start gap-2">
                        <Sparkles className="h-3.5 w-3.5 text-[#4A154B] shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-[#4A154B] mb-0.5">Estrategia del carrusel</p>
                          <p className="text-xs text-[#4A154B]/75 leading-relaxed">{carouselStrategy}</p>
                        </div>
                      </div>
                    )}

                    {/* Main slide viewer */}
                    <div className="relative rounded-2xl overflow-hidden bg-[#F5EFF5]" style={{ aspectRatio: "4/5" }}>
                      {(() => {
                        const slide = carouselSlides[carouselActiveSlide];
                        if (!slide) return null;
                        return (
                          <>
                            {slide.imageLoading ? (
                              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                                <div className="relative w-10 h-10">
                                  <div className="absolute inset-0 rounded-full border-4 border-[#C4A0D4] border-t-[#4A154B] animate-spin" />
                                  <Paintbrush className="absolute inset-0 m-auto h-4 w-4 text-[#4A154B]" />
                                </div>
                                <p className="text-xs font-semibold text-[#4A154B]">Generando imagen {carouselActiveSlide + 1} de {carouselSlides.length}...</p>
                                <p className="text-[10px] text-muted-foreground">Flux 1.1 Pro Ultra · ~20s</p>
                              </div>
                            ) : slide.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={slide.imageUrl} alt={slide.headline} className="absolute inset-0 w-full h-full object-cover" />
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <ImageIcon className="h-12 w-12 text-[#C4A0D4]/40" />
                              </div>
                            )}
                            {/* Gradients */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/50" />
                            {/* Top bar */}
                            <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                              <Badge className="bg-white/20 text-white backdrop-blur-sm border-white/20 text-[10px]">
                                {slide.slideNumber} / {carouselSlides.length}
                              </Badge>
                              <Badge className="bg-white/15 text-white/90 backdrop-blur-sm border-white/15 text-[10px] capitalize">
                                {slide.type}
                              </Badge>
                            </div>
                            {/* Text overlay */}
                            <div className="absolute bottom-0 left-0 right-0 px-5 pb-5 pt-10">
                              <p className="text-white font-bold text-xl leading-tight drop-shadow-lg mb-2">{slide.headline}</p>
                              <p className="text-white/85 text-xs leading-relaxed drop-shadow">{slide.body}</p>
                              {slide.cta && (
                                <div className="mt-3 inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm border border-white/25 rounded-full px-3 py-1.5">
                                  <span className="text-white font-semibold text-[11px]">{slide.cta}</span>
                                </div>
                              )}
                            </div>
                            {/* Nav arrows */}
                            {carouselActiveSlide > 0 && (
                              <button
                                onClick={() => setCarouselActiveSlide((p) => p - 1)}
                                className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white text-xl hover:bg-black/60 transition-colors"
                              >&#8249;</button>
                            )}
                            {carouselActiveSlide < carouselSlides.length - 1 && (
                              <button
                                onClick={() => setCarouselActiveSlide((p) => p + 1)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white text-xl hover:bg-black/60 transition-colors"
                              >&#8250;</button>
                            )}
                          </>
                        );
                      })()}
                    </div>

                    {/* Dot navigation */}
                    <div className="flex justify-center gap-1.5">
                      {carouselSlides.map((s, i) => (
                        <button
                          key={i}
                          onClick={() => setCarouselActiveSlide(i)}
                          className={`rounded-full transition-all duration-200 ${
                            i === carouselActiveSlide
                              ? "w-6 h-2 bg-[#4A154B]"
                              : s.imageUrl
                              ? "w-2 h-2 bg-[#C4A0D4]"
                              : "w-2 h-2 bg-[#E0D0E0] animate-pulse"
                          }`}
                        />
                      ))}
                    </div>

                    {/* Slide thumbnails strip */}
                    <div className="space-y-1.5">
                      {carouselSlides.map((slide, i) => (
                        <button
                          key={i}
                          onClick={() => setCarouselActiveSlide(i)}
                          className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-all border ${
                            i === carouselActiveSlide
                              ? "border-[#4A154B]/40 bg-[#F5EFF5]"
                              : "border-[#EEE8EE] hover:bg-[#FAF5FA]"
                          }`}
                        >
                          <div className="w-9 h-9 rounded-lg overflow-hidden bg-[#EEE8EE] shrink-0 relative">
                            {slide.imageLoading ? (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-3.5 h-3.5 rounded-full border-2 border-[#C4A0D4] border-t-[#4A154B] animate-spin" />
                              </div>
                            ) : slide.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={slide.imageUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <ImageIcon className="h-3.5 w-3.5 text-[#C4A0D4]/60" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold truncate">{slide.headline}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{slide.body.slice(0, 55)}…</p>
                          </div>
                          <Badge className="shrink-0 text-[9px] bg-[#F5EFF5] text-[#4A154B] border-[#C4A0D4]/60 capitalize">{slide.type}</Badge>
                        </button>
                      ))}
                    </div>

                    {/* Save buttons */}
                    <div className="flex gap-2 pt-1">
                      <Button
                        className="flex-1 gold-gradient text-white rounded-2xl h-12 font-bold border-0 hover:opacity-90 transition-all shadow-lg"
                        onClick={() => handleSave("SCHEDULED")}
                        disabled={savingContent}
                      >
                        {savingContent ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                        Guardar carrusel
                      </Button>
                      <Button variant="outline" className="rounded-2xl h-12 border-[#C4A0D4] text-[#4A154B] hover:bg-[#FAF5FA] font-semibold px-4" onClick={() => handleSave("DRAFT")} disabled={savingContent}>
                        Borrador
                      </Button>
                    </div>
                  </div>

                ) : generatedContent ? (
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <Badge variant="outline" className="text-[10px] rounded-full">{contentTypes.find((t) => t.value === selectedType)?.label}</Badge>
                      <Badge variant="outline" className="text-[10px] rounded-full">{platformsList.find((p) => p.value === selectedPlatform)?.label}</Badge>
                    </div>

                    {/* ── AI Image Preview ── */}
                    {(previewImageLoading || previewImageUrl) && (
                      <div className="relative rounded-2xl overflow-hidden aspect-video bg-[#F5EFF5]">
                        {previewImageLoading && !previewImageUrl && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                            <div className="relative w-10 h-10">
                              <div className="absolute inset-0 rounded-full border-4 border-[#C4A0D4] border-t-[#4A154B] animate-spin" />
                              <Paintbrush className="absolute inset-0 m-auto h-4 w-4 text-[#4A154B]" />
                            </div>
                            <div className="text-center">
                              <p className="text-xs font-semibold text-[#4A154B]">Generando imagen marketing...</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">Flux 1.1 Pro Ultra · ~20s</p>
                            </div>
                          </div>
                        )}
                        {previewImageUrl && (
                          <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={previewImageUrl}
                              alt="Imagen de marketing generada por IA"
                              className="w-full h-full object-cover"
                            />
                            {/* Deep gradient for text readability */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-black/10" />
                            {/* Bottom: property data overlay */}
                            <div className="absolute bottom-0 left-0 right-0 px-4 py-3 space-y-1">
                              {(imgTagline || customPrompt) && (
                                <p className="text-white font-bold text-sm leading-tight drop-shadow-lg line-clamp-2">
                                  {imgTagline || customPrompt.slice(0, 80)}
                                </p>
                              )}
                              {(() => {
                                const prop = properties.find((p) => p.id === selectedProperty);
                                return prop?.title ? (
                                  <p className="text-white/85 text-xs font-semibold drop-shadow line-clamp-1">{prop.title}</p>
                                ) : null;
                              })()}
                              {(imgPrice || imgArea || imgBedrooms || imgBathrooms) && (
                                <div className="flex items-center gap-2 flex-wrap pt-0.5">
                                  {imgPrice && <span className="text-white font-bold text-xs drop-shadow">{imgPrice}</span>}
                                  {imgArea && <span className="text-white/70 text-[11px]">· {imgArea} m²</span>}
                                  {imgBedrooms && <span className="text-white/70 text-[11px]">· {imgBedrooms} rec</span>}
                                  {imgBathrooms && <span className="text-white/70 text-[11px]">· {imgBathrooms} baños</span>}
                                </div>
                              )}
                              {imgLocation && <p className="text-white/60 text-[10px]">{imgLocation}</p>}
                            </div>
                            {/* Top: AI badge + download */}
                            <div className="absolute top-2.5 left-3 right-3 flex items-start justify-between">
                              <Badge className="bg-black/55 text-white text-[10px] backdrop-blur-sm border-0">Flux 1.1 Pro Ultra</Badge>
                              <a
                                href={previewImageUrl}
                                download="marketing.jpg"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[10px] font-semibold text-white bg-white/15 backdrop-blur-sm px-2 py-1.5 rounded-lg hover:bg-white/25 transition-colors border border-white/20"
                              >
                                <Download className="h-3 w-3" />Descargar
                              </a>
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    <div className="bg-muted/30 rounded-2xl p-4">
                      <pre className="whitespace-pre-wrap text-sm font-sans leading-relaxed">{generatedContent}</pre>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        className="flex-1 gold-gradient text-white rounded-2xl h-12 font-bold border-0 hover:opacity-90 transition-all shadow-lg hover:shadow-xl"
                        onClick={() => handleSave("SCHEDULED")}
                        disabled={savingContent}
                      >
                        {savingContent ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                        Programar publicación
                      </Button>
                      <Button variant="outline" className="flex-1 rounded-2xl h-12 border-[#C4A0D4] text-[#4A154B] hover:bg-[#FAF5FA] hover:border-[#4A154B] font-semibold" onClick={() => handleSave("DRAFT")} disabled={savingContent}>
                        Guardar como borrador
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="p-4 rounded-2xl bg-muted/30 mb-4">
                      <Sparkles className="h-8 w-8 text-foreground/40" />
                    </div>
                    <h3 className="font-semibold text-sm">Genera tu primer contenido</h3>
                    <p className="text-xs text-muted-foreground mt-1 max-w-[250px]">
                      Selecciona las opciones y haz clic en &quot;Generar contenido&quot; para crear publicaciones con IA
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* VIDEO IA TAB */}
        <TabsContent value="video">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* LEFT: Config */}
            <div className="space-y-4">

              {/* Step 1: Property */}
              <div className="rounded-2xl p-5 space-y-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)]" style={{ border: '1.5px solid transparent', background: 'linear-gradient(#fff, #fff) padding-box, linear-gradient(135deg, #9B3FCB 0%, #4A154B 50%, #611f69 100%) border-box' }}>
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg gold-gradient flex items-center justify-center text-white text-xs font-bold">1</div>
                  <h3 className="text-sm font-semibold">Datos de la propiedad</h3>
                </div>
                <div className="grid gap-3">
                  <div>
                    <Label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Título</Label>
                    <Input value={videoPropertyTitle} onChange={(e) => setVideoPropertyTitle(e.target.value)} placeholder="Penthouse de lujo en Brickell" className="h-9 rounded-xl bg-white border border-[#E0E0E0] focus-visible:ring-1 focus-visible:ring-[#4A154B]/30 mt-1.5 text-sm placeholder:text-[#AAAAAA]" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Precio</Label>
                      <Input value={videoPropertyPrice} onChange={(e) => setVideoPropertyPrice(e.target.value)} placeholder="$450,000" className="h-9 rounded-xl bg-white border border-[#E0E0E0] focus-visible:ring-1 focus-visible:ring-[#4A154B]/30 mt-1 text-sm placeholder:text-[#AAAAAA]" />
                    </div>
                    <div>
                      <Label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Ciudad</Label>
                      <Input value={videoPropertyCity} onChange={(e) => setVideoPropertyCity(e.target.value)} placeholder="Miami, FL" className="h-9 rounded-xl bg-white border border-[#E0E0E0] focus-visible:ring-1 focus-visible:ring-[#4A154B]/30 mt-1 text-sm placeholder:text-[#AAAAAA]" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Instrucciones / Descripción (opcional)</Label>
                    <Textarea value={klingCustomPrompt} onChange={(e) => setKlingCustomPrompt(e.target.value)} placeholder="Ej: enfoca en la vista al mar al atardecer, movimiento de cámara cinematográfico..." rows={2} className="rounded-xl bg-white border border-[#E0E0E0] focus-visible:ring-1 focus-visible:ring-[#4A154B]/30 mt-1 text-sm placeholder:text-[#AAAAAA] resize-none" />
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 w-full rounded-xl h-8 text-xs border-[#C4A0D4] text-[#4A154B] hover:bg-[#FAF5FA] hover:border-[#4A154B] font-semibold"
                      disabled={klingPromptGenerating}
                      onClick={async () => {
                        setKlingPromptGenerating(true);
                        try {
                          const parts = [
                            videoPropertyTitle && `Propiedad: ${videoPropertyTitle}`,
                            videoPropertyPrice && `Precio: ${videoPropertyPrice}`,
                            videoPropertyCity && `Ciudad: ${videoPropertyCity}`,
                          ].filter(Boolean).join(", ");
                          const res = await fetch("/api/ai/generate", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              type: "REEL",
                              platform: "INSTAGRAM",
                              tone: selectedTone,
                              provider: "claude",
                              customPrompt: `Genera una descripción cinematográfica corta (máximo 2 oraciones) para animar en video con IA una imagen de esta propiedad inmobiliaria: ${parts || "propiedad de lujo"}. Describe el movimiento de cámara ideal, la iluminación y el ambiente visual. Solo devuelve la descripción, sin explicaciones.`,
                            }),
                          });
                          const data = await res.json();
                          if (res.ok && data.content) {
                            setKlingCustomPrompt(data.content.trim());
                            toast.success("Instrucciones generadas con Petunia AI");
                          } else {
                            toast.error("No se pudo generar");
                          }
                        } catch {
                          toast.error("Error de conexión");
                        }
                        setKlingPromptGenerating(false);
                      }}
                    >
                      {klingPromptGenerating ? (
                        <><Loader2 className="h-3 w-3 mr-1.5 animate-spin" />Generando...</>
                      ) : (
                        <><Wand2 className="h-3 w-3 mr-1.5" />Crear con Petunia AI</>
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Step 2: Source image */}
              <div className="rounded-2xl p-5 space-y-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)]" style={{ border: '1.5px solid transparent', background: 'linear-gradient(#fff, #fff) padding-box, linear-gradient(135deg, #9B3FCB 0%, #4A154B 50%, #611f69 100%) border-box' }}>
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg gold-gradient flex items-center justify-center text-white text-xs font-bold">2</div>
                  <h3 className="text-sm font-semibold">Imagen de origen</h3>
                  <span className="text-[10px] text-muted-foreground ml-auto">Kling la anima en video</span>
                </div>

                {/* Picker tabs */}
                <div className="flex gap-1 p-1 bg-[#F5EFF5] rounded-xl">
                  {([
                    { id: "flux", label: "Generar con IA", icon: Paintbrush },
                    { id: "properties", label: "Propiedades", icon: ImageIcon },
                    { id: "history", label: "Historial", icon: FileText },
                  ] as const).map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setKlingImagePickerTab(tab.id)}
                      className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                        klingImagePickerTab === tab.id
                          ? "bg-white text-[#4A154B] shadow-sm"
                          : "text-[#7A7A7A] hover:text-[#4A154B]"
                      }`}
                    >
                      <tab.icon className="h-3 w-3" />
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* TAB: Generar con Flux */}
                {klingImagePickerTab === "flux" && (
                  <div className="space-y-3">
                    <Button
                      variant="outline"
                      className="w-full rounded-xl border-[#C4A0D4] text-[#4A154B] hover:bg-[#FAF5FA] hover:border-[#4A154B] font-semibold h-10"
                      disabled={klingImageGenerating}
                      onClick={async () => {
                        setKlingImageGenerating(true);
                        setKlingSourceImageUrl("");
                        const property = properties.find((p) => p.id === selectedProperty);
                        const brief = [
                          videoPropertyTitle || property?.title || "luxury real estate",
                          videoPropertyCity && `in ${videoPropertyCity}`,
                          klingCustomPrompt && klingCustomPrompt,
                          klingAspectRatio === "reel" ? "vertical 9:16 composition" : "wide cinematic 16:9",
                        ].filter(Boolean).join(", ");
                        try {
                          const styleMap: Record<string, string> = {
                            lujo: "luxury real estate, cinematic golden hour",
                            profesional: "professional real estate photography, clean bright daylight",
                            cercano: "warm lifestyle photography, natural light",
                            urgente: "editorial magazine, bold dramatic lighting",
                            informativo: "modern architecture, clean minimalist",
                            persuasivo: "luxury lifestyle, aspirational mood",
                          };
                          const res = await fetch("/api/ai/image", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ brief, style: styleMap[selectedTone] || "luxury real estate, professional photography" }),
                          });
                          const data = await res.json();
                          if (res.ok && data.imageUrl) {
                            setKlingSourceImageUrl(data.imageUrl);
                            toast.success("Imagen generada — ahora genera el video");
                          } else {
                            toast.error(data.error || "Error generando imagen");
                          }
                        } catch { toast.error("Error de conexión"); }
                        setKlingImageGenerating(false);
                      }}
                    >
                      {klingImageGenerating ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generando imagen con Flux...</>
                      ) : (
                        <><Paintbrush className="h-4 w-4 mr-2" />Generar imagen de propiedad con Flux IA</>
                      )}
                    </Button>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-px bg-[#EEE8EE]" />
                      <span className="text-[10px] text-muted-foreground font-medium">o pega una URL</span>
                      <div className="flex-1 h-px bg-[#EEE8EE]" />
                    </div>
                    <Input
                      value={klingSourceImageUrl}
                      onChange={(e) => setKlingSourceImageUrl(e.target.value)}
                      placeholder="https://... URL de imagen"
                      className="h-9 rounded-xl bg-white border border-[#E0E0E0] focus-visible:ring-1 focus-visible:ring-[#4A154B]/30 text-sm placeholder:text-[#AAAAAA]"
                    />
                  </div>
                )}

                {/* TAB: Propiedades */}
                {klingImagePickerTab === "properties" && (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-0.5">
                    {properties.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-4">No hay propiedades cargadas</p>
                    )}
                    {properties.map((prop) => {
                      const imgs = prop.images ?? [];
                      if (imgs.length === 0) return (
                        <div key={prop.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-[#EEE8EE] opacity-50">
                          <div className="h-12 w-16 rounded-lg bg-[#F5EFF5] flex items-center justify-center shrink-0">
                            <ImageIcon className="h-4 w-4 text-[#C4A0D4]" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold truncate">{prop.title}</p>
                            <p className="text-[10px] text-muted-foreground">Sin imágenes</p>
                          </div>
                        </div>
                      );
                      return (
                        <div key={prop.id} className="space-y-1.5">
                          <p className="text-[11px] font-semibold text-[#4A154B] px-0.5 truncate">{prop.title}</p>
                          <div className="flex gap-1.5 flex-wrap">
                            {imgs.slice(0, 6).map((img, idx) => (
                              <button
                                key={idx}
                                onClick={() => { setKlingSourceImageUrl(img); toast.success("Imagen seleccionada"); }}
                                className={`relative h-14 w-20 rounded-lg overflow-hidden border-2 transition-all ${
                                  klingSourceImageUrl === img
                                    ? "border-[#4A154B] shadow-md scale-105"
                                    : "border-transparent hover:border-[#C4A0D4] hover:scale-102"
                                }`}
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={img} alt={`${prop.title} ${idx + 1}`} className="w-full h-full object-cover" />
                                {klingSourceImageUrl === img && (
                                  <div className="absolute inset-0 bg-[#4A154B]/30 flex items-center justify-center">
                                    <CheckCircle2 className="h-4 w-4 text-white" />
                                  </div>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* TAB: Historial */}
                {klingImagePickerTab === "history" && (
                  <div className="space-y-1.5 max-h-64 overflow-y-auto pr-0.5">
                    {history.filter((h) => h.mediaUrls && h.mediaUrls.length > 0).length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-4">No hay imágenes guardadas en el historial</p>
                    )}
                    <div className="flex gap-1.5 flex-wrap">
                      {history
                        .filter((h) => h.mediaUrls && h.mediaUrls.length > 0)
                        .map((h) => h.mediaUrls![0])
                        .filter((url, i, arr) => arr.indexOf(url) === i) // dedupe
                        .slice(0, 18)
                        .map((imgUrl, idx) => (
                          <button
                            key={idx}
                            onClick={() => { setKlingSourceImageUrl(imgUrl); toast.success("Imagen del historial seleccionada"); }}
                            className={`relative h-14 w-20 rounded-lg overflow-hidden border-2 transition-all ${
                              klingSourceImageUrl === imgUrl
                                ? "border-[#4A154B] shadow-md scale-105"
                                : "border-transparent hover:border-[#C4A0D4]"
                            }`}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={imgUrl} alt={`Historial ${idx + 1}`} className="w-full h-full object-cover" />
                            {klingSourceImageUrl === imgUrl && (
                              <div className="absolute inset-0 bg-[#4A154B]/30 flex items-center justify-center">
                                <CheckCircle2 className="h-4 w-4 text-white" />
                              </div>
                            )}
                          </button>
                        ))}
                    </div>
                  </div>
                )}



                {/* Selected image preview */}
                {klingSourceImageUrl && (
                  <div className="relative rounded-xl overflow-hidden aspect-video bg-[#F5EFF5]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={klingSourceImageUrl} alt="Imagen base" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.3"; }} />
                    <Badge className="absolute bottom-2 right-2 bg-black/50 text-white text-[10px] backdrop-blur-sm border-0">Imagen seleccionada ✓</Badge>
                    <button
                      onClick={() => setKlingSourceImageUrl("")}
                      className="absolute top-2 right-2 h-5 w-5 rounded-full bg-black/50 text-white flex items-center justify-center text-[10px] hover:bg-black/70"
                    >✕</button>
                  </div>
                )}
              </div>

              {/* Step 3: Video settings */}
              <div className="rounded-2xl p-5 space-y-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)]" style={{ border: '1.5px solid transparent', background: 'linear-gradient(#fff, #fff) padding-box, linear-gradient(135deg, #9B3FCB 0%, #4A154B 50%, #611f69 100%) border-box' }}>
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg gold-gradient flex items-center justify-center text-white text-xs font-bold">3</div>
                  <h3 className="text-sm font-semibold">Configuración del video</h3>
                </div>

                <div className="grid gap-3">
                  {/* Format */}
                  <div>
                    <Label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Formato</Label>
                    <div className="grid grid-cols-2 gap-2 mt-1.5">
                      {([
                        { value: "reel", label: "Reel / TikTok", sub: "9:16 vertical", icon: Film },
                        { value: "landscape", label: "Cinematográfico", sub: "16:9 horizontal", icon: Camera },
                      ] as const).map((f) => (
                        <button key={f.value} onClick={() => setKlingAspectRatio(f.value)}
                          className={`p-3 rounded-xl text-left transition-all duration-200 border-2 ${
                            klingAspectRatio === f.value
                              ? "border-[#4A154B] bg-[#F5EFF5] text-[#4A154B] shadow-sm"
                              : "border-[#C4A0D4] bg-white text-[#1D1C1D] hover:border-[#4A154B] hover:bg-[#FAF5FA]"
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            <f.icon className="h-3.5 w-3.5" />
                            <span className="text-xs font-semibold">{f.label}</span>
                          </div>
                          <p className="text-[10px] mt-0.5 opacity-60">{f.sub}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Duration */}
                  <div>
                    <Label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Duración</Label>
                    <div className="grid grid-cols-2 gap-2 mt-1.5">
                      {(["5", "10"] as const).map((d) => (
                        <button key={d} onClick={() => setKlingDuration(d)}
                          className={`py-2.5 rounded-xl text-xs font-semibold transition-all border-2 ${
                            klingDuration === d
                              ? "border-[#4A154B] bg-[#F5EFF5] text-[#4A154B]"
                              : "border-[#C4A0D4] bg-white text-[#1D1C1D] hover:border-[#4A154B]"
                          }`}
                        >{d} segundos</button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 4 (optional): Avatar digital */}
              <div className="rounded-2xl p-5 space-y-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)]" style={{ border: '1.5px solid transparent', background: 'linear-gradient(#fff, #fff) padding-box, linear-gradient(135deg, #9B3FCB 0%, #4A154B 50%, #611f69 100%) border-box' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-[#EEE8EE] flex items-center justify-center text-[#7A7A7A] text-xs font-bold">4</div>
                    <div>
                      <h3 className="text-sm font-semibold">Avatar digital</h3>
                      <p className="text-[10px] text-muted-foreground">Opcional — agrega un presentador al video</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setUseAvatarOverlay(!useAvatarOverlay)}
                    className={`relative h-6 w-11 rounded-full transition-colors duration-200 ${
                      useAvatarOverlay ? "bg-[#4A154B]" : "bg-[#D8D8D8]"
                    }`}
                  >
                    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${
                      useAvatarOverlay ? "translate-x-5" : "translate-x-0.5"
                    }`} />
                  </button>
                </div>

                {useAvatarOverlay && (
                  <div className="space-y-3">
                    {/* Saved avatars grid */}
                    {klingAvatarList.length > 0 ? (
                      <div className="space-y-2">
                        <Label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Mis avatares guardados</Label>
                        <div className="flex gap-2 flex-wrap">
                          {klingAvatarList.map((avatar) => (
                            <button
                              key={avatar.id}
                              onClick={() => { setVideoAvatarUrl(avatar.videoUrl); toast.success(`Avatar "${avatar.name}" seleccionado`); }}
                              title={avatar.name}
                              className={`relative h-16 w-24 rounded-xl overflow-hidden border-2 transition-all ${
                                videoAvatarUrl === avatar.videoUrl
                                  ? "border-[#4A154B] shadow-md scale-105"
                                  : "border-[#E0E0E0] hover:border-[#C4A0D4]"
                              }`}
                            >
                              <video
                                src={avatar.videoUrl}
                                className="w-full h-full object-cover"
                                muted
                                playsInline
                                onMouseEnter={(e) => (e.target as HTMLVideoElement).play()}
                                onMouseLeave={(e) => { const v = e.target as HTMLVideoElement; v.pause(); v.currentTime = 0; }}
                              />
                              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-1.5 pb-1">
                                <p className="text-[8px] text-white font-semibold truncate">{avatar.name}</p>
                              </div>
                              {videoAvatarUrl === avatar.videoUrl && (
                                <div className="absolute inset-0 bg-[#4A154B]/25 flex items-center justify-center">
                                  <CheckCircle2 className="h-5 w-5 text-white drop-shadow" />
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                        {videoAvatarUrl && klingAvatarList.some(a => a.videoUrl === videoAvatarUrl) && (
                          <p className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Avatar seleccionado — se combinará con el video de la propiedad
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-5 gap-2 text-center rounded-xl bg-[#F5EFF5] border border-dashed border-[#C4A0D4]">
                        <Camera className="h-7 w-7 text-[#C4A0D4]" />
                        <p className="text-xs text-muted-foreground">No tienes avatares guardados aún</p>
                        <button
                          onClick={() => window.open("/avatar", "_blank")}
                          className="text-[11px] font-semibold text-[#4A154B] underline underline-offset-2 hover:text-[#611f69]"
                        >
                          Crear avatar en Avatar IA →
                        </button>
                      </div>
                    )}

                    {/* Manual URL fallback */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-px bg-[#EEE8EE]" />
                      <span className="text-[10px] text-muted-foreground">o pega una URL</span>
                      <div className="flex-1 h-px bg-[#EEE8EE]" />
                    </div>
                    <Input
                      value={videoAvatarUrl}
                      onChange={(e) => setVideoAvatarUrl(e.target.value)}
                      placeholder="https://... URL del video o imagen del avatar"
                      className="h-9 rounded-xl bg-white border border-[#E0E0E0] focus-visible:ring-1 focus-visible:ring-[#4A154B]/30 text-sm placeholder:text-[#AAAAAA]"
                    />
                  </div>
                )}
              </div>

              {/* Generate Button */}
              <Button
                onClick={async () => {
                  if (!klingSourceImageUrl.trim()) {
                    toast.error("Genera o pega una imagen de la propiedad primero");
                    return;
                  }
                  setKlingVideoGenerating(true);
                  setKlingVideoStatus("generating");
                  setKlingVideoUrl("");
                  setKlingMotionPrompt("");
                  setKlingAvatarVideoUrl("");
                  setKlingAvatarScript("");

                  // Find selected avatar data
                  const selectedAvatar = useAvatarOverlay && videoAvatarUrl
                    ? klingAvatarList.find((a) => a.videoUrl === videoAvatarUrl)
                    : null;

                  try {
                    // ── Step 1: Generate Kling property video ──────────
                    const res = await fetch("/api/ai/kling", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        imageUrl: klingSourceImageUrl,
                        propertyTitle: videoPropertyTitle || undefined,
                        propertyPrice: videoPropertyPrice || undefined,
                        propertyCity: videoPropertyCity || undefined,
                        propertyDesc: videoPropertyDesc || undefined,
                        videoType: klingAspectRatio,
                        duration: klingDuration,
                        customPrompt: klingCustomPrompt || undefined,
                      }),
                    });
                    const data = await res.json();
                    if (res.ok && data.videoUrl) {
                      setKlingVideoUrl(data.videoUrl);
                      setKlingMotionPrompt(data.motionPrompt || "");
                      setKlingVideoStatus("completed");

                      // ── Step 2: Generate avatar video if selected ──
                      if (selectedAvatar?.sourceImageUrl) {
                        setKlingAvatarVideoGenerating(true);
                        toast.info("Generando video del avatar presentador...", { duration: 4000 });
                        try {
                          const avatarRes = await fetch("/api/ai/video-with-avatar", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              sourceImageUrl: selectedAvatar.sourceImageUrl,
                              voiceDescription: selectedAvatar.voiceDescription || undefined,
                              resolution: selectedAvatar.resolution || "480p",
                              propertyTitle: videoPropertyTitle || undefined,
                              propertyPrice: videoPropertyPrice || undefined,
                              propertyCity: videoPropertyCity || undefined,
                              propertyDesc: videoPropertyDesc || undefined,
                            }),
                          });
                          const avatarData = await avatarRes.json();
                          if (avatarRes.ok && avatarData.videoUrl) {
                            setKlingAvatarVideoUrl(avatarData.videoUrl);
                            setKlingAvatarScript(avatarData.script || "");
                            toast.success("¡Pack de video generado — propiedad + avatar!");
                          } else {
                            // Fallback: use the saved avatar video
                            setKlingAvatarVideoUrl(videoAvatarUrl);
                            toast.success("¡Video generado con Kling IA!");
                          }
                        } catch {
                          // Fallback: use the saved avatar video
                          setKlingAvatarVideoUrl(videoAvatarUrl);
                          toast.success("¡Video generado con Kling IA!");
                        }
                        setKlingAvatarVideoGenerating(false);
                      } else if (useAvatarOverlay && videoAvatarUrl) {
                        // No sourceImageUrl — use the existing saved avatar video directly
                        setKlingAvatarVideoUrl(videoAvatarUrl);
                        toast.success("¡Video generado con Kling IA!");
                      } else {
                        toast.success("¡Video generado con Kling IA!");
                      }
                    } else {
                      setKlingVideoStatus("failed");
                      toast.error(data.error || "Error generando video");
                    }
                  } catch {
                    setKlingVideoStatus("failed");
                    toast.error("Error de conexión");
                  }
                  setKlingVideoGenerating(false);
                }}
                disabled={klingVideoGenerating || !klingSourceImageUrl.trim()}
                className="w-full gold-gradient text-white rounded-2xl h-14 font-bold border-0 hover:opacity-90 transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
              >
                {klingVideoGenerating ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generando video con Kling...</>
                ) : useAvatarOverlay && videoAvatarUrl ? (
                  <><Film className="h-4 w-4 mr-2" />Generar video + avatar con IA</>
                ) : (
                  <><Film className="h-4 w-4 mr-2" />Generar video con Kling IA</>
                )}
              </Button>

              <p className="text-center text-[10px] text-muted-foreground">
                {useAvatarOverlay && videoAvatarUrl
                  ? "Kling V2.1 Pro · Video propiedad + VEED Fabric · Avatar presentador"
                  : "Kling V2.1 Pro · Image-to-Video · ~60-90 seg"}
              </p>
            </div>

            {/* RIGHT: Preview */}
            <div className="space-y-4">
              {/* How it works */}
              {klingVideoStatus === "idle" && (
                <div className="rounded-2xl p-5 space-y-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)]" style={{ border: '1.5px solid transparent', background: 'linear-gradient(#fff, #fff) padding-box, linear-gradient(135deg, #9B3FCB 0%, #4A154B 50%, #611f69 100%) border-box' }}>
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-[#4A154B]" />
                    Cómo funciona
                  </h3>
                  <div className="space-y-3">
                    {[
                      { n: "1", text: "Claude escribe un prompt cinemático de movimiento de cámara" },
                      { n: "2", text: "Kling V2.1 Pro anima la imagen con IA — movimiento fluido y realista" },
                      { n: "3", text: "Obtienes un video MP4 listo para Reels, TikTok o Stories" },
                    ].map((s) => (
                      <div key={s.n} className="flex items-start gap-3">
                        <div className="h-6 w-6 rounded-full bg-[#F5EFF5] border border-[#C4A0D4]/50 flex items-center justify-center text-[10px] font-bold text-[#4A154B] shrink-0">{s.n}</div>
                        <p className="text-xs text-muted-foreground leading-relaxed">{s.text}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="p-4 rounded-2xl bg-[#F5EFF5] mb-3">
                      <Film className="h-10 w-10 text-[#4A154B]/30" />
                    </div>
                    <p className="text-sm font-semibold">Genera una imagen y crea tu video</p>
                    <p className="text-xs text-muted-foreground mt-1">Configura los datos a la izquierda y haz clic en generar</p>
                  </div>
                </div>
              )}

              {/* Generating state */}
              {klingVideoGenerating && (
                <div className="rounded-2xl p-8 flex flex-col items-center justify-center gap-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)]" style={{ border: '1.5px solid transparent', background: 'linear-gradient(#fff, #fff) padding-box, linear-gradient(135deg, #9B3FCB 0%, #4A154B 50%, #611f69 100%) border-box' }}>
                  <div className="relative w-16 h-16">
                    <div className="absolute inset-0 rounded-full border-4 border-[#C4A0D4] border-t-[#4A154B] animate-spin" />
                    <Film className="absolute inset-0 m-auto h-6 w-6 text-[#4A154B]" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-[#4A154B]">
                      {klingAvatarVideoGenerating ? "Generando video del avatar..." : "Generando video con Kling..."}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {useAvatarOverlay && videoAvatarUrl
                        ? "Paso 1: Kling anima la propiedad · Paso 2: VEED genera el avatar presentador"
                        : "Claude crea el prompt de movimiento · Kling renderiza · ~60-90s"}
                    </p>
                  </div>
                  {klingMotionPrompt && (
                    <div className="rounded-xl bg-[#F5EFF5] border border-[#C4A0D4]/40 px-4 py-3 w-full">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#4A154B] mb-1">Prompt de movimiento</p>
                      <p className="text-xs text-[#4A154B]/70 italic">{klingMotionPrompt}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Error */}
              {klingVideoStatus === "failed" && !klingVideoGenerating && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-red-800">Error generando el video</p>
                      <p className="text-xs text-red-600 mt-0.5">Verifica que FAL_API_KEY tenga saldo y que la imagen sea accesible.</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="mt-3 rounded-xl border-red-200 text-red-700 hover:bg-red-100" onClick={() => setKlingVideoStatus("idle")}>
                    Intentar de nuevo
                  </Button>
                </div>
              )}

              {/* Completed video */}
              {klingVideoStatus === "completed" && klingVideoUrl && (
                <div className="space-y-4">

                  {/* ── Video Pack Header (when avatar is present) ── */}
                  {klingAvatarVideoUrl && (
                    <div className="rounded-2xl px-4 py-3 flex items-center gap-3" style={{ background: 'linear-gradient(135deg, #F5EFF5 0%, #EEE4F0 100%)', border: '1.5px solid #C4A0D4' }}>
                      <div className="p-2 rounded-xl bg-[#4A154B]">
                        <Sparkles className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[#4A154B]">Pack de video completo</p>
                        <p className="text-[10px] text-muted-foreground">Video de la propiedad + Avatar presentador generados con IA</p>
                      </div>
                    </div>
                  )}

                  {/* ── Property video ── */}
                  <div>
                    {klingAvatarVideoUrl && (
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
                        <Film className="h-3 w-3" />Video de la Propiedad · Kling V2.1
                      </p>
                    )}
                    <div className={`rounded-2xl overflow-hidden bg-black ${
                      klingAspectRatio === "reel" ? "aspect-[9/16] max-h-[520px] mx-auto max-w-[300px]" : "aspect-video"
                    }`}>
                      <video
                        src={klingVideoUrl}
                        controls
                        autoPlay
                        loop
                        muted
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button
                        className="flex-1 gold-gradient text-white rounded-2xl h-10 font-bold border-0 hover:opacity-90 shadow-lg text-sm"
                        onClick={() => {
                          const a = document.createElement("a");
                          a.href = klingVideoUrl;
                          a.download = `petunia-propiedad-${Date.now()}.mp4`;
                          a.target = "_blank";
                          a.click();
                          toast.success("Descargando video de propiedad...");
                        }}
                      >
                        <Download className="h-3.5 w-3.5 mr-1.5" />Descargar
                      </Button>
                      <Button variant="outline" className="rounded-2xl h-10 border-[#C4A0D4] text-[#4A154B] hover:bg-[#FAF5FA] px-4" onClick={() => window.open(klingVideoUrl, "_blank")}>
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* ── Avatar presenter video ── */}
                  {klingAvatarVideoGenerating && (
                    <div className="rounded-2xl border border-[#C4A0D4]/40 bg-[#F5EFF5] p-5 flex items-center gap-4">
                      <div className="relative h-10 w-10 shrink-0">
                        <div className="absolute inset-0 rounded-full border-3 border-[#C4A0D4] border-t-[#4A154B] animate-spin" />
                        <User className="absolute inset-0 m-auto h-4 w-4 text-[#4A154B]" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#4A154B]">Generando avatar presentador...</p>
                        <p className="text-[10px] text-muted-foreground">Claude escribe el guion · VEED Fabric genera el video · ~30-60s</p>
                      </div>
                    </div>
                  )}

                  {klingAvatarVideoUrl && !klingAvatarVideoGenerating && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
                        <User className="h-3 w-3" />Avatar Presentador · VEED Fabric
                      </p>
                      <div className="rounded-2xl overflow-hidden bg-black aspect-video">
                        <video
                          src={klingAvatarVideoUrl}
                          controls
                          autoPlay
                          loop
                          muted
                          className="w-full h-full object-contain"
                        />
                      </div>
                      {klingAvatarScript && (
                        <div className="rounded-xl bg-[#F5EFF5] border border-[#C4A0D4]/40 px-4 py-3 mt-2">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-[#4A154B] mb-1">Guion del presentador (Claude)</p>
                          <p className="text-xs text-[#4A154B]/70 italic">"{klingAvatarScript}"</p>
                        </div>
                      )}
                      <div className="flex gap-2 mt-3">
                        <Button
                          className="flex-1 rounded-2xl h-10 font-bold border-[#C4A0D4] text-[#4A154B] hover:bg-[#F5EFF5] text-sm"
                          variant="outline"
                          onClick={() => {
                            const a = document.createElement("a");
                            a.href = klingAvatarVideoUrl;
                            a.download = `petunia-avatar-${Date.now()}.mp4`;
                            a.target = "_blank";
                            a.click();
                            toast.success("Descargando video del avatar...");
                          }}
                        >
                          <Download className="h-3.5 w-3.5 mr-1.5" />Descargar Avatar
                        </Button>
                        <Button variant="outline" className="rounded-2xl h-10 border-[#C4A0D4] text-[#4A154B] hover:bg-[#FAF5FA] px-4" onClick={() => window.open(klingAvatarVideoUrl, "_blank")}>
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {klingMotionPrompt && (
                    <div className="rounded-xl bg-[#F5EFF5] border border-[#C4A0D4]/40 px-4 py-3">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#4A154B] mb-1">Prompt de movimiento (Claude)</p>
                      <p className="text-xs text-[#4A154B]/70 italic">{klingMotionPrompt}</p>
                    </div>
                  )}

                  {/* Regenerate */}
                  <Button
                    variant="ghost"
                    className="w-full rounded-2xl h-10 text-sm text-[#4A154B] hover:bg-[#FAF5FA]"
                    onClick={() => {
                      setKlingVideoStatus("idle");
                      setKlingVideoUrl("");
                      setKlingAvatarVideoUrl("");
                      setKlingAvatarScript("");
                    }}
                  >
                    <RefreshCw className="h-3.5 w-3.5 mr-2" />Generar otro video
                  </Button>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ════════════════════════════════════════════════════════ */}
        {/* IMAGEN IA TAB                                            */}
        {/* ════════════════════════════════════════════════════════ */}
        <TabsContent value="image">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Left: Config */}
            <div className="space-y-5">
              <div
                className="rounded-2xl p-5 space-y-5 shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
                style={{ border: '1.5px solid transparent', background: 'linear-gradient(#fff, #fff) padding-box, linear-gradient(135deg, #9B3FCB 0%, #4A154B 50%, #611f69 100%) border-box' }}
              >
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl" style={{ background: 'linear-gradient(135deg,#9B3FCB,#4A154B)' }}>
                    <Paintbrush className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold">Generador de imagen marketing</h3>
                    <p className="text-[11px] text-muted-foreground">Claude optimiza el prompt · Flux 1.1 Pro Ultra genera la imagen</p>
                  </div>
                </div>

                {/* Brief */}
                <div className="grid gap-2">
                  <Label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Describe la imagen que necesitas
                  </Label>
                  <Textarea
                    value={imageBrief}
                    onChange={(e) => setImageBrief(e.target.value)}
                    placeholder="Ej: Penthouse de lujo en Brickell Miami, vista panorámica al atardecer, lifestyle de alto nivel, pareja joven disfrutando la terraza..."
                    rows={4}
                    className="rounded-xl bg-white border border-[#E0E0E0] focus-visible:ring-1 focus-visible:ring-[#4A154B]/30 placeholder:text-[#AAAAAA] resize-none"
                  />
                </div>

                {/* Style preset */}
                <div className="grid gap-2">
                  <Label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Estilo visual</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: "luxury real estate, cinematic",             label: "Lujo Cinematográfico" },
                      { value: "editorial magazine photography, minimalist", label: "Editorial / Magazine" },
                      { value: "aerial drone photography, golden hour",      label: "Drone · Golden Hour" },
                      { value: "modern architecture, clean bright daylight", label: "Arquitectura Moderna" },
                    ].map((s) => (
                      <button
                        key={s.value}
                        onClick={() => setImageStyle(s.value)}
                        className={`p-2.5 rounded-xl text-xs font-semibold text-left transition-all border-2 ${
                          imageStyle === s.value
                            ? "border-[#4A154B] bg-[#F5EFF5] text-[#4A154B]"
                            : "border-[#C4A0D4] bg-white text-[#1D1C1D] hover:border-[#4A154B]"
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Generate Button */}
                <Button
                  onClick={handleGenerateImage}
                  disabled={imageGenerating || !imageBrief.trim()}
                  className="w-full gold-gradient text-white rounded-2xl h-14 font-bold border-0 hover:opacity-90 transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
                >
                  {imageGenerating ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generando imagen...</>
                  ) : (
                    <><Paintbrush className="h-4 w-4 mr-2" />Generar imagen con IA</>
                  )}
                </Button>

                {/* Powered by note */}
                <p className="text-center text-[10px] text-muted-foreground">
                  Powered by <span className="font-semibold text-[#4A154B]">Claude Sonnet</span> + <span className="font-semibold text-[#4A154B]">Flux 1.1 Pro Ultra</span>
                </p>
              </div>

              {/* Optimized prompt display */}
              {imageOptimizedPrompt && (
                <div className="rounded-2xl p-4 bg-[#F5EFF5] border border-[#C4A0D4]/40">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-3.5 w-3.5 text-[#4A154B]" />
                    <span className="text-[11px] font-bold uppercase tracking-widest text-[#4A154B]">Prompt optimizado por Claude</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed italic">{imageOptimizedPrompt}</p>
                </div>
              )}
            </div>

            {/* Right: Result */}
            <div
              className="rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.06)] overflow-hidden"
              style={{ border: '1.5px solid transparent', background: 'linear-gradient(#fff, #fff) padding-box, linear-gradient(135deg, #9B3FCB 0%, #4A154B 50%, #611f69 100%) border-box' }}
            >
              <div className="p-5 pb-3 flex items-center justify-between">
                <h3 className="text-base font-semibold">Resultado</h3>
                {generatedImageUrl && (
                  <a
                    href={generatedImageUrl}
                    download="marketing-image.jpg"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg text-[#4A154B] border border-[#C4A0D4] hover:bg-[#F5EFF5] transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" />Descargar
                  </a>
                )}
              </div>
              <div className="px-5 pb-5">
                {imageGenerating ? (
                  <div className="flex flex-col items-center justify-center aspect-video rounded-2xl bg-[#F5EFF5] gap-4">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-full border-4 border-[#C4A0D4] border-t-[#4A154B] animate-spin" />
                      <Paintbrush className="absolute inset-0 m-auto h-6 w-6 text-[#4A154B]" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-[#4A154B]">Generando imagen...</p>
                      <p className="text-xs text-muted-foreground mt-1">Claude optimiza · Flux renderiza · ~15-30s</p>
                    </div>
                  </div>
                ) : generatedImageUrl ? (
                  <div className="space-y-3">
                    <div className="relative aspect-video rounded-2xl overflow-hidden bg-black shadow-xl">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={generatedImageUrl}
                        alt="Imagen generada por IA"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-3 right-3">
                        <Badge className="bg-black/60 text-white text-[10px] backdrop-blur-sm border-0">
                          Flux 1.1 Pro Ultra · 16:9
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <a
                        href={generatedImageUrl}
                        download="marketing-image.jpg"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1"
                      >
                        <Button className="w-full gold-gradient text-white rounded-2xl h-11 font-bold border-0 hover:opacity-90">
                          <Download className="h-4 w-4 mr-2" />Descargar imagen
                        </Button>
                      </a>
                      <Button
                        variant="outline"
                        className="rounded-2xl h-11 border-[#C4A0D4] text-[#4A154B] hover:bg-[#FAF5FA] font-semibold px-4"
                        onClick={() => {
                          navigator.clipboard.writeText(generatedImageUrl);
                          toast.success("URL copiada");
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : imageRequiresKey ? (
                  <div className="flex flex-col items-center justify-center aspect-video rounded-2xl bg-amber-50 border border-amber-200 gap-3 px-6 text-center">
                    <div className="p-3 rounded-full bg-amber-100">
                      <AlertCircle className="h-6 w-6 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-amber-800">Configura tu FAL_API_KEY</p>
                      <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                        Obtén tu API key gratis en{" "}
                        <a href="https://fal.ai/dashboard" target="_blank" rel="noopener noreferrer" className="underline font-semibold">fal.ai/dashboard</a>
                        {" "}y agrégala en <code className="bg-amber-100 px-1 rounded">.env.local</code>
                      </p>
                      <p className="text-[11px] text-amber-600 mt-2 font-mono">FAL_API_KEY=tu_key_aquí</p>
                    </div>
                  </div>
                ) : imageError ? (
                  <div className="flex flex-col items-center justify-center aspect-video rounded-2xl bg-red-50 border border-red-200 gap-3">
                    <AlertCircle className="h-8 w-8 text-red-400" />
                    <p className="text-sm text-red-600 font-medium">{imageError}</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center aspect-video rounded-2xl bg-[#F5EFF5]/50 border-2 border-dashed border-[#C4A0D4]/60 gap-4">
                    <div className="p-4 rounded-2xl bg-white/80 shadow-sm">
                      <ImageIcon className="h-10 w-10 text-[#4A154B]/30" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-[#4A154B]/60">Tu imagen aparecerá aquí</p>
                      <p className="text-xs text-muted-foreground mt-1 max-w-[240px] leading-relaxed">
                        Describe la escena, selecciona el estilo y presiona generar
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="history">
          <div className="rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.06)]" style={{ border: '1.5px solid transparent', background: 'linear-gradient(#fff, #fff) padding-box, linear-gradient(135deg, #9B3FCB 0%, #4A154B 50%, #611f69 100%) border-box' }}>
            <div className="p-5 pb-3">
              <h3 className="text-base font-semibold">Contenido generado</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Haz clic en cualquier elemento para ver el detalle completo</p>
            </div>
            <div className="px-5 pb-5">
              {history.length > 0 ? (
                <div className="space-y-2">
                  {history.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setSelectedHistoryItem(item)}
                      className="w-full flex items-center justify-between p-4 rounded-2xl border border-[#C4A0D4]/40 hover:bg-[#FAF5FA] hover:-translate-y-0.5 hover:shadow-md hover:border-[#4A154B]/30 transition-all duration-200 text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl overflow-hidden bg-[#F5EFF5] flex items-center justify-center shrink-0">
                          {(item.mediaUrls as string[] | null)?.[0] ? (
                            <img src={(item.mediaUrls as string[])[0]} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Sparkles className="h-4 w-4 text-[#4A154B]/60" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate max-w-[280px]">{item.title || "Sin título"}</p>
                          <div className="flex gap-1.5 mt-0.5 flex-wrap">
                            <Badge variant="outline" className="text-[10px] rounded-full">{contentTypes.find(t => t.value === item.type)?.label || item.type}</Badge>
                            <Badge variant="outline" className="text-[10px] rounded-full">{platformsList.find(p => p.value === item.platform)?.label || item.platform}</Badge>
                            {item.property?.title && <Badge variant="outline" className="text-[10px] rounded-full text-[#4A154B] border-[#C4A0D4]">{item.property.title}</Badge>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <Badge className={`text-[10px] rounded-full ${statusColors[item.status]}`}>{statusLabels[item.status]}</Badge>
                        <span className="text-[11px] text-muted-foreground">{timeAgo(item.createdAt)}</span>
                        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/40" />
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Sparkles className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Aún no has generado contenido</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ── History Detail Modal ── */}
      {selectedHistoryItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedHistoryItem(null); }}
          style={{ background: 'rgba(10,6,10,0.65)', backdropFilter: 'blur(6px)' }}
        >
          <div
            className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white shadow-2xl"
            style={{ border: '1.5px solid transparent', background: 'linear-gradient(#fff, #fff) padding-box, linear-gradient(135deg, #9B3FCB 0%, #4A154B 50%, #611f69 100%) border-box' }}
          >
            {/* Header */}
            <div className="sticky top-0 bg-white z-10 flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#EEE8EE] rounded-t-3xl">
              <div className="min-w-0 pr-3">
                <h2 className="text-base font-bold truncate">{selectedHistoryItem.title || "Contenido generado"}</h2>
                <div className="flex gap-1.5 mt-1 flex-wrap">
                  <Badge variant="outline" className="text-[10px] rounded-full">{contentTypes.find(t => t.value === selectedHistoryItem.type)?.label || selectedHistoryItem.type}</Badge>
                  <Badge variant="outline" className="text-[10px] rounded-full">{platformsList.find(p => p.value === selectedHistoryItem.platform)?.label || selectedHistoryItem.platform}</Badge>
                  <Badge className={`text-[10px] rounded-full ${statusColors[selectedHistoryItem.status]}`}>{statusLabels[selectedHistoryItem.status]}</Badge>
                  {selectedHistoryItem.property?.title && (
                    <Badge variant="outline" className="text-[10px] rounded-full text-[#4A154B] border-[#C4A0D4]">{selectedHistoryItem.property.title}</Badge>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelectedHistoryItem(null)}
                className="shrink-0 h-8 w-8 rounded-xl bg-[#F5EFF5] hover:bg-[#EDE0ED] transition-colors flex items-center justify-center text-[#4A154B] font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* Image if exists */}
              {selectedHistoryItem.mediaUrls && selectedHistoryItem.mediaUrls[0] && (
                <div className="relative rounded-2xl overflow-hidden aspect-video bg-[#F5EFF5]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={selectedHistoryItem.mediaUrls[0]} alt="Imagen de marketing" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <div className="absolute top-2.5 right-2.5">
                    <a
                      href={selectedHistoryItem.mediaUrls[0]}
                      download="marketing.jpg"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] font-semibold text-white bg-black/40 backdrop-blur-sm px-2 py-1.5 rounded-lg hover:bg-black/60 transition-colors border border-white/20"
                    >
                      <Download className="h-3 w-3" />Descargar imagen
                    </a>
                  </div>
                </div>
              )}

              {/* Copy text */}
              {selectedHistoryItem.content && (
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Texto de la publicación</p>
                  <div className="bg-[#FAF5FA] rounded-2xl p-4 border border-[#EEE8EE]">
                    <pre className="whitespace-pre-wrap text-sm font-sans leading-relaxed text-[#1D1C1D]">{selectedHistoryItem.content}</pre>
                  </div>
                </div>
              )}

              {/* Metadata */}
              <div className="text-[11px] text-muted-foreground border-t border-[#EEE8EE] pt-3">
                Generado {timeAgo(selectedHistoryItem.createdAt)}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  className="flex-1 gold-gradient text-white rounded-2xl h-11 font-bold border-0 hover:opacity-90 shadow-lg"
                  onClick={() => {
                    if (selectedHistoryItem.content) {
                      navigator.clipboard.writeText(selectedHistoryItem.content);
                      toast.success("Copiado al portapapeles");
                    }
                  }}
                  disabled={!selectedHistoryItem.content}
                >
                  <Copy className="h-4 w-4 mr-2" />Copiar texto
                </Button>
                <Button
                  variant="outline"
                  className="rounded-2xl h-11 border-[#C4A0D4] text-[#4A154B] hover:bg-[#FAF5FA] font-semibold px-4"
                  onClick={() => setSelectedHistoryItem(null)}
                >
                  Cerrar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
