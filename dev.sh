#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
#  dev.sh  —  backend + frontend + ngrok (http 4000) barchasini
#             bitta terminilda ishga tushiradi.
#
#  Ishlatish:  ./dev.sh
#  To'xtatish: Ctrl+C  (barcha jarayonlar birga to'xtaydi)
# ─────────────────────────────────────────────────────────────

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"

# ── Rangli chiqish ─────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

log()  { echo -e "${BOLD}[dev.sh]${RESET} $*"; }
ok()   { echo -e "${GREEN}[✓]${RESET} $*"; }
warn() { echo -e "${YELLOW}[!]${RESET} $*"; }
err()  { echo -e "${RED}[✗]${RESET} $*"; }

# ── Cleanup: Ctrl+C bosishda hamma child jarayonni o'ldiradi ──
PIDS=()
cleanup() {
  echo ""
  log "Stopping all processes..."
  for pid in "${PIDS[@]}"; do
    kill "$pid" 2>/dev/null || true
  done
  wait 2>/dev/null
  ok "All processes stopped. Bye! 👋"
  exit 0
}
trap cleanup SIGINT SIGTERM

# ── Dependency tekshiruvi ──────────────────────────────────────
check_cmd() {
  if ! command -v "$1" &>/dev/null; then
    err "'$1' topilmadi. O'rnatib qayta ishga tushiring."
    exit 1
  fi
}

check_cmd node
check_cmd npm
check_cmd ngrok
check_cmd docker

# ── Docker daemon tekshiruvi ───────────────────────────────────
if ! docker info > /dev/null 2>&1; then
  warn "Docker daemon ishlamayapti."
  warn "Docker Desktop ni ishga tushiring va qayta urinib ko'ring."
  warn "Maslahat: 'open -a Docker' buyrug'ini ishga tushiring."
  open -a Docker 2>/dev/null || true
  log "Docker tayyor bo'lishini kutmoqda (max 60s)..."
  for i in $(seq 1 30); do
    sleep 2
    if docker info > /dev/null 2>&1; then
      ok "Docker tayyor!"
      break
    fi
    if [ $i -eq 30 ]; then
      err "Docker 60s ichida tayyor bo'lmadi. Manually ishga tushiring."
      exit 1
    fi
  done
fi

# ── Log fayllari ──────────────────────────────────────────────
LOG_DIR="$SCRIPT_DIR/.dev-logs"
mkdir -p "$LOG_DIR"
BACKEND_LOG="$LOG_DIR/backend.log"
FRONTEND_LOG="$LOG_DIR/frontend.log"
NGROK_LOG="$LOG_DIR/ngrok.log"

# ─────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${CYAN}╔══════════════════════════════════════╗${RESET}"
echo -e "${BOLD}${CYAN}║        Aletis Dev Environment        ║${RESET}"
echo -e "${BOLD}${CYAN}╚══════════════════════════════════════╝${RESET}"
echo ""

# ── 1. Weaviate + multi2vec-clip (Docker) ──────────────────────
log "Starting ${CYAN}Weaviate${RESET} + multi2vec-clip (Docker)..."
cd "$SCRIPT_DIR"
docker compose -f docker-compose.dev.yml up -d weaviate multi2vec-clip > "$LOG_DIR/weaviate.log" 2>&1
ok "Weaviate containers started  |  logs: ${YELLOW}.dev-logs/weaviate.log${RESET}"

log "Waiting for Weaviate to be ready on port 8080..."
WEAVIATE_ATTEMPTS=0
MAX_WEAVIATE=60
until curl -sf http://localhost:8080/v1/.well-known/ready > /dev/null 2>&1; do
  sleep 2
  WEAVIATE_ATTEMPTS=$((WEAVIATE_ATTEMPTS + 1))
  if [ $WEAVIATE_ATTEMPTS -ge $MAX_WEAVIATE ]; then
    warn "Weaviate 120s ichida tayyor bo'lmadi (CLIP model yuklanmoqda bo'lishi mumkin). Backend shunga qaramay ishga tushiriladi."
    break
  fi
done
ok "Weaviate ready ✓  →  http://localhost:8080"

# ── 2. Backend ─────────────────────────────────────────────────
log "Starting ${CYAN}Backend${RESET} (NestJS → port 4000)..."
cd "$BACKEND_DIR"
npm run dev > "$BACKEND_LOG" 2>&1 &
BACKEND_PID=$!
PIDS+=("$BACKEND_PID")
ok "Backend PID: $BACKEND_PID  |  logs: ${YELLOW}.dev-logs/backend.log${RESET}"

# ── 2. Frontend ────────────────────────────────────────────────
log "Starting ${CYAN}Frontend${RESET} (Next.js dev)..."
cd "$FRONTEND_DIR"
npm run dev > "$FRONTEND_LOG" 2>&1 &
FRONTEND_PID=$!
PIDS+=("$FRONTEND_PID")
ok "Frontend PID: $FRONTEND_PID  |  logs: ${YELLOW}.dev-logs/frontend.log${RESET}"

# ── 3. Backend tayyor bo'lishini kutish ────────────────────────
log "Waiting for backend to be ready on port 4000..."
ATTEMPTS=0
MAX_ATTEMPTS=30
until curl -s http://localhost:4000 > /dev/null 2>&1 || \
      curl -s http://localhost:4000/health > /dev/null 2>&1 || \
      lsof -iTCP:4000 -sTCP:LISTEN -t > /dev/null 2>&1; do
  sleep 1
  ATTEMPTS=$((ATTEMPTS + 1))
  if [ $ATTEMPTS -ge $MAX_ATTEMPTS ]; then
    warn "Backend 30s ichida respond bermadi, ngrok baribir ishga tushiriladi..."
    break
  fi
done
ok "Backend ready ✓"

# ── 4. ngrok ───────────────────────────────────────────────────
log "Starting ${CYAN}ngrok${RESET} → http://localhost:4000..."
ngrok http 4000 --log=stdout > "$NGROK_LOG" 2>&1 &
NGROK_PID=$!
PIDS+=("$NGROK_PID")
ok "ngrok PID: $NGROK_PID  |  logs: ${YELLOW}.dev-logs/ngrok.log${RESET}"

# ngrok URL ni chiqarish (2s kutib)
sleep 2
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null \
  | grep -o '"public_url":"[^"]*"' \
  | grep https \
  | head -1 \
  | sed 's/"public_url":"//;s/"//')

echo ""
echo -e "${BOLD}${GREEN}╔══════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}${GREEN}║           🚀 All services running!       ║${RESET}"
echo -e "${BOLD}${GREEN}╠══════════════════════════════════════════╣${RESET}"
echo -e "${BOLD}${GREEN}║${RESET}  Backend   → ${CYAN}http://localhost:4000${RESET}       ${BOLD}${GREEN}║${RESET}"
echo -e "${BOLD}${GREEN}║${RESET}  Frontend  → ${CYAN}http://localhost:3000${RESET}       ${BOLD}${GREEN}║${RESET}"
if [ -n "$NGROK_URL" ]; then
echo -e "${BOLD}${GREEN}║${RESET}  ngrok     → ${YELLOW}${NGROK_URL}${RESET}"
fi
echo -e "${BOLD}${GREEN}║${RESET}  ngrok UI  → ${CYAN}http://localhost:4040${RESET}       ${BOLD}${GREEN}║${RESET}"
echo -e "${BOLD}${GREEN}╠══════════════════════════════════════════╣${RESET}"
echo -e "${BOLD}${GREEN}║${RESET}  Logs: ${YELLOW}.dev-logs/${RESET} papkasida              ${BOLD}${GREEN}║${RESET}"
echo -e "${BOLD}${GREEN}║${RESET}  Stop: ${RED}Ctrl+C${RESET}                             ${BOLD}${GREEN}║${RESET}"
echo -e "${BOLD}${GREEN}╚══════════════════════════════════════════╝${RESET}"
echo ""

# ── Hamma jarayonni kutish (Ctrl+C kelguncha) ──────────────────
wait
