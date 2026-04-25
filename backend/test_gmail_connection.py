"""
Test de conexión Gmail OAuth2
Ejecutar desde backend/: python test_gmail_connection.py
"""
import asyncio
import os
import sys
import urllib.parse

# Cargar .env del backend y raíz del proyecto
from pathlib import Path
for env_file in [
    Path(__file__).parent.parent / ".env",   # raíz del proyecto
    Path(__file__).parent / ".env",           # backend/
]:
    if env_file.exists():
        for line in env_file.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, _, val = line.partition("=")
                os.environ.setdefault(key.strip(), val.strip())

import httpx


GOOGLE_CLIENT_ID     = os.environ.get("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET", "")
BACKEND_URL          = os.environ.get("BACKEND_URL", "http://localhost:8000")

GMAIL_SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.modify",
    "openid", "email", "profile",
]

def check(label: str, ok: bool, detail: str = ""):
    icon = "✅" if ok else "❌"
    print(f"  {icon}  {label}" + (f": {detail}" if detail else ""))
    return ok


async def run_tests():
    all_ok = True

    print("\n══════════════════════════════════════════")
    print("  Test de conexión Gmail OAuth2 — Petunia")
    print("══════════════════════════════════════════\n")

    # ── 1. Variables de entorno ───────────────────────────────────────────────
    print("1. Variables de entorno")
    ok1 = check("GOOGLE_CLIENT_ID cargado", bool(GOOGLE_CLIENT_ID), GOOGLE_CLIENT_ID[:30] + "…" if GOOGLE_CLIENT_ID else "VACÍO")
    ok2 = check("GOOGLE_CLIENT_SECRET cargado", bool(GOOGLE_CLIENT_SECRET), GOOGLE_CLIENT_SECRET[:10] + "…" if GOOGLE_CLIENT_SECRET else "VACÍO")
    ok3 = check("BACKEND_URL configurado", bool(BACKEND_URL), BACKEND_URL)
    all_ok = all_ok and ok1 and ok2 and ok3

    # ── 2. URL OAuth2 bien formada ────────────────────────────────────────────
    print("\n2. Generación de URL OAuth2")
    redirect_uri = f"{BACKEND_URL}/api/email/oauth/gmail/callback"
    auth_url = "https://accounts.google.com/o/oauth2/v2/auth?" + urllib.parse.urlencode({
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": " ".join(GMAIL_SCOPES),
        "access_type": "offline",
        "prompt": "consent",
        "state": "test_state_123",
    })
    parsed = urllib.parse.urlparse(auth_url)
    params = dict(urllib.parse.parse_qsl(parsed.query))
    ok4 = check("URL tiene client_id correcto", params.get("client_id") == GOOGLE_CLIENT_ID)
    ok5 = check("redirect_uri incluye /api/email/oauth/gmail/callback", "/api/email/oauth/gmail/callback" in params.get("redirect_uri", ""))
    ok6 = check("scope incluye gmail.send", "gmail.send" in params.get("scope", ""))
    ok7 = check("access_type=offline (refresh_token)", params.get("access_type") == "offline")
    all_ok = all_ok and ok4 and ok5 and ok6 and ok7
    if ok4 and ok5:
        print(f"\n     URL generada:\n     {auth_url[:120]}…\n")

    # ── 3. Conectividad a Google OAuth2 ──────────────────────────────────────
    print("3. Conectividad con Google APIs")
    async with httpx.AsyncClient(timeout=10) as c:
        # Verificar que el discovery endpoint responde
        try:
            r = await c.get("https://accounts.google.com/.well-known/openid-configuration")
            ok8 = check("Acceso a accounts.google.com", r.status_code == 200, f"HTTP {r.status_code}")
            all_ok = all_ok and ok8
        except Exception as e:
            check("Acceso a accounts.google.com", False, str(e))
            all_ok = False

        # Verificar que el client_id es reconocido por Google
        # Enviamos un token exchange intencionalmente inválido.
        # Si el client_id NO existe → error "invalid_client"
        # Si el client_id SÍ existe pero el code es inválido → error "invalid_grant"
        try:
            r = await c.post("https://oauth2.googleapis.com/token", data={
                "code": "test_code_invalid",
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code",
            })
            body = r.json()
            error = body.get("error", "")
            if error == "invalid_grant":
                ok9 = check(
                    "client_id y client_secret reconocidos por Google",
                    True,
                    "Google respondió 'invalid_grant' (code de prueba inválido, credenciales OK)"
                )
            elif error == "invalid_client":
                ok9 = check(
                    "client_id y client_secret reconocidos por Google",
                    False,
                    "ERROR: Google respondió 'invalid_client' — verifica las credenciales"
                )
                all_ok = False
            else:
                ok9 = check(
                    "Respuesta de Google token endpoint",
                    False,
                    f"Error inesperado: {body}"
                )
                all_ok = False
        except Exception as e:
            check("Google token endpoint", False, str(e))
            all_ok = False

        # Verificar el redirect_uri está registrado (llamando al auth endpoint con HEAD)
        try:
            r = await c.get(auth_url, follow_redirects=False)
            ok10 = check(
                "Google auth URL accesible",
                r.status_code in (200, 301, 302),
                f"HTTP {r.status_code}"
            )
            all_ok = all_ok and ok10
        except Exception as e:
            check("Google auth URL accesible", False, str(e))

    # ── Resultado final ───────────────────────────────────────────────────────
    print("\n══════════════════════════════════════════")
    if all_ok:
        print("  ✅  TODOS LOS TESTS PASARON — Gmail OAuth2 listo")
    else:
        print("  ❌  ALGUNOS TESTS FALLARON — revisa los errores arriba")
    print("══════════════════════════════════════════\n")

    if all_ok:
        print("  Próximo paso:")
        print(f"  Abre esta URL en el navegador para autorizar tu cuenta Gmail:\n")
        print(f"  {auth_url}\n")

    return all_ok


if __name__ == "__main__":
    ok = asyncio.run(run_tests())
    sys.exit(0 if ok else 1)
