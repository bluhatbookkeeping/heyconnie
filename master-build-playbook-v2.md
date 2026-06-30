# Hey Connie — Master Build Playbook v2

_One file. Work top to bottom. Check off as you go._

---

## THE GOAL

Replace the need for a dedicated receptionist for mobile detailing 
businesses. The AI agent handles inbound calls, books appointments, 
remembers customers, and gets smarter every week.

**The Agentic AI Loop:**
1. **LLM (brain)** — Thinks, talks, follows the booking flow
2. **Tools (hands)** — Books, looks up, validates, searches
3. **Learning Loop (memory)** — Calls → Q&A extraction → owner reviews → knowledge grows

**Week 1:** ~70% capable. **Month 2:** 90%+. **Month 6:** rarely wrong.

---

## CURRENT STATE

| What | Status |
|------|--------|
| Phase 1 — Learning loop | ✅ Done |
| Phase 2 — Onboarding (Prompts 1–4) | ✅ Done |
| Setup agent | ✅ Live at (818) 403-3447 |
| mike-auto-spa test | ✅ Tested |
| Prompt 5 — Business Profile tab | ✅ Done |
| Prompt 6 — Voice PIN gatekeeper | ✅ Done |
| Prompt 7 — Instant basic agent on signup | ✅ Done |
| Prompt 8 — Activation nudge drip | ✅ Done |
| Prompt 9 — Nudge call scripts + email templates | ✅ Done |
| **Phase 2 — Final Test** | **☐ Next** |

---

## HOW TO USE THIS FILE

1. Find the next unchecked prompt
2. Copy it
3. Paste into Claude Code
4. Wait for completion
5. Check it off

---

## SESSION OPENER (every new session)

```
Read these files in this order:
1. CLAUDE.md
2. PROGRESS.md — ONLY the latest entry.
3. DB_SCHEMA.md — authoritative schema. Never guess columns.
4. onboarding-spec.md

Pick up where the last session left off. The next prompt to run:
```

---

## END OF SESSION (every time)

```
Stop. Update PROGRESS.md:
- What was done (specific files, tables, endpoints)
- What's working and verified
- Decisions made, issues hit
- CURRENT PHASE: Phase 2
- LAST COMPLETED PROMPT: Prompt [number]
- NEXT PROMPT TO RUN: Prompt [number]
```

---

## IF PROGRESS.MD GETS TOO LONG (10+ sessions)

```
Move all PROGRESS.md entries except the latest 3 into 
PROGRESS_ARCHIVE.md. Keep the same format. 
PROGRESS.md should only have the 3 most recent sessions.
```

---

# PHASE 2: ONBOARDING + ACTIVATION

_Prompts 1–4 are done. Remaining: Business Profile tab, voice PIN 
gatekeeper, instant basic agent, activation nudge drip, nudge scripts._

---

## ✅ Prompt 5 — Business Profile Tab in Admin

```
Read admin/index.html for the existing tab structure.
Read DB_SCHEMA.md for exact table and column names.

Add "Business Profile" tab (tab 9) to admin/index.html.

Status badge at top: Draft (yellow) / Review (blue) / Active (green)

Sectioned cards, each with its own Save button:

SECTION 1: Business Basics
- Business Name, Owner Name, Phone Greeting, Agent Tone toggle

SECTION 2: Services & Pricing
- Table: Name | Price | Duration | Description
- Edit per row, Add Service, Remove

SECTION 3: Service Area
- Cities as pills/tags, Add City, remove with X

SECTION 4: Hours
- 7-row grid: Day | Open | Close | Closed checkbox

SECTION 5: Policies
- Cancellation, Weather, Payment methods, Requirements (textareas)

SECTION 6: Seed FAQs
- List of Q&A pairs with Edit/Remove, Add Q&A button

"Regenerate Knowledge Base" button at top — calls 
POST /api/admin/generate-knowledge with { business_id }.
Loading state, success/error message.

At bottom: "Update by Voice" callout — "Call (818) 403-3447 to 
update your business info by phone." Shows last onboarding call date.

Empty state if no profile exists for this business_id.

Mobile-first. Same CSS, auth, JS patterns as existing tabs.
```

---

## ✅ Verify Prompt 5

```
1. Open admin → Business Profile tab
2. Verify mike-auto-spa data appears
3. Edit a service price → Save → verify in Supabase
4. Click Regenerate Knowledge Base → verify Vapi file updates
```

---

## ✅ Prompt 6 — Voice PIN gatekeeper

_Nothing happens on the setup agent without a PIN. No exceptions._

```
Read DB_SCHEMA.md, config/setup-agent.js, and api/voice/lookup-business.js.

The setup agent must require a 4-digit PIN before ANY interaction. 
No one can create a profile, update a profile, or access any 
business data without verifying their PIN first.

STEP 1 — Add voice_pin to businesses table (if not already there)

ALTER TABLE businesses ADD COLUMN IF NOT EXISTS voice_pin TEXT;

STEP 2 — PIN is set during signup (web form)

Update api/detailer-signup.js:
- Add voice_pin as a required field in the signup payload
- Validate: must be exactly 4 digits
- Save to businesses.voice_pin

Update the heyconnie.co signup form (if it exists) to include 
a "Create your 4-digit PIN" field with:
- Input type: number, maxlength 4
- Label: "This PIN protects your account when you call in"
- Validation: exactly 4 digits, required

STEP 3 — Create api/voice/verify-pin.js — Vapi tool endpoint

Input from Vapi: { business_id, pin_attempt }
- Look up businesses.voice_pin for that business_id
- If match: return { verified: true }
- If no match: return { verified: false, attempts_remaining: X }
- Track attempts in memory (or a simple counter)
- After 3 failed attempts: return { verified: false, locked: true }
- Follow Vapi tool response format

STEP 4 — Update config/setup-agent.js

The setup agent's FIRST action on every call — before greeting, 
before anything — is:

1. Call lookupBusiness with the caller's phone number
2. Based on the result, ONE of three paths:

PATH A — Account found, has PIN:
"Hi! Before we get started, what's your 4-digit PIN?"
→ Call verify-pin with their answer
→ If verified: "Great! Hey [owner_name], what can I help you with?"
→ If wrong: "That doesn't match. Try again." (up to 3 attempts)
→ If locked after 3 fails: "For security, I can't proceed. 
  Please log into your admin panel at heyconnie.co to verify 
  your identity. Have a good day!" → end call

PATH B — Account found, NO PIN set:
"Hi [owner_name]! I see you have an account but you haven't set 
up a security PIN yet. For your protection, I can't make any 
changes without one. Please log into your admin panel at 
heyconnie.co to set up your PIN, then call back. If you need 
help, email support@heyconnie.co."
→ end call

PATH C — No account found:
"Hi there! I don't see an account linked to this phone number. 
To get started with Hey Connie, visit heyconnie.co to create 
your account. Once you're set up, call back and I'll walk you 
through everything. Have a great day!"
→ end call

CRITICAL RULES:
- The PIN check is NON-NEGOTIABLE. No bypass. No exceptions.
- If someone says "I forgot my PIN" → "No problem — you can 
  reset it in your admin panel at heyconnie.co. I can't make 
  changes without it."
- If someone says "I'm the owner, just let me in" → "I understand, 
  but for your protection I need the PIN. You can reset it online."
- The agent NEVER proceeds to setup or update mode without a 
  verified PIN

STEP 5 — Add verify-pin as a tool in the setup agent config

Add to the tools array in config/setup-agent.js alongside 
lookupBusiness.

After changes: run node scripts/setup-agent-deploy.js
```

---

## ✅ Prompt 7 — Instant basic agent on signup

_Show value in minutes, not days. The second a detailer signs up, 
their phone number starts answering — before the onboarding call._

```
Read CLAUDE.md, DB_SCHEMA.md, and config/vapi-assistant.js.

When a new detailer signs up (api/detailer-signup.js), the system 
should automatically create a basic Vapi assistant and assign it 
to their phone number — before they've done the onboarding call.

STEP 1 — Create config/basic-agent.js

A minimal Vapi assistant config. System prompt:

"You are a friendly receptionist for [business_name]. The business 
is currently setting up their system, so you can't book appointments 
yet. Your job is to:

1. Greet warmly: 'Hi, thanks for calling [business_name]! How can 
   I help you today?'
2. Listen to what they need
3. Capture their name and phone number
4. Let them know: 'I'll make sure [owner_name] gets your message 
   and calls you back shortly.'
5. End the call politely

Be warm, professional, and brief. Never make up services, prices, 
or availability. Just capture the lead."

The config should accept business_name and owner_name as parameters.
No tools needed — no booking, no lookup. Just conversation + lead capture.

STEP 2 — Create api/voice/basic-agent-webhook.js

Webhook handler for the basic agent's call-ended event:

1. Extract caller name and phone from transcript (use Haiku to parse)
2. Save to call_logs with outcome = 'lead_captured'
3. Send immediate notification to the owner:
   - Email to owner_email: "Your AI receptionist just took a call! 
     [caller_name] called at [time] asking about [brief summary]. 
     Their number: [phone]. Call them back!"
4. Return 200

STEP 3 — Update api/detailer-signup.js

After creating the business record, automatically:

1. Call the Vapi API to create a new assistant using the basic 
   agent config with their business_name and owner_name:
   POST https://api.vapi.ai/assistant
   Headers: Authorization: Bearer {VAPI_API_KEY}
   Body: the config from basic-agent.js

2. Save the returned assistant ID to businesses.vapi_assistant_id

3. Buy a Twilio phone number via the Twilio API:
   (If auto-purchase isn't ready yet, flag as manual step)

4. If we have a phone number, import it to Vapi and assign to 
   the new assistant

5. Update the welcome email to include: "Your AI receptionist is 
   ALREADY answering your phone at [number]. Right now she's 
   capturing names and numbers — call (818) 403-3447 to teach her 
   your services so she can start booking appointments directly."

STEP 4 — Upgrade path: basic → full agent

When the detailer completes their onboarding call and the profile 
is generated (api/admin/generate-knowledge.js), the system should:

1. Replace the basic agent's system prompt with the full Connie 
   config parameterized with their business data
2. Add all 7 tools (lookupCustomer, getSlots, createBooking, etc.)
3. PATCH the existing Vapi assistant — same ID, same phone number
4. Transition is invisible to the customer — same number, now smarter
```

---

## ✅ Prompt 8 — Activation nudge drip (database + cron)

_Signed up but didn't complete the onboarding call? Nudge them._

```
Read DB_SCHEMA.md.

STEP 1 — Create table: activation_nudges

CREATE TABLE activation_nudges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id TEXT NOT NULL REFERENCES businesses(id),
  nudge_type TEXT NOT NULL,  -- 'phone' or 'email'
  milestone TEXT NOT NULL,   -- '48h', '4d', '7d', '14d', '30d', 
                             -- '60d', '90d', 'month4', 'month5', 
                             -- 'month6', 'quarter1', etc.
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  vapi_call_id TEXT,
  email_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX idx_nudge_unique 
  ON activation_nudges(business_id, milestone, nudge_type);

Also:
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS 
  activation_opted_out BOOLEAN DEFAULT false;

STEP 2 — Create api/cron/activation-nudge.js

Runs daily. For each business where:
- profile_status = 'draft' (never completed onboarding)
- activation_opted_out = false

Check time since businesses.created_at. Send next unsent nudge:

PHONE + EMAIL:
- 48 hours
- 4 days
- 7 days
- 14 days
- 30 days
- 60 days
- 90 days (last phone call)

EMAIL ONLY:
- Month 4, 5, 6

EMAIL QUARTERLY:
- Every 3 months after month 6

Query call_logs count for the business before composing — use 
the call count in messaging.

STOP all nudges if:
- profile_status changes to 'review' or 'active'
- activation_opted_out = true
```

---

## ✅ Prompt 9 — Nudge call scripts + email templates

```
PART A — Nudge call scripts

Query call_logs count for the business before each call.

48 HOURS (has calls):
"Hey [owner_name]! This is Connie from Hey Connie. Your AI 
receptionist has already taken [X] calls since you signed up! 
Right now she's just capturing names and numbers — let's spend 
10 minutes teaching her your services so she can start booking 
appointments directly. Want to do it now?"

48 HOURS (no calls yet):
"Hey [owner_name]! This is Connie from Hey Connie. Your AI 
receptionist is live and answering your phone. Let's spend 10 
minutes teaching her your services so when that first call comes 
in, she can book it. Ready?"

If yes → transfer to setup agent or start setup flow.
If no → "No worries! Call (818) 403-3447 anytime."

4–14 DAYS:
"Hey [owner_name], it's Connie. Your receptionist has handled 
[X] calls so far but she can't book appointments yet — she's 
just taking messages. Ten minutes on the phone with me and she'll 
start booking jobs directly. Want to knock it out?"

30–90 DAYS:
"Hey [owner_name], Connie here. Your receptionist has taken [X] 
calls but she's still in message-only mode. Those callers had to 
wait for a callback instead of booking on the spot. Let's fix 
that — 10 minutes and she's fully live."

PART B — Email templates

Query call_logs count before composing.

48 HOURS:
Subject: "Your AI receptionist took [X] calls already"
Body: "[owner_name], your Hey Connie receptionist is answering 
your phone — she's already handled [X] calls! Spend 10 minutes 
teaching her your services and she'll start booking directly. 
Call (818) 403-3447 to get started."

4-14 DAYS: lead with call count, emphasize bookings missed

30-90 DAYS: "[X] calls, [X] potential bookings missed"

MONTHLY (post-90 days): lighter touch, include call stats

QUARTERLY: very brief, "still here if you need us"

All emails:
- From: setup@heyconnie.co
- Unsubscribe link (sets activation_opted_out = true)
- CAN-SPAM compliant
- Mobile-friendly HTML
```

---

## ☐ Final Test — Full Activation Flow

```
1. Create test business via api/detailer-signup
2. Verify basic agent created in Vapi
3. Verify phone number assigned (or manual step flagged)
4. Call the business's number → basic agent answers, captures lead
5. Check owner got notification email with caller details
6. Trigger nudge cron manually
7. Verify 48h nudge fires (phone + email) with call count
8. Call (818) 403-3447 → complete onboarding as test business
9. Verify basic agent upgrades to full Connie with booking
10. Verify nudge drip stops (profile_status now 'active')
11. Call business number again → now books appointments
```

---

# WHAT'S NEXT (separate specs when ready)

| Feature | Spec document |
|---------|--------------|
| Security (PIN + magic link) | Not created yet |
| Voice-managed business tools | Not created yet |
| Multi-tenant routing | Documented in CLAUDE.md |
| SMS channel (A2P + outbound) | `roadmap/sms-infrastructure-plan.md` ✅ |
| Review funnel | Not spec'd yet |
| Growth Advisor / AI COO | `growth-advisor-spec.md` ✅ |
| Tenant provisioning | Not spec'd yet |
| Jobber integration | Not spec'd yet |

---

# QUICK REFERENCE

| What | Where |
|------|-------|
| Supabase | DetailFlow (`kgyipdyhzaypcxcpxqsg`) |
| Connie | `a831eec7` · (626) 654-1924 |
| Setup agent | `281883e1` · (818) 403-3447 |
| Twilio sub-account | `[see Twilio dashboard]` |
| Business ID (Luis) | `luis-mobile-detail` |
| Admin panel | `admin/index.html` |
| Connie config | `config/vapi-assistant.js` → `node scripts/vapi-setup.js` |
| Setup config | `config/setup-agent.js` → `node scripts/setup-agent-deploy.js` |
| DB Schema | `DB_SCHEMA.md` |
| Hey Connie | heyconnie.co |
