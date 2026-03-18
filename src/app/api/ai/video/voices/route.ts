import { NextResponse } from "next/server";
import { requireOrganization, unauthorized } from "@/lib/auth-helpers";
import { getPlatformHeygenKey } from "@/lib/ai";

export async function GET() {
  try {
    const _user = await requireOrganization();
    if (!_user) return unauthorized();

    const apiKey = await getPlatformHeygenKey();
    if (!apiKey) {
      return NextResponse.json(
        { error: "El servicio de video IA no está configurado. Contacta al administrador." },
        { status: 503 }
      );
    }

    const res = await fetch("https://api.heygen.com/v2/voices", {
      headers: { "X-Api-Key": apiKey },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Error al obtener voces de HeyGen" },
        { status: 500 }
      );
    }

    const data = await res.json();
    const allVoices = data.data?.voices || [];

    // Filter for Spanish voices and map to simple format
    const spanishVoices = allVoices
      .filter(
        (v: any) =>
          v.language === "Spanish" ||
          v.language?.toLowerCase().includes("spanish") ||
          v.language?.startsWith("es")
      )
      .map((v: any) => ({
        voice_id: v.voice_id,
        name: v.name || v.display_name || "Voz",
        gender: v.gender || "unknown",
        language: v.language,
        preview_audio: v.preview_audio || null,
      }));

    return NextResponse.json({ voices: spanishVoices });
  } catch (error) {
    console.error("Voices fetch error:", error);
    return NextResponse.json(
      { error: "Error al obtener las voces" },
      { status: 500 }
    );
  }
}
