# Learning Loop Spec — Luis Mobile Detail

_Hand this to Claude Code. It builds against the existing stack._

---

## What This Is

A system that makes Connie (the Vapi voice agent) smarter over time by capturing what customers ask, letting Andrew/Luis review the answers, and syncing approved answers back into Connie's knowledge base. Today Connie only knows what's in her system prompt. After this, she'll also know answers that have been validated from real calls.

---

## How It Works (Plain English)

1. Customer calls (626) 654-1924, talks to Connie
2. After the call, Vapi fires the `call-ended` webhook
3. Our handler extracts every question the customer asked and what Connie said back — these become "exchanges"
4. Exchanges land in the admin panel's new "Train AI" tab with status `pending_review`
5. Andrew or Luis swipes through them: Approve / Edit / Reject
6. Approved answers become "golden responses" — proven-correct answers
7. A sync function generates a markdown knowledge file from all golden responses and uploads it to Vapi
8. Next call, Connie checks that knowledge file before falling back to her generic system prompt
9. Over time, Connie gets better at answering the questions Luis's customers actually ask

---

## Database Changes

### Altered Table: `call_logs` ✅ DONE (Session 55)

> **Note:** The existing `call_logs` table (plural) was altered — a separate `call_log` (singular) table was created during development then dropped. All FKs point to `call_logs`. The `outcome` column already existed but its CHECK constraint was dropped (old vocabulary `booked/callback_requested/question_only/abandoned` didn't match new outcomes). `outcome` is now unconstrained text.

```sql
-- These columns were added to the existing call_logs table:
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ;
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS recording_url TEXT;
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS exchange_count INTEGER DEFAULT 0;

-- outcome CHECK constraint dropped (column already existed):
ALTER TABLE call_logs DROP CONSTRAINT IF EXISTS call_logs_outcome_check;
```

### New Table: `call_exchanges` ✅ DONE (Session 55)

Each row is one Q&A pair extracted from a call transcript.

```sql
CREATE TABLE call_exchanges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id TEXT NOT NULL DEFAULT 'luis-mobile-detail',
  call_id UUID REFERENCES call_logs(id) ON DELETE CASCADE,
  customer_question TEXT NOT NULL,
  agent_response TEXT NOT NULL,
  topic TEXT,                  -- auto-categorized: 'pricing', 'services', 'scheduling', 'location', 'other'
  status TEXT NOT NULL DEFAULT 'pending_review',  -- 'pending_review', 'approved', 'rejected', 'edited'
  reviewed_at TIMESTAMPTZ,
  reviewer_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_exchanges_business_status ON call_exchanges(business_id, status);
CREATE INDEX idx_exchanges_topic ON call_exchanges(topic);
```

### New Table: `golden_responses` ✅ DONE (Session 55)

Proven-correct answers, either approved as-is or edited by reviewer.

```sql
CREATE TABLE golden_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id TEXT NOT NULL DEFAULT 'luis-mobile-detail',
  exchange_id UUID REFERENCES call_exchanges(id),
  question TEXT NOT NULL,
  response TEXT NOT NULL,
  topic TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_golden_business_active ON golden_responses(business_id, is_active);
CREATE INDEX idx_golden_topic ON golden_responses(topic);
```

### Alter `businesses` table ✅ DONE (Session 55)

Add a column to track last knowledge sync:

```sql
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS
  last_knowledge_sync TIMESTAMPTZ;

ALTER TABLE businesses ADD COLUMN IF NOT EXISTS
  vapi_knowledge_file_id TEXT;
```

---

## API Endpoints

### 1. `POST /api/voice/call-ended` ✅ DONE (Session 55)

> **What was actually built:** `processCallEnded()` is a named export in `api/voice/call-ended.js`, imported and called by `api/voice/webhook.js`. It is NOT a standalone HTTP endpoint that Vapi calls directly. Vapi's `end-of-call-report` events arrive at `POST /api/voice/webhook`, which then calls `await processCallEnded(event)` **before** `res.send()` — Vercel serverless kills async work after the response is sent, so the await must come first.

This is the Vapi webhook handler for completed calls. If one already exists, extend it — don't replace.

**What it does:**
1. Receives the Vapi `call-ended` webhook payload
2. Extracts: `call.id`, `call.customer.number`, `call.startedAt`, `call.endedAt`, `transcript`, `recordingUrl`
3. Saves a row to `call_logs`
4. Calls the exchange extraction function (see below)
5. Returns 200 OK (Vapi retries on failure)

**Exchange extraction logic:**

Parse the transcript into speaker-labeled turns. For each pair where the customer asks something and Connie responds, create a `call_exchanges` row. Skip:
- Pure booking flow steps (name capture, phone capture, address capture) — these aren't knowledge
- Very short turns (under 5 words from customer) — "yes", "okay", "thanks"
- The greeting and closing

Focus on capturing exchanges where the customer asked a real question:
- "How much does a full detail cost?"
- "Do you come to Arcadia?"
- "How long does a standard detail take?"
- "Do you do ceramic coating?"
- "Can I book for this Saturday?"

**Auto-categorize `topic`** based on keywords:
- pricing/cost/price/how much/fee → `pricing`
- service/detail/wash/ceramic/interior/exterior → `services`
- schedule/book/available/when/time/date/day → `scheduling`
- area/come to/location/city/drive to/where → `location`
- everything else → `other`

### 2. `GET /api/admin/exchanges` ✅ DONE (Session 56)

Returns exchanges for the review queue.

**Query params:**
- `business` (required) — business_id
- `status` (optional, default `pending_review`) — filter by status
- `topic` (optional) — filter by topic
- `limit` (optional, default 20)
- `offset` (optional, default 0)

**Response:**
```json
{
  "exchanges": [
    {
      "id": "uuid",
      "customer_question": "How much is a full detail?",
      "agent_response": "A full detail starts at $350...",
      "topic": "pricing",
      "status": "pending_review",
      "created_at": "2026-06-24T...",
      "call_phone": "+16264091234",
      "call_date": "2026-06-24T..."
    }
  ],
  "total": 42,
  "pending_count": 15
}
```

**Auth:** Same pattern as other admin endpoints (JWT or `x-admin-secret`).

### 3. `POST /api/admin/review` ✅ DONE (Session 56)

> **Path correction:** Built at `/api/admin/review` (file: `api/admin/review.js`), NOT `/api/admin/exchanges/review` as originally spec'd.

Processes a review action on an exchange.

**Body:**
```json
{
  "exchange_id": "uuid",
  "action": "approve" | "reject" | "edit",
  "edited_response": "The corrected response text...",  // only if action = "edit"
  "notes": "Optional reviewer notes"
}
```

**What it does:**
- `approve`: Sets exchange status to `approved`. Creates `golden_responses` row with original question + original response.
- `edit`: Sets exchange status to `edited`. Creates `golden_responses` row with original question + edited response.
- `reject`: Sets exchange status to `rejected`. No golden response created.
- All actions set `reviewed_at` to now.

### 4. `POST /api/admin/knowledge/sync` ✅ DONE (Sessions 57–58)

Syncs golden responses to Vapi's knowledge base.

**What it does:**
1. Fetches all active golden responses for the business, grouped by topic
2. Generates a markdown document:

```markdown
# Luis Mobile Detail — Proven Responses

## Pricing
Q: How much does a full detail cost?
A: A full detail starts at $350. It includes a complete interior and exterior...

Q: Do you charge extra for SUVs?
A: Our pricing is the same regardless of vehicle size...

## Services
Q: Do you do ceramic coating?
A: We don't currently offer ceramic coating, but our Full Detail includes...

## Location
Q: Do you come to Arcadia?
A: Yes! We serve all of the San Gabriel Valley including Arcadia...

## Scheduling
Q: Can I book for this weekend?
A: Absolutely! You can call us or use the booking form on our website...
```

3. Uploads the markdown to Vapi as a file (PUT or POST to Vapi Files API)
4. If a previous knowledge file exists (`vapi_knowledge_file_id` on businesses table), deletes the old one first
5. Updates the Vapi assistant's query tool to include the new file
6. Updates `businesses.last_knowledge_sync` and `businesses.vapi_knowledge_file_id`

**Vapi API references:**
- Upload file: `POST https://api.vapi.ai/file` with multipart form data
- Delete file: `DELETE https://api.vapi.ai/file/{fileId}`
- Update tool: `PATCH https://api.vapi.ai/tool/{toolId}`
- Vapi API key is in env var `VAPI_API_KEY`

> **Critical Vapi API constraint (discovered Session 58):** Query tools require `provider: 'google'` in the `knowledgeBases` array — NOT `provider: 'canonical'`. The `/knowledge-base` resource (separate from `/tool`) accepts `canonical` but has no mechanism to attach to query tools or assistants. Using `canonical` in a query tool's `knowledgeBases` returns a 422. The correct shape: `knowledgeBases: [{ provider: 'google', name, description, fileIds: [fileId] }]`. Query tool `5e9d7c16` was created during Session 58 and is already attached to Connie's assistant (`a831eec7`) — 7 tools total.

**Auth:** Same as other admin endpoints.

---

## Admin UI — "Train AI" Tab (Tab 8) ✅ DONE (Session 56)

Add to `admin/index.html` following the same patterns as existing tabs.

### Tab Header
Label: "Train AI" (or "Train Connie" if we want personality)

### Top Section — Stats Bar
Three stat cards in a row:
- **Pending Review** — count of exchanges with status `pending_review` (highlight if > 0)
- **Approved** — count of golden_responses where is_active = true
- **Last Sync** — formatted date from `businesses.last_knowledge_sync` (or "Never" if null)

### Main Section — Review Queue

If pending_review count = 0, show: "All caught up! Connie's learning from every call." with a checkmark.

If pending > 0, show one exchange card at a time (card-swipe pattern):

```
┌─────────────────────────────────────┐
│  Customer asked:                    │
│  ┌─────────────────────────────────┐│
│  │ "How much does a full detail    ││
│  │  cost for a big truck?"         ││
│  └─────────────────────────────────┘│
│                                     │
│  Connie said:                       │
│  ┌─────────────────────────────────┐│
│  │ "A full detail starts at $350.  ││
│  │  That covers any vehicle size,  ││
│  │  including trucks and SUVs."    ││
│  └─────────────────────────────────┘│
│                                     │
│  Topic: pricing  ·  Jun 24, 2:15pm │
│                                     │
│  ┌──────┐  ┌──────┐  ┌───────────┐ │
│  │  👍  │  │  👎  │  │  ✏️ Edit  │ │
│  │ Good │  │ Bad  │  │           │ │
│  └──────┘  └──────┘  └───────────┘ │
│                                     │
│        3 of 15 remaining            │
│        ◀ Previous   Next ▶          │
└─────────────────────────────────────┘
```

**When 👍 clicked:**
- POST to `/api/admin/review` with action `approve`
- Show brief green flash "Approved!"
- Auto-advance to next exchange

**When 👎 clicked:**
- Optional: small textarea for "Why?" (can be skipped)
- POST with action `reject`
- Show brief red flash "Skipped"
- Auto-advance

**When ✏️ clicked:**
- Show modal with editable textarea pre-filled with Connie's response
- "Save Edited Response" button
- POST with action `edit` and edited_response
- Show brief yellow flash "Saved with edits!"
- Auto-advance

### Bottom Section — Sync Button

```
┌─────────────────────────────────────┐
│  Knowledge Base                     │
│  23 proven responses · Last synced  │
│  June 24, 2026 at 3:45 PM          │
│                                     │
│  ┌─────────────────────────────────┐│
│  │    🔄 Sync to Connie            ││
│  └─────────────────────────────────┘│
│                                     │
│  Syncs all approved responses to    │
│  Connie's knowledge base so she     │
│  uses them on future calls.         │
└─────────────────────────────────────┘
```

**When clicked:**
- Show loading spinner on button
- POST to `/api/admin/knowledge/sync`
- On success: "Synced! Connie now knows 23 proven responses."
- On error: "Sync failed. Try again."
- Update "Last synced" display

### Filter Controls (above review queue)
- Topic filter: All / Pricing / Services / Scheduling / Location / Other
- Status filter: Pending / Approved / Rejected / All

---

## Updating Connie's System Prompt ✅ DONE (Session 57)

After the knowledge sync infrastructure is built, update `config/vapi-assistant.js` to include a query tool instruction. Add to the system prompt:

```
KNOWLEDGE BASE:
Before answering questions about pricing, services, availability, service area, 
or policies, use the search_knowledge tool to look up proven answers. 
If a proven answer exists, use it. If not, answer from your general knowledge 
and the customer's question will be reviewed later.
```

This requires creating a Vapi Query Tool attached to the assistant that searches the uploaded knowledge file. The tool should be:
- Name: `search_knowledge`
- Type: Query
- Description: "Search company knowledge base for proven responses to customer questions about pricing, services, scheduling, and service area."
- File: the uploaded markdown file from the sync endpoint

---

## Multi-Tenant Considerations (for later)

Everything is scoped by `business_id` already. When this expands beyond Luis:
- Each business gets their own Vapi assistant with their own query tool
- Each business's golden responses sync to their own knowledge file
- The admin panel filters by the logged-in user's business_id
- The review queue only shows that business's exchanges

No additional schema changes needed — just auth context.

---

## Build Order

1. ✅ Run the SQL migrations (alter `call_logs` + 2 new tables + 2 ALTER TABLE on `businesses`)
2. ✅ Build `processCallEnded` in `api/voice/call-ended.js`, called from `api/voice/webhook.js`
3. ✅ Build `GET /api/admin/exchanges` endpoint
4. ✅ Build `POST /api/admin/review` endpoint (note: NOT `/api/admin/exchanges/review`)
5. ✅ Build the "Train AI" tab in admin/index.html
6. ✅ Build `POST /api/admin/knowledge/sync` endpoint
7. ✅ Create the Vapi query tool (`5e9d7c16`) and attach to Connie's assistant
8. ✅ Update Connie's system prompt with KNOWLEDGE BASE instruction
9. ☐ Verify sync returns correct golden_responses count (currently returning 0 — suspected `business_id` or `is_active` mismatch in the `golden_responses` row written during testing)
10. ☐ End-to-end test: call → review → sync → call again → verify Connie uses the proven answer

---

## Test Checklist

- [x] Make a test call, ask "How much is a full detail for a truck?"
- [x] Check `call_logs` table — new row with transcript
- [x] Check `call_exchanges` table — Q&A pair extracted with topic `pricing`
- [x] Open admin → Train AI tab → exchange appears
- [x] Click 👍 → golden_responses table has new row
- [ ] Click Sync → Vapi file uploaded, assistant updated with correct count (currently returns 0 — needs debug)
- [ ] Make another call, ask same question → Connie uses the proven response
- [ ] Edit a response → verify edited version syncs
- [ ] Reject a response → verify it doesn't appear in knowledge base
