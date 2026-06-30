# Hey Connie — SMS Infrastructure Plan
## A2P Registration + Outbound SMS for All Detailers

**Status:** Planned — next build after Phase 2 Final Test
**Created:** 2026-06-29

---

## Context

Hey Connie needs a compliant, scalable SMS infrastructure to send appointment reminders, reward notifications, rebooking nudges, and marketing messages to customers across all detailer tenants. The system currently sends SMS in one place (`api/voice/send-review-sms.js`) using `TWILIO_FROM_NUMBER` — but A2P registration is pending and the architecture isn't multi-tenant-ready for SMS.

The goal: one Hey Connie platform SMS number, one A2P brand, two campaigns (Transactional + Marketing), routing by `business_id` in code. This is the same ISV model used by Jobber, Housecall Pro, and Ready to Rent.

---

## Phone Number Architecture

| Number | Purpose | Type |
|---|---|---|
| (818) 403-3447 | Detailer onboarding (setup agent, voice only) | Voice only — no change |
| (626) 654-1924 | Luis's customer inbound line | Voice only — no change |
| **New number to buy** | All outbound customer SMS, platform-wide | SMS only (no voice) |

Each new detailer gets their own **inbound voice number** (Vapi routes by `vapi_assistant_id`). All customer-facing **SMS comes from the single Hey Connie platform number**.

Customers who reply get an auto-response: *"This number is outbound only. For help, contact your detailer directly."* No further reply handling needed.

---

## A2P Registration Plan (Twilio)

### Brand Registration
- **Legal entity:** BluHat AI (or Hey Connie LLC if incorporated)
- **EIN required:** yes
- **Brand type:** Standard (ISV/SaaS platform)
- **Website:** heyconnie.co
- **Use case description:** Hey Connie is an AI receptionist platform for mobile detailing businesses. Detailers sign up and their customers receive appointment-related and promotional text messages sent on the detailer's behalf. Customers opt in at the time of booking via a consent checkbox that names both Hey Connie and the specific detailer.

### Two Campaigns

**Campaign 1 — Transactional**
- Use case: `CUSTOMER_CARE` or `NOTIFICATIONS`
- Messages: booking confirmations, appointment reminders, reward earned notices, cancellation confirmations
- Sample message: *"Reminder from Luis Mobile Detail (via Hey Connie): your Standard Detail is tomorrow at 10am at 989 Winston Ave. Reply STOP to opt out. Do not reply to this number."*
- Opt-in method: checkbox at booking (web form + voice consent)

**Campaign 2 — Marketing**
- Use case: `MARKETING`
- Messages: rebooking nudges, promotional campaigns, loyalty milestone rewards
- Sample message: *"Hey Sarah! It's been a while since your last detail with Luis Mobile Detail. Book before July 31 and save 10% — use code SUMMER10: heyconnie.co/book/luis-mobile-detail. Reply STOP to opt out. Do not reply to this number."*
- Opt-in method: same checkbox at booking, clearly covers promotional messages

### Consent Language (add to booking forms)
> "By submitting this form, you agree to receive text messages from Hey Connie on behalf of [Business Name] about your appointment and account, including reminders and promotions. Message & data rates may apply. Reply STOP to opt out at any time. This number is outbound only — do not reply."

This mirrors the Ready to Rent ISV model: platform sends, tenant is identified in message body.

---

## Code Changes

### 1. New env var
Add `TWILIO_SMS_NUMBER` — the new Hey Connie SMS-only number. Separate from `TWILIO_FROM_NUMBER` (currently used by `send-review-sms.js` and `notify-luis.js`).

### 2. Shared SMS utility
Create `api/utils/send-sms.js` — all customer-facing SMS goes through here:
- Accepts: `{ to, body, businessId, customerId, campaignId }`
- Checks `customers.sms_opt_out` before sending — skips if true
- Sends via Twilio from `TWILIO_SMS_NUMBER`
- Logs to `campaign_sends` with `channel_used = 'sms'` if `campaignId` provided

Reuse Twilio client pattern from `api/voice/send-review-sms.js` and `api/admin/campaigns.js` (where `sendSMS()` already exists but is Luis-hardcoded — refactor into this utility).

### 3. Consent checkbox update
Update `index.html` booking form and `api/book.js` / `api/book-widget.js`:
- Add/update SMS consent checkbox with new language above
- `customers.sms_opt_out` column already exists (default false = opted in) — no schema change needed

### 4. Update existing cron jobs to send SMS
Wire `send-sms.js` into cron jobs that currently email-only. Each checks `sms_opt_out` before sending.

| Cron file | Trigger | SMS message |
|---|---|---|
| `outbound-reminders.js` | 12–24h before appointment | "Reminder from [Business]: your [service] is tomorrow at [time] at [address]." |
| `loyalty-reward-nudge.js` | Reward earned / milestone | "You earned a reward with [Business]! Your code: [CODE]. Book at [URL]." |
| `rebooking-email.js` | 21/42/56 days post-service | "It's been a while since your detail with [Business]. Ready to book again? [URL]" |
| `review-requests.js` | 24–48h after completion | "Thanks for booking with [Business]! Leave a quick review: [URL]" |

All messages end with: *"Do not reply — outbound only."*

### 5. Message format rules (all SMS)
- Opens with customer first name
- Line 2 identifies the detailer: "from [Business Name] via Hey Connie"
- Content
- Footer: *"Reply STOP to opt out. Do not reply — this number is outbound only."*

---

## Twilio Registration Checklist (manual steps)

1. [ ] Buy a new Twilio number in the Hey Connie account (local area code preferred, SMS-capable, no voice)
2. [ ] Register brand in Twilio Console → Messaging → Sender Profiles → Brands
3. [ ] Register Campaign 1 (Transactional) — attach new number, submit sample messages
4. [ ] Register Campaign 2 (Marketing) — attach same number, submit sample messages
5. [ ] Wait for carrier vetting (~1–7 business days)
6. [ ] Set `TWILIO_SMS_NUMBER` in Vercel env vars
7. [ ] Disable voice on the new number in Twilio (SMS only)

---

## Verification

1. Test `send-sms.js` with a direct curl POST — confirm message arrives on test phone
2. Trigger `outbound-reminders` cron manually — confirm SMS sends + `campaign_sends` row logged
3. Set `sms_opt_out = true` on a test customer — verify SMS is skipped
4. Load booking form — confirm consent checkbox is present and copy is correct
5. Check Twilio message logs — confirm messages show registered campaign ID, not "unregistered"

---

## What Is NOT Changing

- Voice numbers (Luis's 626 line, setup agent 818 line) — untouched
- `notify-luis.js` (owner SMS notifications) — stays on `TWILIO_FROM_NUMBER`
- `send-review-sms.js` — can migrate to shared utility later, not blocking
- Email sending via Resend — untouched
- DB schema — `customers.sms_opt_out` already exists
