# Digital Punch Card Loyalty Feature

## Context
Luis mentioned wanting a punch card loyalty program (e.g. "7th wash free"). He's currently doing paper cards. We need to digitize it — tied to real completed bookings, configurable by Luis, visible in the CRM. Two things need to happen first: (1) add a `completed` booking status so punches only register on actual completed jobs, and (2) build the loyalty config + punch tracking system on top of that.

All services count toward punches. Both Luis and the customer get emailed when a reward is earned.

---

## Part 1 — Add "Completed" Booking Status

### Problem
Right now bookings go: `new` → `confirmed` → `cancelled`. There's no `completed`. Punches must only count on completed jobs or we inflate loyalty credits.

### How it auto-completes
A Vercel Cron job runs daily and marks any booking as `completed` where:
- `status = 'confirmed'`
- `end_datetime < NOW()`
- Not cancelled

### Admin override
Luis can manually mark a booking `completed` via a "Mark Done" button on the booking row in the admin panel.

### Changes needed
1. **Supabase:** Add `'completed'` to the `status` enum on `bookings` table (migration)
2. **`/api/cron/complete-bookings.js`** — new endpoint, runs via Vercel Cron (`vercel.json`), queries all `confirmed` bookings where `end_datetime < NOW()`, bulk-updates to `completed`
3. **`admin/index.html`** — add `completed` status pill (purple), add "Mark Done" button on booking rows, update booking list to show completed bookings
4. **`/api/admin/bookings.js`** — accept `status: 'completed'` on PATCH

---

## Part 2 — Loyalty Program

### Supabase Schema (2 new tables)

**`loyalty_programs`**
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| business_id | FK | ties to businesses |
| name | text | e.g. "Wash Punch Card" |
| required_visits | int | e.g. 7 = 7th is free |
| reward_description | text | e.g. "Free Basic Wash" |
| applicable_services | jsonb | null = all services |
| active | boolean | Luis can pause it |
| created_at | timestamp | |

**`loyalty_punches`**
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| business_id | FK | |
| loyalty_program_id | FK | |
| customer_id | UUID FK | to customers |
| booking_id | UUID FK | one punch per completed booking (unique) |
| punched_at | timestamp | when booking completed |
| redeemed | boolean | true when reward is honored |
| redeemed_at | timestamp | |
| redeemed_booking_id | UUID FK | the free-reward booking |

### Punch Logic
Triggered by cron AND by "Mark Done" admin action. When a booking moves to `completed`:
1. Check if an active `loyalty_program` exists for this business
2. Check no punch already exists for this `booking_id` (idempotent)
3. Insert a row into `loyalty_punches`
4. Count unredeemed punches for this customer — if >= `required_visits`, fire reward notification (email to Luis + email to customer)

### Admin — Loyalty Tab (new tab in admin panel)

**Config panel (simple):**
- "Every ___ visits, customer gets:" [number input, default 7]
- "Reward:" [text input, e.g. "Free Basic Wash"]
- Toggle: Active / Paused
- Save button

One program at a time. No multi-program complexity.

**Customer punch cards in CRM:**
- In customer detail view, add a punch card visual — filled/empty circles showing progress
- Shows: "5 of 7 — 2 more until free wash"
- "Mark Reward Given" button — flips `redeemed=true` on oldest unredeemed punches, resets cycle

### Customer-Facing
- Booking confirmation email — add line: "You have X of Y punches toward your free [reward]!"
- When threshold hit: email Luis ("Maria just earned a free wash!") + email customer ("Congrats — you've earned a free wash! Luis will honor this at your next visit.")

---

## Build Order

1. Supabase migration — add `completed` to status enum + create 2 new tables
2. `/api/cron/complete-bookings.js` + `vercel.json` cron entry
3. Admin bookings — completed status pill (purple) + "Mark Done" button + PATCH endpoint update
4. Punch insert logic (shared util called from cron + mark-done)
5. Reward notification emails (Luis + customer) via Resend
6. Admin Loyalty tab — config UI + `/api/admin/loyalty.js` endpoint
7. CRM customer detail — punch card visual + "Mark Reward Given" button
8. Booking confirmation email — punch count line

---

## Verification
- Book a test appointment with `end_datetime` in the past → run cron → confirm status flips to `completed` and a punch row appears
- Create a loyalty program (5 visits, "Free Wash") → manually mark 5 bookings done for one customer → confirm punch count = 5 and reward emails fire to both Luis and customer
- Click "Mark Reward Given" → confirm punches flip to redeemed, cycle resets
- Complete one more booking → confirm new punch cycle starts at 1

---

## Files to Touch
- `api/cron/complete-bookings.js` (new)
- `api/admin/bookings.js` (PATCH — accept completed status)
- `api/admin/loyalty.js` (new — config CRUD + punch list)
- `admin/index.html` (status pill, Mark Done button, Loyalty tab, CRM punch visual)
- `vercel.json` (add cron schedule)
- Supabase SQL migration (status enum + 2 tables)

## Env Vars Already Available
- `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `RESEND_API_KEY`, `NOTIFICATION_EMAIL`
