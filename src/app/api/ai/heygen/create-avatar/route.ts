import { NextRequest, NextResponse } from "next/server";
import { requireOrganization, unauthorized } from "@/lib/auth-helpers";
import { getPlatformHeygenKey, checkAndConsumeCredits, logAIUsage } from "@/lib/ai";
import { prisma } from "@/lib/prisma";
import { createPhotoAvatar } from "@/lib/heygen";
import type { HeyGenPhotoAvatarRequest } from "@/lib/heygen";

const AVATAR_CREDITS = 5;

// Maps from the UI config values to HeyGen API enums
const AGE_MAP: Record<string, HeyGenPhotoAvatarRequest["age"]> = {
  "25-30": "Young Adult",
  "30-35": "Young Adult",
  "35-40": "Early Middle Age",
  "40-50": "Late Middle Age",
  "50-60": "Senior",
};

const GENDER_MAP: Record<string, HeyGenPhotoAvatarRequest["gender"]> = {
  male: "Man",
  female: "Woman",
};

const ETHNICITY_MAP: Record<string, HeyGenPhotoAvatarRequest["ethnicity"]> = {
  latin: "Latino/Hispanic",
  caucasian: "White",
  african: "Black",
  asian: "East Asian",
  middle_eastern: "Middle Eastern",
  mixed: "Mixed",
};

const POSE_MAP: Record<string, HeyGenPhotoAvatarRequest["pose"]> = {
  headshot: "close_up",
  half_body: "half_body",
  crossed_arms: "half_body",
  leaning: "half_body",
  full_body: "full_body",
};

/**
 * POST /api/ai/heygen/create-avatar
 * Creates a HeyGen Photo Avatar from the UI configuration.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireOrganization();
    if (!user) return unauthorized();

    // Resolve HeyGen API key: platform config → env variable
    let apiKey = await getPlatformHeygenKey();
    if (!apiKey) apiKey = process.env.HEYGEN_API_KEY ?? null;

    if (!apiKey) {
      return NextResponse.json(
        { error: "HeyGen no está configurado. Contacta al administrador." },
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

    const body = await req.json();
    const {
      gender,
      ageRange,
      ethnicity,
      attire,
      expression,
      background,
      pose,
      accessories,
      hairStyle,
      hairColor,
    } = body;

    // Build the appearance prompt (max 1000 chars)
    const parts: string[] = [];
    if (attire) parts.push(`Vestimenta: ${attire}`);
    if (expression) parts.push(`Expresión: ${expression}`);
    if (background) parts.push(`Fondo: ${background}`);
    if (hairStyle) parts.push(`Cabello: ${hairStyle}`);
    if (hairColor) parts.push(`Color de cabello: ${hairColor}`);
    if (accessories) parts.push(`Accesorios: ${accessories}`);
    parts.push("Estilo profesional de broker inmobiliario, iluminación de estudio, foto corporativa de alta calidad");
    const appearance = parts.join(". ").slice(0, 1000);

    const avatarName = `Avatar ${gender === "male" ? "M" : "F"} - ${user.organizationId.slice(-4)}`;

    const heygenParams: HeyGenPhotoAvatarRequest = {
      name: avatarName,
      age: AGE_MAP[ageRange] || "Early Middle Age",
      gender: GENDER_MAP[gender] || "Unspecified",
      ethnicity: ETHNICITY_MAP[ethnicity] || "Unspecified",
      orientation: "square",
      pose: POSE_MAP[pose] || "half_body",
      style: "Realistic",
      appearance,
    };

    // Call HeyGen API
    const result = await createPhotoAvatar(apiKey, heygenParams);

    // Save avatar record in DB
    const avatar = await prisma.heyGenAvatar.create({
      data: {
        organizationId: user.organizationId,
        createdById: user.id,
        name: avatarName,
        generationId: result.generation_id,
        status: "GENERATING",
        gender: heygenParams.gender,
        age: heygenParams.age,
        ethnicity: heygenParams.ethnicity,
        style: heygenParams.style,
        pose: heygenParams.pose,
        appearance,
        metadata: body,
      },
    });

    // Log usage
    await logAIUsage({
      organizationId: user.organizationId,
      userId: user.id,
      type: "AVATAR_GENERATION",
      creditsUsed: AVATAR_CREDITS,
      provider: "openai", // logged under same type
      model: "heygen-photo-avatar",
      endpoint: "/api/ai/heygen/create-avatar",
    });

    return NextResponse.json({
      avatarId: avatar.id,
      generationId: result.generation_id,
      status: "GENERATING",
      creditsRemaining: credits.remaining,
    });
  } catch (error: any) {
    console.error("HeyGen create-avatar error:", error);
    const message = error?.message || "Error al crear el avatar con HeyGen";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
