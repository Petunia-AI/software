import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrganization } from "@/lib/auth-helpers";

const VALID_SOURCES = ["WEBSITE", "INSTAGRAM", "FACEBOOK", "WHATSAPP", "REFERRAL", "OTHER"] as const;
const VALID_STATUSES = ["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"] as const;

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  // Detect delimiter
  const firstLine = lines[0];
  const delimiter = firstLine.includes("\t") ? "\t" : firstLine.includes(";") ? ";" : ",";

  const headers = lines[0].split(delimiter).map((h) => h.trim().toLowerCase().replace(/['"]/g, ""));
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(delimiter).map((v) => v.trim().replace(/^['"]|['"]$/g, ""));
    if (values.length < 2) continue;

    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || "";
    });
    rows.push(row);
  }

  return rows;
}

function mapField(row: Record<string, string>, ...keys: string[]): string {
  for (const key of keys) {
    if (row[key]) return row[key];
  }
  return "";
}

function normalizeSource(raw: string): string {
  const upper = raw.toUpperCase().trim();
  if (VALID_SOURCES.includes(upper as any)) return upper;
  if (upper.includes("INSTAGRAM") || upper.includes("IG")) return "INSTAGRAM";
  if (upper.includes("FACEBOOK") || upper.includes("FB") || upper.includes("META")) return "FACEBOOK";
  if (upper.includes("WHATSAPP") || upper.includes("WA")) return "WHATSAPP";
  if (upper.includes("WEB") || upper.includes("SITIO")) return "WEBSITE";
  if (upper.includes("REFERIDO") || upper.includes("REFERRAL") || upper.includes("REF")) return "REFERRAL";
  return "OTHER";
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireOrganization();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const jsonData = formData.get("data") as string | null;

    let rows: Record<string, string>[] = [];

    if (file) {
      const text = await file.text();
      rows = parseCSV(text);
    } else if (jsonData) {
      rows = JSON.parse(jsonData);
    } else {
      return NextResponse.json({ error: "No se proporcionó archivo ni datos" }, { status: 400 });
    }

    if (rows.length === 0) {
      return NextResponse.json({ error: "No se encontraron registros válidos" }, { status: 400 });
    }

    if (rows.length > 5000) {
      return NextResponse.json({ error: "Máximo 5000 registros por importación" }, { status: 400 });
    }

    const leads = rows
      .map((row) => {
        const name = mapField(row, "name", "nombre", "nombre completo", "full_name", "full name", "contact_name");
        if (!name) return null;

        return {
          name,
          email: mapField(row, "email", "correo", "correo electrónico", "e-mail", "mail") || null,
          phone: mapField(row, "phone", "telefono", "teléfono", "celular", "mobile", "whatsapp", "tel") || null,
          source: normalizeSource(mapField(row, "source", "fuente", "origen", "canal", "platform")),
          status: "NEW" as const,
          notes: mapField(row, "notes", "notas", "comentarios", "comments", "observaciones", "mensaje", "message") || null,
          organizationId: user.organizationId!,
        };
      })
      .filter(Boolean) as any[];

    if (leads.length === 0) {
      return NextResponse.json(
        { error: "No se encontraron registros con nombre válido. Asegúrate de tener una columna 'nombre' o 'name'." },
        { status: 400 }
      );
    }

    const result = await prisma.lead.createMany({
      data: leads,
      skipDuplicates: true,
    });

    return NextResponse.json({
      imported: result.count,
      total: rows.length,
      skipped: rows.length - leads.length,
    });
  } catch (err) {
    console.error("Import error:", err);
    return NextResponse.json({ error: "Error al importar leads" }, { status: 500 });
  }
}
