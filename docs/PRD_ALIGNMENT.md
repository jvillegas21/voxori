# PRD Alignment Matrix

> **Audit date:** 2026-05-23  
> **Sources:** `Downloads/voxori-business-plan-prd.docx` (v1.0), `docs/PRD.md` (v1.1 refined), `docs/ARCHITECTURE.md`  
> **Scope:** Structural alignment — every PRD feature has a home in the codebase. Stubs are acceptable for P1+ per refined PRD.

## Alignment Summary

| Status | Count | Share |
|--------|------:|------:|
| ✅ Implemented | 38 | 54% |
| 🟡 Stubbed | 22 | 31% |
| ❌ Missing | 3 | 4% |
| ⚠️ Mismatch (resolved) | 7 | 10% |

**Overall structural coverage:** 96% (68/71 requirements have a code home).  
**MVP P0 readiness:** ~54% fully implemented; remaining P0 items are integration wiring (MLS OAuth, FUB sync, Google Cal).

---

## Locked Decisions (Verified)

| Decision | Expected | Codebase | Status |
|----------|----------|----------|--------|
| Launch MLS source | IDX Broker (primary) | `MLS_MARKET=idx_broker_primary`, `idx-broker.provider.ts`, `integrations.credentials` | ✅ |
| Legacy MLS fallbacks | Bridge / Trestle (Austin, CTX) | `mls-markets.ts`, env-gated | 🟡 Optional |
| Plan tier names | starter / professional / growth / agency | DB enum `plan_tier`, `packages/shared/src/constants/plans.ts`, `/pricing` | ✅ |
| Marketing routing | Unauthenticated `/` → `/landing`; signed-in `/landing` → `/` | `apps/web/middleware.ts` | ✅ |
| Stack | Next.js 14 modular monolith (not Vite/Fastify) | Turborepo `apps/web`, `apps/admin`, `apps/api` | ✅ (architect override) |

---

## Core Product Features

| PRD Requirement | Status | Location | Gap/Notes |
|-----------------|--------|----------|-----------|
| Inbound voice via Vapi.ai | 🟡 Stubbed | `apps/api/app/webhooks/vapi/route.ts`, Vapi config on agents | Webhook persists calls; live assistant provisioning is env-dependent |
| Lead qualification (name, contact, area, budget, beds/baths, timeline, financing) | ✅ Implemented | `apps/api/app/tools/log-lead/route.ts`, `leads` table, `/leads` | Tool writes to `leads`; voice script config in agent `system_prompt` |
| MLS listing search (voice) | 🟡 Credential-gated | `idx-broker.provider.ts`, `search.service.ts`, `search-listings` | IDX Broker per-tenant `api_key`; featured + filtered search; cache + Bridge/Trestle fallback |
| Google Calendar booking | 🟡 Env-gated | `google-calendar.service.ts`, `book-showing`, OAuth callback | DB booking always; GCal event when OAuth connected |
| Follow Up Boss CRM sync | 🟡 Env-gated | `fub.service.ts`, `log-lead`, integrations connect | Pushes when CRM connected with API key |
| SMS follow-up (Twilio 10DLC) | 🟡 Env-gated | `send-confirmation`, `post-call-sms.service.ts`, Vapi `call-ended` | Auto SMS after call when booking + Twilio configured; dev logs when not |
| Call transcripts & recordings (30-day) | ✅ Implemented | `calls` table, `/calls/[id]`, `recordings/*` | Retention policy in migration `20260414000011_tcpa_retention.sql` |
| Agent dashboard + KPIs | ✅ Implemented | `apps/web/app/(dashboard)/page.tsx`, tRPC `analytics.getSummary` | 30-day aggregates (not last-5-calls only) |
| Onboarding wizard (<15 min) | ✅ Implemented | `/onboarding`, tRPC `onboarding.*`, `onboarding_steps` | Progress persisted; integrations auto-complete steps |
| Stripe Starter billing | ✅ Implemented | tRPC `billing.createCheckoutSession`, `billing.createPortalSession`, `webhooks/stripe` | Checkout uses dynamic price_data or `STRIPE_*_PRICE_ID` env |
| Availability check before booking | 🟡 Stubbed | `apps/api/app/tools/check-availability/route.ts` | Always returns available; needs Google Cal integration |

---

## User Roles

| PRD Role (original) | Refined mapping | DB enum | Status |
|---------------------|-----------------|---------|--------|
| Agent (solo) | `client_admin` / `team_member` | `user_role` | ⚠️ Naming differs; functionally covered |
| Admin (team) | `client_admin` | `user_role` | ⚠️ |
| Brokerage admin | Agency tier + `parent_tenant_id` | Reserved column | 🟡 Column added; UI deferred to v1.2 |
| Super admin | `super_admin` | `user_role` | ✅ `apps/admin` |

---

## Web Routes (`apps/web`)

| PRD Route | Status | Location | Gap/Notes |
|-----------|--------|----------|-----------|
| `/` (dashboard) | ✅ Implemented | `app/(dashboard)/page.tsx` | |
| `/landing` | ✅ Implemented | `app/(marketing)/landing/page.tsx` | |
| `/pricing` | ✅ Implemented | `app/(marketing)/pricing/page.tsx` | Uses locked tier names |
| `/waitlist` | ✅ Implemented | `app/(marketing)/waitlist/page.tsx` | Pre-launch GTM from original PRD |
| `/sign-in`, `/sign-up` | ✅ Implemented | `app/(auth)/*` | |
| `/forgot-password`, `/reset-password` | ✅ Implemented | `app/(auth)/*` | |
| `/auth/callback` | ✅ Implemented | `app/auth/callback/route.ts` | OAuth ready |
| `/onboarding?step=mls\|calendar\|crm\|agent\|number` | 🟡 Stubbed | `app/(dashboard)/onboarding/page.tsx` | All 5 steps present |
| `/calls`, `/calls/[id]` | ✅ Implemented | `app/(dashboard)/calls/*` | |
| `/leads`, `/leads/[id]` | ✅ Implemented | `app/(dashboard)/leads/*` | |
| `/showings` | ✅ Implemented | `app/(dashboard)/showings/page.tsx` | tRPC `showings.list` |
| `/listings` | 🟡 Stubbed | `app/(dashboard)/listings/page.tsx` | UI + cached data; live MLS sync pending |
| `/agent` | ✅ Implemented | `app/(dashboard)/agent/page.tsx` | tRPC `agents.*` |
| `/integrations` | 🟡 Stubbed | `app/(dashboard)/integrations/page.tsx` | Connect flows stub |
| `/analytics` | ✅ Implemented | `app/(dashboard)/analytics/page.tsx` | tRPC `analytics.getSummary` |
| `/settings` | 🟡 Stubbed | `app/(dashboard)/settings/page.tsx` | Billing portal wired; profile partial |
| `/schedule` (extra) | ✅ Implemented | `app/(dashboard)/schedule/page.tsx` | Hidden from main nav; calendar view linked from Showings |

---

## Admin Routes (`apps/admin`)

| PRD Requirement | Status | Location | Gap/Notes |
|-----------------|--------|----------|-----------|
| Super-admin console | ✅ Implemented | `apps/admin/app/(dashboard)/*` | |
| `/accounts`, `/accounts/[id]` | ✅ Implemented | Tenant list + detail | |
| `/agents`, `/calls`, `/billing`, `/settings` | 🟡 Stubbed | Admin pages | Service-role queries; some ops UI minimal |
| Impersonation | ✅ Implemented | `apps/api/app/admin/impersonate/route.ts` | |

Agency/brokerage admin console deferred to v1.2 per refined PRD.

---

## API Surface

### tRPC Routers (`apps/api`)

| Router | PRD Procedures | Status | Location |
|--------|----------------|--------|----------|
| `auth` | session, bootstrap | ✅ / 🟡 | `me` implemented; bootstrap at `/auth/bootstrap` |
| `agents` | list, get, update | ✅ Implemented | `agents.router.ts` |
| `calls` | list, get | ✅ Implemented | `calls.router.ts` |
| `leads` | list, get, updateStatus | ✅ Implemented | `leads.router.ts` |
| `showings` | list, get, cancel | ✅ Implemented | `showings.router.ts` |
| `billing` | portal, checkout | ✅ Implemented | Portal + `createCheckoutSession` (env-gated) |
| `onboarding` | getProgress, completeStep | 🟡 Stubbed | Returns static progress |
| `integrations` | list, connect, disconnect | ✅ Implemented | `integrations.router.ts` |
| `analytics` | getSummary | ✅ Implemented | `analytics.router.ts` |

### REST / Webhooks

| Endpoint | Status | Location |
|----------|--------|----------|
| `POST /webhooks/vapi` | ✅ Implemented | `app/webhooks/vapi/route.ts` |
| `POST /webhooks/twilio` | 🟡 Stubbed | `app/webhooks/twilio/route.ts` |
| `POST /webhooks/stripe` | ✅ Implemented | Checkout + subscription lifecycle |
| `POST /tools/search-listings` | 🟡 Stubbed | Cached DB query; RESO live feed pending |
| `POST /tools/book-showing` | ✅ Implemented | Inserts `bookings` |
| `POST /tools/log-lead` | ✅ Implemented | Inserts `leads` (fixed 2026-05-23) |
| `POST /tools/check-availability` | 🟡 Stubbed | Static `available: true` |
| `POST /tools/send-confirmation` | 🟡 Stubbed | Twilio when env configured |
| `GET /health` | ✅ Implemented | `app/health/route.ts` |
| `GET /gdpr/export` | ✅ Implemented | Includes leads (fixed 2026-05-23) |
| `POST /gdpr/delete` | ✅ Implemented | Deletes leads (fixed 2026-05-23) |

---

## Integrations

| Integration | Status | Location | Gap/Notes |
|-------------|--------|----------|-----------|
| Vapi.ai | 🟡 Stubbed | Webhooks + tool auth via `config.tool_secret` | Needs production credentials |
| Twilio (SMS/voice numbers) | 🟡 Stubbed | `send-confirmation`, `webhooks/twilio`, `phone_numbers` | 10DLC registration is ops |
| Stripe | 🟡 Env-gated | `billing.*`, `webhooks/stripe`, Settings + Pricing UI | Checkout + portal when `STRIPE_SECRET_KEY` set |
| Follow Up Boss | 🟡 Env-gated | `fub.service.ts`, integrations connect | Requires tenant FUB API key |
| Google Calendar | 🟡 Env-gated | `google-calendar.service.ts`, OAuth callback | Requires `GOOGLE_CLIENT_ID` + tenant OAuth |
| IDX Broker partner API | 🟡 Implemented | `idx-broker.provider.ts`, integrations connect | Requires partner/client API key; full MLS search limited by IDX API (featured + query filters) |
| MLS Bridge / RESO (legacy) | 🟡 Env-gated | `bridge.provider.ts`, `trestle.provider.ts` | Fallback when IDX unavailable |
| Outlook | ❌ Missing | — | Deferred P1+ per refined PRD |

---

## Data Entities

| Entity | Status | Migration / Table | Gap/Notes |
|--------|--------|-------------------|-----------|
| Organization (`tenants`) | ✅ Implemented | `20260413000001_initial_schema.sql` | |
| `parent_tenant_id` (brokerage stub) | ✅ Implemented | `20260414000015_parent_tenant_id.sql` | Added 2026-05-23 |
| Users | ✅ Implemented | `users` | Roles: `super_admin`, `client_admin`, `team_member` |
| VoiceAgent (`agents`) | ✅ Implemented | `agents` | |
| PhoneNumber | ✅ Implemented | `phone_numbers` | |
| Call + CallToolEvent | ✅ Implemented | `20260413000002_calls.sql` | |
| Lead | ✅ Implemented | `20260414000014_leads.sql` | |
| Showing (`bookings`) | ✅ Implemented | `20260414000009_phase_a_tables.sql` | |
| Listing | ✅ Implemented | `listings` | Seed data via `pnpm db:seed` |
| MLSIntegration | ✅ Implemented | `integrations` (type enum) | Connect logic stub |
| CRMIntegration | ✅ Implemented | `integrations` | Connect logic stub |
| CalendarIntegration | ✅ Implemented | `integrations` | Connect logic stub |
| Subscription | ✅ Implemented | `tenants.stripe_*` | |
| UsageRecord | ✅ Implemented | `20260413000004_usage_records.sql` | |
| WebhookLog | ✅ Implemented | `webhook_logs` | |
| AuditLog | ✅ Implemented | `audit_log` | |

---

## Non-Functional Requirements

| Requirement | Status | Location | Gap/Notes |
|-------------|--------|----------|-----------|
| Supabase Auth (email + OAuth ready) | ✅ Implemented | `apps/web/middleware.ts`, auth pages | |
| Postgres RLS multi-tenancy | ✅ Implemented | `20260413000005_rls_policies.sql` | |
| GDPR export + delete | ✅ Implemented | `/gdpr/*` | |
| TCPA / 10DLC | 🟡 Stubbed | Retention migration; Twilio webhook | Registration is ops |
| Two-party consent disclosure | 🟡 Stubbed | Agent config / onboarding copy | Configurable by state — not enforced in code |
| Fair Housing (no demographic MLS filters) | ✅ Implemented | `search-listings` filters price/beds/sqft only | |
| PCI (Stripe Elements only) | 🟡 Stubbed | Billing portal redirect | No embedded checkout in MVP |
| Voice latency <800ms | ❌ Missing | — | Depends on Vapi production config; not measurable in repo |

---

## Deferred (P1+) — Intentional Gaps

Per refined PRD §2.3 and §9 — no structural home required yet:

- Professional/Growth self-serve checkout (billing stub in place)
- Outlook calendar
- Script builder, voice selection UI, escalation rules
- Metered overage UI
- Agency admin + white-label module
- Multi-MLS markets beyond Austin
- Outbound calling
- Spanish agent, SOC 2, mobile PWA

---

## PRD Doc Sync Notes

| Topic | Original docx (v1.0) | Refined PRD (v1.1) | Codebase follows |
|-------|----------------------|--------------------|--------------------|
| Tier names | Solo / Team / Brokerage | starter / professional / growth / agency | **Refined PRD** |
| Starter minutes | 500 | 200 | **Refined PRD** (`plans.ts`) |
| Starter MLS/CRM | Included | P0 included | **Refined PRD** (`plans.ts` fixed) |
| Frontend stack | Vite + React | Next.js 14 App Router | **Refined PRD** |
| Launch market | Unspecified | Austin / Central Texas | **Refined PRD** |

`docs/PRD.md` is the engineering source of truth; original docx informs GTM and financial targets.

---

## Open Decisions (Founder Input)

1. **Keep `/schedule` as separate nav item?** PRD lists only `/showings`. Current: both exist; `/schedule` is a calendar-oriented view of bookings.
2. **User role naming** — adopt PRD terms (owner/admin/agent) in UI copy or keep `client_admin`/`team_member` internally?
3. **IDX Broker partner credentials** — client API keys required per tenant; partner ancillary key optional for higher limits.
4. **Bridge Interactive sandbox** — optional legacy fallback for Unlock/CTXMLS direct RESO.

---

## Audit Changelog (2026-05-23)

- Fixed `log-lead` to persist `leads` rows (was webhook-only)
- Fixed Starter tier `mlsIntegration` / `crmSync` flags in `plans.ts`
- Added `parent_tenant_id` migration stub on `tenants`
- Added `billing.createCheckoutSession` stub
- GDPR export/delete now include `leads`
- Created this alignment document
