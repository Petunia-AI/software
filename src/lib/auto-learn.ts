/**
 * Auto-learning engine for Petunia AI
 *
 * After every N assistant messages, this module reads the recent conversation,
 * asks Claude to extract structured business facts, and persists them as
 * KnowledgeEntry records (source="auto") so future sessions benefit from them.
 */

import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";

const CLAUDE_MODEL = "claude-haiku-4-5-20251001"; // Fast + cheap for extraction

// Minimum assistant messages in the conversation before we try to learn
const LEARN_THRESHOLD = 5;

interface ExtractedFact {
  category: "mercado" | "propiedad" | "contenido" | "campana" | "general";
  title: string;
  content: string;
}

const EXTRACT_SYSTEM_PROMPT = `Eres un extractor de conocimiento para una plataforma inmobiliaria.
Analiza la conversación y extrae hechos de negocio concretos y útiles que no sean obvios.

Categorías:
- "mercado": datos del mercado local, precios por zona, demanda, competencia
- "propiedad": características o aprendizajes específicos de propiedades del negocio
- "contenido": qué tipo de contenido funciona mejor para este negocio/mercado
- "campana": aprendizajes de campañas: qué funcionó, CPL real, audiencias
- "general": preferencias del cliente, proceso de venta, información del equipo

REGLAS:
1. Solo extrae hechos específicos y accionables, NO conocimiento genérico.
2. Máximo 5 hechos por conversación.
3. Si no hay hechos nuevos concretos, devuelve un array vacío.
4. El título debe ser corto (< 60 caracteres).
5. El content debe ser 1-3 oraciones concretas.

Responde SOLO con JSON válido, sin markdown, con este formato exacto:
[{"category":"general","title":"...","content":"..."}]`;

/**
 * Trigger auto-learning for a conversation.
 * Should be called fire-and-forget — never awaited in the hot path.
 *
 * @param conversationId  - DB conversation ID
 * @param organizationId  - Org to save facts under
 * @param userId          - User ID to credit as creator
 */
export async function triggerAutoLearn(
  conversationId: string,
  organizationId: string,
  userId: string,
): Promise<void> {
  try {
    const apiKey =
      process.env.ANTHROPIC_API_KEY ?? process.env.CLAUDE_API_KEY ?? "";
    if (!apiKey) return;

    // Count existing assistant messages in this conversation
    const assistantCount = await prisma.message.count({
      where: { conversationId, role: "ASSISTANT" },
    });

    // Only run every LEARN_THRESHOLD messages to avoid excessive calls
    if (assistantCount === 0 || assistantCount % LEARN_THRESHOLD !== 0) return;

    // Fetch last 30 messages for analysis
    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
      take: 30,
      select: { role: true, content: true },
    });

    if (messages.length < LEARN_THRESHOLD) return;

    const conversationText = messages
      .map((m) => `${m.role === "USER" ? "Usuario" : "Petunia"}: ${m.content}`)
      .join("\n\n");

    const client = new Anthropic({ apiKey });

    const response = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 1024,
      system: EXTRACT_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Extrae hechos de negocio concretos de esta conversación:\n\n${conversationText}`,
        },
      ],
    });

    const rawText =
      response.content[0]?.type === "text" ? response.content[0].text.trim() : "[]";

    let facts: ExtractedFact[] = [];
    try {
      const parsed = JSON.parse(rawText);
      if (Array.isArray(parsed)) {
        facts = parsed.filter(
          (f: any) =>
            f.category &&
            f.title &&
            f.content &&
            ["mercado", "propiedad", "contenido", "campana", "general"].includes(
              f.category,
            ),
        );
      }
    } catch {
      return; // Malformed JSON — skip silently
    }

    if (facts.length === 0) return;

    // Persist facts — skip any with a duplicate title for this org
    for (const fact of facts) {
      const existing = await prisma.knowledgeEntry.findFirst({
        where: { organizationId, title: fact.title },
        select: { id: true },
      });
      if (existing) continue;

      await prisma.knowledgeEntry.create({
        data: {
          organizationId,
          createdById: userId,
          category: fact.category,
          title: fact.title,
          content: fact.content,
          source: "auto",
          isActive: true,
        },
      });
    }

    console.log(
      `[auto-learn] Saved ${facts.length} fact(s) from conversation ${conversationId}`,
    );
  } catch (error) {
    // Never throw — this is fire-and-forget
    console.error("[auto-learn] Error:", error);
  }
}

/**
 * Generate a conversational AI response for a WhatsApp / social DM message.
 * Returns a short reply in the same language as the incoming message.
 *
 * @param incomingText    - Text the lead sent
 * @param contactName     - Name of the sender (if known)
 * @param organizationId  - Org context for knowledge injection
 */
export async function generateAutoReply(
  incomingText: string,
  contactName: string,
  organizationId: string,
): Promise<string> {
  const apiKey =
    process.env.ANTHROPIC_API_KEY ?? process.env.CLAUDE_API_KEY ?? "";

  if (!apiKey) {
    return "¡Hola! Gracias por tu mensaje. En breve un asesor te contactará. 🏡";
  }

  // Fetch top knowledge entries for context
  const entries = await prisma.knowledgeEntry.findMany({
    where: { organizationId, isActive: true },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { category: true, title: true, content: true },
  });

  // Fetch org name
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { name: true },
  });

  const orgName = org?.name ?? "la agencia";

  let knowledgeBlock = "";
  if (entries.length > 0) {
    knowledgeBlock =
      "\n\nCONOCIMIENTO DE TU NEGOCIO:\n" +
      entries.map((e) => `- ${e.title}: ${e.content}`).join("\n");
  }

  const systemPrompt = `Eres Petunia, el asistente de IA de ${orgName}, una empresa inmobiliaria.
Recibes mensajes directos de prospectos y debes responder de forma cálida, profesional y breve (máximo 3 oraciones).
Tu objetivo: calificar el interés, ofrecer ayuda concreta y dar el siguiente paso claro.
Idioma: responde siempre en el mismo idioma del mensaje recibido.
NO uses emojis exagerados. NO hagas promesas de precio sin datos concretos.${knowledgeBlock}`;

  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 300,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: `Mensaje de ${contactName}: "${incomingText}"`,
      },
    ],
  });

  const reply =
    response.content[0]?.type === "text"
      ? response.content[0].text.trim()
      : "¡Hola! Gracias por tu mensaje. En breve un asesor te contactará. 🏡";

  return reply;
}
