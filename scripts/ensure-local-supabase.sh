#!/usr/bin/env bash
# Ensures local Supabase is up (optional auto-start) and syncs keys into apps/*/.env.local.
# Runs automatically via `pnpm dev` (predev). Skip in CI with SKIP_SUPABASE_SYNC=1.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DB_PKG="$ROOT/packages/database"

if [ "${SKIP_SUPABASE_SYNC:-}" = "1" ]; then
  exit 0
fi

if [ ! -d "$DB_PKG/supabase" ]; then
  echo "Warning: packages/database/supabase not found — skipping Supabase env sync."
  exit 0
fi

is_supabase_running() {
  cd "$DB_PKG"
  pnpm exec supabase status -o env >/dev/null 2>&1
}

if is_supabase_running; then
  echo "Local Supabase is running — syncing env (pnpm db:sync-env)..."
  bash "$ROOT/scripts/sync-local-supabase-env.sh"
  exit 0
fi

echo "Local Supabase is not running."

if [ "${SKIP_SUPABASE_START:-}" = "1" ]; then
  echo "Hint: start Docker Supabase with: pnpm db:local"
  echo "      (unset SKIP_SUPABASE_START to auto-start on pnpm dev)"
  exit 0
fi

if ! command -v docker >/dev/null 2>&1 || ! docker info >/dev/null 2>&1; then
  echo "Warning: Docker is not available — skipping auto-start. Run: pnpm db:local"
  exit 0
fi

echo "Starting local Supabase (first run may take a minute)..."
exec bash "$ROOT/scripts/setup-supabase-local.sh"
