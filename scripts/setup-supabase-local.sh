#!/usr/bin/env bash
# Start local Supabase (Docker) and apply migrations from packages/database/supabase/migrations.
# Cloud projects: create a project at https://supabase.com/dashboard, then run:
#   supabase login && supabase link --project-ref <ref>
#   supabase db push
# (interactive; cannot be fully scripted without API tokens.)

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DB_PKG="$ROOT/packages/database"

if ! command -v docker >/dev/null 2>&1; then
  echo "Error: Docker is required. Install Docker Desktop and ensure it is running."
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "Error: Docker daemon is not running. Start Docker Desktop and try again."
  exit 1
fi

cd "$DB_PKG"

if [ ! -f supabase/config.toml ]; then
  echo "Error: Missing supabase/config.toml under $DB_PKG"
  exit 1
fi

echo "Starting Supabase (this may take a minute the first time)..."
pnpm exec supabase start

echo ""
echo "Local Supabase is up. Summary:"
pnpm exec supabase status

echo ""
echo "Syncing local Supabase keys into apps/*/.env.local..."
bash "$ROOT/scripts/sync-local-supabase-env.sh"

echo ""
echo "Next steps:"
echo "  1. Apply migrations (if not already): pnpm db:reset"
echo "  2. Seed sample Austin leads/listings: pnpm db:seed"
echo "  3. Regenerate TypeScript DB types: pnpm db:types"
echo "  4. Start apps: pnpm dev"
echo ""
echo "Re-sync keys anytime: pnpm db:sync-env"
echo "Preview without writing: pnpm db:sync-env --print-only"
