#!/usr/bin/env bash
# Link the Supabase CLI to the Voxori cloud project and push migrations.
# Use when `pnpm db:migrate:remote` fails due to wrong login, stale ref, or password prompts.
#
# Database password (required for link and db push — do not leave blank):
#   export SUPABASE_DB_PASSWORD='...'
#   Reset if unknown: Dashboard → Project Settings → Database → Reset database password
#   Then use the new password immediately (old password stops working).
#
# CLI auth (pick one):
#   - Interactive: pnpm exec supabase login
#   - CI/automation: export SUPABASE_ACCESS_TOKEN='...' (Dashboard → Account → Access Tokens)
#     then: pnpm exec supabase login --token "$SUPABASE_ACCESS_TOKEN"
#
# If pooler auth fails (28P01) after confirming password, try direct connection:
#   Dashboard → Settings → Database → Connection string → URI (Session mode, port 5432)
#   pnpm exec supabase db push --db-url 'postgresql://postgres.[ref]:[PASSWORD]@db.[ref].supabase.co:5432/postgres'
#   (Percent-encode special characters in the password.)

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DB_PKG="$ROOT/packages/database"
DEFAULT_REF="xkkypitkvadiyazgheie"

require_db_password() {
  if [ -n "${SUPABASE_DB_PASSWORD:-}" ]; then
    return 0
  fi

  echo ""
  echo "Database password is required for supabase link and db push."
  echo "  Dashboard → Project Settings → Database → Database password"
  echo "  (Reset database password if you do not know the current one.)"
  echo ""
  echo "Leaving the password blank will fail with SQLSTATE 28P01 (SASL auth)."
  echo ""

  while true; do
    read -r -s -p "Enter database password: " SUPABASE_DB_PASSWORD
    echo ""
    if [ -n "$SUPABASE_DB_PASSWORD" ]; then
      export SUPABASE_DB_PASSWORD
      return 0
    fi
    echo "Password cannot be empty. Export SUPABASE_DB_PASSWORD or enter the password."
    read -r -p "Try again? [Y/n] " RETRY
    RETRY="${RETRY:-Y}"
    if [[ ! "$RETRY" =~ ^[Yy]$ ]]; then
      echo "Aborted. Run: export SUPABASE_DB_PASSWORD='...' && pnpm supabase:link"
      exit 1
    fi
  done
}

cd "$DB_PKG"

echo "== Voxori remote Supabase =="
echo "Expected project URL: https://${DEFAULT_REF}.supabase.co"
echo ""

if [ -f supabase/.temp/project-ref ]; then
  echo "Current linked ref (supabase/.temp/project-ref): $(cat supabase/.temp/project-ref)"
else
  echo "No local link metadata yet (supabase/.temp/project-ref missing)."
fi
echo ""

echo "Projects visible to this CLI login:"
pnpm exec supabase projects list || true
echo ""

read -r -p "Project ref to link [${DEFAULT_REF}]: " PROJECT_REF
PROJECT_REF="${PROJECT_REF:-$DEFAULT_REF}"

if ! dig +short "${PROJECT_REF}.supabase.co" | grep -q .; then
  echo "Warning: DNS for ${PROJECT_REF}.supabase.co did not resolve. Project may be paused, deleted, or ref is wrong."
else
  echo "DNS OK for ${PROJECT_REF}.supabase.co"
fi
echo ""

require_db_password

LINK_ARGS=(link --project-ref "$PROJECT_REF" -p "$SUPABASE_DB_PASSWORD")
PUSH_ARGS=(db push -p "$SUPABASE_DB_PASSWORD")
echo "Using -p for link and db push (password from env or prompt)."

echo ""
echo "If link fails with 'does not have the necessary privileges':"
echo "  1. pnpm exec supabase logout"
echo "  2. pnpm exec supabase login   # use the account that owns the project in the dashboard"
echo "  3. Re-run: bash scripts/supabase-link-remote.sh"
echo ""
echo "If link fails with password authentication failed (28P01):"
echo "  - Wrong password, or you skipped the CLI password prompt with an empty value."
echo "  - Reset: Dashboard → Project Settings → Database → Reset database password"
echo "  - Then: export SUPABASE_DB_PASSWORD='new-password' && pnpm supabase:link"
echo ""
read -r -p "Run supabase link now? [Y/n] " DO_LINK
DO_LINK="${DO_LINK:-Y}"
if [[ "$DO_LINK" =~ ^[Yy]$ ]]; then
  pnpm exec supabase "${LINK_ARGS[@]}"
fi

echo ""
read -r -p "Run supabase db push (pnpm db:migrate:remote)? [Y/n] " DO_PUSH
DO_PUSH="${DO_PUSH:-Y}"
if [[ "$DO_PUSH" =~ ^[Yy]$ ]]; then
  pnpm exec supabase "${PUSH_ARGS[@]}"
fi

echo ""
echo "Done. Verify in Dashboard → Database → Migrations."
echo "App env (same ref): NEXT_PUBLIC_SUPABASE_URL=https://${PROJECT_REF}.supabase.co"
echo "Keys: Dashboard → Project Settings → API"
