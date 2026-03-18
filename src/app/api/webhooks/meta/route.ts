import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { LeadSource } from "@/generated/prisma/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MetaFieldData {
  name: string;
  values: string[];
}

interface MetaLeadResponse {
  id: string;
  created_time: string;
  field_data: MetaFieldData[];
  ad_id?: string;
  form_id?: string;
  platform?: string;
}

interface MetaWebhookEntry {
  id: string;
  time: number;
  changes: {
    field: string;
    value: {
      ad_id?: string;
      form_id?: string;
      leadgen_id: string;
      created_time: number;
      page_id: string;
      adgroup_id?: string;
    };
  }[];
}

interface MetaWebhookPayload {
  object: string;
  entry: MetaWebhookEntry[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getFieldValue(fieldData: MetaFieldData[], name: string): string | undefined {
  const field = fieldData.find((f) => f.name === name);
  return field?.values?.[0] ?? undefined;
}

function resolveLeadSource(platform: string | undefined, object: string): LeadSource {
  const normalized = (platform ?? object).toLowerCase();
  if (normalized.includes("instagram")) return LeadSource.INSTAGRAM;
  return LeadSource.FACEBOOK;
}

async function fetchLeadFromMeta(leadgenId: string): Promise<MetaLeadResponse> {
  const accessToken = process.env.META_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("META_ACCESS_TOKEN is not configured");
  }

  const url = `https://graph.facebook.com/v21.0/${leadgenId}?access_token=${accessToken}`;
  const res = await fetch(url, { method: "GET" });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Meta Graph API error (${res.status}): ${body}`);
  }

  return res.json() as Promise<MetaLeadResponse>;
}

// ---------------------------------------------------------------------------
// GET  - Webhook verification
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN;

  if (mode === "subscribe" && token === verifyToken) {
    console.log("[Meta Webhook] Verification successful");
    return new NextResponse(challenge, { status: 200 });
  }

  console.warn("[Meta Webhook] Verification failed — token mismatch or missing params");
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// ---------------------------------------------------------------------------
// POST - Receive lead form submissions
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const organizationId = process.env.META_ORGANIZATION_ID;
  if (!organizationId) {
    console.error("[Meta Webhook] META_ORGANIZATION_ID is not configured");
    return NextResponse.json(
      { error: "Server misconfigured" },
      { status: 500 },
    );
  }

  let payload: MetaWebhookPayload;
  try {
    payload = (await request.json()) as MetaWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Meta expects a 200 response quickly; process leads after acknowledging.
  // In a serverless environment we process synchronously but keep work minimal.
  const results: { leadgenId: string; status: string }[] = [];

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== "leadgen") continue;

      const leadgenId = change.value?.leadgen_id;
      if (!leadgenId) continue;

      try {
        // Dedup: skip if we already stored this Meta lead
        const existing = await prisma.lead.findFirst({
          where: {
            organizationId,
            notes: { contains: `meta_lead_id:${leadgenId}` },
          },
        });

        if (existing) {
          results.push({ leadgenId, status: "duplicate" });
          continue;
        }

        // Fetch full lead data from Meta Graph API
        const metaLead = await fetchLeadFromMeta(leadgenId);

        const fullName = getFieldValue(metaLead.field_data, "full_name") ?? "Unknown";
        const email = getFieldValue(metaLead.field_data, "email");
        const phone = getFieldValue(metaLead.field_data, "phone_number");

        const source = resolveLeadSource(metaLead.platform, payload.object);

        await prisma.lead.create({
          data: {
            name: fullName,
            email: email ?? null,
            phone: phone ?? null,
            source,
            status: "NEW",
            notes: `meta_lead_id:${leadgenId}`,
            organizationId,
          },
        });

        results.push({ leadgenId, status: "created" });
        console.log(`[Meta Webhook] Lead created — meta_lead_id:${leadgenId}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[Meta Webhook] Failed to process lead ${leadgenId}:`, message);
        results.push({ leadgenId, status: "error" });
      }
    }
  }

  return NextResponse.json({ received: true, results }, { status: 200 });
}
