import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateLeadScore } from "@/lib/lead-scoring";
import { audit } from "@/lib/audit";

// ---------------------------------------------------------------------------
// IP-based rate limiter (in-memory, resets per serverless instance lifecycle)
// Limit: 10 lead submissions per IP per hour
// ---------------------------------------------------------------------------
const ipRateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function checkIpRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = ipRateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    ipRateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1 };
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return { allowed: false, remaining: 0 };
  }

  entry.count++;
  return { allowed: true, remaining: RATE_LIMIT_MAX - entry.count };
}

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

const VALID_SOURCES = [
  "WEBSITE",
  "INSTAGRAM",
  "FACEBOOK",
  "WHATSAPP",
  "REFERRAL",
  "OTHER",
] as const;

type LeadSource = (typeof VALID_SOURCES)[number];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

function stripHtml(str: string): string {
  return str.replace(/<[^>]*>/g, "").trim();
}

function normalizeSource(source?: string): LeadSource {
  if (!source) return "WEBSITE";
  const upper = source.toUpperCase().trim();
  if (VALID_SOURCES.includes(upper as LeadSource)) {
    return upper as LeadSource;
  }
  return "OTHER";
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const clientIp = getClientIp(req);

    // IP rate limiting (10 submissions/IP/hour)
    const rateCheck = checkIpRateLimit(clientIp);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { success: false, error: "Demasiadas solicitudes. Intenta de nuevo en una hora." },
        { status: 429, headers: { ...corsHeaders, "Retry-After": "3600" } }
      );
    }

    const { name, email, phone, source, notes, organizationId } = body;

    // Validate required fields
    if (!organizationId) {
      return NextResponse.json(
        { success: false, error: "El campo organizationId es obligatorio." },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!name || typeof name !== "string" || stripHtml(name).length === 0) {
      return NextResponse.json(
        { success: false, error: "El campo nombre es obligatorio." },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate organization exists
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true },
    });

    if (!organization) {
      return NextResponse.json(
        { success: false, error: "La organización no existe." },
        { status: 404, headers: corsHeaders }
      );
    }

    // Sanitize inputs
    const sanitizedName = stripHtml(name);
    const sanitizedEmail = email ? stripHtml(String(email)) : null;
    const sanitizedPhone = phone ? stripHtml(String(phone)) : null;
    const sanitizedNotes = notes ? stripHtml(String(notes)) : null;
    const normalizedSource = normalizeSource(source);

    // Rate limit: check for duplicate submission in last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const recentDuplicate = await prisma.lead.findFirst({
      where: {
        organizationId,
        createdAt: { gte: fiveMinutesAgo },
        ...(sanitizedEmail ? { email: sanitizedEmail } : {}),
        ...(sanitizedPhone ? { phone: sanitizedPhone } : {}),
        ...(!sanitizedEmail && !sanitizedPhone ? { name: sanitizedName } : {}),
      },
      select: { id: true },
    });

    if (recentDuplicate) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Ya se registró un lead con estos datos recientemente. Intente de nuevo en unos minutos.",
        },
        { status: 429, headers: corsHeaders }
      );
    }

    // Create the lead with auto-score
    const scoreResult = calculateLeadScore({
      source: normalizedSource,
      status: "NEW",
      email: sanitizedEmail,
      phone: sanitizedPhone,
      notes: sanitizedNotes,
    });

    const lead = await prisma.lead.create({
      data: {
        name: sanitizedName,
        email: sanitizedEmail,
        phone: sanitizedPhone,
        source: normalizedSource,
        status: "NEW",
        notes: sanitizedNotes,
        organizationId,
        score: scoreResult.score,
        scoreDetails: scoreResult.details,
        scoreUpdatedAt: new Date(),
      },
      select: { id: true },
    });

    await audit.leadCreated({
      organizationId,
      leadId: lead.id,
      leadName: sanitizedName,
      source: normalizedSource,
      score: scoreResult.score,
      ipAddress: clientIp,
    });

    return NextResponse.json(
      { success: true, id: lead.id },
      { status: 201, headers: corsHeaders }
    );
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Ocurrió un error al registrar el lead. Intente de nuevo.",
      },
      { status: 500, headers: corsHeaders }
    );
  }
}
