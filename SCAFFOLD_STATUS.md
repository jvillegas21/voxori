# Voxori Scaffold — Progress & Remaining Work

Last updated: 2026-04-13

---

## ✅ Completed

| Task | Description |
|------|-------------|
| 5 | Folder renamed `agent-flo` → `voxori`, `git init`, `.gitignore` |
| 6 | Monorepo root: `pnpm-workspace.yaml`, root `package.json`, `turbo.json`, `packages/config` (tsconfig/eslint/tailwind) |
| 7 | `packages/database`: Supabase client factories, TypeScript type stubs (8 tables), SQL migrations 001–005, RLS policies, `supabase/config.toml` |
| 8 | `packages/shared`: TypeScript types, Zod schemas, plan constants (PLAN_TIERS), verticals |
| 9 | `apps/web` (client portal): all 23 files — Next.js 14, middleware, 10 route pages, Supabase auth clients, tRPC stub |
| 11 | `apps/api` (edge API): Vapi/Twilio/Stripe webhook handlers, 5 tool endpoint stubs, health route |

---

## 🔧 Fixes Needed (before marking complete)

### Fix A — `apps/admin` file structure (Task 10)
The admin implementer placed files under `src/app/` instead of flat `app/` (inconsistent with `apps/web`).

**Files to move** (read → write to new path):

| Old path | New path |
|----------|----------|
| `apps/admin/src/app/globals.css` | `apps/admin/app/globals.css` |
| `apps/admin/src/app/layout.tsx` | `apps/admin/app/layout.tsx` |
| `apps/admin/src/app/page.tsx` | `apps/admin/app/page.tsx` |
| `apps/admin/src/app/(auth)/sign-in/page.tsx` | `apps/admin/app/(auth)/sign-in/page.tsx` |
| `apps/admin/src/app/(dashboard)/layout.tsx` | `apps/admin/app/(dashboard)/layout.tsx` |
| `apps/admin/src/app/(dashboard)/accounts/page.tsx` | `apps/admin/app/(dashboard)/accounts/page.tsx` |
| `apps/admin/src/app/(dashboard)/accounts/[id]/page.tsx` | `apps/admin/app/(dashboard)/accounts/[id]/page.tsx` |
| `apps/admin/src/app/(dashboard)/agents/page.tsx` | `apps/admin/app/(dashboard)/agents/page.tsx` |
| `apps/admin/src/app/(dashboard)/calls/page.tsx` | `apps/admin/app/(dashboard)/calls/page.tsx` |
| `apps/admin/src/app/(dashboard)/billing/page.tsx` | `apps/admin/app/(dashboard)/billing/page.tsx` |
| `apps/admin/src/app/(dashboard)/settings/page.tsx` | `apps/admin/app/(dashboard)/settings/page.tsx` |
| `apps/admin/src/lib/supabase/client.ts` | `apps/admin/lib/supabase/client.ts` |
| `apps/admin/src/lib/supabase/server.ts` | `apps/admin/lib/supabase/server.ts` |

Also update `apps/admin/tsconfig.json` `include` array from `["src/**/*.ts", ...]` to `["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"]` if it has src-based includes.

### Fix B — tsconfig `@/*` path alias (both apps)

In `apps/web/tsconfig.json` AND `apps/admin/tsconfig.json`, change:
```json
"paths": { "@/*": ["./src/*"] }
```
to:
```json
"paths": { "@/*": ["./*"] }
```

### Fix C — Unused import in `apps/api/app/tools/log-lead/route.ts`
`createServiceRoleClient` is imported but `db` variable is never used. Remove the import line.

---

## 🔲 Remaining Tasks

### Task 12 — Root `.env.example`
Create `/Users/jmvegas21/dev/voxori/.env.example` with all keys:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Vapi
VAPI_API_KEY=
VAPI_WEBHOOK_SECRET=

# ElevenLabs
ELEVENLABS_API_KEY=

# Twilio
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# OpenAI
OPENAI_API_KEY=

# App URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_ADMIN_URL=http://localhost:3001
```

Each app already has its own `.env.local.example` — this root file documents all keys in one place.

### Task 13 — GitHub repo + initial commit
```bash
# From /Users/jmvegas21/dev/voxori
gh repo create voxori --private --description "Voxori — AI voice agent platform"
git remote add origin git@github.com:<username>/voxori.git
git add .
git commit -m "feat: initial Voxori platform scaffold

Turborepo monorepo with Next.js 14 apps (web portal, admin dashboard, edge API),
Supabase database package with Phase 1 schema + RLS policies, and shared
types/schemas/constants package.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
git push -u origin main
```

**Note:** Run `gh auth status` first to confirm GitHub CLI is authenticated. The repo name may need to be `<your-github-username>/voxori`.

---

## Verification Checklist (after all fixes + tasks complete)

- [ ] `pnpm install` from `/Users/jmvegas21/dev/voxori` installs without errors
- [ ] `pnpm dev` starts all 3 apps (web :3000, admin :3001, api :3002)
- [ ] `apps/web` auth page renders at localhost:3000/sign-in
- [ ] `apps/admin` auth page renders at localhost:3001/sign-in
- [ ] `apps/api/app/health/route.ts` returns `{"status":"ok"}` at localhost:3002/health
- [ ] `pnpm typecheck` passes with no errors
- [ ] GitHub repo shows all files on `main` branch

---

## Notes

- The `src/` orphan files in `apps/admin/` from Fix A can be left — they don't affect Next.js since it looks for `app/` at root first.
- `agents.config` is correctly typed as `jsonb` in migration 001, so the Vapi webhook JSONB path query (`config->>vapi_assistant_id`) will work.
- `lib/trpc.ts` in `apps/web` uses `AppRouter = Record<string, never>` placeholder — update once tRPC router is wired in `apps/api`.
- Supabase local dev: run `supabase start` from `packages/database/` to spin up local Postgres with migrations applied.
