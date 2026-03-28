/**
 * WhatsApp Cloud API — message sending utility
 *
 * Docs: https://developers.facebook.com/docs/whatsapp/cloud-api/messages
 */

const GRAPH_API_VERSION = "v21.0";
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

/**
 * Send a plain-text WhatsApp message via Meta Cloud API.
 *
 * @param phoneNumberId - The WhatsApp Business phone number ID
 * @param accessToken   - Meta page / system-user access token
 * @param to            - Recipient phone in E.164 format without "+" (e.g. "521234567890")
 * @param text          - Message body (max 4096 chars)
 */
export async function sendWhatsAppMessage(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  text: string,
): Promise<void> {
  const url = `${GRAPH_API_BASE}/${phoneNumberId}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "text",
    text: { body: text.slice(0, 4096) },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`WhatsApp API error (${res.status}): ${body}`);
  }
}

/**
 * Send a plain-text Instagram / Messenger DM via Meta Graph API.
 *
 * @param pageId      - Facebook Page ID (owns the Instagram account)
 * @param accessToken - Page access token
 * @param senderId    - PSID or IGSID of the recipient
 * @param text        - Message body
 * @param platform    - "instagram" | "messenger"
 */
export async function sendMetaDM(
  pageId: string,
  accessToken: string,
  senderId: string,
  text: string,
  platform: "instagram" | "messenger" = "messenger",
): Promise<void> {
  // Messenger Platform Send API endpoint (same for both IG and Messenger)
  const url = `${GRAPH_API_BASE}/${pageId}/messages`;

  const payload = {
    recipient: { id: senderId },
    message: { text: text.slice(0, 2000) },
    messaging_type: "RESPONSE",
    ...(platform === "instagram" ? { platform: "instagram" } : {}),
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Meta DM API error (${res.status}): ${body}`);
  }
}
