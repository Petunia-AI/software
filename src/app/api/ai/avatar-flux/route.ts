import { NextRequest, NextResponse } from "next/server";
import { requireOrganization, unauthorized } from "@/lib/auth-helpers";
import { checkAndConsumeCredits, logAIUsage } from "@/lib/ai";
import { prisma } from "@/lib/prisma";

const AVATAR_CREDITS = 5;

export async function POST(req: NextRequest) {
  try {
    const user = await requireOrganization();
    if (!user) return unauthorized();

    const {
      gender,
      ageRange,
      ethnicity,
      hairStyle,
      hairColor,
      attire,
      expression,
      background,
      pose,
      accessories,
    } = await req.json();

    // Get fal.ai key from platform config or env
    let falKey: string | undefined;

    const platformConfig = await prisma.platformAIConfig.findFirst({
      where: { isActive: true },
    });
    if (platformConfig?.falApiKey) {
      falKey = platformConfig.falApiKey;
    } else if (process.env.FAL_AI_API_KEY) {
      falKey = process.env.FAL_AI_API_KEY;
    }

    if (!falKey) {
      return NextResponse.json(
        { error: "El servicio de generación FLUX no está configurado. Contacta al administrador." },
        { status: 503 }
      );
    }

    // Check credits
    const credits = await checkAndConsumeCredits(user.organizationId, AVATAR_CREDITS);
    if (!credits.allowed) {
      return NextResponse.json(
        {
          error: `No tienes suficientes créditos (necesitas ${AVATAR_CREDITS}). Te quedan ${credits.remaining} de ${credits.limit}.`,
          creditsRemaining: credits.remaining,
          creditsLimit: credits.limit,
        },
        { status: 429 }
      );
    }

    const genderDesc = gender === "male" ? "man" : gender === "female" ? "woman" : "person";
    const ageDesc: Record<string, string> = {
      "25-30": "25-30 years old, young professional",
      "30-35": "30-35 years old",
      "35-40": "35-40 years old",
      "40-50": "40-50 years old, experienced",
      "50-60": "50-60 years old, senior executive",
    };
    const ethnicityDesc: Record<string, string> = {
      latin: "Latino/Latina, light brown skin",
      caucasian: "Caucasian, fair skin",
      african: "African descent, dark skin",
      asian: "East Asian",
      middle_eastern: "Middle Eastern",
      mixed: "mixed ethnicity",
    };
    const attireDesc: Record<string, string> = {
      formal_suit: "wearing a dark formal executive suit with tie, crisp white dress shirt",
      business_casual: "wearing smart casual, elegant blazer without tie, dress shirt",
      luxury_casual: "wearing luxury casual clothing, premium polo or linen shirt",
      modern_formal: "wearing a modern slim fit suit, no tie, contemporary look",
      power_suit: "wearing a designer power suit, high-level corporate executive look",
    };
    const bgDesc: Record<string, string> = {
      office_luxury: "modern luxury office with panoramic windows and city in the background",
      white_clean: "clean white professional studio background",
      property_exterior: "in front of a modern luxury property with impressive architecture",
      city_skyline: "rooftop terrace with modern city skyline at sunset",
      gradient_gold: "soft premium golden gradient background",
      neutral_gray: "professional neutral gray studio background",
    };
    const poseDesc: Record<string, string> = {
      headshot: "professional headshot portrait, shoulders and head, looking at camera",
      half_body: "half body portrait, confident and professional posture",
      crossed_arms: "arms crossed confidently, power pose",
      leaning: "casually leaning on a surface, relaxed but professional",
    };
    const expressionDesc: Record<string, string> = {
      confident_smile: "confident warm smile, direct eye contact with camera",
      serious_professional: "serious professional expression, firm determined gaze",
      friendly_approachable: "friendly approachable expression, natural smile",
      warm_trustworthy: "warm expression conveying trust and closeness",
    };
    const hairDesc: Record<string, string> = {
      short_classic: "classic short hair",
      short_modern: "modern short hairstyle",
      medium_styled: "medium length styled hair",
      long_straight: "long straight hair",
      long_wavy: "long wavy hair",
      slicked_back: "slicked back hair",
      curly: "curly hair",
      bald: "bald",
    };
    const hairColorDesc: Record<string, string> = {
      black: "black",
      dark_brown: "dark brown",
      light_brown: "light brown",
      blonde: "blonde",
      gray: "gray/silver",
      red: "red/auburn",
    };

    const prompt = `Ultra-realistic professional portrait photograph of a ${genderDesc}, ${ageDesc[ageRange] || ageRange}, ${ethnicityDesc[ethnicity] || ethnicity}. ${hairDesc[hairStyle] || hairStyle} ${hairColorDesc[hairColor] || hairColor} hair. ${attireDesc[attire] || attire}. ${expressionDesc[expression] || expression}. ${poseDesc[pose] || pose}. ${bgDesc[background] || background}. ${accessories ? `Accessories: ${accessories}.` : ""} Shot on Canon EOS R5 with 85mm f/1.4 lens, Rembrandt lighting with soft fill, shallow depth of field. Professional corporate headshot quality, premium business magazine style. Real photograph, NOT a 3D render, NOT an illustration. Photorealistic, hyper-detailed skin texture, natural colors.`;

    const response = await fetch("https://queue.fal.run/fal-ai/flux-pro/v1.1-ultra", {
      method: "POST",
      headers: {
        Authorization: `Key ${falKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        image_size: "square_hd",
        num_images: 1,
        safety_tolerance: "5",
        output_format: "jpeg",
        raw: true,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const errMsg = (errData as any)?.detail || `Error de fal.ai: ${response.status}`;
      return NextResponse.json({ error: errMsg }, { status: response.status });
    }

    const data = await response.json();
    const imageUrl = data?.images?.[0]?.url;

    if (!imageUrl) {
      return NextResponse.json(
        { error: "No se pudo obtener la imagen generada de FLUX" },
        { status: 500 }
      );
    }

    // Log usage
    await logAIUsage({
      organizationId: user.organizationId,
      userId: user.id,
      type: "AVATAR_GENERATION",
      creditsUsed: AVATAR_CREDITS,
      provider: "flux",
      model: "flux-pro-v1.1-ultra",
      endpoint: "/api/ai/avatar-flux",
    });

    return NextResponse.json({
      image: imageUrl,
      creditsRemaining: credits.remaining,
    });
  } catch (error: any) {
    console.error("FLUX avatar generation error:", error);
    const message =
      error?.message || "Error al generar el avatar con FLUX";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
