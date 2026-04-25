"""
Storage Service — Abstracción para guardar archivos de media.

Modos:
  • Local (default): guarda en uploads/media/{business_id}/{filename}
    Servido por FastAPI StaticFiles en /uploads/media/...
  • Cloudflare R2 / S3: activado automáticamente si R2_BUCKET_NAME está en .env
    Requiere: R2_BUCKET_NAME, R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY
    Opcional: R2_PUBLIC_URL (CDN custom domain)
"""
import os
import uuid
import asyncio
import structlog
from app.config import settings

logger = structlog.get_logger()

MEDIA_DIR = "uploads/media"

# ── Helpers sync (se ejecutan en thread pool) ─────────────────────────────

def _write_local(full_path: str, data: bytes) -> None:
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "wb") as f:
        f.write(data)


def _delete_local(full_path: str) -> None:
    if os.path.exists(full_path):
        os.remove(full_path)


# ── S3 / R2 helpers ───────────────────────────────────────────────────────

def _get_s3_client():
    """Devuelve un cliente boto3 para R2 o S3. None si no está configurado."""
    try:
        import boto3  # type: ignore
        if settings.r2_bucket_name and settings.r2_access_key_id and settings.r2_secret_access_key:
            endpoint = f"https://{settings.r2_account_id}.r2.cloudflarestorage.com"
            return boto3.client(
                "s3",
                endpoint_url=endpoint,
                aws_access_key_id=settings.r2_access_key_id,
                aws_secret_access_key=settings.r2_secret_access_key,
                region_name="auto",
            )
    except ImportError:
        logger.warning("storage_boto3_not_installed", hint="pip install boto3")
    return None


def _upload_to_s3(client, key: str, data: bytes, mime_type: str) -> None:
    client.put_object(
        Bucket=settings.r2_bucket_name,
        Key=key,
        Body=data,
        ContentType=mime_type,
    )


def _delete_from_s3(client, key: str) -> None:
    client.delete_object(Bucket=settings.r2_bucket_name, Key=key)


# ── Public API ────────────────────────────────────────────────────────────

async def save_media(
    business_id: str,
    original_filename: str,
    file_bytes: bytes,
    mime_type: str,
) -> tuple[str, str]:
    """
    Guarda el archivo y devuelve (storage_path, public_url).
    storage_path es un key relativo (para recuperar/eliminar después).
    """
    ext = ""
    if "." in original_filename:
        ext = "." + original_filename.rsplit(".", 1)[-1].lower()[:8]
    stored_filename = f"{uuid.uuid4().hex}{ext}"
    key = f"{business_id}/{stored_filename}"

    s3 = _get_s3_client()
    if s3:
        # ── R2 / S3 mode ──
        await asyncio.to_thread(_upload_to_s3, s3, key, file_bytes, mime_type)
        if settings.r2_public_url:
            public_url = f"{settings.r2_public_url.rstrip('/')}/{key}"
        else:
            public_url = f"https://{settings.r2_bucket_name}.{settings.r2_account_id}.r2.cloudflarestorage.com/{key}"
        logger.info("storage_uploaded_r2", key=key, bytes=len(file_bytes))
    else:
        # ── Local mode ──
        full_path = os.path.join(MEDIA_DIR, key)
        await asyncio.to_thread(_write_local, full_path, file_bytes)
        public_url = f"{settings.backend_url}/uploads/media/{key}"
        logger.info("storage_uploaded_local", path=full_path, bytes=len(file_bytes))

    return key, public_url


async def delete_media(storage_path: str) -> None:
    """Elimina un archivo por su storage_path / key."""
    s3 = _get_s3_client()
    if s3:
        await asyncio.to_thread(_delete_from_s3, s3, storage_path)
        logger.info("storage_deleted_r2", key=storage_path)
    else:
        full_path = os.path.join(MEDIA_DIR, storage_path)
        await asyncio.to_thread(_delete_local, full_path)
        logger.info("storage_deleted_local", path=full_path)
