import { NextRequest, NextResponse } from "next/server";
import { fal } from "@fal-ai/client";

export async function POST(req: NextRequest) {
  try {
    const {
      imageUrl,
      textInput,
      voiceDescription,
      resolution = "480p",
    } = await req.json();

    if (!imageUrl?.trim()) {
      return NextResponse.json({ error: "Se requiere la URL o imagen del avatar" }, { status: 400 });
    }
    if (!textInput?.trim()) {
      return NextResponse.json({ error: "Se requiere el guion de texto" }, { status: 400 });
    }

    const falKey = process.env.FAL_API_KEY;
    if (!falKey) {
      return NextResponse.json({ error: "FAL_API_KEY no configurada", requiresKey: true }, { status: 402 });
    }

    fal.config({ credentials: falKey });

    // VEED Fabric requires a public URL — if the client sent a base64 data URL,
    // upload it to FAL storage first to get a public URL.
    let finalImageUrl = imageUrl;
    if (imageUrl.startsWith("data:")) {
      const [meta, base64Data] = imageUrl.split(",");
      const mimeType = meta.match(/:(.*?);/)?.[1] || "image/jpeg";
      const buffer = Buffer.from(base64Data, "base64");
      const blob = new Blob([buffer], { type: mimeType });
      finalImageUrl = await fal.storage.upload(blob);
    }

    const input: Record<string, unknown> = {
      image_url: finalImageUrl,
      text: textInput,
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
      return NextResponse.json({ error: "No se obtuvo video del servicio" }, { status: 500 });
    }

    return NextResponse.json({
      videoUrl: video.url,
      fileSize: video.file_size,
    });
  } catch (err: any) {
    console.error("VEED Fabric avatar error:", err);
    return NextResponse.json({ error: err.message || "Error generando el video avatar" }, { status: 500 });
  }
}
