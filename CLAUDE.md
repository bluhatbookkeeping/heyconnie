# Hey Connie — Platform CLAUDE.md

## Platform Identity
**Hey Connie** is an AI voice receptionist platform for mobile detailers.
Built by Andrew Strauss (BluHat AI).
**heyconnie.co** is the canonical deployment — one codebase, one Vercel project.

Luis Mobile Detail is **Tenant #1** (the pilot). Every feature is built multi-tenant from day one.

## GitHub & Deployment
- **GitHub:** https://github.com/bluhatbookkeeping/heyconnie.git (branch: main)
- **Live URL:** https://heyconnie.co (Vercel auto-deploys on push to main)
- **Vercel project name:** heyconnie
- **Supabase project:** DetailFlow · `kgyipdyhzaypcxcpxqsg`

## What Lives Here
- `api/` — all serverless functions (booking, voice tools, cron jobs, admin endpoints)
- `admin/` — per-tenant admin panel (`admin/index.html`)
- `config/` — Vapi assistant configs (`vapi-assistant.js`, `setup-agent.js`, `basic-agent.js`)
- `scripts/` — deploy scripts (`vapi-setup.js`, `setup-agent-deploy.js`)
- `index.html` — heyconnie.co marketing/signup page
- `cancel.html` — booking cancellation page (used in emails)
- `DB_SCHEMA.md` — authoritative database schema reference

## What Does NOT Live Here
- Luis's customer-facing site (`index.html` with hero, gallery, booking form) — that stays in the `LuisMobileDetailing` GitHub repo / `luis-mobile-detailing.vercel.app` Vercel project for now.

---

## Tenant #1 — Luis Mobile Detail

### Business Info
- **Business:** Luis Mobile Detail (NOT Lewis)
- **Owner:** Luis
- **Business phone:** 626-409-3147
- **Business ID (slug):** `luis-mobile-detail`
- **Service area:** San Gabriel Valley — Pasadena, West Covina, El Monte, Pomona, Alhambra
- **Services:** Just a Wash / Standard Detail / Full Detail
- **Pricing:** $45 / $75 / $350 (starting)

---

## Voice Agent — Connie

### IDs (never recreate these)
- **Connie (customer agent) assistant ID:** `a831eec7-9b7b-4b0c-928c-dea1c3cfd296`
- **Connie phone number:** (626) 654-1924 · Vapi ID: `5c541553-626b-4d99-98f8-a0fd40abb147`
- **Setup agent assistant ID:** `281883e1-ee8a-4603-b5f8-7ddf22894f69`
- **Setup phone number:** (818) 403-3447 · Vapi ID: `6a4eaf0f-cbcc-4463-b149-6d325c9fae41`
- **Twilio sub-account (Hey Connie):** `[see Twilio dashboard]`

### Critical Rules
- **Vapi tool response format:** `{ results: [{ toolCallId, result: JSON.stringify(data) }] }` — NEVER change this
- **After ANY change to `config/vapi-assistant.js`:** run `node scripts/vapi-setup.js` — always PATCH, never create new
- **After ANY change to `config/setup-agent.js`:** run `node scripts/setup-agent-deploy.js` — always PATCH, never create new
- **SMS is off** — A2P registration pending. Twilio number (818) 403-3447 is voice only until A2P clears.

### Architecture
- `config/vapi-assistant.js` — system prompt + tool definitions (`buildSystemPrompt`, `buildAssistantConfig`)
- `scripts/vapi-setup.js` — PATCH-only deploy for Connie
- `scripts/setup-agent-deploy.js` — PATCH-only deploy for setup agent
- `api/voice/` — get-slots.js, create-booking.js, notify-luis.js, validate-address.js, validate-promo.js, webhook.js, call-ended.js, lookup-customer.js
- `api/lookup-customer.js` — NOTE: lives in `api/`, not `api/voice/` (used by both web and voice)
- `api/utils/resolve-business.js` — shared helper; looks up `business_id` from `vapi_assistant_id` in payload
- `api/cron/warmup-voice.js` — pings voice endpoints every 5 min to prevent cold starts

### 7 Active Tools
lookupCustomer · getSlots · createBooking · notifyLuis · validateAddress · validatePromo · transferCall (native Vapi)

### lookupCustomer Returns
`found`, `name`, `vehicles` (array), `last_booking` (service/make/model/year/city — **city = full street address**), `reward_codes`, `available_promos` (array of `{ code, name, description }`)

### Call Flow (returning customer)
1. Caller says name → `lookupCustomer` immediately (no filler before the call)
2. Greet by name, confirm vehicle
3. "Same service as last time — the [service]?"
4. "Are we going back to [street only]?" — reads only the part before the first comma
5. Date → `getSlots` → offer 5 slots by morning/afternoon/evening preference
6. Promo — if `available_promos` has items: offer proactively. If empty: ask ONCE. Move on regardless. NEVER ask twice.
7. `createBooking` → closing (no email/phone collect — already on file)

### Call Flow (new customer)
Service → vehicle → address (confirm street → `validateAddress` for city → "Is that in [city]?") → date/time → promo → `createBooking` → collect email → closing

### create-booking.js Key Facts
- `bookings.email` is nullable — voice bookings may omit it
- If email not passed by Vapi, pulled from `customers` table using resolved customer ID
- make/model/year use `String(x).trim() || null` — handles Vapi passing year as integer
- Accepts both `phone` and `caller_phone` arg names from Vapi

### SPEECH Rule (in system prompt)
Ave → Avenue · St → Street · Rd → Road · Blvd → Boulevard · Dr → Drive · Pl → Place · Ct → Court · Ln → Lane · Hwy → Highway. Never abbreviate.

### Andrew's Test Info
- Phone: 415-279-4984
- Customer ID: `c9187770-ab95-44d8-afde-29d75e33553d`
- Vehicles: Acura ILX 2020, BMW 1 Series 2020, Tesla Model Y 2020
- Last booking: Standard Detail at 989 Winston Ave San Marino, California 91108, USA

---

## Multi-Tenant Architecture

### Current State (post Phase 3)
The system is fully multi-tenant in code. No hardcoded `BUSINESS_ID = 'luis-mobile-detail'` remains in `api/voice/` or `api/cron/`. The `businesses` table drives all routing.

**Webhook routing:** `api/voice/webhook.js` and `api/voice/call-ended.js` resolve `business_id` from `vapi_assistant_id` via `api/utils/resolve-business.js`. Fallback to `'luis-mobile-detail'` if no match (safety net during transition).

**Cron jobs:** All cron jobs loop over `businesses` rows and process each tenant independently.

**Tool calls:** All voice tool endpoints accept `business_id` from request body rather than hardcoded constants.

### Adding a Second Detailer (manual process)
1. Create their `businesses` row with a new `business_id` slug
2. Clone Connie's Vapi assistant in the Vapi dashboard — update `business_id` in the system prompt
3. Buy a Twilio number, assign to their assistant in Vapi
4. Set `vapi_assistant_id` on their `businesses` row to the new assistant ID
5. Their calls now route to their data automatically via the webhook lookup

### businesses Table Key Columns
`id` (slug) · `vapi_assistant_id` · `timezone` · `base_url` · `owner_phone` · `transfer_number` · `google_review_url` · `yelp_review_url` · `email` · `features` (JSONB: `{ chat, voice, marketing }`)

---

## Env Vars (Vercel — heyconnie project)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `RESEND_API_KEY`
- `NOTIFICATION_EMAIL`
- `ADMIN_SECRET`
- `VAPI_API_KEY`
- `VAPI_ASSISTANT_ID` = `a831eec7-9b7b-4b0c-928c-dea1c3cfd296`
- `VAPI_PHONE_NUMBER_ID` = `5c541553-626b-4d99-98f8-a0fd40abb147`
- `GOOGLE_MAPS_API_KEY`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER`

---

## API Endpoints (live)
- `POST /api/book` — saves booking, sends emails, conflict-checks, validates + redeems promo codes
- `GET /api/slots?date=YYYY-MM-DD&service=&business=` — available slots
- `POST /api/admin/hours` — upserts weekly hours (header: `x-admin-secret`)
- `GET /api/unsubscribe?cid=&type=loyalty` — loyalty unsubscribe
- `GET /api/lookup-customer` — customer match + reward codes (web form)
- `POST /api/chat` — AI chat widget (Claude Sonnet 4.6)
- `POST /api/detailer-signup` — new detailer onboarding (creates businesses row, sends welcome email)
- `POST /api/voice/webhook` — Vapi webhook (tool calls + end-of-call)
- `POST /api/voice/call-ended` — post-call processing

## Cron Jobs (13 total — all in vercel.json)
`complete-bookings` · `daily-paid-nudge` · `send-campaigns` · `warmup-voice` · `loyalty-reward-nudge` · `outbound-reminders` · `outbound-rebooking` · `review-requests` · `abandoned-followup` · `weather-trigger` · `rebooking-email` · `review-drip` · `activation-nudge`

---

## Phase Roadmap
See `master-build-playbook-v2.md` for the full sequenced plan.

- **Phase 4** — Consolidation (this session) ✅
- **Phase 5** — Manually onboard second detailer, prove multi-tenant works end-to-end
- **Phase 6** — Voice-first onboarding (new detailers set up their agent by phone via setup agent)
- **Phase 7** — Multi-tenant admin dashboard (one login, switch businesses)

---

## Rules for This Project
- **No frameworks** — all API files are plain Node.js serverless functions
- **Surgical edits only** — system is live, change only what's asked
- **Never deploy to production** without Andrew confirming (Vercel auto-deploys on push to main)
- **Never write SQL against a guessed schema** — read `DB_SCHEMA.md` first
- **Before DELETE/UPDATE/migration:** query `information_schema` first, show FK graph, wait for approval
- **RLS on every table** — no exceptions
- **Secrets in .env always** — never hardcoded, never committed

## Session Log
See `PROGRESS.md` for full session history.
