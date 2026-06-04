# Feature audit matrix (actions vs backend)

This document maps each user-facing surface to its data and integration layer. Use it to spot stubs, missing webhooks, or UI that over-promises behavior. Update when features change.

**See also:** [PRD Alignment Matrix](./PRD_ALIGNMENT.md) for requirement-level status.

## Web app (`apps/web`, port 3000)

| Area | User actions | Backend / data path | Notes |
|------|----------------|---------------------|--------|
| Auth | Sign in, sign up, forgot/reset password | Supabase Auth; [middleware](apps/web/middleware.ts) public routes | OAuth callback: `/auth/callback` route |
| Marketing `/landing` | View homepage, CTA to sign-up | Static/marketing RSC | Unauthenticated `/` redirects here |
| Pricing `/pricing` | View tiers; Starter CTA checkout | `plans.ts`, tRPC `billing.createCheckoutSession` | Signed-out → sign-up; signed-in → Stripe |
| Waitlist `/waitlist` | Pre-launch email capture | `POST /waitlist` → `waitlist_entries` | Implemented |
| Dashboard `/` | View KPIs, onboarding checklist, recent calls | tRPC `analytics.getSummary` (30d KPIs), `calls.list` (recent) | Empty state links to `/onboarding`, `/agent`, `/settings` |
| Onboarding `/onboarding` | 5-step wizard (MLS, calendar, CRM, agent, number) | tRPC `onboarding.*`, `integrations.*` | Wired — progress persisted in `onboarding_steps` |
| My Agent `/agent` | Configure agent | tRPC `agents.*` | Implemented |
| Calls `/calls` | Filter, paginate, open detail | tRPC `calls.list` | Detail: `/calls/[id]` uses `calls.get` |
| Call detail `/calls/[id]` | Transcript, recording, workflow timeline | tRPC `calls.get` + `call_tool_events` | Populated from Vapi `function-call` webhook + voice tool routes |
| Leads `/leads` | List, filter, open detail | tRPC `leads.list`, `leads.get` | Implemented |
| Lead detail `/leads/[id]` | View qualification fields, CRM sync state | tRPC `leads.get`, `leads.updateStatus` | Implemented |
| Showings `/showings` | List, cancel appointments | tRPC `showings.list`, `showings.cancel` | Confirm dialog on cancel |
| Schedule `/schedule` | Calendar view of upcoming/past showings | Supabase `bookings` direct query | GCal CTA → `/integrations` |
| Listings `/listings` | View cached MLS inventory | Supabase `listings` + `integrations.type` | Cron `mls-sync` from IDX Broker or legacy feeds |
| Integrations `/integrations` | Connect IDX Broker MLS, CRM, calendar | tRPC `integrations.*` | IDX API key + market selector; OAuth for Google Calendar |
| Analytics `/analytics` | Metrics from recent calls | tRPC `analytics.getSummary` | Qualification + booking rates, avg duration |
| Settings `/settings` | Team invites, billing, phone CRUD + Vapi sync | tRPC `team.*`, `billing.*`, `phoneNumbers.*` | Admins invite via Supabase email; phones import to Vapi when Twilio+Vapi configured |
| Invite accept `/invite/accept` | Join workspace from email link | `POST /invites/accept` | Public route; requires session matching invite email |

## Admin app (`apps/admin`, port 3001)

| Area | User actions | Backend / data path | Notes |
|------|----------------|---------------------|--------|
| Auth | Sign in | Supabase; [middleware](apps/admin/middleware.ts) requires `super_admin` | |
| Root `/` | Redirect | → `/accounts` | |
| Accounts `/accounts` | List tenants | Supabase service role `tenants` | |
| Account detail `/accounts/[id]` | View tenant, impersonate | [Impersonate API](apps/api/app/admin/impersonate/route.ts) | Needs `NEXT_PUBLIC_API_BASE_URL`, admin secret |
| Agents `/agents` | Manage agents across tenants | Service role queries | |
| Calls `/calls` | Admin call visibility | Service role / admin queries | |
| Billing `/billing` | Cross-tenant billing ops | Stripe + DB | |
| Settings `/settings` | Admin configuration | Env-driven / DB | |

## API (`apps/api`, port 3002)

| Surface | Role |
|---------|------|
| `/trpc/[trpc]` | App router: `auth`, `agents`, `calls`, `billing`, `leads`, `showings`, `onboarding`, `integrations`, `analytics`, `phoneNumbers`, `team` |
| `/health` | Liveness JSON |
| `/webhooks/vapi` | Vapi lifecycle — calls, usage, `call_tool_events`, post-call SMS (env-gated) |
| `/webhooks/twilio` | SMS status (stub) |
| `/webhooks/stripe` | Billing events (checkout + subscriptions) |
| `/tools/search-listings` | Vapi MLS search — IDX Broker live + cache + legacy fallback |
| `/tools/book-showing` | Vapi booking — inserts `bookings` |
| `/tools/log-lead` | Vapi lead capture — inserts `leads` |
| `/tools/check-availability` | Calendar check (stub — always available) |
| `/tools/send-confirmation` | Twilio SMS when configured |
| `/gdpr/export`, `/gdpr/delete` | CCPA/GDPR data export and tenant deletion |
| `/recordings/*` | Recording storage migration / fetch |
| `/auth/bootstrap` | Session bootstrap |
| `POST /invites/accept` | Accept team invitation (Bearer + token) |
| `POST /waitlist` | Public waitlist signup → `waitlist_entries` |
| `POST /cron/mls-sync` | Background MLS listing sync (per-tenant IDX / legacy credentials) |
| `POST /cron/crm-retry` | Retry failed CRM syncs |

## How to use this

1. For each row, confirm the UI action triggers a real mutation or query (network tab or logs).
2. Mark **stub** if the UI exists but the handler is a no-op or returns static data.
3. Align copy and CTAs with actual behavior to avoid “dead features” from a user perspective.
4. Run a full PRD audit via [PRD_ALIGNMENT.md](./PRD_ALIGNMENT.md) when scope changes.
