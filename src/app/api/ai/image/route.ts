import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { fal } from "@fal-ai/client";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { brief, style = "luxury real estate" } = await req.json();

    if (!brief) {
      return NextResponse.json({ error: "Se requiere un brief" }, { status: 400 });
    }

    // ── 1. Claude optimizes the prompt for Flux ────────────────────────
    const { content } = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 700,
      messages: [
        {
          role: "user",
          content: `You are a world-class real estate marketing visual director and Flux AI prompt engineer. Your prompts produce images indistinguishable from $20,000 professional architectural photo shoots.

Create an ultra-detailed Flux image generation prompt for this real estate property:
"${brief}"

Visual style reference: ${style}

Your prompt MUST weave together ALL of these elements into one cohesive, richly descriptive paragraph:

1. PROPERTY TYPE & ARCHITECTURE: Specific architectural style, key structural features, materials (glass, concrete, marble, wood)
2. SCENE: Interior or exterior? Which room/area? Time of day (golden hour, blue hour, midday, dusk)
3. CINEMATIC LIGHTING: Precise light description — direction, quality, color temperature (e.g. "warm 4000K golden-hour sunlight streaming through full-height glass walls casting long dramatic shadows across polished Calacatta marble floors")
4. CAMERA POSITION: Exact angle, height, lens focal length (e.g. "shot with 24mm wide-angle lens from a low 1-meter height, slight upward tilt, capturing full double-height ceiling")
5. LUXURY DETAILS IN FRAME: Premium finishes, branded appliances, designer furniture, panoramic views, pool, terrace
6. ATMOSPHERE: Emotional quality — aspirational, serene, powerful, intimate, expansive
7. COLOR GRADE: Specific post-processing style (e.g. "Lightroom editorial warm preset — lifted shadows, airy highlights, muted teal tones, rich golden mid-tones, slight vignette")
8. TECHNICAL QUALITY: "Phase One IQ4 150MP medium format camera, Schneider Kreuznach 28mm lens, ultra-sharp, photorealistic, 8K resolution, HDR, professional architectural photography"

ABSOLUTE RULES:
- NO text, signs, watermarks, typography, logos, or numbers visible anywhere in the image
- NO visible people, faces, or human figures (lifestyle scenes may have blurred background figures only if essential)
- This must look like a cover shoot for Architectural Digest, Robb Report, or a Sotheby's International Realty campaign
- The image must make the viewer immediately want to live there

Return ONLY the Flux prompt as a single dense paragraph. No explanations, no headers, no bullet points.`,
        },
      ],
    });

    const imagePrompt = content[0].type === "text" ? content[0].text.trim() : brief;

    // ── 2. Check FAL key ──────────────────────────────────────────────
    const falKey = process.env.FAL_API_KEY;
    if (!falKey) {
      // Return the optimized prompt so the user can see what would be generated
      return NextResponse.json(
        {
          error: "FAL_API_KEY no configurada",
          optimizedPrompt: imagePrompt,
          requiresKey: true,
        },
        { status: 402 }
      );
    }

    // ── 3. Flux 1.1 Pro Ultra generates the image ─────────────────────
    fal.config({ credentials: falKey });

    const result = await fal.subscribe("fal-ai/flux-pro/v1.1-ultra", {
      input: {
        prompt: imagePrompt,
        num_images: 1,
        enable_safety_checker: true,
        safety_tolerance: "2",
        output_format: "jpeg",
        aspect_ratio: "16:9",
      },
    });

    const img = (result.data as any).images?.[0];
    if (!img?.url) {
      return NextResponse.json({ error: "No se obtuvo imagen de Flux" }, { status: 500 });
    }

    return NextResponse.json({
      imageUrl: img.url,
      width: img.width,
      height: img.height,
      optimizedPrompt: imagePrompt,
    });
  } catch (err: any) {
    console.error("[ai/image]", err);
    return NextResponse.json(
      { error: err?.message || "Error interno al generar imagen" },
      { status: 500 }
    );
  }
}
