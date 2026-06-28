# Calendar Booking System — Feature Plan

## Problem
The booking form (Step 3) accepts any date and time as free text. There is no conflict detection. Two customers can book the same slot. Services have different durations, so a Full Detail at 9am should block the calendar until 1pm.

## Goal
Replace free-text date/time in Step 3 with a real-time slot picker. Customers only see times Luis is actually available. Bookings block the calendar automatically based on service duration. Luis manages his hours and blocked dates via an `/admin` panel.

---

## Service Durations (server-side, not trusted from client)
| Service | Duration |
|---------|----------|
| Just a Wash | 1 hour |
| Standard Detail | 2 hours |
| Full Detail | 4 hours |

---

## Phase A — Backend: Availability Engine
*No customer-facing changes yet. Safe to ship independently.*

1. **Supabase migrations** — create 3 new tables:
   - `businesses` — multi-tenant root (id, slug, owner info, timezone)
   - `availability_windows` — Luis's weekly hours (day_of_week, start_time, end_time)
   - `blocked_dates` — vacation/sick days he manually adds
   - Update `bookings` — add `start_datetime` and `end_datetime` columns

2. **`api/slots.js`** (new) — `GET /api/slots?date=&service=&business=`
   - Reads Luis's weekly hours for that day
   - Reads existing bookings (with start/end times)
   - Returns array of available 30-min start slots that fit the service duration

3. **`api/book.js`** (update existing)
   - Accept `start_datetime` from form
   - Compute `end_datetime` using DURATIONS map
   - Check for conflicts before inserting
   - Return 409 if slot is taken (race condition protection)

4. **`api/config/luis.js`** (update existing)
   - Add `DURATIONS` map and `timezone: 'America/Los_Angeles'`

---

## Phase B — Frontend: Slot Picker in Booking Form
*Updates Step 3 of `index.html` only.*

1. Replace free-text date + time inputs with:
   - Date picker (customer selects a date)
   - On date select: call `GET /api/slots` with chosen date + service from Step 2
   - Time slot grid: available times shown as buttons, taken times grayed out
   - Selected slot stored in hidden field, submitted with form

---

## Phase C — Admin Panel
*New `/admin` route. Luis manages his schedule here.*

1. **`admin/index.html`** (new single-file, no framework)
   - Supabase Auth login (email/password)
   - Onboarding: business name, owner info, location → timezone resolved
   - **Weekly Hours tab:** set open hours per day (Mon–Sat)
   - **Block Dates tab:** add/remove vacation days or manual holds
   - **Bookings tab:** upcoming bookings list sorted by date/time

2. **Admin API endpoints** (all protected, require auth):
   - `POST /api/admin/hours` — save weekly hours
   - `POST /api/admin/block` — add/remove blocked date
   - `GET /api/admin/bookings` — list bookings for business

---

## Build Order
Build A → B → C in sequence. A+B can ship before C — Luis's hours can be hardcoded temporarily while the admin panel is built.

## Files Touched
| File | Change |
|------|--------|
| `api/book.js` | Add conflict check + write start/end datetimes |
| `api/slots.js` | Create — availability calculator |
| `api/config/luis.js` | Add DURATIONS + timezone |
| `api/admin/hours.js` | Create |
| `api/admin/block.js` | Create |
| `api/admin/bookings.js` | Create |
| `admin/index.html` | Create — admin panel |
| `index.html` | Update Step 3 — date picker → slot grid |
| Supabase | 3 new tables + update bookings |

## Verification (end-to-end)
- Book Full Detail 9am → try to book anything before 1pm → rejected (conflict)
- Luis blocks a date → no slots show for that date
- Luis sets Mon hours 10am–2pm → only those slots appear on Mondays
- Two users submit same slot simultaneously → only one succeeds (race condition test)
