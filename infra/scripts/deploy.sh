#!/usr/bin/env bash
# Deploy (or redeploy) an environment on the VPS.
# Usage: ./infra/scripts/deploy.sh <dev|prod>
#
# Expects to be run from the repo root on the server, with the matching
# .env.<env> file present (copied from infra/env/.env.<env>.template).
set -euo pipefail

ENV="${1:-}"
case "$ENV" in
  dev)  COMPOSE_FILE="docker-compose.dev.yml";  PROJECT="aletis-dev";  ENV_FILE=".env.dev"  ;;
  prod) COMPOSE_FILE="docker-compose.prod.yml"; PROJECT="aletis-prod"; ENV_FILE=".env.prod" ;;
  *) echo "Usage: $0 <dev|prod>"; exit 1 ;;
esac

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

[ -f "$ENV_FILE" ] || { echo "Missing $ENV_FILE — copy it from infra/env/.env.${ENV}.template and fill secrets."; exit 1; }

echo "==> Deploying [$ENV] ($PROJECT) from $(git rev-parse --short HEAD)"

# Build & start (the backend container runs `prisma migrate deploy` on boot)
docker compose -p "$PROJECT" -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --build

echo "==> Waiting for health..."
sleep 8
docker compose -p "$PROJECT" -f "$COMPOSE_FILE" ps

echo "==> Pruning dangling images"
docker image prune -f >/dev/null || true

echo "==> Done: $ENV deployed."
