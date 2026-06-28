# CRM Promotion Engine
### Mobile Detailer SaaS — Admin + Marketing + Reviews Platform

## Context
The current site (index.html on Vercel) has a fully-built booking form that saves nothing — data
disappears on submit. Luis needs: (1) a place to see and manage appointments, (2) a way to market
to past customers, and (3) a post-service review loop that routes happy customers to Google/Yelp and
captures feedback from unhappy ones.

**This is being built as a multi-tenant SaaS platform** — Luis is tenant #1, but the architecture
must support rolling out to other mobile detailers with zero re-engineering. Every table is scoped
to a `business_id`. Each detailer gets their own login, their own booking form embed, and their own
branded emails. The admin app is shared infrastructure; each owner only ever sees their own data.

---

## Architecture Overview

| Layer | Tool | Where |
|---|---|---|
| Database | Supabase (Postgres + RLS) | Shared, multi-tenant |
| Public booking API | Vercel serverless functions (`/api/booking`) | Per-business embed or hosted form |
| Admin app | React + Vite (new repo) | Single Vercel deployment, all tenants |
| Review + cron emails | Node.js service | Railway (always-on) |
| Email delivery | Resend | Per-business sender domain |
| Auth (admin) | Supabase Auth — each owner is a Supabase user | Admin app |
| Super-admin | Separate protected route — BluHat only | Admin app |

---

## Multi-Tenancy Design

### Root entity: `businesses`
```
id, created_at,
name,                        -- "Luis Mobile Detail"
slug,                        -- "luis-mobile-detail" (used in URLs)
owner_user_id (FK → auth.users),
phone, email,
instagram_url,
google_review_url,           -- their specific Google Maps review link
yelp_review_url,
service_area,
plan (free | pro | agency),  -- future billing tier
active (bool)
```

### All data tables get `business_id`
Every table (`bookings`, `reviews`, `campaigns`, `campaign_sends`) has:
```
business_id uuid NOT NULL REFERENCES businesses(id)
```

### RLS policy pattern (applied to every table):
```sql
-- Owners only see their own business data
CREATE POLICY "owner_isolation" ON bookings
  USING (business_id = (
    SELECT id FROM businesses WHERE owner_user_id = auth.uid()
  ));
```

### Public booking form (per business)
Each detailer gets an **embeddable booking widget** — a JS snippet they paste into any website:
```html
<script src="https://app.detailpro.com/widget.js"
        data-business="luis-mobile-detail"></script>
```
Or a hosted standalone form page: `https://app.detailpro.com/book/luis-mobile-detail`

Luis's current index.html POSTs to `/api/booking?business=luis-mobile-detail`.

### Email branding (per business)
- Sender name: business name from `businesses` table
- Reply-to: business email
- Google/Yelp links: pulled from `businesses.google_review_url` and `yelp_review_url`
- Luis's emails come from "Luis Mobile Detail", not a generic sender

### Admin app routing
- `app.detailpro.com/login` — shared login, Supabase Auth
- `app.detailpro.com/dashboard` — each owner lands here, sees only their data
- `app.detailpro.com/super-admin` — BluHat only, sees all businesses, usage, health

### Super-admin view (BluHat internal)
```
BUSINESSES (3 active)
─────────────────────────────────────────────────
Name                  Plan    Bookings  Last Active
────────────────────────────────────────────────
Luis Mobile Detail    Pro     47        Today
Mike's Auto Spa       Free    12        Jun 10
Clean Rides SGV       Pro     31        Jun 14
─────────────────────────────────────────────────
[ + Add Business ]
```

---

## Database Schema (Supabase)

### `bookings`
```
id, created_at, status (pending | confirmed | completed | cancelled),
paid (bool), completed_at,
name, phone, email, city,
make, model, year,
service, condition (text[]), notes,
preferred_date, preferred_time,
business_id (FK → businesses),
review_requested_at, review_id (FK → reviews)
```

### `reviews`
```
id, booking_id (FK → bookings), business_id (FK → businesses), created_at,
stars (1-5), comment,
review_type (internal),
followup_sent_at, followup_type (google_yelp | low_star),
google_yelp_ask_count (int, default 0),
google_yelp_confirmed_at (timestamp),
social_bribe_sent_at (timestamp),
low_star_followup_sent_at (timestamp)
```

### `campaigns`
```
id, created_at, sent_at,
business_id (FK → businesses),
name, subject, body_html,
segment (all | by_service | inactive_90d | inactive_180d),
segment_filter (jsonb), recipient_count
```

### `campaign_sends`
```
id, campaign_id (FK), business_id (FK → businesses),
customer_email, customer_name, sent_at, opened_at
```

RLS on all tables. Each business owner only reads/writes their own `business_id`.

---

## Phase 1 — Form Backend (existing Vercel repo)

**Goal:** Form submissions actually save to Supabase.

**Changes to existing repo:**
- Add `api/booking.js` — Vercel serverless function
  - Accepts POST with all form fields + `business` slug from query param
  - Validates required fields server-side
  - Inserts row into `bookings` with `status: 'pending'`
  - Returns 200 + booking ID
- Update `index.html` form submit handler
  - Replace fake success with `fetch('/api/booking?business=luis-mobile-detail', { method: 'POST', body: formData })`
  - Show success on 200, show error message on failure
- Add `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` to Vercel env vars

**Files changed:** `index.html` (form JS only), new `api/booking.js`

---

## Phase 2 — Admin Dashboard (new repo: `crm-promotion-engine-admin`)

**Goal:** Each detailer can view and manage their bookings, customers, reviews, and promotions.

**Stack:** React + Vite, Tailwind CSS, deployed to Vercel

**Auth:** Supabase Auth email/password — one account per detailer. Protected route wrapper.

---

### SCREEN: Login
```
┌─────────────────────────────────────┐
│        Luis Mobile Detail           │
│           Admin Portal              │
│                                     │
│  Email    [___________________]     │
│  Password [___________________]     │
│                                     │
│         [ Sign In ]                 │
└─────────────────────────────────────┘
```

---

### SCREEN: Appointments Tab

Top-level navigation: [Appointments] [Customers] [Reviews] [Marketing]

```
APPOINTMENTS
─────────────────────────────────────────────────────────────────────
Filter: [ Upcoming ▼ ]   Search: [_____________]

NAME            SERVICE          DATE        CITY        STATUS    PAID   ACTIONS
─────────────────────────────────────────────────────────────────────────────────
Maria G.        Full Detail      Jun 18      Pasadena    Pending   —      [Confirm] [Details]
John T.         Standard Detail  Jun 19      Arcadia     Confirmed —      [Complete] [Details]
Rosa M.         Just a Wash      Jun 14      Monrovia    Completed ✓      [Details]
Carlos H.       Full Detail      Jun 10      Alhambra    Completed —      [Mark Paid] [Details]
─────────────────────────────────────────────────────────────────────────────────
```

**Filter options:** Upcoming / Completed / All / Unpaid
**Status flow:** Pending → Confirmed → Completed (each is a button click)
**Paid toggle:** Checkbox or button on each row

**Details drawer (slides in from right):**
```
Maria G. — Full Detail
──────────────────────────────
Phone:   (626) 555-0101  [Call]
Email:   maria@email.com
City:    Pasadena
Vehicle: 2021 Honda Pilot
Condition: Very dirty, Pet hair
Notes: "Has dog hair everywhere"
Date: Jun 18, 10:00 AM
──────────────────────────────
Status:  [ Pending → Confirm ]
Paid:    [ Mark as Paid ]
──────────────────────────────
```

---

### SCREEN: Customers Tab

```
CUSTOMERS  (47 total)
─────────────────────────────────────────────────────────────────────
Search: [_____________]   Filter by service: [ All ▼ ]

NAME          EMAIL                 PHONE          BOOKINGS  LAST SERVICE    LAST DATE
──────────────────────────────────────────────────────────────────────────────────────
Maria G.      maria@email.com       (626) 555-0101    3      Full Detail     Jun 14
John T.       john@email.com        (626) 555-0202    1      Standard Detail May 30
Rosa M.       rosa@email.com        (818) 555-0303    5      Just a Wash     Jun 14
Carlos H.     carlos@email.com      (626) 555-0404    2      Full Detail     Jun 10
──────────────────────────────────────────────────────────────────────────────────────
```

**Customer detail (click row):**
```
Rosa M.
──────────────────────────────────────────
Email:  rosa@email.com
Phone:  (818) 555-0303
5 total bookings

BOOKING HISTORY
Date        Service         Status      Paid
Jun 14      Just a Wash     Completed   ✓
Apr 02      Standard Detail Completed   ✓
Jan 18      Just a Wash     Completed   ✓

REVIEW STATUS
Internal rating: ★★★★★ (left Jun 16)
Google/Yelp ask: Confirmed ✓ (Jun 17)
──────────────────────────────────────────
```

---

### SCREEN: Reviews Tab

```
REVIEWS  (23 total)
─────────────────────────────────────────────────────────────────────
Filter: [ All ▼ ]   Show: [4-5 stars] [1-3 stars]

NAME          SERVICE         STARS   COMMENT                        G/YELP?    DATE
──────────────────────────────────────────────────────────────────────────────────────
Rosa M.       Just a Wash     ★★★★★  "Looks brand new!"            Confirmed  Jun 16
John T.       Standard Detail ★★★    "Good but missed the trunk"   Pending    Jun 12
Maria G.      Full Detail     ★★★★★  "Incredible job on interior"  Sent x1    Jun 10
Carlos H.     Just a Wash     ★★     "Took too long"               N/A (low)  Jun 08
──────────────────────────────────────────────────────────────────────────────────────
```

**Low-star alert banner:**
```
⚠ 2 reviews with 1-3 stars this month — follow-up emails sent automatically.
```

---

### SCREEN: Marketing Tab

```
MARKETING
─────────────────────────────────────────────────────────────────────
[ + New Campaign ]

PAST CAMPAIGNS
Name                    Segment                Sent        Recipients
────────────────────────────────────────────────────────────────────
Summer Wash Special     All customers          Jun 01      47
Detail Reminder         Inactive 90+ days      May 15      12
Full Detail Promo       Full Detail customers  Apr 20      18
────────────────────────────────────────────────────────────────────
```

**New Campaign flow:**

**Step 1 — Pick your audience:**
```
Who do you want to reach?

○ All customers (47 people)
○ Customers who got a Wash (22 people)
○ Customers who got a Standard Detail (14 people)
○ Customers who got a Full Detail (11 people)
○ Haven't booked in 90+ days (15 people)
○ Haven't booked in 6+ months (8 people)

                              [ Next → ]
```

**Step 2 — Write your message:**
```
Subject line:
[_____________________________________________]

Message:
┌──────────────────────────────────────────────┐
│ Hey {first_name},                            │
│                                              │
│ It's been a while since your last wash!      │
│ Book this week and get 10% off. Use code:    │
│                                              │
│ SUMMER10                                     │
│                                              │
│ — Luis                                       │
│ 626-409-3147                                 │
└──────────────────────────────────────────────┘

Discount code (optional): [__________]

[ ← Back ]   [ Preview Email ]   [ Send Now → ]
```

**Step 3 — Confirm & Send:**
```
Ready to send?

Audience:  Inactive 90+ days
Recipients: 15 customers
Subject:   "It's been a while — 10% off this week"

[ ← Edit ]   [ Send to 15 customers ]
```

---

## Phase 3 — Review System (Railway Node.js service)

**Goal:** 2 days after a booking is marked complete, email the customer asking for an internal rating.
Route by score.

**Cron job (runs daily):**
- Query bookings where `status = completed` AND `completed_at <= NOW() - 2 days` AND `review_requested_at IS NULL`
- For each: send review request email via Resend (branded per business), set `review_requested_at = NOW()`

**Review request email:**
- From: [Business Name] `<noreply@[business-domain].com>`
- Subject: "How'd we do on your [Service]?"
- Body: "Rate your experience 1–5 stars" → links to `/review/[booking-id]`

**Review page** (`/review/:bookingId` — public-facing route, no auth required):
- Shows: "Hi [Name], how was your [service] experience?"
- Star selector (1–5)
- Optional comment box
- Submit → saves to `reviews` table, triggers follow-up logic

**Follow-up logic (triggered on review insert via Supabase webhook → Railway):**

Once an internal review is submitted (any star rating), review request emails for that booking stop permanently.

- **Stars 4–5:** Enter Google/Yelp ask drip sequence:
  - Email 1 (immediately): "We're glad you loved it! Would you leave us a Google or Yelp review?"
    - Buttons: [Leave Google Review] [Leave Yelp Review] [I already left one ✓]
  - Email 2 (7 days later, only if no confirmation): gentle reminder
  - Email 3 (14 days later, only if no confirmation): final ask, sequence ends
  - Clicking "I already left one" → sets `google_yelp_confirmed_at`, exits sequence
  - After confirmed: send **social bribe email** — "Thank you! Post a photo/video of your car on Instagram or Facebook and tag us for a discount on your next service."
  - Never re-ask once confirmed.

- **Stars 1–3:** Send empathetic follow-up asking what went wrong. No Google/Yelp ask ever.
  - Business owner gets an internal alert email with the rating + comment.

---

## Phase 4 — Marketing Tool (Marketing tab in Admin)

**Goal:** Detailer can send promotional emails to segments of their past customers.

**Segments:**
- All past customers
- By service type
- Inactive 90 days (last booking > 90 days ago)
- Inactive 180 days

**Compose flow:**
1. Pick segment → shows estimated recipient count
2. Write subject + email body (`{first_name}` merge tag supported)
3. Optional discount code field
4. Preview → Send Now

**Send:** Railway service fires Resend batch send, logs each send to `campaign_sends`.

**History:** Marketing tab shows past campaigns with sent_at and recipient_count.

---

## Phase 5 (optional, future) — Reviews on Public Site

- Add `show_on_site` boolean to `reviews`
- Admin toggles which reviews to surface
- Public booking site fetches approved reviews and renders a testimonials section

---

## Environment Variables Needed

**Vercel (existing Luis site):**
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`

**Railway (email + cron service):**
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `RESEND_API_KEY`
- `ADMIN_APP_URL` (for review page links)

**Admin app (Vercel):**
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

---

## Build Order

1. Supabase project setup + schema + RLS policies
2. Vercel form backend (`api/booking.js`) + update index.html
3. Admin app scaffold (auth, layout, Appointments tab)
4. Railway review cron + review page + follow-up email logic
5. Marketing tab in admin
6. Super-admin view (BluHat internal)

---

## Verification Checklist

- Submit test booking → confirm row appears in Supabase `bookings` under correct `business_id`
- Mark booking complete in admin → confirm `completed_at` set
- Manually trigger cron → confirm review request email arrives, branded correctly
- Submit 5-star review → confirm Google/Yelp drip sequence starts
- Click "I already left one" → confirm sequence stops, social bribe email sent
- Submit 2-star review → confirm low-star follow-up sent + owner alerted, no Google/Yelp ask
- Create and send a campaign → confirm `campaign_sends` rows created, email received
- Log in as a second test business → confirm zero data leakage from first business
- Confirm RLS blocks unauthenticated Supabase queries to all tables
