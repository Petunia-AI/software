import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const {
      propertyName, price, area, bedrooms, bathrooms,
      location, tagline, platform, tone, customPrompt,
      slideCount = 5,
    } = await req.json();

    const propertyDetails = [
      propertyName && `Property: ${propertyName}`,
      location     && `Location: ${location}`,
      price        && `Price: ${price}`,
      area         && `Area: ${area} m²`,
      bedrooms     && `${bedrooms} bedrooms`,
      bathrooms    && `${bathrooms} bathrooms`,
      tagline      && `Key message: ${tagline}`,
      customPrompt && `Additional context: ${customPrompt}`,
    ].filter(Boolean).join("\n");

    const toneMap: Record<string, string> = {
      lujo:        "ultra-luxury, exclusive, aspirational — think Sotheby's or Christie's Real Estate",
      profesional: "professional, trustworthy, data-driven — think JLL or CBRE",
      cercano:     "warm, personal, community-focused — think local boutique agency",
      urgente:     "urgent, scarcity-driven, action-oriented — now-or-never energy",
      informativo: "educational, transparent, detail-rich — buyer-empowering",
      persuasivo:  "emotionally compelling, benefit-focused, aspirational lifestyle",
    };

    const platformMap: Record<string, string> = {
      INSTAGRAM: "Instagram carousel (4:5 portrait ratio, Gen Z + Millennial audience, lifestyle-driven)",
      FACEBOOK:  "Facebook carousel (square or landscape, broader 35-55 audience, family/investment angle)",
      LINKEDIN:  "LinkedIn carousel (professional tone, investors, ROI-focused)",
      TIKTOK:    "TikTok slideshow (short punchy text, trend-aware, Gen Z energy)",
    };

    const { content } = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 2500,
      system: `You are a world-class real estate content strategist and copywriter specializing in high-converting social media carousels. You create narrative arcs that hook, engage, and convert — each slide building on the last.

You ALWAYS respond with valid JSON only. No text before or after the JSON object.`,
      messages: [{
        role: "user",
        content: `Create a ${slideCount}-slide real estate marketing carousel strategy for ${platformMap[platform] || platform}.

PROPERTY DATA:
${propertyDetails || "Luxury real estate property — create a compelling narrative"}

TONE: ${toneMap[tone] || tone}
LANGUAGE: Spanish (Latin American) — all headline and body text must be in Spanish

Return EXACTLY this JSON structure (nothing else, pure JSON):
{
  "strategy": "One sentence describing the narrative arc and conversion goal of this carousel",
  "slides": [
    {
      "slideNumber": 1,
      "type": "hook",
      "headline": "Short powerful headline in Spanish (max 7 words, no punctuation at end)",
      "body": "2-3 lines of persuasive Spanish copy. This slide should stop the scroll.",
      "cta": null,
      "imageBrief": "Hyper-detailed English description of the ideal photographic scene for Flux AI — specify architectural style, materials, lighting direction and quality, camera angle, lens, time of day, mood. NO text, NO people. Real estate magazine quality.",
      "imageStyle": "luxury real estate photography, cinematic"
    }
  ]
}

SLIDE TYPES and their purpose:
- hook (slide 1): Stop the scroll. Bold statement or question. Wide establishing exterior shot.
- feature (slides 2-3): Showcase 1-2 key spaces (primary suite, kitchen, terrace, view). Interior hero shots.
- lifestyle (slide 4): The emotion of living there. Aspirational mood. Pool, garden, rooftop at magic hour.
- social_proof (optional): Trust signal. Investment angle. Neighborhood prestige.
- cta (last slide): Clear call to action in Spanish. Include a cta string like "Agenda tu visita privada hoy".

RULES:
- Each imageBrief must describe a DIFFERENT scene (exterior, living room, primary suite, amenity, CTA card).
- imageBrief must be in English for Flux AI.
- All headline and body text must be in Spanish.
- The narrative should flow: HOOK → DESIRE → PROOF → ACTION.
- Make the copy feel premium, not generic.`,
      }],
    });

    const raw = content[0].type === "text" ? content[0].text.trim() : "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("No JSON in carousel response:", raw);
      return NextResponse.json({ error: "Error generando estrategia de carrusel" }, { status: 500 });
    }

    const data = JSON.parse(jsonMatch[0]);
    return NextResponse.json(data);
  } catch (err: any) {
    console.error("Carousel generation error:", err);
    return NextResponse.json({ error: err.message || "Error" }, { status: 500 });
  }
}
