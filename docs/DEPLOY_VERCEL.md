# Deploy to Vercel (MVP)

> **Hosting decision:** Vercel MVP (confirmed) — three Next.js apps + Supabase. See [ARCHITECTURE.md §8](./ARCHITECTURE.md#8-hosting-strategy-mvp) and [LAUNCH_PLAYBOOK.md Phase 1](./LAUNCH_PLAYBOOK.md#phase-1-staging--prod-infrastructure).

---

## 1. Three Vercel projects (monorepo)

Create **separate Vercel projects** linked to the same Git repo. Do not deploy a single project for the whole monorepo.

| Vercel project | Root directory | Production domain (example) |
|----------------|----------------|----------------------------|
| `voxori-web` | `apps/web` | `app.voxori.com` |
| `voxori-admin` | `apps/admin` | `admin.voxori.com` |
| `voxori-api` | `apps/api` | `api.voxori.com` |

**Vercel project settings (each app):**

- **Framework preset:** Next.js
- **Root Directory:** as above (override default repo root)
- **Build command:** leave default (`next build`) or monorepo-aware if you add Turbo later
- **Install command:** `pnpm install` (enable pnpm in project settings; Node 20+)
- **Include source files outside Root Directory:** enabled (required for `packages/*` workspace deps)

**Cron:** Only the **API** project needs `apps/api/vercel.json` (already in repo). Vercel Cron requires a **Pro** plan or higher on the API project.

---

## 2. Required environment variables

Copy from [`.env.example`](../.env.example) and per-app `apps/*/.env.local.example`. **Never commit secrets.**

### `apps/web` (agent portal)

| Variable | Required | Notes |
|----------|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Cloud Supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Public anon key |
| `NEXT_PUBLIC_APP_URL` | Yes | `https://app.voxori.com` |
| `NEXT_PUBLIC_API_BASE_URL` | Yes | **Public API URL** — `https://api.voxori.com` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | If billing | Stripe publishable key |
| `NEXT_PUBLIC_DEFAULT_TENANT_ID` | Optional | Dev/design-partner only |

### `apps/admin` (super admin)

| Variable | Required | Notes |
|----------|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Same cloud project |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-side admin operations |
| `NEXT_PUBLIC_ADMIN_URL` | Yes | `https://admin.voxori.com` |
| `NEXT_PUBLIC_API_BASE_URL` | Yes | `https://api.voxori.com` |
| `NEXT_PUBLIC_ADMIN_API_SECRET` | Yes | Must match API `ADMIN_API_SECRET` |
| `ADMIN_API_SECRET` | Yes | Server-side impersonation calls |

### `apps/api` (tRPC, webhooks, voice tools, cron)

| Variable | Required | Notes |
|----------|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Webhooks + cron use service role |
| `API_BASE_URL` | **Yes** | **Must be the public API domain** — `https://api.voxori.com`. Vapi HTTP tools and OAuth callbacks use this. |
| `VOXORI_API_URL` | Optional | Alias; defaults to `API_BASE_URL` in tooling |
| `NEXT_PUBLIC_APP_URL` | Yes | Web origin for redirects |
| `INTERNAL_API_SECRET` | Yes | Internal + manual cron auth |
| `CRON_SECRET` | Yes (prod) | Vercel Cron sends `Authorization: Bearer $CRON_SECRET`. Can equal `INTERNAL_API_SECRET`. |
| `CREDENTIALS_ENCRYPTION_KEY` | Yes (prod) | `openssl rand -base64 32` — do not rely on fallback |
| `ADMIN_API_SECRET` | Yes | Admin impersonation |
| `VAPI_API_KEY` | Yes | Voice provisioning |
| `VAPI_WEBHOOK_SECRET` | Yes | `/webhooks/vapi` |
| `STRIPE_SECRET_KEY` | If billing | |
| `STRIPE_WEBHOOK_SECRET` | If billing | |
| `TWILIO_ACCOUNT_SID` | Telephony | |
| `TWILIO_API_KEY` / `TWILIO_API_SECRET` | Telephony | Or `TWILIO_AUTH_TOKEN` |
| `TWILIO_PHONE_NUMBER` | SMS | Platform fallback FROM |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Calendar | |
| `GOOGLE_OAUTH_REDIRECT_URI` | Calendar | `https://api.voxori.com/integrations/google/callback` |
| `MLS_MARKET` | MLS | Default `idx_broker_primary` |
| `IDX_BROKER_API_KEY` | Optional | Platform default; tenants can override in UI |

Redeploy **all three apps** after changing any `NEXT_PUBLIC_*` variable (baked at build time).

---

## 3. DNS

Point custom domains in each Vercel project:

- `app.voxori.com` → web project
- `admin.voxori.com` → admin project
- `api.voxori.com` → api project

---

## 4. Cron jobs (API project only)

`apps/api/vercel.json` defines:

| Path | Schedule | Purpose |
|------|----------|---------|
| `/cron/mls-sync` | `*/15 * * * *` | Sync IDX listings cache |
| `/cron/crm-retry` | `0 * * * *` | Retry failed FUB syncs |
| `/cron/post-call-sms` | `*/5 * * * *` | Retry SMS outbox |

After deploy:

1. Set `CRON_SECRET` on the API project.
2. Open Vercel → API project → Cron → confirm three jobs listed.
3. Check function logs for 200 responses.

Manual test (POST):

```bash
curl -X POST "https://api.voxori.com/cron/mls-sync" \
  -H "x-voxori-internal-secret: $INTERNAL_API_SECRET"
```

---

## 5. Post-deploy smoke

- [ ] `GET https://api.voxori.com/health` → 200
- [ ] Web sign-in loads; tRPC calls succeed (no CORS/API URL mismatch)
- [ ] Admin sign-in loads (super_admin user in Supabase)
- [ ] Supabase Auth redirect URLs include web + admin production URLs
- [ ] Vapi webhook URL → `https://api.voxori.com/webhooks/vapi`
- [ ] Re-provision Vapi assistants so tool URLs use production `API_BASE_URL`

Full launch sequence: [LAUNCH_PLAYBOOK.md](./LAUNCH_PLAYBOOK.md).

---

## Related docs

| Doc | Topic |
|-----|--------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Hosting strategy + deferral triggers |
| [LAUNCH_PLAYBOOK.md](./LAUNCH_PLAYBOOK.md) | Phase 1 Supabase, telephony, E2E |
