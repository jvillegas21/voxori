#!/usr/bin/env bash
# Write local Supabase URL + keys from `supabase status` into apps/*/.env.local.
# Never commits secrets — .env.local is gitignored. Safe to re-run after `pnpm db:local`.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DB_PKG="$ROOT/packages/database"
LOCAL_SUPABASE_URL="http://127.0.0.1:54321"

APPS=(web api admin)

usage() {
  cat <<'EOF'
Usage: pnpm db:sync-env [--print-only]

  --print-only   Print suggested env lines without writing apps/*/.env.local

Reads keys from `supabase status -o env` (local stack must be running).
Creates apps/<app>/.env.local from apps/<app>/.env.local.example when missing.
EOF
}

PRINT_ONLY=false
for arg in "$@"; do
  case "$arg" in
    --print-only) PRINT_ONLY=true ;;
    --) ;;
    *)
      if [ -n "$arg" ]; then
        usage
        exit 1
      fi
      ;;
  esac
done

if [ ! -d "$DB_PKG/supabase" ]; then
  echo "Error: packages/database/supabase not found"
  exit 1
fi

cd "$DB_PKG"

if ! pnpm exec supabase status -o env >/tmp/voxori-supabase-status.env 2>/dev/null; then
  echo "Error: Local Supabase is not running. Start it with: pnpm db:local"
  exit 1
fi

# shellcheck disable=SC1091
source /tmp/voxori-supabase-status.env

ANON_KEY="${ANON_KEY:-}"
SERVICE_ROLE_KEY="${SERVICE_ROLE_KEY:-}"
API_URL="${API_URL:-$LOCAL_SUPABASE_URL}"

if [ -z "$ANON_KEY" ] || [ -z "$SERVICE_ROLE_KEY" ]; then
  echo "Error: Could not parse ANON_KEY or SERVICE_ROLE_KEY from supabase status"
  exit 1
fi

if [ "$API_URL" != "$LOCAL_SUPABASE_URL" ]; then
  echo "Warning: supabase status API_URL is '$API_URL' (expected $LOCAL_SUPABASE_URL for local dev)"
fi

SNIPPET=$(cat <<EOF
# --- Supabase (local — synced by pnpm db:sync-env) ---
NEXT_PUBLIC_SUPABASE_URL=$LOCAL_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=$ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY
EOF
)

if [ "$PRINT_ONLY" = true ]; then
  echo "$SNIPPET"
  echo ""
  echo "# Copy into apps/web, apps/api, and apps/admin .env.local (or run without --print-only)"
  exit 0
fi

set_env_var() {
  local file=$1
  local key=$2
  local value=$3

  if grep -q "^${key}=" "$file" 2>/dev/null; then
    if [[ "$OSTYPE" == darwin* ]]; then
      sed -i '' "s|^${key}=.*|${key}=${value}|" "$file"
    else
      sed -i "s|^${key}=.*|${key}=${value}|" "$file"
    fi
  elif grep -q "^# *${key}=" "$file" 2>/dev/null; then
    if [[ "$OSTYPE" == darwin* ]]; then
      sed -i '' "s|^# *${key}=.*|${key}=${value}|" "$file"
    else
      sed -i "s|^# *${key}=.*|${key}=${value}|" "$file"
    fi
  else
    printf '\n%s=%s\n' "$key" "$value" >>"$file"
  fi
}

sync_app_env() {
  local app=$1
  local env_file="$ROOT/apps/$app/.env.local"
  local example_file="$ROOT/apps/$app/.env.local.example"

  if [ ! -f "$env_file" ]; then
    if [ -f "$example_file" ]; then
      cp "$example_file" "$env_file"
      echo "Created apps/$app/.env.local from .env.local.example"
    else
      echo "Error: Missing apps/$app/.env.local and no .env.local.example"
      exit 1
    fi
  fi

  set_env_var "$env_file" "NEXT_PUBLIC_SUPABASE_URL" "$LOCAL_SUPABASE_URL"
  set_env_var "$env_file" "NEXT_PUBLIC_SUPABASE_ANON_KEY" "$ANON_KEY"
  set_env_var "$env_file" "SUPABASE_SERVICE_ROLE_KEY" "$SERVICE_ROLE_KEY"

  echo "Updated Supabase vars in apps/$app/.env.local"
}

for app in "${APPS[@]}"; do
  sync_app_env "$app"
done

echo ""
echo "Local Supabase env synced. Restart dev servers if they are running (pnpm dev)."
