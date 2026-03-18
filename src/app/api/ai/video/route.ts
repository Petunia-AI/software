import { NextRequest, NextResponse } from "next/server";
import { requireOrganization, unauthorized } from "@/lib/auth-helpers";
import {
  generateContent,
  getPlatformAIConfig,
  getPlatformHeygenKey,
  checkAndConsumeCredits,
  logAIUsage,
} from "@/lib/ai";

const VIDEO_CREDITS = 5; // Video generation costs more

export async function POST(req: NextRequest) {
  try {
    const user = await requireOrganization();
    if (!user) return unauthorized();
    const {
      propertyTitle,
      propertyDescription,
      propertyPrice,
      propertyCurrency,
      propertyCity,
      avatarImageUrl,
      videoType,
      voiceId,
    } = await req.json();

    // Get platform AI config for script generation
    const aiConfig = await getPlatformAIConfig();

    // Get platform HeyGen key (centralized)
    const heygenApiKey = await getPlatformHeygenKey();
    if (!heygenApiKey) {
      return NextResponse.json(
        { error: "El servicio de video IA no está configurado. Contacta al administrador." },
        { status: 503 }
      );
    }

    if (!avatarImageUrl) {
      return NextResponse.json(
        { error: "Selecciona o genera un avatar primero" },
        { status: 400 }
      );
    }

    // Check credits
    const credits = await checkAndConsumeCredits(user.organizationId, VIDEO_CREDITS);
    if (!credits.allowed) {
      return NextResponse.json(
        {
          error: `No tienes suficientes créditos (necesitas ${VIDEO_CREDITS}). Te quedan ${credits.remaining} de ${credits.limit}.`,
          creditsRemaining: credits.remaining,
          creditsLimit: credits.limit,
        },
        { status: 429 }
      );
    }

    // Step 1: Generate the video script with AI
    const durationGuide = videoType === "story"
      ? "15 segundos máximo (2-3 oraciones cortas y directas)"
      : "30-45 segundos (5-7 oraciones, con hook inicial, desarrollo y CTA)";

    const scriptPrompt = `Genera un guion de video publicitario inmobiliario para un agente hablando a cámara.

PROPIEDAD:
- Título: ${propertyTitle || "Propiedad exclusiva"}
${propertyDescription ? `- Descripción: ${propertyDescription}` : ""}
${propertyPrice ? `- Precio: ${propertyCurrency || "USD"} ${propertyPrice}` : ""}
${propertyCity ? `- Ubicación: ${propertyCity}` : ""}

FORMATO: ${videoType === "story" ? "Instagram Story / TikTok Story" : "Reel / TikTok"}
DURACIÓN: ${durationGuide}

REQUISITOS:
1. Hook inicial impactante (primera oración debe captar atención)
2. Hablar en primera persona como agente inmobiliario
3. Mencionar beneficios clave de la propiedad
4. Cerrar con llamado a la acción claro (contactar, escribir, agendar visita)
5. Tono profesional pero cercano y entusiasta
6. Todo en ESPAÑOL

Genera SOLO el texto que el avatar va a decir. Sin indicaciones de escena, sin emojis, sin formato especial. Solo el texto hablado.`;

    let script: string;

    if (aiConfig) {
      script = await generateContent({
        provider: aiConfig.provider,
        apiKey: aiConfig.apiKey,
        model: aiConfig.model,
        prompt: scriptPrompt,
        systemPrompt: "Eres un copywriter experto en videos publicitarios inmobiliarios de alta conversión. Generas guiones naturales, persuasivos y optimizados para redes sociales. Responde SOLO con el texto del guion.",
        maxTokens: 500,
      });
    } else {
      // Fallback demo script
      script = `¡Hola! Tengo una propiedad increíble que no te puedes perder. ${propertyTitle || "Esta propiedad exclusiva"} ${propertyCity ? `ubicada en ${propertyCity}` : ""} es exactamente lo que estás buscando. ${propertyPrice ? `Con un precio de ${propertyCurrency || "USD"} ${propertyPrice}, ` : ""}es una oportunidad única en el mercado. Escríbeme ahora para agendar tu visita privada. ¡No dejes pasar esta oportunidad!`;
    }

    // Step 2: Fetch a Spanish voice if none provided
    let resolvedVoiceId = voiceId;
    if (!resolvedVoiceId) {
      try {
        const voicesRes = await fetch("https://api.heygen.com/v2/voices", {
          headers: { "X-Api-Key": heygenApiKey },
        });
        if (voicesRes.ok) {
          const voicesData = await voicesRes.json();
          const voices = voicesData.data?.voices || [];
          const spanishVoice = voices.find(
            (v: any) => v.language === "Spanish" || v.language?.startsWith("es")
          );
          if (spanishVoice) {
            resolvedVoiceId = spanishVoice.voice_id;
          }
        }
      } catch {
        // Fall through to default
      }
    }

    // Step 3: Create video with HeyGen API
    const videoPayload = {
      video_inputs: [
        {
          character: {
            type: "talking_photo",
            talking_photo_url: avatarImageUrl,
          },
          voice: {
            type: "text",
            input_text: script,
            ...(resolvedVoiceId ? { voice_id: resolvedVoiceId } : { voice_id: "en_us_male_1" }),
            speed: 1.0,
          },
          background: {
            type: "color",
            value: "#ffffff",
          },
        },
      ],
      dimension: { width: 1080, height: 1920 },
      test: false,
    };

    const heygenRes = await fetch("https://api.heygen.com/v2/video/generate", {
      method: "POST",
      headers: {
        "X-Api-Key": heygenApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(videoPayload),
    });

    if (!heygenRes.ok) {
      const errData = await heygenRes.json().catch(() => ({}));
      console.error("HeyGen API error:", errData);
      return NextResponse.json(
        { error: errData.message || "Error al generar el video con HeyGen" },
        { status: 500 }
      );
    }

    const heygenData = await heygenRes.json();
    const videoId = heygenData.data?.video_id;

    if (!videoId) {
      return NextResponse.json(
        { error: "No se recibió un ID de video de HeyGen" },
        { status: 500 }
      );
    }

    // Log usage
    await logAIUsage({
      organizationId: user.organizationId,
      userId: user.id,
      type: "VIDEO_SCRIPT",
      creditsUsed: VIDEO_CREDITS,
      provider: aiConfig?.provider ?? "openai",
      model: aiConfig?.model,
      endpoint: "/api/ai/video",
    });

    return NextResponse.json({
      videoId,
      script,
      status: "processing",
      creditsRemaining: credits.remaining,
      message: "Video en proceso de generación. Consulta el estado con el videoId.",
    });
  } catch (error) {
    console.error("Video generation error:", error);
    return NextResponse.json(
      { error: "Error al generar el video" },
      { status: 500 }
    );
  }
}
