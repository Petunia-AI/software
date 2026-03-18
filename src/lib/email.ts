import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export interface SendEmailOptions {
  to: string | string[];
  from?: string;
  fromName?: string;
  replyTo?: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Sends a single email via Resend.
 * Falls back gracefully if RESEND_API_KEY is not set (dev mode).
 */
export async function sendEmail(opts: SendEmailOptions): Promise<{ id?: string; error?: string }> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY not set — skipping send");
    return { id: "dev-skipped" };
  }

  const fromEmail = opts.from ?? process.env.RESEND_FROM_EMAIL ?? "petunia@resend.dev";
  const fromName = opts.fromName ?? process.env.RESEND_FROM_NAME ?? "Petunia";
  const from = `${fromName} <${fromEmail}>`;

  try {
    const { data, error } = await resend.emails.send({
      from,
      to: Array.isArray(opts.to) ? opts.to : [opts.to],
      replyTo: opts.replyTo,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    });

    if (error) return { error: error.message };
    return { id: data?.id };
  } catch (err: any) {
    return { error: err.message ?? "Email send failed" };
  }
}

/**
 * Builds a simple branded HTML email body.
 */
export function buildEmailHtml({
  preheader,
  body,
  orgName,
  brandColor = "#7c3aed",
}: {
  preheader?: string;
  body: string;
  orgName: string;
  brandColor?: string;
}): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${orgName}</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;">${preheader}</div>` : ""}
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:${brandColor};padding:24px 32px;">
              <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;">${orgName}</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;color:#1a1a1a;font-size:15px;line-height:1.7;">
              ${body}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;background:#f9f9f9;border-top:1px solid #eeeeee;text-align:center;">
              <p style="margin:0;font-size:12px;color:#999999;">
                Este email fue enviado por ${orgName} · Powered by Petunia AI
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
