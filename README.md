# Voxori

AI-powered voice agent platform for small businesses.

## Structure

```
apps/
  web/      # Client portal — [tenant].voxori.com
  admin/    # Super-admin dashboard — admin.voxori.com
  api/      # Edge API — api.voxori.com
packages/
  database/ # Supabase client, types, migrations
  shared/   # Zod schemas, TypeScript types, constants
  config/   # Shared tsconfig, ESLint, Tailwind preset
```

## Getting Started

```bash
pnpm install
pnpm dev
```

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Auth + DB:** Supabase (Postgres + RLS)
- **API:** tRPC
- **UI:** shadcn/ui + Tailwind CSS
- **Voice:** Vapi.ai + ElevenLabs + Twilio
- **Billing:** Stripe
- **Build:** Turborepo + pnpm
