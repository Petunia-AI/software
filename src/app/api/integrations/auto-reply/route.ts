import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET — fetch current auto-reply settings
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
      whatsappAutoReply: true,
      instagramAutoReply: true,
      messengerAutoReply: true,
    },
  });

  return NextResponse.json({
    whatsappAutoReply: org?.whatsappAutoReply ?? false,
    instagramAutoReply: org?.instagramAutoReply ?? false,
    messengerAutoReply: org?.messengerAutoReply ?? false,
  });
}

// POST — update auto-reply settings
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const organizationId = (session.user as any).organizationId as string | null;
  if (!organizationId) {
    return NextResponse.json({ error: "Sin organización" }, { status: 400 });
  }

  let body: {
    whatsappAutoReply?: boolean;
    instagramAutoReply?: boolean;
    messengerAutoReply?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const updateData: Record<string, boolean> = {};
  if (typeof body.whatsappAutoReply === "boolean") {
    updateData.whatsappAutoReply = body.whatsappAutoReply;
  }
  if (typeof body.instagramAutoReply === "boolean") {
    updateData.instagramAutoReply = body.instagramAutoReply;
  }
  if (typeof body.messengerAutoReply === "boolean") {
    updateData.messengerAutoReply = body.messengerAutoReply;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });
  }

  await prisma.organization.update({
    where: { id: organizationId },
    data: updateData,
  });

  return NextResponse.json({ success: true, updated: updateData });
}
