# Business Onboarding Spec — DetailFlow Multi-Tenant

_Drop this in your project root. The agent reads it for context._

---

## What This Is

A voice-first onboarding system for new mobile detailing businesses. Instead of filling out forms, the detailer makes a phone call. A setup agent interviews them about their business — services, pricing, service area, hours, policies, common questions. That conversation gets transcribed, structured by AI, and becomes the Day 1 knowledge base for their customer-facing voice agent.

The detailer can call back anytime to update their profile. The system recognizes them, asks what changed, and merges the updates into their existing profile. It's never one-and-done.

This pairs with the Learning Loop (see learning-loop-spec.md). Onboarding creates the seed knowledge. The learning loop grows it from real customer calls over time. Both feed the same Vapi knowledge file per business.

---

## How It Works (Plain English)

### First-Time Setup
1. Andrew creates a new business record (name, owner, phone, email)
2. The detailer calls the setup number and talks to the setup agent
3. The setup agent interviews them: services, pricing, area, hours, policies, FAQs, tone
4. Call ends → webhook fires → transcript saved
5. Claude Haiku extracts structured data from the transcript into business_profiles
6. Detailer (or Andrew) reviews in admin panel → fixes any errors
7. "Regenerate Knowledge Base" → markdown file generated → uploaded to Vapi
8. Their customer-facing agent is live with Day 1 knowledge
9. Learning loop takes over from here — real calls grow the knowledge base

### Profile Updates (any time after setup)
1. Detailer calls the same setup number again
2. Setup agent recognizes them by phone → greets by name
3. Asks "What would you like to update?" — no full re-interview
4. Detailer talks about just what changed ("I added ceramic coating at $500")
5. Call ends → transcript processed → Haiku extracts ONLY the changed fields
6. Changes are MERGED into existing profile — nothing gets wiped
7. Profile status set back to 'review' so detailer can verify in admin
8. "Regenerate Knowledge Base" to push changes to the live agent

---

## Multi-Tenant Architecture

Every piece of data is scoped by `business_id`. Each detailer is fully isolated.

```
luis-mobile-detail (Luis)
├── business_profiles → his services, pricing, area
├── Vapi assistant a831eec7 → his customer-facing agent
├── knowledge file → his proven responses
├── call_logs → his customer calls
├── call_exchanges → his Q&A pairs
├── golden_responses → his approved answers
└── Admin view → filtered to his data only

mikes-auto-spa (Mike, hypothetical)
├── business_profiles → his services, pricing, area
├── Vapi assistant [different ID] → his customer-facing agent
├── knowledge file → his proven responses
├── call_logs → his customer calls
├── call_exchanges → his Q&A pairs
├── golden_responses → his approved answers
└── Admin view → filtered to his data only
```

No data crosses between businesses. The learning loop runs independently per detailer.

---

## Database Schema

### business_profiles

Stores the structured business info extracted from onboarding calls (or manually entered).

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| business_id | TEXT UNIQUE NOT NULL | e.g. 'luis-mobile-detail' |
| business_name | TEXT NOT NULL | "Luis Mobile Detail" |
| owner_name | TEXT | "Luis" |
| owner_phone | TEXT | Owner's personal phone for matching return calls |
| greeting | TEXT | "Thanks for calling Luis Mobile Detail!" |
| services | JSONB | [{ name, price, description, duration_minutes }] |
| service_area | JSONB | { cities: [...], radius_note } |
| hours | JSONB | { mon: { open, close }, ... } |
| policies | JSONB | { cancellation, weather, payment_methods, requirements } |
| faq_seeds | JSONB | [{ question, answer }] |
| tone | JSONB | { style, agent_name, language, avoid_phrases } |
| onboarding_call_id | TEXT | Vapi call ID from setup interview |
| onboarding_transcript | TEXT | Full transcript |
| profile_status | TEXT | 'draft' / 'review' / 'active' |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

### onboarding_calls

Tracks setup AND update calls with the onboarding agent.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| business_id | TEXT NOT NULL | |
| vapi_call_id | TEXT | |
| call_type | TEXT NOT NULL | 'initial_setup' or 'profile_update' |
| transcript | TEXT | |
| extracted_data | JSONB | Structured data from Haiku extraction |
| processed | BOOLEAN | default false |
| created_at | TIMESTAMPTZ | |

---

## Key Integration Points

### With Existing Learning Loop
- `knowledge_base` table is shared — onboarding seeds it, learning loop grows it
- `api/admin/knowledge-sync.js` is shared — both onboarding and learning loop call it
- The Vapi knowledge file per business merges both sources

### With Existing Voice Agent
- Each detailer's Vapi assistant uses the same tool architecture as Connie
- `config/vapi-assistant.js` becomes a template — clone per business, update business_id
- All `api/voice/` endpoints already filter by business_id

### With Existing Admin Panel
- Business Profile tab (tab 9) joins the existing tabs (Train AI is tab 8)
- Same auth patterns, same Supabase client, same CSS

---

## Setup Agent vs Customer Agent

| | Setup Agent | Customer Agent (Connie) |
|--|-------------|----------------------|
| Purpose | Interview the detailer | Answer customer calls |
| Who calls | The business owner | Their customers |
| Modes | First-time setup + profile updates | New + returning customers |
| Webhook | api/voice/setup-call-ended.js | api/voice/call-ended.js |
| Output | business_profiles data | call_logs + call_exchanges |
| Frequency | Once at onboarding + whenever they want to update | Every customer call |
| Config | config/setup-agent.js | config/vapi-assistant.js |
| Lookup tool | lookupBusiness (checks if caller has profile) | lookupCustomer (checks if caller is customer) |

---

## Profile Update — Merge Rules

When a detailer calls back to update their profile, the system does NOT replace the entire profile. It merges changes into what already exists.

### Merge logic per field type:

**Simple text fields** (business_name, owner_name, greeting):
- If mentioned in update call → replace with new value
- If not mentioned → keep existing value

**JSONB array fields** (services, faq_seeds):
- New items → append to existing array
- Updated items (matched by name) → replace the matching item
- Items NOT mentioned → keep as-is, do NOT remove
- Explicit removal ("I don't offer ceramic coating anymore") → remove that item

**JSONB object fields** (service_area, hours, policies, tone):
- Merge at the key level — only overwrite keys that were discussed
- Example: if they say "I'm now open on Sundays 9 to 3" → update only hours.sun, leave other days alone

**Cities in service_area.cities:**
- "I'm now serving Arcadia too" → append Arcadia to existing cities list
- "I stopped going to Pomona" → remove Pomona from list
- Don't touch cities that weren't mentioned

---

## What The Detailer Needs To Provide (or doesn't have to)

### Must have before going live:
- Business name
- At least one service with a price
- At least one city in service area

### Nice to have (agent works without these):
- Hours (defaults to Mon-Sat 8am-6pm)
- Policies (agent says "I'll have [owner] follow up on that")
- FAQ seeds (learning loop will capture these naturally)
- Tone preferences (defaults to friendly)

### Completely optional:
- Website (works without one — voice only)
- Email (voice agent doesn't need it)

---

## Detailers With vs Without Websites

### Has a website:
- Chat widget on their site + voice agent on phone
- Both feed the same learning loop
- Knowledge base serves both channels

### No website:
- Voice agent only — customers call the number
- Learning loop still works the same
- Can add a simple booking page later (clone of Luis's index.html)

The system works either way. Voice-first means the phone number is the product, not the website.
