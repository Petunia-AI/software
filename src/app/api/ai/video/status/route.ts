import { NextRequest, NextResponse } from "next/server";
import { requireOrganization, unauthorized } from "@/lib/auth-helpers";
import { getPlatformHeygenKey } from "@/lib/ai";

export async function GET(req: NextRequest) {
  try {
    const _user = await requireOrganization();
    if (!_user) return unauthorized();

    const videoId = req.nextUrl.searchParams.get("videoId");
    if (!videoId) {
      return NextResponse.json(
        { error: "videoId es requerido" },
        { status: 400 }
      );
    }

    const heygenApiKey = await getPlatformHeygenKey();
    if (!heygenApiKey) {
      return NextResponse.json(
        { error: "El servicio de video IA no está configurado." },
        { status: 503 }
      );
    }

    const res = await fetch(
      `https://api.heygen.com/v1/video_status.get?video_id=${videoId}`,
      {
        headers: {
          "X-Api-Key": heygenApiKey,
        },
      }
    );

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: errData.message || "Error al consultar estado del video" },
        { status: 500 }
      );
    }

    const data = await res.json();
    const videoData = data.data;

    return NextResponse.json({
      status: videoData.status,
      videoUrl: videoData.video_url || null,
      thumbnailUrl: videoData.thumbnail_url || null,
      duration: videoData.duration || null,
      error: videoData.error || null,
    });
  } catch (error) {
    console.error("Video status error:", error);
    return NextResponse.json(
      { error: "Error al consultar el estado del video" },
      { status: 500 }
    );
  }
}
