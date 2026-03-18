// ---------------------------------------------------------------------------
// Slack integration helpers
// ---------------------------------------------------------------------------

const SLACK_OAUTH_AUTHORIZE_URL = "https://slack.com/oauth/v2/authorize";
const SLACK_OAUTH_ACCESS_URL = "https://slack.com/api/oauth.v2.access";
const SLACK_API_BASE = "https://slack.com/api";

// Scopes requested for the bot token
// - chat:write: Send messages to channels
// - channels:read: List public channels so user can pick one
// - incoming-webhook: Post to a channel via webhook (backup)
const BOT_SCOPES = [
  "chat:write",
  "channels:read",
  "incoming-webhook",
].join(",");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SlackOAuthResponse {
  ok: boolean;
  access_token: string;
  token_type: "bot";
  scope: string;
  bot_user_id: string;
  app_id: string;
  team: { name: string; id: string };
  enterprise: { name: string; id: string } | null;
  authed_user: {
    id: string;
    scope?: string;
    access_token?: string;
    token_type?: string;
  };
  incoming_webhook?: {
    channel: string;
    channel_id: string;
    configuration_url: string;
    url: string;
  };
  error?: string;
}

export interface SlackChannel {
  id: string;
  name: string;
  is_member: boolean;
  is_private: boolean;
  num_members: number;
}

export interface SlackPostMessageResponse {
  ok: boolean;
  channel: string;
  ts: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// OAuth helpers
// ---------------------------------------------------------------------------

/**
 * Build the Slack OAuth authorization URL that the user should be redirected to.
 */
export function buildSlackAuthorizeUrl(state: string): string {
  const clientId = process.env.SLACK_CLIENT_ID;
  if (!clientId) throw new Error("SLACK_CLIENT_ID env variable is not set");

  const redirectUri = `${process.env.NEXTAUTH_URL}/api/integrations/slack/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    scope: BOT_SCOPES,
    redirect_uri: redirectUri,
    state,
  });

  return `${SLACK_OAUTH_AUTHORIZE_URL}?${params.toString()}`;
}

/**
 * Exchange a temporary authorization code for an access token.
 */
export async function exchangeCodeForToken(
  code: string,
): Promise<SlackOAuthResponse> {
  const clientId = process.env.SLACK_CLIENT_ID;
  const clientSecret = process.env.SLACK_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("SLACK_CLIENT_ID / SLACK_CLIENT_SECRET env variables not set");
  }

  const redirectUri = `${process.env.NEXTAUTH_URL}/api/integrations/slack/callback`;

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
  });

  const res = await fetch(SLACK_OAUTH_ACCESS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const data = (await res.json()) as SlackOAuthResponse;

  if (!data.ok) {
    throw new Error(`Slack OAuth error: ${data.error}`);
  }

  return data;
}

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

/**
 * List public channels the bot can see.
 */
export async function listChannels(
  botToken: string,
): Promise<SlackChannel[]> {
  const res = await fetch(`${SLACK_API_BASE}/conversations.list?types=public_channel&exclude_archived=true&limit=200`, {
    headers: { Authorization: `Bearer ${botToken}` },
  });
  const data = await res.json();
  if (!data.ok) throw new Error(`Slack API error: ${data.error}`);
  return (data.channels || []) as SlackChannel[];
}

/**
 * Send a message to a specific Slack channel.
 */
export async function sendMessage(
  botToken: string,
  channel: string,
  text: string,
  blocks?: unknown[],
): Promise<SlackPostMessageResponse> {
  const body: Record<string, unknown> = { channel, text };
  if (blocks) body.blocks = blocks;

  const res = await fetch(`${SLACK_API_BASE}/chat.postMessage`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${botToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = (await res.json()) as SlackPostMessageResponse;
  if (!data.ok) throw new Error(`Slack postMessage error: ${data.error}`);
  return data;
}

/**
 * Send a rich notification about a new lead.
 */
export async function notifyNewLead(
  botToken: string,
  channel: string,
  lead: {
    name: string;
    email?: string | null;
    phone?: string | null;
    source: string;
    propertyTitle?: string | null;
  },
): Promise<SlackPostMessageResponse> {
  const fields: string[] = [];
  if (lead.email) fields.push(`📧 ${lead.email}`);
  if (lead.phone) fields.push(`📞 ${lead.phone}`);
  if (lead.propertyTitle) fields.push(`🏠 ${lead.propertyTitle}`);

  const blocks = [
    {
      type: "header",
      text: { type: "plain_text", text: "🎉 Nuevo Lead en Petunia", emoji: true },
    },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*Nombre:*\n${lead.name}` },
        { type: "mrkdwn", text: `*Fuente:*\n${lead.source}` },
      ],
    },
    ...(fields.length > 0
      ? [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: fields.join("\n"),
            },
          },
        ]
      : []),
    { type: "divider" },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `Recibido el ${new Date().toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}`,
        },
      ],
    },
  ];

  return sendMessage(
    botToken,
    channel,
    `🎉 Nuevo lead: ${lead.name} (${lead.source})`,
    blocks,
  );
}

/**
 * Send a rich notification about a follow-up task.
 */
export async function notifyFollowUpDue(
  botToken: string,
  channel: string,
  task: {
    leadName: string;
    taskType: string;
    dueDate: string;
    assignedTo?: string | null;
  },
): Promise<SlackPostMessageResponse> {
  const blocks = [
    {
      type: "header",
      text: { type: "plain_text", text: "⏰ Seguimiento Pendiente", emoji: true },
    },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*Lead:*\n${task.leadName}` },
        { type: "mrkdwn", text: `*Tipo:*\n${task.taskType}` },
        { type: "mrkdwn", text: `*Vence:*\n${task.dueDate}` },
        ...(task.assignedTo
          ? [{ type: "mrkdwn", text: `*Asignado a:*\n${task.assignedTo}` }]
          : []),
      ],
    },
  ];

  return sendMessage(
    botToken,
    channel,
    `⏰ Seguimiento pendiente: ${task.leadName} — ${task.taskType}`,
    blocks,
  );
}

/**
 * Revoke an access token (used when disconnecting).
 */
export async function revokeToken(botToken: string): Promise<void> {
  await fetch(`${SLACK_API_BASE}/auth.revoke`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${botToken}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });
}
