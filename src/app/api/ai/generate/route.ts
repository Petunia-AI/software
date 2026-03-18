import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrganization, unauthorized } from "@/lib/auth-helpers";
import {
  generatePropertyContent,
  generateContent,
  getPlatformAIConfig,
  checkAndConsumeCredits,
  logAIUsage,
  getKnowledgeContext,
} from "@/lib/ai";

export async function POST(req: NextRequest) {
  try {
    const user = await requireOrganization();
    if (!user) return unauthorized();
    const { propertyId, contentType, platform, tone, customPrompt } =
      await req.json();

    // Get platform AI config (managed by super admin)
    const aiConfig = await getPlatformAIConfig();
    if (!aiConfig) {
      return NextResponse.json(
        { error: "El motor de IA no está configurado. Contacta al administrador." },
        { status: 503 }
      );
    }

    // Check credits
    const credits = await checkAndConsumeCredits(user.organizationId, 1);
    if (!credits.allowed) {
      return NextResponse.json(
        {
          error: `Has alcanzado tu límite de ${credits.limit} créditos de IA este mes. Actualiza tu plan para obtener más.`,
          creditsRemaining: credits.remaining,
          creditsLimit: credits.limit,
        },
        { status: 429 }
      );
    }

    let content: string;

    // Build dynamic knowledge context for this org
    const knowledgeContext = await getKnowledgeContext(user.organizationId);

    if (propertyId) {
      const property = await prisma.property.findUnique({
        where: { id: propertyId, organizationId: user.organizationId },
      });

      if (!property) {
        return NextResponse.json({ error: "Propiedad no encontrada" }, { status: 404 });
      }

      content = await generatePropertyContent({
        property: {
          title: property.title,
          description: property.description,
          propertyType: property.propertyType,
          operationType: property.operationType,
          price: property.price?.toString(),
          currency: property.currency,
          area: property.area?.toString(),
          bedrooms: property.bedrooms,
          bathrooms: property.bathrooms,
          city: property.city,
          state: property.state,
          features: property.features as string[] | null,
        },
        contentType,
        platform,
        tone: tone || "profesional",
        language: "es",
        provider: aiConfig.provider,
        apiKey: aiConfig.apiKey,
        model: aiConfig.model,
        knowledgeContext,
      });
    } else {
      const platformGuide: Record<string, string> = {
        INSTAGRAM: "Máximo 2200 caracteres. Usa emojis estratégicamente. Incluye hashtags relevantes al final.",
        FACEBOOK: "Puede ser más extenso. Incluye llamado a la acción. Tono conversacional.",
        TIKTOK: "Texto corto y dinámico. Hook inicial fuerte. Máximo 150 caracteres.",
        WHATSAPP: "Mensaje directo y personalizado. Sin hashtags. Máximo 1000 caracteres.",
        EMAIL: "Email con asunto, saludo, cuerpo y cierre. Con llamado a la acción.",
        LINKEDIN: "Tono profesional. Enfocado en inversión. Con datos relevantes.",
      };
      const contentTypeGuide: Record<string, string> = {
        POST: "Publicación estándar con copy completo.",
        STORY: "Texto breve y llamativo. Máximo 3 líneas.",
        REEL: "Script corto para video con hook, desarrollo y CTA.",
        CAROUSEL: "Texto para 5-7 slides. Cada slide con título y descripción breve.",
        WHATSAPP: "Mensaje de WhatsApp directo y amigable.",
        EMAIL: "Email de marketing inmobiliario completo.",
      };
      const basePrompt = customPrompt
        ? `Genera contenido de marketing inmobiliario para ${platform} (${contentTypeGuide[contentType] || contentType}) con tono ${tone || "profesional"}.\n\nInstrucciones adicionales: ${customPrompt}\n\nReglas de plataforma: ${platformGuide[platform] || platform}`
        : `Genera contenido de marketing inmobiliario para ${platform}.\n\nTIPO: ${contentTypeGuide[contentType] || contentType}\nPLATAFORMA: ${platformGuide[platform] || platform}\nTONO: ${tone || "profesional"}`;

      content = await generateContent({
        provider: aiConfig.provider,
        apiKey: aiConfig.apiKey,
        model: aiConfig.model,
        prompt: basePrompt,
        systemPrompt: `Eres un copywriter experto en marketing inmobiliario de lujo. Generas ÚNICAMENTE el texto listo para publicar — sin explicaciones, sin código HTML, sin metadatos, sin encabezados como "Aquí tienes..." o "Te presento...". Solo el copy final directo, con emojis si aplica según la plataforma, listo para copiar y pegar. Tono ${tone || "profesional"}.${knowledgeContext}`,
      });
    }

    // Log usage
    await logAIUsage({
      organizationId: user.organizationId,
      userId: user.id,
      type: "CONTENT_GENERATION",
      provider: aiConfig.provider,
      model: aiConfig.model,
      endpoint: "/api/ai/generate",
    });

    return NextResponse.json({
      content,
      creditsRemaining: credits.remaining,
    });
  } catch (error) {
    console.error("AI generation error:", error);
    return NextResponse.json(
      { error: "Error al generar contenido" },
      { status: 500 }
    );
  }
}
