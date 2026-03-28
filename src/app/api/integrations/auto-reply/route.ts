import { NextRequest, NextResponse } from "next/server";
import { requireOrganization, requireOrgAdmin, unauthorized, forbidden } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

// GET — fetch current auto-reply settings (any org member)
export async function GET() {
  const user = await requireOrganization();
  if (!user) return unauthorized();

  const org = await prisma.organization.findUnique({
    where: { id: user.organizationId },
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

// POST — update auto-reply settings (OWNER / ADMIN only)
export async function POST(req: NextRequest) {
  const user = await requireOrgAdmin();
  if (!user) return forbidden();

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
  if (typeof body.whatsappAutoReply === "boolean") updateData.whatsappAutoReply = body.whatsappAutoReply;
  if (typeof body.instagramAutoReply === "boolean") updateData.instagramAutoReply = body.instagramAutoReply;
  if (typeof body.messengerAutoReply === "boolean") updateData.messengerAutoReply = body.messengerAutoReply;

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });
  }

  await prisma.organization.update({
    where: { id: user.organizationId },
    data: updateData,
  });

  return NextResponse.json({ success: true, updated: updateData });
}
