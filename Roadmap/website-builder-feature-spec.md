# Hey Connie — Website Builder + Booking Widget

_Status: Planned — not built. Supersedes `multitenant-hosted-pages-embed.md`. Merge into master-build-playbook.md before building._

---

## What This Is

Two delivery modes that give every Hey Connie detailer a customer-facing booking presence:

1. **Hosted microsite** — `heyconnie.co/luis-mobile-detail` — a branded single-page website auto-generated from onboarding data, with five selectable templates. The detailer picks a template, confirms their info, pastes image URLs and social links, and they're live in under 5 minutes.

2. **Embeddable booking widget** — a single `<script>` tag or iframe a detailer drops on their existing website. Same booking form, same SMS consent, same lead flow. For detailers who already have a site and just want the AI booking experience.

Both feed into the same Supabase backend. Both include TCPA-compliant SMS consent at the point of booking.

---

## Why This Matters

Most mobile detailers don't have a website. They run their business off Instagram, Facebook, and word of mouth. When they sign up for Hey Connie, they get an AI receptionist — but nowhere to send online traffic. Without this feature, they either:

- Need their own website (most don't have one, and won't build one)
- Get a custom site built (expensive, slow, outside Hey Connie's scope)
- Just use the phone number (works, but leaves online lead gen on the table)

With this, every new detailer gets a bookable URL the moment their profile is set up: `heyconnie.co/their-slug`. Zero technical setup. Shareable immediately on Instagram bios, Facebook pages, Google Business profiles, and via text to potential customers.

This is **not** competing with Squarespace, Wix, or any website builder. This is a throwaway — a complete system included free with the monthly platform fee. The detailer who signs up for Hey Connie and gets a working website with booking in 5 minutes is locked in deeper than the one who just has a phone agent.

For detailers who already have a website, the booking widget lets them add the AI booking experience without replacing anything.

---

## What Already Exists (Build On This)

Before building, know what's already in place:

| What | Where | Status |
|---|---|---|
| `heyconnie.co` Vercel project | `bluhatbookkeeping/heyconnie` repo | Live. Landing page + signup form. |
| `vercel.json` with routes | heyconnie project | Has `/api/*` and `/*` → index.html. Needs rewrite rule added. |
| `api/detailer-signup.js` | Both Luis + heyconnie projects | Live. Creates businesses row, sends welcome email. |
| `businesses.base_url` column | Supabase | Exists. Stores detailer's API deployment URL. |
| `businesses.instagram` column | Supabase | Exists. Not populated for Luis yet. |
| `business_profiles` table | Supabase | Exists. Has structured services, cities, hours, policies, tone from onboarding. |
| `services` table | Supabase | Exists. Service catalog with name, price, duration per business. |
| Booking APIs | Luis Vercel project | `/api/book`, `/api/slots`, `/api/working-days`, `/api/lookup-customer` — all live with CORS. |
| Luis's live site | `luis-mobile-detailing.vercel.app` | Full single-page site with 3-step booking form. This is the reference implementation. |
| `multitenant-hosted-pages-embed.md` | Project root | Earlier spec — this document supersedes it. |

---

## Data Sources for Auto-Generation

The microsite pulls from two tables to auto-populate. The detailer doesn't have to re-enter anything — it's all captured during onboarding.

**From `business_profiles`:**
- `business_name` → hero headline, page title, meta tags
- `owner_name` → optional "Meet the Owner" section
- `services` (JSONB) → service cards with name, price, duration, description
- `service_area.cities` (JSONB) → service area section, meta description
- `hours` (JSONB) → hours of operation display
- `policies` (JSONB) → cancellation, weather, payment methods
- `tone` (JSONB) → `agent_name`, `style` (friendly/professional/casual)

**From `businesses`:**
- `phone` → "Call Now" CTA (links to Connie's Vapi number)
- `instagram` → Instagram icon link + optional gallery pull
- `base_url` → API base for booking form (slots, book endpoints)

**New columns needed on `businesses`:**

| Column | Type | Purpose |
|---|---|---|
| `website_template` | TEXT | Selected template slug: `clean-pro`, `bold-dark`, `local-trust`, `gallery-first`, `one-pager` |
| `website_enabled` | BOOLEAN DEFAULT false | Toggle to publish/unpublish the hosted page |
| `facebook_url` | TEXT | Facebook page URL |
| `hero_image_url` | TEXT | Primary hero/banner image URL |
| `gallery_image_urls` | JSONB | Array of image URLs for gallery section (up to 9) |
| `tagline` | TEXT | Short business tagline for hero subtitle |
| `website_custom_domain` | TEXT | Future: custom domain mapping |

Note: `instagram` column already exists on `businesses`. `business_id` (the slug) is already the URL path — no new slug column needed.

---

## The Five Templates

Each template is a self-contained HTML renderer that takes the same data and presents it differently. All templates include the same booking widget — only the visual wrapper changes.

### 1. Clean Pro
Minimal white background, big hero image, clean service cards, strong "Book Now" CTA. Think Apple-clean. Best for: detailers who want to look premium and modern.

### 2. Bold & Dark
Dark background (#0f172a range), high-contrast text, aggressive coral/red CTAs, strong typography. Best for: the "car guy" brand — detailers who appeal to enthusiasts.

### 3. Local Trust
Warm tones, testimonial-forward layout, neighborhood feel, rounded corners, softer palette. Best for: family-run operators who want to feel approachable and established.

### 4. Gallery First
Instagram-style image grid as the hero, minimal text, let the work speak for itself. Images from `gallery_image_urls` dominate the page. Best for: detailers with strong before/after photos.

### 5. One-Pager Express
The absolute minimum: logo/name, tagline, services list with prices, booking widget, phone number, social links. No hero image required. No scrolling sections. Best for: fastest possible setup, detailers who just need a booking link.

All five templates share:
- Same booking form (3-step: Service → Contact/Vehicle → Schedule)
- Same SMS/TCPA consent language
- Same "Powered by Hey Connie" footer
- Same `<meta>` tags for SEO and social sharing
- Mobile-first responsive design
- "Call Now" button linking to their Connie phone number
- Instagram and Facebook icon links (if URLs provided)

---

## Image Handling

**No file uploads.** Detailers paste image URLs. This keeps the system simple and avoids storage/CDN complexity.

Sources they can use:
- Instagram post URLs (most detailers already have great photos there)
- Any publicly accessible image URL (Google Drive shared links, Imgur, etc.)
- Photos from their phone uploaded to any free image host

In the admin panel "My Website" tab, when they paste a URL, show a live thumbnail preview so they can confirm it loads correctly. If the URL returns a 404 or isn't an image, show an error state.

**Future nice-to-have (not in initial build):** An "Import from Instagram" button that pulls their last 6-9 posts via the Instagram Basic Display API. This is a convenience feature — don't build until the manual paste flow is validated.

---

## The Booking Widget

This is the real product. The microsite is just a container for it.

### Form Fields
1. **Service** — dropdown populated from `services` table for this business
2. **Name** — required
3. **Phone** — required (E.164 normalized)
4. **Email** — optional
5. **Vehicle** — Make (dropdown, 40+ makes) + Model (cascading) + Year
6. **Preferred date** — calendar picker, calls `/api/slots` for availability
7. **Time preference** — Morning / Afternoon / Evening (or specific slot if calendar Phase B is built)
8. **Location/Address** — text input
9. **Notes** — optional textarea
10. **Promo code** — optional input

### SMS/TCPA Consent (Required)
Below the submit button, before the form can be submitted:

```
☐ I agree to receive SMS messages from [Business Name] regarding 
  my booking, including appointment confirmations and reminders. 
  Message & data rates may apply. Reply STOP to opt-out at any time.
  View our Terms of Service and Privacy Policy.
```

- Checkbox must be checked to submit (client-side validation)
- Consent is logged with timestamp in the `bookings` table (new column: `sms_consent_at TIMESTAMPTZ`)
- "Terms of Service" links to `heyconnie.co/terms`
- "Privacy Policy" links to `heyconnie.co/privacy`
- This language satisfies A2P 10DLC registration requirements

### Form Submission
- POST to `{businesses.base_url}/api/book` with all fields
- Same endpoint the existing Luis site uses — no new API needed
- On success: show confirmation message with booking details
- On error: show user-friendly error, don't lose form data

### Widget Delivery (for existing websites)
Two options for detailers who already have a site:

**Option A — iframe (build first, simplest):**
```html
<iframe src="https://heyconnie.co/book/luis-mobile-detail" 
        width="100%" height="600" frameborder="0"></iframe>
```
The `/book/[slug]` route renders just the booking form — no header, no footer, no template chrome. Designed to sit inside an iframe.

**Option B — Script tag (build later):**
```html
<script src="https://heyconnie.co/embed.js?b=luis-mobile-detail" async></script>
```
Injects a floating "Book Now" button (fixed bottom-right, coral). On click: opens a modal overlay containing the iframe. Same booking form, no duplicate logic.

Start with Option A. Option B is a polish step.

---

## Architecture

### Where Things Live

| Component | Project | URL Pattern |
|---|---|---|
| Hosted microsites | heyconnie Vercel project | `heyconnie.co/[slug]` |
| Booking-only widget page | heyconnie Vercel project | `heyconnie.co/book/[slug]` |
| Embed script | heyconnie Vercel project | `heyconnie.co/embed.js` |
| Booking APIs | Per-tenant Vercel project | `{businesses.base_url}/api/book`, `/api/slots` |
| Admin "My Website" tab | Per-tenant admin panel | `{base_url}/admin` |

### Hosted Page Rendering: `heyconnie.co/[slug]`

**Route:** `api/b/[slug].js` — Vercel serverless function

**Logic:**
1. Read slug from URL path
2. Query `businesses` WHERE `id = slug` AND `website_enabled = true`
3. If not found → return clean 404 HTML page
4. Query `business_profiles` WHERE `business_id = slug`
5. Query `services` WHERE `business_id = slug`
6. Select template renderer based on `businesses.website_template`
7. Render full self-contained HTML page — no framework, no build step
8. Inline all CSS/JS (same pattern as Luis's `index.html`)
9. Return the HTML with correct meta tags, OG tags, favicon

**Key constants baked into the rendered HTML:**
```js
const BUSINESS_ID = 'luis-mobile-detail'    // from businesses.id
const API_BASE = 'https://luis-mobile-detailing.vercel.app'  // from businesses.base_url
const PHONE = '(626) 654-1924'             // from businesses.phone
```

**`vercel.json` update:**
```json
{
  "rewrites": [
    { "source": "/book/:slug", "destination": "/api/book-widget?slug=:slug" },
    { "source": "/:slug((?!api|embed)[^/.]+)", "destination": "/api/b/:slug" }
  ]
}
```

The rewrite pattern excludes `/api/*`, `/embed.js`, and any path with a dot (static files) from being caught as slugs.

### Booking Widget Page: `heyconnie.co/book/[slug]`

**Route:** `api/book-widget.js` — Vercel serverless function

Renders only the booking form — no hero, no services section, no template chrome. Designed to work inside an iframe on someone else's website. Same form fields, same SMS consent, same submission logic.

### 404 Handling

If the slug doesn't match any business with `website_enabled = true`, return a branded 404 page:
- Hey Connie branding
- "This business page doesn't exist yet"
- CTA: "Are you a mobile detailer? Get your own page →" linking to heyconnie.co signup

This turns dead URLs into lead gen for the platform.

---

## Admin Panel: "My Website" Tab

Add as Tab 10 in `admin/index.html` (after Biz Profile tab).

### Tab Layout

**Section 1 — Enable Your Website**
- Toggle switch: "Publish your website" → sets `businesses.website_enabled`
- When ON, show the live URL: `heyconnie.co/[business_id]` (clickable, opens in new tab)
- "Copy Link" button for easy sharing

**Section 2 — Choose Your Template**
- 5 visual preview cards (screenshot or illustration of each template)
- Radio select — currently selected template highlighted
- "Preview" button opens their page in new tab
- Save auto-triggers on selection change

**Section 3 — Customize**
- **Tagline** — text input, 60 char max. Shows below business name in hero.
- **Hero Image** — URL input with live thumbnail preview. "Paste any image URL"
- **Gallery Images** — up to 9 URL inputs, each with thumbnail preview. Add/remove buttons. Only shown for templates that use a gallery (Gallery First, Clean Pro, Local Trust).
- **Social Links:**
  - Instagram URL (pre-filled from `businesses.instagram` if set)
  - Facebook URL
- Save button for this section

**Section 4 — Booking Widget Embed Code**
- Header: "Already have a website? Add AI booking to your existing site."
- Readonly textarea with the iframe embed code, pre-filled with their slug
- "Copy Code" button
- Brief instructions: "Paste this code into any page on your website where you want the booking form to appear."

**Section 5 — Custom Domain (Future)**
- Grayed out / "Coming Soon" badge
- Text: "Want your own domain like luismobiledetailing.com? This is an available add-on."
- "Notify me when available" button (saves interest flag)

### Data Flow on Save
- Template selection → `UPDATE businesses SET website_template = $1 WHERE id = $2`
- Tagline → `UPDATE businesses SET tagline = $1`
- Hero image → `UPDATE businesses SET hero_image_url = $1`
- Gallery → `UPDATE businesses SET gallery_image_urls = $1` (JSON array)
- Social links → `UPDATE businesses SET instagram = $1, facebook_url = $2`
- Website toggle → `UPDATE businesses SET website_enabled = $1`

All updates go to the `businesses` table — no new tables needed.

---

## SMS Consent & TCPA Compliance

### What Gets Logged
When a customer submits the booking form with the SMS consent checkbox checked:

```sql
-- New column on bookings table
ALTER TABLE bookings ADD COLUMN sms_consent_at TIMESTAMPTZ;
```

The `api/book.js` endpoint already handles the booking insert. Add `sms_consent_at: new Date().toISOString()` to the insert when consent is given. If consent is not given (checkbox unchecked), `sms_consent_at` remains NULL and the form cannot be submitted.

### Legal Pages
Two static HTML pages needed on heyconnie.co:

- `heyconnie.co/terms` — Terms of Service (covers both Hey Connie platform and hosted pages)
- `heyconnie.co/privacy` — Privacy Policy (covers data collection, SMS consent, cookies)

These are required for A2P 10DLC registration and linked from every booking form.

---

## Custom Domain (Future Add-On)

Not in the initial build. Documenting the plan for later.

**Base path (free, included):** `heyconnie.co/[slug]`

**Paid add-on:** Detailer buys a custom domain (like `luismobiledetailing.com`) through Hey Connie. Two options:

1. **Redirect** — `luismobiledetailing.com` 301-redirects to `heyconnie.co/luis-mobile-detail`
2. **Domain masking** — `luismobiledetailing.com` serves the same content as the Hey Connie page, with the custom domain in the browser bar. Vercel supports this natively (add custom domain to project).

**Professional email pairing** — natural upsell alongside custom domain. `luis@luismobiledetailing.com` instead of `luis.detailing@gmail.com`. Potential integration with Google Workspace or similar. Separate revenue line.

**Implementation:** Vercel's custom domain API can add domains programmatically. The `businesses.website_custom_domain` column stores the domain string. A setup flow in the admin panel would walk the detailer through DNS configuration (or we do it for them as part of the add-on service).

---

## Build Sequence

### Prerequisites
- Multi-tenant routing must be done first (hardcoded `BUSINESS_ID` across 22 files needs to be dynamic). Without this, the booking APIs only work for Luis.
- `business_profiles` should be populated for at least the test tenant (Luis).

### Step 1 — Database Migration
Add new columns to `businesses` table:
```sql
ALTER TABLE businesses ADD COLUMN website_template TEXT DEFAULT 'one-pager';
ALTER TABLE businesses ADD COLUMN website_enabled BOOLEAN DEFAULT false;
ALTER TABLE businesses ADD COLUMN facebook_url TEXT;
ALTER TABLE businesses ADD COLUMN hero_image_url TEXT;
ALTER TABLE businesses ADD COLUMN gallery_image_urls JSONB DEFAULT '[]';
ALTER TABLE businesses ADD COLUMN tagline TEXT;
ALTER TABLE businesses ADD COLUMN website_custom_domain TEXT;

ALTER TABLE bookings ADD COLUMN sms_consent_at TIMESTAMPTZ;
```

Seed Luis's row:
```sql
UPDATE businesses SET 
  website_template = 'clean-pro',
  website_enabled = true,
  instagram = 'https://www.instagram.com/luismobiledetail/',
  tagline = 'Mobile Car Detailing in the San Gabriel Valley'
WHERE id = 'luis-mobile-detail';
```

### Step 2 — One-Pager Express Template (Prove the Pattern)
Build `api/b/[slug].js` with only the One-Pager Express template. This is the simplest template — just business name, tagline, services with prices, booking form, phone number, social links, and "Powered by Hey Connie" footer.

Get `heyconnie.co/luis-mobile-detail` rendering and the booking form submitting successfully.

Update `vercel.json` with the rewrite rule.

### Step 3 — Booking Widget Standalone Page
Build `api/book-widget.js` for `heyconnie.co/book/[slug]`. Form-only page for iframe embedding. Test in an iframe on a blank HTML page.

### Step 4 — SMS Consent in Booking Form
Add consent checkbox + `sms_consent_at` logging to both:
- The hosted page booking form (in the template renderer)
- The existing Luis site booking form (`index.html`)
- The widget page

### Step 5 — Admin Panel "My Website" Tab
Add Tab 10 to `admin/index.html` with Sections 1-4 (enable toggle, template picker, customize form, embed code). Section 5 (custom domain) is a placeholder.

### Step 6 — Remaining Templates
Build Clean Pro, Bold & Dark, Local Trust, and Gallery First renderers. Each is a function that takes the same data shape and returns different HTML/CSS.

### Step 7 — Embed Script (Polish)
Build `embed.js` — the floating "Book Now" button + modal. This is a nice-to-have after the iframe approach is working.

### Step 8 — Legal Pages
Create `heyconnie.co/terms` and `heyconnie.co/privacy` as static HTML pages. Required before A2P submission.

---

## Where This Fits in the Master Playbook

Insert as a new phase after multi-tenant routing is complete. Suggested position:

> **Phase [N] — Hosted Pages + Booking Widget**
> 
> Prerequisites: Multi-tenant routing done (dynamic BUSINESS_ID). At least one business with populated `business_profiles`.
> 
> Deliverables:
> - Every detailer gets `heyconnie.co/their-slug` at signup
> - Five selectable templates, auto-populated from onboarding data
> - Booking widget for existing websites (iframe embed)
> - SMS/TCPA consent on all booking forms
> - Admin panel tab for template selection and customization
> 
> Does NOT include: custom domains, professional email, Instagram auto-import.

---

## Verification Checklist (when built)

```
□ heyconnie.co/luis-mobile-detail → renders HTML with "Luis Mobile Detail"
□ Service cards show real data from services table
□ Booking form loads slots from /api/slots on the tenant's base_url
□ Form submission creates a booking in Supabase with sms_consent_at
□ heyconnie.co/nonexistent → returns branded 404 page
□ heyconnie.co/book/luis-mobile-detail → renders booking form only (no chrome)
□ Booking widget works inside an iframe on a test HTML page
□ Admin panel "My Website" tab → can toggle website on/off
□ Admin panel → can change template, see preview
□ Admin panel → can paste image URLs, see thumbnails
□ Admin panel → can copy embed code
□ All five templates render correctly with same test data
□ Mobile responsive on all templates (test at 375px)
□ SMS consent checkbox required before form submission
□ heyconnie.co/terms and /privacy pages exist
□ "Powered by Hey Connie" footer on all templates with link to heyconnie.co
□ Social links (Instagram, Facebook) display correctly when URLs are set
□ Social links hidden when URLs are not set
```

---

## Open Decisions (Resolve Before Building)

1. **Template visual design** — Need mockups or detailed design direction for each of the five templates. The names and descriptions above are a starting point. Worth doing a quick visual prototype of each before building (could use Magic Patterns for this).

2. **Booking API location** — Currently the booking APIs live in the Luis Vercel project. The hosted page calls them cross-origin via `businesses.base_url`. This works for now (CORS headers are enabled). Long-term, these APIs should move into the heyconnie project so every tenant uses the same endpoint. When does that migration happen — as part of this feature, or as a separate task?

3. **Auto-enable on signup** — Should the website be auto-enabled (with One-Pager Express) as soon as a detailer's `business_profiles` is populated? Or require them to explicitly turn it on in the admin panel? Auto-enable means they get a shareable URL faster. Manual enable means they can customize first.

4. **Pricing display** — Luis's services have `starting_price` in the `services` table. Templates should show "Starting at $X" — but should we also pull from `business_profiles.services` (which has more detail from onboarding)? Need to decide the canonical source for pricing on the hosted page.
