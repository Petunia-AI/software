import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { requireOrganization, unauthorized } from "@/lib/auth-helpers";
import { checkAndConsumeCredits, logAIUsage } from "@/lib/ai";
import { prisma } from "@/lib/prisma";

const AVATAR_CREDITS = 5; // Avatar generation is expensive

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

    // Avatar generation requires OpenAI specifically for image gen
    // First try platform config, then env variable
    let openaiKey: string | undefined;

    const platformConfig = await prisma.platformAIConfig.findFirst({
      where: { isActive: true, provider: "OPENAI" },
    });
    if (platformConfig) {
      openaiKey = platformConfig.apiKey;
    } else if (process.env.OPENAI_API_KEY) {
      openaiKey = process.env.OPENAI_API_KEY;
    }

    if (!openaiKey) {
      return NextResponse.json(
        { error: "La generación de avatares requiere OpenAI. Contacta al administrador." },
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

    const client = new OpenAI({ apiKey: openaiKey });

    const genderDesc = gender === "male" ? "hombre" : gender === "female" ? "mujer" : "persona";
    const ageDesc: Record<string, string> = {
      "25-30": "de 25 a 30 años, joven profesional",
      "30-35": "de 30 a 35 años",
      "35-40": "de 35 a 40 años",
      "40-50": "de 40 a 50 años, experimentado",
      "50-60": "de 50 a 60 años, senior ejecutivo",
    };
    const ethnicityDesc: Record<string, string> = {
      latin: "latino/latina, piel morena clara",
      caucasian: "caucásico/caucásica, piel clara",
      african: "afrodescendiente",
      asian: "asiático/asiática",
      middle_eastern: "medio oriente",
      mixed: "mestizo/mestiza",
    };
    const attireDesc: Record<string, string> = {
      formal_suit: "traje formal ejecutivo oscuro con corbata, camisa blanca impecable",
      business_casual: "smart casual elegante, blazer sin corbata, camisa de vestir",
      luxury_casual: "ropa casual de lujo, polo premium o camisa de lino",
      modern_formal: "traje moderno slim fit, sin corbata, look contemporáneo",
      power_suit: "power suit de diseñador, look de alto ejecutivo corporativo",
    };
    const bgDesc: Record<string, string> = {
      office_luxury: "oficina moderna de lujo con ventanales panorámicos y ciudad de fondo",
      white_clean: "fondo blanco limpio profesional de estudio fotográfico",
      property_exterior: "frente a una propiedad de lujo moderna con arquitectura impresionante",
      city_skyline: "terraza con skyline de ciudad moderna al atardecer",
      gradient_gold: "fondo degradado dorado premium suave",
      neutral_gray: "fondo gris neutro profesional de estudio",
    };
    const poseDesc: Record<string, string> = {
      headshot: "retrato headshot profesional, hombros y cabeza, mirando a cámara",
      half_body: "retrato de medio cuerpo, postura segura y profesional",
      crossed_arms: "brazos cruzados con confianza, postura de poder",
      leaning: "apoyado casualmente en una superficie, relajado pero profesional",
    };
    const expressionDesc: Record<string, string> = {
      confident_smile: "sonrisa segura y cálida, mirada directa a cámara",
      serious_professional: "expresión seria profesional, mirada firme y determinada",
      friendly_approachable: "expresión amigable y accesible, sonrisa natural",
      warm_trustworthy: "expresión cálida que transmite confianza y cercanía",
    };

    const prompt = `Fotografía profesional de retrato ULTRA REALISTA de alta resolución.

SUJETO: ${genderDesc} ${ageDesc[ageRange] || ageRange}, ${ethnicityDesc[ethnicity] || ethnicity}.

CABELLO: ${hairStyle || "peinado profesional moderno"}, color ${hairColor || "natural"}.

VESTIMENTA: ${attireDesc[attire] || attire}.

EXPRESIÓN: ${expressionDesc[expression] || expression}.

POSE: ${poseDesc[pose] || pose}.

FONDO: ${bgDesc[background] || background}.

${accessories ? `ACCESORIOS: ${accessories}` : ""}

ESTILO FOTOGRÁFICO: Foto de retrato corporativo de revista de negocios premium. Iluminación de estudio profesional tipo Rembrandt con fill light suave. Profundidad de campo reducida (f/2.8). Calidad de cámara Canon EOS R5 con lente 85mm. Piel natural con textura realista, sin filtros excesivos. Colores ricos y naturales. La persona debe verse como un broker inmobiliario de alto nivel, exitoso y confiable. NO es una ilustración, NO es un render 3D, es una FOTOGRAFÍA REAL de estudio profesional.`;

    const response = await client.images.generate({
      model: "gpt-image-1",
      prompt,
      n: 1,
      size: "1024x1024",
      quality: "high",
    });

    const result = response.data?.[0];
    if (!result) {
      return NextResponse.json(
        { error: "No se pudo generar la imagen" },
        { status: 500 }
      );
    }

    const image = result.b64_json
      ? `data:image/png;base64,${result.b64_json}`
      : (result as any).url;

    if (!image) {
      return NextResponse.json(
        { error: "No se pudo obtener la imagen generada" },
        { status: 500 }
      );
    }

    // Log usage
    await logAIUsage({
      organizationId: user.organizationId,
      userId: user.id,
      type: "AVATAR_GENERATION",
      creditsUsed: AVATAR_CREDITS,
      provider: "openai",
      model: "gpt-image-1",
      endpoint: "/api/ai/avatar",
    });

    return NextResponse.json({
      image,
      creditsRemaining: credits.remaining,
    });
  } catch (error: any) {
    console.error("Avatar generation error:", error);
    const message =
      error?.error?.message || error?.message || "Error al generar el avatar";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
