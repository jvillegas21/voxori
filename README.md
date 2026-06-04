# Voxori

Voice AI inside sales for residential real estate: answers calls 24/7, qualifies leads, searches IDX/MLS listings, books showings, and syncs to your CRM—powered by [Vapi](https://vapi.ai) telephony and per-tenant integrations.

## Monorepo

| Path | Role |
|------|------|
| `apps/web` | Agent dashboard (`localhost:3000`) |
| `apps/admin` | Super-admin (`localhost:3001`) |
| `apps/api` | tRPC, webhooks, Vapi tools (`localhost:3002`) |
| `packages/database` | Supabase client, migrations |
| `packages/shared` | Zod schemas, constants, env helpers |
| `packages/config` | Shared TS/Tailwind/ESLint |

## Prerequisites

- **Node.js 20+**, **pnpm 9+**
- **Docker Desktop** (local Supabase) or a Supabase cloud project
- **Supabase CLI** (`pnpm db:*` scripts)

## Quick start

```bash
pnpm install
pnpm db:local          # Docker Supabase (or use cloud keys in env)
cp .env.local.example apps/web/.env.local
cp .env.local.example apps/api/.env.local
cp .env.local.example apps/admin/.env.local
pnpm db:reset && pnpm db:seed && pnpm db:types
pnpm dev
```

Copy from [`.env.example`](.env.example) and each app’s `apps/<app>/.env.local.example`. **Never commit** `.env`, `.env.local`, or real API keys.

| App | URL |
|-----|-----|
| Web | http://localhost:3000 |
| Admin | http://localhost:3001 |
| API | http://localhost:3002 |

Signed-out `/` redirects to `/landing`. Dashboard routes require auth.

## Scripts

| Command | Purpose |
|---------|---------|
| `pnpm dev` | All apps (syncs local Supabase env when running) |
| `pnpm build` | Production build |
| `pnpm db:local` | Start local Supabase |
| `pnpm db:reset` | Migrate + reset local DB |
| `pnpm db:seed` | Dev sample leads/listings |
| `pnpm db:migrate:remote` | Push migrations to linked cloud project |

## Documentation

- [Launch playbook](docs/LAUNCH_PLAYBOOK.md)
- [Deploy on Vercel](docs/DEPLOY_VERCEL.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Product requirements](docs/PRD.md)
- [Vapi + IDX buyer flow](docs/VAPI_IDX_BUYER_FLOW.md)
- [Telephony checklist](docs/TELEPHONY_DECISION.md)

## Stack

Next.js (App Router), tRPC, Supabase (Postgres + Auth), Stripe, Vapi, Twilio, IDX Broker / MLS providers, Turborepo.

## Production checklist

1. Apply migrations: `pnpm db:migrate:remote`
2. Set Vercel env from `.env.example` (Supabase, Vapi, Twilio, Stripe, `CREDENTIALS_ENCRYPTION_KEY`, public app URLs)
3. Telephony: number, 10DLC, import in Settings → Phone Numbers ([docs](docs/TELEPHONY_DECISION.md))
4. Smoke-test: inbound call, lead capture, post-call SMS, billing

## License

Proprietary — All rights reserved.
