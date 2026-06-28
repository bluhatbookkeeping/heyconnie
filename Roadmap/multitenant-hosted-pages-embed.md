# Multi-Tenant Hosted Pages + JS Embed

_Status: Planned — not built. Combine with master-build-playbook.md before building._

---

## What This Is

Two delivery modes that give every Hey Connie detailer a booking presence — without needing their own website:

1. **Hosted page** — `heyconnie.co/luis-mobile-detail` — we serve a branded booking page for any registered business
2. **JS embed** — a single `<script>` tag a detailer drops on their existing site to inject a "Book Now" button + modal

Luis Mobile Detail is the test tenant. This fits between Phase 3 (Second Detailer) and Phase 4 (SMS) in the master playbook.

---

## Why It Matters

When you onboard a second detailer in Phase 3, they need a way to take bookings. Without this, they either:
- Need their own website (most don't have one)
- Get a custom site built (expensive, slow)
- Just use the phone (defeats the purpose)

With this, every new detailer gets a bookable URL the moment they sign up: `heyconnie.co/their-business-name`. Zero setup. Shareable immediately on Instagram, Google, or via text.

---

## Architecture

### Part 1 — Hosted Page: `heyconnie.co/[slug]`

**How it works:**
- Vercel serverless function at `heyconnie/api/b/[slug].js`
- Reads the slug, looks up `businesses` + `services` tables in Supabase
- Returns a full self-contained HTML booking page — no framework, no build step
- Rewrite rule in `vercel.json` catches `/:slug` and routes it there

**Page content:**
- Business name in title + hero
- Service cards rendered from DB (not hardcoded)
- 3-step booking form: Service → Contact/Schedule → Vehicle
- Calendar + slot picker (calls `/api/slots` on the tenant's API base URL)
- Form submits to `/api/book` on the tenant's API base URL
- "Powered by Hey Connie" footer

**Key constants baked into the rendered HTML:**
```js
const BUSINESS_ID = 'luis-mobile-detail'
const API_BASE = 'https://luis-mobile-detailing.vercel.app'  // from businesses.base_url
```

**Current `heyconnie/vercel.json` (do not remove existing routes):**
```json
{
  "routes": [
    { "src": "/api/(.*)", "dest": "/api/$1" },
    { "src": "/(.*)", "dest": "/index.html" }
  ]
}
```

**Replace entirely with this (rewrites supersede the old catch-all):**
```json
{
  "routes": [
    { "src": "/api/(.*)", "dest": "/api/$1" }
  ],
  "rewrites": [
    { "source": "/embed.js", "destination": "/public/embed.js" },
    { "source": "/:slug((?!api)[^/]+)", "destination": "/api/b/[slug]" }
  ]
}
```

**`businesses.base_url`:**  
Already exists in the schema. Stores the detailer's Vercel API deployment URL. Set manually for Luis. New detailers get it set at signup once their project is provisioned (Phase 7).

**Before testing, run this SQL in Supabase (DetailFlow · `kgyipdyhzaypcxcpxqsg`):**
```sql
UPDATE businesses SET base_url = 'https://luis-mobile-detailing.vercel.app' WHERE id = 'luis-mobile-detail';
```

**404 handling:** If slug not found in `businesses` table → return a clean "Business not found" HTML page.

---

### Part 2 — JS Embed Snippet

**Script tag the detailer drops on their site:**
```html
<script src="https://heyconnie.co/embed.js?b=luis-mobile-detail" async></script>
```

**What the script does:**
1. Reads `?b=` param from its own `src` URL
2. Injects a floating "Book Now" button (fixed bottom-right, coral, Hey Connie brand)
3. On click: opens a modal overlay containing an `<iframe>` pointing at `heyconnie.co/[slug]`
4. The iframe reuses the hosted page — no duplicate form logic

**File:** `heyconnie/public/embed.js` (Vercel serves `/public` as static root)

**Pattern:**
```js
(function() {
  const b = new URL(document.currentScript.src).searchParams.get('b')
  if (!b) return
  // inject button → inject modal with iframe → wire click handlers
})()
```

This is exactly what Luis Mobile Detail is today — a full custom site with our form baked in. The embed is the lightweight drop-in version for detailers who already have a site.

---

### Part 3 — `detailer-signup.js` Update

On signup, set `businesses.base_url` to the detailer's Vercel deployment URL.  
For now: manual. Once Phase 7 (Tenant Provisioning) auto-creates Vercel projects, this gets set automatically.

**Also:** On signup, the slug is already generated from the business name (`business_id`). The hosted page URL (`heyconnie.co/[slug]`) should be included in the welcome email so the detailer can share it immediately.

---

## Files to Create/Modify

| File | Action | Notes |
|---|---|---|
| `heyconnie/api/b/[slug].js` | Create | Serverless HTML renderer. ~300 lines. |
| `heyconnie/vercel.json` | Modify | Add rewrite rule (currently has routes only) |
| `heyconnie/public/embed.js` | Create | Self-executing embed script |
| `heyconnie/api/detailer-signup.js` | Modify | Include hosted page URL in welcome email |

---

## API Dependency Note

The booking APIs (`/api/book`, `/api/slots`, `/api/working-days`, `/api/lookup-customer`) currently live in the Luis Mobile Detail Vercel project — NOT in heyconnie. The hosted page calls them cross-origin via `businesses.base_url`.

**Long-term:** These APIs move into heyconnie as the platform matures (Phase 7+). Each tenant's `base_url` then points to `heyconnie.co` and the hardcoded `BUSINESS_ID` in the Luis project goes away.

**For now:** Cross-origin is fine. CORS headers are already enabled on all Luis API endpoints.

---

## Verification Checklist (when built)

1. `curl https://heyconnie-gold.vercel.app/luis-mobile-detail` → returns HTML with "Luis Mobile Detail"
2. Open in browser → service cards show, calendar works, slot picker loads, form submits
3. `curl https://heyconnie-gold.vercel.app/nonexistent` → returns 404 HTML page
4. Drop embed script on a test HTML file → "Book Now" button appears bottom-right
5. Click button → modal opens with booking form in iframe
6. Complete a booking through the modal → booking saved in Supabase
7. Welcome email for new signup includes the hosted page URL

---

## Where This Fits in the Master Playbook

Insert as **Phase 3B** between Phase 3 (Second Detailer) and Phase 4 (SMS Channel):

> **Phase 3B — Hosted Pages + Embed**  
> Every detailer gets `heyconnie.co/their-slug` at signup.  
> Detailers with their own site get a `<script>` tag embed.  
> Prerequisite: Phase 3 (at least one second detailer onboarded manually).  
> Unlocks: real shareable booking URLs before Phase 7 auto-provisions sites.
