# Luis Mobile Detail — Session Progress Archive

_Sessions older than the 3 most recent. Newest first. Active log: [PROGRESS.md](PROGRESS.md)._

---

## Session 67 — 2026-06-27

### Current Phase: Phase 5 (master-build-playbook-v2.md — Business Profile + Admin Tab Fixes)

### What Was Done

#### Prompt 5 — Business Profile Tab (admin/index.html)
- Confirmed tab already fully built from prior session: all 6 sections, status badge, Regen KB button, voice callout, JS
- Ran live verification via Chrome DevTools against http://localhost:3005/admin/index.html

#### Bugs Found and Fixed
- **RLS violation on business_profiles** — table had RLS enabled with zero policies → deny all. Added migration `business_profiles_rls_allow_authenticated`: `CREATE POLICY "authenticated_full_access_business_profiles" ON business_profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);` — applied via Supabase MCP to project `kgyipdyhzaypcxcpxqsg`
- **Wrong phone numbers in Business Profile tab** — `bpSetupNumber` (empty state) and `bpVoiceNumber` (Update by Voice callout) both showed (626) 654-1924 (Connie/customer agent). Corrected to (818) 403-3447 (setup agent) in `admin/index.html`
- Committed and pushed to main → Vercel auto-deployed ✓

#### Investigation: Business Profile Gaps + Broken Admin Tabs
Deep-dive into admin panel surfaced 3 issues (not yet built — plan written):

**Issue 1 — Missing contact fields in Business Profile**
- `businesses` table has: phone, email, address, city, state, zip, timezone
- Settings tab already collects these → saves to `businesses` table via `/api/admin/settings`
- Business Profile tab does NOT collect them → gap for new detailers onboarding by voice
- Plan: add Contact & Location section to BP tab, saving via `/api/admin/settings` endpoint

**Issue 2 — Hours duplication (intentional, not a bug)**
- Settings hours → `availability_windows` table (booking slot engine)
- Business Profile hours → `business_profiles.hours` JSONB (voice agent knowledge)
- Two different purposes. Plan: add clarifying subtitle labels to both sections in UI only

**Issue 3 — Campaigns/Promos tabs broken for non-Luis businesses (CRITICAL BUG)**
- `loadCampaigns()` fetch call missing `?business=` param → silently loads luis-mobile-detail data for all businesses
- `launchCampaign()` POST also missing `?business=` param
- `api/admin/campaigns.js` has hardcoded fallback `const BUSINESS_ID = 'luis-mobile-detail'`
- `api/admin/promos.js` same hardcoded fallback
- Loyalty GET is correct (has `?business=`); Loyalty POST passes `business_id` in body (fine)
- Plan: fix fetch calls in admin/index.html + remove hardcoded fallbacks from both API files

### Decisions Made
- **Setup agent scope confirmed**: stays focused on business basics (services, hours, area, policies, FAQs). Does NOT interview about promos/loyalty/campaigns.
- **Post-onboarding nudge**: at end of setup call, agent mentions "check your admin panel for promotions and loyalty rewards, or ask me how they work."
- `mike-auto-spa` data confirmed in Supabase (status: review, 1 service: Mobile Car Wash $45/80min) but admin is hardcoded to `luis-mobile-detail` — expected single-tenant behavior for now.

### What's Verified Working
- Business Profile tab renders ✓
- Empty state correct for luis-mobile-detail (no profile row) ✓
- RLS fix applied — save will now work ✓
- Phone numbers corrected ✓
- Pushed to Vercel ✓

---

## Session 66 — 2026-06-27

### What Was Done

#### DNS / Resend setup — COMPLETE
- Navigated to Vercel team (BluHatFunding-Projects) → Domains → `heyconnie.co` → DNS Records
- Added all 4 Resend records manually in Vercel UI (DKIM, MX, SPF, DMARC)
- TTL set to 60 on all (fast propagation)
- Verified domain in Resend — SPF and DMARC verified first, DKIM followed within ~2 min. All 3 green.

#### Signup flow — end-to-end verified
- Deleted stale `test-detailing-co` row from Supabase via Supabase MCP
- Ran `POST https://heyconnie-gold.vercel.app/api/detailer-signup` with test data
- Supabase row created ✓
- Welcome email arrived at `astrauss99@gmail.com` from `setup@heyconnie.co` ✓
- Cleaned up test row again after confirmation

#### heyconnie.co custom domain — LIVE
- Added `heyconnie.co` to heyconnie Vercel project (Settings → Domains)
- Shows "Valid Configuration" immediately (nameservers already pointed to Vercel)
- Site confirmed live at https://heyconnie.co ✓

#### Favicon — heyconnie.co
- Created `favicon.svg` — coral `#f06071` letter C on dark `#0d0a0a` rounded square
- Fix: switched to inline data URI in `<link>` tag — Chrome rendered it immediately
- Files changed: `favicon.svg` (new), `index.html` (favicon link tag)
- Deployed and verified live ✓

### Issues Hit
- Vercel MCP `list_projects` returned empty array when using team ID directly; worked with team slug `andrew-3423s-projects`
- Chrome ignores SVG favicons served as external files; data URI approach works reliably
- Test row collision on second signup curl — had to delete the stale row first

### What's Verified Working
- `setup@heyconnie.co` sends email via Resend ✓
- `heyconnie.co` serves the landing page ✓
- Favicon shows in Chrome ✓
- Detailer signup flow: form → Supabase → email ✓

---

## Session 65 (continued, second) — 2026-06-26

### What Was Done
- Added 4 Resend DNS records to `heyconnie.co` in Vercel team-level DNS (DKIM, MX, SPF, DMARC)
- Verified `heyconnie.co` domain in Resend — all 3 checks green
- Tested signup end-to-end: `POST /api/detailer-signup` → Supabase row created → welcome email arrived ✓
- Cleaned up test row (`test-detailing-co`) from Supabase
- Added `heyconnie.co` as custom domain in heyconnie Vercel project — Valid Configuration ✓
- Site live at https://heyconnie.co ✓

---

## Session 65 (continued, first) — 2026-06-26

### Additional Work This Session

#### Email sender domain — multiple iterations

**Problem:** Welcome emails from `api/detailer-signup.js` were not arriving.

**Root cause:** Resend requires the sending domain to be verified via DNS records. `bluhatfunding.com` and `heyconnie.co` were not yet verified.

**Iterations:**
1. Initially set from address to `setup@heyconnie.co` (first build)
2. Andrew asked to change to `heyconniesetup@bluhatfunding.com` — done, pushed
3. Andrew confirmed `heyconnie.co` is the correct domain — reverted to `setup@heyconnie.co`

**Current from address:** `setup@heyconnie.co` in both projects (Luis + heyconnie). Both pushed to GitHub and deployed.

#### Signup flow tested end-to-end
- Ran live test against `heyconnie-gold.vercel.app` — DB side working, emails blocked (Resend domain not verified yet).

#### DNS / Resend setup — IN PROGRESS, NOT COMPLETE (at time of writing)
- `heyconnie.co` nameservers moved to Vercel in Namecheap. Namecheap is now registrar only.
- `heyconnie.co` added to Resend. DNS records to add are at the **team/account level** in Vercel:
  > Vercel dashboard → click team name → **Domains** in sidebar → click `heyconnie.co` → DNS Records section

---

## Session 65 — 2026-06-26

### What Was Done
**Step 1 — Diagnosed process-onboarding failure + fixed + re-triggered mike-auto-spa**
**Step 2 — Built api/detailer-signup.js (public signup endpoint)**
**Step 3 — Built heyconnie.co landing page + separate Vercel project**

#### Step 1 — process-onboarding.js bug fix
**Root cause:** Claude Haiku was returning JSON wrapped in markdown code fences. The `JSON.parse` call threw on every response.

**Fix:** `api/voice/process-onboarding.js` — added one regex strip before `JSON.parse`:
```js
text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
```

**Re-trigger:** Manually POSTed the full transcript from the Session 64 setup call to the live endpoint. Extraction succeeded. `business_profiles` for `mike-auto-spa` now has `profile_status: 'review'`, all fields populated.

#### Step 2 — api/detailer-signup.js
Public POST endpoint — no auth required. Input: `{ business_name, owner_name, owner_phone, owner_email }` (all required). Generates slug, collision checks, inserts businesses + business_profiles + onboarding_calls, sends welcome email, sends internal alert. Returns `{ success: true, business_id }`.

#### Step 3 — heyconnie.co site
- **New GitHub repo:** `bluhatbookkeeping/heyconnie` (public)
- **New Vercel project:** `heyconnie` — auto-deploys from GitHub
- **Live URL:** `heyconnie-gold.vercel.app`
- `index.html` — full single-page landing site, all HTML/CSS/JS inline, no framework
- `api/detailer-signup.js` — copy of the Luis project signup endpoint
- `package.json`, `vercel.json`

**Decision:** Separate Vercel project for heyconnie.co. Clean brand separation, avoids routing conflicts. Both projects connect to the same Supabase DB.

---

## Session 64 — 2026-06-26

### What Was Done
**Phase 2 end-to-end test — setup agent debugged and fixed, Hey Connie branding applied**

Created test business `mike-auto-spa` via `POST /api/admin/create-business` ✓

#### Setup Agent Debugging (4 bugs fixed)
- **Bug 1** — `firstMessage: ''` deadlock. Fix: Added `firstMessage` to ask caller to speak first.
- **Bug 2** — Model not invoked after firstMessage. Fix: Changed firstMessage to a question so caller speaks first to trigger model.
- **Bug 3** — "DetailFlow" branding. Fix: "DetailFlow" → "Hey Connie" throughout.
- **Bug 4** — MODE 2 left caller stranded ("What would you like to update?"). Fix: Rewrote MODE 2 to proactively walk through every profile area using `has_*` flags from lookupBusiness.

**Files modified:**
- `config/setup-agent.js` — 4 changes above, deployed to Vapi
- `api/voice/lookup-business.js` — added hours/policies/faq_seeds/tone to query, returns `has_*` flags

All changes PATCH'd live to Vapi assistant `281883e1-ee8a-4603-b5f8-7ddf22894f69`.

#### Commit
- `15b2f76` — Setup agent: guided walkthrough, Hey Connie branding, richer profile state in lookupBusiness

---

## Session 63 — 2026-06-25

### What Was Done
**Phase 2 completed through Prompt 7 — setup agent deployed, Prompt 7 built, all pushed to Vercel**

#### Task 1 — Automated Setup Agent Deploy

**`scripts/setup-agent-deploy.js`** — NEW one-time deploy script. Replaces the 11-step manual Vapi dashboard process:
- Creates "Hey Connie" Twilio sub-account → `[see Twilio dashboard]`
- Creates `lookupBusiness` tool in Vapi → `826a8cd6-d7df-4131-8dae-da2b9ca77cf3`
- Creates setup agent → `281883e1-ee8a-4603-b5f8-7ddf22894f69`
- Purchases (818) 403-3447, imports to Vapi, assigns to setup assistant → Vapi phone ID: `6a4eaf0f-cbcc-4463-b149-6d325c9fae41`
- Writes 4 Vercel env vars

Script is idempotent. Issues hit: Twilio sub-account URL construction, 818 area code returned no results under new sub-account (fixed by using master creds for search), second-run guard needed to resume instead of abort.

#### Task 2 — Prompt 7: New Detailer Signup

**`api/admin/create-business.js`** — NEW POST endpoint. Generates business_id slug, checks collision, inserts businesses + business_profiles + onboarding_calls. Returns `{ business_id, setup_phone: '(818) 403-3447', message }`.

#### Brand / Platform Decision
- Platform name: **Hey Connie** · Domain: **heyconnie.co**
- A2P SMS registration: pending. SMS features remain off until cleared.
- Architecture: one "Hey Connie" Twilio sub-account for all businesses.

#### Phone / ID Reference (all live)
| What | Value |
|---|---|
| Connie (customer agent) | `a831eec7-9b7b-4b0c-928c-dea1c3cfd296` |
| Connie phone | (626) 654-1924 · Vapi ID `5c541553-626b-4d99-98f8-a0fd40abb147` |
| Setup agent | `281883e1-ee8a-4603-b5f8-7ddf22894f69` |
| Setup phone | (818) 403-3447 · Vapi ID `6a4eaf0f-cbcc-4463-b149-6d325c9fae41` |
| Twilio sub-account | `[see Twilio dashboard]` |

---

## Session 62 — 2026-06-25

### What Was Done
**Phase 2 continued — Business Profile admin tab, onboarding webhook, owner_phone multi-tenant column**

#### Task 1 — Business Profile tab in admin panel (Phase 2, Prompt 5)

**`admin/index.html`** — Tab 9 "Biz Profile" added. Contains: status badge, Regen KB button, empty state, 6 sections (Business Basics, Services & Pricing, Service Area, Hours, Policies, Seed FAQs), Update by Voice card. All JS functions prefixed `bp`. sw.js v43 → v44.

#### Task 2 — Onboarding webhook (Phase 2, Prompt 6)

**`api/voice/setup-call-ended.js`** — NEW POST endpoint. Business resolution: checks `business_profiles.owner_phone` → `businesses.owner_phone` → logs warning and returns 200 if no match. Determines call_type from profile_status. POSTs to `/api/voice/process-onboarding`. Guards: skips if no caller phone or transcript < 50 chars.

#### Task 3 — `owner_phone` column on `businesses` table (multi-tenant prep)

**Migration applied:** `ALTER TABLE businesses ADD COLUMN owner_phone TEXT`. Luis's row seeded with `4152794984`.

**Phone semantics:**
| Field | Purpose |
|---|---|
| `businesses.phone` | Public number customers dial |
| `businesses.owner_phone` | Owner's personal cell — setup agent ID |
| `businesses.transfer_number` | Connie's outbound transfer target |
| `business_profiles.owner_phone` | Primary setup caller ID (post-call) |

**Files updated:** `setup-call-ended.js`, `lookup-business.js`, `api/admin/settings.js`, `DB_SCHEMA.md`.

### Issues Hit
- `setup-call-ended.js` fallback was filtering `businesses.phone` (public Twilio line) — would never match an inbound call from the owner's personal cell. Caught during planning.
- `lookup-business.js` had no fallback for first-time callers with no profile row yet.

### CURRENT PHASE: Phase 2
### LAST COMPLETED PROMPT: Prompt 6
### NEXT PROMPT TO RUN: Prompt 7

---

## Session 61 — 2026-06-25

### What Was Done
**Phase 2 foundation built — database, setup agent, transcript processing, knowledge generation**

#### Task 1 — Database tables (Phase 2, Prompt 1)
Created `business_profiles` and `onboarding_calls` tables in Supabase via `apply_migration`. Verified in table list.

#### Task 2 — Setup agent + lookup tool (Phase 2, Prompt 2)
- **`api/voice/lookup-business.js`** — Vapi server tool. Looks up `business_profiles` by owner_phone. Returns found/profile data. Falls back to `{ found: false }` on any error.
- **`config/setup-agent.js`** — setup agent config. Two-mode system prompt: MODE 1 (first-time setup) and MODE 2 (profile update). firstMessage is empty string. Only tool: lookupBusiness.

#### Task 3 — Transcript processing (Phase 2, Prompt 3)
**`api/voice/process-onboarding.js`** — POST endpoint. Handles initial_setup (full profile upsert) and profile_update (delta merge). Calls Claude Haiku with two separate cached system prompts. `mergeProfile()` handles array/object/text field merge rules.

#### Task 4 — Generate Day 1 knowledge base (Phase 2, Prompt 4)
- **`api/admin/knowledge/sync.js`** — refactored: extracted `runSync(businessId, assistantId)`, now reads from both `golden_responses` AND `knowledge_base`.
- **`api/admin/generate-knowledge.js`** — POST endpoint (JWT auth). Generates Q/A rows from profile, upserts to `knowledge_base`, calls `runSync()`, sets profile_status = 'active'.

### Issues Hit
- `knowledge_base` has no unique constraint on `question` — can't use `.upsert()`. Implemented manual fetch → compare → insert/update loop.
- `sync.js` only read from `golden_responses` before this session — refactored to add `knowledge_base` reads.

### CURRENT PHASE: Phase 2
### LAST COMPLETED PROMPT: Phase 2, Prompt 4
### NEXT PROMPT TO RUN: Phase 2, Prompt 5

---

## Session 60 — 2026-06-25

### What Was Done
**Learning loop sync bug fixed + Connie system prompt restored**

#### Task 1 — Diagnosed "0 proven responses" sync bug
Root causes:
1. **RLS blocking client-side count** — `golden_responses` had RLS enabled with zero policies. Anon client got 0 rows back. Sync API (service key) was actually working. Fix: Added RLS SELECT policy for authenticated users.
2. **UI used local counter instead of API response** — `syncKnowledge()` showed `_totalApproved` instead of `d.synced`. Fixed to use API response.

Verified: Admin Train AI tab now shows "1 proven response · Last synced Jun 25, 10:55 AM"

#### Task 2 — Connie system prompt wiped by sync
**Root cause:** `api/admin/knowledge/sync.js` PATCHed Vapi assistant with only `{ model: { provider, model, toolIds } }`. Vapi replaces the entire `model` object on PATCH — doesn't merge nested objects. Wiped `systemPrompt`, `temperature`, `firstMessage`, and all other model config.

**Fix:** `sync.js` now spreads existing `assistant.model` before overriding `toolIds`. Ran `node scripts/vapi-setup.js` to restore Connie's system prompt.

Verified: Called (626) 654-1924 — Connie correctly mentioned vehicles on file.

### Issues Hit
- Vapi PATCH on nested objects (like `model`) replaces the entire object. Always spread existing config before patching.

### Decisions Made
- Sync fix uses `{ ...existingModel, toolIds: updatedToolIds }` — resilient to future config changes.

### CURRENT PHASE: Phase 1
### LAST COMPLETED PROMPT: Phase 1, Prompt 1 (sync bug fixed)
### NEXT PROMPT TO RUN: Phase 1, Prompt 2 (end-to-end test — manual, no code needed)

---
