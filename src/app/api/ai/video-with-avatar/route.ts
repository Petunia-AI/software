import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { fal } from "@fal-ai/client";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * POST /api/ai/video-with-avatar
 *
 * Generates a talking-avatar video for a specific property.
 * Uses Claude to write a property-specific presenter script,
 * then uses VEED Fabric 1.0 to generate the avatar video.
 *
 * Body:
 *   sourceImageUrl  — face photo of the avatar (from SavedAvatar.sourceImageUrl)
 *   voiceDescription? — voice style (from saved avatar)
 *   resolution?      — "480p" | "720p" (default: "480p")
 *   propertyTitle?   — property name
 *   propertyPrice?   — price string
 *   propertyCity?    — city/location
 *   propertyDesc?    — property description
 */
export async function POST(req: NextRequest) {
  try {
    const {
      sourceImageUrl,
      voiceDescription,
      resolution = "480p",
      propertyTitle,
      propertyPrice,
      propertyCity,
      propertyDesc,
    } = await req.json();

    if (!sourceImageUrl?.trim()) {
      return NextResponse.json({ error: "Se requiere la foto del avatar" }, { status: 400 });
    }

    const falKey = process.env.FAL_API_KEY;
    if (!falKey) {
      return NextResponse.json({ error: "FAL_API_KEY no configurada" }, { status: 402 });
    }

    // ── 1. Claude writes a property-specific presenter script ─────────
    const propertyInfo = [
      propertyTitle && `Propiedad: ${propertyTitle}`,
      propertyCity  && `Ubicación: ${propertyCity}`,
      propertyPrice && `Precio: ${propertyPrice}`,
      propertyDesc  && `Detalles: ${propertyDesc}`,
    ].filter(Boolean).join(". ");

    const { content } = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 200,
      messages: [{
        role: "user",
        content: `Eres un agente de bienes raíces carismático y profesional.

Escribe un guion de presentación corto (20-30 segundos, máximo 65 palabras) para presentar esta propiedad en video:

${propertyInfo || "Una hermosa propiedad residencial de lujo"}

Requisitos:
- Habla directamente a la cámara, en primera persona
- Menciona características atractivas de la propiedad
- Termina con un call-to-action claro: "¡Contáctame hoy!"
- Tono: profesional, entusiasta, confiable
- Idioma: español
- Devuelve ÚNICAMENTE el texto que dirá el presentador, sin etiquetas ni indicaciones de escena`,
      }],
    });

    const script =
      content[0].type === "text"
        ? content[0].text.trim()
        : `¡Hola! Te presento ${propertyTitle || "esta increíble propiedad"}${propertyCity ? ` en ${propertyCity}` : ""}. ${propertyDesc ? propertyDesc.slice(0, 80) + "..." : "Un espacio único con acabados de primer nivel."} ${propertyPrice ? `Precio: ${propertyPrice}.` : ""} ¡Contáctame hoy!`;

    // ── 2. Upload source image to FAL storage if base64 ───────────────
    fal.config({ credentials: falKey });

    let finalImageUrl = sourceImageUrl;
    if (sourceImageUrl.startsWith("data:")) {
      const [meta, base64Data] = sourceImageUrl.split(",");
      const mimeType = meta.match(/:(.*?);/)?.[1] || "image/jpeg";
      const buffer = Buffer.from(base64Data, "base64");
      const blob = new Blob([buffer], { type: mimeType });
      finalImageUrl = await fal.storage.upload(blob);
    }

    // ── 3. VEED Fabric generates the avatar video ─────────────────────
    const input: Record<string, unknown> = {
      image_url: finalImageUrl,
      text: script,
      resolution,
    };
    if (voiceDescription?.trim()) {
      input.voice_description = voiceDescription.trim();
    }

    const result = await fal.subscribe("veed/fabric-1.0/text", {
      input: input as any,
      logs: false,
    });

    const video = (result.data as any)?.video;
    if (!video?.url) {
      return NextResponse.json({ error: "No se obtuvo video del avatar" }, { status: 500 });
    }

    return NextResponse.json({
      videoUrl: video.url,
      script,
    });
  } catch (err: any) {
    console.error("Video with avatar error:", err);
    return NextResponse.json({ error: err.message || "Error generando el video con avatar" }, { status: 500 });
  }
}
