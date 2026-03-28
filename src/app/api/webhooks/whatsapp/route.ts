import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppMessage } from "@/lib/whatsapp";
import { generateAutoReply } from "@/lib/auto-learn";

// ---------------------------------------------------------------------------
// GET  – WhatsApp webhook verification (Meta Cloud API handshake)
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (
    mode === "subscribe" &&
    token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN
  ) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// ---------------------------------------------------------------------------
// POST – Receive incoming WhatsApp messages
// ---------------------------------------------------------------------------

interface WhatsAppContact {
  profile: { name: string };
  wa_id: string;
}

interface WhatsAppMessage {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: { body: string };
}

interface WhatsAppChange {
  value: {
    messaging_product: string;
    metadata: { display_phone_number: string; phone_number_id: string };
    contacts?: WhatsAppContact[];
    messages?: WhatsAppMessage[];
  };
  field: string;
}

interface WhatsAppEntry {
  id: string;
  changes: WhatsAppChange[];
}

interface WhatsAppWebhookBody {
  object: string;
  entry: WhatsAppEntry[];
}

export async function POST(req: NextRequest) {
  try {
    const body: WhatsAppWebhookBody = await req.json();

    // Only process WhatsApp Business Account events
    if (body.object !== "whatsapp_business_account") {
      return NextResponse.json({ status: "ignored" }, { status: 200 });
    }

    const organizationId = process.env.WHATSAPP_ORGANIZATION_ID;
    if (!organizationId) {
      console.error("[whatsapp-webhook] WHATSAPP_ORGANIZATION_ID is not set");
      return NextResponse.json({ status: "ok" }, { status: 200 });
    }

    for (const entry of body.entry) {
      for (const change of entry.changes) {
        const { messages, contacts, metadata } = change.value as typeof change.value & { metadata: { phone_number_id: string } };
        if (!messages || messages.length === 0) continue;

        for (const message of messages) {
          const phone = message.from; // E.164 format without "+"
          const contactName =
            contacts?.find((c) => c.wa_id === phone)?.profile.name ?? phone;
          const text =
            message.type === "text" ? message.text?.body ?? "" : "";

          // Only create a lead on the FIRST message from a new contact
          const existingLead = await prisma.lead.findFirst({
            where: { phone, organizationId },
            select: { id: true },
          });

          if (!existingLead) {
            await prisma.lead.create({
              data: {
                name: contactName,
                phone,
                source: "WHATSAPP",
                status: "NEW",
                notes: text || null,
                organizationId,
              },
            });
          }

          // ─── Auto-reply ──────────────────────────────────────────────────
          // Check if the org has WhatsApp auto-reply enabled
          if (text) {
            const org = await prisma.organization.findUnique({
              where: { id: organizationId },
              select: { whatsappAutoReply: true, metaAccessToken: true, whatsappPhoneNumberId: true },
            });

            const autoReplyEnabled = org?.whatsappAutoReply ?? false;
            const accessToken =
              org?.metaAccessToken ?? process.env.META_ACCESS_TOKEN ?? "";
            const phoneNumberId =
              org?.whatsappPhoneNumberId ??
              metadata?.phone_number_id ??
              process.env.WHATSAPP_PHONE_NUMBER_ID ??
              "";

            if (autoReplyEnabled && accessToken && phoneNumberId) {
              // Fire-and-forget — don't block webhook response
              (async () => {
                try {
                  const reply = await generateAutoReply(text, contactName, organizationId);
                  await sendWhatsAppMessage(phoneNumberId, accessToken, phone, reply);
                } catch (err) {
                  console.error("[whatsapp-webhook] Auto-reply error:", err);
                }
              })();
            }
          }
        }
      }
    }
  } catch (error) {
    console.error("[whatsapp-webhook] Error processing webhook:", error);
  }

  // Always return 200 to avoid WhatsApp retries
  return NextResponse.json({ status: "ok" }, { status: 200 });
}
