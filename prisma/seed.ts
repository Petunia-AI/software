import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcryptjs";

const pool = new pg.Pool({ connectionString: "postgresql://jaimegomez@localhost:5432/uperland_growth_os" });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const userId = "usr_demo_001";
  const orgId = "org_uperland_001";

  // ── Super Admin ──────────────────────────────────────────────────────────
  const hashedPassword = await bcrypt.hash("admin123", 12);
  await prisma.user.upsert({
    where: { email: "admin@petunia.ai" },
    update: { role: "ADMIN" },
    create: {
      id: userId,
      name: "Super Admin",
      email: "admin@petunia.ai",
      password: hashedPassword,
      role: "ADMIN",
    },
  });

  // Asegurar organización demo
  await prisma.organization.upsert({
    where: { id: orgId },
    update: {},
    create: {
      id: orgId,
      name: "Petunia Demo",
      slug: "petunia-demo",
      plan: "professional",
      planStatus: "active",
      aiCreditsLimit: 999,
    },
  });

  // Vincular admin a la organización
  await prisma.organizationMember.upsert({
    where: { userId_organizationId: { userId, organizationId: orgId } },
    update: {},
    create: {
      userId,
      organizationId: orgId,
      role: "OWNER",
    },
  });

  // ── Propiedades ──────────────────────────────────────────────────────────
  const properties = await Promise.all([
    prisma.property.create({
      data: {
        title: "Departamento de lujo en Polanco",
        description: "Espectacular departamento de 180m² en pleno corazón de Polanco, sobre Av. Masaryk. Acabados de primera, pisos de mármol, cocina integral italiana. Amenidades: gym, alberca, rooftop.",
        propertyType: "APARTMENT",
        operationType: "SALE",
        price: 8500000,
        currency: "USD",
        area: 180,
        bedrooms: 3,
        bathrooms: 2,
        parking: 2,
        address: "Av. Masaryk 340",
        city: "Ciudad de México",
        state: "CDMX",
        zipCode: "11560",
        status: "AVAILABLE",
        features: ["Rooftop", "Gym", "Alberca", "Seguridad 24/7", "Pet Friendly"],
        organizationId: orgId,
        createdById: userId,
      },
    }),
    prisma.property.create({
      data: {
        title: "Casa moderna en Condesa",
        description: "Casa completamente remodelada en la Condesa con diseño contemporáneo. Doble altura, jardín privado, terraza en azotea. Zona arbolada y tranquila.",
        propertyType: "HOUSE",
        operationType: "SALE",
        price: 12800000,
        currency: "USD",
        area: 280,
        bedrooms: 4,
        bathrooms: 3,
        parking: 2,
        address: "Calle Amsterdam 245",
        city: "Ciudad de México",
        state: "CDMX",
        zipCode: "06140",
        status: "AVAILABLE",
        features: ["Jardín", "Terraza", "Doble altura", "Remodelada", "Home Office"],
        organizationId: orgId,
        createdById: userId,
      },
    }),
    prisma.property.create({
      data: {
        title: "Oficina ejecutiva en Santa Fe",
        description: "Oficina corporativa de 120m² en torre AAA de Santa Fe. Vista panorámica, sala de juntas, 3 privados. Ideal para despacho o startup.",
        propertyType: "OFFICE",
        operationType: "RENT",
        price: 45000,
        currency: "USD",
        area: 120,
        bedrooms: 0,
        bathrooms: 2,
        parking: 3,
        address: "Av. Santa Fe 505, Torre A",
        city: "Ciudad de México",
        state: "CDMX",
        zipCode: "01210",
        status: "AVAILABLE",
        features: ["Vista panorámica", "Sala de juntas", "Recepción", "Helipuerto", "LEED"],
        organizationId: orgId,
        createdById: userId,
      },
    }),
    prisma.property.create({
      data: {
        title: "Terreno residencial en Coyoacán",
        description: "Terreno de 500m² en zona residencial de Coyoacán. Uso de suelo mixto, ideal para desarrollo de casas o edificio boutique de 4 niveles.",
        propertyType: "LAND",
        operationType: "SALE",
        price: 6200000,
        currency: "USD",
        area: 500,
        address: "Calle Francisco Sosa 102",
        city: "Ciudad de México",
        state: "CDMX",
        zipCode: "04000",
        status: "AVAILABLE",
        features: ["Uso mixto", "Esquina", "Servicios", "Escriturada"],
        organizationId: orgId,
        createdById: userId,
      },
    }),
    prisma.property.create({
      data: {
        title: "Loft industrial en Roma Norte",
        description: "Loft de diseño industrial de 95m² en la Roma Norte. Techos de 4.5m, ladrillo expuesto, cocina abierta. Perfecto para profesionales creativos.",
        propertyType: "APARTMENT",
        operationType: "RENT",
        price: 28000,
        currency: "USD",
        area: 95,
        bedrooms: 1,
        bathrooms: 1,
        parking: 1,
        address: "Calle Orizaba 87",
        city: "Ciudad de México",
        state: "CDMX",
        zipCode: "06700",
        status: "RESERVED",
        features: ["Loft", "Industrial", "Ladrillo expuesto", "Roof privado"],
        organizationId: orgId,
        createdById: userId,
      },
    }),
    prisma.property.create({
      data: {
        title: "Local comercial en Reforma",
        description: "Local comercial de 200m² sobre Paseo de la Reforma. Doble frente, gran visibilidad. Ideal para restaurante, showroom o flagship store.",
        propertyType: "COMMERCIAL",
        operationType: "RENT",
        price: 95000,
        currency: "USD",
        area: 200,
        bathrooms: 2,
        parking: 0,
        address: "Paseo de la Reforma 222",
        city: "Ciudad de México",
        state: "CDMX",
        zipCode: "06600",
        status: "AVAILABLE",
        features: ["Doble frente", "Alta visibilidad", "Sobre Reforma", "Entresuelo"],
        organizationId: orgId,
        createdById: userId,
      },
    }),
    prisma.property.create({
      data: {
        title: "Penthouse en Bosques de las Lomas",
        description: "Penthouse de 350m² con terraza de 100m². Vista espectacular al bosque. 4 recámaras con baño, family room, cuarto de servicio. Edificio exclusivo.",
        propertyType: "APARTMENT",
        operationType: "SALE",
        price: 22000000,
        currency: "USD",
        area: 350,
        bedrooms: 4,
        bathrooms: 5,
        parking: 3,
        address: "Bosques de Reforma 1500",
        city: "Ciudad de México",
        state: "CDMX",
        zipCode: "05120",
        status: "AVAILABLE",
        features: ["Penthouse", "Terraza 100m²", "Vista al bosque", "Seguridad", "Cava"],
        organizationId: orgId,
        createdById: userId,
      },
    }),
    prisma.property.create({
      data: {
        title: "Casa en Pedregal de San Ángel",
        description: "Residencia clásica de 420m² en el Pedregal. Piedra volcánica, jardín de 200m², estudio independiente. Zona de máxima plusvalía.",
        propertyType: "HOUSE",
        operationType: "SALE",
        price: 18500000,
        currency: "USD",
        area: 420,
        bedrooms: 5,
        bathrooms: 4,
        parking: 4,
        address: "Cráter 120, Pedregal",
        city: "Ciudad de México",
        state: "CDMX",
        zipCode: "04500",
        status: "SOLD",
        features: ["Jardín 200m²", "Piedra volcánica", "Estudio", "Clásica", "Vigilancia"],
        organizationId: orgId,
        createdById: userId,
      },
    }),
  ]);

  console.log(`✅ ${properties.length} propiedades creadas`);

  // ── Leads ────────────────────────────────────────────────────────────────
  const leads = await Promise.all([
    prisma.lead.create({
      data: {
        name: "María García Hernández",
        email: "maria.garcia@gmail.com",
        phone: "+52 55 1234 5678",
        source: "INSTAGRAM",
        status: "NEW",
        notes: "Interesada en departamento Polanco. Vio el reel y pidió información.",
        propertyId: properties[0].id,
        organizationId: orgId,
        assignedToId: userId,
      },
    }),
    prisma.lead.create({
      data: {
        name: "Carlos López Martínez",
        email: "carlos.lopez@outlook.com",
        phone: "+52 55 8765 4321",
        source: "WHATSAPP",
        status: "CONTACTED",
        notes: "Busca casa para familia de 4. Presupuesto 10-15M. Ya agendó visita.",
        propertyId: properties[1].id,
        organizationId: orgId,
        assignedToId: userId,
      },
    }),
    prisma.lead.create({
      data: {
        name: "Ana Martínez Soto",
        email: "ana.martinez@empresa.com",
        phone: "+52 55 2345 6789",
        source: "FACEBOOK",
        status: "QUALIFIED",
        notes: "Directora de finanzas. Busca oficina para su despacho contable de 8 personas.",
        propertyId: properties[2].id,
        organizationId: orgId,
        assignedToId: userId,
      },
    }),
    prisma.lead.create({
      data: {
        name: "Roberto Sánchez Ruiz",
        email: "roberto.sanchez@inversiones.mx",
        phone: "+52 55 3456 7890",
        source: "REFERRAL",
        status: "PROPOSAL",
        notes: "Inversionista. Interesado en terreno Coyoacán para desarrollo. Quiere avalúo.",
        propertyId: properties[3].id,
        organizationId: orgId,
        assignedToId: userId,
      },
    }),
    prisma.lead.create({
      data: {
        name: "Laura Hernández Díaz",
        email: "laura.hd@gmail.com",
        phone: "+52 55 4567 8901",
        source: "WEBSITE",
        status: "NEGOTIATION",
        notes: "Diseñadora freelance. Enamorada del loft Roma Norte. Negociando depósito y fecha.",
        propertyId: properties[4].id,
        organizationId: orgId,
        assignedToId: userId,
      },
    }),
    prisma.lead.create({
      data: {
        name: "Pedro Ramírez Torres",
        email: "pedro.ramirez@corp.mx",
        phone: "+52 55 5678 9012",
        source: "REFERRAL",
        status: "WON",
        notes: "Firmó contrato de renta del local en Reforma. Cliente satisfecho.",
        propertyId: properties[5].id,
        organizationId: orgId,
        assignedToId: userId,
      },
    }),
    prisma.lead.create({
      data: {
        name: "Fernanda Ruiz Campos",
        email: "fernanda.ruiz@hotmail.com",
        phone: "+52 55 6789 0123",
        source: "INSTAGRAM",
        status: "CONTACTED",
        notes: "Pareja joven buscando primer depto. Presupuesto hasta 5M. Le enviamos catálogo.",
        organizationId: orgId,
        assignedToId: userId,
      },
    }),
    prisma.lead.create({
      data: {
        name: "Diego Morales Vega",
        email: "diego.morales@startup.io",
        phone: "+52 55 7890 1234",
        source: "FACEBOOK",
        status: "NEW",
        notes: "CEO de startup tech. Busca oficina moderna para 15 personas.",
        propertyId: properties[2].id,
        organizationId: orgId,
        assignedToId: userId,
      },
    }),
    prisma.lead.create({
      data: {
        name: "Valentina Castro Luna",
        email: "valentina.cl@gmail.com",
        phone: "+52 55 8901 2345",
        source: "WHATSAPP",
        status: "QUALIFIED",
        notes: "Médica especialista. Interesada en penthouse Bosques. Tiene preaprobación bancaria.",
        propertyId: properties[6].id,
        organizationId: orgId,
        assignedToId: userId,
      },
    }),
    prisma.lead.create({
      data: {
        name: "Alejandro Gutiérrez Ponce",
        email: "alex.gp@inmobiliaria.mx",
        phone: "+52 55 9012 3456",
        source: "REFERRAL",
        status: "PROPOSAL",
        notes: "Familia expatriada regresando a CDMX. Busca casa grande en zona sur.",
        propertyId: properties[7].id,
        organizationId: orgId,
        assignedToId: userId,
      },
    }),
    prisma.lead.create({
      data: {
        name: "Sofía Mendoza Ríos",
        email: "sofia.mendoza@mail.com",
        phone: "+52 55 0123 4567",
        source: "INSTAGRAM",
        status: "NEW",
        notes: "Influencer de lifestyle. Interesada en Condesa para fotos y vida.",
        propertyId: properties[1].id,
        organizationId: orgId,
        assignedToId: userId,
      },
    }),
    prisma.lead.create({
      data: {
        name: "Javier Flores Campos",
        email: "javier.fc@tech.mx",
        phone: "+52 55 1122 3344",
        source: "WEBSITE",
        status: "LOST",
        notes: "Perdido. Decidió comprar en Querétaro por presupuesto.",
        organizationId: orgId,
        assignedToId: userId,
      },
    }),
  ]);

  console.log(`✅ ${leads.length} leads creados`);

  // ── Content Posts ────────────────────────────────────────────────────────
  const now = new Date();
  const contentPosts = await Promise.all([
    prisma.contentPost.create({
      data: {
        title: "Descubre el lujo en Polanco",
        content: "✨ Departamento de 180m² en Av. Masaryk\n\n3 recámaras | 2 baños | 2 estacionamientos\n\nAmenidades premium: gym, alberca, rooftop\n\n💰 $8,500,000 MXN\n\n#Polanco #LuxuryRealEstate #CDMX",
        type: "POST",
        platform: "INSTAGRAM",
        status: "PUBLISHED",
        propertyId: properties[0].id,
        publishedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
        organizationId: orgId,
        createdById: userId,
      },
    }),
    prisma.contentPost.create({
      data: {
        title: "5 razones para invertir en CDMX",
        content: "📊 El mercado inmobiliario en CDMX sigue en crecimiento\n\n1. Plusvalía del 8-12% anual\n2. Demanda de renta en zonas premium\n3. Desarrollo de infraestructura\n4. Atractivo para nómadas digitales\n5. Diversificación de portafolio\n\n¿Ya tienes tu inversión inmobiliaria?",
        type: "CAROUSEL",
        platform: "INSTAGRAM",
        status: "SCHEDULED",
        scheduledAt: new Date(now.getTime() + 3 * 60 * 60 * 1000),
        organizationId: orgId,
        createdById: userId,
      },
    }),
    prisma.contentPost.create({
      data: {
        title: "Tour virtual — Casa Condesa",
        content: "🎬 Recorrido exclusivo por esta casa completamente remodelada en la Condesa\n\nDoble altura, jardín privado, diseño contemporáneo\n\n4 recámaras | 3 baños | 280m²\n\n$12,800,000 MXN",
        type: "REEL",
        platform: "INSTAGRAM",
        status: "DRAFT",
        propertyId: properties[1].id,
        organizationId: orgId,
        createdById: userId,
      },
    }),
    prisma.contentPost.create({
      data: {
        title: "Oferta exclusiva — Oficina Santa Fe",
        content: "🏢 Oficina ejecutiva en torre AAA de Santa Fe\n\n120m² | 3 privados | Sala de juntas | Vista panorámica\n\nRenta mensual: $45,000 MXN\n\n¿Interesado? Responde este mensaje.",
        type: "WHATSAPP",
        platform: "WHATSAPP",
        status: "PUBLISHED",
        propertyId: properties[2].id,
        publishedAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        organizationId: orgId,
        createdById: userId,
      },
    }),
    prisma.contentPost.create({
      data: {
        title: "Newsletter — Nuevas propiedades marzo",
        content: "Estimado cliente,\n\nEste mes tenemos 3 nuevas propiedades exclusivas en nuestro catálogo:\n\n1. Penthouse en Bosques de las Lomas — $22M MXN\n2. Terreno en Coyoacán — $6.2M MXN\n3. Loft en Roma Norte — $28K/mes\n\nContáctenos para agendar visitas privadas.",
        type: "EMAIL",
        platform: "EMAIL",
        status: "DRAFT",
        organizationId: orgId,
        createdById: userId,
      },
    }),
    prisma.contentPost.create({
      data: {
        title: "Tendencias inmobiliarias 2026",
        content: "El mercado inmobiliario mexicano presenta oportunidades únicas:\n\n📈 ROI promedio: 12% anual en zonas premium\n🏗️ Desarrollo sustentable como diferenciador\n💼 Coworking impulsa demanda de oficinas flexibles\n🌎 CDMX en top 10 ciudades para inversión LatAm\n\n#RealEstate #Inversión #Inmobiliario",
        type: "POST",
        platform: "LINKEDIN",
        status: "PUBLISHED",
        publishedAt: new Date(now.getTime() - 48 * 60 * 60 * 1000),
        organizationId: orgId,
        createdById: userId,
      },
    }),
    prisma.contentPost.create({
      data: {
        title: "Propiedad nueva disponible",
        content: "🏡 ¡Nueva propiedad! Penthouse en Bosques de las Lomas\n\n350m² + terraza de 100m²\nVista al bosque 🌳\n\nDesliza para ver más →",
        type: "STORY",
        platform: "INSTAGRAM",
        status: "SCHEDULED",
        propertyId: properties[6].id,
        scheduledAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        organizationId: orgId,
        createdById: userId,
      },
    }),
    prisma.contentPost.create({
      data: {
        title: "Caso de éxito — Cliente satisfecho",
        content: "Hoy celebramos otro cierre exitoso 🎉\n\nPedro encontró el local perfecto en Reforma para su negocio. Proceso ágil, transparente y profesional.\n\nEn Uperland nos dedicamos a que encuentres el espacio ideal.\n\n#CasoDeÉxito #Uperland #BienesRaíces",
        type: "POST",
        platform: "FACEBOOK",
        status: "PUBLISHED",
        publishedAt: new Date(now.getTime() - 72 * 60 * 60 * 1000),
        organizationId: orgId,
        createdById: userId,
      },
    }),
  ]);

  console.log(`✅ ${contentPosts.length} content posts creados`);

  // ── Follow-up Tasks ──────────────────────────────────────────────────────
  const followUpTasks = await Promise.all([
    prisma.followUpTask.create({
      data: {
        leadId: leads[0].id,
        type: "CALL",
        content: "Llamar a María para confirmar visita al departamento en Polanco",
        scheduledAt: new Date(now.getTime() + 2 * 60 * 60 * 1000),
        organizationId: orgId,
        createdById: userId,
      },
    }),
    prisma.followUpTask.create({
      data: {
        leadId: leads[1].id,
        type: "WHATSAPP",
        content: "Enviar fotos adicionales del jardín y cochera de la casa en Condesa",
        scheduledAt: new Date(now.getTime() + 4 * 60 * 60 * 1000),
        organizationId: orgId,
        createdById: userId,
      },
    }),
    prisma.followUpTask.create({
      data: {
        leadId: leads[2].id,
        type: "EMAIL",
        content: "Enviar propuesta formal con condiciones de renta de la oficina",
        scheduledAt: new Date(now.getTime() + 6 * 60 * 60 * 1000),
        organizationId: orgId,
        createdById: userId,
      },
    }),
    prisma.followUpTask.create({
      data: {
        leadId: leads[3].id,
        type: "REMINDER",
        content: "Revisar si Roberto recibió el avalúo actualizado del terreno",
        scheduledAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        organizationId: orgId,
        createdById: userId,
      },
    }),
    prisma.followUpTask.create({
      data: {
        leadId: leads[4].id,
        type: "CALL",
        content: "Seguimiento post-visita con Laura — preguntar sobre decisión del loft",
        scheduledAt: new Date(now.getTime() - 48 * 60 * 60 * 1000),
        organizationId: orgId,
        createdById: userId,
      },
    }),
    prisma.followUpTask.create({
      data: {
        leadId: leads[5].id,
        type: "EMAIL",
        content: "Enviar contrato final para firma del local en Reforma",
        scheduledAt: new Date(now.getTime() - 12 * 60 * 60 * 1000),
        completedAt: new Date(now.getTime() - 6 * 60 * 60 * 1000),
        organizationId: orgId,
        createdById: userId,
      },
    }),
    prisma.followUpTask.create({
      data: {
        leadId: leads[4].id,
        type: "WHATSAPP",
        content: "Confirmar monto de depósito y fecha de mudanza con Laura",
        scheduledAt: new Date(now.getTime() - 36 * 60 * 60 * 1000),
        completedAt: new Date(now.getTime() - 30 * 60 * 60 * 1000),
        organizationId: orgId,
        createdById: userId,
      },
    }),
    prisma.followUpTask.create({
      data: {
        leadId: leads[8].id,
        type: "CALL",
        content: "Llamar a Valentina para agendar visita al penthouse en Bosques",
        scheduledAt: new Date(now.getTime() + 8 * 60 * 60 * 1000),
        organizationId: orgId,
        createdById: userId,
      },
    }),
    prisma.followUpTask.create({
      data: {
        leadId: leads[9].id,
        type: "EMAIL",
        content: "Enviar comparativa de propiedades zona sur a familia Gutiérrez",
        scheduledAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        organizationId: orgId,
        createdById: userId,
      },
    }),
  ]);

  console.log(`✅ ${followUpTasks.length} follow-up tasks creados`);

  // ── Follow-up Sequences ──────────────────────────────────────────────────
  const sequences = await Promise.all([
    prisma.followUpSequence.create({
      data: {
        name: "Bienvenida — Lead nuevo",
        description: "Secuencia automática para leads nuevos de redes sociales",
        steps: [
          { day: 0, type: "WHATSAPP", content: "Mensaje de bienvenida + catálogo" },
          { day: 1, type: "EMAIL", content: "Email con propiedades similares" },
          { day: 3, type: "CALL", content: "Llamada de presentación" },
          { day: 7, type: "WHATSAPP", content: "Seguimiento + promoción" },
        ],
        isActive: true,
        organizationId: orgId,
      },
    }),
    prisma.followUpSequence.create({
      data: {
        name: "Seguimiento post-visita",
        description: "Recordatorios después de una visita a propiedad",
        steps: [
          { day: 0, type: "WHATSAPP", content: "Gracias por la visita + fotos" },
          { day: 2, type: "CALL", content: "Llamada para feedback" },
          { day: 5, type: "EMAIL", content: "Propuesta formal si hay interés" },
        ],
        isActive: true,
        organizationId: orgId,
      },
    }),
    prisma.followUpSequence.create({
      data: {
        name: "Reactivación — Leads fríos",
        description: "Secuencia para leads sin actividad en 30+ días",
        steps: [
          { day: 0, type: "EMAIL", content: "¿Sigues interesado? + novedades" },
          { day: 3, type: "WHATSAPP", content: "Propiedades nuevas en tu zona" },
          { day: 7, type: "CALL", content: "Llamada de reactivación" },
          { day: 14, type: "EMAIL", content: "Promoción exclusiva" },
          { day: 30, type: "EMAIL", content: "Último contacto" },
        ],
        isActive: false,
        organizationId: orgId,
      },
    }),
  ]);

  console.log(`✅ ${sequences.length} secuencias creadas`);
  console.log("\n🎉 Seed completado exitosamente");
}

main()
  .catch((e) => {
    console.error("❌ Error en seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
