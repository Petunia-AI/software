// ---------------------------------------------------------------------------
// HeyGen API Client — Photo Avatar & Video Generation
// https://docs.heygen.com/reference
// ---------------------------------------------------------------------------

const HEYGEN_BASE = "https://api.heygen.com";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HeyGenPhotoAvatarRequest {
  name: string;
  age: "Young Adult" | "Early Middle Age" | "Late Middle Age" | "Senior" | "Unspecified";
  gender: "Woman" | "Man" | "Unspecified";
  ethnicity:
    | "White"
    | "Black"
    | "East Asian"
    | "South Asian"
    | "Southeast Asian"
    | "Middle Eastern"
    | "Pacific Islander"
    | "Latino/Hispanic"
    | "Mixed"
    | "Unspecified";
  orientation: "square" | "horizontal" | "vertical";
  pose: "half_body" | "close_up" | "full_body";
  style: "Realistic" | "Pixar" | "Cinematic" | "Vintage" | "Noir" | "Cyberpunk" | "Unspecified";
  appearance: string; // max 1000 chars — clothing, mood, lighting, etc.
  callback_url?: string;
  callback_id?: string;
}

export interface HeyGenGenerationStatus {
  status: "pending" | "processing" | "completed" | "failed";
  id: string;
  avatar_id?: string;
  image_url?: string;
  error?: string;
}

export interface HeyGenAvatar {
  avatar_id: string;
  avatar_name: string;
  gender: string;
  preview_image_url: string;
  preview_video_url?: string;
}

export interface HeyGenVideoRequest {
  avatar_id: string;
  voice_id: string;
  script: string;
  title?: string;
  dimension?: { width: number; height: number };
  callback_url?: string;
}

export interface HeyGenVideoStatus {
  video_id: string;
  status: "pending" | "processing" | "completed" | "failed";
  video_url?: string;
  thumbnail_url?: string;
  duration?: number;
  error?: string;
}

// ---------------------------------------------------------------------------
// Low-level fetch helper
// ---------------------------------------------------------------------------

async function heygenFetch<T>(
  apiKey: string,
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${HEYGEN_BASE}${path}`, {
    ...options,
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "x-api-key": apiKey,
      ...(options.headers || {}),
    },
  });

  const json = await res.json();

  if (!res.ok) {
    const msg =
      json?.error?.message || json?.message || JSON.stringify(json);
    throw new Error(`HeyGen API ${res.status}: ${msg}`);
  }

  return json as T;
}

// ---------------------------------------------------------------------------
// Photo Avatar APIs
// ---------------------------------------------------------------------------

/**
 * Create a Photo Avatar via AI prompt.
 * Returns a generation_id to poll for status.
 */
export async function createPhotoAvatar(
  apiKey: string,
  params: HeyGenPhotoAvatarRequest
): Promise<{ generation_id: string }> {
  const res = await heygenFetch<{
    data: { generation_id: string };
  }>(apiKey, "/v2/photo_avatar/photo/generate", {
    method: "POST",
    body: JSON.stringify(params),
  });
  return { generation_id: res.data.generation_id };
}

/**
 * Poll generation status for a photo avatar or look.
 */
export async function getGenerationStatus(
  apiKey: string,
  generationId: string
): Promise<HeyGenGenerationStatus> {
  const res = await heygenFetch<{
    data: HeyGenGenerationStatus;
  }>(apiKey, `/v2/photo_avatar/generation/${generationId}`, {
    method: "GET",
  });
  return res.data;
}

// ---------------------------------------------------------------------------
// Avatars
// ---------------------------------------------------------------------------

/**
 * List all avatars in the HeyGen account (both stock and custom).
 */
export async function listAvatars(
  apiKey: string
): Promise<{ avatars: HeyGenAvatar[] }> {
  const res = await heygenFetch<{
    data: { avatars: HeyGenAvatar[] };
  }>(apiKey, "/v2/avatars", { method: "GET" });
  return { avatars: res.data.avatars ?? [] };
}

// ---------------------------------------------------------------------------
// Video Generation
// ---------------------------------------------------------------------------

/**
 * Generate a studio video with an avatar speaking a script.
 */
export async function generateVideo(
  apiKey: string,
  params: HeyGenVideoRequest
): Promise<{ video_id: string }> {
  const body = {
    title: params.title ?? "Petunia Video",
    caption: false,
    dimension: params.dimension ?? { width: 1920, height: 1080 },
    video_inputs: [
      {
        character: {
          type: "avatar",
          avatar_id: params.avatar_id,
          avatar_style: "normal",
        },
        voice: {
          type: "text",
          input_text: params.script,
          voice_id: params.voice_id,
        },
      },
    ],
    ...(params.callback_url ? { callback_url: params.callback_url } : {}),
  };

  const res = await heygenFetch<{
    data: { video_id: string };
  }>(apiKey, "/v2/video/generate", {
    method: "POST",
    body: JSON.stringify(body),
  });

  return { video_id: res.data.video_id };
}

/**
 * Check video generation status.
 */
export async function getVideoStatus(
  apiKey: string,
  videoId: string
): Promise<HeyGenVideoStatus> {
  const res = await heygenFetch<{
    data: HeyGenVideoStatus;
  }>(apiKey, `/v1/video_status.get?video_id=${videoId}`, {
    method: "GET",
  });
  return res.data;
}

// ---------------------------------------------------------------------------
// Voices
// ---------------------------------------------------------------------------

export interface HeyGenVoice {
  voice_id: string;
  language: string;
  gender: string;
  name: string;
  preview_audio?: string;
  support_pause: boolean;
  emotion_support: boolean;
}

/**
 * List all available TTS voices.
 */
export async function listVoices(
  apiKey: string
): Promise<{ voices: HeyGenVoice[] }> {
  const res = await heygenFetch<{
    data: { voices: HeyGenVoice[] };
  }>(apiKey, "/v2/voices", { method: "GET" });
  return { voices: res.data.voices ?? [] };
}

/**
 * Get remaining quota for the HeyGen account.
 */
export async function getRemainingQuota(
  apiKey: string
): Promise<{ remaining_quota: number }> {
  const res = await heygenFetch<{
    data: { remaining_quota: number };
  }>(apiKey, "/v2/user/remaining_quota", { method: "GET" });
  return { remaining_quota: res.data.remaining_quota };
}
