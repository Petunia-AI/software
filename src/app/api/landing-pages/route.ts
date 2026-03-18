import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrganization, unauthorized } from "@/lib/auth-helpers";

// GET /api/landing-pages — list landing pages for the org
export async function GET() {
  try {
    const user = await requireOrganization();
    if (!user) return unauthorized();

    const pages = await prisma.landingPage.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(pages);
  } catch (error: any) {
    console.error("[LANDING-PAGES GET]", error);
    return NextResponse.json(
      { error: error.message || "Error al obtener landing pages" },
      { status: 500 }
    );
  }
}

// POST /api/landing-pages — create a new landing page
export async function POST(req: NextRequest) {
  try {
    const user = await requireOrganization();
    if (!user) return unauthorized();

    const body = await req.json();
    const { title, description, slug, template, nicho, html, status } = body;

    if (!title || !template) {
      return NextResponse.json(
        { error: "Título y template son requeridos" },
        { status: 400 }
      );
    }

    // Generate slug from title if not provided
    const pageSlug =
      slug ||
      title
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");

    // Check for duplicate slug
    const existing = await prisma.landingPage.findUnique({
      where: {
        organizationId_slug: {
          organizationId: user.organizationId,
          slug: pageSlug,
        },
      },
    });

    const finalSlug = existing ? `${pageSlug}-${Date.now()}` : pageSlug;

    const page = await prisma.landingPage.create({
      data: {
        organizationId: user.organizationId,
        createdById: user.id,
        title,
        description: description || null,
        slug: finalSlug,
        template,
        nicho: nicho || null,
        html: html || null,
        status: status || "DRAFT",
      },
    });

    return NextResponse.json(page, { status: 201 });
  } catch (error: any) {
    console.error("[LANDING-PAGES POST]", error);
    return NextResponse.json(
      { error: error.message || "Error al crear landing page" },
      { status: 500 }
    );
  }
}
