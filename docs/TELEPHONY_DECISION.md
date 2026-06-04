# Telephony production checklist

Voxori routes inbound voice through **Twilio** numbers imported into **Vapi**, linked to each agent’s `vapi_assistant_id`. Outbound SMS (post-call summary, tool confirmations) uses the tenant’s active `phone_numbers` row when set, otherwise `TWILIO_PHONE_NUMBER`.

## Architecture decision

| Layer | Responsibility |
|-------|----------------|
| Twilio | Own the phone number, SMS/voice carrier, 10DLC registration |
| Vapi | Voice AI, inbound call webhooks, assistant binding |
| Voxori API | Import number to Vapi on `phoneNumbers.create`, store `vapi_phone_id` |
| Agent portal | Settings → Phone Numbers: E.164 + Twilio SID + agent |

We do **not** purchase numbers from the dashboard. Ops buys in Twilio Console, then registers in Settings.

## Environment variables (API)

Required for voice + SMS in production:

```bash
VAPI_API_KEY=
VAPI_WEBHOOK_SECRET=

TWILIO_ACCOUNT_SID=
# Prefer API key pair (recommended by Vapi for import):
TWILIO_API_KEY=
TWILIO_API_SECRET=
# Or legacy auth token:
TWILIO_AUTH_TOKEN=

# Platform fallback SMS/voice FROM when tenant has no active phone_numbers row:
TWILIO_PHONE_NUMBER=
```

Also ensure each agent is provisioned with a Vapi assistant (`agents.config.vapi_assistant_id`) before linking a number.

## Pre-launch checklist (ops)

### 1. Twilio

- [ ] Create / verify Twilio account and billing
- [ ] Buy a US local number (or port existing)
- [ ] Note **Phone Number SID** (`PN…`) and E.164 value
- [ ] Create **API Key + Secret** (Console → API keys) scoped to this account
- [ ] Register brand + campaign for **10DLC** if sending SMS to US mobiles
- [ ] Configure messaging service or campaign on the number (after 10DLC approval)

### 2. Vapi

- [ ] Production `VAPI_API_KEY` in API env
- [ ] Webhook URL points to `https://api.<domain>/webhooks/vapi` with `VAPI_WEBHOOK_SECRET`
- [ ] Assistants created per agent (onboarding / admin provisioning)

### 3. Voxori app

- [ ] Run migration `20260420000020_launch_blockers.sql`
- [ ] Settings → Phone Numbers → Add number (E.164 + Twilio SID + agent)
- [ ] Confirm **Vapi** column shows **Linked** (or read `vapi_sync_error` and fix credentials)
- [ ] Place test inbound call to the number
- [ ] Confirm post-call SMS uses tenant FROM (check Twilio message logs)

### 4. Compliance

- [ ] Call recording / AI disclosure per state brokerage rules
- [ ] SMS consent captured on calls (`consent_given`) before post-call texts
- [ ] Privacy policy mentions AI phone agent + SMS

## Manual test steps (staging)

1. Set all Twilio + Vapi env vars on `apps/api`.
2. Provision agent with `vapi_assistant_id` (Agent page or admin).
3. Create phone number in Settings with real E.164 + `PN…` SID.
4. Call the number → Vapi webhook creates `calls` row.
5. Complete call with consent → verify SMS from tenant number (or fallback).
6. Tool `send-confirmation` during live call → SMS FROM matches tenant active number.

## Troubleshooting

| Symptom | Likely cause |
|---------|----------------|
| Sync failed: invalid username | Use `TWILIO_API_KEY` + `TWILIO_API_SECRET`, not mismatched SID |
| Agent has no Vapi assistant | Run agent provisioning first |
| Inbound call not answered | Number not imported in Vapi or wrong `assistantId` |
| SMS not sent | Missing Twilio env, no consent, or 10DLC blocked |
| Wrong SMS sender | No active `phone_numbers` row; falls back to `TWILIO_PHONE_NUMBER` |

## Ops-only (not in app)

- 10DLC brand/campaign approval timelines (days–weeks)
- Twilio Console number purchase and porting
- Vapi dashboard manual edits (prefer app import for consistency)
- CNAM / SHAKEN/STIR for outbound identity
