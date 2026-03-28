import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET — fetch current WhatsApp configuration
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const organizationId = (session.user as any).organizationId as string | null;
  if (!organizationId) {
    return NextResponse.json({ error: "Sin organización" }, { status: 400 });
  }

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      whatsappPhoneNumberId: true,
    },
  });

  return NextResponse.json({
    phoneNumberId: org?.whatsappPhoneNumberId ?? null,
    connected: !!org?.whatsappPhoneNumberId,
  });
}

// POST — save WhatsApp Phone Number ID
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const organizationId = (session.user as any).organizationId as string | null;
  if (!organizationId) {
    return NextResponse.json({ error: "Sin organización" }, { status: 400 });
  }

  let body: { phoneNumberId: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { phoneNumberId } = body;
  if (!phoneNumberId?.trim()) {
    return NextResponse.json({ error: "Phone Number ID requerido" }, { status: 400 });
  }

  await prisma.organization.update({
    where: { id: organizationId },
    data: { whatsappPhoneNumberId: phoneNumberId.trim() },
  });

  return NextResponse.json({ success: true });
}

// DELETE — remove WhatsApp configuration
export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const organizationId = (session.user as any).organizationId as string | null;
  if (!organizationId) {
    return NextResponse.json({ error: "Sin organización" }, { status: 400 });
  }

  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      whatsappPhoneNumberId: null,
      whatsappAutoReply: false,
    },
  });

  return NextResponse.json({ success: true });
}
