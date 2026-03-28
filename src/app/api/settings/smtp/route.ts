import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrganization, requireOrgAdmin, unauthorized, forbidden } from "@/lib/auth-helpers";
import { verifySmtpConfig } from "@/lib/email";

/** GET — returns current SMTP config (password masked) */
export async function GET() {
  try {
    const user = await requireOrganization();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const org = await prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: {
        smtpHost: true,
        smtpPort: true,
        smtpUser: true,
        smtpPass: true,
        smtpFrom: true,
        smtpFromName: true,
        smtpSecure: true,
        smtpVerified: true,
      },
    });

    if (!org) return NextResponse.json({ error: "Org no encontrada" }, { status: 404 });

    return NextResponse.json({
      smtpHost: org.smtpHost ?? "",
      smtpPort: org.smtpPort ?? 587,
      smtpUser: org.smtpUser ?? "",
      // Return hint of password, not plain text
      smtpPassConfigured: !!org.smtpPass,
      smtpFrom: org.smtpFrom ?? "",
      smtpFromName: org.smtpFromName ?? "",
      smtpSecure: org.smtpSecure,
      smtpVerified: org.smtpVerified,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/** POST — save SMTP config (OWNER / ADMIN only) */
export async function POST(req: Request) {
  try {
    const user = await requireOrgAdmin();
    if (!user) return forbidden();

    const body = await req.json();
    const {
      smtpHost,
      smtpPort,
      smtpUser,
      smtpPass,
      smtpFrom,
      smtpFromName,
      smtpSecure,
    } = body;

    // Fetch current to decide whether to keep existing password
    const current = await prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { smtpPass: true },
    });

    // If password is the placeholder "••••••••", keep the existing one
    const passwordToSave =
      smtpPass && smtpPass !== "••••••••" ? smtpPass : current?.smtpPass ?? null;

    await prisma.organization.update({
      where: { id: user.organizationId },
      data: {
        smtpHost: smtpHost || null,
        smtpPort: smtpPort ? Number(smtpPort) : null,
        smtpUser: smtpUser || null,
        smtpPass: passwordToSave,
        smtpFrom: smtpFrom || null,
        smtpFromName: smtpFromName || null,
        smtpSecure: smtpSecure ?? true,
        smtpVerified: false, // reset verification on save
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/** DELETE — remove SMTP config (OWNER / ADMIN only) */
export async function DELETE() {
  try {
    const user = await requireOrgAdmin();
    if (!user) return forbidden();

    await prisma.organization.update({
      where: { id: user.organizationId },
      data: {
        smtpHost: null,
        smtpPort: null,
        smtpUser: null,
        smtpPass: null,
        smtpFrom: null,
        smtpFromName: null,
        smtpSecure: true,
        smtpVerified: false,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
