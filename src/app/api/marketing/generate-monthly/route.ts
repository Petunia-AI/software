import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";

// ─── Types ────────────────────────────────────────────────────────────────────

interface GeneratedPost {
  scheduledAt: string;
  type: "POST" | "STORY" | "REEL" | "CAROUSEL" | "WHATSAPP" | "EMAIL";
  platform: "INSTAGRAM" | "FACEBOOK" | "TIKTOK" | "WHATSAPP" | "EMAIL" | "LINKEDIN";
  title: string;
  caption: string;
  hashtags: string[];
  week: number;
}

interface GeneratedCampaign {
  name: string;
  objective: "LEAD_GENERATION" | "TRAFFIC" | "BRAND_AWARENESS" | "ENGAGEMENT" | "CONVERSIONS" | "MESSAGES";
  dailyBudget: number;
  headline: string;
  primaryText: string;
  description: string;
  callToAction: string;
  targetAgeMin: number;
  targetAgeMax: number;
  targetLocations: string[];
  targetInterests: string[];
}

interface ClaudeResponse {
  strategy: string;
  weeks: {
    week: number;
    theme: string;
    posts: GeneratedPost[];
  }[];
  campaign?: GeneratedCampaign;
  googleCampaign?: {
    name: string;
    objective: "LEAD_GENERATION" | "TRAFFIC" | "BRAND_AWARENESS" | "ENGAGEMENT" | "CONVERSIONS" | "MESSAGES";
    dailyBudget: number;
    targetKeywords: string[];
    headlines: string[];
    descriptions: string[];
    finalUrl: string;
    callToAction: string;
  };
  kpis: { metric: string; target: string }[];
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const { wantsCampaigns, campaignPlatform, monthlyBudget } = await req.json();

    // ── 1. Get org context ────────────────────────────────────────────────────
    const member = await prisma.organizationMember.findFirst({
      where: { user: { email: session.user.email! } },
      select: { organizationId: true, userId: true },
    });
    if (!member?.organizationId) {
      return NextResponse.json({ error: "No se encontró la organización" }, { status: 400 });
    }
    const { organizationId, userId } = member;

    // Fetch org properties (up to 10 for context)
    const properties = await prisma.property.findMany({
      where: { organizationId },
      select: { title: true, propertyType: true, price: true, city: true, bedrooms: true, bathrooms: true, area: true },
      take: 10,
      orderBy: { createdAt: "desc" },
    });

    // Leads count
    const leadsCount = await prisma.lead.count({ where: { organizationId } });

    // Org name
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true },
    });

    // Current month/year
    const now = new Date();

    // Calculate start of next month (or current if before 10th)
    const planMonth = now.getDate() > 10
      ? new Date(now.getFullYear(), now.getMonth() + 1, 1)
      : new Date(now.getFullYear(), now.getMonth(), 1);
    const planMonthName = planMonth.toLocaleString("es-MX", { month: "long" });
    const planYear = planMonth.getFullYear();

    // ── 2. Get AI config ──────────────────────────────────────────────────────
    const config = await prisma.platformAIConfig.findFirst({ where: { isActive: true } });
    const apiKey = config?.apiKey || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "Motor de IA no configurado" }, { status: 400 });

    const client = new Anthropic({ apiKey });
    const model = config?.model || "claude-sonnet-4-6";

    // ── 3. Build prompt ───────────────────────────────────────────────────────
    const propertiesContext = properties.length > 0
      ? properties.map(p =>
          `- ${p.title} (${p.propertyType || "Propiedad"}, ${p.city || "Sin ciudad"}, $${p.price?.toLocaleString() ?? "Precio a consultar"} USD${p.bedrooms ? `, ${p.bedrooms} rec` : ""}${p.bathrooms ? `, ${p.bathrooms} baños` : ""}${p.area ? `, ${p.area}m²` : ""})`
        ).join("\n")
      : "- Portafolio inmobiliario general (casas, departamentos, terrenos)";

    const campaignContext = wantsCampaigns
      ? `SÍ quiere campañas pagas. Plataforma: ${campaignPlatform}. Presupuesto mensual: $${monthlyBudget} USD.`
      : "NO quiere campañas pagas este mes, solo contenido orgánico.";

    const prompt = `Eres Petunia, la mejor experta en marketing inmobiliario de América Latina. Trabajas para ${org?.name || "una agencia inmobiliaria"}.

## CONTEXTO DEL NEGOCIO
- Agencia: ${org?.name || "Agencia Inmobiliaria"}
- Mes a planificar: ${planMonthName} ${planYear}
- Leads en base de datos: ${leadsCount}
- Propiedades actuales:
${propertiesContext}

## CAMPAÑAS PAGAS
${campaignContext}

## TU MISIÓN
Crea el plan de marketing completo y autónomo para ${planMonthName} ${planYear}. TÚ decides todo:
- Qué plataformas usar (Instagram, Facebook, TikTok, LinkedIn, WhatsApp)
- Qué tipos de contenido (POST, REEL, CAROUSEL, STORY, EMAIL, WHATSAPP)
- Cuántos posts por semana y en qué días/horas exactas
- El tono, la estrategia y las temáticas semanales
- Los captions completos listos para publicar
- Los hashtags optimizados para inmobiliaria

Crea entre 3 y 5 posts por semana distribuidos en 4 semanas (16-20 posts totales).
Cada post debe tener una fecha scheduledAt real en ${planMonthName} ${planYear}.
Los captions deben ser auténticos, en español latinoamericano, listos para copiar y publicar.

${wantsCampaigns && (campaignPlatform === "META" || campaignPlatform === "AMBOS") ? `
Crea UNA campaña de Meta Ads (Facebook + Instagram) optimizada para captación de leads inmobiliarios.
Presupuesto diario: $${(parseFloat(monthlyBudget) / 30).toFixed(2)} USD.
` : ""}
${wantsCampaigns && (campaignPlatform === "GOOGLE" || campaignPlatform === "AMBOS") ? `
Crea UNA campaña de Google Ads (Search) optimizada para búsquedas inmobiliarias.
Presupuesto diario: $${(parseFloat(monthlyBudget) / 30 / (campaignPlatform === "AMBOS" ? 2 : 1)).toFixed(2)} USD.
` : ""}

RESPONDE ÚNICAMENTE con JSON válido siguiendo EXACTAMENTE esta estructura (sin markdown, sin explicaciones):
{
  "strategy": "Resumen ejecutivo de 2-3 oraciones sobre la estrategia del mes",
  "weeks": [
    {
      "week": 1,
      "theme": "Nombre corto de la temática (ej: Propiedades de lujo en CDMX)",
      "posts": [
        {
          "scheduledAt": "2026-04-07T18:00:00.000Z",
          "type": "POST",
          "platform": "INSTAGRAM",
          "title": "Título corto del post",
          "caption": "Caption completo listo para publicar con emojis y llamada a la acción...",
          "hashtags": ["#InmobiliariaLujo", "#PropiedadesCDMX", "#BienesRaices"],
          "week": 1
        }
      ]
    }
  ],
  ${wantsCampaigns && (campaignPlatform === "META" || campaignPlatform === "AMBOS") ? `"campaign": {
    "name": "Nombre de la campaña",
    "objective": "LEAD_GENERATION",
    "dailyBudget": 16.67,
    "headline": "Headline del anuncio (máx 40 chars)",
    "primaryText": "Copy principal del anuncio (2-3 oraciones)",
    "description": "Descripción del anuncio",
    "callToAction": "Contáctanos",
    "targetAgeMin": 28,
    "targetAgeMax": 55,
    "targetLocations": ["Ciudad de México", "Monterrey"],
    "targetInterests": ["Bienes raíces", "Inversión inmobiliaria", "Lujo"]
  },` : ""}
  ${wantsCampaigns && (campaignPlatform === "GOOGLE" || campaignPlatform === "AMBOS") ? `"googleCampaign": {
    "name": "Nombre de la campaña Google",
    "objective": "LEAD_GENERATION",
    "dailyBudget": 16.67,
    "targetKeywords": ["comprar departamento CDMX", "casas en venta zona norte", "invertir en inmuebles"],
    "headlines": ["Encuentra Tu Casa Ideal", "Propiedades Premium en CDMX", "Tu Inversión Inmobiliaria"],
    "descriptions": ["Portafolio exclusivo de propiedades. Asesoría personalizada sin costo.", "Expertos en bienes raíces con más de 10 años de experiencia."],
    "finalUrl": "https://tuagencia.com",
    "callToAction": "Contáctanos"
  },` : ""}
  "kpis": [
    { "metric": "Alcance orgánico mensual", "target": "+15,000" },
    { "metric": "Leads generados", "target": "25-40" },
    { "metric": "Engagement rate", "target": "4.5%" }
  ]
}`;

    // ── 4. Call Claude ────────────────────────────────────────────────────────
    const response = await client.messages.create({
      model,
      max_tokens: 8000,
      messages: [{ role: "user", content: prompt }],
    });

    const rawText = response.content[0].type === "text" ? response.content[0].text : "";
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Respuesta inválida del modelo de IA");

    const plan = JSON.parse(jsonMatch[0]) as ClaudeResponse;

    // ── 5. Collect all posts ──────────────────────────────────────────────────
    const allPosts: GeneratedPost[] = plan.weeks?.flatMap(w =>
      (w.posts || []).map(p => ({ ...p, week: w.week }))
    ) ?? [];

    // ── 6. Save ContentPosts to DB ────────────────────────────────────────────
    let postsCreated = 0;
    if (allPosts.length > 0) {
      const created = await prisma.contentPost.createMany({
        data: allPosts.map(p => ({
          organizationId,
          createdById: userId,
          type: p.type,
          platform: p.platform,
          title: p.title,
          content: p.caption,
          hashtags: Array.isArray(p.hashtags) ? p.hashtags.join(" ") : "",
          status: "SCHEDULED",
          scheduledAt: new Date(p.scheduledAt),
        })),
        skipDuplicates: true,
      });
      postsCreated = created.count;
    }

    // ── 7. Save MetaCampaign if requested ─────────────────────────────────────
    let metaCampaignPreview = null;
    let googleCampaignPreview = null;
    let campaignsCreated = 0;

    if (wantsCampaigns && plan.campaign && (campaignPlatform === "META" || campaignPlatform === "AMBOS")) {
      const c = plan.campaign;
      const meta = await prisma.metaCampaign.create({
        data: {
          organizationId,
          createdById: userId,
          name: c.name,
          objective: c.objective,
          status: "DRAFT",
          dailyBudget: c.dailyBudget,
          currency: "USD",
          startDate: planMonth,
          endDate: new Date(planMonth.getFullYear(), planMonth.getMonth() + 1, 0),
          headline: c.headline,
          primaryText: c.primaryText,
          description: c.description,
          callToAction: c.callToAction,
          targetAgeMin: c.targetAgeMin,
          targetAgeMax: c.targetAgeMax,
          targetLocations: c.targetLocations,
          targetInterests: c.targetInterests,
          targetPlatforms: ["INSTAGRAM", "FACEBOOK"],
        },
      });
      campaignsCreated++;
      metaCampaignPreview = {
        name: meta.name,
        platform: "Meta Ads",
        budget: monthlyBudget,
        objective: "Captación de leads",
        audience: `${c.targetAgeMin}-${c.targetAgeMax} años`,
      };
    }

    if (wantsCampaigns && plan.googleCampaign && (campaignPlatform === "GOOGLE" || campaignPlatform === "AMBOS")) {
      const g = plan.googleCampaign;
      const google = await prisma.googleCampaign.create({
        data: {
          organizationId,
          createdById: userId,
          name: g.name,
          objective: g.objective,
          status: "DRAFT",
          dailyBudget: g.dailyBudget,
          currency: "USD",
          startDate: planMonth,
          endDate: new Date(planMonth.getFullYear(), planMonth.getMonth() + 1, 0),
          targetKeywords: g.targetKeywords,
          headlines: g.headlines,
          descriptions: g.descriptions,
          finalUrl: g.finalUrl,
          callToAction: g.callToAction,
        },
      });
      campaignsCreated++;
      googleCampaignPreview = {
        name: google.name,
        platform: "Google Ads",
        budget: campaignPlatform === "AMBOS" ? String(parseFloat(monthlyBudget) / 2) : monthlyBudget,
        objective: "Captación de leads",
        audience: "Búsquedas inmobiliarias",
      };
    }

    // ── 8. Log AI usage ───────────────────────────────────────────────────────
    try {
      await prisma.aIUsageLog.create({
        data: {
          organizationId,
          type: "CONTENT_GENERATION",
          creditsUsed: 10,
          provider: "CLAUDE",
          tokensInput: response.usage.input_tokens,
          tokensOutput: response.usage.output_tokens,
          model,
        },
      });
    } catch { /* non-critical */ }

    // ── 9. Build result for UI ────────────────────────────────────────────────
    const campaigns = [metaCampaignPreview, googleCampaignPreview].filter(Boolean);

    const result = {
      summary: plan.strategy,
      postsCreated,
      campaignsCreated,
      weeks: plan.weeks?.map(w => ({
        week: w.week,
        theme: w.theme,
        posts: (w.posts || []).map(p => ({
          type: p.type,
          platform: p.platform,
          title: p.title,
          caption: p.caption,
          scheduledAt: p.scheduledAt,
        })),
      })) ?? [],
      campaigns,
      kpis: plan.kpis ?? [],
    };

    return NextResponse.json({ result });

  } catch (e: unknown) {
    console.error("[generate-monthly] Error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error generando plan de marketing" },
      { status: 500 }
    );
  }
}
