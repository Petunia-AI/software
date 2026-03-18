import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcryptjs";

const pool = new pg.Pool({ connectionString: "postgresql://jaimegomez@localhost:5432/uperland_growth_os" });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const hashedPassword = await bcrypt.hash("cliente123", 12);

  const clients = [
    {
      user: { name: "Andrea Villanueva", email: "andrea@luxuryrealty.mx" },
      org: {
        name: "Luxury Realty MX",
        slug: "luxury-realty-mx",
        description: "Inmobiliaria de lujo en CDMX y Riviera Maya",
        plan: "professional",
        planStatus: "active",
        balance: 15400,
        monthlyRate: 2990,
        currency: "USD",
        contactEmail: "andrea@luxuryrealty.mx",
        contactPhone: "+52 55 9876 5432",
        maxProperties: 50,
        maxLeads: 200,
        trialEndsAt: null,
        lastPaymentAt: new Date("2026-03-01"),
      },
      properties: 18,
      leads: 45,
    },
    {
      user: { name: "Miguel Ángel Torres", email: "miguel@inmocasa.com" },
      org: {
        name: "InmoCasa",
        slug: "inmocasa",
        description: "Tu hogar ideal en Guadalajara y Zapopan",
        plan: "starter",
        planStatus: "active",
        balance: 5200,
        monthlyRate: 990,
        currency: "USD",
        contactEmail: "miguel@inmocasa.com",
        contactPhone: "+52 33 1234 5678",
        maxProperties: 20,
        maxLeads: 100,
        trialEndsAt: null,
        lastPaymentAt: new Date("2026-03-05"),
      },
      properties: 12,
      leads: 28,
    },
    {
      user: { name: "Patricia Mendoza", email: "patricia@bienesraicespm.mx" },
      org: {
        name: "Bienes Raíces PM",
        slug: "bienes-raices-pm",
        description: "Especialistas en propiedades comerciales en Monterrey",
        plan: "professional",
        planStatus: "active",
        balance: 8900,
        monthlyRate: 2990,
        currency: "USD",
        contactEmail: "patricia@bienesraicespm.mx",
        contactPhone: "+52 81 8765 4321",
        maxProperties: 50,
        maxLeads: 200,
        trialEndsAt: null,
        lastPaymentAt: new Date("2026-02-28"),
      },
      properties: 24,
      leads: 67,
    },
    {
      user: { name: "Ricardo Fuentes", email: "ricardo@propiedadesrf.com" },
      org: {
        name: "Propiedades RF",
        slug: "propiedades-rf",
        description: "Inversiones inmobiliarias en Querétaro",
        plan: "trial",
        planStatus: "active",
        balance: 0,
        monthlyRate: 0,
        currency: "USD",
        contactEmail: "ricardo@propiedadesrf.com",
        contactPhone: "+52 44 2345 6789",
        maxProperties: 5,
        maxLeads: 20,
        trialEndsAt: new Date("2026-03-25"),
        lastPaymentAt: null,
      },
      properties: 3,
      leads: 8,
    },
    {
      user: { name: "Sofía Herrera", email: "sofia@casasherrera.mx" },
      org: {
        name: "Casas Herrera",
        slug: "casas-herrera",
        description: "Casas residenciales en Puebla y CDMX",
        plan: "starter",
        planStatus: "past_due",
        balance: -1980,
        monthlyRate: 990,
        currency: "USD",
        contactEmail: "sofia@casasherrera.mx",
        contactPhone: "+52 22 3456 7890",
        maxProperties: 20,
        maxLeads: 100,
        trialEndsAt: null,
        lastPaymentAt: new Date("2026-01-15"),
      },
      properties: 8,
      leads: 15,
    },
    {
      user: { name: "Diego Ramírez", email: "diego@topbrokerscdmx.com" },
      org: {
        name: "Top Brokers CDMX",
        slug: "top-brokers-cdmx",
        description: "Red de brokers independientes en Ciudad de México",
        plan: "enterprise",
        planStatus: "active",
        balance: 45000,
        monthlyRate: 7990,
        currency: "USD",
        contactEmail: "diego@topbrokerscdmx.com",
        contactPhone: "+52 55 5678 9012",
        maxProperties: 200,
        maxLeads: 1000,
        trialEndsAt: null,
        lastPaymentAt: new Date("2026-03-08"),
      },
      properties: 52,
      leads: 134,
    },
    {
      user: { name: "Carmen Delgado", email: "carmen@vivecancun.mx" },
      org: {
        name: "Vive Cancún Properties",
        slug: "vive-cancun",
        description: "Propiedades turísticas y residenciales en Cancún",
        plan: "professional",
        planStatus: "active",
        balance: 22300,
        monthlyRate: 2990,
        currency: "USD",
        contactEmail: "carmen@vivecancun.mx",
        contactPhone: "+52 99 8901 2345",
        maxProperties: 50,
        maxLeads: 200,
        trialEndsAt: null,
        lastPaymentAt: new Date("2026-03-03"),
      },
      properties: 31,
      leads: 89,
    },
    {
      user: { name: "Arturo Navarro", email: "arturo@navarrobrokers.mx" },
      org: {
        name: "Navarro Brokers",
        slug: "navarro-brokers",
        description: "Bienes raíces de lujo en San Miguel de Allende",
        plan: "trial",
        planStatus: "active",
        balance: 0,
        monthlyRate: 0,
        currency: "USD",
        contactEmail: "arturo@navarrobrokers.mx",
        contactPhone: "+52 41 5678 9012",
        maxProperties: 5,
        maxLeads: 20,
        trialEndsAt: new Date("2026-03-20"),
        lastPaymentAt: null,
      },
      properties: 4,
      leads: 6,
    },
  ];

  for (const client of clients) {
    // Create user
    const user = await prisma.user.create({
      data: {
        name: client.user.name,
        email: client.user.email,
        password: hashedPassword,
        role: "USER",
      },
    });

    // Create organization
    const org = await prisma.organization.create({
      data: {
        ...client.org,
      },
    });

    // Link user to org
    await prisma.organizationMember.create({
      data: {
        userId: user.id,
        organizationId: org.id,
        role: "OWNER",
      },
    });

    console.log(`✅ ${client.org.name} — ${client.user.name} (${client.org.plan})`);
  }

  console.log(`\n🎉 ${clients.length} clientes demo creados`);
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
