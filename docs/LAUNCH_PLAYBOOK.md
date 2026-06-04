# Voxori Launch Playbook

> **Audience:** Founder + first engineer  
> **Last updated:** 2026-06-03  
> **Sources:** `PRD.md`, `ARCHITECTURE.md`, `FEATURE_AUDIT_MATRIX.md`, `VAPI_IDX_BUYER_FLOW.md`, `TELEPHONY_DECISION.md`, codebase audit

---

## Executive summary

- **Hosting:** **Vercel MVP (confirmed)** — three Vercel projects (`apps/web`, `apps/admin`, `apps/api`) + Supabase Cloud. Dedicated API host, job queue, and K8s deferred until scale triggers (see [ARCHITECTURE.md §8](./ARCHITECTURE.md#8-hosting-strategy-mvp)).
- **Where we are:** The modular monolith is structurally complete — dashboard, onboarding, integrations, voice tool routes, IDX search, post-call listing SMS, team invites, and billing are implemented in code. **132 API tests** and **6 web unit tests** pass; local Supabase runs with migrations through `20260414000019`.
- **Code vs ops split:** Application logic for buyer voice → IDX → SMS exists; **launch is blocked by external service configuration** (Twilio 10DLC, Vapi production webhooks, IDX partner keys, Google OAuth app, Stripe prod webhooks, hosted API URL).
- **Pending migrations:** `20260420000020_launch_blockers.sql` (Vapi phone sync + team invitations) and `20260421000021_realtor_record_consent_tool.sql` are **not applied locally or on the linked cloud project** — apply before telephony or team invite testing.
- **Buyer E2E gap:** Tools are wired in `voxori-tool-definitions.ts` + `template-composer.ts`, but **existing Vapi assistants must be re-provisioned** with production `API_BASE_URL` and `tool_secret`; no full live-call E2E test yet.
- **Top blockers for design-partner demo:** (1) apply migrations 20–21, (2) prod/staging env + Supabase cloud, (3) Twilio number + Vapi import + 10DLC, (4) design-partner IDX API key, (5) live inbound call smoke test with consent → listing SMS.

---

## Architecture snapshot

```mermaid
flowchart TB
  subgraph Caller
    Phone[Caller mobile/landline]
  end

  subgraph Telephony
    Twilio[Twilio Voice + SMS<br/>10DLC registered number]
    Vapi[Vapi.ai Assistant<br/>STT / LLM / TTS / HTTP tools]
  end

  subgraph Voxori["Voxori Platform (Vercel)"]
    Web[apps/web<br/>Agent portal]
    Admin[apps/admin<br/>Super admin]
    API[apps/api<br/>tRPC + webhooks + /tools/*]
  end

  subgraph Data
    Supabase[(Supabase Postgres<br/>Auth + RLS + Storage)]
  end

  subgraph External
    IDX[IDX Broker API<br/>MLS listings]
    FUB[Follow Up Boss CRM]
    GCal[Google Calendar OAuth]
    Stripe[Stripe Billing]
    Cron[Scheduler<br/>Vercel Cron / external]
  end

  Phone -->|PSTN inbound| Twilio
  Twilio -->|SIP / import| Vapi
  Vapi -->|POST /webhooks/vapi| API
  Vapi -->|POST /tools/* + X-Voxori-Tool-Secret| API

  Web -->|tRPC| API
  Admin -->|tRPC + impersonate| API
  API --> Supabase

  API -->|search-listings, mls-sync cron| IDX
  API -->|log-lead, crm-retry cron| FUB
  API -->|book-showing, check-availability| GCal
  API -->|post-call SMS, send-confirmation| Twilio
  API -->|checkout, webhooks| Stripe

  Cron -->|x-voxori-internal-secret| API
```

**Voice buyer path (happy path):** Caller → Twilio → Vapi → `record-consent` → `log-lead` → `search-listings` (IDX) → optional `book-showing` → `call-ended` webhook → `processPostCallSms` → Twilio `listing_results` SMS.

---

## Service setup matrix

| Service | Purpose | Dev setup | Prod setup | Env vars | Owner / ops notes |
|---------|---------|-----------|------------|----------|-------------------|
| **Supabase** | Auth, Postgres, RLS, storage, JWT claims | `pnpm db:local` → copy keys from `pnpm db:status`; `pnpm db:reset` + `pnpm db:migrate` | Create cloud project; `supabase link`; `pnpm db:migrate:remote`; enable Auth email; configure redirect URLs for web/admin | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Ensure CLI is linked to the live cloud ref (`xkkypitkvadiyazgheie`); re-run `supabase link --project-ref` if `.temp/project-ref` is stale. **Apply migrations 20–21 before launch.** |
| **Vapi** | Voice AI, inbound calls, HTTP tool invocation | Optional for local; mock webhooks in tests | Production org + API key; webhook URL `https://api.<domain>/webhooks/vapi`; create/update assistants via agent provisioning | `VAPI_API_KEY`, `VAPI_WEBHOOK_SECRET` | Assistants need **production** `API_BASE_URL` in tool server URLs. Re-provision agents after env cutover. |
| **Twilio (voice)** | Own phone numbers; carrier for Vapi import | Skip or use test creds | Buy US local number; create API Key + Secret; import via Settings → Phone Numbers | `TWILIO_ACCOUNT_SID`, `TWILIO_API_KEY`, `TWILIO_API_SECRET` (or `TWILIO_AUTH_TOKEN`) | Numbers purchased in **Twilio Console only** — not from app. See `TELEPHONY_DECISION.md`. |
| **Twilio (SMS + 10DLC)** | Post-call listing SMS, confirmations | Logs skip when unset (`twilio_not_configured`) | Register **brand + campaign** (10DLC); attach to number or Messaging Service; verify FROM = tenant `phone_numbers` row | `TWILIO_PHONE_NUMBER` (platform fallback FROM) | 10DLC approval takes **days–weeks** — start immediately. TCPA: require `record-consent` before marketing SMS. |
| **IDX Broker** | Primary MLS source (featured + filtered search) | Optional platform key in `.env.local`; or per-tenant in Integrations UI | Design-partner **client API key** (+ optional partner `ancillarykey`); confirm account tier allows `/clients/listings` | `MLS_MARKET=idx_broker_primary`, `IDX_BROKER_API_KEY`, `IDX_BROKER_PARTNER_API_KEY`, `IDX_BROKER_ACCOUNT_ID` | Per-tenant keys encrypted in `integrations.credentials` — requires `CREDENTIALS_ENCRYPTION_KEY`. Rate limit ~300–1500 req/hr per key. |
| **Follow Up Boss** | CRM push on lead capture | Dev fallback `FOLLOW_UP_BOSS_API_KEY` (non-prod only) | Tenant connects API key in Integrations; cron retries failures | `FOLLOW_UP_BOSS_API_BASE_URL` (optional) | Validate key on connect (`validateFubApiKey`). |
| **Google Calendar** | OAuth + free/busy + event create for showings | Create OAuth client; redirect `http://localhost:3002/integrations/google/callback` | Production OAuth client; authorized redirect `https://api.<domain>/integrations/google/callback` | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_OAUTH_REDIRECT_URI` | `check-availability` uses real GCal when connected; otherwise returns unavailable with `source: none`. |
| **Stripe** | Starter tier checkout + portal | Stripe test mode keys | Live mode; webhook `https://api.<domain>/webhooks/stripe`; optional pre-created price IDs | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_STARTER_PRICE_ID` (optional) | Checkout uses dynamic `price_data` fallback. Portal for subscription management. |
| **Vercel / hosting** | Deploy web, admin, api | `pnpm dev` locally | **Vercel MVP (confirmed):** three projects, domains `app.`, `admin.`, `api.` | `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_ADMIN_URL`, `NEXT_PUBLIC_API_BASE_URL`, `API_BASE_URL`, `VOXORI_API_URL`, `CRON_SECRET` | `API_BASE_URL` must match public API URL for Vapi tool callbacks. See [DEPLOY_VERCEL.md](./DEPLOY_VERCEL.md). |
| **Cron / scheduled jobs** | MLS sync, CRM retry, SMS outbox retry | Manual `curl` with secret header | Vercel Cron via `apps/api/vercel.json` | `INTERNAL_API_SECRET`, `CRON_SECRET` (Bearer for Vercel Cron GET) | Vercel sends `Authorization: Bearer $CRON_SECRET`. Manual POST uses `x-voxori-internal-secret`. |
| **Encryption** | Integration credentials at rest | Generate dev key: `openssl rand -base64 32` | Unique prod key in secret manager | `CREDENTIALS_ENCRYPTION_KEY` | Falls back to `INTERNAL_API_SECRET` if unset — set explicitly in prod. |
| **Admin / internal** | Impersonation, internal post-call SMS, cron auth | Dev secrets in `.env.local` | Rotate all secrets; restrict admin app to super_admin JWT | `ADMIN_API_SECRET`, `NEXT_PUBLIC_ADMIN_API_SECRET`, `INTERNAL_API_SECRET` | Never commit secrets. |
| **Observability** (planned) | Errors, logs, product analytics | Console logs | Sentry + Axiom/Better Stack + PostHog | TBD | Not implemented — add before public launch (Phase 5). |
| **Legacy MLS** (optional) | Bridge / Trestle fallbacks | Env-gated | Only if IDX unavailable for region | `BRIDGE_SERVER_TOKEN`, `TRESTLE_CLIENT_ID`, `TRESTLE_CLIENT_SECRET` | Defer unless design partner lacks IDX coverage. |

---

## Current state: code vs ops

### Implemented in code (verified)

| Area | Evidence |
|------|----------|
| Voice webhooks + call persistence | `webhooks/vapi/route.ts`, `vapi-call.service.ts` |
| HTTP tools with schemas + auth | `voxori-tool-definitions.ts`, `tool-route-helper.ts`, `X-Voxori-Tool-Secret` |
| `record-consent` → `calls.consent_given` | `tools/record-consent/route.ts` + tests |
| `log-lead` with `call_id` FK | `tools/log-lead/route.ts` |
| IDX search + detail URLs + city→ZIP | `idx-broker.provider.ts`, `city-zip-resolver.ts`, `search-listings` |
| Post-call `listing_results` SMS | `post-call-sms.service.ts` (132 tests include SMS builder) |
| Integrations connect (IDX, FUB, Google OAuth) | `integrations.router.ts` |
| Onboarding progress | `onboarding.router.ts`, `onboarding_steps` table |
| Team invites + accept flow | `team.router.ts`, `tenant_invitations`, `/invite/accept` |
| Phone → Vapi import | `phone-numbers-vapi.service.ts`, Settings UI |
| Stripe checkout + portal | `billing.router.ts`, `webhooks/stripe` |
| Cron routes (MLS sync, CRM retry, SMS retry) | `app/cron/*` |
| Marketing + dashboard routes | Feature audit matrix |

### Ops-only or external (not in app)

| Item | Notes |
|------|-------|
| Twilio number purchase / porting | Console |
| 10DLC brand + campaign approval | Twilio Trust Hub; timeline weeks |
| Vapi dashboard manual edits | Prefer app provisioning |
| IDX partner agreement + API tier | Confirm `/clients/listings` vs featured-only |
| Google Cloud OAuth consent screen verification | Required for production Calendar scope |
| DNS + TLS for custom domains | Vercel |
| Privacy policy / TCPA disclosures | Legal |
| CNAM / SHAKEN-STIR | Optional telephony hygiene |

### Test coverage (2026-06-03)

| Suite | Result |
|-------|--------|
| `pnpm --filter @voxori/api test` | **17 files, 132 tests passed** |
| `pnpm --filter @voxori/web test` | **1 file, 6 tests passed** |
| Playwright smoke (`apps/web/e2e/smoke.spec.ts`) | Public pages + auth redirects — not run in audit |
| Live buyer voice E2E | **Not automated** — manual checklist in Phase 3 |

### Migration status

| Migration | Purpose | Local | Remote (linked project) |
|-----------|---------|-------|---------------------------|
| `20260413000001` – `20260414000019` | Core schema through dual MLS | ✅ Applied | ✅ Applied (per CLI list) |
| `20260420000020_launch_blockers` | `vapi_phone_id`, `tenant_invitations`, users RLS | ❌ Pending | ❌ Pending |
| `20260421000021_realtor_record_consent_tool` | Add `record-consent` to default template tools | ❌ Pending | ❌ Pending |

**Action:** Run `pnpm db:migrate` locally and `pnpm db:migrate:remote` after verifying/re-linking cloud Supabase project.

---

## Phased playbook

### Phase 0: Local dev verification

Ordered checklist — complete before staging.

#### Local vs deployed environment

Next.js reads env at **build time** — there is no runtime switch between local and cloud Supabase. Use separate files per environment:

| Surface | Local dev | Vercel (staging/prod) |
|---------|-----------|------------------------|
| Config file | `apps/<app>/.env.local` (gitignored) | Vercel project → Environment Variables |
| Supabase URL | `http://127.0.0.1:54321` | `https://xkkypitkvadiyazgheie.supabase.co` |
| Supabase keys | From `pnpm db:sync-env` (parses `supabase status`) | Dashboard → Project Settings → API |
| Web / Admin API client | `NEXT_PUBLIC_API_BASE_URL=http://localhost:3002` | `https://api.<domain>` |
| Vapi tool callbacks (server) | `API_BASE_URL=http://localhost:3002` (or `VOXORI_API_URL`) | Same public API URL — must be reachable by Vapi |

**Workflow:** `pnpm db:local` starts Docker Supabase and runs `pnpm db:sync-env` to write the three Supabase vars into `apps/web`, `apps/api`, and `apps/admin` `.env.local`. For production, set the cloud URL and keys in each Vercel project; redeploy after changing `NEXT_PUBLIC_*` vars.

Shared helper (optional): `@voxori/shared/env/supabase` exports `getSupabasePublicUrl()` with a clear error if `NEXT_PUBLIC_SUPABASE_URL` is missing. `packages/database` client uses it.

1. **Install & env**
   ```bash
   pnpm install
   pnpm db:local          # starts Supabase + syncs apps/*/.env.local
   # Or manually: cp .env.local.example apps/web/.env.local (repeat for api, admin)
   #              pnpm db:sync-env
   ```

2. **Database**
   ```bash
   pnpm db:local          # if not running
   pnpm db:migrate        # applies 20260420000020 + 20260421000021
   pnpm db:seed           # optional Austin sample data
   pnpm db:types
   ```

3. **Verify tests**
   ```bash
   pnpm --filter @voxori/api test
   pnpm --filter @voxori/web test
   pnpm verify            # lint + typecheck + test (full monorepo)
   ```

4. **Run apps**
   ```bash
   pnpm dev   # predev: sync Supabase env (auto-starts Docker stack if down; SKIP_SUPABASE_SYNC=1 in CI)
   # Web http://localhost:3000 | Admin http://localhost:3001 | API http://localhost:3002
   ```

5. **Smoke manually**
   - [ ] Sign up → bootstrap tenant (`/auth/bootstrap`)
   - [ ] Dashboard loads (`analytics.getSummary`)
   - [ ] Integrations page renders
   - [ ] `GET http://localhost:3002/health` → 200
   - [ ] (Optional) Set `CREDENTIALS_ENCRYPTION_KEY` → connect IDX key in UI → `pnpm db:seed` listings or trigger MLS sync cron locally:
     ```bash
     curl -X POST http://localhost:3002/cron/mls-sync \
       -H "x-voxori-internal-secret: $INTERNAL_API_SECRET"
     ```

6. **Tool route smoke (no Vapi required)**
   ```bash
   # Requires agent with tool_secret in DB — provision via admin or agent create flow
   curl -X POST http://localhost:3002/tools/record-consent \
     -H "Content-Type: application/json" \
     -H "X-Voxori-Tool-Secret: <agent-tool-secret>" \
     -d '{"consent_given": true, "call_id": "<vapi-call-id>"}'
   ```

---

### Phase 1: Staging / prod infrastructure

**Hosting: Vercel MVP (confirmed)** — follow [DEPLOY_VERCEL.md](./DEPLOY_VERCEL.md) for project setup, root directories, and env vars before the checklist below.

1. **Supabase cloud**
   - [ ] Create or recover production project
   - [ ] Link cloud project: repo root `pnpm supabase:link`, or `cd packages/database && pnpm supabase:link`, or `pnpm -w supabase:link` from any workspace (requires `SUPABASE_DB_PASSWORD`)
   - [ ] `pnpm db:migrate:remote`
   **Note:** `supabase:link` is defined on the **repo root** `package.json` and forwarded in `packages/database` — do not expect a bare `pnpm supabase:link` unless you are in one of those directories or use `-w`.


   **Troubleshooting — wrong or dead project ref**

   - **Symptoms:** `supabase db push` / `pnpm db:migrate:remote` targets the wrong host; `Unexpected error retrieving remote project status`; migrations never appear in the intended Studio project; `packages/database/supabase/.temp/project-ref` does not match your dashboard URL (`https://<ref>.supabase.co`).
   - **Fix:** Confirm the ref in [Supabase Dashboard](https://supabase.com/dashboard) → Project Settings → General. Then re-link (use `pnpm exec supabase` from `packages/database` if the global CLI is not installed):

     ```bash
     cd packages/database
     pnpm exec supabase login
     pnpm exec supabase unlink    # optional; clears stale link
     export SUPABASE_DB_PASSWORD='...'   # Settings → Database (do not leave blank)
     pnpm exec supabase link --project-ref xkkypitkvadiyazgheie -p "$SUPABASE_DB_PASSWORD"
     pnpm exec supabase db push -p "$SUPABASE_DB_PASSWORD"   # repo root: pnpm db:migrate:remote
     ```

   - If link fails with *"does not have the necessary privileges"*, the CLI is logged into an org that does not own that project — run `pnpm exec supabase logout`, log in with the account that owns `xkkypitkvadiyazgheie`, or add your user to that project in the dashboard.
   - **Troubleshooting — `28P01` / password authentication failed (SASL auth):**
     - **Symptoms:** `failed SASL auth (FATAL: password authentication failed for user "postgres" (SQLSTATE 28P01))` during `supabase link` or `db push`. The error line may look like `host=...pooler.supabase.comuser=postgres.<ref>` — that is a **CLI log formatting quirk** (missing space/colon between fields), not a broken `packages/database/supabase/.temp/pooler-url` (the stored URI uses `@host:6543/` correctly).
     - **Blank password:** Pressing Enter at *"Enter your database password (or leave blank to skip)"* skips auth and always fails with 28P01. Do not skip — set or enter the real database password.
     - **Wrong password:** Use the password from Dashboard → **Project Settings → Database** (not the anon/service role API keys). If unknown, **Reset database password** on that page, copy the new value, and use it immediately.
     - **Fix (recommended):**

       ```bash
       export SUPABASE_DB_PASSWORD='your-database-password'
       cd packages/database
       pnpm exec supabase link --project-ref xkkypitkvadiyazgheie -p "$SUPABASE_DB_PASSWORD"
       pnpm exec supabase db push -p "$SUPABASE_DB_PASSWORD"
       # or from repo root (script requires password; will prompt if env unset):
       pnpm supabase:link
       ```

     - **Pooler still fails after reset:** push via **direct** session URI (port **5432**, host `db.<ref>.supabase.co`) — see *Bypass link metadata* below.
   - **Interactive helper (recommended):** from repo root, `pnpm supabase:link` (runs `scripts/supabase-link-remote.sh` — checks DNS, lists projects, link + push).
   - **Wrong org in `projects list`:** you will only see refs for orgs your login can access (e.g. another user's `bkuqntynkxjapsxcotgu`). Log out and log in with the GitHub/email that owns **Sass Agent** / ref `xkkypitkvadiyazgheie`, or get invited in Dashboard → Project Settings → Team.
   - **Non-interactive link + push:** set database password from Dashboard → Settings → Database, then:

     ```bash
     export SUPABASE_DB_PASSWORD='your-db-password'
     cd packages/database
     pnpm exec supabase link --project-ref xkkypitkvadiyazgheie -p "$SUPABASE_DB_PASSWORD"
     pnpm exec supabase db push -p "$SUPABASE_DB_PASSWORD"
     # or from repo root:
     pnpm db:migrate:remote
     ```

   - **Access token (headless / different machine):** Dashboard → Account → Access Tokens, then `pnpm exec supabase login --token "$SUPABASE_ACCESS_TOKEN"` before link/push.
   - **Bypass link metadata — push by connection string:** Dashboard → Settings → Database → Connection string (URI). Percent-encode special characters in the password, then:

     ```bash
     cd packages/database
     pnpm exec supabase db push --db-url 'postgresql://postgres.[ref]:[PASSWORD]@...:5432/postgres'
     ```

     Prefer the **direct** session connection (port 5432) if pooler errors mention `tenant/user not found`.
   - **Manual migrations (no CLI):** Dashboard → SQL Editor → run each file under `packages/database/supabase/migrations/` in filename order (through `20260421000021_realtor_record_consent_tool.sql`). Use for emergencies only; CLI history table may drift — follow up with `db push` once CLI works.
   - **Script map:** `pnpm db:migrate` = local Docker only (`supabase migration up --local`). `pnpm db:migrate:remote` = `supabase db push` on the **linked** cloud project. `pnpm db:push` (in `@voxori/database`) is the same remote push.
   - Update app env (never commit): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` from Settings → API for the **same** ref.
   - [ ] Configure Auth: site URL, redirect URLs for web + admin
   - [ ] Enable email templates for team invites
   - [ ] Review RLS policies in Studio

2. **Secrets & env sync**
   - [ ] Copy `.env.example` → Vercel env for `apps/web`, `apps/admin`, `apps/api`
   - [ ] Set `CREDENTIALS_ENCRYPTION_KEY` (unique, prod-only)
   - [ ] Set `INTERNAL_API_SECRET`, `ADMIN_API_SECRET`
   - [ ] Set `NEXT_PUBLIC_API_BASE_URL` / `API_BASE_URL` to public API URL

3. **Deploy**
   - [ ] Deploy all three apps to Vercel per [DEPLOY_VERCEL.md](./DEPLOY_VERCEL.md)
   - [ ] Verify `GET https://api.<domain>/health`
   - [ ] Confirm `apps/api/vercel.json` cron schedules deployed (Pro plan required for cron):
     - `GET /cron/mls-sync` — every 15 min
     - `GET /cron/crm-retry` — hourly
     - `GET /cron/post-call-sms` — every 5 min (SMS outbox retry)
   - [ ] Set `CRON_SECRET` on API project (match `INTERNAL_API_SECRET` or rotate separately)

4. **Stripe (test → live)**
   - [ ] Test mode checkout on staging
   - [ ] Live webhook endpoint + signing secret
   - [ ] Confirm Starter plan checkout from `/pricing`

---

### Phase 2: Telephony go-live

Follow [`TELEPHONY_DECISION.md`](./TELEPHONY_DECISION.md).

1. **Twilio**
   - [ ] Account + billing verified
   - [ ] Buy US local number; record E.164 + `PN…` SID
   - [ ] Create API Key + Secret
   - [ ] **Start 10DLC** brand + campaign registration (parallel track)

2. **Vapi**
   - [ ] Production `VAPI_API_KEY`
   - [ ] Webhook: `https://api.<domain>/webhooks/vapi` + `VAPI_WEBHOOK_SECRET`

3. **Voxori app**
   - [ ] Migration `20260420000020` applied (Vapi phone linkage)
   - [ ] Provision agent → confirm `vapi_assistant_id` + `tool_secret` in `agents.config`
   - [ ] Settings → Phone Numbers → add E.164 + Twilio SID → **Vapi Linked**
   - [ ] Inbound test call → `calls` row created
   - [ ] Post-call SMS FROM = tenant number (or platform fallback)

4. **Compliance (telephony)**
   - [ ] Recording/AI disclosure in agent prompt
   - [ ] SMS consent via `record-consent` before listing texts

---

### Phase 3: Buyer voice E2E

Reconcile with [`VAPI_IDX_BUYER_FLOW.md`](./VAPI_IDX_BUYER_FLOW.md).

1. **Assistant reconciliation**
   - [ ] Confirm template `Real Estate Inbound Receptionist` includes tools: `record-consent`, `log-lead`, `search-listings`, `book-showing`, `send-confirmation` (migration 21)
   - [ ] Re-provision or update Vapi assistant so HTTP tools point to **prod** `/tools/*` URLs
   - [ ] Verify `X-Voxori-Tool-Secret` matches `agents.config.tool_secret`

2. **IDX for design partner**
   - [ ] Connect tenant IDX API key in Integrations
   - [ ] Confirm `/clients/listings` returns results (not featured-only tier)
   - [ ] Set correct `idxID` in `mls-markets.ts` if needed for ABOR

3. **Manual E2E test script**
   - [ ] Call tenant number as buyer
   - [ ] Verbal consent → assistant calls `record-consent`
   - [ ] Qualify: name, Austin area, 3bd, $500k budget
   - [ ] Assistant searches listings → speaks 1–2 results
   - [ ] Hang up → within 60s receive SMS with 3–5 listings + URLs
   - [ ] Verify: `calls.consent_given=true`, `leads` row with `call_id`, `call_tool_events` for tools, `sms_outbox` type `listing_results`

4. **Failure modes to verify**
   - [ ] No consent → no listing SMS (`consent_not_given`)
   - [ ] IDX down → cache fallback or graceful message
   - [ ] No Twilio → dev log / `twilio_not_configured` in outbox

---

### Phase 4: Design partner onboarding

Target: **<15 min** per [`PRD.md`](./PRD.md) §3.2.

| Step | Route | Verification |
|------|-------|--------------|
| 1 MLS | `/onboarding?step=mls` | IDX key saved encrypted; `mls-sync` cron populates `/listings` |
| 2 Calendar | `/onboarding?step=calendar` | Google OAuth completes; test `check-availability` |
| 3 CRM | `/onboarding?step=crm` | FUB key validates; test lead pushes on call |
| 4 Agent | `/onboarding?step=agent` | Vapi assistant provisioned; greeting + disclosure |
| 5 Number | `/onboarding?step=number` | Phone linked in Vapi |
| Test call | Onboarding CTA | Live inbound call succeeds |
| Team | Settings → Team | Invite colleague; accept at `/invite/accept` |

**Partner checklist (founder-facing):**
- [ ] IDX Broker partner API key + account ID
- [ ] FUB API key
- [ ] Google account for calendar
- [ ] Twilio number (or forward existing line to Voxori number)
- [ ] Stripe subscription (Starter) if billing enabled

---

### Phase 5: Launch gates

#### Security
- [ ] `CREDENTIALS_ENCRYPTION_KEY` set in prod (not fallback)
- [ ] All webhook signatures validated (Vapi, Stripe, Twilio)
- [ ] RLS audit on tenant tables
- [ ] `SUPABASE_SERVICE_ROLE_KEY` only on API/admin — never in web client
- [ ] GDPR `/gdpr/export` + `/gdpr/delete` tested

#### Monitoring
- [ ] Sentry (or equivalent) on API webhooks + tool routes
- [ ] Alert on webhook 5xx rate
- [ ] Twilio message delivery monitoring
- [ ] Cron job success logging

#### Legal / TCPA
- [ ] Privacy policy mentions AI voice agent + SMS
- [ ] 10DLC campaign approved and linked
- [ ] Two-party consent disclosure configurable by state (agent prompt)
- [ ] Fair Housing: no demographic filters in search (code enforced — audit prompts)
- [ ] IDX display/attribution on consumer-facing listing surfaces

#### Business
- [ ] Stripe live billing tested end-to-end
- [ ] Waitlist → invite flow if using gated launch
- [ ] Support runbook for failed Vapi sync / IDX 412 rate limits

---

## What NOT to build yet

Per PRD §2.3, §9 and [`FEATURE_AUDIT_MATRIX.md`](./FEATURE_AUDIT_MATRIX.md) — defer to P1/P2:

| Feature | Rationale |
|---------|-----------|
| Professional / Growth self-serve checkout tiers | Starter sufficient for design partners |
| Outlook calendar | Google Cal covers MVP |
| Script builder / voice picker UI | Template + agent config enough |
| Metered overage UI | Manual ops until volume |
| Agency admin + white-label | `parent_tenant_id` stub only |
| Multi-MLS per tenant | Single IDX market for launch |
| Outbound calling | Inbound-only MVP |
| Dedicated buyer qualifier microservice | Inline Vapi LLM + tools sufficient |
| Vapi structured outputs fallback | P1 after tool chain stable |
| SOC 2 / formal compliance program | v2 roadmap |
| Public third-party REST API | tRPC internal only |
| Spanish agent | v2 |

---

## Open risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| **IDX account tier** | `/clients/listings` may be featured-only → empty voice search | Confirm with design partner; use featured + cache; document fallback copy |
| **IDX rate limits (412)** | Search fails under load | Cache via `mls-sync` cron; featured fallback; respect 300–1500/hr |
| **10DLC delay** | SMS blocked for US mobiles | Start registration now; use test numbers until approved |
| **SMS consent gaps** | TCPA liability if assistant skips `record-consent` | Prompt engineering + monitor `consent_given` rate; block listing SMS without consent (enforced in code) |
| **Fair Housing** | LLM could infer protected classes from conversation | System prompt rules; never map demographic params to IDX; periodic prompt audit |
| **Vapi assistant drift** | Old assistants missing tool URLs after deploy | Re-provision on env change; store `tool_secret` rotation procedure |
| **Remote Supabase link stale** | Migrations 20–21 not on prod | Re-link project; run `db:migrate:remote` before any hosted test |
| **Pooler `tenant/user … not found` (ENOTFOUND)** | Linked ref has no DNS / no pooler tenant | Dashboard: restore paused or create project; `cd packages/database && pnpm exec supabase link --project-ref <ref>`; refresh env keys; then `pnpm db:migrate:remote` |
| **No observability** | Silent failures on webhooks | Phase 5 minimum: Sentry + structured logs on `/webhooks/vapi` and `/tools/*` |
| **Google OAuth verification** | Calendar connect blocked for external users | Submit OAuth consent screen early |
| **PRD_ALIGNMENT.md stale** | Planning confusion | Treat this playbook + feature audit as current; refresh alignment doc post-launch |

---

## Next 2 weeks sprint

Numbered tickets with effort (S/M/L) and dependencies.

| # | Ticket | Effort | Depends on | Done when |
|---|--------|--------|------------|-----------|
| 1 | Apply migrations 20–21 locally + remote Supabase | S | Supabase project access | `supabase migration list --local` shows all 21 applied; remote matches |
| 2 | Recover or create prod Supabase + Vercel deploy (api/web/admin) | M | #1 | `/health` live on public API URL |
| 3 | Prod env secrets matrix (encryption, internal, Vapi, Twilio, Stripe) | S | #2 | All required vars in Vercel; no fallback encryption |
| 4 | Twilio: buy number + API key; start 10DLC registration | M | — (ops parallel) | Number SID + E.164 ready; 10DLC submitted |
| 5 | Vapi prod webhook + re-provision design-partner assistant | M | #2, #3 | Tools hit prod URLs; test webhook receives events |
| 6 | Design-partner IDX key connect + verify live search | M | #2, partner key | `search-listings` returns ≥1 result for Austin test query |
| 7 | Telephony E2E: inbound call → consent → lead → search → hangup | L | #4, #5, #6 | Manual script passes; DB rows verified |
| 8 | Post-call listing SMS E2E with real Twilio | M | #4, #7, 10DLC* | SMS received with listing URLs (*may block on 10DLC) |
| 9 | Verify `apps/api/vercel.json` cron on Vercel (mls-sync, crm-retry, post-call-sms) | S | #2 | Cron hits succeed in Vercel logs; `CRON_SECRET` set |
| 10 | Google OAuth prod app + calendar connect test | S | #2 | Onboarding calendar step completes |
| 11 | FUB connect + lead push on test call | S | #7 | Lead appears in FUB with qualification fields |
| 12 | Stripe live checkout smoke from `/pricing` | S | #2 | Test subscription creates `tenants.stripe_*` |
| 13 | Sentry on API (webhooks + tools minimum) | S | #2 | Test error appears in Sentry |
| 14 | Refresh `PRD_ALIGNMENT.md` to match current integrations status | S | — | Doc reflects implemented routers |
| 15 | Buyer E2E automated test (mock Vapi chain → SMS outbox assert) | M | #7 | CI test covers tool chain without live PSTN |

**Suggested week split:**
- **Week 1:** #1–#6 (infra + IDX + assistant wiring)
- **Week 2:** #7–#13 (E2E telephony, cron, integrations, monitoring)

---

## Related docs

| Doc | Topic |
|-----|--------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System design + ADRs + hosting strategy |
| [DEPLOY_VERCEL.md](./DEPLOY_VERCEL.md) | Vercel MVP deploy checklist |
| [PRD.md](./PRD.md) | Product requirements |
| [TELEPHONY_DECISION.md](./TELEPHONY_DECISION.md) | Twilio + Vapi checklist |
| [VAPI_IDX_BUYER_FLOW.md](./VAPI_IDX_BUYER_FLOW.md) | Buyer voice → IDX → SMS |
| [FEATURE_AUDIT_MATRIX.md](./FEATURE_AUDIT_MATRIX.md) | UI vs backend mapping |
| [PRD_ALIGNMENT.md](./PRD_ALIGNMENT.md) | Requirement status (partially stale) |
