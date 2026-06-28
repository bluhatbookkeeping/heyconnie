# Plan: Luis Mobile Detail — AI Voice Agent (Inbound + Outbound)

## Context
Luis can't answer his phone while detailing cars. The AI voice agent acts as his full-service AI receptionist: recognizes returning customers, explains services, books appointments, runs outbound reminder and rebooking campaigns, redeems promo codes, and requests reviews. This system is built white-label from day one — Luis is client #1.

---

## Architecture

```
Inbound call  → Vapi (telephony + STT/TTS + Claude LLM)
Outbound call ← Vapi triggered by Vercel Cron
                        ↕ tool calls
                Vercel Serverless (Node.js — /api/voice/*)
                        ↕
                Supabase (customers, bookings, promo_codes, call_logs, customer_intel)
                        ↕
                Twilio → SMS to Luis + (future) customer SMS
                Resend  → Email to Luis + customer confirmations + review requests
```

**Why Vapi:** Purpose-built voice AI. Handles telephony, STT, TTS, and tool calling natively. Supports Claude as the LLM. Supports both inbound and outbound calls. Luis gets a real provisioned phone number.

---

## Phone Number
- Vapi number provisioned: **(626) 654-1924** (~$2/mo)
- Update the website to display this number
- Luis's personal cell stays private

---

## Build Status

| Feature | Status |
|---------|--------|
| Supabase schema (multi-tenant) | ✅ Done — Session 13 |
| `/api/voice/lookup-customer` | ✅ Done — Session 13 |
| `/api/voice/get-slots` | ✅ Done — Session 13 |
| `/api/voice/create-booking` | ✅ Done — Session 13 |
| `/api/voice/notify-luis` | ✅ Done — Session 13 |
| `/api/voice/webhook` (post-call intelligence) | ✅ Done — Session 14 |
| Vapi assistant config + system prompt | ✅ Done — Session 29 (assistant ID: 42457be4) |
| Live transfer to Luis | ⚠️ Built — needs phone number attached in Vapi dashboard |
| Customer email confirmation | 🔲 Planned |
| Promo code redemption via voice | 🔲 Planned |
| Outbound: appointment reminders | 🔲 Planned |
| Outbound: rebooking campaigns | 🔲 Planned |
| Outbound: voicemail drop | 🔲 Planned |
| Review request (voice + email) | 🔲 Planned |

---

## Supabase Schema (multi-tenant)

All tables built. Key tables:

- `businesses` — one row per detailer (config, contact, Vapi IDs)
- `customers` — scoped by `business_id`, keyed by phone
- `vehicles` — per customer, keyed by make/model/year
- `bookings` — with `start_datetime`, `end_datetime`, `status`, `source`, `customer_id`
- `call_logs` — every call logged with transcript, outcome, `needs_followup`
- `customer_intel` — per customer: preferences, objections, upsell signals, unanswered questions
- `script_suggestions` — per call, fed by Claude Haiku extraction
- `availability_windows` — Luis's weekly hours (day_of_week, start/end)
- `blocked_dates` — vacation/sick days
- `promo_codes` — code, discount_type (percent/flat), value, expiry, uses_remaining *(to build)*

RLS on all tables scoped by `business_id`. Backend uses service role key only.

**Onboarding a new detailer = one new row in `businesses` + a new Vapi assistant from template. No code change.**

---

## Voice Tool Endpoints (all live)

| Route | Purpose |
|-------|---------|
| `POST /api/voice/lookup-customer` | Query Supabase by caller phone → name, last booking, vehicle |
| `POST /api/voice/get-slots` | Return available time slots for a date + service |
| `POST /api/voice/create-booking` | Write booking, conflict-check, SMS + email Luis |
| `POST /api/voice/notify-luis` | Fire SMS + email for callback requests |
| `POST /api/voice/webhook` | Vapi call end → log call, run Claude Haiku intelligence extraction |

---

## Post-Call Intelligence Engine (live)

On every `end-of-call-report` from Vapi:

1. Log call to `call_logs` (outcome, duration, transcript, `needs_followup`)
2. Fire Claude Haiku 4.5 (prompt-cached) to extract:
   - `preferences` — scheduling/service preferences, communication style
   - `objections` — price concerns, hesitations
   - `unanswered_questions` — gaps the agent couldn't fill
   - `upsell_opportunities` — signals for add-ons or upsells
   - `script_suggestions` — specific improvements to the agent script
3. Upsert to `customer_intel`, insert to `script_suggestions`
4. Calls > 60s with no booking created → `needs_followup = true` (picked up by follow-up cron)

---

## Vapi Assistant (Feature 4 — next to build)

- **LLM:** Claude Sonnet 4.6
- **Voice:** Natural, friendly (e.g., Vapi "Riley" or equivalent)
- **Tools registered:** `lookupCustomer`, `getSlots`, `createBooking`, `notifyLuis`, `transferCall`
- **Config file:** `config/vapi-assistant.js`

**Blocker:** Luis's add-on menu (names + prices) needed before system prompt is final.

---

## Call Flow

**Every call — silent first action:** call `lookupCustomer(callerPhone)` before greeting.

### Returning Customer
> "Hey [Name]! Good to hear from you. Last time we did a [service] on your [year make model]. Are you looking to book another service today, or something different?"

### New Customer
> "Thanks for calling Luis Mobile Detail! I can help you book a service or answer questions. We offer a Just a Wash starting at $45, a Standard Detail at $75, or a Full Detail at $350. What can I help you with?"

### Booking Flow
1. Service → make/model/year → city → date picker via `getSlots` → name + email
2. Promo code ask: *"Do you have a promo code?"* — validate against `promo_codes`, apply discount
3. `createBooking` → read back confirmation including discounted price if applicable
4. Confirmation email sent to customer automatically

### Live Transfer to Luis
If caller says "I want to talk to a real person" or agent hits a question it can't answer:
> "Luis is out detailing right now but let me try to connect you."
→ `transferCall` tool → routes to Luis's personal cell
→ If Luis doesn't pick up → falls back to callback flow

### Callback / Escalation Flow
> "Luis is out detailing right now, but I can have him call you back as soon as he's free. Can I get your name and what you need help with?"
→ `notifyLuis` with `status: callback_requested`

### Upsell Logic (Returning Customers)
When last service was a Wash or Standard Detail:
> "Last time we did a Standard Detail on your [car]. We also do a Full Detail — carpet shampoo, leather conditioning, the works — if you ever want to give it a full refresh. Want to stick with the standard today, or want to hear more?"

One mention, then follow the customer's lead. No hard sell.

---

## Promo Engine (Feature 7 — to build)

Full promotion engine. Not just a coupon field.

### Discount Types
- **Percent off** — e.g. 10% off any service
- **Dollar off** — e.g. $20 off a Full Detail

### Code Types
- **Shared code** — one code, many callers can use (e.g. `SUMMER10`)
- **Unique one-time codes** — batch-generated, each redeemable once (for outbound campaigns)

### Usage Controls
- Unlimited or capped total uses
- One-time-per-customer enforcement (by phone number)
- `valid_from` + `valid_until` date window (both optional)
- Tie a promo to a specific customer (existing or new)

### Supabase Tables
- `promotions` — campaign definition (name, discount, code type, limits, dates)
- `promo_codes` — individual codes, optional `customer_id` for tied promos
- `promo_redemptions` — audit log: every redemption linked to booking + customer

### Voice Flow
Agent asks at end of booking: *"Do you have a promo code?"*
Valid → `validatePromo` tool confirms, discount read back in confirmation.
Invalid/expired → booking continues at standard price, no drama.

### Outbound Integration
Rebooking calls proactively offer a code: *"I can apply a discount right now if you want to book today."*

### Redemption Channels
- Voice (primary)
- Email — customer calls in after receiving a campaign email
- Web form (future)

### API Endpoints
| Route | Purpose |
|-------|---------|
| `GET /api/admin/promos` | List promotions |
| `POST /api/admin/promos` | Create promotion + generate unique codes |
| `PUT /api/admin/promos/:id` | Update / deactivate |
| `POST /api/voice/validate-promo` | Vapi tool: pre-booking validation |

### `api/voice/create-booking.js` changes
Accepts optional `promo_code` → validates, applies discount, marks redeemed, inserts `promo_redemptions` row, includes discount in Luis SMS + email, returns `promo_applied` in response.

### Not in scope yet
Analytics, revenue impact reporting, promo stacking, email distribution of codes (Phase 4).

---

## Outbound Calling (to build)

All outbound calls triggered by Vercel Cron → Vapi outbound API.

### 1. Appointment Reminder Call
**When:** Night before (6pm) for all next-day bookings
**Script:**
> "Hey [Name], this is a reminder from Luis Mobile Detail — you have a [service] scheduled tomorrow at [time] in [city]. Reply 1 to confirm or call [Vapi number] to reschedule."

**Fallback:** If no answer → voicemail drop (pre-recorded clip)
**Cron:** `0 18 * * *` — checks `bookings` where `start_datetime` between now+12h and now+24h and `reminder_sent_at` is null

### 2. Rebooking Campaign Call
**When:** N weeks after a completed booking (configurable per service)
- Just a Wash: 3 weeks
- Standard Detail: 6 weeks
- Full Detail: 8 weeks

**Script:**
> "Hey [Name], it's been about [X weeks] since Luis detailed your [car]. He has some openings coming up — want me to grab a slot for you? I can also apply a loyalty discount if you book today."

**Proactively offers promo code** if one is active for that business.
**Cron:** Daily check for completed bookings past their rebooking window with no subsequent booking.

### 3. Voicemail Drop
If outbound call goes unanswered → Vapi drops a short pre-recorded message:
> "Hey [Name], this is Luis Mobile Detail checking in — just wanted to see if you're due for another detail. Give us a call at [Vapi number] or we'll try you again soon."

### 4. Abandoned Call Follow-Up
`needs_followup = true` calls (> 60s, no booking) trigger an outbound call within 1 hour:
> "Hey, it's Luis Mobile Detail — looks like we got cut off. Want to finish booking your detail? I've got your info ready."

---

## Review Request Flow (to build)

Triggered 24–48 hours after a booking is marked `completed`.

**Step 1 — Outbound call (primary):**
> "Hey [Name], it's Luis Mobile Detail following up on your [service] yesterday. Hope the car is looking great! If you have 30 seconds, leaving us a Google or Yelp review would really help Luis out. Want me to text you the link?"

- If yes → trigger SMS with Google review link
- If they report a problem → flag for Luis, suppress review ask

**Step 2 — Email (fallback or parallel):**
Resend email to customer 48h after completion:
- Subject: "How did we do, [Name]?"
- Body: thank you note, Google review CTA button, Yelp link secondary
- Only sent if no review request via voice yet (or after voice attempt failed)

**Suppression rules:**
- Never ask for a review if the customer expressed dissatisfaction on the call
- Only ask once per booking
- `review_requested_at` column on `bookings` prevents duplicates

---

## Customer Email Confirmation (to build)

On `createBooking` success, send confirmation email to customer via Resend:
- Subject: "Your detail is booked — [date] at [time]"
- Body: service, vehicle, date/time, Luis's number for day-of contact, promo discount applied if any
- Currently: only Luis gets notified. Customer gets nothing.

---

## Luis Notification Format

**Booking:**
```
📞 New Booking — Luis Mobile Detail
Name: [Name] | Phone: [phone]
Service: [service] on [year make model]
City: [city]
Date/Time: [date] at [time]
Promo: [code — discount] or None
Notes: [notes]
```

**Callback request:**
```
📞 Callback Needed — Luis Mobile Detail
Name: [Name] | Phone: [phone]
Question: [summary]
```

---

## Remaining Phases

| Phase | Feature | Notes |
|-------|---------|-------|
| **Feature 4** | Vapi assistant config + system prompt | Needs Luis's add-on menu first |
| **Feature 5** | Live transfer (`transferCall` tool) | One config line in Vapi |
| **Feature 6** | Customer email confirmation | New Resend call in `create-booking.js` |
| **Feature 7** | Full promo engine | 3 Supabase tables + `validate-promo.js` + admin Promotions tab + customer profile promo history |
| **Feature 8** | Outbound reminder calls + cron | Vapi outbound API + Vercel Cron |
| **Feature 9** | Outbound rebooking campaigns | Same infra as reminders, different trigger logic |
| **Feature 10** | Review request flow (voice + email) | Outbound call + Resend email, suppression logic |
| **Feature 11** | Voicemail drop | Vapi outbound config option |
| **Feature 12** | Abandoned call follow-up outbound | Uses `needs_followup` flag from webhook |
| **Feature 13** | Admin panel — promo code management | After manual seed proves it out |

---

## Services + Cost Estimate

| Service | Purpose | Est. Cost |
|---------|---------|-----------|
| Vapi.ai | Voice AI + phone number | ~$0.05–0.10/min + $2/mo |
| Vercel | Serverless functions | Free tier |
| Supabase | Database | Free tier |
| Twilio | SMS to Luis | ~$0.008/SMS |
| Resend | Email (Luis + customers) | Free tier |

**Est. monthly at ~100 calls avg 3 min + 50 outbound:** $20–35/mo

---

## White-Label Resale Pitch

| Feature | Value to a solo detailer |
|---|---|
| Never miss a call | They're under a car 6+ hours/day — every missed call is lost revenue |
| Books while they work | No stopping mid-job |
| Outbound reminders | Cuts no-shows — $75–$350 per ghost |
| Rebooking campaigns | Recurring revenue on autopilot |
| Promo code engine | Run promotions without lifting a finger |
| Review requests | Grows Google/Yelp ranking passively |
| Customer memory | "Hi Maria, same Accord?" feels premium |
| Script feedback | System tells the owner what customers ask that the AI can't answer |

**Pricing story:** Solo detailer doing $5k/mo loses $500–$1k/mo to missed calls + no-shows. A $149/mo AI receptionist that recovers half of that is an obvious yes.

---

## Verification (end-to-end)

- Call as new customer → agent greets, explains services, books → Supabase row created → Luis SMS + email within 10s
- Call again from same number → agent recognizes by name, references last service, offers upsell
- Say "I want to talk to Luis" → live transfer fires
- Mention promo code → discount applied, read back in confirmation
- Complete a booking → customer receives confirmation email
- No-show to call → voicemail drop fires
- Night before appointment → reminder call fires
- 6 weeks after Standard Detail → rebooking call fires
- 48h after completed booking → review request call + email
- Call transcripts and intel visible in Supabase `call_logs` + `customer_intel`
