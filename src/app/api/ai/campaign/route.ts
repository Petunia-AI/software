import { NextRequest, NextResponse } from "next/server";
import { requireOrganization, unauthorized } from "@/lib/auth-helpers";
import {
  generateContent,
  getPlatformAIConfig,
  checkAndConsumeCredits,
  logAIUsage,
} from "@/lib/ai";

export async function POST(req: NextRequest) {
  try {
    const user = await requireOrganization();
    if (!user) return unauthorized();

    const {
      goal,           // "captar compradores" | "captar vendedores" | "generar tráfico" | "reconocimiento de marca"
      location,       // "Miami, Florida" | "Orlando, FL" | etc
      budget,         // daily budget in USD as string e.g. "20"
      propertyType,   // "Casas", "Condos", "Terrenos", "Comercial", etc  — optional
      priceRange,     // "$300,000 – $600,000" etc — optional
      extra,          // any extra context — optional
    } = await req.json();

    if (!goal || !location || !budget) {
      return NextResponse.json(
        { error: "Faltan campos requeridos: goal, location, budget" },
        { status: 400 },
      );
    }

    const aiConfig = await getPlatformAIConfig();
    if (!aiConfig) {
      return NextResponse.json(
        { error: "Motor de IA no configurado" },
        { status: 503 },
      );
    }

    const credits = await checkAndConsumeCredits(user.organizationId, 2);
    if (!credits.allowed) {
      return NextResponse.json(
        { error: `Créditos insuficientes (necesitas 2, tienes ${credits.remaining})` },
        { status: 429 },
      );
    }

    const systemPrompt = `Eres un experto en marketing digital inmobiliario con 15 años de experiencia en Meta Ads (Facebook/Instagram) en el mercado de bienes raíces de Estados Unidos. Tu especialidad es crear campañas de alta conversión para agentes y brokers.

Responde SIEMPRE con un JSON válido sin texto adicional.`;

    const prompt = `Crea una campaña de Meta Ads completa y lista para lanzar con estos parámetros:

OBJETIVO: ${goal}
UBICACIÓN: ${location}
PRESUPUESTO DIARIO: $${budget} USD
TIPO DE PROPIEDAD: ${propertyType || "propiedades residenciales"}
${priceRange ? `RANGO DE PRECIO: ${priceRange}` : ""}
${extra ? `CONTEXTO ADICIONAL: ${extra}` : ""}

Responde EXACTAMENTE con este JSON (sin texto fuera del JSON):
{
  "campaignName": "nombre descriptivo de la campaña (max 50 chars)",
  "objective": "LEAD_GENERATION",
  "headline": "titular principal del anuncio (max 40 chars, impactante)",
  "primaryText": "texto principal del anuncio (max 125 chars, persuasivo, incluye el beneficio clave)",
  "description": "descripción secundaria (max 30 chars)",
  "callToAction": "LEARN_MORE",
  "targetAgeMin": 28,
  "targetAgeMax": 60,
  "targetGenders": [1, 2],
  "targetLocations": ["${location}"],
  "targetInterests": ["Real estate", "Home ownership", "Investment", "Property"],
  "targetPlatforms": ["facebook", "instagram"],
  "dailyBudget": "${budget}",
  "rationale": "2-3 oraciones explicando POR QUÉ esta configuración va a funcionar para este objetivo específico",
  "estimatedLeadsPerDay": "rango estimado de leads por día (ej: '3-8')",
  "estimatedCostPerLead": "costo estimado por lead en USD (ej: '$8-$15')"
}

Reglas:
- El headline debe crear urgencia o curiosidad sobre propiedades en ${location}
- El primaryText debe mencionar la ubicación y el tipo de propiedad
- Los intereses deben ser específicos para compradores/vendedores de bienes raíces en USA
- targetLocations debe ser un array con la ciudad/estado exacto
- callToAction puede ser: LEARN_MORE, CONTACT_US, APPLY_NOW, GET_QUOTE, SIGN_UP
- targetGenders: 1=hombre, 2=mujer, [1,2]=ambos`;

    const raw = await generateContent({
      provider: aiConfig.provider,
      apiKey: aiConfig.apiKey,
      model: aiConfig.model,
      prompt,
      systemPrompt,
      maxTokens: 1024,
    });

    // Parse the JSON from the AI response
    let campaign;
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      campaign = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
    } catch {
      return NextResponse.json(
        { error: "Error al procesar respuesta de IA. Intenta de nuevo." },
        { status: 500 },
      );
    }

    await logAIUsage({
      organizationId: user.organizationId,
      userId: user.id,
      type: "CAMPAIGN_CREATION",
      creditsUsed: 2,
      provider: aiConfig.provider,
      model: aiConfig.model,
    });

    return NextResponse.json({ campaign });
  } catch (err) {
    console.error("AI campaign error:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
