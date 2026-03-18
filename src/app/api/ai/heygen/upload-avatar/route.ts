import { NextRequest, NextResponse } from "next/server";
import { requireOrganization, unauthorized } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

/**
 * POST /api/ai/heygen/upload-avatar
 * Upload a custom avatar image.
 * Accepts multipart/form-data with "file" (image) and "name" (string).
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireOrganization();
    if (!user) return unauthorized();

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const name = (formData.get("name") as string) || "Mi Avatar";

    if (!file) {
      return NextResponse.json(
        { error: "No se proporcionó un archivo" },
        { status: 400 }
      );
    }

    // Validate file type
    const validTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/jpg",
    ];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Solo se aceptan imágenes JPG, PNG o WebP" },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "La imagen no debe superar los 10MB" },
        { status: 400 }
      );
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), "public", "avatars");
    await mkdir(uploadsDir, { recursive: true });

    // Generate unique filename
    const ext = file.name.split(".").pop() || "png";
    const filename = `${user.organizationId}-${Date.now()}.${ext}`;
    const filePath = path.join(uploadsDir, filename);

    // Write file to disk
    const bytes = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(bytes));

    // Public URL path
    const previewImageUrl = `/avatars/${filename}`;

    // Save to database as READY (no HeyGen generation needed)
    const avatar = await prisma.heyGenAvatar.create({
      data: {
        organizationId: user.organizationId,
        createdById: user.id,
        name,
        status: "READY",
        previewImageUrl,
        // Mark as uploaded custom avatar in metadata
        metadata: { source: "upload", originalName: file.name },
      },
    });

    return NextResponse.json({
      success: true,
      avatar: {
        id: avatar.id,
        name: avatar.name,
        status: avatar.status,
        previewImageUrl: avatar.previewImageUrl,
      },
    });
  } catch (error: any) {
    console.error("Upload avatar error:", error);
    return NextResponse.json(
      { error: error?.message || "Error al subir el avatar" },
      { status: 500 }
    );
  }
}
