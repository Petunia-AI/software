import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrganization, requireOrgAdmin, unauthorized, forbidden } from "@/lib/auth-helpers";

/**
 * GET /api/integrations/fub/credentials
 * Return current Follow Up Boss configuration status
 */
export async function GET() {
  const user = await requireOrganization();
  if (!user) return unauthorized();

  const org = await prisma.organization.findUnique({
    where: { id: user.organizationId },
    select: {
      fubApiKey: true,
      fubLastSyncAt: true,
      fubLeadsSynced: true,
    },
  });

  return NextResponse.json({
    configured: !!org?.fubApiKey,
    apiKeyHint: org?.fubApiKey ? `${org.fubApiKey.slice(0, 8)}...${org.fubApiKey.slice(-4)}` : null,
    lastSyncAt: org?.fubLastSyncAt,
    leadsSynced: org?.fubLeadsSynced ?? 0,
  });
}

/**
 * POST /api/integrations/fub/credentials
 * Save (or clear) Follow Up Boss API key
 */
export async function POST(req: NextRequest) {
  const user = await requireOrgAdmin();
  if (!user) return forbidden();

  const body = await req.json();
  const { apiKey } = body;

  if (!apiKey || typeof apiKey !== "string" || apiKey.trim().length < 10) {
    return NextResponse.json(
      { error: "API Key inválida. Debe tener al menos 10 caracteres." },
      { status: 400 },
    );
  }

  await prisma.organization.update({
    where: { id: user.organizationId },
    data: { fubApiKey: apiKey.trim() },
  });

  return NextResponse.json({ success: true });
}

/**
 * DELETE /api/integrations/fub/credentials
 * Disconnect Follow Up Boss
 */
export async function DELETE() {
  const user = await requireOrgAdmin();
  if (!user) return forbidden();

  await prisma.organization.update({
    where: { id: user.organizationId },
    data: {
      fubApiKey: null,
      fubLastSyncAt: null,
      fubLeadsSynced: 0,
    },
  });

  return NextResponse.json({ success: true });
}
