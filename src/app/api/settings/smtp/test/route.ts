import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrganization } from "@/lib/auth-helpers";
import { verifySmtpConfig, sendEmail, buildEmailHtml } from "@/lib/email";

/** POST — verify SMTP connection OR send a test email */
export async function POST(req: Request) {
  try {
    const user = await requireOrganization();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const body = await req.json();
    const { action } = body; // "verify" | "test"

    const org = await prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: {
        name: true,
        brandColor: true,
        smtpHost: true,
        smtpPort: true,
        smtpUser: true,
        smtpPass: true,
        smtpFrom: true,
        smtpFromName: true,
        smtpSecure: true,
      },
    });

    if (!org) return NextResponse.json({ error: "Org no encontrada" }, { status: 404 });

    if (!org.smtpHost || !org.smtpUser || !org.smtpPass) {
      return NextResponse.json({ error: "SMTP no configurado" }, { status: 400 });
    }

    const smtpConfig = {
      smtpHost: org.smtpHost,
      smtpPort: org.smtpPort ?? 587,
      smtpUser: org.smtpUser,
      smtpPass: org.smtpPass,
      smtpFrom: org.smtpFrom ?? org.smtpUser,
      smtpFromName: org.smtpFromName,
      smtpSecure: org.smtpSecure,
    };

    if (action === "verify") {
      const result = await verifySmtpConfig(smtpConfig);

      if (result.ok) {
        // Mark as verified in DB
        await prisma.organization.update({
          where: { id: user.organizationId },
          data: { smtpVerified: true },
        });
      }

      return NextResponse.json(result);
    }

    if (action === "test") {
      // Send test email to the logged-in user
      const toEmail = user.email;
      if (!toEmail) return NextResponse.json({ error: "No se pudo obtener email del usuario" }, { status: 400 });

      const html = buildEmailHtml({
        preheader: "Prueba de configuración SMTP",
        body: `
          <p>¡Hola! Este es un correo de prueba enviado desde <strong>${org.name}</strong>.</p>
          <p>Si recibes este mensaje, tu configuración SMTP está funcionando correctamente. Los correos del sistema (Email Drip, notificaciones) serán enviados desde tu dominio.</p>
          <p style="color:#888;font-size:13px;">Enviado desde Petunia AI</p>
        `,
        orgName: org.name,
        brandColor: org.brandColor ?? "#7c3aed",
      });

      const result = await sendEmail(
        {
          to: toEmail,
          subject: `✅ Prueba SMTP — ${org.name}`,
          html,
        },
        smtpConfig
      );

      if (result.error) {
        return NextResponse.json({ ok: false, error: result.error });
      }

      return NextResponse.json({ ok: true, messageId: result.id });
    }

    return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
