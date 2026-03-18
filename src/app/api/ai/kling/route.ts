import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { fal } from "@fal-ai/client";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const {
      imageUrl,
      propertyTitle,
      propertyPrice,
      propertyCity,
      propertyDesc,
      videoType = "reel",  // "reel" = 9:16 | "landscape" = 16:9
      duration = "5",
      customPrompt,
    } = await req.json();

    if (!imageUrl) {
      return NextResponse.json({ error: "Se requiere una imagen de origen" }, { status: 400 });
    }

    const falKey = process.env.FAL_API_KEY;
    if (!falKey) {
      return NextResponse.json({ error: "FAL_API_KEY no configurada", requiresKey: true }, { status: 402 });
    }

    // ── 1. Claude generates a cinematic motion prompt ─────────────────
    const propertyInfo = [
      propertyTitle && `Property: ${propertyTitle}`,
      propertyCity  && `Location: ${propertyCity}`,
      propertyPrice && `Price: ${propertyPrice}`,
      propertyDesc  && `Details: ${propertyDesc}`,
      customPrompt  && `Special instructions: ${customPrompt}`,
    ].filter(Boolean).join(". ");

    const aspectRatio = videoType === "reel" ? "9:16" : "16:9";

    const { content } = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 300,
      messages: [{
        role: "user",
        content: `You are a cinematic video director specializing in luxury real estate marketing videos.

Write a Kling AI image-to-video motion prompt for this property: ${propertyInfo || "luxury real estate property"}

The video format is ${aspectRatio} (${videoType === "reel" ? "vertical Reel/TikTok" : "horizontal cinematic"}).

Requirements:
- Describe ONLY camera movement and scene motion — no text, no logos
- Use cinematic language: "slow dolly push in", "gentle parallax drift", "subtle floating motion", "slow pan revealing", etc.
- The motion should feel aspirational and premium, like a luxury property showcase
- Keep it realistic for AI video generation — subtle movements work best
- Duration: ${duration} seconds

Return ONLY the motion prompt (2-3 sentences max). No explanation.`,
      }],
    });

    const motionPrompt = content[0].type === "text" ? content[0].text.trim() : "Slow cinematic dolly push in, subtle ambient parallax motion, warm golden light shift, ultra-smooth camera movement, luxury real estate showcase feel.";

    // ── 2. Generate video with Kling ──────────────────────────────────
    fal.config({ credentials: falKey });

    const result = await fal.subscribe("fal-ai/kling-video/v2.1/pro/image-to-video", {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      input: {
        prompt: motionPrompt,
        image_url: imageUrl,
        duration,
        aspect_ratio: aspectRatio,
        negative_prompt: "text, watermark, logo, blur, distortion, ugly, low quality, shaky camera, fast movement",
      } as any,
      logs: false,
    });

    const video = (result.data as any).video;
    if (!video?.url) {
      return NextResponse.json({ error: "No se obtuvo video de Kling" }, { status: 500 });
    }

    return NextResponse.json({
      videoUrl: video.url,
      motionPrompt,
      duration: video.duration || duration,
      aspectRatio,
    });
  } catch (err: any) {
    console.error("Kling video error:", err);
    return NextResponse.json({ error: err.message || "Error generando video" }, { status: 500 });
  }
}
