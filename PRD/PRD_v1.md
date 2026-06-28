# PRD — BluHat Detailer Platform
### Pilot Client: Luis Mobile Detail
Version 1.0 | Author: BluHat AI | Status: Approved

---

## The Big Picture

Luis is great at detailing cars. He's not great at running the business side — and he shouldn't have to be. Right now, every lead, every follow-up, and every rebooking depends on Luis picking up his phone. When he's under a car, he misses calls. When he's tired after a long day, he forgets to follow up. Business falls through the cracks — not because Luis is bad at his job, but because there's no system working for him.

**The goal:** Build a system that captures every lead, follows up automatically, and keeps customers coming back — so Luis can focus on detailing cars and growing his business. AI agents do the work. Luis just does the job.

This platform starts with Luis. It scales to every mobile detailer in the country.

---

## Who This Is For

**Primary user: Luis** — one person, one truck, San Gabriel Valley CA. Not tech-savvy. Needs everything to just work. Communicates by phone and text.

**Secondary user: Future detailer clients** — same profile as Luis. Small operators, 1–3 trucks, working-class business owners who need a system but can't afford to hire staff.

**Admin user: Andrew (BluHat AI)** — manages the platform, onboards new clients, monitors performance.

---

## The Problem (Plain English)

1. **No customer list exists.** Zero ability to follow up or market to anyone — because there's no record of who's ever booked.
2. **Leads disappear.** Someone fills out the booking form. Nothing happens. Luis never knows they existed.
3. **No follow-up system.** Even when Luis gets a lead, he has to manually text or call back. Half the time it doesn't happen.
4. **Missed calls = missed jobs.** Luis can't answer his phone when he's working. No voicemail does anything useful with the lead.
5. **No reviews or referral system.** Happy customers don't automatically become Google reviews, testimonials, or referrals. Growth depends entirely on Luis hustling for it himself.
6. **Luis is the bottleneck.** Everything runs through him. He can't grow if he's doing everything himself.

---

## The Solution

A four-phase automated business engine:

| Phase | What It Does | Status |
|---|---|---|
| 1 | Captures every lead and notifies Luis instantly | Build first |
| 2 | AI chat agent answers questions and books appointments 24/7 | Build second |
| 3 | AI voice agent handles incoming calls automatically | Build third |
| 4 | Automated follow-up, rebooking reminders, and remarketing | Build fourth |

---

## Phase 1 — Lead Capture & Instant Notification

**What the customer sees:** They fill out the same booking form they see today. Nothing looks different.

**What happens behind the scenes:**
- Their info is saved to a secure database the moment they hit submit
- Luis gets a text or email instantly with all their details: name, phone, vehicle, service, and preferred date
- The customer gets an automatic reply confirming their request was received and that Luis will reach out shortly

**What Luis sees:** A text on his phone within seconds of a form submission. No app to check. No dashboard to log into. Just a text.

**Done when:**
- Form submission saves to database ✓
- Luis receives notification within 60 seconds ✓
- Customer receives confirmation reply ✓
- Tested end-to-end on the live site ✓

---

## Phase 2 — AI Chat Agent (24/7 Booking Assistant)

**What the customer sees:** A small chat bubble in the corner of the website. They click it and can ask questions or start booking — any time of day or night.

**What it can do:**
- Answer questions about services, pricing, and the service area
- Walk someone through booking an appointment
- Escalate to Luis if something is outside its knowledge
- Nudge hesitant visitors toward filling out the form

**What it cannot do:**
- Make promises Luis hasn't approved
- Answer anything outside of the business
- Book without collecting name, phone, and service type

**What Luis sees:** If someone escalates, he gets a text. Otherwise the system handles it.

**Done when:**
- Chat answers 10 real customer questions correctly ✓
- Chat successfully walks someone through a booking ✓
- Escalation fires a notification to Luis ✓
- Tested on mobile at 375px viewport ✓

---

## Phase 3 — AI Voice Agent (Handles Incoming Calls)

**What the customer hears:** A friendly, professional voice answers the phone. It sounds like Luis's business, not a robot. It can take a booking, answer basic questions, or take a message.

**What it can do:**
- Answer within 2 rings, every time
- Recognize returning customers by phone number
- Book an appointment (collects service, vehicle, location, date/time)
- Take a callback request if the customer prefers to talk to Luis directly
- Send Luis a text and email with the full call summary and transcript

**What Luis hears:** Nothing — unless it's a callback request. His phone stops ringing for routine bookings.

**Done when:**
- Incoming call books a test appointment end-to-end ✓
- Luis receives SMS + email with booking details ✓
- Returning customer recognized by phone number ✓
- Callback request fires correctly ✓
- Abandoned call triggers follow-up SMS to customer ✓

---

## Phase 4 — Reviews, Referrals & Remarketing

**What happens automatically:**

**Lead follow-up:**
- New lead doesn't book within 48 hours → automatic follow-up text to the customer
- Vercel Cron handles all scheduled jobs

**Review system (2 days after job marked complete):**
- Customer gets an email asking to rate their experience 1–5 stars on an internal review page
- **4–5 stars:** Enters a Google/Yelp ask sequence:
  - Email 1 (immediately): "We're glad you loved it! Would you leave us a Google or Yelp review?"
  - Email 2 (7 days later, only if no response): gentle reminder
  - Email 3 (14 days later): final ask, sequence ends
  - Customer clicks "I already left one" → sequence stops permanently
  - After confirmed: social bribe email — "Post a photo on Instagram and tag us for a discount on your next detail"
- **1–3 stars:** Empathetic follow-up asking what went wrong. Luis gets a private alert. Review never goes to Google or Yelp. Ever.

**Rebooking reminders:**
- 90 days since last booking → "time for another detail?" text
- 180 days → second reminder

**Remarketing campaigns:**
- Luis picks an audience, writes the message, hits send — system delivers it
- Audience segments: all customers / by service type / inactive 90+ days / inactive 180+ days
- Supports a discount code field

**Testimonials:**
- Happy customers who leave 4–5 star reviews can be flagged to appear on the website
- Luis approves which ones go live

**What Luis does:** Approves message templates once. Reviews what the system flags. That's it.

**Done when:**
- Follow-up text fires 48 hours after unbooked lead ✓
- Review request sends 2 days after completed job ✓
- 4–5 star review triggers Google/Yelp drip sequence ✓
- 1–3 star review routes privately to Luis, no public ask ✓
- 90-day rebooking reminder sends correctly ✓
- Campaign sends to correct segment ✓
- All messages tested and approved by Luis before going live ✓

---

## Database Schema

### `businesses` — one row per detailer client
```
id              text        "luis-mobile-detail"
name            text        "Luis Mobile Detail"
phone           text
email           text
instagram       text
google_review_url text
yelp_review_url   text
service_area    text
features        json        { chat, voice, marketing }
created_at      timestamp
```

### `bookings` — every form submission, chat booking, and voice booking
```
id              uuid
business_id     text        FK → businesses
name            text
phone           text
email           text
city            text
make            text
model           text
year            text
service         text
condition       text[]
notes           text
preferred_date  date
preferred_time  time
source          text        "form" | "chat" | "voice"
status          text        "new" | "contacted" | "confirmed" | "completed" | "no-show"
completed_at    timestamp
review_requested_at timestamp
created_at      timestamp
```

### `customers` — deduplicated contact list built from bookings
```
id              uuid
business_id     text        FK → businesses
name            text
phone           text
email           text
city            text
total_bookings  int
last_service    date
created_at      timestamp
```

### `reviews` — internal ratings, drip state, and public review tracking
```
id              uuid
booking_id      uuid        FK → bookings
business_id     text        FK → businesses
stars           int         1–5
comment         text
followup_sent_at timestamp
google_yelp_ask_count int   default 0
google_yelp_confirmed_at timestamp
social_bribe_sent_at timestamp
low_star_followup_sent_at timestamp
show_on_site    bool        default false
created_at      timestamp
```

### `messages` — log of every outbound text and email
```
id              uuid
business_id     text        FK → businesses
customer_id     uuid        FK → customers
channel         text        "sms" | "email"
type            text        "confirmation" | "followup" | "review-request" | "remarketing" | "rebooking"
body            text
sent_at         timestamp
status          text        "sent" | "delivered" | "failed"
```

### `campaigns` — remarketing sends
```
id              uuid
business_id     text        FK → businesses
name            text
subject         text
body            text
segment         text        "all" | "by_service" | "inactive_90d" | "inactive_180d"
recipient_count int
sent_at         timestamp
created_at      timestamp
```

### `call_logs` — voice agent transcripts (Phase 3)
```
id              uuid
business_id     text        FK → businesses
caller_phone    text
transcript      text
outcome         text        "booked" | "callback" | "abandoned"
booking_id      uuid        FK → bookings (nullable)
created_at      timestamp
```

---

## Security

- Every table has Row Level Security (RLS) enabled — no exceptions
- `business_id` enforced at the database level — one client can never see another's data
- API keys and secrets in `.env` only — never in code, never committed to GitHub
- All form and API inputs validated before touching the database
- `/api/book` and `/api/chat` rate-limited (5 requests per IP per 10 minutes)
- Voice agent: caller phone numbers never shared across business accounts
- Resend, Twilio, and Vapi credentials are scoped per business in Phase 3+

---

## Tech Stack

| Layer | Tool | Enters at |
|---|---|---|
| Frontend | Vanilla HTML/CSS/JS — one file per client | Phase 1 |
| Serverless functions | Vercel `/api/*.js` — free tier | Phase 1 |
| Database | Supabase (Postgres + RLS) — free tier | Phase 1 |
| Email | Resend — free tier (100/day) | Phase 1 |
| SMS | Twilio Programmable SMS | Phase 2 |
| AI | Claude Sonnet 4.6 — prompt caching on every call | Phase 2 |
| Cron jobs | Vercel Cron — follow-ups and review triggers | Phase 4 |
| Voice | Vapi | Phase 3 |
| Hosting | Vercel — auto-deploys on push to main | Phase 1 |
| Billing (BluHat → clients) | Stripe — manual invoicing until client #5 | Phase 4 |
| Version control | GitHub — one repo per client for now | Phase 1 |

---

## Feature Flags (Multi-Tenant)

Each client has a config file. No feature is auto-enabled. Every feature is an upsell.

```js
// /api/config/luis.js
export const BUSINESS = {
  id: 'luis-mobile-detail',
  name: 'Luis Mobile Detail',
  phone: '626-409-3147',
  email: 'luis@example.com',
  googleReviewUrl: '',
  yelpReviewUrl: '',
  features: {
    chat: false,       // Phase 2 — $75–100/mo
    voice: false,      // Phase 3 — $150–200/mo
    marketing: false,  // Phase 4 — TBD
  }
}
```

Adding a new detailer = one new config file + one new row in `businesses`. No code changes.

---

## Business Model

| Product | Price |
|---|---|
| Base website (built and deployed) | $500–$1,000 one-time |
| AI Chat Agent | +$75–$100/mo |
| AI Voice Agent | +$150–$200/mo |
| Automated Follow-Up & Remarketing | TBD |

Manual Stripe invoicing until client #5. Self-serve billing portal built after that.

---

## UI/UX Principles

- **Mobile first, always.** Luis's customers book from their phones. Every screen tested at 375px.
- **Plain language only.** No jargon. An 8th grader should understand every word on the page.
- **One action per screen.** Don't make people think. One thing to do, one button to press.
- **Fast.** Pages load under 2 seconds. Forms submit under 1 second.
- **Luis gets simple.** Notifications are plain text to his phone. No dashboards, no logins, no apps.
- **Trust signals.** Every customer-facing touchpoint sounds professional and local — not corporate, not robotic.

---

## What Is NOT Being Built (Yet)

- Admin dashboard for Luis
- Self-serve client signup portal
- Native mobile app
- Payment processing for Luis (he uses Zelle and cash — not our problem)
- Google/Yelp API integrations (links only — no API needed)
- Multi-language support

These go back on the table after Phase 4 is live and generating recurring revenue.

---

## Reference Files

| File | Purpose |
|---|---|
| `CLAUDE.md` | Project rules, key locations in index.html, pricing |
| `PROGRESS.md` | Session log — newest entry on top |
| `Roadmap/CRM-Promotion-Engine.md` | Detailed Phase 1 & 4 spec |
| `Roadmap/ai-chat-addon-plan.md` | Detailed Phase 2 spec |
| `Roadmap/voice-agent-plan.md` | Detailed Phase 3 spec |
| `TeamMembers/CTO_Project_Instructions.md` | CTO operating rules and build order |
