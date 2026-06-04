# Voxori — Product Requirements Document (Refined)

> **Version:** 1.1 (Architect refinement)  
> **Source:** Business Plan & PRD v1.0 (May 2026)  
> **Stack decision:** Next.js 14 App Router modular monolith (Turborepo) — overrides PRD §5.2 Vite/Fastify split for MVP velocity.

---

## 1. Product Summary

**Voxori** is an AI Inside Sales Agent for residential real estate. It answers inbound calls 24/7, qualifies leads, recommends MLS listings, books showings, syncs CRM, and sends SMS follow-ups — at ~5% the cost of a human ISA.

| Attribute | Value |
|-----------|-------|
| **Category** | Vertical SaaS — AI voice for real estate |
| **Primary buyer** | Solo agents → teams → brokerages |
| **North star** | Qualified leads delivered per agent per month (target: 15+ by month 3) |
| **MVP timeline** | 4–6 weeks |

---

## 2. Architect Refinements

### 2.1 Architecture Pattern: Modular Monolith

For a solo-founder MVP, deploy one Turborepo with clear layer boundaries instead of separate Vite + Fastify services:

| Layer | Location | Responsibility |
|-------|----------|----------------|
| **Presentation** | `apps/web`, `apps/admin` | RSC + client components, forms, navigation |
| **Application API** | `apps/api` | tRPC routers, webhooks, voice tool endpoints |
| **Domain** | `packages/shared` | Zod schemas, constants, types |
| **Data** | `packages/database` | Drizzle-style types, Supabase migrations, RLS |

**Rationale:** Single deploy surface on Vercel, shared types, faster iteration. Extract voice worker or MLS sync to background jobs (BullMQ) when call volume exceeds ~1K/day.

### 2.2 Frontend Stack (Updated)

- **Framework:** Next.js 14+ App Router, TypeScript
- **UI:** Tailwind CSS + shadcn/ui (per founder preference)
- **Server state:** tRPC + TanStack Query
- **Forms:** React Hook Form + Zod
- **Auth:** Supabase Auth (email + OAuth ready)

### 2.3 MVP Scope Boundaries

**In scope (P0):**

- Inbound voice via Vapi.ai
- Lead qualification (name, contact, area, budget, beds/baths, timeline, financing)
- **IDX Broker** as primary MLS source of truth (partner integration) — per-tenant API keys in `integrations.credentials`; voice search via `POST /tools/search-listings`
- Legacy RESO feeds (Bridge / Trestle) remain optional regional fallbacks when configured
- Google Calendar booking
- Follow Up Boss CRM sync
- SMS follow-up (Twilio 10DLC)
- Call transcripts & recordings (30-day retention)
- Agent dashboard + onboarding wizard
- Stripe Starter tier ($149/mo) — DB enum `starter`

**Deferred (P1+):** Professional/Growth tiers in self-serve checkout, Outlook, script builder, metered overage UI, agency admin, white-label, multi-MLS, outbound calling.

### 2.4 Multi-Tenancy Model

- `tenants` table = Organization (solo org, team org, brokerage org)
- Postgres RLS via `auth_tenant_id()` on every tenant-scoped table
- Brokerage parent-child orgs: add `parent_tenant_id` in v1.2 (stub column reserved)

---

## 3. User Flows

### 3.1 Caller (End User)

1. Dials agent's Voxori number
2. AI answers <2s with branded greeting
3. Intent detection → buyer/seller/existing/vendor
4. Natural qualification conversation
5. MLS search → 3–5 listing recommendations
6. Calendar booking if interested
7. SMS with listings + confirmation within 60s

### 3.2 Agent Onboarding (<15 min target)

| Step | Route | Action |
|------|-------|--------|
| 1 | `/onboarding?step=mls` | Connect IDX Broker API key (+ optional account ID for partner dashboards) |
| 2 | `/onboarding?step=calendar` | Google Calendar OAuth |
| 3 | `/onboarding?step=crm` | Follow Up Boss API key |
| 4 | `/onboarding?step=agent` | Name, voice, greeting, disclosures |
| 5 | `/onboarding?step=number` | Provision Twilio number or call-forward |
| ✓ | Test call | "Aha moment" — hear agent live |

### 3.3 Daily Agent Use

| Route | Purpose |
|-------|---------|
| `/` | Dashboard KPIs, live call status |
| `/calls`, `/calls/[id]` | Call list + transcript/recording |
| `/leads`, `/leads/[id]` | Qualified leads + CRM sync status |
| `/showings` | Booked appointments |
| `/listings` | Cached MLS inventory |
| `/agent` | Voice agent configuration |
| `/integrations` | MLS, CRM, calendar connections |
| `/analytics` | Qualification & conversion metrics |
| `/settings` | Team invites (admin), billing, phone numbers (Twilio → Vapi import) |

---

## 4. Data Model (MVP Entities)

```
Organization (tenants)
  ├── Users (users) — roles: owner, admin, agent
  ├── VoiceAgent (agents)
  │     └── PhoneNumber (phone_numbers)
  ├── Call (calls) → CallToolEvent
  ├── Lead (leads) — NEW: first-class entity
  ├── Showing (bookings)
  ├── Listing (listings)
  ├── MLSIntegration (integrations type=mls)
  ├── CRMIntegration (integrations type=crm)
  ├── CalendarIntegration (integrations type=calendar)
  ├── Subscription (tenants.stripe_*)
  └── UsageRecord (usage_records)
```

### Lead Entity (added in scaffold)

| Field | Type | Notes |
|-------|------|-------|
| name, phone, email | text | From qualification |
| budget_min, budget_max | numeric | |
| timeline, financing_status | text | |
| area_of_interest, beds, baths | text/int | |
| status | enum | new → qualified → converted |
| crm_sync_state | text | pending, synced, failed |
| call_id | uuid FK | Source call |

---

## 5. API Surface

### 5.1 tRPC Routers (`apps/api`)

| Router | Procedures | Status |
|--------|------------|--------|
| `auth` | me, bootstrap | Implemented / REST bootstrap |
| `agents` | list, get, update | Implemented |
| `calls` | list, get | Implemented |
| `billing` | getUsageSummary, createPortalSession, createCheckoutSession | Portal implemented; checkout stub |
| `leads` | list, get, updateStatus | Implemented |
| `showings` | list, get, cancel | Implemented |
| `onboarding` | getProgress, completeStep | Stub |
| `integrations` | list, connect, disconnect | Stub |

### 5.2 REST / Webhooks

| Endpoint | Purpose |
|----------|---------|
| `POST /webhooks/vapi` | Call lifecycle |
| `POST /webhooks/twilio` | SMS status |
| `POST /webhooks/stripe` | Billing events |
| `POST /tools/search-listings` | Vapi tool |
| `POST /tools/book-showing` | Vapi tool |
| `POST /tools/log-lead` | Vapi tool |
| `POST /tools/check-availability` | Vapi tool |
| `POST /tools/send-confirmation` | Vapi tool |
| `GET /health` | Liveness |

---

## 6. Pricing (Reference)

DB `plan_tier` enum and all user-facing copy use: **starter**, **professional**, **growth**, **agency**.

| Tier (UI / DB) | Price | Agents | Minutes | Overage |
|----------------|-------|--------|---------|---------|
| Starter (`starter`) | $149/mo | 1 | 200 | $0.35/min |
| Professional (`professional`) | $299/mo | 1 | 600 | $0.30/min |
| Growth (`growth`) | $499/mo | 3 | 1,500 | $0.25/min |
| Agency (`agency`) | $999/mo | Unlimited | 4,000 | $0.20/min |

Source of truth for feature flags: `packages/shared/src/constants/plans.ts`.

---

## 7. Non-Functional Requirements

| Metric | Target |
|--------|--------|
| Voice round-trip latency | <800ms |
| Dashboard p95 load | <1.5s |
| MLS sync freshness | ≤15 min (IDX featured + search endpoints; cached in `listings`) |
| SMS after call | <60s |
| Uptime SLA (brokerage) | 99.9% |

---

## 8. Compliance Checklist (MVP)

- [ ] TCPA / 10DLC for SMS
- [ ] Two-party consent recording disclosure (configurable by state)
- [ ] Fair Housing — no demographic filtering in MLS search (price, beds, sqft, ZIP only)
- [ ] IDX display / attribution rules on any consumer-facing listing surfaces (IDX Broker partner terms)
- [ ] PCI — Stripe Elements only
- [ ] CCPA/GDPR export + delete endpoints (`/gdpr/*`)

---

## 9. Roadmap Alignment

| Phase | Timeline | Key deliverables |
|-------|----------|------------------|
| **MVP** | Weeks 1–6 | This scaffold + live Vapi + single MLS + FUB + Google Cal |
| **v1.1** | Weeks 7–12 | Growth tier self-serve, more CRMs, script builder, metered billing |
| **v1.2** | Months 4–6 | Agency admin, white-label, multi-MLS |
| **v2** | Months 7–12 | Spanish agent, outbound, SOC 2 Type I |

---

## 10. Resolved Decisions

1. **Launch MLS source** — IDX Broker (`MLS_MARKET=idx_broker_primary`; tenant `api_key` required; platform `IDX_BROKER_*` env optional). Bridge/Trestle (`austin_central_texas`, `central_texas_ctx`) are legacy fallbacks. Direct Unlock/CTXMLS RESO feeds remain optional/future if enabled on the IDX account.
2. **Plan tier naming** — UI and docs use `starter` / `professional` / `growth` / `agency` (matches DB enum)
3. **Marketing routing** — Unauthenticated `/` redirects to `/landing`; authenticated `/landing` redirects to dashboard `/`

## 11. Open Decisions (Needs Founder Input)

1. **White-label timing** — defer to v1.2 per architect recommendation
