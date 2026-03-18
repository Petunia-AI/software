import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrganization, unauthorized } from "@/lib/auth-helpers";
import type { LeadStatus } from "@/generated/prisma/client";

const FUB_API_BASE = "https://api.followupboss.com/v1";

interface FUBPerson {
  id: number;
  firstName?: string;
  lastName?: string;
  name?: string;
  stage?: string;
  source?: string;
  emails?: { value: string; type?: string }[];
  phones?: { value: string; type?: string }[];
  tags?: string[];
  created?: string;
  updated?: string;
  price?: number;
  assignedTo?: string;
  contacted?: boolean;
  lastActivity?: string;
}

interface FUBResponse {
  _metadata?: { total?: number };
  people?: FUBPerson[];
}

/**
 * Map FUB stage to Petunia LeadStatus
 */
function mapFubStageToStatus(stage?: string): LeadStatus {
  if (!stage) return "NEW";
  const s = stage.toLowerCase();
  if (s === "lead" || s === "new lead" || s === "new") return "NEW";
  if (s === "prospect" || s === "inquiry") return "CONTACTED";
  if (s === "active" || s === "hot" || s === "qualified") return "QUALIFIED";
  if (s === "appointment" || s === "showing" || s === "proposal") return "PROPOSAL";
  if (s === "offer" || s === "negotiation" || s === "under contract" || s === "pending") return "NEGOTIATION";
  if (s === "closed" || s === "won" || s === "closed won" || s === "past client") return "WON";
  if (s === "lost" || s === "dead" || s === "trash" || s === "closed lost" || s === "do not contact") return "LOST";
  return "NEW";
}

/**
 * Build full name from FUB person
 */
function buildName(person: FUBPerson): string {
  if (person.name && person.name.trim()) return person.name.trim();
  const parts = [person.firstName, person.lastName].filter(Boolean);
  return parts.join(" ") || "Sin nombre";
}

/**
 * POST /api/integrations/fub/sync
 * Fetch all leads from Follow Up Boss and upsert into Petunia CRM
 */
export async function POST(req: NextRequest) {
  const user = await requireOrganization();
  if (!user) return unauthorized();

  // Get org with FUB API key
  const org = await prisma.organization.findUnique({
    where: { id: user.organizationId },
    select: { fubApiKey: true },
  });

  const apiKey = (org as { fubApiKey?: string | null })?.fubApiKey;
  if (!apiKey) {
    return NextResponse.json(
      { error: "No hay API Key de Follow Up Boss configurada. Ve a Configuración → Integraciones." },
      { status: 400 },
    );
  }

  // Parse optional query
  const { searchParams } = new URL(req.url);
  const limitParam = parseInt(searchParams.get("limit") || "0", 10);
  const maxLeads = limitParam > 0 ? limitParam : 10000; // safety cap

  try {
    // Test connection first with a small request
    const testRes = await fetch(`${FUB_API_BASE}/me`, {
      headers: {
        Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`,
        Accept: "application/json",
      },
    });

    if (!testRes.ok) {
      const status = testRes.status;
      if (status === 401) {
        return NextResponse.json(
          { error: "API Key de Follow Up Boss inválida o expirada. Verifica la clave en Configuración." },
          { status: 401 },
        );
      }
      return NextResponse.json(
        { error: `Error al conectar con Follow Up Boss (HTTP ${status})` },
        { status: 502 },
      );
    }

    // Fetch all people with pagination
    const allPeople: FUBPerson[] = [];
    let offset = 0;
    const batchSize = 100; // FUB max per request

    while (allPeople.length < maxLeads) {
      const url = new URL(`${FUB_API_BASE}/people`);
      url.searchParams.set("limit", String(batchSize));
      url.searchParams.set("offset", String(offset));
      url.searchParams.set("sort", "created");
      url.searchParams.set("fields", "firstName,lastName,name,stage,source,emails,phones,tags,created,updated,price,assignedTo,contacted,lastActivity");

      const res = await fetch(url.toString(), {
        headers: {
          Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`,
          Accept: "application/json",
        },
      });

      if (!res.ok) {
        // If we already have some, continue with what we have
        if (allPeople.length > 0) break;
        return NextResponse.json(
          { error: `Error al obtener leads de FUB (HTTP ${res.status})` },
          { status: 502 },
        );
      }

      const data: FUBResponse = await res.json();
      const people = data.people || [];

      if (people.length === 0) break;

      allPeople.push(...people);
      offset += batchSize;

      // If we got fewer than the batch size, we've reached the end
      if (people.length < batchSize) break;

      // Rate limiting: FUB allows ~120 requests/min, add a small delay
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    if (allPeople.length === 0) {
      return NextResponse.json({
        success: true,
        imported: 0,
        updated: 0,
        total: 0,
        message: "No se encontraron leads en Follow Up Boss.",
      });
    }

    // Get existing leads for this org to check duplicates by email/phone
    const existingLeads = await prisma.lead.findMany({
      where: { organizationId: user.organizationId },
      select: { id: true, email: true, phone: true, name: true },
    });

    // Build lookup sets
    const emailMap = new Map<string, string>();
    const phoneMap = new Map<string, string>();
    for (const lead of existingLeads) {
      if (lead.email) emailMap.set(lead.email.toLowerCase(), lead.id);
      if (lead.phone) {
        const cleanPhone = lead.phone.replace(/\D/g, "");
        if (cleanPhone) phoneMap.set(cleanPhone, lead.id);
      }
    }

    let imported = 0;
    let updated = 0;
    let skipped = 0;

    // Process in batches
    for (const person of allPeople) {
      const name = buildName(person);
      const email = person.emails?.[0]?.value?.toLowerCase() || null;
      const phone = person.phones?.[0]?.value || null;
      const cleanPhone = phone?.replace(/\D/g, "") || null;
      const status = mapFubStageToStatus(person.stage);
      const notes = [
        person.tags?.length ? `Tags FUB: ${person.tags.join(", ")}` : null,
        person.source ? `Fuente FUB: ${person.source}` : null,
        person.price ? `Precio: $${person.price.toLocaleString()}` : null,
        person.assignedTo ? `Agente FUB: ${person.assignedTo}` : null,
        `FUB ID: ${person.id}`,
      ]
        .filter(Boolean)
        .join(" | ");

      // Check for existing lead by email or phone
      let existingId: string | undefined;
      if (email) existingId = emailMap.get(email);
      if (!existingId && cleanPhone) existingId = phoneMap.get(cleanPhone);

      if (existingId) {
        // Update existing lead with FUB data
        try {
          await prisma.lead.update({
            where: { id: existingId },
            data: {
              status,
              notes,
              source: "FOLLOW_UP_BOSS",
            },
          });
          updated++;
        } catch {
          skipped++;
        }
      } else {
        // Create new lead
        try {
          const newLead = await prisma.lead.create({
            data: {
              name,
              email,
              phone,
              source: "FOLLOW_UP_BOSS",
              status,
              notes,
              organizationId: user.organizationId,
              assignedToId: user.id,
            },
          });
          // Update lookup maps with new lead
          if (email) emailMap.set(email, newLead.id);
          if (cleanPhone) phoneMap.set(cleanPhone, newLead.id);
          imported++;
        } catch {
          skipped++;
        }
      }
    }

    // Update org sync timestamp
    await prisma.organization.update({
      where: { id: user.organizationId },
      data: {
        fubLastSyncAt: new Date(),
        fubLeadsSynced: imported + updated,
      } as Record<string, unknown>,
    });

    return NextResponse.json({
      success: true,
      imported,
      updated,
      skipped,
      total: allPeople.length,
      message: `Se importaron ${imported} leads nuevos, se actualizaron ${updated} existentes.${skipped > 0 ? ` ${skipped} omitidos.` : ""}`,
    });
  } catch (error) {
    console.error("FUB sync error:", error);
    return NextResponse.json(
      { error: "Error interno al sincronizar con Follow Up Boss" },
      { status: 500 },
    );
  }
}
