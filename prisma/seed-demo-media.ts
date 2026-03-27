/**
 * seed-demo-media.ts
 * Adds images to properties + Meta/Google campaigns + HeyGen avatar for demo
 */
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL || "postgresql://jaimegomez@localhost:5432/uperland_growth_os" });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const ORG_ID  = process.env.SEED_ORG_ID  || "org_uperland_001";
const USER_ID = process.env.SEED_USER_ID || "usr_demo_001";

// ─── Property images (Unsplash, real estate) ────────────────────────────────
const PROPERTY_IMAGES: Record<string, string[]> = {
  "Departamento de lujo en Polanco": [
    "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=900&q=85",
    "https://images.unsplash.com/photo-1600607687939-ce8a6f349779?w=900&q=85",
    "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=900&q=85",
    "https://images.unsplash.com/photo-1600210492493-0946911123ea?w=900&q=85",
  ],
  "Casa moderna en Condesa": [
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=900&q=85",
    "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=900&q=85",
    "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=900&q=85",
    "https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=900&q=85",
  ],
  "Oficina ejecutiva en Santa Fe": [
    "https://images.unsplash.com/photo-1497366216548-37526070297c?w=900&q=85",
    "https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=900&q=85",
    "https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=900&q=85",
    "https://images.unsplash.com/photo-1604328698692-f76ea9498e76?w=900&q=85",
  ],
  "Terreno residencial en Coyoacán": [
    "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=900&q=85",
    "https://images.unsplash.com/photo-1416331108676-a22ccb276e35?w=900&q=85",
    "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=900&q=85",
  ],
  "Loft industrial en Roma Norte": [
    "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=900&q=85",
    "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=900&q=85",
    "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=900&q=85",
    "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=900&q=85",
  ],
  "Local comercial en Reforma": [
    "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=900&q=85",
    "https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=900&q=85",
    "https://images.unsplash.com/photo-1560472355-536de3962603?w=900&q=85",
  ],
  "Penthouse en Bosques de las Lomas": [
    "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=900&q=85",
    "https://images.unsplash.com/photo-1600607687644-c7171b42498b?w=900&q=85",
    "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=900&q=85",
    "https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=900&q=85",
  ],
  "Casa en Pedregal de San Ángel": [
    "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=900&q=85",
    "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=900&q=85",
    "https://images.unsplash.com/photo-1576941089067-2de3c901e126?w=900&q=85",
    "https://images.unsplash.com/photo-1574362848149-11496d93a7c7?w=900&q=85",
  ],
};

async function main() {
  console.log("🚀 Iniciando seed de demo media...\n");

  // ── 1. Images for properties ───────────────────────────────────────────
  const properties = await prisma.property.findMany({ where: { organizationId: ORG_ID } });
  let propCount = 0;
  for (const prop of properties) {
    const images = PROPERTY_IMAGES[prop.title];
    if (images) {
      await prisma.property.update({ where: { id: prop.id }, data: { images } });
      console.log(`🖼  ${prop.title} → ${images.length} imágenes`);
      propCount++;
    }
  }
  console.log(`✅ ${propCount} propiedades con imágenes\n`);

  // ── 2. Meta Campaigns ──────────────────────────────────────────────────
  const propPolanco  = properties.find(p => p.title.includes("Polanco"));
  const propCondesa  = properties.find(p => p.title.includes("Condesa"));
  const propBosques  = properties.find(p => p.title.includes("Bosques"));

  const now = new Date();

  const metaCampaigns = await Promise.all([
    prisma.metaCampaign.create({ data: {
      organizationId: ORG_ID,
      createdById: USER_ID,
      name: "Polanco — Compradores Premium CDMX",
      objective: "LEAD_GENERATION",
      status: "ACTIVE",
      dailyBudget: 350,
      currency: "USD",
      startDate: new Date(now.getTime() - 10 * 86400000),
      targetLocations: [{ key: "MX:09", name: "Ciudad de México", type: "city" }],
      targetAgeMin: 30,
      targetAgeMax: 55,
      targetGenders: [0],
      targetInterests: [
        { id: "6003107902433", name: "Real estate" },
        { id: "6003348604972", name: "Luxury goods" },
      ],
      targetPlatforms: ["facebook", "instagram"],
      headline: "Departamento de lujo en Polanco desde $8.5M",
      primaryText: "Vive en el corazón de Polanco. 180m², acabados de primera, rooftop privado. Agenda tu visita hoy.",
      description: "3 recámaras · Rooftop · Gym · Alberca",
      callToAction: "LEARN_MORE",
      imageUrl: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=900&q=85",
      linkUrl: "https://petunia.ai",
      propertyId: propPolanco?.id,
      impressions: 48320,
      clicks: 1842,
      leads: 23,
      spent: 3150,
      cpl: 136.96,
      ctr: 0.0381,
      publishedAt: new Date(now.getTime() - 10 * 86400000),
      lastSyncAt: new Date(now.getTime() - 2 * 3600000),
    }}),
    prisma.metaCampaign.create({ data: {
      organizationId: ORG_ID,
      createdById: USER_ID,
      name: "Condesa — Familias Buscando Casa",
      objective: "LEAD_GENERATION",
      status: "ACTIVE",
      dailyBudget: 250,
      currency: "USD",
      startDate: new Date(now.getTime() - 5 * 86400000),
      targetLocations: [{ key: "MX:09", name: "Ciudad de México", type: "city" }],
      targetAgeMin: 28,
      targetAgeMax: 50,
      targetGenders: [0],
      targetInterests: [
        { id: "6003107902433", name: "Real estate" },
        { id: "6002714396030", name: "Family" },
      ],
      targetPlatforms: ["facebook", "instagram"],
      headline: "Casa remodelada en La Condesa — 280m²",
      primaryText: "Diseño contemporáneo, jardín privado y terraza en azotea. Perfecta para tu familia. ¡Tour virtual disponible!",
      description: "4 recámaras · Jardín · Terraza · Doble altura",
      callToAction: "CONTACT_US",
      imageUrl: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=900&q=85",
      linkUrl: "https://petunia.ai",
      propertyId: propCondesa?.id,
      impressions: 22180,
      clicks: 934,
      leads: 11,
      spent: 1250,
      cpl: 113.64,
      ctr: 0.0421,
      publishedAt: new Date(now.getTime() - 5 * 86400000),
      lastSyncAt: new Date(now.getTime() - 1 * 3600000),
    }}),
    prisma.metaCampaign.create({ data: {
      organizationId: ORG_ID,
      createdById: USER_ID,
      name: "Penthouse Bosques — Inversionistas",
      objective: "LEAD_GENERATION",
      status: "DRAFT",
      dailyBudget: 500,
      currency: "USD",
      targetLocations: [{ key: "MX:09", name: "Ciudad de México", type: "city" }],
      targetAgeMin: 35,
      targetAgeMax: 60,
      targetGenders: [0],
      targetPlatforms: ["instagram"],
      headline: "Penthouse único en Bosques de las Lomas",
      primaryText: "350m² + terraza de 100m² con vista al bosque. La propiedad más exclusiva del año.",
      callToAction: "LEARN_MORE",
      imageUrl: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=900&q=85",
      linkUrl: "https://petunia.ai",
      propertyId: propBosques?.id,
      impressions: 0,
      clicks: 0,
      leads: 0,
      spent: 0,
    }}),
  ]);
  console.log(`✅ ${metaCampaigns.length} campañas de Meta Ads creadas\n`);

  // ── 3. Google Campaigns ────────────────────────────────────────────────
  const googleCampaigns = await Promise.all([
    prisma.googleCampaign.create({ data: {
      organizationId: ORG_ID,
      createdById: USER_ID,
      name: "Búsqueda — Departamentos Polanco Venta",
      objective: "LEAD_GENERATION",
      status: "ACTIVE",
      dailyBudget: 200,
      currency: "USD",
      startDate: new Date(now.getTime() - 14 * 86400000),
      targetLocations: [{ id: "1010108", name: "Ciudad de México", type: "city" }],
      targetAgeMin: 25,
      targetAgeMax: 65,
      targetKeywords: [
        { text: "departamento en polanco en venta", matchType: "BROAD" },
        { text: "comprar departamento polanco cdmx", matchType: "PHRASE" },
        { text: "departamento lujo polanco", matchType: "EXACT" },
        { text: "propiedades polanco precio", matchType: "BROAD" },
      ],
      headlines: [
        "Departamento en Polanco",
        "Lujo en Av. Masaryk",
        "3 Recámaras — $8.5M MXN",
        "Agenda tu Visita Hoy",
        "Rooftop · Gym · Alberca",
      ],
      descriptions: [
        "Departamento de 180m² con acabados de primera en el corazón de Polanco. Contáctanos ahora.",
        "Amenidades exclusivas: rooftop, gimnasio, alberca. Disponible para visita esta semana.",
      ],
      finalUrl: "https://petunia.ai",
      displayUrl: "petunia.ai/polanco",
      callToAction: "LEARN_MORE",
      imageUrl: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=900&q=85",
      propertyId: propPolanco?.id,
      impressions: 31450,
      clicks: 1287,
      leads: 18,
      spent: 2800,
      cpl: 155.56,
      ctr: 0.0409,
      conversions: 18,
      publishedAt: new Date(now.getTime() - 14 * 86400000),
      lastSyncAt: new Date(now.getTime() - 3600000),
    }}),
    prisma.googleCampaign.create({ data: {
      organizationId: ORG_ID,
      createdById: USER_ID,
      name: "Display — Retargeting Visitantes Web",
      objective: "BRAND_AWARENESS",
      status: "ACTIVE",
      dailyBudget: 80,
      currency: "USD",
      startDate: new Date(now.getTime() - 7 * 86400000),
      targetLocations: [{ id: "1010108", name: "Ciudad de México", type: "city" }],
      headlines: [
        "¿Sigues buscando tu propiedad ideal?",
        "Tenemos lo que necesitas en CDMX",
        "Agenda una visita — Es gratis",
      ],
      descriptions: [
        "Miles de opciones en las mejores zonas de CDMX. Asesoría personalizada sin costo.",
        "Polanco, Condesa, Bosques, Roma. Encuentra tu hogar ideal con nosotros.",
      ],
      finalUrl: "https://petunia.ai",
      displayUrl: "petunia.ai/propiedades",
      callToAction: "LEARN_MORE",
      imageUrl: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=900&q=85",
      impressions: 89200,
      clicks: 742,
      leads: 6,
      spent: 560,
      cpl: 93.33,
      ctr: 0.0083,
      conversions: 6,
      publishedAt: new Date(now.getTime() - 7 * 86400000),
      lastSyncAt: new Date(now.getTime() - 1800000),
    }}),
  ]);
  console.log(`✅ ${googleCampaigns.length} campañas de Google Ads creadas\n`);

  // ── 4. HeyGen Avatar demo ──────────────────────────────────────────────
  const avatar = await prisma.heyGenAvatar.create({ data: {
    organizationId: ORG_ID,
    createdById: USER_ID,
    name: "Sofia — Asesora Inmobiliaria",
    heygenAvatarId: "demo_avatar_sofia_001",
    generationId: "gen_demo_001",
    status: "READY",
    previewImageUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&q=85",
    previewVideoUrl: "https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4",
    gender: "female",
    age: "25-35",
    ethnicity: "Hispanic",
    style: "Professional",
    pose: "Standing",
    appearance: "Mujer latina profesional, cabello oscuro, traje ejecutivo, sonrisa cálida. Perfecta para presentar propiedades de lujo.",
    metadata: {
      resolution: "1080p",
      duration: 45,
      voice: "es-MX-DaliaNeural",
      generatedAt: new Date().toISOString(),
    },
  }});
  console.log(`✅ Avatar HeyGen "${avatar.name}" creado\n`);

  // ── 5. Landing Pages demo ──────────────────────────────────────────────
  const landingPages = await Promise.all([
    prisma.landingPage.create({ data: {
      organizationId: ORG_ID,
      createdById: USER_ID,
      title: "¿Listo para comprar tu depto ideal en Polanco?",
      description: "Landing page para captura de leads — campaña Polanco Premium",
      slug: "polanco-premium-2026",
      template: "compradores",
      nicho: "residencial-lujo",
      status: "ACTIVE",
      views: 1842,
      leads: 23,
      conversionRate: 1.25,
      publishedAt: new Date(now.getTime() - 10 * 86400000),
      html: "<h1>Demo</h1>",
    }}),
    prisma.landingPage.create({ data: {
      organizationId: ORG_ID,
      createdById: USER_ID,
      title: "Invierte en bienes raíces CDMX — Retornos del 12% anual",
      description: "Landing para inversionistas — mercado CDMX 2026",
      slug: "inversores-cdmx-2026",
      template: "inversores",
      nicho: "inversion",
      status: "ACTIVE",
      views: 3210,
      leads: 41,
      conversionRate: 1.28,
      publishedAt: new Date(now.getTime() - 20 * 86400000),
      html: "<h1>Demo</h1>",
    }}),
    prisma.landingPage.create({ data: {
      organizationId: ORG_ID,
      createdById: USER_ID,
      title: "Vende tu propiedad en menos de 60 días",
      description: "Landing para vendedores — captación de propiedades",
      slug: "vende-rapido-cdmx",
      template: "sellers",
      nicho: "vendedores",
      status: "DRAFT",
      views: 0,
      leads: 0,
      conversionRate: 0,
      html: "<h1>Demo</h1>",
    }}),
  ]);
  console.log(`✅ ${landingPages.length} landing pages creadas\n`);

  // ── Summary ─────────────────────────────────────────────────────────────
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🎉 ¡Demo media lista para el inversionista!");
  console.log(`   🖼  ${propCount} propiedades con fotos reales`);
  console.log(`   📣 ${metaCampaigns.length} campañas Meta Ads (2 activas + 1 borrador)`);
  console.log(`   🔍 ${googleCampaigns.length} campañas Google Ads (2 activas)`);
  console.log(`   🎬 1 avatar HeyGen "Sofía"`);
  console.log(`   🚀 ${landingPages.length} landing pages`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

main()
  .catch((e) => { console.error("❌ Error:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
