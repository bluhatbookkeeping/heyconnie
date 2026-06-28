# Luis Mobile Detail — Database Schema

**Supabase project:** DetailFlow · `kgyipdyhzaypcxcpxqsg`
**Business ID (constant):** `luis-mobile-detail`
**Auth:** Supabase Auth (JWT). RLS active on all tables.
**Last verified:** 2026-06-25 against live DB via Supabase MCP.

> This document is the authoritative reference for agents building new features.
> Never write SQL against a guessed schema — read this first.
> To re-verify: query `information_schema.columns WHERE table_schema = 'public'`.

---

## Table Index

| Table | Rows | Purpose |
|---|---|---|
| `businesses` | 1 | One row per tenant. Luis is the pilot. |
| `customers` | 5 | People who have booked or called. |
| `vehicles` | 7 | Cars per customer. |
| `bookings` | 20 | Every booking from web form or voice agent. |
| `services` | 3 | Service catalog (name, price, duration). |
| `availability_windows` | 5 | Luis's weekly recurring schedule. |
| `blocked_dates` | 0 | One-off days Luis is unavailable. |
| `promotions` | 2 | Discount campaigns (shared or unique codes). |
| `promo_codes` | 0 | Individual unique codes tied to a promotion. |
| `promo_redemptions` | 0 | Audit log of every promo applied to a booking. |
| `loyalty_programs` | 3 | Punch card config per business. |
| `loyalty_punches` | 1 | One row per completed booking that earned a punch. |
| `loyalty_reminders` | 0 | Drip email log for reward codes (30/60/90/180 days). |
| `campaigns` | 0 | Outbound marketing blasts (email/SMS/Vapi). |
| `campaign_sends` | 0 | One row per customer per channel per campaign. |
| `call_logs` | 2 | Every inbound voice call through Vapi. |
| `call_exchanges` | 1 | Q&A pairs extracted from call transcripts (learning loop). |
| `golden_responses` | 1 | Approved answers synced to Connie's knowledge base. |
| `knowledge_base` | 0 | Manually entered static Q&A per business. |
| `outbound_calls` | 0 | Log of every outbound Vapi call fired. |
| `customer_intel` | 0 | AI-extracted preferences/objections per customer. |
| `activation_nudges` | 0 | Drip log — one row per milestone per channel per business. |
| `script_suggestions` | 0 | AI-suggested prompt improvements per call. |

---

## businesses

One row per tenant. Luis's row has `id = 'luis-mobile-detail'`.

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | TEXT PK | NO | Slug, e.g. `'luis-mobile-detail'` |
| `name` | TEXT | NO | Display name |
| `phone` | TEXT | YES | Business phone |
| `email` | TEXT | YES | Contact email |
| `instagram` | TEXT | YES | |
| `google_review_url` | TEXT | YES | |
| `yelp_review_url` | TEXT | YES | |
| `service_area` | TEXT | YES | Free-text description of coverage area |
| `features` | JSONB | YES | Feature flags: `{ chat: bool, voice: bool, marketing: bool }` — default all false |
| `owner_name` | TEXT | YES | |
| `address` | TEXT | YES | |
| `city` | TEXT | YES | |
| `state` | TEXT | YES | |
| `zip` | TEXT | YES | |
| `timezone` | TEXT | YES | Default `'America/Los_Angeles'` |
| `base_url` | TEXT | YES | Public site URL (used in cancel links, email footers) |
| `owner_phone` | TEXT | YES | Owner's personal cell — setup agent caller ID and Connie transfer fallback |
| `transfer_number` | TEXT | YES | Phone number Connie transfers to |
| `vapi_assistant_id` | TEXT | YES | Vapi assistant ID (used for multi-tenant lookup) |
| `vapi_knowledge_file_id` | TEXT | YES | File ID of current knowledge base uploaded to Vapi |
| `last_knowledge_sync` | TIMESTAMPTZ | YES | When Connie's knowledge was last synced |
| `activation_opted_out` | BOOLEAN | YES | Default false. Set by `/api/unsubscribe-nudge`. Stops activation drip. |
| `created_at` | TIMESTAMPTZ | YES | Default now() |

---

## customers

One row per unique phone number per business.

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | UUID PK | NO | gen_random_uuid() |
| `business_id` | TEXT FK → businesses.id | NO | |
| `phone` | TEXT | NO | E.164 format, e.g. `'+14152794984'` |
| `name` | TEXT | YES | |
| `email` | TEXT | YES | May be absent for voice-only customers |
| `sms_opt_out` | BOOLEAN | YES | Default false |
| `loyalty_unsubscribed` | BOOLEAN | NO | Default false. Set by `/api/unsubscribe`. |
| `created_at` | TIMESTAMPTZ | YES | Default now() |

**Lookup pattern:** normalize to last 10 digits, use `.filter('phone', 'ilike', '%{last10}%')`

---

## vehicles

One row per unique make/model/year per customer.

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | UUID PK | NO | |
| `business_id` | TEXT FK → businesses.id | NO | |
| `customer_id` | UUID FK → customers.id | NO | |
| `make` | TEXT | YES | e.g. `'Tesla'` |
| `model` | TEXT | YES | e.g. `'Model Y'` |
| `year` | TEXT | YES | Stored as string, e.g. `'2020'` |
| `notes` | TEXT | YES | |
| `created_at` | TIMESTAMPTZ | YES | Default now() |

---

## bookings

One row per booking from either the web form or voice agent.

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | UUID PK | NO | uuid_generate_v4() |
| `business_id` | TEXT FK → businesses.id | NO | |
| `customer_id` | UUID FK → customers.id | YES | |
| `name` | TEXT | NO | Customer name at time of booking |
| `phone` | TEXT | NO | |
| `email` | TEXT | YES | Nullable — voice bookings may omit |
| `city` | TEXT | YES | Full address or city. Voice stores full street address. |
| `make` | TEXT | YES | |
| `model` | TEXT | YES | |
| `year` | TEXT | YES | |
| `service` | TEXT | YES | Must match a `services.name` value |
| `condition` | TEXT[] | YES | Array of condition tags (e.g. `['pet hair', 'heavy soiling']`) |
| `notes` | TEXT | YES | |
| `preferred_date` | DATE | YES | Date string from web form |
| `preferred_time` | TIME | YES | Mapped from preference label: `'08:00'` / `'12:00'` / `'17:00'` |
| `start_datetime` | TIMESTAMPTZ | YES | Exact slot (when slot picker used) |
| `end_datetime` | TIMESTAMPTZ | YES | Computed from start + service duration |
| `status` | TEXT | YES | Default `'new'`. Values: `'new'` / `'confirmed'` / `'completed'` / `'cancelled'` |
| `source` | TEXT | YES | Default `'form'`. Values: `'form'` / `'voice'` |
| `cancel_token` | UUID | YES | Default gen_random_uuid(). Used in cancel URL. |
| `completed_at` | TIMESTAMPTZ | YES | Set when status → completed |
| `reminder_sent_at` | TIMESTAMPTZ | YES | Appointment reminder email timestamp |
| `review_requested_at` | TIMESTAMPTZ | YES | Review request email timestamp |
| `review_drip_sent_at` | TIMESTAMPTZ | YES | Review drip follow-up timestamp |
| `created_at` | TIMESTAMPTZ | YES | Default now() |

---

## services

Service catalog — what Luis offers, with pricing and duration.

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | UUID PK | NO | |
| `business_id` | TEXT FK → businesses.id | NO | |
| `name` | TEXT | NO | `'Just a Wash'` / `'Standard Detail'` / `'Full Detail'` |
| `duration_minutes` | INTEGER | NO | Used for slot conflict checking |
| `starting_price` | NUMERIC | NO | Starting price in dollars |
| `created_at` | TIMESTAMPTZ | YES | Default now() |

---

## availability_windows

Luis's recurring weekly schedule. One row per day of week.

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | UUID PK | NO | |
| `business_id` | TEXT FK → businesses.id | NO | |
| `day_of_week` | SMALLINT | NO | 0 = Sunday … 6 = Saturday |
| `start_time` | TIME | NO | e.g. `'08:00'` |
| `end_time` | TIME | NO | e.g. `'17:00'` |

**Unique constraint:** `(business_id, day_of_week)` — upsert-safe.

---

## blocked_dates

One-off days Luis is unavailable (holidays, personal days).

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | UUID PK | NO | |
| `business_id` | TEXT FK → businesses.id | NO | |
| `blocked_date` | DATE | NO | |
| `reason` | TEXT | YES | |

---

## promotions

Discount campaigns. Two code types: `shared` (one code everyone uses) or `unique` (one code per customer).

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | UUID PK | NO | |
| `business_id` | TEXT FK → businesses.id | NO | |
| `name` | TEXT | NO | e.g. `'Summer 10% Off'` |
| `discount_type` | TEXT | NO | `'percent'` or `'flat'` |
| `discount_value` | NUMERIC | NO | Percent (10) or dollars (20) |
| `code_type` | TEXT | NO | `'shared'` or `'unique'` |
| `shared_code` | TEXT | YES | Only for `code_type = 'shared'`. Stored uppercase, no spaces. |
| `max_total_uses` | INTEGER | YES | NULL = unlimited |
| `total_uses` | INTEGER | YES | Default 0. Incremented via `increment_promo_uses` RPC. |
| `one_time_per_customer` | BOOLEAN | YES | Default false |
| `valid_from` | DATE | YES | |
| `valid_until` | DATE | YES | |
| `applicable_services` | TEXT[] | YES | NULL = all services |
| `active` | BOOLEAN | YES | Default true |
| `created_at` | TIMESTAMPTZ | YES | Default now() |

---

## promo_codes

Individual unique codes. Each row is a single-use code tied to a promotion.

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | UUID PK | NO | |
| `promotion_id` | UUID FK → promotions.id | YES | |
| `business_id` | TEXT FK → businesses.id | NO | |
| `code` | TEXT | NO | Uppercase, no spaces |
| `customer_id` | UUID FK → customers.id | YES | Pre-assigned (loyalty reward codes) |
| `redeemed` | BOOLEAN | YES | Default false |
| `redeemed_by_phone` | TEXT | YES | |
| `redeemed_at` | TIMESTAMPTZ | YES | |
| `expired` | BOOLEAN | NO | Default false |
| `expired_at` | TIMESTAMPTZ | YES | Set when loyalty 180-day drip fires |
| `created_at` | TIMESTAMPTZ | YES | Default now() |

---

## promo_redemptions

Audit log — one row every time a promo is applied to a booking.

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | UUID PK | NO | |
| `promotion_id` | UUID FK → promotions.id | YES | |
| `promo_code_id` | UUID FK → promo_codes.id | YES | NULL for shared-code redemptions |
| `booking_id` | UUID FK → bookings.id | YES | |
| `customer_id` | UUID FK → customers.id | YES | |
| `customer_phone` | TEXT | NO | |
| `discount_type` | TEXT | NO | |
| `discount_value` | NUMERIC | NO | |
| `promo_name_snapshot` | TEXT | YES | Promotion name at time of redemption |
| `code_snapshot` | TEXT | YES | Code string at time of redemption |
| `redeemed_at` | TIMESTAMPTZ | YES | Default now() |

---

## loyalty_programs

Punch card config. One active program per business at a time.

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | UUID PK | NO | |
| `business_id` | TEXT FK → businesses.id | NO | |
| `name` | TEXT | NO | Default `'Punch Card'` |
| `required_visits` | INTEGER | NO | Default 7. Punches needed to earn reward. |
| `reward_description` | TEXT | NO | Default `'Free Basic Wash'` |
| `applicable_services` | JSONB | YES | Which services earn a punch. NULL = all. |
| `active` | BOOLEAN | NO | Default true |
| `created_at` | TIMESTAMPTZ | YES | Default now() |

---

## loyalty_punches

One row per completed booking that earned a punch. Idempotent via unique constraint.

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | UUID PK | NO | |
| `business_id` | TEXT FK → businesses.id | NO | |
| `loyalty_program_id` | UUID FK → loyalty_programs.id | YES | |
| `customer_id` | UUID FK → customers.id | YES | |
| `booking_id` | UUID FK → bookings.id | NO | |
| `punched_at` | TIMESTAMPTZ | YES | Default now() |
| `redeemed` | BOOLEAN | NO | Default false |
| `redeemed_at` | TIMESTAMPTZ | YES | |
| `redeemed_booking_id` | UUID FK → bookings.id | YES | Which booking used the reward |

**Unique constraint:** `(booking_id, loyalty_program_id)` — prevents double-punch.

---

## loyalty_reminders

Drip email log — prevents duplicate sends at each milestone.

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | UUID PK | NO | |
| `promo_code_id` | UUID FK → promo_codes.id | NO | |
| `business_id` | TEXT FK → businesses.id | NO | |
| `customer_id` | UUID FK → customers.id | YES | |
| `milestone_days` | INTEGER | NO | 30 / 60 / 90 / 180 |
| `sent_at` | TIMESTAMPTZ | NO | Default now() |

**Unique constraint:** `(promo_code_id, milestone_days)` — prevents duplicate drip sends.

---

## campaigns

Outbound marketing blasts.

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | UUID PK | NO | |
| `business_id` | TEXT FK → businesses.id | NO | |
| `name` | TEXT | NO | |
| `segment_type` | TEXT | NO | `'lapsed'` / `'never_returned'` / `'service'` / `'manual'` |
| `segment_config` | JSONB | NO | Default `{}`. Segment parameters e.g. `{ days: 60 }`. |
| `promotion_id` | UUID FK → promotions.id | YES | Optional promo to include |
| `channel` | TEXT | NO | `'email'` / `'sms'` / `'vapi'` / `'all'` |
| `scheduled_at` | TIMESTAMPTZ | YES | NULL = send immediately |
| `status` | TEXT | NO | Default `'draft'`. Values: `'draft'` / `'scheduled'` / `'sending'` / `'sent'` |
| `sent_count` | INTEGER | NO | Default 0. Updated when execution completes. |
| `created_at` | TIMESTAMPTZ | NO | Default now() |

---

## campaign_sends

One row per customer per channel per campaign.

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | UUID PK | NO | |
| `campaign_id` | UUID FK → campaigns.id | NO | |
| `business_id` | TEXT FK → businesses.id | NO | |
| `customer_id` | UUID FK → customers.id | YES | |
| `customer_name` | TEXT | YES | Snapshot at send time |
| `customer_email` | TEXT | YES | |
| `customer_phone` | TEXT | YES | |
| `channel_used` | TEXT | NO | `'email'` / `'sms'` / `'vapi'` |
| `promo_code_id` | UUID FK → promo_codes.id | YES | |
| `promo_code` | TEXT | YES | Snapshot for display |
| `status` | TEXT | NO | Default `'pending'`. Values: `'pending'` / `'sent'` / `'failed'` / `'skipped'` |
| `sent_at` | TIMESTAMPTZ | YES | |
| `error_text` | TEXT | YES | Error message on failure |
| `created_at` | TIMESTAMPTZ | NO | Default now() |

---

## call_logs

One row per inbound Vapi call. Upserted on `vapi_call_id`.

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | UUID PK | NO | |
| `business_id` | TEXT FK → businesses.id | NO | |
| `customer_id` | UUID FK → customers.id | YES | Resolved from caller_phone |
| `vapi_call_id` | TEXT UNIQUE | YES | Vapi's call ID |
| `caller_phone` | TEXT | YES | E.164 from Vapi |
| `duration_seconds` | INTEGER | YES | Computed from started_at / ended_at |
| `outcome` | TEXT | YES | `'booking_made'` / `'transferred'` / `'question_answered'` / `'abandoned'` (unconstrained text) |
| `transcript` | TEXT | YES | Raw full transcript |
| `booking_id` | UUID FK → bookings.id | YES | Set when call results in a booking |
| `followup_sent_at` | TIMESTAMPTZ | YES | Email followup timestamp |
| `followup_call_sent_at` | TIMESTAMPTZ | YES | Outbound followup call timestamp |
| `started_at` | TIMESTAMPTZ | YES | From Vapi `call.startedAt` |
| `ended_at` | TIMESTAMPTZ | YES | From Vapi `call.endedAt` |
| `recording_url` | TEXT | YES | |
| `exchange_count` | INTEGER | YES | Default 0. Number of Q&A pairs extracted. |
| `created_at` | TIMESTAMPTZ | YES | Default now() |

---

## call_exchanges

Q&A pairs extracted from call transcripts. The review queue for the Train AI tab.

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | UUID PK | NO | |
| `business_id` | TEXT FK → businesses.id | NO | Default `'luis-mobile-detail'` |
| `call_id` | UUID FK → call_logs.id | YES | |
| `customer_question` | TEXT | NO | The caller's question |
| `agent_response` | TEXT | NO | Connie's answer |
| `topic` | TEXT | YES | `'pricing'` / `'services'` / `'scheduling'` / `'location'` / `'other'` |
| `status` | TEXT | NO | Default `'pending_review'`. Values: `'pending_review'` / `'approved'` / `'edited'` / `'rejected'` |
| `reviewed_at` | TIMESTAMPTZ | YES | |
| `reviewer_notes` | TEXT | YES | |
| `created_at` | TIMESTAMPTZ | YES | Default now() |

**Indexes:** `(business_id, status)`, `topic`

---

## golden_responses

Approved or edited answers synced to Connie's Vapi knowledge file.

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | UUID PK | NO | |
| `business_id` | TEXT FK → businesses.id | NO | Default `'luis-mobile-detail'` |
| `exchange_id` | UUID FK → call_exchanges.id | YES | Source exchange |
| `question` | TEXT | NO | |
| `response` | TEXT | NO | The approved/corrected answer |
| `topic` | TEXT | YES | Same taxonomy as call_exchanges |
| `is_active` | BOOLEAN | YES | Default true. Sync query filters on this. |
| `created_at` | TIMESTAMPTZ | YES | Default now() |
| `updated_at` | TIMESTAMPTZ | YES | Default now() |

**Indexes:** `(business_id, is_active)`, `topic`
**Sync query:** `business_id = 'luis-mobile-detail' AND is_active = true ORDER BY created_at ASC`

---

## knowledge_base

Static Q&A manually entered per business. Separate from `golden_responses` (which is AI-learning-loop driven). Currently empty for Luis.

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | UUID PK | NO | |
| `business_id` | TEXT FK → businesses.id | NO | |
| `category` | TEXT | YES | e.g. `'pricing'`, `'services'` |
| `question` | TEXT | NO | |
| `answer` | TEXT | NO | |
| `created_at` | TIMESTAMPTZ | YES | Default now() |

---

## outbound_calls

Log of every outbound call fired via Vapi (appointment reminders, review requests, etc.).

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | UUID PK | NO | |
| `business_id` | TEXT FK → businesses.id | NO | |
| `booking_id` | UUID FK → bookings.id | YES | |
| `customer_id` | UUID FK → customers.id | YES | |
| `call_type` | TEXT | NO | e.g. `'reminder'`, `'review_request'` |
| `vapi_call_id` | TEXT | YES | Returned by Vapi after dispatch |
| `status` | TEXT | NO | Default `'fired'` |
| `created_at` | TIMESTAMPTZ | NO | Default now() |

---

## customer_intel

AI-extracted per-customer insights from call transcripts. One row per customer (upserted on `customer_id`).

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | UUID PK | NO | |
| `business_id` | TEXT FK → businesses.id | NO | |
| `customer_id` | UUID UNIQUE FK → customers.id | NO | |
| `preferences` | TEXT | YES | Free text: what they care about |
| `objections` | TEXT | YES | Hesitations or concerns raised |
| `unanswered_questions` | TEXT | YES | Questions Connie couldn't answer |
| `upsell_opportunities` | TEXT | YES | Services they might want |
| `notes` | TEXT | YES | Additional manual notes |
| `updated_at` | TIMESTAMPTZ | YES | Default now() |

---

## script_suggestions

AI-suggested improvements to the voice agent script, extracted per call.

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | UUID PK | NO | |
| `business_id` | TEXT FK → businesses.id | NO | |
| `call_log_id` | UUID FK → call_logs.id | YES | |
| `suggestion` | TEXT | NO | One suggestion per row |
| `reviewed` | BOOLEAN | YES | Default false |
| `created_at` | TIMESTAMPTZ | YES | Default now() |

---

## activation_nudges

Drip log for the activation nudge cron. One row per milestone per channel per business. Used to prevent duplicate sends.

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | UUID PK | NO | |
| `business_id` | TEXT FK → businesses.id | NO | |
| `nudge_type` | TEXT | NO | `'phone'` or `'email'` |
| `milestone` | TEXT | NO | `'48h'` / `'4d'` / `'7d'` / `'14d'` / `'30d'` / `'60d'` / `'90d'` / `'month4'` / `'month5'` / `'month6'` / `'quarter1'` / `'quarter2'` / ... |
| `sent_at` | TIMESTAMPTZ | NO | Default now() |
| `vapi_call_id` | TEXT | YES | Set when nudge_type = 'phone' |
| `email_sent` | BOOLEAN | YES | Default false |
| `created_at` | TIMESTAMPTZ | YES | Default now() |

**Unique constraint:** `(business_id, milestone, nudge_type)` — prevents duplicate nudges.

---

## Key Relationships (FK graph)

```
businesses
  ├── customers (business_id)
  │     ├── vehicles (customer_id)
  │     ├── bookings (customer_id)
  │     ├── loyalty_punches (customer_id)
  │     ├── loyalty_reminders (customer_id)
  │     ├── campaign_sends (customer_id)
  │     ├── outbound_calls (customer_id)
  │     ├── promo_codes (customer_id)  ← loyalty reward codes
  │     └── customer_intel (customer_id)  ← unique, 1:1
  ├── bookings (business_id)
  │     ├── promo_redemptions (booking_id)
  │     ├── loyalty_punches (booking_id)
  │     ├── loyalty_punches.redeemed_booking_id
  │     ├── call_logs (booking_id)
  │     └── outbound_calls (booking_id)
  ├── services (business_id)
  ├── availability_windows (business_id)
  ├── blocked_dates (business_id)
  ├── promotions (business_id)
  │     ├── promo_codes (promotion_id)
  │     │     └── loyalty_reminders (promo_code_id)
  │     ├── promo_redemptions (promotion_id)
  │     └── campaigns (promotion_id)
  ├── loyalty_programs (business_id)
  │     └── loyalty_punches (loyalty_program_id)
  ├── campaigns (business_id)
  │     └── campaign_sends (campaign_id)
  ├── knowledge_base (business_id)
  └── call_logs (business_id)
        ├── call_exchanges (call_id)
        │     └── golden_responses (exchange_id)
        └── script_suggestions (call_log_id)
```

---

## Important Notes for Agents

- **Never assume a column exists.** If it's not in this doc, query `information_schema.columns` first.
- **`business_id`** is on almost every table and must be included in every query and insert.
- **`bookings.email` is nullable** — voice bookings don't always capture it.
- **`bookings.city` holds full street addresses** for voice bookings (e.g. `'989 Winston Ave San Marino, California 91108, USA'`), not just a city name.
- **`call_logs.outcome` is unconstrained text** — the CHECK constraint was dropped in Session 55.
- **`campaign_sends` error column is `error_text`**, not `error`.
- **`loyalty_programs.applicable_services` is JSONB**, not TEXT[]. `promotions.applicable_services` is TEXT[].
- **`services.starting_price` and `promotions.discount_value` are NUMERIC**, not INTEGER.
- **Promo code lookup:** strip spaces and uppercase before comparing. Shared codes are on `promotions.shared_code`; unique codes are on `promo_codes.code`.
- **Loyalty reward codes** are stored as `promo_codes` rows with `customer_id` set, tied to a `promotions` row created by `loyalty-utils.js`.
- **`golden_responses` sync filter:** `business_id = 'luis-mobile-detail' AND is_active = true` — if `is_active` is false or `business_id` doesn't match, the row won't sync to Connie.
- **`script_suggestions.reviewed`** is available but no UI exists yet to act on it.
