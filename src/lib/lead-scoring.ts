/**
 * Lead Scoring Engine
 * Asigna un score 0-100 a cada lead basado en fuente, perfil, comportamiento y etapa
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LeadScoreInput {
  source: string;
  status: string;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  propertyId?: string | null;
  activityCount?: number;
}

export interface LeadScoreResult {
  score: number;
  details: {
    source: number;
    status: number;
    profile: number;
    engagement: number;
  };
  label: "cold" | "warm" | "hot" | "qualified";
  labelEs: string;
  color: string;
}

// ---------------------------------------------------------------------------
// Scoring weights
// ---------------------------------------------------------------------------

const SOURCE_SCORES: Record<string, number> = {
  REFERRAL: 30,
  INSTAGRAM: 25,
  FACEBOOK: 20,
  WHATSAPP: 20,
  WEBSITE: 15,
  FOLLOW_UP_BOSS: 10,
  OTHER: 5,
};

const STATUS_SCORES: Record<string, number> = {
  NEW: 5,
  CONTACTED: 15,
  QUALIFIED: 30,
  PROPOSAL: 45,
  NEGOTIATION: 50,
  WON: 50,
  LOST: 0,
};

// ---------------------------------------------------------------------------
// Main scoring function
// ---------------------------------------------------------------------------

export function calculateLeadScore(input: LeadScoreInput): LeadScoreResult {
  // 1. Source score (max 30)
  const sourceScore = SOURCE_SCORES[input.source?.toUpperCase()] ?? 5;

  // 2. Status/pipeline stage (max 50)
  const statusScore = STATUS_SCORES[input.status?.toUpperCase()] ?? 5;

  // 3. Profile completeness (max 10)
  let profileScore = 0;
  if (input.email) profileScore += 4;
  if (input.phone) profileScore += 4;
  if (input.notes && input.notes.length > 10) profileScore += 2;

  // 4. Engagement (max 10)
  let engagementScore = 0;
  const activities = input.activityCount ?? 0;
  engagementScore += Math.min(activities * 3, 9);
  if (input.propertyId) engagementScore += 1;

  const raw = sourceScore + statusScore + profileScore + engagementScore;
  const score = Math.min(100, Math.max(0, raw));

  // Label
  let label: LeadScoreResult["label"];
  let labelEs: string;
  let color: string;

  if (input.status === "LOST") {
    label = "cold";
    labelEs = "Perdido";
    color = "text-gray-400";
  } else if (score >= 70) {
    label = "qualified";
    labelEs = "Calificado 🔥";
    color = "text-green-400";
  } else if (score >= 45) {
    label = "hot";
    labelEs = "Caliente";
    color = "text-orange-400";
  } else if (score >= 25) {
    label = "warm";
    labelEs = "Tibio";
    color = "text-yellow-400";
  } else {
    label = "cold";
    labelEs = "Frío";
    color = "text-blue-400";
  }

  return {
    score,
    details: {
      source: sourceScore,
      status: statusScore,
      profile: profileScore,
      engagement: engagementScore,
    },
    label,
    labelEs,
    color,
  };
}

// ---------------------------------------------------------------------------
// Score label helpers (for UI use without full calc)
// ---------------------------------------------------------------------------

export function getScoreLabel(score: number): { label: string; color: string; bg: string } {
  if (score >= 70) return { label: "🔥 Calificado", color: "text-green-400", bg: "bg-green-500/10" };
  if (score >= 45) return { label: "🌶 Caliente", color: "text-orange-400", bg: "bg-orange-500/10" };
  if (score >= 25) return { label: "Tibio", color: "text-yellow-400", bg: "bg-yellow-500/10" };
  return { label: "Frío", color: "text-blue-400", bg: "bg-blue-500/10" };
}
