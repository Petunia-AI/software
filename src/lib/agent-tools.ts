/**
 * Agent Tool Definitions & Executors
 * Defines all tools the Petunia AI agent can call, along with their execution logic.
 */

import { prisma } from "@/lib/prisma";
import {
  generateContent,
  getPlatformAIConfig,
  type AgentTool,
} from "@/lib/ai";
import {
  searchLocations,
  searchInterests,
  getCampaignInsights,
} from "@/lib/meta-ads";
import {
  searchLocations as searchGoogleLocations,
  getCampaignInsights as getGoogleCampaignInsights,
  getValidAccessToken as getGoogleValidToken,
  getKeywordIdeas,
} from "@/lib/google-ads";

// ---------------------------------------------------------------------------
// Tool definitions (sent to the LLM)
// ---------------------------------------------------------------------------

export const AGENT_TOOLS: AgentTool[] = [
  {
    name: "list_properties",
    description:
      "Lista las propiedades de la organización del usuario con sus detalles. Útil para sugerir propiedades para campañas.",
    input_schema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["AVAILABLE", "RESERVED", "SOLD", "RENTED"],
          description: "Filtrar por estado. Omitir para ver todas.",
        },
        limit: {
          type: "number",
          description: "Número máximo de resultados. Default: 10",
        },
      },
      required: [],
    },
  },
  {
    name: "list_leads",
    description:
      "Lista los leads del CRM con su estado y fuente. Útil para reportes y seguimiento.",
    input_schema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"],
          description: "Filtrar por estado.",
        },
        limit: {
          type: "number",
          description: "Número máximo de resultados. Default: 10",
        },
      },
      required: [],
    },
  },
  {
    name: "create_campaign",
    description:
      "Crea una nueva campaña de Meta Ads en borrador. La campaña se crea con status DRAFT y debe publicarse por separado. Para bienes raíces, vincula una propiedad existente.",
    input_schema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Nombre de la campaña",
        },
        objective: {
          type: "string",
          enum: ["LEAD_GENERATION", "TRAFFIC", "BRAND_AWARENESS", "ENGAGEMENT", "CONVERSIONS", "MESSAGES"],
          description: "Objetivo de la campaña. Default: LEAD_GENERATION",
        },
        daily_budget: {
          type: "number",
          description: "Presupuesto diario en la moneda de la organización (USD). Ej: 20 = $20/día",
        },
        property_id: {
          type: "string",
          description: "ID de la propiedad a promocionar (si aplica)",
        },
        headline: {
          type: "string",
          description: "Título del anuncio (máx 40 caracteres)",
        },
        primary_text: {
          type: "string",
          description: "Texto principal del anuncio (máx 125 caracteres)",
        },
        description: {
          type: "string",
          description: "Descripción del anuncio (máx 30 caracteres)",
        },
        target_locations: {
          type: "array",
          items: {
            type: "object",
            properties: {
              key: { type: "string" },
              name: { type: "string" },
              type: { type: "string" },
            },
          },
          description: "Ubicaciones objetivo. Usa search_locations para obtener las keys.",
        },
        target_age_min: { type: "number", description: "Edad mínima. Default: 25" },
        target_age_max: { type: "number", description: "Edad máxima. Default: 65" },
        target_interests: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              name: { type: "string" },
            },
          },
          description: "Intereses de audiencia. Usa search_interests para obtener IDs.",
        },
        target_platforms: {
          type: "array",
          items: { type: "string", enum: ["facebook", "instagram"] },
          description: "Plataformas. Default: ['facebook', 'instagram']",
        },
        call_to_action: {
          type: "string",
          enum: ["LEARN_MORE", "SIGN_UP", "CONTACT_US", "GET_QUOTE", "BOOK_TRAVEL", "APPLY_NOW", "SEND_WHATSAPP_MESSAGE"],
          description: "Botón de acción. Default: LEARN_MORE",
        },
      },
      required: ["name", "daily_budget", "headline", "primary_text"],
    },
  },
  {
    name: "list_campaigns",
    description:
      "Lista las campañas de Meta Ads existentes con su estado y métricas.",
    input_schema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["DRAFT", "PENDING_REVIEW", "ACTIVE", "PAUSED", "COMPLETED", "ERROR"],
          description: "Filtrar por estado.",
        },
      },
      required: [],
    },
  },
  {
    name: "get_campaign_performance",
    description:
      "Obtiene las métricas de rendimiento de una campaña específica (impresiones, clics, leads, gasto).",
    input_schema: {
      type: "object",
      properties: {
        campaign_id: {
          type: "string",
          description: "ID de la campaña en nuestra base de datos",
        },
      },
      required: ["campaign_id"],
    },
  },
  {
    name: "publish_campaign",
    description:
      "Publica una campaña en borrador a Meta Ads. La campaña debe tener headline, texto y presupuesto. Requiere que Meta esté conectado.",
    input_schema: {
      type: "object",
      properties: {
        campaign_id: {
          type: "string",
          description: "ID de la campaña a publicar",
        },
      },
      required: ["campaign_id"],
    },
  },
  {
    name: "pause_campaign",
    description: "Pausa una campaña activa en Meta Ads.",
    input_schema: {
      type: "object",
      properties: {
        campaign_id: {
          type: "string",
          description: "ID de la campaña a pausar",
        },
      },
      required: ["campaign_id"],
    },
  },
  {
    name: "generate_ad_content",
    description:
      "Genera contenido creativo para un anuncio basado en una propiedad. Genera headline, texto principal y descripción optimizados para ads.",
    input_schema: {
      type: "object",
      properties: {
        property_id: {
          type: "string",
          description: "ID de la propiedad para generar contenido",
        },
        tone: {
          type: "string",
          enum: ["profesional", "casual", "urgente", "lujo", "familiar"],
          description: "Tono del contenido. Default: profesional",
        },
        platform: {
          type: "string",
          enum: ["facebook", "instagram"],
          description: "Plataforma destino. Default: facebook",
        },
      },
      required: ["property_id"],
    },
  },
  {
    name: "search_locations",
    description:
      "Busca ubicaciones geográficas para targeting de campañas. Devuelve keys que se pueden usar en create_campaign.",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Ciudad, país o región a buscar. Ej: 'Miami', 'México'",
        },
        type: {
          type: "string",
          enum: ["city", "country", "region"],
          description: "Tipo de ubicación. Default: city",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "search_interests",
    description:
      "Busca intereses de audiencia para targeting. Devuelve IDs que se pueden usar en create_campaign.",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Interés a buscar. Ej: 'bienes raíces', 'luxury homes'",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "check_meta_connection",
    description:
      "Verifica si Meta Ads está conectado y muestra los detalles de la conexión.",
    input_schema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "get_dashboard_summary",
    description:
      "Obtiene un resumen completo del dashboard: leads, propiedades, campañas activas, seguimientos pendientes.",
    input_schema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  // --- Google Ads Tools ---
  {
    name: "create_google_campaign",
    description:
      "Crea un borrador de campaña de Google Ads (Search/Display). Devuelve el ID de la campaña creada en estado DRAFT.",
    input_schema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Nombre de la campaña. Ej: 'Campaña Google - Departamento Centro'",
        },
        objective: {
          type: "string",
          enum: ["LEAD_GENERATION", "TRAFFIC", "BRAND_AWARENESS", "CONVERSIONS"],
          description: "Objetivo de la campaña. Default: LEAD_GENERATION",
        },
        daily_budget: {
          type: "number",
          description: "Presupuesto diario en USD. Ej: 20",
        },
        property_id: {
          type: "string",
          description: "ID de la propiedad a promocionar (opcional)",
        },
        headlines: {
          type: "array",
          items: { type: "string" },
          description: "Lista de headlines para el anuncio (3-15, máx 30 caracteres cada uno)",
        },
        descriptions: {
          type: "array",
          items: { type: "string" },
          description: "Lista de descripciones (2-4, máx 90 caracteres cada una)",
        },
        final_url: {
          type: "string",
          description: "URL de destino del anuncio",
        },
        target_keywords: {
          type: "array",
          items: {
            type: "object",
            properties: {
              text: { type: "string" },
              matchType: { type: "string", enum: ["BROAD", "PHRASE", "EXACT"] },
            },
          },
          description: "Palabras clave para targeting. Ej: [{text: 'casas en venta', matchType: 'BROAD'}]",
        },
        target_locations: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              name: { type: "string" },
            },
          },
          description: "Ubicaciones objetivo con id de Google Geo Target Constants",
        },
      },
      required: ["name"],
    },
  },
  {
    name: "list_google_campaigns",
    description:
      "Lista las campañas de Google Ads de la organización con sus métricas.",
    input_schema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["DRAFT", "ACTIVE", "PAUSED", "ERROR"],
          description: "Filtrar por estado",
        },
      },
      required: [],
    },
  },
  {
    name: "get_google_campaign_performance",
    description:
      "Obtiene métricas de rendimiento de una campaña de Google Ads específica.",
    input_schema: {
      type: "object",
      properties: {
        campaign_id: {
          type: "string",
          description: "ID de la campaña de Google Ads",
        },
      },
      required: ["campaign_id"],
    },
  },
  {
    name: "publish_google_campaign",
    description:
      "Publica un borrador de campaña en Google Ads. Crea Campaign → AdGroup → Keywords → Ad en la API de Google.",
    input_schema: {
      type: "object",
      properties: {
        campaign_id: {
          type: "string",
          description: "ID de la campaña a publicar",
        },
      },
      required: ["campaign_id"],
    },
  },
  {
    name: "pause_google_campaign",
    description:
      "Pausa una campaña activa de Google Ads.",
    input_schema: {
      type: "object",
      properties: {
        campaign_id: {
          type: "string",
          description: "ID de la campaña a pausar",
        },
      },
      required: ["campaign_id"],
    },
  },
  {
    name: "check_google_connection",
    description:
      "Verifica si Google Ads está conectado y muestra los detalles de la conexión.",
    input_schema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "search_google_keywords",
    description:
      "Busca ideas de palabras clave para Google Ads basado en términos semilla. Útil para targeting de campañas.",
    input_schema: {
      type: "object",
      properties: {
        keywords: {
          type: "array",
          items: { type: "string" },
          description: "Palabras clave semilla. Ej: ['casas en venta', 'departamentos']",
        },
      },
      required: ["keywords"],
    },
  },
  {
    name: "search_google_locations",
    description:
      "Busca ubicaciones geográficas para targeting de campañas de Google Ads.",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Ciudad, país o región a buscar. Ej: 'Ciudad de México', 'Miami'",
        },
        country_code: {
          type: "string",
          description: "Código de país ISO. Default: US",
        },
      },
      required: ["query"],
    },
  },
  // --- CRM & Follow-up Tools ---
  {
    name: "create_lead",
    description:
      "Crea un nuevo lead en el CRM. Úsalo cuando el usuario recibe una consulta de un cliente potencial o quiere registrar un contacto.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Nombre completo del lead" },
        email: { type: "string", description: "Email del lead (opcional)" },
        phone: { type: "string", description: "Teléfono del lead (opcional)" },
        source: {
          type: "string",
          enum: ["WEBSITE", "INSTAGRAM", "FACEBOOK", "WHATSAPP", "REFERRAL", "FOLLOW_UP_BOSS", "OTHER"],
          description: "Origen del lead. Default: OTHER",
        },
        property_id: { type: "string", description: "ID de la propiedad de interés (opcional)" },
        notes: { type: "string", description: "Notas iniciales sobre el lead (opcional)" },
      },
      required: ["name"],
    },
  },
  {
    name: "update_lead",
    description:
      "Actualiza el estado, notas o propiedad asignada de un lead existente. Úsalo para avanzar leads en el pipeline de ventas.",
    input_schema: {
      type: "object",
      properties: {
        lead_id: { type: "string", description: "ID del lead a actualizar" },
        status: {
          type: "string",
          enum: ["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"],
          description: "Nuevo estado del lead en el pipeline",
        },
        notes: { type: "string", description: "Notas o comentarios a registrar" },
        property_id: { type: "string", description: "ID de la propiedad a asignar al lead" },
      },
      required: ["lead_id"],
    },
  },
  {
    name: "schedule_follow_up",
    description:
      "Programa una tarea de seguimiento para un lead (llamada, email, WhatsApp). Devuelve la tarea programada.",
    input_schema: {
      type: "object",
      properties: {
        lead_id: { type: "string", description: "ID del lead al que se programa el seguimiento" },
        type: {
          type: "string",
          enum: ["CALL", "EMAIL", "WHATSAPP", "REMINDER"],
          description: "Tipo de seguimiento. Default: CALL",
        },
        scheduled_at: {
          type: "string",
          description: "Fecha y hora del seguimiento en ISO 8601. Ej: '2026-03-17T10:00:00'",
        },
        content: { type: "string", description: "Guión o notas para el seguimiento" },
      },
      required: ["lead_id", "scheduled_at", "content"],
    },
  },
  {
    name: "list_follow_ups",
    description:
      "Lista las tareas de seguimiento pendientes o vencidas de la organización. Ideal para el resumen diario de actividades.",
    input_schema: {
      type: "object",
      properties: {
        filter: {
          type: "string",
          enum: ["pending", "overdue", "all"],
          description: "'overdue' = vencidos (default), 'pending' = futuros, 'all' = todos los pendientes",
        },
        limit: { type: "number", description: "Número máximo de resultados. Default: 10" },
      },
      required: [],
    },
  },
  {
    name: "get_property",
    description:
      "Obtiene los detalles completos de una propiedad específica: precio, área, características, imágenes y estado.",
    input_schema: {
      type: "object",
      properties: {
        property_id: { type: "string", description: "ID de la propiedad" },
      },
      required: ["property_id"],
    },
  },
  {
    name: "analyze_ad_performance",
    description:
      "Analiza el rendimiento de campañas de Meta Ads y/o Google Ads y genera recomendaciones específicas de optimización: presupuesto, targeting, copy, CPL. Úsalo cuando el usuario quiera saber cómo están sus campañas o qué mejorar.",
    input_schema: {
      type: "object",
      properties: {
        platform: {
          type: "string",
          enum: ["meta", "google", "both"],
          description: "Plataforma a analizar. Default: both",
        },
        campaign_id: {
          type: "string",
          description: "ID de campaña específica. Omitir para analizar todas las activas.",
        },
      },
      required: [],
    },
  },
  {
    name: "enroll_lead_drip",
    description:
      "Inscribe un lead en una secuencia de email drip. Si se proporciona drip_id lo usa directamente; si no, selecciona automáticamente la secuencia más adecuada según el perfil del lead (estatus, fuente, score). El lead debe tener email.",
    input_schema: {
      type: "object",
      properties: {
        lead_id: {
          type: "string",
          description: "ID del lead a inscribir",
        },
        drip_id: {
          type: "string",
          description: "ID de la secuencia de drip específica. Omitir para selección automática.",
        },
      },
      required: ["lead_id"],
    },
  },
  {
    name: "suggest_keywords_orlando",
    description:
      "Genera una lista curada de palabras clave de alto rendimiento para Google Ads en el mercado inmobiliario de Orlando, Florida. Incluye keywords en inglés y español, organizadas por zona, tipo de propiedad y buyer persona. No requiere conexión a Google Ads.",
    input_schema: {
      type: "object",
      properties: {
        zone: {
          type: "string",
          enum: ["kissimmee", "champions_gate", "lake_nona", "dr_phillips", "celebration", "windermere", "downtown", "clermont", "all"],
          description: "Zona específica de Orlando. Default: all",
        },
        property_type: {
          type: "string",
          enum: ["single_family", "condo", "townhouse", "vacation_rental", "investment", "all"],
          description: "Tipo de propiedad. Default: all",
        },
        language: {
          type: "string",
          enum: ["en", "es", "both"],
          description: "Idioma de las keywords. Default: both",
        },
      },
      required: [],
    },
  },
];

// ---------------------------------------------------------------------------
// Tool executor — runs a tool and returns a result string
// ---------------------------------------------------------------------------

export async function executeTool(
  toolName: string,
  input: Record<string, any>,
  context: { organizationId: string; userId: string },
): Promise<string> {
  try {
    switch (toolName) {
      case "list_properties":
        return await execListProperties(input, context);
      case "list_leads":
        return await execListLeads(input, context);
      case "create_campaign":
        return await execCreateCampaign(input, context);
      case "list_campaigns":
        return await execListCampaigns(input, context);
      case "get_campaign_performance":
        return await execGetCampaignPerformance(input, context);
      case "publish_campaign":
        return await execPublishCampaign(input, context);
      case "pause_campaign":
        return await execPauseCampaign(input, context);
      case "generate_ad_content":
        return await execGenerateAdContent(input, context);
      case "search_locations":
        return await execSearchLocations(input, context);
      case "search_interests":
        return await execSearchInterests(input, context);
      case "check_meta_connection":
        return await execCheckMetaConnection(context);
      case "get_dashboard_summary":
        return await execGetDashboardSummary(context);
      case "create_google_campaign":
        return await execCreateGoogleCampaign(input, context);
      case "list_google_campaigns":
        return await execListGoogleCampaigns(input, context);
      case "get_google_campaign_performance":
        return await execGetGoogleCampaignPerformance(input, context);
      case "publish_google_campaign":
        return await execPublishGoogleCampaign(input, context);
      case "pause_google_campaign":
        return await execPauseGoogleCampaign(input, context);
      case "check_google_connection":
        return await execCheckGoogleConnection(context);
      case "search_google_keywords":
        return await execSearchGoogleKeywords(input, context);
      case "search_google_locations":
        return await execSearchGoogleLocations(input, context);
      case "create_lead":
        return await execCreateLead(input, context);
      case "update_lead":
        return await execUpdateLead(input, context);
      case "schedule_follow_up":
        return await execScheduleFollowUp(input, context);
      case "list_follow_ups":
        return await execListFollowUps(input, context);
      case "get_property":
        return await execGetProperty(input, context);
      case "analyze_ad_performance":
        return await execAnalyzeAdPerformance(input, context);
      case "enroll_lead_drip":
        return await execEnrollLeadDrip(input, context);
      case "suggest_keywords_orlando":
        return await execSuggestKeywordsOrlando(input);
      default:
        return JSON.stringify({ error: `Herramienta desconocida: ${toolName}` });
    }
  } catch (error: any) {
    console.error(`[agent-tool] ${toolName} error:`, error);
    return JSON.stringify({
      error: error.message || "Error ejecutando herramienta",
    });
  }
}

// ---------------------------------------------------------------------------
// Individual tool implementations
// ---------------------------------------------------------------------------

async function execListProperties(
  input: Record<string, any>,
  ctx: { organizationId: string },
) {
  const properties = await prisma.property.findMany({
    where: {
      organizationId: ctx.organizationId,
      ...(input.status ? { status: input.status } : {}),
    },
    select: {
      id: true,
      title: true,
      propertyType: true,
      operationType: true,
      price: true,
      currency: true,
      city: true,
      state: true,
      bedrooms: true,
      bathrooms: true,
      status: true,
      images: true,
    },
    orderBy: { createdAt: "desc" },
    take: input.limit || 10,
  });

  return JSON.stringify({
    count: properties.length,
    properties: properties.map((p) => ({
      ...p,
      price: p.price ? Number(p.price) : null,
      firstImage: Array.isArray(p.images) ? (p.images as string[])[0] : null,
    })),
  });
}

async function execListLeads(
  input: Record<string, any>,
  ctx: { organizationId: string },
) {
  const leads = await prisma.lead.findMany({
    where: {
      organizationId: ctx.organizationId,
      ...(input.status ? { status: input.status } : {}),
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      source: true,
      status: true,
      createdAt: true,
      property: { select: { id: true, title: true } },
    },
    orderBy: { createdAt: "desc" },
    take: input.limit || 10,
  });

  return JSON.stringify({ count: leads.length, leads });
}

async function execCreateCampaign(
  input: Record<string, any>,
  ctx: { organizationId: string; userId: string },
) {
  const campaign = await prisma.metaCampaign.create({
    data: {
      organizationId: ctx.organizationId,
      createdById: ctx.userId,
      name: input.name,
      objective: input.objective || "LEAD_GENERATION",
      status: "DRAFT",
      dailyBudget: input.daily_budget || null,
      currency: "USD",
      headline: input.headline || null,
      primaryText: input.primary_text || null,
      description: input.description || null,
      callToAction: input.call_to_action || "LEARN_MORE",
      targetLocations: input.target_locations || null,
      targetAgeMin: input.target_age_min ?? 25,
      targetAgeMax: input.target_age_max ?? 65,
      targetInterests: input.target_interests || null,
      targetPlatforms: input.target_platforms || ["facebook", "instagram"],
      propertyId: input.property_id || null,
    },
  });

  return JSON.stringify({
    success: true,
    campaign_id: campaign.id,
    name: campaign.name,
    status: "DRAFT",
    message: `Campaña "${campaign.name}" creada en borrador. Usa publish_campaign para publicarla en Meta Ads.`,
  });
}

async function execListCampaigns(
  input: Record<string, any>,
  ctx: { organizationId: string },
) {
  const campaigns = await prisma.metaCampaign.findMany({
    where: {
      organizationId: ctx.organizationId,
      ...(input.status ? { status: input.status } : {}),
    },
    select: {
      id: true,
      name: true,
      objective: true,
      status: true,
      dailyBudget: true,
      currency: true,
      impressions: true,
      clicks: true,
      leads: true,
      spent: true,
      publishedAt: true,
      createdAt: true,
      property: { select: { id: true, title: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return JSON.stringify({
    count: campaigns.length,
    campaigns: campaigns.map((c) => ({
      ...c,
      dailyBudget: c.dailyBudget ? Number(c.dailyBudget) : null,
      spent: c.spent ? Number(c.spent) : null,
    })),
  });
}

async function execGetCampaignPerformance(
  input: Record<string, any>,
  ctx: { organizationId: string },
) {
  const campaign = await prisma.metaCampaign.findFirst({
    where: { id: input.campaign_id, organizationId: ctx.organizationId },
    include: { property: { select: { id: true, title: true } } },
  });

  if (!campaign) {
    return JSON.stringify({ error: "Campaña no encontrada" });
  }

  // If published, try to fetch fresh insights from Meta
  let metaInsights = null;
  if (campaign.metaCampaignId) {
    const org = await prisma.organization.findUnique({
      where: { id: ctx.organizationId },
      select: { metaAccessToken: true },
    });

    if (org?.metaAccessToken) {
      try {
        const insights = await getCampaignInsights(
          campaign.metaCampaignId,
          org.metaAccessToken,
        );
        metaInsights = insights[0] || null;

        // Update local metrics
        if (metaInsights) {
          const leadActions = metaInsights.actions?.find(
            (a) => a.action_type === "lead",
          );
          await prisma.metaCampaign.update({
            where: { id: campaign.id },
            data: {
              impressions: parseInt(metaInsights.impressions) || 0,
              clicks: parseInt(metaInsights.clicks) || 0,
              spent: parseFloat(metaInsights.spend) || 0,
              leads: leadActions ? parseInt(leadActions.value) : 0,
              ctr: metaInsights.ctr ? parseFloat(metaInsights.ctr) : null,
              lastSyncAt: new Date(),
            },
          });
        }
      } catch {
        // Ignore — use cached metrics
      }
    }
  }

  return JSON.stringify({
    campaign: {
      id: campaign.id,
      name: campaign.name,
      status: campaign.status,
      objective: campaign.objective,
      dailyBudget: campaign.dailyBudget ? Number(campaign.dailyBudget) : null,
      property: campaign.property,
    },
    metrics: {
      impressions: campaign.impressions || 0,
      clicks: campaign.clicks || 0,
      leads: campaign.leads || 0,
      spent: campaign.spent ? Number(campaign.spent) : 0,
      cpl: campaign.cpl ? Number(campaign.cpl) : null,
      ctr: campaign.ctr ? Number(campaign.ctr) : null,
    },
    lastSyncAt: campaign.lastSyncAt,
  });
}

async function execPublishCampaign(
  input: Record<string, any>,
  ctx: { organizationId: string },
) {
  // Delegate to the publish API route logic — but call it internally
  const campaign = await prisma.metaCampaign.findFirst({
    where: { id: input.campaign_id, organizationId: ctx.organizationId },
  });

  if (!campaign) {
    return JSON.stringify({ error: "Campaña no encontrada" });
  }

  if (!["DRAFT", "ERROR"].includes(campaign.status)) {
    return JSON.stringify({
      error: `La campaña está en estado "${campaign.status}". Solo se pueden publicar borradores.`,
    });
  }

  // Check Meta connection
  const org = await prisma.organization.findUnique({
    where: { id: ctx.organizationId },
    select: {
      metaAccessToken: true,
      metaAdAccountId: true,
      metaPageId: true,
      metaTokenExpiresAt: true,
    },
  });

  if (!org?.metaAccessToken || !org?.metaAdAccountId || !org?.metaPageId) {
    return JSON.stringify({
      error:
        "Meta Ads no está conectado. El usuario debe ir a Configuración → Integraciones para conectar su cuenta de Meta.",
      action_needed: "connect_meta",
    });
  }

  if (!campaign.headline || !campaign.primaryText || !campaign.dailyBudget) {
    return JSON.stringify({
      error:
        "La campaña necesita headline, texto principal y presupuesto diario antes de publicar.",
    });
  }

  // Use the publish API
  try {
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/campaigns/${campaign.id}/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    const data = await res.json();

    if (!res.ok) {
      return JSON.stringify({
        error: data.error || "Error publicando campaña",
        details: data.details,
      });
    }

    return JSON.stringify({
      success: true,
      message: `Campaña "${campaign.name}" publicada exitosamente en Meta Ads. Está en estado PAUSED — el usuario puede activarla desde el panel de campañas.`,
      meta_ids: data.metaIds,
    });
  } catch (error: any) {
    return JSON.stringify({
      error: error.message || "Error al publicar",
    });
  }
}

async function execPauseCampaign(
  input: Record<string, any>,
  ctx: { organizationId: string },
) {
  const campaign = await prisma.metaCampaign.findFirst({
    where: { id: input.campaign_id, organizationId: ctx.organizationId },
  });

  if (!campaign) {
    return JSON.stringify({ error: "Campaña no encontrada" });
  }

  if (campaign.status !== "ACTIVE") {
    return JSON.stringify({
      error: `La campaña está en estado "${campaign.status}". Solo se pueden pausar campañas activas.`,
    });
  }

  await prisma.metaCampaign.update({
    where: { id: campaign.id },
    data: { status: "PAUSED" },
  });

  // Also pause on Meta if published
  if (campaign.metaCampaignId) {
    const org = await prisma.organization.findUnique({
      where: { id: ctx.organizationId },
      select: { metaAccessToken: true },
    });

    if (org?.metaAccessToken) {
      try {
        const { updateCampaignStatus } = await import("@/lib/meta-ads");
        await updateCampaignStatus(
          campaign.metaCampaignId,
          org.metaAccessToken,
          "PAUSED",
        );
      } catch {
        // Local status updated, Meta might fail
      }
    }
  }

  return JSON.stringify({
    success: true,
    message: `Campaña "${campaign.name}" pausada.`,
  });
}

async function execGenerateAdContent(
  input: Record<string, any>,
  ctx: { organizationId: string },
) {
  const property = await prisma.property.findFirst({
    where: { id: input.property_id, organizationId: ctx.organizationId },
  });

  if (!property) {
    return JSON.stringify({ error: "Propiedad no encontrada" });
  }

  const aiConfig = await getPlatformAIConfig();
  if (!aiConfig) {
    return JSON.stringify({ error: "IA no configurada" });
  }

  const tone = input.tone || "profesional";
  const platform = input.platform || "facebook";

  const prompt = `Genera contenido para un anuncio de ${platform} de la siguiente propiedad inmobiliaria:

PROPIEDAD:
- Título: ${property.title}
- Tipo: ${property.propertyType} | Operación: ${property.operationType}
${property.price ? `- Precio: ${property.currency || "USD"} ${property.price}` : ""}
${property.area ? `- Área: ${property.area} m²` : ""}
${property.bedrooms ? `- Recámaras: ${property.bedrooms}` : ""}
${property.bathrooms ? `- Baños: ${property.bathrooms}` : ""}
${property.city ? `- Ubicación: ${property.city}${property.state ? `, ${property.state}` : ""}` : ""}
${property.description ? `- Descripción: ${property.description}` : ""}

INSTRUCCIONES:
Genera un JSON con estos campos (SIN markdown, solo JSON puro):
{
  "headline": "Título del anuncio (máx 40 caracteres)",
  "primary_text": "Texto principal del anuncio (máx 125 caracteres, persuasivo)",
  "description": "Descripción breve (máx 30 caracteres)"
}

Tono: ${tone}
Idioma: Español
Enfoque: Captar leads de compradores/arrendatarios interesados.`;

  const result = await generateContent({
    provider: aiConfig.provider as "claude" | "openai",
    apiKey: aiConfig.apiKey,
    model: aiConfig.model,
    prompt,
    systemPrompt:
      "Eres un experto en copywriting para Facebook/Instagram Ads inmobiliarios. Genera SOLO JSON válido sin markdown.",
    maxTokens: 300,
  });

  // Try to parse the JSON from the response
  try {
    const cleaned = result.replace(/```json?\s*/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    return JSON.stringify({
      success: true,
      content: parsed,
      property: { id: property.id, title: property.title },
    });
  } catch {
    return JSON.stringify({
      success: true,
      raw_content: result,
      property: { id: property.id, title: property.title },
      note: "No se pudo parsear como JSON. Contenido generado en texto libre.",
    });
  }
}

async function execSearchLocations(
  input: Record<string, any>,
  ctx: { organizationId: string },
) {
  const org = await prisma.organization.findUnique({
    where: { id: ctx.organizationId },
    select: { metaAccessToken: true },
  });

  if (!org?.metaAccessToken) {
    return JSON.stringify({
      error: "Meta no está conectado. No se pueden buscar ubicaciones.",
      // Return some common real estate locations as fallback
      suggestion:
        "El usuario debe conectar Meta Ads primero en Configuración → Integraciones.",
    });
  }

  const locations = await searchLocations(
    org.metaAccessToken,
    input.query,
    input.type || "city",
  );

  return JSON.stringify({
    count: locations.length,
    locations: locations.map((l) => ({
      key: l.key,
      name: l.name,
      type: l.type,
      country_code: l.country_code,
    })),
  });
}

async function execSearchInterests(
  input: Record<string, any>,
  ctx: { organizationId: string },
) {
  const org = await prisma.organization.findUnique({
    where: { id: ctx.organizationId },
    select: { metaAccessToken: true },
  });

  if (!org?.metaAccessToken) {
    return JSON.stringify({
      error: "Meta no está conectado.",
    });
  }

  const interests = await searchInterests(org.metaAccessToken, input.query);

  return JSON.stringify({
    count: interests.length,
    interests: interests.map((i) => ({
      id: i.id,
      name: i.name,
      audience_size_lower: i.audience_size_lower_bound,
      audience_size_upper: i.audience_size_upper_bound,
    })),
  });
}

async function execCheckMetaConnection(ctx: { organizationId: string }) {
  const org = await prisma.organization.findUnique({
    where: { id: ctx.organizationId },
    select: {
      metaAccessToken: true,
      metaPageName: true,
      metaPageId: true,
      metaAdAccountName: true,
      metaAdAccountId: true,
      metaConnectedAt: true,
      metaTokenExpiresAt: true,
    },
  });

  if (!org?.metaAccessToken) {
    return JSON.stringify({
      connected: false,
      message:
        "Meta Ads no está conectado. El usuario debe ir a Configuración → Integraciones → Meta Ads para conectar su cuenta.",
    });
  }

  const expired = org.metaTokenExpiresAt
    ? new Date(org.metaTokenExpiresAt) < new Date()
    : false;

  return JSON.stringify({
    connected: true,
    expired,
    page: org.metaPageName,
    ad_account: org.metaAdAccountName,
    connected_at: org.metaConnectedAt,
    expires_at: org.metaTokenExpiresAt,
    message: expired
      ? "El token ha expirado. El usuario debe reconectar en Configuración."
      : "Meta Ads está conectado y funcionando.",
  });
}

async function execGetDashboardSummary(ctx: { organizationId: string }) {
  const [
    leadsByStatus,
    propertiesCount,
    pendingFollowUps,
    activeCampaigns,
    totalCampaigns,
    campaignMetrics,
    activeGoogleCampaigns,
    totalGoogleCampaigns,
    googleCampaignMetrics,
  ] = await Promise.all([
    prisma.lead.groupBy({
      by: ["status"],
      where: { organizationId: ctx.organizationId },
      _count: { id: true },
    }),
    prisma.property.count({
      where: { organizationId: ctx.organizationId },
    }),
    prisma.followUpTask.count({
      where: {
        organizationId: ctx.organizationId,
        completedAt: null,
        scheduledAt: { lte: new Date() },
      },
    }),
    prisma.metaCampaign.count({
      where: { organizationId: ctx.organizationId, status: "ACTIVE" },
    }),
    prisma.metaCampaign.count({
      where: { organizationId: ctx.organizationId },
    }),
    prisma.metaCampaign.aggregate({
      where: { organizationId: ctx.organizationId },
      _sum: { impressions: true, clicks: true, leads: true, spent: true },
    }),
    prisma.googleCampaign.count({
      where: { organizationId: ctx.organizationId, status: "ACTIVE" },
    }),
    prisma.googleCampaign.count({
      where: { organizationId: ctx.organizationId },
    }),
    prisma.googleCampaign.aggregate({
      where: { organizationId: ctx.organizationId },
      _sum: { impressions: true, clicks: true, leads: true, spent: true },
    }),
  ]);

  const leadCounts = leadsByStatus.reduce(
    (acc, g) => {
      acc[g.status] = g._count.id;
      return acc;
    },
    {} as Record<string, number>,
  );

  return JSON.stringify({
    leads: {
      total: Object.values(leadCounts).reduce((a, b) => a + b, 0),
      by_status: leadCounts,
    },
    properties: propertiesCount,
    follow_ups_pending: pendingFollowUps,
    campaigns: {
      meta: {
        total: totalCampaigns,
        active: activeCampaigns,
        total_impressions: campaignMetrics._sum.impressions || 0,
        total_clicks: campaignMetrics._sum.clicks || 0,
        total_leads: campaignMetrics._sum.leads || 0,
        total_spent: campaignMetrics._sum.spent
          ? Number(campaignMetrics._sum.spent)
          : 0,
      },
      google: {
        total: totalGoogleCampaigns,
        active: activeGoogleCampaigns,
        total_impressions: googleCampaignMetrics._sum.impressions || 0,
        total_clicks: googleCampaignMetrics._sum.clicks || 0,
        total_leads: googleCampaignMetrics._sum.leads || 0,
        total_spent: googleCampaignMetrics._sum.spent
          ? Number(googleCampaignMetrics._sum.spent)
          : 0,
      },
    },
  });
}

// ---------------------------------------------------------------------------
// Google Ads tool implementations
// ---------------------------------------------------------------------------

async function execCreateGoogleCampaign(
  input: Record<string, any>,
  ctx: { organizationId: string; userId: string },
) {
  const campaign = await prisma.googleCampaign.create({
    data: {
      organizationId: ctx.organizationId,
      createdById: ctx.userId,
      name: input.name,
      objective: input.objective || "LEAD_GENERATION",
      status: "DRAFT",
      dailyBudget: input.daily_budget || null,
      currency: "USD",
      headlines: input.headlines || null,
      descriptions: input.descriptions || null,
      finalUrl: input.final_url || null,
      targetKeywords: input.target_keywords || null,
      targetLocations: input.target_locations || null,
      targetAgeMin: input.target_age_min ?? 25,
      targetAgeMax: input.target_age_max ?? 65,
      propertyId: input.property_id || null,
    },
  });

  return JSON.stringify({
    success: true,
    campaign_id: campaign.id,
    name: campaign.name,
    status: "DRAFT",
    message: `Campaña de Google Ads "${campaign.name}" creada en borrador. Usa publish_google_campaign para publicarla.`,
  });
}

async function execListGoogleCampaigns(
  input: Record<string, any>,
  ctx: { organizationId: string },
) {
  const campaigns = await prisma.googleCampaign.findMany({
    where: {
      organizationId: ctx.organizationId,
      ...(input.status ? { status: input.status } : {}),
    },
    select: {
      id: true,
      name: true,
      objective: true,
      status: true,
      dailyBudget: true,
      currency: true,
      impressions: true,
      clicks: true,
      leads: true,
      conversions: true,
      spent: true,
      publishedAt: true,
      createdAt: true,
      property: { select: { id: true, title: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return JSON.stringify({
    count: campaigns.length,
    platform: "google_ads",
    campaigns: campaigns.map((c) => ({
      ...c,
      dailyBudget: c.dailyBudget ? Number(c.dailyBudget) : null,
      spent: c.spent ? Number(c.spent) : null,
    })),
  });
}

async function execGetGoogleCampaignPerformance(
  input: Record<string, any>,
  ctx: { organizationId: string },
) {
  const campaign = await prisma.googleCampaign.findFirst({
    where: { id: input.campaign_id, organizationId: ctx.organizationId },
    include: { property: { select: { id: true, title: true } } },
  });

  if (!campaign) {
    return JSON.stringify({ error: "Campaña de Google Ads no encontrada" });
  }

  // If published, try to fetch fresh insights
  if (campaign.googleCampaignId) {
    const org = await prisma.organization.findUnique({
      where: { id: ctx.organizationId },
      select: {
        googleAccessToken: true,
        googleRefreshToken: true,
        googleCustomerId: true,
        googleTokenExpiresAt: true,
      },
    });

    if (org?.googleAccessToken && org?.googleCustomerId) {
      try {
        const { accessToken } = await getGoogleValidToken(
          org.googleAccessToken,
          org.googleRefreshToken,
          org.googleTokenExpiresAt,
        );

        const insights = await getGoogleCampaignInsights(
          accessToken,
          org.googleCustomerId,
          campaign.googleCampaignId,
        );

        if (insights) {
          await prisma.googleCampaign.update({
            where: { id: campaign.id },
            data: {
              impressions: parseInt(insights.impressions) || 0,
              clicks: parseInt(insights.clicks) || 0,
              spent: parseInt(insights.costMicros) / 1_000_000 || 0,
              conversions: parseInt(insights.conversions) || 0,
              ctr: parseFloat(insights.ctr) || null,
              lastSyncAt: new Date(),
            },
          });
        }
      } catch {
        // Ignore — use cached metrics
      }
    }
  }

  return JSON.stringify({
    platform: "google_ads",
    campaign: {
      id: campaign.id,
      name: campaign.name,
      status: campaign.status,
      objective: campaign.objective,
      dailyBudget: campaign.dailyBudget ? Number(campaign.dailyBudget) : null,
      property: campaign.property,
    },
    metrics: {
      impressions: campaign.impressions || 0,
      clicks: campaign.clicks || 0,
      leads: campaign.leads || 0,
      conversions: campaign.conversions || 0,
      spent: campaign.spent ? Number(campaign.spent) : 0,
      cpl: campaign.cpl ? Number(campaign.cpl) : null,
      ctr: campaign.ctr ? Number(campaign.ctr) : null,
    },
    lastSyncAt: campaign.lastSyncAt,
  });
}

async function execPublishGoogleCampaign(
  input: Record<string, any>,
  ctx: { organizationId: string },
) {
  const campaign = await prisma.googleCampaign.findFirst({
    where: { id: input.campaign_id, organizationId: ctx.organizationId },
  });

  if (!campaign) {
    return JSON.stringify({ error: "Campaña de Google Ads no encontrada" });
  }

  if (!["DRAFT", "ERROR"].includes(campaign.status)) {
    return JSON.stringify({
      error: `La campaña está en estado "${campaign.status}". Solo se pueden publicar borradores.`,
    });
  }

  // Check Google connection
  const org = await prisma.organization.findUnique({
    where: { id: ctx.organizationId },
    select: {
      googleAccessToken: true,
      googleRefreshToken: true,
      googleCustomerId: true,
      googleTokenExpiresAt: true,
    },
  });

  if (!org?.googleAccessToken || !org?.googleCustomerId) {
    return JSON.stringify({
      error:
        "Google Ads no está conectado. El usuario debe ir a Configuración → Integraciones para conectar su cuenta de Google.",
      action_needed: "connect_google",
    });
  }

  const headlines = (campaign.headlines as unknown as string[]) || [];
  const descriptions = (campaign.descriptions as unknown as string[]) || [];

  if (headlines.length < 1 || descriptions.length < 1 || !campaign.dailyBudget) {
    return JSON.stringify({
      error:
        "La campaña necesita al menos 1 headline, 1 descripción y presupuesto diario antes de publicar.",
    });
  }

  try {
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/campaigns/google/${campaign.id}/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    const data = await res.json();

    if (!res.ok) {
      return JSON.stringify({
        error: data.error || "Error publicando campaña en Google Ads",
        details: data.details,
      });
    }

    return JSON.stringify({
      success: true,
      message: `Campaña "${campaign.name}" publicada exitosamente en Google Ads. Está en estado PAUSED — el usuario puede activarla desde el panel de campañas.`,
      google_ids: data.googleIds,
    });
  } catch (error: any) {
    return JSON.stringify({
      error: error.message || "Error al publicar en Google Ads",
    });
  }
}

async function execPauseGoogleCampaign(
  input: Record<string, any>,
  ctx: { organizationId: string },
) {
  const campaign = await prisma.googleCampaign.findFirst({
    where: { id: input.campaign_id, organizationId: ctx.organizationId },
  });

  if (!campaign) {
    return JSON.stringify({ error: "Campaña de Google Ads no encontrada" });
  }

  if (campaign.status !== "ACTIVE") {
    return JSON.stringify({
      error: `La campaña está en estado "${campaign.status}". Solo se pueden pausar campañas activas.`,
    });
  }

  await prisma.googleCampaign.update({
    where: { id: campaign.id },
    data: { status: "PAUSED" },
  });

  // Also pause on Google if published
  if (campaign.googleCampaignId) {
    const org = await prisma.organization.findUnique({
      where: { id: ctx.organizationId },
      select: {
        googleAccessToken: true,
        googleRefreshToken: true,
        googleCustomerId: true,
        googleTokenExpiresAt: true,
      },
    });

    if (org?.googleAccessToken && org?.googleCustomerId) {
      try {
        const { updateCampaignStatus } = await import("@/lib/google-ads");
        const { accessToken } = await getGoogleValidToken(
          org.googleAccessToken,
          org.googleRefreshToken,
          org.googleTokenExpiresAt,
        );
        await updateCampaignStatus(
          accessToken,
          org.googleCustomerId,
          `customers/${org.googleCustomerId.replace(/\D/g, "")}/campaigns/${campaign.googleCampaignId}`,
          "PAUSED",
        );
      } catch {
        // Local status updated
      }
    }
  }

  return JSON.stringify({
    success: true,
    message: `Campaña de Google Ads "${campaign.name}" pausada.`,
  });
}

async function execCheckGoogleConnection(ctx: { organizationId: string }) {
  const org = await prisma.organization.findUnique({
    where: { id: ctx.organizationId },
    select: {
      googleAccessToken: true,
      googleRefreshToken: true,
      googleCustomerId: true,
      googleCustomerName: true,
      googleConnectedAt: true,
      googleTokenExpiresAt: true,
    },
  });

  if (!org?.googleAccessToken) {
    return JSON.stringify({
      connected: false,
      message:
        "Google Ads no está conectado. El usuario debe ir a Configuración → Integraciones → Google Ads para conectar su cuenta.",
    });
  }

  const hasRefreshToken = !!org.googleRefreshToken;
  const tokenExpired = org.googleTokenExpiresAt
    ? new Date(org.googleTokenExpiresAt) < new Date()
    : false;

  return JSON.stringify({
    connected: true,
    expired: tokenExpired && !hasRefreshToken,
    can_auto_refresh: hasRefreshToken,
    customer_id: org.googleCustomerId,
    customer_name: org.googleCustomerName,
    connected_at: org.googleConnectedAt,
    expires_at: org.googleTokenExpiresAt,
    message: tokenExpired && !hasRefreshToken
      ? "El token ha expirado y no se puede refrescar automáticamente. El usuario debe reconectar en Configuración."
      : "Google Ads está conectado y funcionando.",
  });
}

async function execSearchGoogleKeywords(
  input: Record<string, any>,
  ctx: { organizationId: string },
) {
  const org = await prisma.organization.findUnique({
    where: { id: ctx.organizationId },
    select: {
      googleAccessToken: true,
      googleRefreshToken: true,
      googleCustomerId: true,
      googleTokenExpiresAt: true,
    },
  });

  if (!org?.googleAccessToken || !org?.googleCustomerId) {
    return JSON.stringify({
      error: "Google Ads no está conectado. No se pueden buscar palabras clave.",
      suggestion:
        "El usuario debe conectar Google Ads primero en Configuración → Integraciones.",
    });
  }

  try {
    const { accessToken } = await getGoogleValidToken(
      org.googleAccessToken,
      org.googleRefreshToken,
      org.googleTokenExpiresAt,
    );

    const ideas = await getKeywordIdeas(
      accessToken,
      org.googleCustomerId,
      input.keywords || [],
    );

    return JSON.stringify({
      count: ideas.length,
      keywords: ideas.map((k) => ({
        text: k.text,
        avg_monthly_searches: k.avgMonthlySearches,
        competition: k.competition,
      })),
    });
  } catch (error: any) {
    return JSON.stringify({
      error: error.message || "Error buscando palabras clave",
    });
  }
}

async function execSearchGoogleLocations(
  input: Record<string, any>,
  ctx: { organizationId: string },
) {
  const org = await prisma.organization.findUnique({
    where: { id: ctx.organizationId },
    select: {
      googleAccessToken: true,
      googleRefreshToken: true,
      googleTokenExpiresAt: true,
    },
  });

  if (!org?.googleAccessToken) {
    return JSON.stringify({
      error: "Google Ads no está conectado.",
      suggestion:
        "El usuario debe conectar Google Ads primero en Configuración → Integraciones.",
    });
  }

  try {
    const { accessToken } = await getGoogleValidToken(
      org.googleAccessToken,
      org.googleRefreshToken,
      org.googleTokenExpiresAt,
    );

    const locations = await searchGoogleLocations(
      accessToken,
      input.query,
      input.country_code || "US",
    );

    return JSON.stringify({
      count: locations.length,
      locations: locations.map((l) => ({
        id: l.id,
        name: l.name,
        canonical_name: l.canonicalName,
        type: l.targetType,
        country_code: l.countryCode,
      })),
    });
  } catch (error: any) {
    return JSON.stringify({
      error: error.message || "Error buscando ubicaciones",
    });
  }
}

// ---------------------------------------------------------------------------
// CRM & Follow-up tool implementations
// ---------------------------------------------------------------------------

async function execCreateLead(
  input: Record<string, any>,
  ctx: { organizationId: string; userId: string },
) {
  const lead = await prisma.lead.create({
    data: {
      organizationId: ctx.organizationId,
      name: input.name,
      email: input.email || null,
      phone: input.phone || null,
      source: (input.source as any) || "OTHER",
      status: "NEW",
      notes: input.notes || null,
      propertyId: input.property_id || null,
    },
  });

  return JSON.stringify({
    success: true,
    lead_id: lead.id,
    name: lead.name,
    status: "NEW",
    message: `Lead "${lead.name}" creado exitosamente en el CRM con estado NUEVO.`,
  });
}

async function execUpdateLead(
  input: Record<string, any>,
  ctx: { organizationId: string; userId: string },
) {
  const lead = await prisma.lead.findFirst({
    where: { id: input.lead_id, organizationId: ctx.organizationId },
  });

  if (!lead) {
    return JSON.stringify({ error: "Lead no encontrado" });
  }

  const updated = await prisma.lead.update({
    where: { id: lead.id },
    data: {
      ...(input.status ? { status: input.status } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
      ...(input.property_id !== undefined ? { propertyId: input.property_id || null } : {}),
    },
  });

  // Log activity
  if (input.status || input.notes) {
    try {
      await prisma.leadActivity.create({
        data: {
          leadId: lead.id,
          type: input.status ? "NOTE" : "NOTE",
          content: input.notes || `Estado actualizado a ${input.status}`,
          createdById: ctx.userId,
        },
      });
    } catch {
      // Activity logging is optional — ignore errors
    }
  }

  return JSON.stringify({
    success: true,
    lead_id: updated.id,
    name: updated.name,
    status: updated.status,
    message: `Lead "${updated.name}" actualizado correctamente.${input.status ? ` Estado: ${input.status}.` : ""}`,
  });
}

async function execScheduleFollowUp(
  input: Record<string, any>,
  ctx: { organizationId: string; userId: string },
) {
  const lead = await prisma.lead.findFirst({
    where: { id: input.lead_id, organizationId: ctx.organizationId },
  });

  if (!lead) {
    return JSON.stringify({ error: "Lead no encontrado" });
  }

  let scheduledAt: Date;
  try {
    scheduledAt = new Date(input.scheduled_at);
    if (isNaN(scheduledAt.getTime())) throw new Error("Invalid date");
  } catch {
    return JSON.stringify({
      error: "Fecha inválida. Usa formato ISO 8601. Ej: '2026-03-17T10:00:00'",
    });
  }

  const task = await prisma.followUpTask.create({
    data: {
      organizationId: ctx.organizationId,
      leadId: input.lead_id,
      createdById: ctx.userId,
      type: (input.type as any) || "CALL",
      content: input.content || `Seguimiento de tipo ${input.type || "CALL"}`,
      scheduledAt,
    },
  });

  const dateLabel = scheduledAt.toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const timeLabel = scheduledAt.toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return JSON.stringify({
    success: true,
    task_id: task.id,
    lead_name: lead.name,
    type: task.type,
    scheduled_at: task.scheduledAt,
    message: `✅ Seguimiento programado para "${lead.name}" — ${dateLabel} a las ${timeLabel}.`,
  });
}

async function execListFollowUps(
  input: Record<string, any>,
  ctx: { organizationId: string },
) {
  const filter = input.filter || "overdue";
  const now = new Date();

  const where: Record<string, any> = {
    organizationId: ctx.organizationId,
    completedAt: null,
  };

  if (filter === "overdue") {
    where.scheduledAt = { lte: now };
  } else if (filter === "pending") {
    where.scheduledAt = { gt: now };
  }
  // "all" = all pending (no scheduledAt filter beyond completedAt: null)

  const tasks = await prisma.followUpTask.findMany({
    where,
    include: {
      lead: { select: { id: true, name: true, phone: true, email: true, status: true } },
    },
    orderBy: { scheduledAt: "asc" },
    take: input.limit || 10,
  });

  return JSON.stringify({
    count: tasks.length,
    filter,
    follow_ups: tasks.map((t) => ({
      id: t.id,
      type: t.type,
      content: t.content,
      scheduled_at: t.scheduledAt,
      is_overdue: t.scheduledAt < now,
      lead: t.lead,
    })),
  });
}

async function execGetProperty(
  input: Record<string, any>,
  ctx: { organizationId: string },
) {
  const property = await prisma.property.findFirst({
    where: { id: input.property_id, organizationId: ctx.organizationId },
  });

  if (!property) {
    return JSON.stringify({ error: "Propiedad no encontrada" });
  }

  return JSON.stringify({
    id: property.id,
    title: property.title,
    propertyType: property.propertyType,
    operationType: property.operationType,
    status: property.status,
    price: property.price ? Number(property.price) : null,
    currency: property.currency,
    area: property.area ? Number(property.area) : null,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    city: property.city,
    state: property.state,
    address: property.address,
    description: property.description,
    features: Array.isArray(property.features) ? property.features : [],
    images: Array.isArray(property.images) ? property.images : [],
    createdAt: property.createdAt,
  });
}

// ---------------------------------------------------------------------------
// New skill implementations
// ---------------------------------------------------------------------------

async function execAnalyzeAdPerformance(
  input: Record<string, any>,
  ctx: { organizationId: string },
) {
  const platform = input.platform || "both";
  const results: any = { platform, campaigns: [] };

  // Fetch Meta campaigns
  if (platform === "meta" || platform === "both") {
    const where: any = {
      organizationId: ctx.organizationId,
      status: { in: ["ACTIVE", "PAUSED", "COMPLETED"] },
    };
    if (input.campaign_id) where.id = input.campaign_id;

    const metaCampaigns = await prisma.metaCampaign.findMany({
      where,
      select: {
        id: true,
        name: true,
        status: true,
        objective: true,
        dailyBudget: true,
        impressions: true,
        clicks: true,
        leads: true,
        spent: true,
        cpl: true,
        ctr: true,
        lastSyncAt: true,
        property: { select: { title: true } },
      },
      orderBy: { publishedAt: "desc" },
      take: input.campaign_id ? 1 : 10,
    });

    for (const c of metaCampaigns) {
      const spent = c.spent ? Number(c.spent) : 0;
      const cpl = c.cpl ? Number(c.cpl) : (c.leads && c.leads > 0 ? spent / c.leads : null);
      const ctr = c.ctr ? Number(c.ctr) : null;

      const issues: string[] = [];
      const recommendations: string[] = [];

      if (cpl !== null && cpl > 30) {
        issues.push(`CPL alto: $${cpl.toFixed(2)}`);
        recommendations.push("Revisar el copy del anuncio y probar un nuevo hook visual");
        recommendations.push("Ampliar el radio geográfico del targeting");
      }
      if (ctr !== null && ctr < 1) {
        issues.push(`CTR bajo: ${ctr.toFixed(2)}%`);
        recommendations.push("El creativo no está generando clicks — probar imagen de la propiedad vs lifestyle");
        recommendations.push("Revisar si el headline menciona el precio o beneficio principal");
      }
      if (c.impressions && c.impressions > 5000 && (!c.leads || c.leads === 0)) {
        issues.push("Muchas impresiones pero 0 leads");
        recommendations.push("El formulario de lead puede estar fallando — verificar configuración en Meta");
        recommendations.push("Cambiar objetivo a TRAFFIC con landing page propia");
      }
      if (c.status === "PAUSED" && spent === 0) {
        issues.push("Campaña nunca gastó presupuesto");
        recommendations.push("Verificar que el método de pago esté activo en Meta Business");
      }
      if (issues.length === 0) {
        recommendations.push("Rendimiento dentro de parámetros normales");
        if (c.leads && c.leads > 5) {
          recommendations.push(`Buena captación (${c.leads} leads) — considera escalar presupuesto 20%`);
        }
      }

      results.campaigns.push({
        id: c.id,
        name: c.name,
        platform: "meta",
        status: c.status,
        objective: c.objective,
        property: c.property?.title || null,
        metrics: {
          impressions: c.impressions || 0,
          clicks: c.clicks || 0,
          leads: c.leads || 0,
          spent: `$${spent.toFixed(2)}`,
          cpl: cpl ? `$${cpl.toFixed(2)}` : "N/A",
          ctr: ctr ? `${ctr.toFixed(2)}%` : "N/A",
          daily_budget: c.dailyBudget ? `$${Number(c.dailyBudget).toFixed(2)}/día` : "N/A",
        },
        issues,
        recommendations,
        last_sync: c.lastSyncAt,
      });
    }
  }

  // Fetch Google campaigns
  if (platform === "google" || platform === "both") {
    const where: any = {
      organizationId: ctx.organizationId,
      status: { in: ["ACTIVE", "PAUSED", "COMPLETED"] },
    };
    if (input.campaign_id) where.id = input.campaign_id;

    const googleCampaigns = await prisma.googleCampaign.findMany({
      where,
      select: {
        id: true,
        name: true,
        status: true,
        objective: true,
        dailyBudget: true,
        impressions: true,
        clicks: true,
        conversions: true,
        spent: true,
        cpl: true,
        ctr: true,
        lastSyncAt: true,
        property: { select: { title: true } },
      },
      orderBy: { publishedAt: "desc" },
      take: input.campaign_id ? 1 : 10,
    });

    for (const c of googleCampaigns) {
      const spent = c.spent ? Number(c.spent) : 0;
      const cpl = c.cpl ? Number(c.cpl) : (c.conversions && c.conversions > 0 ? spent / c.conversions : null);
      const ctr = c.ctr ? Number(c.ctr) : null;

      const issues: string[] = [];
      const recommendations: string[] = [];

      if (cpl !== null && cpl > 40) {
        issues.push(`CPL alto: $${cpl.toFixed(2)}`);
        recommendations.push("Revisar calidad de keywords — pausar las de baja conversión");
        recommendations.push("Agregar negative keywords para excluir búsquedas no relevantes");
      }
      if (ctr !== null && ctr < 3) {
        issues.push(`CTR bajo para Search: ${ctr.toFixed(2)}%`);
        recommendations.push("Los headlines no están resonando — probar con precio y zona en el título");
        recommendations.push("Revisar que el anuncio aparezca en las horas pico del mercado");
      }
      if (c.impressions && c.impressions > 1000 && (!c.conversions || c.conversions === 0)) {
        issues.push("Impresiones sin conversiones");
        recommendations.push("Revisar la landing page — tiempo de carga y formulario de contacto");
        recommendations.push("Agregar extensiones de sitio y de llamada al anuncio");
      }
      if (issues.length === 0) {
        recommendations.push("Rendimiento dentro de parámetros normales para el mercado de Orlando");
        if (c.conversions && c.conversions > 3) {
          recommendations.push(`Buena conversión (${c.conversions}) — considera subir bid o presupuesto`);
        }
      }

      results.campaigns.push({
        id: c.id,
        name: c.name,
        platform: "google",
        status: c.status,
        objective: c.objective,
        property: c.property?.title || null,
        metrics: {
          impressions: c.impressions || 0,
          clicks: c.clicks || 0,
          conversions: c.conversions || 0,
          spent: `$${spent.toFixed(2)}`,
          cpl: cpl ? `$${cpl.toFixed(2)}` : "N/A",
          ctr: ctr ? `${ctr.toFixed(2)}%` : "N/A",
          daily_budget: c.dailyBudget ? `$${Number(c.dailyBudget).toFixed(2)}/día` : "N/A",
        },
        issues,
        recommendations,
        last_sync: c.lastSyncAt,
      });
    }
  }

  const totalIssues = results.campaigns.reduce((acc: number, c: any) => acc + c.issues.length, 0);
  results.summary = {
    total_campaigns: results.campaigns.length,
    campaigns_with_issues: results.campaigns.filter((c: any) => c.issues.length > 0).length,
    total_issues: totalIssues,
    overall_status: totalIssues === 0 ? "✅ Todo en orden" : `⚠️ ${totalIssues} problema(s) detectado(s)`,
  };

  return JSON.stringify(results);
}

async function execEnrollLeadDrip(
  input: Record<string, any>,
  ctx: { organizationId: string },
) {
  // 1. Fetch the lead
  const lead = await prisma.lead.findFirst({
    where: { id: input.lead_id, organizationId: ctx.organizationId },
  });

  if (!lead) return JSON.stringify({ error: "Lead no encontrado" });
  if (!lead.email) return JSON.stringify({ error: `El lead "${lead.name}" no tiene email registrado. Agrega el email primero.` });

  // 2. Find the drip to enroll in
  let drip: any = null;

  if (input.drip_id) {
    drip = await prisma.emailDrip.findFirst({
      where: { id: input.drip_id, organizationId: ctx.organizationId },
      include: { steps: { orderBy: { stepNumber: "asc" }, take: 1 } },
    });
    if (!drip) return JSON.stringify({ error: "Secuencia de drip no encontrada" });
  } else {
    // Auto-select: pick the best matching active drip based on lead profile
    const allDrips = await prisma.emailDrip.findMany({
      where: { organizationId: ctx.organizationId, status: "ACTIVE" },
      include: { steps: { orderBy: { stepNumber: "asc" }, take: 1 } },
      orderBy: { createdAt: "desc" },
    });

    if (allDrips.length === 0) {
      return JSON.stringify({
        error: "No hay secuencias de drip activas en esta organización. Crea una en la sección Email Drip.",
      });
    }

    // Matching logic: look for keywords in drip name that match lead profile
    const nameLower = (lead.name || "").toLowerCase();
    const sourceLower = (lead.source || "").toLowerCase();
    const statusLower = (lead.status || "").toLowerCase();

    const scored = allDrips.map((d: any) => {
      const dripName = d.name.toLowerCase();
      let score = 0;
      if (dripName.includes("inversi") && (sourceLower.includes("facebook") || sourceLower.includes("instagram"))) score += 2;
      if (dripName.includes("primera") && statusLower === "new") score += 2;
      if (dripName.includes("nurtur") || dripName.includes("frio")) score += 1;
      if (dripName.includes("hot") && statusLower === "qualified") score += 3;
      return { drip: d, score };
    });

    scored.sort((a: any, b: any) => b.score - a.score);
    drip = scored[0].drip;
  }

  // 3. Check if already enrolled
  const existing = await prisma.emailDripEnrollment.findUnique({
    where: { dripId_leadId: { dripId: drip.id, leadId: lead.id } },
  });

  if (existing && existing.status === "ACTIVE") {
    return JSON.stringify({
      already_enrolled: true,
      message: `"${lead.name}" ya está inscrito en la secuencia "${drip.name}" y está activa.`,
      drip_name: drip.name,
      current_step: existing.currentStep,
      next_send_at: existing.nextSendAt,
    });
  }

  // 4. Enroll
  const firstStep = drip.steps[0];
  const nextSendAt = firstStep
    ? new Date(Date.now() + firstStep.delayDays * 24 * 60 * 60 * 1000)
    : null;

  const enrollment = await prisma.emailDripEnrollment.upsert({
    where: { dripId_leadId: { dripId: drip.id, leadId: lead.id } },
    create: { dripId: drip.id, leadId: lead.id, currentStep: 0, status: "ACTIVE", nextSendAt },
    update: { status: "ACTIVE", currentStep: 0, nextSendAt, completedAt: null },
  });

  await prisma.emailDrip.update({
    where: { id: drip.id },
    data: { totalEnrolled: { increment: existing ? 0 : 1 } },
  });

  const nextSendFormatted = nextSendAt
    ? nextSendAt.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })
    : "inmediatamente";

  return JSON.stringify({
    success: true,
    enrollment_id: enrollment.id,
    lead_name: lead.name,
    lead_email: lead.email,
    drip_name: drip.name,
    drip_id: drip.id,
    steps_total: drip.steps?.length || "desconocido",
    first_email_scheduled: nextSendFormatted,
    message: `"${lead.name}" inscrito en "${drip.name}". Primer email programado para ${nextSendFormatted}.`,
  });
}

async function execSuggestKeywordsOrlando(input: Record<string, any>) {
  const zone = input.zone || "all";
  const propType = input.property_type || "all";
  const lang = input.language || "both";

  type KwEntry = { keyword: string; match_type: string; lang: string; intent: string };
  const keywords: KwEntry[] = [];

  const addKws = (list: KwEntry[]) => keywords.push(...list);

  // --- General Orlando real estate ---
  if (lang !== "es") {
    addKws([
      { keyword: "homes for sale in orlando florida", match_type: "BROAD", lang: "en", intent: "buyer" },
      { keyword: "orlando florida real estate", match_type: "BROAD", lang: "en", intent: "buyer" },
      { keyword: "buy a house in orlando", match_type: "PHRASE", lang: "en", intent: "buyer" },
      { keyword: "orlando homes for sale", match_type: "EXACT", lang: "en", intent: "buyer" },
      { keyword: "orlando investment property", match_type: "PHRASE", lang: "en", intent: "investor" },
      { keyword: "florida vacation rental for sale", match_type: "PHRASE", lang: "en", intent: "investor" },
      { keyword: "orlando short term rental property", match_type: "PHRASE", lang: "en", intent: "investor" },
      { keyword: "airbnb property orlando", match_type: "PHRASE", lang: "en", intent: "investor" },
    ]);
  }
  if (lang !== "en") {
    addKws([
      { keyword: "casas en venta orlando florida", match_type: "BROAD", lang: "es", intent: "buyer" },
      { keyword: "propiedades en orlando florida", match_type: "BROAD", lang: "es", intent: "buyer" },
      { keyword: "comprar casa en florida", match_type: "PHRASE", lang: "es", intent: "buyer" },
      { keyword: "inversión inmobiliaria florida", match_type: "PHRASE", lang: "es", intent: "investor" },
      { keyword: "renta vacacional orlando", match_type: "PHRASE", lang: "es", intent: "investor" },
      { keyword: "bienes raices orlando", match_type: "BROAD", lang: "es", intent: "buyer" },
      { keyword: "apartamentos en orlando florida", match_type: "PHRASE", lang: "es", intent: "buyer" },
    ]);
  }

  // --- Zone-specific keywords ---
  const zoneKeywords: Record<string, KwEntry[]> = {
    kissimmee: [
      { keyword: "homes for sale kissimmee fl", match_type: "PHRASE", lang: "en", intent: "buyer" },
      { keyword: "kissimmee vacation rental investment", match_type: "PHRASE", lang: "en", intent: "investor" },
      { keyword: "casas en kissimmee florida", match_type: "PHRASE", lang: "es", intent: "buyer" },
      { keyword: "short term rental kissimmee", match_type: "EXACT", lang: "en", intent: "investor" },
    ],
    champions_gate: [
      { keyword: "champions gate homes for sale", match_type: "PHRASE", lang: "en", intent: "buyer" },
      { keyword: "champions gate vacation rental", match_type: "PHRASE", lang: "en", intent: "investor" },
      { keyword: "champions gate resort community", match_type: "BROAD", lang: "en", intent: "investor" },
      { keyword: "casas champions gate orlando", match_type: "PHRASE", lang: "es", intent: "buyer" },
    ],
    lake_nona: [
      { keyword: "lake nona homes for sale", match_type: "PHRASE", lang: "en", intent: "buyer" },
      { keyword: "lake nona real estate", match_type: "BROAD", lang: "en", intent: "buyer" },
      { keyword: "lake nona new construction", match_type: "PHRASE", lang: "en", intent: "buyer" },
      { keyword: "casas lake nona orlando", match_type: "PHRASE", lang: "es", intent: "buyer" },
    ],
    dr_phillips: [
      { keyword: "dr phillips orlando homes", match_type: "PHRASE", lang: "en", intent: "buyer" },
      { keyword: "dr phillips luxury real estate", match_type: "PHRASE", lang: "en", intent: "buyer" },
      { keyword: "casas dr phillips orlando", match_type: "PHRASE", lang: "es", intent: "buyer" },
    ],
    celebration: [
      { keyword: "celebration florida homes for sale", match_type: "PHRASE", lang: "en", intent: "buyer" },
      { keyword: "celebration fl real estate", match_type: "BROAD", lang: "en", intent: "buyer" },
      { keyword: "casas celebration florida", match_type: "PHRASE", lang: "es", intent: "buyer" },
    ],
    windermere: [
      { keyword: "windermere fl homes for sale", match_type: "PHRASE", lang: "en", intent: "buyer" },
      { keyword: "windermere luxury homes orlando", match_type: "PHRASE", lang: "en", intent: "buyer" },
    ],
    downtown: [
      { keyword: "downtown orlando condos for sale", match_type: "PHRASE", lang: "en", intent: "buyer" },
      { keyword: "orlando downtown apartments for sale", match_type: "PHRASE", lang: "en", intent: "buyer" },
      { keyword: "condos downtown orlando", match_type: "BROAD", lang: "en", intent: "buyer" },
    ],
    clermont: [
      { keyword: "clermont fl homes for sale", match_type: "PHRASE", lang: "en", intent: "buyer" },
      { keyword: "clermont florida real estate", match_type: "BROAD", lang: "en", intent: "buyer" },
      { keyword: "casas en clermont florida", match_type: "PHRASE", lang: "es", intent: "buyer" },
    ],
  };

  if (zone !== "all" && zoneKeywords[zone]) {
    const zoneKws = zoneKeywords[zone].filter(
      (k) => lang === "both" || k.lang === lang,
    );
    addKws(zoneKws);
  } else if (zone === "all") {
    for (const zoneKwList of Object.values(zoneKeywords)) {
      addKws(zoneKwList.filter((k) => lang === "both" || k.lang === lang));
    }
  }

  // --- Property type specific ---
  const typeKeywords: Record<string, KwEntry[]> = {
    vacation_rental: [
      { keyword: "vacation home for sale near disney", match_type: "PHRASE", lang: "en", intent: "investor" },
      { keyword: "disney area vacation rental investment", match_type: "PHRASE", lang: "en", intent: "investor" },
      { keyword: "vrbo property for sale florida", match_type: "PHRASE", lang: "en", intent: "investor" },
      { keyword: "propiedad renta vacacional cerca disney", match_type: "PHRASE", lang: "es", intent: "investor" },
      { keyword: "casa vacacional kissimmee venta", match_type: "PHRASE", lang: "es", intent: "investor" },
    ],
    investment: [
      { keyword: "orlando investment property cash flow", match_type: "PHRASE", lang: "en", intent: "investor" },
      { keyword: "florida rental property for sale", match_type: "PHRASE", lang: "en", intent: "investor" },
      { keyword: "orlando real estate investment opportunities", match_type: "BROAD", lang: "en", intent: "investor" },
      { keyword: "invertir en bienes raices florida", match_type: "PHRASE", lang: "es", intent: "investor" },
      { keyword: "propiedades de inversión orlando", match_type: "PHRASE", lang: "es", intent: "investor" },
    ],
    single_family: [
      { keyword: "single family homes orlando florida", match_type: "PHRASE", lang: "en", intent: "buyer" },
      { keyword: "family homes for sale orlando", match_type: "BROAD", lang: "en", intent: "buyer" },
      { keyword: "casas unifamiliares orlando", match_type: "PHRASE", lang: "es", intent: "buyer" },
    ],
    condo: [
      { keyword: "condos for sale orlando fl", match_type: "PHRASE", lang: "en", intent: "buyer" },
      { keyword: "orlando condo for sale", match_type: "EXACT", lang: "en", intent: "buyer" },
      { keyword: "condominios orlando florida venta", match_type: "PHRASE", lang: "es", intent: "buyer" },
    ],
    townhouse: [
      { keyword: "townhomes for sale orlando florida", match_type: "PHRASE", lang: "en", intent: "buyer" },
      { keyword: "orlando townhouse for sale", match_type: "EXACT", lang: "en", intent: "buyer" },
      { keyword: "townhouses orlando florida", match_type: "BROAD", lang: "es", intent: "buyer" },
    ],
  };

  if (propType !== "all" && typeKeywords[propType]) {
    addKws(typeKeywords[propType].filter((k) => lang === "both" || k.lang === lang));
  } else if (propType === "all") {
    for (const typeKwList of Object.values(typeKeywords)) {
      addKws(typeKwList.filter((k) => lang === "both" || k.lang === lang));
    }
  }

  // Deduplicate
  const seen = new Set<string>();
  const unique = keywords.filter((k) => {
    if (seen.has(k.keyword)) return false;
    seen.add(k.keyword);
    return true;
  });

  const byIntent = {
    buyer: unique.filter((k) => k.intent === "buyer"),
    investor: unique.filter((k) => k.intent === "investor"),
  };

  return JSON.stringify({
    total: unique.length,
    filters: { zone, property_type: propType, language: lang },
    by_intent: byIntent,
    all_keywords: unique,
    usage_tip:
      "Usa EXACT para keywords de alta intención (listos para comprar), PHRASE para consideración, BROAD para descubrimiento. Agrega negative keywords: 'rent', 'rental', 'free', 'cheap' para excluir tráfico no calificado.",
  });
}
