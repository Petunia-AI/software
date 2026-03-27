import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, ContentPostType, ContentPostStatus, Platform } from "../src/generated/prisma/client";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  // Use env-provided IDs or fall back to defaults
  const orgId = process.env.SEED_ORG_ID || "org_uperland_001";
  const userId = process.env.SEED_USER_ID || "usr_demo_001";

  console.log("🗓️  Seeding calendar content posts...");

  // Update existing scheduled posts to current week
  await prisma.contentPost.updateMany({
    where: { id: "cmmwgrznk000m3j9kk8377mfn" },
    data: { scheduledAt: new Date("2026-03-26T10:00:00") },
  });
  await prisma.contentPost.updateMany({
    where: { id: "cmmwgrznn000r3j9k7boc0khp" },
    data: { scheduledAt: new Date("2026-03-27T14:00:00") },
  });

  const posts: {
    id: string;
    title: string;
    platform: Platform;
    content: string;
    type: ContentPostType;
    status: ContentPostStatus;
    scheduledAt: Date;
  }[] = [
    {
      id: "cal_demo_001",
      title: "Inversión inteligente en Polanco 2026",
      platform: Platform.INSTAGRAM,
      content: "Descubre por qué Polanco sigue siendo la zona dorada. Precio promedio +18% vs 2025.",
      type: ContentPostType.CAROUSEL,
      status: ContentPostStatus.SCHEDULED,
      scheduledAt: new Date("2026-03-26T09:00:00"),
    },
    {
      id: "cal_demo_002",
      title: "Nueva propiedad disponible — Condesa",
      platform: Platform.FACEBOOK,
      content: "Departamento con roof garden exclusivo. 3 recámaras, 2.5 baños, amenidades premium.",
      type: ContentPostType.POST,
      status: ContentPostStatus.SCHEDULED,
      scheduledAt: new Date("2026-03-26T11:00:00"),
    },
    {
      id: "cal_demo_003",
      title: "Guía del comprador inteligente",
      platform: Platform.LINKEDIN,
      content: "5 puntos clave que todo comprador debe revisar antes de firmar.",
      type: ContentPostType.POST,
      status: ContentPostStatus.SCHEDULED,
      scheduledAt: new Date("2026-03-26T16:00:00"),
    },
    {
      id: "cal_demo_004",
      title: "Tour virtual — Penthouse Santa Fe",
      platform: Platform.INSTAGRAM,
      content: "Recorrido en video por el penthouse más exclusivo de Santa Fe.",
      type: ContentPostType.REEL,
      status: ContentPostStatus.SCHEDULED,
      scheduledAt: new Date("2026-03-27T10:00:00"),
    },
    {
      id: "cal_demo_005",
      title: "Newsletter — Propiedades semana 13",
      platform: Platform.EMAIL,
      content: "Resumen semanal: 6 nuevas propiedades, 3 cierres exitosos, tendencias del mercado.",
      type: ContentPostType.EMAIL,
      status: ContentPostStatus.SCHEDULED,
      scheduledAt: new Date("2026-03-27T08:00:00"),
    },
    {
      id: "cal_demo_006",
      title: "Tips para vender más rápido",
      platform: Platform.INSTAGRAM,
      content: "Home staging efectivo en 5 pasos. Tu propiedad puede venderse 40% más rápido.",
      type: ContentPostType.POST,
      status: ContentPostStatus.SCHEDULED,
      scheduledAt: new Date("2026-03-27T18:00:00"),
    },
    {
      id: "cal_demo_007",
      title: "Propiedad del día — Bosques de Chapultepec",
      platform: Platform.WHATSAPP,
      content: "Casa de 450m² con jardín privado en zona exclusiva. Agenda tu visita hoy.",
      type: ContentPostType.WHATSAPP,
      status: ContentPostStatus.SCHEDULED,
      scheduledAt: new Date("2026-03-28T09:00:00"),
    },
    {
      id: "cal_demo_008",
      title: "Tendencias mercado Q1 2026",
      platform: Platform.LINKEDIN,
      content: "Análisis completo del primer trimestre: volumen de transacciones, zonas en alza y proyecciones Q2.",
      type: ContentPostType.POST,
      status: ContentPostStatus.SCHEDULED,
      scheduledAt: new Date("2026-03-28T11:00:00"),
    },
    {
      id: "cal_demo_009",
      title: "Reel — Un día en la vida de un broker",
      platform: Platform.INSTAGRAM,
      content: "Behind the scenes: cómo cerramos 3 propiedades en una semana.",
      type: ContentPostType.REEL,
      status: ContentPostStatus.SCHEDULED,
      scheduledAt: new Date("2026-03-28T15:00:00"),
    },
    {
      id: "cal_demo_010",
      title: "Inversión en preventa — Proyecto Luna",
      platform: Platform.FACEBOOK,
      content: "Unidades en preventa desde $2.8M MXN. Entrega estimada Q3 2027. Cupos limitados.",
      type: ContentPostType.POST,
      status: ContentPostStatus.SCHEDULED,
      scheduledAt: new Date("2026-03-29T10:00:00"),
    },
    {
      id: "cal_demo_011",
      title: "Story — Pregunta del día",
      platform: Platform.INSTAGRAM,
      content: "¿Comprar o rentar en 2026? Vota en nuestra historia.",
      type: ContentPostType.STORY,
      status: ContentPostStatus.SCHEDULED,
      scheduledAt: new Date("2026-03-29T12:00:00"),
    },
    {
      id: "cal_demo_012",
      title: "Open House — Sábado 29",
      platform: Platform.INSTAGRAM,
      content: "Te invitamos este sábado. 3 propiedades abiertas al público de 11am a 3pm.",
      type: ContentPostType.POST,
      status: ContentPostStatus.SCHEDULED,
      scheduledAt: new Date("2026-03-29T08:00:00"),
    },
    {
      id: "cal_demo_013",
      title: "Newsletter — Análisis de mercado",
      platform: Platform.EMAIL,
      content: "Informe especial: mercado inmobiliario CDMX — oportunidades y riesgos para inversores.",
      type: ContentPostType.EMAIL,
      status: ContentPostStatus.SCHEDULED,
      scheduledAt: new Date("2026-03-31T08:00:00"),
    },
    {
      id: "cal_demo_014",
      title: "Caso de éxito — Familia García",
      platform: Platform.FACEBOOK,
      content: "Encontramos el hogar perfecto para la familia García en tiempo récord.",
      type: ContentPostType.POST,
      status: ContentPostStatus.SCHEDULED,
      scheduledAt: new Date("2026-03-31T14:00:00"),
    },
    {
      id: "cal_demo_015",
      title: "Propiedades con mayor ROI en CDMX",
      platform: Platform.INSTAGRAM,
      content: "Top 5 zonas con mejor retorno de inversión. Polanco encabeza la lista.",
      type: ContentPostType.CAROUSEL,
      status: ContentPostStatus.SCHEDULED,
      scheduledAt: new Date("2026-04-01T10:00:00"),
    },
    {
      id: "cal_demo_016",
      title: "Bienvenido abril — Nuevas propiedades",
      platform: Platform.INSTAGRAM,
      content: "Arrancamos abril con 12 nuevas propiedades. ¿Cuál es la tuya?",
      type: ContentPostType.POST,
      status: ContentPostStatus.SCHEDULED,
      scheduledAt: new Date("2026-04-01T12:00:00"),
    },
    {
      id: "cal_demo_017",
      title: "Video tour — Departamento Nápoles",
      platform: Platform.INSTAGRAM,
      content: "Recorrido completo por depto de 120m² recién renovado en Nápoles.",
      type: ContentPostType.REEL,
      status: ContentPostStatus.SCHEDULED,
      scheduledAt: new Date("2026-04-02T10:00:00"),
    },
    {
      id: "cal_demo_018",
      title: "Cierre exitoso — Polanco",
      platform: Platform.FACEBOOK,
      content: "¡Felicitamos a nuestro cliente por su inversión en Polanco! Proceso ágil y seguro.",
      type: ContentPostType.POST,
      status: ContentPostStatus.SCHEDULED,
      scheduledAt: new Date("2026-04-02T15:00:00"),
    },
  ];

  let count = 0;
  for (const post of posts) {
    const { id, ...rest } = post;
    await prisma.contentPost.upsert({
      where: { id },
      update: rest,
      create: {
        id,
        ...rest,
        organizationId: orgId,
        createdById: userId,
      },
    });
    count++;
  }
  console.log(`✅ ${count} content posts seeded for calendar`);

  console.log("🎬  Seeding saved avatars (video materials)...");

  const savedAvatars = [
    {
      id: "av_demo_001",
      name: "Sofía — Presentación Polanco",
      videoUrl: "https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4",
      thumbnailUrl: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&q=80",
      sourceImageUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&q=85",
      script: "Hola, soy Sofía, tu asesora de confianza en Petunia. Hoy quiero presentarte una oportunidad única en Polanco, una de las zonas de mayor plusvalía en CDMX. Contáctanos y agenda tu visita hoy mismo.",
      voiceDescription: "Profesional y confiada",
      resolution: "720p",
    },
    {
      id: "av_demo_002",
      name: "Sofía — Tour Condesa Premium",
      videoUrl: "https://sample-videos.com/video321/mp4/480/big_buck_bunny_480p_1mb.mp4",
      thumbnailUrl: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400&q=80",
      sourceImageUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&q=85",
      script: "Buenos días. Hoy te muestro este espectacular departamento en la Condesa. 120 metros cuadrados, 3 recámaras, roof garden privado y la mejor ubicación de la ciudad. Precio especial para cierre este mes.",
      voiceDescription: "Cálida y cercana",
      resolution: "720p",
    },
    {
      id: "av_demo_003",
      name: "Sofía — Guía Inversionistas 2026",
      videoUrl: "https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_2mb.mp4",
      thumbnailUrl: "https://images.unsplash.com/photo-1551836022-deb4988cc6c0?w=400&q=80",
      sourceImageUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&q=85",
      script: "Si estás pensando en invertir en bienes raíces este 2026, este video es para ti. Te explico en 3 minutos las 5 mejores zonas de CDMX con mayor retorno de inversión y cómo Petunia puede ayudarte a encontrar la oportunidad perfecta.",
      voiceDescription: "Segura y ejecutiva",
      resolution: "480p",
    },
    {
      id: "av_demo_004",
      name: "Sofía — Testimonial Santa Fe",
      videoUrl: "https://sample-videos.com/video321/mp4/480/big_buck_bunny_480p_2mb.mp4",
      thumbnailUrl: "https://images.unsplash.com/photo-1582407947304-fd86f28f958c?w=400&q=80",
      sourceImageUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&q=85",
      script: "Muchas veces nuestros clientes llegan con dudas y se van con las llaves de su nuevo hogar. Hoy quiero contarte la historia de los Martínez, quienes encontraron su departamento ideal en Santa Fe en tiempo récord gracias a Petunia.",
      voiceDescription: "Emotiva y auténtica",
      resolution: "480p",
    },
  ];

  for (const av of savedAvatars) {
    await prisma.savedAvatar.upsert({
      where: { id: av.id },
      update: av,
      create: {
        ...av,
        organizationId: orgId,
        createdById: userId,
      },
    });
  }
  console.log(`✅ ${savedAvatars.length} saved avatars (video materials) seeded`);

  console.log("\n🎉 Calendar and avatar seed complete!");
  await prisma.$disconnect();
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
