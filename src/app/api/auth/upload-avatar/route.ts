import { NextRequest, NextResponse } from "next/server";
import { requireAuth, unauthorized } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

/**
 * POST /api/auth/upload-avatar
 * Sube una imagen de perfil para el usuario actual.
 * Acepta multipart/form-data con campo "file" (imagen).
 * La imagen se guarda en public/avatars/ y se actualiza User.image.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    if (!user) return unauthorized();

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No se proporcionó un archivo" },
        { status: 400 }
      );
    }

    // Validar tipo de archivo
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Solo se aceptan imágenes JPG, PNG o WebP" },
        { status: 400 }
      );
    }

    // Validar tamaño (máx 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "La imagen no debe superar los 5MB" },
        { status: 400 }
      );
    }

    // Crear directorio si no existe
    const uploadsDir = path.join(process.cwd(), "public", "avatars");
    await mkdir(uploadsDir, { recursive: true });

    // Generar nombre único
    const ext = file.name.split(".").pop() || "png";
    const filename = `user-${user.id}-${Date.now()}.${ext}`;
    const filePath = path.join(uploadsDir, filename);

    // Escribir archivo al disco
    const bytes = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(bytes));

    // URL pública
    const imageUrl = `/avatars/${filename}`;

    // Actualizar User.image en la base de datos
    await prisma.user.update({
      where: { id: user.id },
      data: { image: imageUrl },
    });

    return NextResponse.json({
      success: true,
      imageUrl,
      message: "Imagen de perfil actualizada",
    });
  } catch (error) {
    console.error("Error al subir avatar:", error);
    return NextResponse.json(
      { error: "Error al subir la imagen" },
      { status: 500 }
    );
  }
}
