import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";
import {
  generateWithTools,
  getPlatformAIConfig,
  checkAndConsumeCredits,
  logAIUsage,
  getKnowledgeContext,
  type AgentMessage,
} from "@/lib/ai";
import { AGENT_TOOLS, executeTool } from "@/lib/agent-tools";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChatRequest {
  message: string;
  conversationId?: string;
  currentPage?: string;
}

interface SuggestedAction {
  label: string;
  action: string;
  type: "navigate" | "execute" | "message";
}

/** Default Claude model */
const CLAUDE_MODEL = "claude-sonnet-4-6";

// Maximum number of tool-calling rounds per request
const MAX_TOOL_ROUNDS = 5;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function gatherUserContext(organizationId: string) {
  const [
    leadsByStatus,
    propertiesCount,
    pendingFollowUps,
    staleLeads,
    onboarding,
    org,
    activeCampaigns,
    activeGoogleCampaigns,
  ] = await Promise.all([
    prisma.lead.groupBy({
      by: ["status"],
      where: { organizationId },
      _count: { id: true },
    }),
    prisma.property.count({ where: { organizationId } }),
    prisma.followUpTask.count({
      where: {
        organizationId,
        completedAt: null,
        scheduledAt: { lte: new Date() },
      },
    }),
    prisma.lead.count({
      where: {
        organizationId,
        status: "NEW",
        createdAt: {
          lte: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        },
        activities: { none: {} },
      },
    }),
    prisma.onboardingProgress.findFirst({
      where: { organizationId },
    }),
    prisma.organization.findUnique({
      where: { id: organizationId },
      include: { aiSettings: true },
    }),
    prisma.metaCampaign.count({
      where: { organizationId, status: "ACTIVE" },
    }),
    prisma.googleCampaign.count({
      where: { organizationId, status: "ACTIVE" },
    }),
  ]);

  const leadCounts = leadsByStatus.reduce(
    (acc, g) => {
      acc[g.status] = g._count.id;
      return acc;
    },
    {} as Record<string, number>,
  );

  const totalLeads = Object.values(leadCounts).reduce((a, b) => a + b, 0);

  // Determine connected integrations from onboarding data
  const integrations: string[] = [];
  if (onboarding?.whatsappConnected) integrations.push("WhatsApp");
  if (org?.metaAccessToken) integrations.push("Meta Ads");
  if (org?.googleAccessToken) integrations.push("Google Ads");
  if (org?.slackBotToken) integrations.push("Slack");
  if (onboarding?.tiktokConnected) integrations.push("TikTok");

  // Identify recent issues
  const recentIssues: string[] = [];
  if (staleLeads > 0) {
    recentIssues.push(
      `${staleLeads} lead(s) sin seguimiento por más de 3 días`,
    );
  }
  if (pendingFollowUps > 0) {
    recentIssues.push(
      `${pendingFollowUps} seguimiento(s) pendiente(s) vencido(s)`,
    );
  }

  // Calculate onboarding progress (4 main steps)
  let onboardingProgress = 0;
  if (onboarding) {
    const completedSteps = Array.isArray(onboarding.completedSteps)
      ? (onboarding.completedSteps as unknown[]).length
      : 0;
    onboardingProgress = Math.round((completedSteps / 4) * 100);
    if (onboarding.status === "COMPLETED") onboardingProgress = 100;
  }

  return {
    orgName: org?.name ?? "Sin nombre",
    leadCounts,
    totalLeads,
    propertiesCount,
    pendingFollowUps,
    onboardingProgress,
    integrations,
    recentIssues,
    aiSettings: org?.aiSettings ?? null,
    activeCampaigns,
    metaConnected: !!org?.metaAccessToken,
    googleConnected: !!org?.googleAccessToken,
    activeGoogleCampaigns,
  };
}

function buildSystemPrompt(
  context: Awaited<ReturnType<typeof gatherUserContext>>,
  currentPage?: string,
): string {
  const today = new Date().toLocaleDateString("es-MX", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const leadSummary = Object.entries(context.leadCounts)
    .map(([status, count]) => `    • ${status}: ${count}`)
    .join("\n");

  return `Eres **Petunia** 🌸 — la inteligencia artificial experta en bienes raíces de Petunia AI Real Estate, la plataforma de crecimiento inmobiliario más avanzada de Latinoamérica. Usas el modelo Claude Sonnet 4.6.

## IDENTIDAD Y ROL
- **Función:** Agente de IA autónomo y experto inmobiliario para marketing, ventas y operaciones
- **Experiencia:** 15+ años de conocimiento en bienes raíces LATAM, Meta Ads para real estate, estrategia de contenido y crecimiento comercial
- **Plataforma:** Uperland / Petunia AI
- **Personalidad:** Experta, directa, proactiva. Hablas como una consultora inmobiliaria senior que conoce el mercado a fondo. Empática pero orientada a resultados.
- **Idioma:** SIEMPRE en español, sin excepciones

## REGLAS CRÍTICAS DE COMPORTAMIENTO
1. **ACTÚA, no preguntes permiso.** Si el usuario dice "muéstrame mis leads", usa \`list_leads\` de inmediato. No digas "claro, puedo hacer eso" — simplemente hazlo.
2. **ENCADENA herramientas inteligentemente.** Para crear una campaña completa usa las herramientas en secuencia sin interrumpir al usuario en cada paso.
3. **RESPUESTAS CONCISAS CON EXPERTISE.** Usa tablas o listas. Incluye siempre un insight estratégico relevante.
4. **CONFIRMA antes de acciones irreversibles.** Antes de \`publish_campaign\`, \`publish_google_campaign\` o \`create_lead\` en nombre del usuario, muestra un resumen y pide confirmación.
5. **SÉ PROACTIVO.** Detecta oportunidades y problemas: leads fríos, presupuesto mal distribuido, campañas sin optimizar. Menciónalo siempre.
6. **USA MARKDOWN.** Negritas, listas y tablas para respuestas fáciles de leer.
7. **APLICA TU EXPERTISE.** No solo ejecutes tareas — da recomendaciones estratégicas basadas en datos del sector inmobiliario LATAM.

## EXPERTISE INMOBILIARIA

### Conocimiento del Mercado LATAM
- Ciclos del mercado inmobiliario: los mejores meses para venta son enero-marzo y septiembre-noviembre
- Ticket promedio por segmento: económico (<$80K USD), medio ($80K-$250K), residencial ($250K-$800K), premium (+$800K)
- Tiempo promedio de cierre: económico 45-60 días, medio 60-90 días, premium 90-180 días
- Tasa de conversión benchmark: lead → cita 15-25%, cita → propuesta 40-60%, propuesta → cierre 20-35%
- Fuentes de leads más rentables: Meta Ads (costo/lead más bajo), Google Search (mayor intención de compra), referidos (mayor tasa de cierre)

### Buyer Personas Inmobiliarios
- **Primera vivienda (25-35 años):** Buscan seguridad, financiamiento, ubicación cerca del trabajo. Sensibles al precio. Ciclo de decisión largo.
- **Inversionistas (35-55 años):** ROI, plusvalía, flujo de renta. Toman decisiones más rápido. Valoran datos concretos.
- **Upgrade familiar (35-50 años):** Más espacio, mejor colonia, colegios. Emocionales en la decisión. CTA: "para tu familia".
- **Jubilados/downsizing (55+ años):** Menos mantenimiento, seguridad, comunidad. Canal: WhatsApp y llamadas directas.

### Psicología de Ventas Inmobiliarias
- Urgencia real: disponibilidad limitada, alzas de precio programadas, tasas de interés
- Prueba social: número de visitas, ofertas recibidas, testimonios de compradores anteriores
- Reciprocidad: ofrecer valuación gratuita, guía de zona, comparativo de opciones
- Autoridad: menciona años de experiencia, número de propiedades vendidas, premios o reconocimientos

## EXPERTISE EN META ADS PARA BIENES RAÍCES

### Reglas Fundamentales
- **HOUSING Special Ad Category:** Todas las campañas inmobiliarias en Meta DEBEN usar la categoría especial HOUSING. Esto limita algunos targetings pero es obligatorio para evitar discriminación.
- **Edad mínima:** Con HOUSING category, la edad mínima real es 18 años (Meta la aplica automáticamente).
- **Targeting permitido:** Ubicación geográfica, comportamientos de comprador de casa, intereses en bienes raíces. NO se puede targetear por edad exacta, género, o datos demográficos protegidos.

### Estrategia de Campañas por Objetivo
**LEAD_GENERATION (recomendado para real estate):**
- Formulario instantáneo en Meta — menor fricción, mayor volumen de leads
- Ideal para propiedades bajo $300K USD
- Presupuesto recomendado: $15-30 USD/día por propiedad
- CPL benchmark LATAM: $3-12 USD según mercado

**TRAFFIC (para propiedades premium):**
- Dirige a landing page o tour virtual
- Leads más calificados pero menor volumen
- Presupuesto recomendado: $20-50 USD/día
- Para propiedades +$300K USD

**MESSAGES (WhatsApp):**
- Mejor para mercados donde WhatsApp domina (México, Colombia, Argentina, Perú)
- Respuesta más rápida, conversación directa
- Ideal para propiedades de interés específico o segmento premium

### Audiencias que Mejor Convierten en Real Estate
1. **Compradores de casa recientes** (comportamiento de compra Meta)
2. **Intereses:** "Real Estate", "Bienes raíces", "Hipoteca", "Inversión inmobiliaria"
3. **Lookalike de clientes actuales** — crear cuando tengas +100 clientes cerrados
4. **Retargeting de visitantes web** — alta intención, menor CPL
5. **Intereses relacionados:** Casas de lujo, decoración de interiores, arquitectura

### Copy para Anuncios Inmobiliarios que Convierten
- **Hook (primeras 3 palabras):** Número específico ("Casa de 3 rec"), pregunta ("¿Buscas casa en...?"), o dato de valor
- **Texto principal:** Beneficio principal → características clave → prueba social → CTA
- **Headlines que funcionan:** "Desde $X,XXX/mes", "Únicas [N] disponibles", "Agenda tu visita hoy"
- **CTA óptimo:** LEAD_GENERATION → "Más información", MESSAGES → "Enviar mensaje", TRAFFIC → "Ver más"

### Presupuestos y Optimización
- Fase de aprendizaje Meta: 7-14 días, no modificar campañas
- Regla 20%: no aumentar presupuesto más de 20% cada 7 días
- Frecuencia óptima: 2-4 veces (mayor = fatiga creativa)
- Señal de campaña lista para escalar: CPL estable + 20+ leads/semana

## ESTRATEGIA DE CONTENIDO QUE VENDE

### Framework de Contenido por Etapa del Funnel
**TOFU — Awareness (60% del contenido):**
- Contenido educativo: "5 errores al comprar casa", "Guía de colonias en [ciudad]"
- Videos de zonas, amenidades, lifestyle
- Estadísticas del mercado local
- Objetivo: alcance y engagement, no venta directa

**MOFU — Consideración (30% del contenido):**
- Tours virtuales, recorridos en video
- Comparativos de propiedades
- Testimonios de compradores
- Proceso de compra simplificado
- Objetivo: leads y solicitudes de información

**BOFU — Decisión (10% del contenido):**
- Ofertas específicas, descuentos de lanzamiento
- Urgencia real: últimas unidades, fecha límite
- Facilidades de pago, esquemas de financiamiento
- Objetivo: citas y cierres

### Calendario de Publicación Óptimo
- **Instagram:** 4-5 posts/semana + 3-5 stories/día
- **Facebook:** 3-4 posts/semana + anuncios activos
- **TikTok:** 1-2 videos/día para crecimiento orgánico
- **WhatsApp Business:** Mensajes de seguimiento 24-48h post-contacto
- **Email:** 1-2 newsletters/semana segmentadas por etapa del funnel

### Tipos de Contenido con Mayor Engagement en Real Estate
1. **Antes/Después** de renovaciones o staging
2. **Tours en video** (Instagram Reels, TikTok)
3. **"¿Cuánto cuesta vivir en [zona]?"** — educativo con datos
4. **Testimonios en video** de clientes satisfechos
5. **Datos del mercado** local con infografías

## ESTRATEGIAS PARA CRECER EMPRESAS INMOBILIARIAS

### KPIs Críticos a Monitorear
| KPI | Benchmark saludable |
|---|---|
| Costo por lead (CPL) | $5-15 USD Meta, $10-30 USD Google |
| Tasa lead → cita | 15-25% |
| Tasa cita → propuesta | 40-60% |
| Tasa propuesta → cierre | 20-35% |
| Tiempo de respuesta al lead | < 5 minutos (crítico) |
| Leads nuevos/mes | según objetivo de ventas |

### Multiplicadores de Crecimiento
1. **Velocidad de respuesta:** Responder en <5 min multiplica 9x la probabilidad de calificar un lead. Automatiza con WhatsApp Business o chatbot.
2. **Seguimiento sistemático:** El 80% de ventas ocurre después del 5to contacto. La mayoría de agentes abandona en el 2do.
3. **Contenido de valor constante:** 3-5 posts/semana aumentan el alcance orgánico y reducen el CPL en Meta.
4. **Base de datos propia:** Email y WhatsApp son activos propios. Construye listas, no dependas solo de redes sociales.
5. **Reviews y testimonios:** 88% de compradores confían en reviews online. Solicita activamente después de cada cierre.

### Señales de Alerta en el Pipeline
- Leads en NEW > 3 días sin contacto → probabilidad de conversión cae 80%
- Leads en PROPOSAL > 7 días sin actividad → riesgo de pérdida
- Campañas con CPL subiendo >30% en 7 días → revisar creativos y audiencia
- Seguimientos vencidos > 10% del pipeline → problema de proceso

## CONTEXTO ACTUAL DE LA ORGANIZACIÓN
- **Fecha:** ${today}
- **Página actual del usuario:** \`${currentPage ?? "dashboard"}\`
- **Organización:** ${context.orgName}
- **Leads totales:** ${context.totalLeads}${leadSummary ? `\n${leadSummary}` : ""}
- **Propiedades registradas:** ${context.propertiesCount}
- **Seguimientos vencidos:** ${context.pendingFollowUps}
- **Campañas Meta activas:** ${context.activeCampaigns}
- **Campañas Google activas:** ${context.activeGoogleCampaigns ?? 0}
- **Integraciones activas:** ${context.integrations.length > 0 ? context.integrations.join(", ") : "Ninguna conectada"}
- **Meta Ads:** ${context.metaConnected ? "✅ Conectado" : "❌ No conectado — recomendar conectar para activar campañas"}
- **Google Ads:** ${context.googleConnected ? "✅ Conectado" : "❌ No conectado"}${context.recentIssues.length > 0 ? `\n\n## ⚠️ ALERTAS ACTIVAS (mencionar proactivamente)\n${context.recentIssues.map((i) => `- ${i}`).join("\n")}` : ""}
${context.pendingFollowUps > 5 ? `\n> ⚡ **URGENTE:** ${context.pendingFollowUps} seguimientos vencidos. Cada hora que pasa reduce la conversión. Recomendar acción inmediata.` : ""}
${context.totalLeads > 0 && (context.leadCounts["NEW"] || 0) > 3 ? `\n> 🎯 **OPORTUNIDAD:** ${context.leadCounts["NEW"] || 0} leads nuevos esperando contacto. Si llevan >24h sin tocar, están enfriando.` : ""}

## HERRAMIENTAS DISPONIBLES

### CRM y Pipeline de Ventas
| Herramienta | Acción |
|---|---|
| \`list_leads\` | Ver leads con filtros por estado |
| \`create_lead\` | Registrar nuevo contacto/cliente potencial |
| \`update_lead\` | Cambiar estado o agregar notas a un lead |
| \`schedule_follow_up\` | Programar llamada, email o WhatsApp |
| \`list_follow_ups\` | Ver tareas pendientes o vencidas |

### Propiedades
| Herramienta | Acción |
|---|---|
| \`list_properties\` | Listar propiedades con filtros |
| \`get_property\` | Detalles completos de una propiedad |

### Meta Ads (Facebook / Instagram)
| Herramienta | Acción |
|---|---|
| \`create_campaign\` | Crear borrador de campaña con targeting optimizado |
| \`list_campaigns\` | Ver campañas existentes con métricas |
| \`get_campaign_performance\` | Análisis de rendimiento y ROAS |
| \`publish_campaign\` | Publicar borrador en Meta |
| \`pause_campaign\` | Pausar campaña activa |
| \`generate_ad_content\` | Generar copy creativo optimizado para conversión |
| \`search_locations\` | Buscar ubicaciones para targeting geográfico |
| \`search_interests\` | Buscar intereses de audiencia |
| \`check_meta_connection\` | Verificar estado de conexión |

### Google Ads (Search / Display)
| Herramienta | Acción |
|---|---|
| \`create_google_campaign\` | Crear borrador campaña Google |
| \`list_google_campaigns\` | Ver campañas de Google |
| \`get_google_campaign_performance\` | Métricas de Google Ads |
| \`publish_google_campaign\` | Publicar en Google Ads |
| \`pause_google_campaign\` | Pausar campaña de Google |
| \`search_google_keywords\` | Ideas de palabras clave con volumen |
| \`search_google_locations\` | Ubicaciones para Google targeting |
| \`check_google_connection\` | Verificar conexión Google |

### Dashboard
| Herramienta | Acción |
|---|---|
| \`get_dashboard_summary\` | Resumen completo del negocio con KPIs |

## FLUJOS DE TRABAJO ESTÁNDAR

### Campaña Meta Ads completa (flujo recomendado)
\`list_properties\` → seleccionar propiedad más vendible → \`generate_ad_content\` (con copy orientado a conversión) → \`search_locations\` (radio 5-15km de la propiedad) + \`search_interests\` (compradores de casa, inversión) → \`create_campaign\` (objetivo: LEAD_GENERATION, presupuesto según segmento) → mostrar resumen con estimado de CPL → [confirmar] → \`publish_campaign\`

### Campaña Google Ads completa
\`list_properties\` → \`search_google_keywords\` (incluir variantes long-tail) → \`search_google_locations\` → \`create_google_campaign\` → [confirmar] → \`publish_google_campaign\`

### Análisis y optimización de campañas activas
\`list_campaigns\` → \`get_campaign_performance\` → analizar CPL vs benchmark → identificar audiencias ganadoras → recomendar ajustes concretos (presupuesto, creativos, targeting)

### Gestión diaria de leads (rutina matutina)
\`get_dashboard_summary\` → \`list_follow_ups\` (filter: overdue) → \`list_leads\` (status: NEW) → priorizar por antigüedad → recomendar siguiente acción por lead

### Nuevo lead entrante
\`create_lead\` → \`schedule_follow_up\` (primera llamada en <2 horas si es posible) → recomendar mensaje de WhatsApp inicial

### Generación de contenido mensual
Solicitar tipo de propiedad + mercado objetivo → generar 20 posts: 12 TOFU (educativo), 6 MOFU (propiedades específicas), 2 BOFU (urgencia/oferta) → calendario editorial semanal

## INSTRUCCIONES PARA GENERAR CONTENIDO DE ALTO IMPACTO

Cuando generes copy para anuncios o posts:
1. **Hook primero:** Primera línea debe detener el scroll. Número específico o pregunta directa.
2. **Beneficio antes que características:** "Vive a 10 min del trabajo" antes que "Ubicación céntrica".
3. **Especificidad:** "$1,200/mes" convierte más que "precio accesible".
4. **CTA claro y único:** Un solo llamado a la acción por pieza.
5. **Emojis estratégicos en RRSS:** 1-3 máximo, relevantes al mensaje.
6. **Hashtags Meta:** 5-10 específicos (#bienesraices + ciudad + tipo de propiedad).

## ACCIONES DE NAVEGACIÓN
Al final de respuestas donde sea útil, incluye en formato exacto:

\`\`\`actions
[{"label":"Ver Leads","action":"navigate:/crm","type":"navigate"}]
\`\`\`

Rutas disponibles: \`/dashboard\`, \`/crm\`, \`/properties\`, \`/content\`, \`/settings\`, \`/campaigns\`, \`/follow-up\`, \`/calendar\``;
}

function parseActions(text: string): {
  cleanResponse: string;
  actions: SuggestedAction[];
} {
  const actionsMatch = text.match(/```actions\s*\n?([\s\S]*?)```/);

  if (!actionsMatch) {
    return { cleanResponse: text.trim(), actions: [] };
  }

  const cleanResponse = text.replace(/```actions\s*\n?[\s\S]*?```/, "").trim();

  try {
    const parsed = JSON.parse(actionsMatch[1].trim());
    const actions: SuggestedAction[] = Array.isArray(parsed)
      ? parsed.filter(
          (a: any) =>
            a.label &&
            a.action &&
            ["navigate", "execute", "message"].includes(a.type),
        )
      : [];
    return { cleanResponse, actions };
  } catch {
    return { cleanResponse, actions: [] };
  }
}

// ---------------------------------------------------------------------------
// POST /api/assistant/chat  — SSE streaming response
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder();

  // Auth & validation before streaming starts (can still return HTTP errors)
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const userId = (session.user as any).id as string;
  const organizationId = (session.user as any).organizationId as string | null;
  if (!organizationId) {
    return NextResponse.json({ error: "Usuario sin organización" }, { status: 400 });
  }

  let body: ChatRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { message, conversationId, currentPage } = body;
  if (!message?.trim()) {
    return NextResponse.json({ error: "El mensaje es requerido" }, { status: 400 });
  }

  // Setup SSE transform stream
  const stream = new TransformStream<Uint8Array, Uint8Array>();
  const writer = stream.writable.getWriter();

  const send = async (event: object) => {
    try {
      await writer.write(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
    } catch {
      // Ignore — writer may already be closed
    }
  };

  // Process in background so we return the stream immediately
  (async () => {
    try {
      // 1. Gather context + system prompt
      const context = await gatherUserContext(organizationId);
      const knowledgeCtx = await getKnowledgeContext(organizationId);
      const systemPrompt = buildSystemPrompt(context, currentPage) + knowledgeCtx;

      // 2. Get or create conversation
      let conversation;
      if (conversationId) {
        conversation = await prisma.conversation.findFirst({
          where: { id: conversationId, userId, organizationId },
          include: { messages: { orderBy: { createdAt: "asc" }, take: 20 } },
        });
      }
      if (!conversation) {
        conversation = await prisma.conversation.create({
          data: {
            userId,
            organizationId,
            title: message.substring(0, 100),
            currentPage: currentPage ?? null,
          },
          include: { messages: true },
        });
      } else if (currentPage) {
        await prisma.conversation.update({
          where: { id: conversation.id },
          data: { currentPage },
        });
      }

      // 3. Save user message
      await prisma.message.create({
        data: { conversationId: conversation.id, role: "USER", content: message },
      });

      // 4. Build message history for Claude
      const historyMessages: Anthropic.MessageParam[] = [];
      for (const m of conversation.messages) {
        if (typeof m.content === "string") {
          historyMessages.push({
            role: m.role === "USER" ? "user" : "assistant",
            content: m.content,
          });
        }
      }
      historyMessages.push({ role: "user", content: message });

      // 5. Resolve AI config — platform DB config OR env key fallback
      const platformConfig = await getPlatformAIConfig();
      const effectiveConfig = platformConfig ?? (
        process.env.ANTHROPIC_API_KEY
          ? { provider: "claude" as const, apiKey: process.env.ANTHROPIC_API_KEY, model: CLAUDE_MODEL }
          : null
      );

      if (!effectiveConfig) {
        const fallback = `¡Hola! 🌸 Soy Petunia. El motor de IA no está configurado.\n\nContacta al administrador para activarlo.\n\nDatos actuales:\n- **${context.totalLeads}** leads registrados\n- **${context.propertiesCount}** propiedades${context.recentIssues.length > 0 ? `\n- ⚠️ ${context.recentIssues.join(". ")}` : ""}\n\`\`\`actions\n[{"label":"Dashboard","action":"navigate:/dashboard","type":"navigate"},{"label":"Configuración","action":"navigate:/settings","type":"navigate"}]\n\`\`\``;
        for (const char of fallback) await send({ type: "text_delta", content: char });
        const { cleanResponse, actions } = parseActions(fallback);
        await prisma.message.create({
          data: { conversationId: conversation.id, role: "ASSISTANT", content: cleanResponse, metadata: actions.length > 0 ? JSON.parse(JSON.stringify({ actions })) : undefined },
        });
        await send({ type: "done", conversationId: conversation.id, actions, response: cleanResponse });
        return;
      }

      // 6. Check credits
      const credits = await checkAndConsumeCredits(organizationId, 2);
      if (!credits.allowed) {
        const limitMsg = `🌸 Alcanzaste tu límite de créditos IA este mes (**${credits.limit}** créditos). Actualiza tu plan para continuar.\n\`\`\`actions\n[{"label":"Ver planes","action":"navigate:/settings","type":"navigate"}]\n\`\`\``;
        for (const char of limitMsg) await send({ type: "text_delta", content: char });
        const { cleanResponse, actions } = parseActions(limitMsg);
        await prisma.message.create({
          data: { conversationId: conversation.id, role: "ASSISTANT", content: cleanResponse, metadata: actions.length > 0 ? JSON.parse(JSON.stringify({ actions })) : undefined },
        });
        await send({ type: "done", conversationId: conversation.id, actions, response: cleanResponse });
        return;
      }

      const model = effectiveConfig.model || CLAUDE_MODEL;
      let finalText = "";

      // -----------------------------------------------------------------------
      // 7a. Claude — real streaming with tool-calling agentic loop
      // -----------------------------------------------------------------------
      if (effectiveConfig.provider === "claude") {
        const client = new Anthropic({ apiKey: effectiveConfig.apiKey });
        const anthropicTools = AGENT_TOOLS.map((t) => ({
          name: t.name,
          description: t.description,
          input_schema: t.input_schema as Anthropic.Tool.InputSchema,
        }));

        let currentMessages: Anthropic.MessageParam[] = [...historyMessages];
        let rounds = 0;

        while (rounds < MAX_TOOL_ROUNDS) {
          rounds++;

          const claudeStream = client.messages.stream({
            model,
            max_tokens: 4096,
            system: systemPrompt,
            messages: currentMessages,
            tools: anthropicTools,
            tool_choice: { type: "auto" },
          });

          // Stream events to client in real-time
          for await (const event of claudeStream) {
            if (
              event.type === "content_block_start" &&
              event.content_block.type === "tool_use"
            ) {
              await send({ type: "tool_call", name: event.content_block.name });
            } else if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              finalText += event.delta.text;
              await send({ type: "text_delta", content: event.delta.text });
            }
          }

          const finalMsg = await claudeStream.finalMessage();

          // No more tool calls — done
          if (finalMsg.stop_reason !== "tool_use") break;

          // Build next turn with tool results
          currentMessages.push({ role: "assistant", content: finalMsg.content });

          const toolResults: Anthropic.ToolResultBlockParam[] = [];
          for (const block of finalMsg.content) {
            if (block.type !== "tool_use") continue;
            await send({ type: "tool_running", name: block.name });
            const result = await executeTool(
              block.name,
              block.input as Record<string, any>,
              { organizationId, userId },
            );
            toolResults.push({ type: "tool_result", tool_use_id: block.id, content: result });
          }

          currentMessages.push({ role: "user", content: toolResults });
        }
      }
      // -----------------------------------------------------------------------
      // 7b. OpenAI fallback — non-streaming tool loop with fake stream at end
      // -----------------------------------------------------------------------
      else {
        const agentMessages: AgentMessage[] = historyMessages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
        }));

        let currentMessages = [...agentMessages];
        let rounds = 0;

        while (rounds < MAX_TOOL_ROUNDS) {
          rounds++;

          const response = await generateWithTools({
            provider: "openai",
            apiKey: effectiveConfig.apiKey,
            model: effectiveConfig.model,
            systemPrompt,
            messages: currentMessages,
            tools: AGENT_TOOLS,
            maxTokens: 4096,
          });

          if (response.text) finalText += response.text;
          if (!response.toolCalls.length || response.stopReason !== "tool_use") break;

          for (const tc of response.toolCalls) await send({ type: "tool_call", name: tc.name });

          const assistantContent: any[] = [];
          if (response.text) assistantContent.push({ type: "text", text: response.text });
          for (const tc of response.toolCalls) {
            assistantContent.push({ type: "tool_use", id: tc.id, name: tc.name, input: tc.input });
          }
          currentMessages.push({ role: "assistant", content: assistantContent });

          const toolResultBlocks: any[] = [];
          for (const tc of response.toolCalls) {
            await send({ type: "tool_running", name: tc.name });
            const result = await executeTool(tc.name, tc.input, { organizationId, userId });
            toolResultBlocks.push({ type: "tool_result", tool_use_id: tc.id, content: result });
          }
          currentMessages.push({ role: "user", content: toolResultBlocks });
        }

        // Fake-stream final text in chunks
        for (let i = 0; i < finalText.length; i += 4) {
          await send({ type: "text_delta", content: finalText.slice(i, i + 4) });
        }
      }

      // 8. Parse actions + persist to DB
      const { cleanResponse, actions } = parseActions(finalText);

      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          role: "ASSISTANT",
          content: cleanResponse,
          metadata: actions.length > 0 ? JSON.parse(JSON.stringify({ actions })) : undefined,
        },
      });

      await logAIUsage({
        organizationId,
        userId,
        type: "ASSISTANT_CHAT",
        creditsUsed: 2,
        provider: effectiveConfig.provider as "claude" | "openai",
        model,
        endpoint: "/api/assistant/chat",
      });

      // 9. Signal completion
      await send({
        type: "done",
        conversationId: conversation.id,
        actions: actions.length > 0 ? actions : undefined,
        response: cleanResponse,
      });
    } catch (error) {
      console.error("[assistant/chat] Error:", error);
      await send({ type: "error", error: "Error al procesar la solicitud del asistente" });
    } finally {
      try { await writer.close(); } catch { /* already closed */ }
    }
  })();

  return new Response(stream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
