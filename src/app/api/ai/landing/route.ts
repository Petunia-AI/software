import { NextRequest, NextResponse } from "next/server";
import { requireOrganization, unauthorized } from "@/lib/auth-helpers";
import {
  generateContent,
  getPlatformAIConfig,
  checkAndConsumeCredits,
  logAIUsage,
} from "@/lib/ai";

const LANDING_CREDITS = 3; // Landing pages cost more credits

export async function POST(req: NextRequest) {
  try {
    const user = await requireOrganization();
    if (!user) return unauthorized();
    const { title, template, market, businessName, phone, color } = await req.json();

    // Get platform AI config
    const aiConfig = await getPlatformAIConfig();
    if (!aiConfig) {
      return NextResponse.json(
        { error: "El motor de IA no está configurado. Contacta al administrador." },
        { status: 503 }
      );
    }

    // Check credits (landing pages cost 3 credits)
    const credits = await checkAndConsumeCredits(user.organizationId, LANDING_CREDITS);
    if (!credits.allowed) {
      return NextResponse.json(
        {
          error: `No tienes suficientes créditos (necesitas ${LANDING_CREDITS}). Te quedan ${credits.remaining} de ${credits.limit}.`,
          creditsRemaining: credits.remaining,
          creditsLimit: credits.limit,
        },
        { status: 429 }
      );
    }

    const templateDescriptions: Record<string, string> = {
      compradores: "Página para atraer compradores de propiedades residenciales. Enfocada en encontrar el hogar ideal. Incluye formulario de búsqueda de propiedades.",
      sellers: "Página para captar propietarios que quieran vender. Ofrece valuación gratuita. Enfocada en obtener el mejor precio por su propiedad.",
      inversores: "Página para inversores interesados en bienes raíces. Enfocada en ROI, terrenos y oportunidades de inversión. Datos y cifras de mercado.",
      proyecto: "Página para un proyecto inmobiliario específico. Muestra amenidades, ubicación, precios y plan de pagos.",
    };

    const prompt = `Genera una landing page COMPLETA en HTML para un negocio de bienes raíces.

ESPECIFICACIONES:
- Título: ${title}
- Tipo: ${templateDescriptions[template] || template}
- Mercado objetivo: ${market}
- Nombre del negocio: ${businessName || "Petunia Real Estate"}
- Teléfono de contacto: ${phone || "+1 (555) 123-4567"}
- Color principal: ${color || "#7c3aed"}

REQUISITOS TÉCNICOS:
1. HTML completo con DOCTYPE, head y body
2. CSS inline dentro de una etiqueta <style> en el head
3. Diseño moderno, profesional y responsive (mobile-first)
4. Fuente: Inter de Google Fonts
5. NO uses JavaScript externo ni frameworks
6. Incluye meta viewport para responsive

SECCIONES REQUERIDAS:
1. HERO: Título grande, subtítulo atractivo, botón CTA que lleve al formulario
2. BENEFICIOS: 3-4 beneficios con iconos (usa emojis como iconos)
3. SOCIAL PROOF: Estadísticas o testimonios (datos ficticios realistas)
4. FORMULARIO DE CAPTURA: Nombre, email, teléfono, mensaje opcional. El form debe usar method="POST" action="/api/leads/public"
5. FOOTER: Nombre del negocio, teléfono, disclaimer legal

ESTILO:
- Fondo blanco con secciones alternas en gris claro (#f8f9fa)
- Color principal para botones y acentos: ${color || "#7c3aed"}
- Bordes redondeados (border-radius: 12px)
- Sombras suaves
- Tipografía limpia y legible
- Espaciado generoso (padding: 60px+)
- Botones grandes y llamativos
- El formulario debe tener campos con bordes suaves y placeholder text en español
- Mobile responsive con media queries

Todo el texto debe estar en ESPAÑOL.
Genera SOLO el HTML completo. Nada más.`;

    const systemPrompt = `Eres un experto desarrollador web y diseñador UX especializado en landing pages de alta conversión para bienes raíces.
Generas código HTML/CSS limpio, moderno, responsive y optimizado para conversión.
Siempre incluyes un formulario de captura de leads funcional.
Tu diseño es premium, profesional, con excelente tipografía y espaciado.
IMPORTANTE: Responde SOLO con el código HTML completo. Sin explicaciones, sin bloques markdown, sin backticks.`;

    const html = await generateContent({
      provider: aiConfig.provider,
      apiKey: aiConfig.apiKey,
      model: aiConfig.model,
      prompt,
      systemPrompt,
      maxTokens: 8192,
    });

    // Clean up markdown wrappers
    let cleanHtml = html.trim();
    if (cleanHtml.startsWith("```")) {
      cleanHtml = cleanHtml.replace(/^```(?:html)?\n?/, "").replace(/\n?```$/, "");
    }

    // Log usage
    await logAIUsage({
      organizationId: user.organizationId,
      userId: user.id,
      type: "LANDING_PAGE",
      creditsUsed: LANDING_CREDITS,
      provider: aiConfig.provider,
      model: aiConfig.model,
      endpoint: "/api/ai/landing",
    });

    return NextResponse.json({
      html: cleanHtml,
      title,
      creditsRemaining: credits.remaining,
    });
  } catch (error) {
    console.error("Landing generation error:", error);
    return NextResponse.json(
      { error: "Error al generar la landing page" },
      { status: 500 }
    );
  }
}
