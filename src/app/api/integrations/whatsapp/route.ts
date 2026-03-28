import { NextRequest, NextResponse } from "next/server";
import { requireOrganization, requireOrgAdmin, unauthorized, forbidden } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

// GET — fetch current WhatsApp configuration (any org member)
export async function GET() {
  const user = await requireOrganization();
  if (!user) return unauthorized();

  const org = await prisma.organization.findUnique({
    where: { id: user.organizationId },
    select: { whatsappPhoneNumberId: true },
  });

  return NextResponse.json({
    phoneNumberId: org?.whatsappPhoneNumberId ?? null,
    connected: !!org?.whatsappPhoneNumberId,
  });
}

// POST — save WhatsApp Phone Number ID (OWNER / ADMIN only)
export async function POST(req: NextRequest) {
  const user = await requireOrgAdmin();
  if (!user) return forbidden();

  let body: { phoneNumberId: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { phoneNumberId } = body;
  if (!phoneNumberId?.trim()) {
    return NextResponse.json({ error: "Phone Number ID requerido" }, { status: 400 });
  }

  await prisma.organization.update({
    where: { id: user.organizationId },
    data: { whatsappPhoneNumberId: phoneNumberId.trim() },
  });

  return NextResponse.json({ success: true });
}

// DELETE — remove WhatsApp configuration (OWNER / ADMIN only)
export async function DELETE() {
  const user = await requireOrgAdmin();
  if (!user) return forbidden();

  await prisma.organization.update({
    where: { id: user.organizationId },
    data: { whatsappPhoneNumberId: null, whatsappAutoReply: false },
  });

  return NextResponse.json({ success: true });
}
