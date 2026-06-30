# Hey Connie — Custom Domain Add-On

_Status: Planned — not built. Build AFTER website-builder-feature-spec.md Phase 1 is live._

---

## What This Is

A paid add-on that lets detailers use their own domain (e.g. `luismobiledetailing.com`) instead of `heyconnie.co/luis-mobile-detail`. The domain shows in the browser bar — it's not a redirect. Their site, their brand.

Two tiers:

1. **Redirect** (free or cheap) — `luismobiledetailing.com` 301-redirects to `heyconnie.co/their-slug`. Simple DNS change. No masking.
2. **Domain masking** (paid add-on) — `luismobiledetailing.com` serves the Hey Connie hosted page directly. Vercel handles it natively. Their URL in the browser bar.

Start with Option 2 (masking). It's the better product and Vercel makes it simple on our end.

---

## Why This Matters

`heyconnie.co/their-slug` is a great default — they get a real URL the day they sign up. But detailers who want to grow their brand need their own domain. A custom domain:

- Looks more professional on a business card, truck wrap, or Instagram bio
- Ranks better in local Google search (Google Business Profile, local SEO)
- Makes the detailer feel like they own their presence, not renting it
- Is a natural upsell from the free hosted page — once they see the page working, they want the domain

Natural pairing: **custom domain + professional email** (`luis@luismobiledetailing.com`). Can be sold together as a "Pro Presence" bundle.

---

## How It Works (Technical)

### Vercel Custom Domains API

Vercel supports adding custom domains to a project programmatically. When a detailer provides their domain, Hey Connie:

1. Calls `POST /v10/projects/{projectId}/domains` with their domain name
2. Vercel returns DNS verification instructions (A record or CNAME)
3. We show those instructions in the admin panel
4. Detailer updates their DNS (or we walk them through it)
5. Vercel verifies ownership automatically — usually within minutes
6. Their domain now serves the same hosted page as `heyconnie.co/their-slug`

The hosted page renderer (`api/b/[slug].js`) doesn't need to change — Vercel routes the custom domain to the same function. The slug is still resolved from the URL path or the domain lookup.

### Domain-to-Slug Mapping

When a request comes in on a custom domain (e.g. `luismobiledetailing.com`), the renderer needs to know which business to load. Two options:

- **Option A** — Vercel rewrites the path: `luismobiledetailing.com` → `heyconnie.co/luis-mobile-detail`. Slug is in the path. No DB lookup needed.
- **Option B** — Lookup by domain: renderer reads `Host` header, queries `businesses WHERE website_custom_domain = host`, gets the slug. Slightly more flexible.

Recommendation: **Option B**. It's one extra query and it doesn't depend on Vercel rewrite config per domain.

### New Column (already specced in website-builder-feature-spec.md)
```sql
-- Already in the migration plan:
ALTER TABLE businesses ADD COLUMN website_custom_domain TEXT;
```

Add a status column for the verification flow:
```sql
ALTER TABLE businesses ADD COLUMN domain_status TEXT DEFAULT NULL;
-- values: null (not set) | 'pending' (DNS not verified) | 'active' (verified, live)
```

---

## Admin Panel — "My Website" Tab Update

Currently specced as a "Coming Soon" placeholder in Section 5. When this feature is built, replace the placeholder with:

**Section 5 — Custom Domain**

- Text input: "Enter your domain (e.g. luismobiledetailing.com)"
- "Connect Domain" button → calls `api/admin/connect-domain.js` → adds to Vercel → returns DNS instructions
- DNS instructions display: "Point your domain's A record to 76.76.21.21" (Vercel's IP) — with a copy button
- Status badge: Pending / Active (poll `api/admin/domain-status.js` every 30s until active)
- Once active: show `✓ Your site is live at luismobiledetailing.com`
- "Remove Domain" option (confirmation dialog)

---

## New API Endpoints

| File | Method | What |
|---|---|---|
| `api/admin/connect-domain.js` | POST | Takes `{ business_id, domain }`. Calls Vercel API to add domain to project. Saves domain + status='pending' to businesses. Returns DNS instructions. |
| `api/admin/domain-status.js` | GET | Calls Vercel API to check verification status. Updates `domain_status` in DB. Returns current status. |
| `api/admin/remove-domain.js` | DELETE | Calls Vercel API to remove domain from project. Clears `website_custom_domain` + `domain_status`. |

Auth: `x-admin-secret` header on all three.

### Vercel API calls (in connect-domain.js)
```js
// Add domain to project
await fetch(`https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/domains`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${VERCEL_API_TOKEN}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ name: domain })
})
```

### New env vars needed
```
VERCEL_API_TOKEN=     # Vercel personal access token (or team token)
VERCEL_PROJECT_ID=    # heyconnie Vercel project ID
```

---

## Hosted Page Renderer Update (`api/b/[slug].js`)

Add domain-based lookup at the top of the function:

```js
// If request comes in on a custom domain, resolve slug from domain
const host = req.headers.host
if (!host.includes('heyconnie.co')) {
  const { data: biz } = await supabase
    .from('businesses')
    .select('id')
    .eq('website_custom_domain', host)
    .eq('domain_status', 'active')
    .single()
  if (!biz) return res.status(404).send(render404())
  slug = biz.id
}
```

---

## Pricing (Suggested)

Don't over-engineer the pricing model. Simple options:

- **Option A** — Included in a higher tier plan (e.g. "Pro" vs "Starter")
- **Option B** — Add-on: $10-15/month on top of base plan
- **Option C** — One-time setup fee ($49-99) + domain cost pass-through

Recommendation: **Option B** ($10/month add-on). Recurring, predictable, easy to explain. Bundle with professional email for $20/month total ("Pro Presence").

Professional email (e.g. Google Workspace for Business) is a separate integration — not in this spec. Note it as a natural pairing for the sales pitch.

---

## Professional Email (Future Pairing)

Not in this spec — document here for roadmap awareness.

When a detailer has their own domain, the natural next ask is `luis@luismobiledetailing.com` instead of `luisdetailing@gmail.com`. Options:

- **Google Workspace** reseller program — buy seats on their behalf, mark up
- **Zoho Mail** — free tier exists, less friction
- **Forward-only** — set up email forwarding from their domain to their Gmail (cheapest, but not a real mailbox)

Don't build until custom domain is live and at least 3 detailers have requested it.

---

## Build Sequence

### Prerequisites
- Website builder (website-builder-feature-spec.md) must be live
- At least one detailer on a custom domain request waitlist

### Step 1 — DB migration
Add `domain_status` column. `website_custom_domain` already added in website builder migration.

### Step 2 — Vercel API integration
Build `api/admin/connect-domain.js`. Test against Vercel sandbox. Add `VERCEL_API_TOKEN` + `VERCEL_PROJECT_ID` to env.

### Step 3 — Domain status polling
Build `api/admin/domain-status.js`. Vercel returns `verified: true` once DNS propagates. Update DB.

### Step 4 — Renderer update
Add host-based slug resolution to `api/b/[slug].js`.

### Step 5 — Admin panel update
Replace "Coming Soon" placeholder in Section 5 with the full domain connection UI.

### Step 6 — Remove domain flow
Build `api/admin/remove-domain.js`. Add "Remove" button + confirmation dialog in admin panel.

---

## Verification Checklist
```
□ luismobiledetailing.com → renders same page as heyconnie.co/luis-mobile-detail
□ Browser bar shows luismobiledetailing.com (not heyconnie.co)
□ heyconnie.co/luis-mobile-detail still works (both URLs live simultaneously)
□ Admin panel shows domain as Active after DNS verifies
□ Removing domain in admin → domain no longer resolves to the page
□ Invalid/unverified domain → returns 404
□ VERCEL_API_TOKEN and VERCEL_PROJECT_ID set in production env
□ DNS instructions display correctly in admin panel with copy button
```

---

## Where This Fits in the Master Playbook

Insert after Phase [N] (Website Builder + Booking Widget):

> **Phase [N+1] — Custom Domain Add-On**
>
> Prerequisites: Website builder live. At least one detailer actively using a hosted page.
>
> Deliverables:
> - Detailers can connect their own domain from the admin panel
> - Vercel API integration handles domain verification automatically
> - Domain masking (not redirect) — their URL in the browser bar
> - Paid add-on pricing tier
>
> Does NOT include: professional email, domain purchasing through Hey Connie, SSL management (Vercel handles it automatically).
