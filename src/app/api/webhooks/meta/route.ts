import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { LeadSource } from "@/generated/prisma/client";
import { sendMetaDM } from "@/lib/whatsapp";
import { generateAutoReply } from "@/lib/auto-learn";

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

// Lead-gen webhook entry (existing)
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

// Messaging webhook entry (Instagram DM / Messenger)
interface MetaMessagingEntry {
  id: string;
  time: number;
  messaging?: {
    sender: { id: string };
    recipient: { id: string };
    timestamp: number;
    message?: {
      mid: string;
      text?: string;
    };
  }[];
}

interface MetaWebhookPayload {
  object: string;
  entry: (MetaWebhookEntry & MetaMessagingEntry)[];
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
// POST - Receive lead forms + Instagram DMs + Messenger messages
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  let payload: MetaWebhookPayload;
  try {
    payload = (await request.json()) as MetaWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const isInstagram = payload.object === "instagram";
  const isMessenger = payload.object === "page";

  // ── Instagram DM / Messenger auto-reply ─────────────────────────────────
  if (isInstagram || isMessenger) {
    const platform: "instagram" | "messenger" = isInstagram ? "instagram" : "messenger";

    for (const entry of payload.entry ?? []) {
      for (const messaging of entry.messaging ?? []) {
        const senderId = messaging.sender?.id;
        const pageId = entry.id; // Page / IG account ID
        const text = messaging.message?.text;

        if (!senderId || !text) continue;

        // Skip messages from the page itself (echo)
        if (senderId === pageId) continue;

        // Resolve organization by their connected Meta page ID (multi-tenant)
        const org = await prisma.organization.findFirst({
          where: { metaPageId: pageId },
          select: {
            id: true,
            instagramAutoReply: true,
            messengerAutoReply: true,
            metaAccessToken: true,
          },
        });

        if (!org) {
          console.warn(`[Meta Webhook] No organization found for pageId: ${pageId}`);
          continue;
        }

        const organizationId = org.id;

        // Create lead if new
        const source: LeadSource =
          platform === "instagram" ? LeadSource.INSTAGRAM : LeadSource.FACEBOOK;

        const existing = await prisma.lead.findFirst({
          where: {
            organizationId,
            notes: { contains: `${platform}_psid:${senderId}` },
          },
          select: { id: true },
        });

        if (!existing) {
          await prisma.lead.create({
            data: {
              name: `${platform === "instagram" ? "Instagram" : "Messenger"} ${senderId.slice(-6)}`,
              source,
              status: "NEW",
              notes: `${platform}_psid:${senderId}`,
              organizationId,
            },
          });
        }

        // Auto-reply if enabled for this platform
        const autoReplyEnabled =
          platform === "instagram"
            ? (org.instagramAutoReply ?? false)
            : (org.messengerAutoReply ?? false);

        const accessToken = org.metaAccessToken ?? null;

        if (autoReplyEnabled && accessToken) {
          // Fire-and-forget
          (async () => {
            try {
              const senderName =
                platform === "instagram" ? "cliente de Instagram" : "cliente de Messenger";
              const reply = await generateAutoReply(text, senderName, organizationId);
              await sendMetaDM(pageId, accessToken, senderId, reply, platform);
            } catch (err) {
              console.error(`[Meta Webhook] ${platform} auto-reply error:`, err);
            }
          })();
        }
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });
  }

  // ── Lead form submissions ────────────────────────────────────────────────
  const results: { leadgenId: string; status: string }[] = [];

  for (const entry of payload.entry ?? []) {
    // Resolve organization by their connected Meta page ID (multi-tenant)
    const pageId = entry.id;
    const orgForEntry = await prisma.organization.findFirst({
      where: { metaPageId: pageId },
      select: { id: true, metaAccessToken: true },
    });

    const organizationId = orgForEntry?.id ?? null;

    if (!organizationId) {
      console.warn(`[Meta Webhook] No organization found for pageId: ${pageId} — skipping leadgen entry`);
      continue;
    }

    for (const change of (entry as MetaWebhookEntry).changes ?? []) {
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
