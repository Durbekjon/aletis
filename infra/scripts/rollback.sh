#!/usr/bin/env bash
# Roll an environment back to the previous git commit and redeploy.
# Usage: ./infra/scripts/rollback.sh <dev|prod> [commit-ish]
# With no commit-ish, rolls back to the previous commit (HEAD~1).
set -euo pipefail

ENV="${1:-}"
TARGET="${2:-HEAD~1}"
case "$ENV" in
  dev|prod) ;;
  *) echo "Usage: $0 <dev|prod> [commit-ish]"; exit 1 ;;
esac

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

CURRENT="$(git rev-parse --short HEAD)"
echo "==> Rolling [$ENV] back from $CURRENT to $TARGET"
git checkout "$TARGET"

"$ROOT/infra/scripts/deploy.sh" "$ENV"

echo "==> Rolled back to $(git rev-parse --short HEAD). Previous was $CURRENT."
echo "    To return to latest:  git checkout <branch> && ./infra/scripts/deploy.sh $ENV"
