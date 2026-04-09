#!/bin/bash
# ============================================================
# AGENTE DE VENTAS AI — Script de inicio de desarrollo
# Uso: ./start.sh [--reset-db]
# Los servicios corren en background (nohup). Terminal libre.
# Para detener: ./stop.sh
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ── Colores ──────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

info()    { echo -e "${CYAN}[INFO]${RESET}  $*"; }
success() { echo -e "${GREEN}[OK]${RESET}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${RESET}  $*"; }
error()   { echo -e "${RED}[ERROR]${RESET} $*" >&2; }
header()  { echo -e "\n${BOLD}${BLUE}$*${RESET}"; }

PID_DIR="$SCRIPT_DIR/.pids"
LOG_DIR="$SCRIPT_DIR/.logs"
mkdir -p "$PID_DIR" "$LOG_DIR"

# ── Flags ────────────────────────────────────────────────────
RESET_DB=false
for arg in "$@"; do
  case "$arg" in
    --reset-db) RESET_DB=true ;;
  esac
done

# ── Banner ───────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${BLUE}┌─────────────────────────────────────────────┐${RESET}"
echo -e "${BOLD}${BLUE}│     AGENTE DE VENTAS AI  —  v1.0.0          │${RESET}"
echo -e "${BOLD}${BLUE}└─────────────────────────────────────────────┘${RESET}"
echo ""

# ── Verificar dependencias ────────────────────────────────────
header "1/5  Verificando dependencias..."

check_cmd() {
  if ! command -v "$1" &>/dev/null; then
    error "'$1' no está instalado."; return 1
  fi
  success "$1 disponible"
}

check_cmd docker
if docker compose version &>/dev/null 2>&1; then
  DC="docker compose"
  success "docker compose (plugin) disponible"
elif command -v docker-compose &>/dev/null; then
  DC="docker-compose"
  success "docker-compose disponible"
else
  error "docker compose no encontrado"; exit 1
fi
check_cmd node
check_cmd python3

# ── Archivo .env ──────────────────────────────────────────────
header "2/5  Verificando configuración..."

if [ ! -f ".env" ]; then
  warn "No se encontró .env — creando desde .env.example..."
  cp .env.example .env
  echo ""
  error "IMPORTANTE: Edita .env y agrega tus API keys antes de continuar."
  echo "  Claves requeridas:"
  echo "    ANTHROPIC_API_KEY   — API de Claude"
  echo "    SECRET_KEY          — clave JWT (mínimo 32 chars)"
  echo ""
  echo "  Claves opcionales para canales adicionales:"
  echo "    TWILIO_*            — WhatsApp"
  echo "    INSTAGRAM_*         — Instagram DMs"
  echo "    STRIPE_*            — Billing"
  echo "    RESEND_API_KEY      — Emails"
  echo ""
  exit 1
fi

# Verificar clave mínima
ANTHROPIC_KEY=$(grep -E '^ANTHROPIC_API_KEY=' .env | cut -d= -f2)
if [[ -z "$ANTHROPIC_KEY" || "$ANTHROPIC_KEY" == *"AQUI-TU-KEY"* ]]; then
  error "ANTHROPIC_API_KEY no está configurada en .env"
  exit 1
fi
success ".env configurado"

# ── Infraestructura Docker ────────────────────────────────────
header "3/5  Iniciando infraestructura (PostgreSQL + Redis)..."

if $RESET_DB; then
  warn "Reiniciando base de datos..."
  $DC down -v --remove-orphans 2>/dev/null || true
fi

$DC up -d postgres redis

info "Esperando a que PostgreSQL esté listo..."
for i in $(seq 1 20); do
  if $DC exec -T postgres pg_isready -U postgres &>/dev/null 2>&1; then
    success "PostgreSQL listo (Docker)"
    break
  fi
  # Fallback: postgres local (Homebrew)
  PG_READY=$(find /usr/local/Cellar/postgresql* /opt/homebrew/Cellar/postgresql* -name pg_isready 2>/dev/null | head -1)
  if [ -n "$PG_READY" ] && "$PG_READY" -U postgres &>/dev/null 2>&1; then
    success "PostgreSQL local listo"
    break
  fi
  if [ "$i" -eq 20 ]; then
    error "PostgreSQL no respondió a tiempo"; exit 1
  fi
  sleep 2
done

# ── Backend ───────────────────────────────────────────────────
header "4/5  Iniciando Backend (FastAPI)..."

# Matar instancia previa si existe
if [ -f "$PID_DIR/backend.pid" ]; then
  kill "$(cat "$PID_DIR/backend.pid")" 2>/dev/null || true
  sleep 1
fi

cd "$SCRIPT_DIR/backend"
if [ ! -d "venv" ]; then
  info "Creando entorno virtual..."
  python3 -m venv venv
fi

source venv/bin/activate
pip install -r requirements.txt -q 2>&1 | grep -E "^(ERROR|WARNING)" || true

# Migraciones
if command -v alembic &>/dev/null; then
  info "Aplicando migraciones Alembic..."
  alembic upgrade head 2>&1 | tail -5 \
    && success "Migraciones aplicadas" \
    || warn "Migraciones fallaron (continuando...)"
fi

# ── NOHUP: desacopla completamente del terminal ──
nohup uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload \
  > "$LOG_DIR/backend.log" 2>&1 &
BACKEND_PID=$!
echo "$BACKEND_PID" > "$PID_DIR/backend.pid"
disown "$BACKEND_PID"

deactivate
cd "$SCRIPT_DIR"

info "Esperando backend en :8000..."
for i in $(seq 1 20); do
  if curl -sf http://localhost:8000/health &>/dev/null; then
    success "Backend listo en http://localhost:8000"
    break
  fi
  if [ "$i" -eq 20 ]; then
    error "Backend no respondió. Revisa: tail -f .logs/backend.log"; exit 1
  fi
  sleep 2
done

# ── Frontend ──────────────────────────────────────────────────
header "5/5  Iniciando Frontend (Next.js)..."

# Matar instancia previa si existe
if [ -f "$PID_DIR/frontend.pid" ]; then
  kill "$(cat "$PID_DIR/frontend.pid")" 2>/dev/null || true
  sleep 1
fi

cd "$SCRIPT_DIR/frontend"
if [ ! -f ".env.local" ]; then
  echo "NEXT_PUBLIC_API_URL=http://localhost:8000/api" > .env.local
  echo "NEXT_PUBLIC_WS_URL=ws://localhost:8000"       >> .env.local
fi

npm install -q 2>/dev/null || npm install

# ── NOHUP: desacopla completamente del terminal ──
nohup npm run dev > "$LOG_DIR/frontend.log" 2>&1 &
FRONTEND_PID=$!
echo "$FRONTEND_PID" > "$PID_DIR/frontend.pid"
disown "$FRONTEND_PID"

cd "$SCRIPT_DIR"

info "Esperando frontend en :3000..."
for i in $(seq 1 25); do
  if curl -sf http://localhost:3000 &>/dev/null; then
    success "Frontend listo en http://localhost:3000"
    break
  fi
  if [ "$i" -eq 25 ]; then
    warn "Frontend tardando más. Revisa: tail -f .logs/frontend.log"
    break
  fi
  sleep 2
done

# ── Resumen ───────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${GREEN}╔══════════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}${GREEN}║  Plataforma iniciada — procesos en background    ║${RESET}"
echo -e "${BOLD}${GREEN}╠══════════════════════════════════════════════════╣${RESET}"
echo -e "${BOLD}${GREEN}║  Frontend  →  http://localhost:3000              ║${RESET}"
echo -e "${BOLD}${GREEN}║  Backend   →  http://localhost:8000              ║${RESET}"
echo -e "${BOLD}${GREEN}║  API Docs  →  http://localhost:8000/docs         ║${RESET}"
echo -e "${BOLD}${GREEN}╠══════════════════════════════════════════════════╣${RESET}"
echo -e "${BOLD}${GREEN}║  Logs:  tail -f .logs/backend.log                ║${RESET}"
echo -e "${BOLD}${GREEN}║         tail -f .logs/frontend.log               ║${RESET}"
echo -e "${BOLD}${GREEN}║  Parar: ./stop.sh                                ║${RESET}"
echo -e "${BOLD}${GREEN}╚══════════════════════════════════════════════════╝${RESET}"
echo ""
