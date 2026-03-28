import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { prisma } from "@/lib/prisma";
import type { AIUsageType } from "@/generated/prisma/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GenerateContentParams {
  provider: "claude" | "openai" | "flux";
  apiKey: string;
  model?: string;
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
}

interface PlatformAIConfig {
  provider: "claude" | "openai" | "flux";
  apiKey: string;
  model?: string;
}

// Tool definition for the agentic assistant
export interface AgentTool {
  name: string;
  description: string;
  input_schema: Record<string, any>;
}

// Result from tool-calling generation
export interface AgentToolCall {
  id: string;
  name: string;
  input: Record<string, any>;
}

export interface AgentResponse {
  text: string;
  toolCalls: AgentToolCall[];
  stopReason: "end_turn" | "tool_use" | "max_tokens";
}

// Message for multi-turn tool-calling conversations
export interface AgentMessage {
  role: "user" | "assistant";
  content: string | any[];
}

// ---------------------------------------------------------------------------
// Get platform-level AI config (managed by Super Admin)
// ---------------------------------------------------------------------------

export async function getPlatformAIConfig(): Promise<PlatformAIConfig | null> {
  // Try DB first (managed via admin panel)
  try {
    const config = await prisma.platformAIConfig.findFirst({
      where: { isActive: true },
    });

    if (config) {
      return {
        provider: config.provider.toLowerCase() as "claude" | "openai",
        apiKey: config.apiKey,
        model: config.model ?? undefined,
      };
    }
  } catch {
    // Table may not exist yet in some environments — fall through to env vars
  }

  // Fallback: use environment variables (ANTHROPIC_API_KEY or OPENAI_API_KEY)
  if (process.env.ANTHROPIC_API_KEY) {
    return {
      provider: "claude",
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: "claude-3-5-sonnet-20241022",
    };
  }

  if (process.env.OPENAI_API_KEY) {
    return {
      provider: "openai",
      apiKey: process.env.OPENAI_API_KEY,
      model: "gpt-4o",
    };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Get platform HeyGen API key
// ---------------------------------------------------------------------------

export async function getPlatformHeygenKey(): Promise<string | null> {
  try {
    const config = await prisma.platformAIConfig.findFirst({
      where: { isActive: true },
      select: { heygenApiKey: true },
    });
    if (config?.heygenApiKey) return config.heygenApiKey;
  } catch {
    // fall through
  }
  return process.env.HEYGEN_API_KEY ?? null;
}

// ---------------------------------------------------------------------------
// Check and consume AI credits for an organization
// ---------------------------------------------------------------------------

export async function checkAndConsumeCredits(
  organizationId: string,
  creditsNeeded: number = 1
): Promise<{ allowed: boolean; remaining: number; limit: number }> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { aiCreditsLimit: true, aiCreditsUsed: true, aiCreditsResetAt: true },
  });

  if (!org) return { allowed: false, remaining: 0, limit: 0 };

  // Auto-reset credits if we're in a new month
  const now = new Date();
  const resetAt = org.aiCreditsResetAt;
  if (!resetAt || now.getMonth() !== resetAt.getMonth() || now.getFullYear() !== resetAt.getFullYear()) {
    await prisma.organization.update({
      where: { id: organizationId },
      data: { aiCreditsUsed: 0, aiCreditsResetAt: now },
    });
    org.aiCreditsUsed = 0;
  }

  // -1 means unlimited
  if (org.aiCreditsLimit === -1) {
    return { allowed: true, remaining: -1, limit: -1 };
  }

  const remaining = org.aiCreditsLimit - org.aiCreditsUsed;
  if (remaining < creditsNeeded) {
    return { allowed: false, remaining, limit: org.aiCreditsLimit };
  }

  // Consume credits
  await prisma.organization.update({
    where: { id: organizationId },
    data: { aiCreditsUsed: { increment: creditsNeeded } },
  });

  return {
    allowed: true,
    remaining: remaining - creditsNeeded,
    limit: org.aiCreditsLimit,
  };
}

// ---------------------------------------------------------------------------
// Log AI usage
// ---------------------------------------------------------------------------

export async function logAIUsage(params: {
  organizationId: string;
  userId?: string;
  type: AIUsageType;
  creditsUsed?: number;
  provider: "claude" | "openai" | "flux";
  model?: string;
  tokensInput?: number;
  tokensOutput?: number;
  endpoint?: string;
}) {
  try {
    await prisma.aIUsageLog.create({
      data: {
        organizationId: params.organizationId,
        userId: params.userId,
        type: params.type,
        creditsUsed: params.creditsUsed ?? 1,
        provider: params.provider.toUpperCase() as "CLAUDE" | "OPENAI",
        model: params.model,
        tokensInput: params.tokensInput,
        tokensOutput: params.tokensOutput,
        endpoint: params.endpoint,
      },
    });
  } catch (error) {
    console.error("[AI_USAGE_LOG]", error);
  }
}

// ---------------------------------------------------------------------------
// Core AI generation
// ---------------------------------------------------------------------------

export async function generateContent({
  provider,
  apiKey,
  model,
  prompt,
  systemPrompt,
  maxTokens = 1024,
}: GenerateContentParams): Promise<string> {
  if (provider === "claude") {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: model || "claude-sonnet-4-6",
      max_tokens: maxTokens,
      system: systemPrompt || "Eres un experto en marketing inmobiliario.",
      messages: [{ role: "user", content: prompt }],
    });
    const block = response.content[0];
    return block.type === "text" ? block.text : "";
  }

  const client = new OpenAI({ apiKey });
  const response = await client.chat.completions.create({
    model: model || "gpt-4o",
    max_tokens: maxTokens,
    messages: [
      { role: "system", content: systemPrompt || "Eres un experto en marketing inmobiliario." },
      { role: "user", content: prompt },
    ],
  });
  return response.choices[0]?.message?.content || "";
}

// ---------------------------------------------------------------------------
// Agentic AI — Tool-calling generation
// ---------------------------------------------------------------------------

interface GenerateWithToolsParams {
  provider: "claude" | "openai";
  apiKey: string;
  model?: string;
  systemPrompt: string;
  messages: AgentMessage[];
  tools: AgentTool[];
  maxTokens?: number;
}

export async function generateWithTools({
  provider,
  apiKey,
  model,
  systemPrompt,
  messages,
  tools,
  maxTokens = 4096,
}: GenerateWithToolsParams): Promise<AgentResponse> {
  if (provider === "claude") {
    return generateWithToolsClaude({
      apiKey,
      model: model || "claude-sonnet-4-6",
      systemPrompt,
      messages,
      tools,
      maxTokens,
    });
  }

  return generateWithToolsOpenAI({
    apiKey,
    model: model || "gpt-4o",
    systemPrompt,
    messages,
    tools,
    maxTokens,
  });
}

async function generateWithToolsClaude(params: {
  apiKey: string;
  model: string;
  systemPrompt: string;
  messages: AgentMessage[];
  tools: AgentTool[];
  maxTokens: number;
}): Promise<AgentResponse> {
  const client = new Anthropic({ apiKey: params.apiKey });

  const anthropicTools = params.tools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.input_schema as Anthropic.Tool.InputSchema,
  }));

  const response = await client.messages.create({
    model: params.model,
    max_tokens: params.maxTokens,
    system: params.systemPrompt,
    messages: params.messages as Anthropic.MessageParam[],
    tools: anthropicTools,
    tool_choice: { type: "auto" },
  });

  // Extract text and tool_use blocks
  let text = "";
  const toolCalls: AgentToolCall[] = [];

  for (const block of response.content) {
    if (block.type === "text") {
      text += block.text;
    } else if (block.type === "tool_use") {
      toolCalls.push({
        id: block.id,
        name: block.name,
        input: block.input as Record<string, any>,
      });
    }
  }

  return {
    text,
    toolCalls,
    stopReason: response.stop_reason === "tool_use" ? "tool_use" : "end_turn",
  };
}

async function generateWithToolsOpenAI(params: {
  apiKey: string;
  model: string;
  systemPrompt: string;
  messages: AgentMessage[];
  tools: AgentTool[];
  maxTokens: number;
}): Promise<AgentResponse> {
  const client = new OpenAI({ apiKey: params.apiKey });

  const openAITools: OpenAI.ChatCompletionTool[] = params.tools.map((t) => ({
    type: "function" as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.input_schema,
    },
  }));

  const openAIMessages: OpenAI.ChatCompletionMessageParam[] = [
    { role: "system", content: params.systemPrompt },
    ...params.messages.map((m) => {
      if (typeof m.content === "string") {
        return { role: m.role, content: m.content } as OpenAI.ChatCompletionMessageParam;
      }
      // For tool results, convert to OpenAI format
      return { role: m.role, content: JSON.stringify(m.content) } as OpenAI.ChatCompletionMessageParam;
    }),
  ];

  const response = await client.chat.completions.create({
    model: params.model,
    max_tokens: params.maxTokens,
    messages: openAIMessages,
    tools: openAITools,
  });

  const choice = response.choices[0];
  const text = choice?.message?.content || "";
  const toolCalls: AgentToolCall[] = [];

  if (choice?.message?.tool_calls) {
    for (const tc of choice.message.tool_calls) {
      const fn = (tc as { id: string; function: { name: string; arguments: string } }).function;
      toolCalls.push({
        id: tc.id,
        name: fn.name,
        input: JSON.parse(fn.arguments || "{}"),
      });
    }
  }

  return {
    text,
    toolCalls,
    stopReason: choice?.finish_reason === "tool_calls" ? "tool_use" : "end_turn",
  };
}

// ---------------------------------------------------------------------------
// Knowledge context — builds a dynamic learning block from the DB
// ---------------------------------------------------------------------------

export async function getKnowledgeContext(organizationId: string): Promise<string> {
  try {
    const [knowledgeEntries, campaignResults] = await Promise.all([
      prisma.knowledgeEntry.findMany({
        where: { organizationId, isActive: true },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { category: true, title: true, content: true },
      }),
      prisma.campaignResult.findMany({
        where: { organizationId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          campaignName: true,
          platform: true,
          period: true,
          leads: true,
          ctr: true,
          cpl: true,
          whatWorked: true,
          whatDidntWork: true,
        },
      }),
    ]);

    if (knowledgeEntries.length === 0 && campaignResults.length === 0) return "";

    const categoryLabels: Record<string, string> = {
      mercado: "Mercado local",
      propiedad: "Propiedades destacadas",
      contenido: "Contenido que funciona",
      campana: "Aprendizajes de campañas",
      general: "Conocimiento general",
    };

    let context = "\n\n---\n## BASE DE CONOCIMIENTO DE TU NEGOCIO\n";
    context += "Usa estos datos reales de tu negocio para personalizar cada respuesta.\n";

    if (knowledgeEntries.length > 0) {
      const byCategory: Record<string, typeof knowledgeEntries> = {};
      for (const entry of knowledgeEntries) {
        if (!byCategory[entry.category]) byCategory[entry.category] = [];
        byCategory[entry.category].push(entry);
      }
      for (const [cat, entries] of Object.entries(byCategory)) {
        context += `\n### ${categoryLabels[cat] ?? cat}\n`;
        for (const e of entries) {
          context += `**${e.title}:** ${e.content}\n`;
        }
      }
    }

    if (campaignResults.length > 0) {
      context += "\n### Resultados de campañas recientes\n";
      for (const r of campaignResults) {
        context += `**${r.campaignName}** (${r.platform}${r.period ? `, ${r.period}` : ""}):\n`;
        const metrics: string[] = [];
        if (r.leads) metrics.push(`Leads: ${r.leads}`);
        if (r.ctr) metrics.push(`CTR: ${Number(r.ctr).toFixed(2)}%`);
        if (r.cpl) metrics.push(`CPL: $${Number(r.cpl).toFixed(2)}`);
        if (metrics.length > 0) context += `  - ${metrics.join(" | ")}\n`;
        if (r.whatWorked) context += `  - ✅ Funcionó: ${r.whatWorked}\n`;
        if (r.whatDidntWork) context += `  - ❌ No funcionó: ${r.whatDidntWork}\n`;
      }
    }

    context += "---\n";
    return context;
  } catch (err) {
    console.error("[KNOWLEDGE_CONTEXT]", err);
    return "";
  }
}

// ---------------------------------------------------------------------------
// Property content generation
// ---------------------------------------------------------------------------

interface PropertyContentParams {
  property: {
    title: string;
    description?: string | null;
    propertyType: string;
    operationType: string;
    price?: number | string | null;
    currency?: string | null;
    area?: number | string | null;
    bedrooms?: number | null;
    bathrooms?: number | null;
    city?: string | null;
    state?: string | null;
    features?: string[] | null;
  };
  contentType: string;
  platform: string;
  tone: string;
  language: string;
  provider: "claude" | "openai" | "flux";
  apiKey: string;
  model?: string;
  knowledgeContext?: string;
}

export async function generatePropertyContent({
  property,
  contentType,
  platform,
  tone,
  language,
  provider,
  apiKey,
  model,
  knowledgeContext = "",
}: PropertyContentParams): Promise<string> {
  const propertyInfo = `
Propiedad: ${property.title}
Tipo: ${property.propertyType} | Operación: ${property.operationType}
${property.price ? `Precio: ${property.currency || "USD"} ${property.price}` : ""}
${property.area ? `Área: ${property.area} m²` : ""}
${property.bedrooms ? `Recámaras: ${property.bedrooms}` : ""} ${property.bathrooms ? `Baños: ${property.bathrooms}` : ""}
${property.city ? `Ubicación: ${property.city}${property.state ? `, ${property.state}` : ""}` : ""}
${property.description ? `Descripción: ${property.description}` : ""}
${property.features && property.features.length > 0 ? `Características: ${property.features.join(", ")}` : ""}
`.trim();

  const platformGuide: Record<string, string> = {
    INSTAGRAM: "Máximo 2200 caracteres. Usa emojis estratégicamente. Incluye hashtags relevantes al final. Formato visual y atractivo.",
    FACEBOOK: "Puede ser más extenso. Incluye llamado a la acción. Tono conversacional.",
    TIKTOK: "Texto corto y dinámico para video. Máximo 150 caracteres para overlay. Hook inicial fuerte.",
    WHATSAPP: "Mensaje directo y personalizado. Incluye los datos clave. Máximo 1000 caracteres. Sin hashtags.",
    EMAIL: "Formato de email profesional con asunto, saludo, cuerpo y cierre. Incluye llamado a la acción.",
    LINKEDIN: "Tono profesional. Enfocado en inversión y oportunidades. Incluye datos relevantes del mercado.",
  };

  const contentTypeGuide: Record<string, string> = {
    POST: "Publicación estándar con copy completo.",
    STORY: "Texto breve y llamativo para historia. Máximo 3 líneas.",
    REEL: "Script corto para video. Incluye hook, desarrollo y CTA.",
    CAROUSEL: "Genera texto para 5-7 slides de carrusel. Cada slide con título y descripción breve.",
    WHATSAPP: "Mensaje de WhatsApp directo y amigable.",
    EMAIL: "Email de marketing inmobiliario completo.",
  };

  const prompt = `Genera contenido de marketing inmobiliario con las siguientes especificaciones:

INFORMACIÓN DE LA PROPIEDAD:
${propertyInfo}

TIPO DE CONTENIDO: ${contentTypeGuide[contentType] || contentType}
PLATAFORMA: ${platformGuide[platform] || platform}
TONO: ${tone}
IDIOMA: ${language === "es" ? "Español" : language === "en" ? "English" : language}

Genera ÚNICAMENTE el contenido listo para publicar. No incluyas explicaciones ni metadatos.`;

  const systemPrompt = `Eres un copywriter experto en marketing inmobiliario de lujo.
Generas ÚNICAMENTE el texto listo para publicar — sin explicaciones, sin código HTML, sin metadatos, sin frases introductorias como "Aquí te presento..." o "Te comparto...".
Solo el copy final directo con emojis si aplica según la plataforma, listo para copiar y pegar.
Tu contenido es ${tone}, profesional y orientado a resultados.
Siempre incluyes un llamado a la acción claro.${knowledgeContext}`;

  return generateContent({ provider, apiKey, model, prompt, systemPrompt });
}
