#!/bin/bash
# ============================================================
# AGENTE DE VENTAS AI — Script de parada
# Uso: ./stop.sh
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_DIR="$SCRIPT_DIR/.pids"

GREEN='\033[0;32m'; CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'
info()    { echo -e "${CYAN}[INFO]${RESET}  $*"; }
success() { echo -e "${GREEN}[OK]${RESET}    $*"; }

echo ""
echo -e "${BOLD}Deteniendo Agente de Ventas AI...${RESET}"
echo ""

# Backend
if [ -f "$PID_DIR/backend.pid" ]; then
  PID=$(cat "$PID_DIR/backend.pid")
  if kill "$PID" 2>/dev/null; then
    success "Backend detenido (PID $PID)"
  fi
  rm -f "$PID_DIR/backend.pid"
fi

# Frontend (matar árbol de procesos de npm/node)
if [ -f "$PID_DIR/frontend.pid" ]; then
  PID=$(cat "$PID_DIR/frontend.pid")
  # Matar el proceso y sus hijos
  pkill -P "$PID" 2>/dev/null || true
  kill "$PID" 2>/dev/null || true
  success "Frontend detenido (PID $PID)"
  rm -f "$PID_DIR/frontend.pid"
fi

# Puertos residuales
for PORT in 8000 3000; do
  LPID=$(lsof -ti ":$PORT" 2>/dev/null)
  if [ -n "$LPID" ]; then
    kill $LPID 2>/dev/null || true
    info "Proceso en :$PORT terminado"
  fi
done

# Docker
DC=""
if docker compose version &>/dev/null 2>&1; then DC="docker compose"
elif command -v docker-compose &>/dev/null; then DC="docker-compose"; fi

if [ -n "$DC" ]; then
  info "Deteniendo contenedores Docker..."
  cd "$SCRIPT_DIR" && $DC stop postgres redis 2>/dev/null || true
  success "Contenedores detenidos"
fi

echo ""
success "Todos los servicios detenidos."
echo ""
