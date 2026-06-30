# Plan: Hey Connie — Website Builder (Phase 1)

## Context
Every Hey Connie detailer needs a public-facing booking page the moment they sign up. Right now the only example is Luis's hand-built `index.html`. This phase automates that: detailer signs up → they get `heyconnie.co/their-slug` instantly → they can customize it (photos, tagline) from the admin panel → done. No code, no Wix, no web designer needed.

Two templates to start. More can be added later. Photos are uploaded directly (no URL pasting). Instagram shown as a read-only pull if they've provided their handle.

## Prerequisites
- Multi-tenant routing is done (Phase 3 complete per recent commits) ✓
- `businesses.base_url` exists and points to tenant's booking API ✓
- `vercel.json` in heyconnie project already has `/:slug → /api/b/:slug` rewrite ✓
- `api/b/` directory already exists in heyconnie project ✓

---

## What We're Building

### Two Templates Only (for now)
1. **Bold & Dark** — Luis's aesthetic. Dark bg, high-contrast, car-guy energy. Default template.
2. **Clean Pro** — White background, minimal, premium feel. Second option.

Both templates include:
- Business name, tagline, phone (links to Connie's Vapi number)
- Service cards with prices (from `services` table)
- Photo gallery (up to 6 uploaded images)
- 3-step booking form (same form as Luis's site)
- Instagram icon link (if `businesses.instagram` is set)
- "Powered by Hey Connie" footer
- Mobile-first, no framework, inline CSS/JS

### Admin Panel — "My Website" Tab
Simple. Four sections:
1. **Publish toggle** — on/off. When on, shows their live URL with copy button.
2. **Template picker** — 2 cards with screenshot previews. Click to select.
3. **Customize** — Tagline (text input) + up to 6 photo upload slots. Each slot shows current image or empty state. Upload replaces it.
4. **Embed code** — Readonly textarea with their iframe snippet. Copy button.

### Photo Uploads
- Upload goes to **Supabase Storage** (`business-photos` bucket, public)
- Each upload slot = one file input. On change → POST to `api/admin/upload-photo.js` → returns public URL → stored in `businesses.gallery_image_urls` (JSONB array)
- Live preview updates in the admin panel immediately after upload
- Instagram: if `businesses.instagram` is set, show their handle as a link in the template. No API pull — just the link. (Full Instagram import is a future nice-to-have, not now)

---

## Database Changes

### New columns on `businesses`
```sql
ALTER TABLE businesses ADD COLUMN website_template TEXT DEFAULT 'bold-dark';
ALTER TABLE businesses ADD COLUMN website_enabled BOOLEAN DEFAULT false;
ALTER TABLE businesses ADD COLUMN facebook_url TEXT;
ALTER TABLE businesses ADD COLUMN hero_image_url TEXT;
ALTER TABLE businesses ADD COLUMN gallery_image_urls JSONB DEFAULT '[]';
ALTER TABLE businesses ADD COLUMN tagline TEXT;
ALTER TABLE businesses ADD COLUMN website_custom_domain TEXT;
```

### New column on `bookings`
```sql
ALTER TABLE bookings ADD COLUMN sms_consent_at TIMESTAMPTZ;
```

### Seed Luis's row
```sql
UPDATE businesses SET
  website_template = 'bold-dark',
  website_enabled = true,
  instagram = 'https://www.instagram.com/luismobiledetail/',
  tagline = 'Mobile Car Detailing in the San Gabriel Valley'
WHERE id = 'luis-mobile-detail';
```

### Supabase Storage
- Create bucket: `business-photos`, public read
- RLS: service key can write, anon can read

---

## Files to Create / Modify

### heyconnie project

| File | Action | What |
|---|---|---|
| `api/b/[slug].js` | Modify (exists, likely stub) | Full template renderer — reads businesses + business_profiles + services, renders HTML |
| `api/book-widget.js` | Modify (exists) | Confirm it renders form-only page for iframe use |
| `api/admin/upload-photo.js` | Create | Accepts multipart upload, writes to Supabase Storage, updates gallery_image_urls, returns public URL |
| `api/admin/website-settings.js` | Create | GET + PATCH for website_template, website_enabled, tagline, hero_image_url, gallery_image_urls, facebook_url |
| `templates/bold-dark.js` | Create | Function: `renderBoldDark(data)` → returns full HTML string |
| `templates/clean-pro.js` | Create | Function: `renderCleanPro(data)` → returns full HTML string |
| `templates/booking-form.js` | Create | Shared booking form HTML (3-step) used by both templates + book-widget |
| `admin/index.html` | Modify | Add "My Website" tab (Tab 10) |

### Luis Mobile Detail project (`/Users/guest123/Projects/Luis Mobile Detail`)
This is a **separate Vercel project** — not part of heyconnie. Luis's booking APIs stay here and are called cross-origin by the heyconnie-hosted pages via `businesses.base_url`. Only one change needed here:
- `api/book.js` — add `sms_consent_at` to the bookings insert (one-line change)

---

## Build Sequence

### Step 1 — DB migration
Run SQL above against Supabase. Seed Luis's row. Create `business-photos` storage bucket.

### Step 2 — Template renderer (`api/b/[slug].js`)
- Query businesses, business_profiles, services
- If `website_enabled = false` → return 404 branded page
- Select template based on `website_template`
- Call `renderBoldDark(data)` or `renderCleanPro(data)`
- Return HTML with correct Content-Type

Data shape passed to renderer:
```js
{
  business: { id, name, phone, instagram, facebook_url, tagline, hero_image_url, gallery_image_urls, website_template },
  profile: { owner_name, service_area, hours, policies, tone },
  services: [{ name, starting_price, duration, description }],
  apiBase: business.base_url  // for booking form API calls
}
```

### Step 3 — Bold & Dark template (`templates/bold-dark.js`)
Build this first. The source design is Luis's hand-built site at `/Users/guest123/Projects/Luis Mobile Detail/index.html` (2,184 lines). That file is the reference — not built in heyconnie, it's a standalone Vercel project. We extract and parameterize its structure:
- Dark hero with business name + tagline + phone CTA
- Service cards (map over services array)
- Photo gallery grid (map over gallery_image_urls)
- 3-step booking form (from `templates/booking-form.js`)
- SMS consent checkbox (required, logs sms_consent_at)
- Footer with "Powered by Hey Connie" + Instagram/Facebook links if set

Inline all CSS. No external dependencies except Google Fonts.

### Step 4 — Verify heyconnie.co/luis-mobile-detail renders
Test locally with `vercel dev`. Confirm:
- [ ] Page renders with Luis's real data
- [ ] Service cards show real prices
- [ ] Booking form submits to `luis-mobile-detailing.vercel.app/api/book`
- [ ] SMS consent checkbox blocks submission if unchecked
- [ ] `sms_consent_at` logged in bookings table

### Step 5 — Photo upload endpoint (`api/admin/upload-photo.js`)
- Auth: `x-admin-secret` header
- Accepts: multipart/form-data with `file` + `business_id` + `slot` (0-5)
- Uploads to Supabase Storage: `business-photos/{business_id}/{slot}.jpg`
- Updates `businesses.gallery_image_urls[slot]` with public URL
- Returns `{ url }`

### Step 6 — Website settings endpoint (`api/admin/website-settings.js`)
- `GET ?business_id=` → returns current website settings fields
- `PATCH` body: any subset of `{ website_template, website_enabled, tagline, hero_image_url, facebook_url }`
- Auth: `x-admin-secret`

### Step 7 — Admin panel "My Website" tab
Add to `admin/index.html` after the Biz Profile tab. Four sections:
1. Toggle + live URL display
2. Template picker: 2 cards (Bold & Dark / Clean Pro) with visual thumbnails — radio select, auto-saves on click
3. Customize: tagline input + 6 photo upload slots (file input → preview image → uploads on change)
4. Embed code: readonly textarea with iframe snippet, copy button

### Step 8 — Clean Pro template (`templates/clean-pro.js`)
Same data shape, different visual. White background, clean card layout. Build after Bold & Dark is validated.

### Step 9 — `detailer-signup.js` update
After signup creates the businesses row, set `website_enabled = true` and `website_template = 'bold-dark'` automatically. They get a live URL the moment they sign up (One-Pager behavior until they add photos/tagline).

---

## Open Decisions (Resolved)
- **Auto-enable on signup:** Yes — they get a live URL immediately
- **Pricing source:** `services` table only (not business_profiles)
- **Image handling:** Supabase Storage upload, not URL paste
- **Instagram:** Display link only, no API import
- **Booking API location:** Stays on per-tenant Vercel project (cross-origin via base_url) for now
- **Templates:** 2 to start (Bold & Dark, Clean Pro). Add others after first detailer feedback.

---

---

## Agent Implementation Prompts

Use these prompts to hand off each phase to an implementer agent. Paste the prompt, wait for the status report, then move to the next phase.

---

### Phase 1 Prompt — Database + Storage Setup

```
PROJECT: heyconnie (/Users/guest123/Projects/heyconnie)
TASK: Database migration + Supabase Storage setup for the website builder feature.

SUPABASE PROJECT: DetailFlow (kgyipdyhzaypcxcpxqsg)
Use the Supabase MCP to run all SQL and storage setup.

STEP 1 — Run this migration:
ALTER TABLE businesses ADD COLUMN website_template TEXT DEFAULT 'bold-dark';
ALTER TABLE businesses ADD COLUMN website_enabled BOOLEAN DEFAULT false;
ALTER TABLE businesses ADD COLUMN facebook_url TEXT;
ALTER TABLE businesses ADD COLUMN hero_image_url TEXT;
ALTER TABLE businesses ADD COLUMN gallery_image_urls JSONB DEFAULT '[]';
ALTER TABLE businesses ADD COLUMN tagline TEXT;
ALTER TABLE businesses ADD COLUMN website_custom_domain TEXT;
ALTER TABLE businesses ADD COLUMN domain_status TEXT DEFAULT NULL;

ALTER TABLE bookings ADD COLUMN sms_consent_at TIMESTAMPTZ;

STEP 2 — Seed Luis's row:
UPDATE businesses SET
  website_template = 'bold-dark',
  website_enabled = true,
  instagram = 'https://www.instagram.com/luismobiledetail/',
  tagline = 'Mobile Car Detailing in the San Gabriel Valley'
WHERE id = 'luis-mobile-detail';

STEP 3 — Create Supabase Storage bucket named 'business-photos'. Set it to public read. No file uploads yet — just the bucket.

STEP 4 — Verify: query the businesses table and confirm the new columns exist on Luis's row. Confirm the bucket exists.

Return a status report:
- Which SQL statements ran successfully
- Luis's row values after the seed
- Bucket creation confirmed
- Any errors or skipped steps
```

---

### Phase 2 Prompt — Template Renderer

```
PROJECT: heyconnie (/Users/guest123/Projects/heyconnie)
TASK: Build the hosted page renderer — heyconnie.co/[slug] → full business page HTML.

CONTEXT:
- vercel.json already has rewrite: /:slug → /api/b/:slug (do not change vercel.json)
- api/b/ directory already exists
- Reference design: /Users/guest123/Projects/Luis Mobile Detail/index.html (2,184 lines) — this is the Bold & Dark aesthetic we're replicating as a parameterized template
- Supabase project: kgyipdyhzaypcxcpxqsg
- businesses table now has: website_template, website_enabled, tagline, hero_image_url, gallery_image_urls, instagram, facebook_url
- services table has: name, starting_price, duration, description per business_id

BUILD THESE FILES:

1. templates/bold-dark.js
   Export a function: renderBoldDark(data) → HTML string
   Data shape:
   {
     business: { id, name, phone, instagram, facebook_url, tagline, hero_image_url, gallery_image_urls },
     services: [{ name, starting_price, duration, description }],
     apiBase: string  // businesses.base_url — the booking API origin
   }
   Design: dark background (#0f172a), high-contrast white text, blue CTAs (#1d4ed8).
   Sections: hero (name + tagline + phone CTA), service cards, photo gallery grid (skip if gallery_image_urls is empty), 3-step booking form (import from templates/booking-form.js), footer.
   Inline all CSS. Barlow Condensed + DM Sans via Google Fonts. No external JS deps.

2. templates/booking-form.js
   Export a function: renderBookingForm({ businessId, apiBase, businessName }) → HTML string
   3-step form matching Luis's existing form structure:
   - Step 1: Make (dropdown, 40+ makes with cascading models) + Year
   - Step 2: Service (populated from window.SERVICES injected by the renderer) + condition checkboxes + notes
   - Step 3: Name, phone, email (optional), address/city, date, time, promo code (optional)
   SMS/TCPA consent checkbox below submit button — required before submission:
   "☐ I agree to receive SMS messages from [businessName] regarding my booking... Reply STOP to opt-out."
   Links: Terms → heyconnie.co/terms · Privacy → heyconnie.co/privacy
   On submit: POST to {apiBase}/api/book with all fields + sms_consent_at: new Date().toISOString()
   On success: show confirmation. On error: show user-friendly message, preserve form data.

3. api/b/[slug].js (or api/b/index.js — check existing file, modify if stub exists)
   - Read slug from req.query.slug or URL path
   - Query businesses WHERE id = slug AND website_enabled = true
   - If not found → return 404 HTML: Hey Connie branding, "This page doesn't exist yet", CTA to heyconnie.co signup
   - Query services WHERE business_id = slug
   - Select renderer based on business.website_template ('bold-dark' → renderBoldDark, default to bold-dark)
   - Set window.SERVICES in a <script> tag so the booking form can populate the service dropdown
   - Return rendered HTML with Content-Type: text/html
   - Set correct <title>, <meta description>, OG tags using business name + tagline

RULES:
- No frameworks, no npm installs, plain HTML/CSS/JS in the rendered output
- Inline all CSS — no separate stylesheets
- Never modify vercel.json
- Surgical edits only — don't touch other api/ files

Return a status report:
- Files created/modified
- What heyconnie.co/luis-mobile-detail would render (describe the page)
- Any blockers or open questions
```

---

### Phase 3 Prompt — Booking Widget + SMS Consent

```
PROJECTS: heyconnie (/Users/guest123/Projects/heyconnie) AND Luis Mobile Detail (/Users/guest123/Projects/Luis Mobile Detail)
TASK: Standalone booking widget page + SMS consent logging.

PART A — heyconnie project: api/book-widget.js
This file may already exist. Check it.
It should render ONLY the booking form — no hero, no nav, no footer, no template chrome.
Designed to sit inside an iframe on someone else's website.
Use renderBookingForm() from templates/booking-form.js (built in Phase 2).
Route: heyconnie.co/book/[slug] — vercel.json already has this rewrite to /api/book-widget.
Accept slug from req.query.slug.
Query businesses WHERE id = slug (website_enabled does NOT need to be true for the widget).
Query services WHERE business_id = slug.
Return clean form HTML. Include minimal CSS — white background, full-width layout for iframe use.

PART B — Luis Mobile Detail project: api/book.js
Add sms_consent_at to the bookings insert.
Read it from req.body.sms_consent_at.
If present: include in the Supabase insert. If absent (old callers without consent): insert as null.
One surgical change — do not modify any other logic.

PART C — Test
Create a scratch file test-widget.html (do not commit) with:
<iframe src="http://localhost:3000/book/luis-mobile-detail" width="100%" height="700" frameborder="0"></iframe>
Describe what you see when you open it.

Return a status report:
- book-widget.js: what it renders, how it gets its data
- book.js change: exact line added
- Widget iframe test result
- Any errors
```

---

### Phase 4 Prompt — Photo Upload + Settings API

```
PROJECT: heyconnie (/Users/guest123/Projects/heyconnie)
TASK: Build two admin API endpoints for managing website settings and photo uploads.

SUPABASE PROJECT: kgyipdyhzaypcxcpxqsg
Supabase Storage bucket: 'business-photos' (public, already created in Phase 1)
Auth on all endpoints: x-admin-secret header must match process.env.ADMIN_SECRET

BUILD THESE FILES:

1. api/admin/upload-photo.js
   - Method: POST
   - Content-Type: multipart/form-data
   - Fields: file (image), business_id (string), slot (integer 0-5)
   - Upload file to Supabase Storage path: business-photos/{business_id}/{slot}.jpg
   - Upsert (overwrite if exists)
   - After upload, update businesses.gallery_image_urls:
     Read current array → set index [slot] = public URL → write back
     Public URL format: {SUPABASE_URL}/storage/v1/object/public/business-photos/{business_id}/{slot}.jpg
   - Return: { success: true, url: publicUrl, slot: slot }
   - Error handling: validate file is an image (check MIME type), validate slot is 0-5

   For multipart parsing use the 'formidable' package if available, or check package.json for what's already installed. Do not add new npm packages without checking first.

2. api/admin/website-settings.js
   - GET ?business_id=xxx → return { website_template, website_enabled, tagline, hero_image_url, gallery_image_urls, facebook_url, instagram, website_custom_domain, domain_status }
   - PATCH body: { business_id, ...any subset of above fields } → UPDATE businesses, return { success: true }
   - Only allow updates to these fields: website_template, website_enabled, tagline, hero_image_url, gallery_image_urls, facebook_url, instagram
   - Do NOT allow PATCH to set website_custom_domain or domain_status (those are controlled by the domain flow)
   - Validate website_template is one of: 'bold-dark', 'clean-pro'

Return a status report:
- Files created
- Any npm packages needed that weren't already installed
- Curl examples showing how to call each endpoint
- Any blockers
```

---

### Phase 5 Prompt — Admin Panel "My Website" Tab

```
PROJECT: heyconnie (/Users/guest123/Projects/heyconnie)
FILE: admin/index.html (large file — read before editing, surgical changes only)
TASK: Add "My Website" tab to the admin panel.

CONTEXT:
- admin/index.html is a single-file admin dashboard with sidebar nav tabs
- Find the existing tab pattern (sidebar nav item + tab content panel) and replicate it exactly
- New tab: "My Website" — insert after the last existing tab in the sidebar
- Tab content div id: websiteTab
- Uses same auth pattern as other tabs (x-admin-secret header in API calls)
- API endpoints built in Phase 4: /api/admin/website-settings (GET/PATCH) and /api/admin/upload-photo (POST)

TAB LAYOUT — 4 sections, in order:

SECTION 1 — Publish Your Website
- Toggle switch (checkbox styled as toggle): "Your website is live" / "Your website is offline"
- On toggle: PATCH /api/admin/website-settings with { business_id, website_enabled: true/false }
- When enabled: show live URL as a clickable link: heyconnie.co/{business_id}
- "Copy Link" button next to the URL

SECTION 2 — Choose Your Template
- 2 option cards side by side (or stacked on mobile)
- Card 1: "Bold & Dark" — dark background thumbnail, description: "High-contrast dark theme. Car-guy energy."
- Card 2: "Clean Pro" — white background thumbnail, description: "Minimal and modern. Premium feel."
- Currently selected card highlighted with a border/ring
- On click: PATCH /api/admin/website-settings with { business_id, website_template: 'bold-dark' or 'clean-pro' }
- Show success toast on save

SECTION 3 — Customize Your Page
- Tagline input: text field, 60 char max, placeholder "Mobile Car Detailing in [City]"
  On blur or save button: PATCH tagline
- 6 photo upload slots in a grid (2 cols on mobile, 3 cols on desktop)
  Each slot: if gallery_image_urls[i] exists → show the image as a thumbnail
              if empty → show a dashed box with "+" and "Upload Photo" label
  File input (hidden) triggered on click. On file select: POST to /api/admin/upload-photo with file + business_id + slot index
  Show loading spinner during upload. On success: update the thumbnail immediately.
  On error: show error message in that slot.
- Social Links subsection:
  Instagram URL input (pre-filled from settings)
  Facebook URL input (pre-filled from settings)
  Save button → PATCH both fields

SECTION 4 — Add Booking to Your Existing Website
- Header: "Already have a website?"
- Readonly textarea with embed code:
  <iframe src="https://heyconnie.co/book/{business_id}" width="100%" height="700" frameborder="0" style="border:none;"></iframe>
- "Copy Code" button

SECTION 5 — Custom Domain (placeholder only)
- Gray card with "Coming Soon" badge
- Text: "Want your own domain like yourbusiness.com? Connect any domain you own directly to your Hey Connie page."
- "Notify me when available" button (no backend needed — just show a toast "We'll let you know!")

On tab load: GET /api/admin/website-settings?business_id={currentBusinessId} and populate all fields.

RULES:
- Match existing tab structure exactly — same CSS classes, same sidebar pattern
- Do not modify any other tab's HTML or JS
- Mobile responsive — photo grid must work at 375px
- No new npm packages

Return a status report:
- Screenshot or description of the tab layout
- Any existing patterns you reused from other tabs
- Any fields that couldn't be pre-populated
- Any blockers
```

---

### Phase 6 Prompt — Clean Pro Template + Auto-Enable on Signup

```
PROJECT: heyconnie (/Users/guest123/Projects/heyconnie)
TASK: Build the second template and auto-enable websites on detailer signup.

PART A — templates/clean-pro.js
Export renderCleanPro(data) → HTML string
Same data shape as renderBoldDark (built in Phase 2).
Design: white background (#ffffff), dark text (#1a1a1a), blue accent (#1d4ed8), clean card layout.
Sections:
- Header: business name left-aligned, phone number as CTA button right-aligned
- Hero: large tagline text + "Book Now" button (scrolls to form)
- Services: horizontal card row, each card has name, "Starting at $X", description (if set)
- Gallery: 2-row grid of photos (skip section if gallery_image_urls is empty)
- Booking form: same renderBookingForm() from templates/booking-form.js
- Footer: "Powered by Hey Connie" + social links

Update api/b/[slug].js: add 'clean-pro' case → renderCleanPro(data)

PART B — api/detailer-signup.js
After the businesses row is created, add:
  website_enabled: true,
  website_template: 'bold-dark'
to the initial INSERT (or as an immediate UPDATE after insert).

New detailers should have a live page at heyconnie.co/{their-slug} the moment signup completes. No manual step required.

PART C — Test both templates
Temporarily change Luis's website_template to 'clean-pro' in Supabase, verify heyconnie.co/luis-mobile-detail renders Clean Pro correctly, then switch back to 'bold-dark'.

Return a status report:
- clean-pro.js: describe the visual layout
- detailer-signup.js: exact lines changed
- Template switch test results
- Final checklist — verify all 6 phase checklist items pass
```

---

### Session-Ending Prompt (use at end of each phase session)

```
SESSION END — Phase [X] complete.

Summarize in under 10 lines:
1. What was built
2. Files created or modified (with paths)
3. Any Supabase changes made
4. What was tested and the result
5. Anything left incomplete or deferred
6. What Phase [X+1] needs from this phase to proceed

Paste this summary into PROGRESS.md (newest entry on top) in the heyconnie project.
```

---

## Verification Checklist
```
□ heyconnie.co/luis-mobile-detail → renders Bold & Dark with real data
□ Service cards show real prices from services table
□ Booking form submits to Luis's API, creates booking in Supabase
□ sms_consent_at logged on submit
□ SMS consent checkbox blocks submission if unchecked
□ heyconnie.co/nonexistent → branded 404 page
□ heyconnie.co/book/luis-mobile-detail → form-only page, works in iframe
□ Admin "My Website" tab → toggle publishes/unpublishes
□ Admin → template switch re-renders page immediately
□ Admin → photo upload replaces slot, thumbnail updates live
□ Admin → embed code copies correctly
□ Mobile responsive at 375px on both templates
□ "Powered by Hey Connie" footer on all templates
□ Instagram link shows if set, hidden if not
```
