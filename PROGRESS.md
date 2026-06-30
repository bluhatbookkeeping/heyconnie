# Hey Connie — Session Progress Log

_Newest entry on top. Follow Andrew's THREE FILE RULE: this file = session log only._
_Older sessions in [PROGRESS_ARCHIVE.md](PROGRESS_ARCHIVE.md)._

---

## Session 86 — 2026-06-30

### CURRENT PHASE: Phase 5 — Website Builder pixel-perfect match + A2P SMS compliance
### LAST COMPLETED: Nav CSS alignment, Instagram removed from nav, service area removed from trust badges, node_modules cleaned from repo
### NEXT: Booking form customer lookup issue — phone 415-279-4984 not being recognized / vehicles not pre-filling. Compare lookup behavior vs luis-mobile-detailing.vercel.app. Then: phone formatter verify on real device; sms_consent_at column check; support@heyconnie.co inbox (manual — Andrew).

---

### What Was Done

**`terms.html` + `privacy.html` — nav CSS overhaul:**
- Replaced entire `<style>` block in both files with exact CSS from `bold-dark.js` verbatim
- Root cause of nav mismatch: global `a{color:var(--blue);text-decoration:underline}` was bleeding into nav links, requiring compensating overrides that didn't fully work
- Fixed to: `a{color:inherit;text-decoration:none}` matching bold-dark.js exactly
- Legal content link styling scoped to `.legal-wrap a{color:var(--blue);text-decoration:underline}`
- `.container` unscoped (was `.nav .container`), `.btn` corrected to `gap:8px; padding:14px 26px; font-size:16px`, `ul{list-style:none}` added, breakpoint corrected to `768px`
- Commits: `ec54548`

**`templates/bold-dark.js` + `terms.html` + `privacy.html` — nav cleanup:**
- Removed "See us on Instagram" from all nav headers (desktop nav-links + mobile nav)
- Instagram stays in gallery section and footer — nav only
- Commit: `6831153`

**`templates/bold-dark.js` — trust badges:**
- Removed service area line (`San Gabriel Valley — Pasadena, West Covina...`) from trust badge bar
- 4 badges remain: 100% Hand Wash · We Come to You · Interior & Exterior · Wax & Polish Available
- Commit: `0d16027`

**`.gitignore` + repo cleanup:**
- `node_modules/` and `.DS_Store` were accidentally committed — removed from tracking
- `.gitignore` updated to include `node_modules/`, `.DS_Store`, `*.DS_Store`
- Commits: `a5c964f`, `[cleanup commit]`

**Roadmap:**
- Confirmed `website-builder-implementation-plan.md` (root) already covers content editing, template switching, and booking widget embed — no new spec needed
- Deleted duplicate `roadmap/content-templates-embed-spec.md`

### What's Working (verified deployed)
- ✅ Nav CSS on terms/privacy now identical to main site
- ✅ "See us on Instagram" gone from all nav headers
- ✅ Trust badge bar shows 4 items only (service area removed)
- ✅ Nav logo subtext ("Mobile Car Detailing · Pasadena") intact

### What's NOT Working / Not Yet Verified
- ❌ Booking form customer lookup — phone 415-279-4984 not being recognized on heyconnie.co/luis-mobile-detail; vehicles not pre-filling. Works on luis-mobile-detailing.vercel.app. Root cause unknown — likely `api/lookup-customer.js` not being called correctly or phone format mismatch.
- ☐ Phone formatter on real mobile device (still only CDP-tested)
- ☐ `sms_consent_at` column — never confirmed exists in Supabase `bookings` table
- ☐ `support@heyconnie.co` inbox — manual action required from Andrew before A2P submission
- ☐ Full visual QA side-by-side vs luis-mobile-detailing.vercel.app

### Decisions Made
- `website-builder-implementation-plan.md` stays in root directory as the canonical plan — not moved to roadmap/
- No new specs needed for content/template/embed — already fully specced

### Issues Hit
- `node_modules/` was not in `.gitignore` — accidentally committed 4,208 files. Cleaned up.
- Duplicate spec written before checking existing roadmap files — deleted immediately

### Next Agent Handoff Instructions
Pick up Phase 5. Priority issue: **booking form customer lookup is broken on heyconnie.co/luis-mobile-detail.**

Test: go to `heyconnie.co/luis-mobile-detail`, open the booking form, enter phone `415-279-4984`. Expected: customer recognized, vehicles pre-filled (Acura ILX 2020, BMW 1 Series 2020, Tesla Model Y 2020). Actual: not recognized.

Compare behavior vs `luis-mobile-detailing.vercel.app` which works correctly.

Investigate:
1. `api/lookup-customer.js` — how phone is normalized before DB lookup
2. What phone format is stored in the `customers` table for this customer
3. Whether the booking form on heyconnie is calling the right endpoint with the right payload
4. Check network tab in browser for the actual request being sent

Do NOT recode until root cause is confirmed. Read before writing.

---

## Session 85 — 2026-06-29 (continued)

### CURRENT PHASE: Phase 5 — Website Builder pixel-perfect match + A2P SMS compliance
### LAST COMPLETED: Phone input working (digits only, formatting as-you-type with cursor restore), Terms/Privacy nav phone format fixed
### NEXT: Verify phone formatter on real device; full side-by-side visual QA; booking form end-to-end test (sms_consent_at in DB); support@heyconnie.co inbox (manual — Andrew)

---

### What Was Done

**`templates/bold-dark.js` — phone input (multiple iterations):**
- Root cause 1: `.hc-form input{appearance:none}` broad rule was stripping native checkbox rendering — fixed with `appearance:checkbox` override on `.hf-consent input[type=checkbox]`
- Root cause 2: `\D` in regex inside Node.js template literal drops the backslash — Node.js evaluates `'\D'` as `'D'` in non-strict mode. Fixed by using `[^0-9]` character class throughout template literal JS
- Root cause 3: Setting `e.target.value` inside an `input` event handler resets cursor to position 0 in Chrome — each new character inserted at start, causing `((((` cascade. Fixed with `selectionStart` capture + `setSelectionRange(newPos, newPos)` after setting value
- Final phone formatter: `input` event strips `[^0-9]`, formats as `(XXX) XXX-XXXX`, saves cursor before, restores with adjusted position after. `maxlength="14"` on HTML input.
- Removed keydown handler entirely (was blocking digits via unreliable `e.keyCode`; `endsWith(') ')` check was dead code since formatter never produces trailing `) `)

**`terms.html` and `privacy.html` — nav phone format:**
- Phone in `businesses` table stored as raw digits (`6266541924`)
- `biz-nav.js` returns raw value; terms/privacy were displaying it as-is
- Bold-dark.js uses `phoneNav = phoneBare.slice(0,3)+'-'+phoneBare.slice(3,6)+'-'+phoneBare.slice(6)` format
- Fixed both static files: added `phoneDisplay` variable with same `XXX-XXX-XXXX` format; replaced `e(phone)` with `e(phoneDisplay)` in both desktop and mobile nav HTML
- Also fixed `\D` → `[^0-9]` in static file JS (belt-and-suspenders; static files don't have template literal issue but consistent)

### What's Working (deployed, commit b6d29e8)
- ✅ SMS consent checkbox checks/unchecks on all 3 booking screens
- ✅ Phone input: formats as `(XXX) XXX-XXXX` as you type; delete/backspace works correctly; digits only; max 10 digits
- ✅ Terms/Privacy nav phone displays `626-654-1924` matching main site
- ✅ Terms/Privacy open in same tab; Luis's nav header renders with correct fonts

### What's NOT Verified Yet
- Phone formatter on real mobile device (tested via Chrome DevTools; CDP key simulation behaves differently than physical keyboard)
- Booking form end-to-end (phone lookup → submit → `sms_consent_at` in Supabase `bookings`)
- `sms_consent_at` column existence in DB — never confirmed in information_schema
- `support@heyconnie.co` inbox — must be created before A2P submission (manual — Andrew)
- Full side-by-side visual QA vs luis-mobile-detailing.vercel.app

### Decisions Made
- No auto-formatter in template literal context using `\D` — use `[^0-9]` always for regex in embedded JS
- Cursor restore (`selectionStart` / `setSelectionRange`) required when setting `.value` programmatically in input handlers
- Phone display format: `XXX-XXX-XXXX` (dashes, no parens) to match bold-dark.js `phoneNav` variable

### Issues Hit
- `\D` backslash dropped in Node.js template literal: `'\D' === 'D'` in V8 non-strict mode — affects ALL regex shorthand classes (`\d`, `\w`, `\s`, etc.) embedded in template literal JS
- Setting `e.target.value` in `input` handler resets cursor to position 0 in Chrome — causes cascading formatter loop
- CDP `press_key` / `type_text` simulation does not reflect real keyboard behavior accurately for this formatter

---

## Session 84 — 2026-06-29 (continued)

### CURRENT PHASE: Phase 5 — Website Builder pixel-perfect match + A2P SMS compliance
### LAST COMPLETED: SMS consent checkbox working, phone input fixed, Terms/Privacy detailer nav live
### NEXT: Visual QA side-by-side (heyconnie.co/luis-mobile-detail vs luis-mobile-detailing.vercel.app); booking form end-to-end test (sms_consent_at in Supabase); support@heyconnie.co inbox creation (manual — Andrew); then api/book-widget.js review

---

### What Was Done

**`templates/bold-dark.js` — booking form fixes:**
- SMS consent checkbox: root cause was `.hc-form input{appearance:none;-webkit-appearance:none}` broad rule stripping native checkbox rendering. Fixed by adding `appearance:checkbox;-webkit-appearance:checkbox` specifically on `.hf-consent input[type=checkbox]`
- SMS consent HTML: restructured all 3 consent blocks (scrPhone, scrReturning, scrNew) — checkbox now wrapped as child of `<label>` (no `for` attribute needed); text in `<span>` inside label. Most reliable pattern across browsers.
- SMS consent CSS: `.hf-consent label` gets `display:flex;align-items:flex-start;gap:10px;cursor:pointer`; `.hf-consent span` gets small muted text styling; removed `display:flex` from `.hf-consent` wrapper
- Phone input: removed broken keydown handler (e.keyCode unreliable — `(` = shift+9 = keyCode 57, in allowed range; mobile keyCode = 229 blocked all input). Removed formatter entirely (setting this.value in input event caused re-entrant loop across browsers). Now: `inputmode="numeric"`, `maxlength="10"` in HTML, simple input listener strips non-digits only. Placeholder shows (626) 555-1234 as format hint.
- Copy updates: "Instagram" → "See us on Instagram" (nav, mobile nav, footer, hero); "View Instagram" → "See our Instagram @handle" (gallery button); "Request an Appointment/Appointment" → "Book an Appointment" throughout
- Terms/Privacy links: removed `target="_blank"`, use relative `/terms?b=${slug}` and `/privacy?b=${slug}`

**New files:**
- `api/terms.js` — serverless Terms of Service endpoint (accepts `?b=slug`, renders page)
- `api/privacy.js` — serverless Privacy Policy endpoint (same pattern)
- `api/biz-nav.js` — public GET endpoint returning `{id,name,phone,instagram,service_area}` for a slug
- `api/utils/render-legal-page.js` — shared nav renderer for terms/privacy API routes

**`terms.html` and `privacy.html` — updated:**
- Added Google Fonts (Barlow Condensed + DM Sans) — exact match to bold-dark.js
- Added CSS vars matching bold-dark.js (--blue, --display, --body, etc.)
- JS on page load reads `?b=slug`, fetches `/api/biz-nav`, injects full `.nav` HTML with exact bold-dark.js class names (.nav, .nav-inner, .nav-logo, .nav-links, .nav-right, .nav-phone, .nav-toggle, .nav-mobile)
- Fallback: generic "Hey Connie" header if no `?b=` param
- Mobile hamburger toggle JS included
- Note: static files served by Vercel cleanUrls before rewrites — JS injection is the reliable path

**`vercel.json`:**
- Added `/terms` and `/privacy` rewrites pointing to API functions (belt-and-suspenders, but cleanUrls takes priority for static files)

### What's Working (deployed, commit c452a1c)
- ✅ SMS consent checkbox checks/unchecks on all 3 booking screens
- ✅ Phone input: digits only, max 10, numeric keyboard on mobile
- ✅ Terms/Privacy open in same tab (no target="_blank")
- ✅ Terms/Privacy load Luis's nav header (Barlow Condensed font, sticky nav, correct links)
- ✅ Instagram → "See us on Instagram" / "See our Instagram @handle" copy live
- ✅ "Request an Appointment" → "Book an Appointment" copy live

### What's NOT Verified Yet
- Booking form end-to-end (phone lookup → submit → `sms_consent_at` populated in Supabase `bookings`)
- `sms_consent_at` column existence in DB (not in DB_SCHEMA.md — needs verification)
- `support@heyconnie.co` inbox (needs to be created before A2P submission — manual action by Andrew)
- Full side-by-side visual QA vs luis-mobile-detailing.vercel.app

### Decisions Made
- Phone input: no auto-formatter (too fragile across browsers); raw digits only with placeholder hint
- Terms/Privacy: static files with client-side JS nav injection (not API routing) — Vercel cleanUrls serves static files before rewrites
- SMS consent: label-wrap pattern (input as child of label) — most reliable across browsers vs `for` attribute

### Issues Hit
- `appearance:none` on `.hc-form input` rule was nuking checkbox rendering — hidden for multiple sessions
- Phone keydown handler: `(` and `)` have same keyCode as digits 9 and 0 (57, 48); mobile keyCode=229 blocked all input
- Phone `input` formatter: setting `this.value` re-triggers `input` on some browsers causing loop
- Vercel `rewrites` array runs after filesystem — static terms.html/privacy.html served before API routes

---

### What Was Done

**`templates/bold-dark.js` — pixel-perfect fixes (all deployed):**
- Booking section phone format: `${phoneFmt}` → `☎ ${phoneNav}` (dash format + icon) in blue "Prefer to Call?" card
- "Phone Number" label: `text-align:left` → `text-align:center`
- "Or call us" phone: `${phoneFmt}` → `${phoneNav}` (dash format)
- Gallery section: centered all header text, added description paragraph (`Follow ${bizName} on Instagram...`), linked `@handle` to Instagram, changed button text `→` → `—`
- Gallery background: `section--gray` → `section` (white)
- Services section: `section--gray` → `section--gray` (toggled white then back to gray per Andrew)
- Pricing section: `section--gray` → `section` (white)
- Trust tiles section: `section` → `section--gray`
- Chat widget: moved `<button id="chatBubble">` and `<div id="chatPanel">` HTML to BEFORE `<script>` tag — was after, so IIFE ran with both elements null and no listeners ever attached

**SMS consent (A2P compliant) — `templates/bold-dark.js`:**
- Added consent checkbox to `scrPhone` (phone entry screen) with `id="bkSmsConsentPhone"`
- Added `smsConsentAt` global var; set on "Get Started" click if checkbox checked
- Updated new customer form consent text (`id="bkSmsConsent"`) to full A2P language
- Added consent checkbox to returning customer form (`id="bkSmsConsentReturn"`) before "Confirm Booking"
- Both form submits use `smsConsentAt` as fallback if their own checkbox unchecked
- Consent text: "Hey Connie... Reply HELP/STOP... Consent not required to book"
- Links to `heyconnie.co/terms` and `heyconnie.co/privacy`

**New files — Terms & Privacy pages:**
- `terms.html` — Terms of Service, Blu Hat Funding LLC operating as Hey Connie
- `privacy.html` — Privacy Policy, same entity
- Both follow ReadyToRent model (that got Twilio A2P approval)
- Both include: A2P SMS disclosures, message types list, STOP/HELP opt-out, Twilio named as provider, phone numbers not sold
- Both have "← Back to your detailer" bar (`history.back()`) so user returns to whatever detailer page they came from
- Generic — covers all detailers on the platform

**`vercel.json` routing fixes:**
- Added `"cleanUrls": true` — serves `terms.html` at `/terms`, `privacy.html` at `/privacy`
- Removed explicit `/terms` and `/privacy` rewrites (cleanUrls handles them)
- Tightened slug regex: `[a-z0-9][a-z0-9-]*` → `[a-z0-9][a-z0-9]*-[a-z0-9-]+` (requires hyphen)
  - All business slugs have hyphens (`luis-mobile-detail`) — still match
  - Reserved words (`terms`, `privacy`, `cancel`, `admin`) don't have hyphens — never match slug route

### Decisions Made
- **A2P campaign architecture:** Use one Hey Connie campaign for now (generic branding). Per-detailer subaccounts TBD.
- **Legal entity:** "Blu Hat Funding LLC, operating as Hey Connie" (mirrors ReadyToRent setup)
- **SMS consent:** Optional (not required to book) — checkbox on all three booking screens
- **Background pattern (final):** Services = gray, Pricing = white, Trust tiles = gray, Gallery = white, Booking = gray

### Issues Hit
- Chat widget broken: HTML was placed AFTER `</script>`, so `getElementById` returned null during IIFE execution. Fixed by moving HTML before script.
- `/terms` 404: slug catch-all regex matched "terms" even with specific rewrites listed first. Fixed with cleanUrls + hyphen-required slug regex.
- Git push auth failure mid-session: fixed with `gh auth setup-git`.

### What's NOT Verified Yet
- `/terms` and `/privacy` live routing (routing fix just deployed — confirm in browser)
- Chat widget functioning end-to-end (sends message to `/api/chat`, gets reply)
- Booking form end-to-end (phone lookup → returning/new → submit → `sms_consent_at` in Supabase)
- `support@heyconnie.co` email inbox (referenced in Terms/Privacy — needs to exist before A2P submission)

---

### What Was Done

**Root cause found and fixed — services/pricing sections were invisible:**
- `api/b/[slug].js` was querying `description` column from `services` table — column doesn't exist
- Supabase silently returned empty array → `svcs.length === 0` → services + pricing sections never rendered
- Fix: removed `description` from select. Also added `features` and `service_area` to businesses select.

**Root cause found and fixed — ALL page JS was broken (About, Trust tiles invisible):**
- `templates/bold-dark.js` line 884 had curly/smart quotes U+2018/U+2019 as JS string delimiters
- `addMsg("Hi! I'm Connie...", 'agent')` — the `'agent'` used curly quotes → SyntaxError
- Crashed entire `<script>` block → IntersectionObserver never ran → all `.fu` elements stayed at opacity:0
- Fix: replaced with straight ASCII quotes via Python script

**DB changes (Supabase, project kgyipdyhzaypcxcpxqsg):**
- `businesses.phone` updated: `626-409-3147` → `6266541924` (Hey Connie Vapi number, formats to (626) 654-1924)
- `businesses.features` updated: added `about_image_url: "https://luis-mobile-detailing.vercel.app/images/IMG_9951.PNG"`

**`templates/bold-dark.js` changes (commits bf3e198 → 6a08f83):**
- About section: label → "About Luis Mobile Detail", h2 → "Professional Detailing That Comes to You", split into 2 paragraphs, staggered stat transition-delays, uses `features.about_image_url` for right-side image
- Services section: added `SVC_DETAILS` lookup with descriptions + checklists per service name (hardcoded for Luis pilot); subtitle updated; svc-card is now flex-column
- Pricing section: h2 → "Simple, Honest Pricing", subtitle matches original, price note → "Starting price — call for exact quote", disclaimer includes phone + link, added "Call for a Quote / Request Appointment Online" CTA
- Trust tiles: replaced 8 emoji placeholders with exact SVGs from original site; label → "Why Choose Luis"; heading left-aligned
- Gallery section: `section--dark` → `section--gray` (white/light bg); Instagram button → `btn-primary` (blue); `ig-handle` color fixed for light bg
- Booking section: `bg-dark` → `bg-gray`; copy matches original exactly ("Request Your Detail", "Book Your Detail", "Get Started", "Or call us"); `#scrPhone` centered
- Nav: dash phone format `626-654-1924`; links → Services | Pricing | Book Appointment | Instagram | Contact; subtitle shows first city only (Pasadena); added `id="pricing"` to pricing section
- Added `phoneNav` variable (XXX-XXX-XXXX format)
- Added `aboutImg` variable from `biz.features.about_image_url`

**`api/b/[slug].js` changes:**
- Added `features` and `service_area` to businesses select
- Removed nonexistent `description` from services select

### What's Working and Verified (via Chrome DevTools screenshots)
- Phone number: (626) 654-1924 confirmed in nav and booking section
- Booking section: gray bg, white form box, centered right column, correct copy ✅
- Gallery: light background, blue Instagram button ✅
- Nav: correct links, dash phone format ✅
- Trust tiles: SVG icons, left-aligned heading ✅
- Services section: all 3 cards with checklists render (after services query fix) ✅
- No JS console errors after curly quote fix ✅

### What's NOT Verified Yet
- Full page side-by-side with original (About image, all sections visible at once)
- Booking form end-to-end (phone lookup → returning/new customer)
- Chat widget
- Mobile layout

### Decisions Made
- Service checklists hardcoded in template `SVC_DETAILS` lookup by name (not in DB) — acceptable for pilot, should become DB-driven later
- About image stored in `businesses.features.about_image_url` JSONB — avoids schema migration, works for pilot
- Phone hotlinks from `luis-mobile-detailing.vercel.app/images/` — works now, will need re-hosting if that domain moves
- Never use `\'` or curly quotes inside template literal JS strings

### Issues Hit
- Smart/curly quotes (U+2018/U+2019) silently introduced by editor autocorrect killed all page JS
- `services.description` column referenced in route but never existed in DB schema
- `section--dark` on gallery made it navy instead of white/light like the original
- `formatPhone` returns `(626) 654-1924` but nav needs `626-654-1924` — added separate `phoneNav`

---

### What Was Done

**`templates/bold-dark.js` — full rewrite via sequential Edit calls (467 → 940 lines):**
- Added CSS: fade-up animations (`.fu`/`.fu.vis`), About, Pricing, Trust tiles, service checklists, gallery border fix, chat widget, 3-col footer, responsive breakpoints
- Added HTML sections: About (stats grid + image), Pricing (3-col cards + disclaimer), Trust tiles (8 items), Instagram button in hero + CTA, 3-column footer with SVG icons + Services column
- Replaced `renderBookingForm()` call with inline phone-first booking form: phone entry → `/api/lookup-customer` → returning or new customer path → `/api/book`
- Added chat widget HTML + JS (bubble, panel, messages, `/api/chat`)
- Injected `SLUG` + `API_BASE` as `<script>` globals in `<head>` for multi-tenant client JS
- Removed `const { renderBookingForm }` require — kept `escHtml` only from `booking-form.js`
- Gallery: cells wrapped in `<a>` tags to Instagram, overlay text added, Instagram follow button below grid
- Removed `loading="lazy"` from gallery images so all 6 load immediately

**Bugs found and fixed (all in script block of template literal):**
1. `'Hi! I'm Connie...'` — apostrophe in single-quoted string → fixed to double quotes
2. `'We\'ll send you...'` (line 814) — `\'` in template literal renders as `'` in browser → broken string → fixed to double quotes
3. `'Request received! We\'ll confirm...'` (line 853) — same issue → fixed to double quotes
- Root cause: JS `\'` escape inside a Node.js template literal outputs bare `'` to browser, not `\'`

**Commits pushed:**
- `642d1d1` — Phase 5 full rewrite
- `49e8999` — fix apostrophe + remove lazy loading
- `e17e879` — fix two more `\'` → `'` broken strings (latest, not yet verified live)

**Decisions made:**
- Never use `\'` inside a JS template literal that outputs browser JS — always use double-quoted strings for contractions
- Never use `Write` on bold-dark.js — always `Edit` to stay under 32k token limit
- `templates/booking-form.js` untouched — still powers `api/book-widget.js` (Phase 3)

### What's NOT Done / Not Verified
- `heyconnie.co/luis-mobile-detail` not yet confirmed working after commit e17e879
- Sections (About, Services, Pricing, Trust tiles) not yet visually confirmed — all depend on JS fix landing
- Phone-first booking form not yet tested end-to-end (415-279-4984 → returning, unknown → new)
- Chat widget not tested
- Phase 3: `api/book-widget.js` not yet built
- Phase 4: admin photo upload + website settings not built
- Clean Pro template not built

### Next Session: Start Here
1. Hard-reload `heyconnie.co/luis-mobile-detail` — check browser console for zero JS errors
2. Scroll through: confirm About, Services, Pricing, Trust tiles, gallery all visible
3. Test booking form: enter 415-279-4984 → should show returning customer screen
4. Test chat bubble bottom-right → sends to `/api/chat`
5. If all good → Phase 3 (`api/book-widget.js`)

---

## Session 80 — 2026-06-29

### CURRENT PHASE: Phase 5 — Website Builder (template redesign in progress)
### LAST COMPLETED: Bold & Dark template rewritten to match Luis's site; images seeded; DB migration complete
### NEXT: Fine-tune Bold & Dark template until it visually matches luis-mobile-detailing.vercel.app exactly, then continue Phase 3 (booking widget)

---

### What Was Done

**Phase 1 — DB Migration (completed):**
- Added missing `domain_status TEXT` column to `businesses`
- Fixed `website_template` default from `'one-pager'` → `'bold-dark'`
- Seeded Luis: `website_template='bold-dark'`, `website_enabled=true`, `tagline`, `instagram` set
- Created `business-photos` Supabase Storage bucket (public read)
- Fixed Luis's phone in DB: corrected from Andrew's test number to `626-409-3147`

**Phase 2 — Template Module System (completed):**
- Created `templates/booking-form.js` — shared form renderer with CAR_DATA, cascading make/model, SMS consent, `sms_consent_at` on submit
- Created `templates/bold-dark.js` — full rewrite matching Luis's site: Barlow Condensed + DM Sans, sticky nav, hero with pulsing badge, blue trust bar, service cards with Most Popular auto-badge, gallery grid, two-column booking form, CTA section, dark footer
- Updated `api/b/[slug].js` — imports templates, routes by `website_template`

**Images seeded:**
- Uploaded all 12 of Luis's photos to Supabase Storage (`business-photos/luis-mobile-detail/IMG_9945–9956.PNG`)
- `hero_image_url` = IMG_9953.PNG (same as his existing site hero)
- `gallery_image_urls` = 6 photos (IMG_9945–9950)

**Live URL confirmed:** `heyconnie.co/luis-mobile-detail` renders Bold & Dark template with Luis's data and photos

### What's NOT Done
- Bold & Dark template not yet pixel-close to `luis-mobile-detailing.vercel.app` — needs visual fine-tuning next session
- Phase 3: `api/book-widget.js` (iframe booking widget) not yet built
- Phase 4: `api/admin/upload-photo.js` + `api/admin/website-settings.js` not yet built
- Phase 5: Admin "My Website" tab photo upload slots not yet built
- Phase 6: Clean Pro template + auto-enable on signup not yet built

### Next Session: Start Here
1. Open both URLs side by side: `heyconnie.co/luis-mobile-detail` vs `luis-mobile-detailing.vercel.app`
2. Identify specific visual gaps and fix `templates/bold-dark.js` until they match
3. Then proceed to Phase 3 prompt from `website-builder-implementation-plan.md`

---

## Session 79 — 2026-06-29

### CURRENT PHASE: Phase 5 — Website Builder (planning + roadmap)
### LAST COMPLETED: Planning session — implementation plan + agent prompts written
### NEXT: Start Phase 5 implementation — begin with verification of Session 78's unconfirmed routing fix, then build remaining templates

---

### What Was Done

**Planning only — no code changes.**

**Reviewed** `Roadmap/website-builder-feature-spec.md` — confirmed architecture is solid.

**Key decisions made:**
- Templates cut from 5 → 2 to start: **Bold & Dark** (Luis's aesthetic) + **Clean Pro** (minimal/white). More added after first detailer feedback.
- **Photo uploads** via Supabase Storage (not URL paste). Each slot is a file input → uploads to `business-photos/{business_id}/{slot}.jpg` → public URL stored in `gallery_image_urls`.
- Instagram: display link only, no API import.
- Booking APIs stay on per-tenant base_url for now.
- Auto-enable website on signup (`website_enabled = true`, `website_template = 'bold-dark'` set by `detailer-signup.js`).
- Pricing source: `services` table only.

**New files created (planning docs):**
- `website-builder-implementation-plan.md` (root) — 6-phase breakdown with copy-paste agent prompts for each phase + session-ending prompt
- `Roadmap/custom-domain-feature-spec.md` — full spec for custom domain add-on (Vercel API integration, domain masking, paid add-on pricing). Parked — build after website builder is live.

**Moved from Luis Mobile Detail → heyconnie:**
- All active build work now lives in this project. Luis Mobile Detail project stays as reference for `index.html` design only.

### What's NOT Done
- Session 78's routing fix (`heyconnie.co/luis-mobile-detail`) not yet confirmed live
- Photo upload endpoint (`api/admin/upload-photo.js`) — not built yet
- Bold & Dark template — not built (only One-Pager Express exists)
- Clean Pro template — not built
- Admin "My Website" tab needs photo upload slots (currently has URL inputs per spec, needs to change to file inputs)

### Next Session: Start Here
1. Confirm `heyconnie.co/luis-mobile-detail` renders (Session 78 routing fix)
2. Then hand off `website-builder-implementation-plan.md` Phase 4 prompt to build photo upload + settings API
3. Then Phase 5 prompt for admin panel photo upload slots
4. Then Phase 6 for Bold & Dark template + auto-enable on signup

---

## Session 78 — 2026-06-28 (context limit — pick up next session)

### CURRENT PHASE: Phase 5 — Website Builder + Hosted Pages
### LAST COMPLETED: All 6 build steps. Routing bug hit at end of session — NOT yet verified live.
### NEXT: Confirm heyconnie.co/luis-mobile-detail renders. Then verify booking form submits. Then admin tab.

---

### What Was Built

**DB Migration** (applied via Supabase MCP — confirmed in DB):
- `businesses` new columns: `website_template`, `website_enabled`, `facebook_url`, `hero_image_url`, `gallery_image_urls`, `tagline`, `website_custom_domain`
- `bookings` new column: `sms_consent_at TIMESTAMPTZ`
- Luis row seeded: `website_enabled = true`, `website_template = 'clean-pro'`, `tagline = 'Mobile Car Detailing in the San Gabriel Valley'`, `instagram` set
- Migration name: `phase5_website_builder`

**New files created:**
- `api/b/[slug].js` — One-Pager Express renderer. Queries `businesses` + `services`. Returns full branded HTML. Booking form inline (service dropdown, name/phone/email, address, make/model/year w/ CAR_DATA for 26 makes, date, time chips, notes, promo, SMS consent checkbox). 404 → branded lead-gen page.
- `api/book-widget.js` — Form-only page at `/book/:slug`. `X-Frame-Options: ALLOWALL`. Same form as above, posts to `https://heyconnie.co/api/book`.
- `api/admin/update-website.js` — JWT-authenticated (Bearer token via `supabase.auth.getUser`). Accepts: `website_enabled`, `website_template`, `tagline`, `hero_image_url`, `gallery_image_urls`, `instagram`, `facebook_url`. Updates `businesses` table.

**Modified files:**
- `api/book.js` — Now reads `business_id` from `req.body` (falls back to `'luis-mobile-detail'`). Inserts `sms_consent_at: new Date().toISOString()` when `sms_consent` is true in body.
- `vercel.json` — Converted from legacy `routes` to `rewrites`. Added `/book/:slug` → `api/book-widget` and `/:slug([a-z0-9][a-z0-9-]*)` → `api/b/:slug`. All 13 crons preserved.
- `admin/index.html` — Added "My Website" nav button (after Biz Profile). Added `mywebsitePane` with: publish toggle (calls `saveWebsiteToggle()`), live URL + copy button, customize form (tagline, hero image URL + live preview, Instagram, Facebook), embed code textarea + copy. `loadMyWebsite()` added to dashboard init. `mywebsite` added to `TAB_LABELS`.

### Issues Hit

1. **vercel.json routing not working** — `/luis-mobile-detail` was showing `index.html` instead of the business page. Root cause: `/(.*) → /index.html` catch-all rewrite was intercepting all paths, overriding the slug rule. Two failed attempts:
   - Attempt 1: Negative lookahead regex `(?!api|admin|...)` — Vercel doesn't support lookaheads in rewrite patterns.
   - Attempt 2: Simplified to `/:slug([a-z0-9][a-z0-9-]*)` but kept `/(.*) → /index.html` — catch-all still won (Vercel serves static file matches before rewrite order is respected).
   - **Fix applied (not yet verified):** Removed `/(.*) → /index.html` entirely. `index.html` is served at `/` automatically by Vercel. Catch-all was only ever needed for SPAs — heyconnie.co is a static page. Pushed as commit `e1ffafe`.

### What's NOT Yet Verified
- `heyconnie.co/luis-mobile-detail` renders (fix was pushed at end of session, unconfirmed)
- Booking form submits and `sms_consent_at` is populated
- `heyconnie.co/book/luis-mobile-detail` loads
- `heyconnie.co/nonexistent` shows branded 404
- Admin "My Website" tab loads and saves correctly

### Next Session: Start Here
1. Confirm `heyconnie.co/luis-mobile-detail` renders with Luis's name and services
2. Submit a test booking — check Supabase `bookings` for new row with `sms_consent_at` set
3. Test `heyconnie.co/book/luis-mobile-detail` in an iframe
4. Open admin → My Website tab — verify toggle and save work
5. If all green: build remaining 4 templates (Clean Pro, Bold & Dark, Local Trust, Gallery First)
6. Update CLAUDE.md to reflect Phase 5 complete

---

### CURRENT PHASE: Phase 5 — Website Builder + Hosted Pages ✅ (Steps 1–6)
### LAST COMPLETED: All 6 build steps
### NEXT: Push to main → verify heyconnie.co/luis-mobile-detail renders live

---

### What Was Done

**Phase 5: Website Builder + Hosted Pages — Steps 1–6 complete.**

**Step 1 — DB Migration** (applied via Supabase MCP):
- `businesses` new columns: `website_template`, `website_enabled`, `facebook_url`, `hero_image_url`, `gallery_image_urls`, `tagline`, `website_custom_domain`
- `bookings` new column: `sms_consent_at TIMESTAMPTZ`
- Luis seeded: `website_enabled = true`, `website_template = 'clean-pro'`, `tagline` set, Instagram set

**Step 2 — One-Pager Express template** (`api/b/[slug].js`):
- Vercel dynamic route — `heyconnie.co/luis-mobile-detail` renders a full branded microsite
- Pulls from `businesses` + `services` tables
- Full inline booking form (service, contact, vehicle make/model/year w/ cascading, date, time, notes, promo, SMS consent)
- CAR_DATA for 26 makes inline
- 404 → branded "not found" page with CTA to sign up
- SMS/TCPA consent checkbox required before submit
- "Powered by Hey Connie" footer

**Step 3 — vercel.json rewrite rules** (converted from legacy `routes` to `rewrites`):
- `/book/:slug` → `api/book-widget?slug=:slug`
- `/:slug((?!api|admin|book|embed|cancel|public)[^/.]+)` → `api/b/:slug`
- All 13 cron jobs preserved

**Step 4 — Booking widget** (`api/book-widget.js`):
- `heyconnie.co/book/luis-mobile-detail` renders form-only page (no chrome)
- `X-Frame-Options: ALLOWALL` for iframe embedding
- Same booking form, same SMS consent, posts to `https://heyconnie.co/api/book`

**Step 5 — SMS consent** (`api/book.js`):
- Accepts `business_id` from request body (falls back to `'luis-mobile-detail'`)
- Logs `sms_consent_at` timestamp when consent given

**Step 6 — Admin "My Website" tab** (`admin/index.html`):
- Nav button added after "Biz Profile"
- TAB_LABELS updated to include `mywebsite`
- `loadMyWebsite()` called on dashboard init
- Pane: publish toggle, live URL display + copy button, customize form (tagline, hero image, Instagram, Facebook), embed code, custom domain placeholder
- `api/admin/update-website.js` — JWT-authenticated endpoint, updates `businesses` table

### What's NOT Done (do next)
1. **Push to main** — confirm Andrew then push. Vercel auto-deploy will make it live.
2. **Verify live** — `heyconnie.co/luis-mobile-detail` should render, booking form should submit
3. **Test widget in iframe** — paste embed code in a blank HTML file, confirm it loads
4. **Build remaining 4 templates** — Clean Pro, Bold & Dark, Local Trust, Gallery First (Phase 5 Step 6)
5. **Update CLAUDE.md** — add Phase 5 to "What's Done"

### Verification Checklist (do after push)
- [ ] `heyconnie.co/luis-mobile-detail` renders with "Luis Mobile Detail" and service cards
- [ ] Booking form submits and creates a booking in Supabase
- [ ] `bookings.sms_consent_at` is set on submission
- [ ] `heyconnie.co/book/luis-mobile-detail` renders form only
- [ ] `heyconnie.co/nonexistent` returns branded 404
- [ ] Admin "My Website" tab loads, toggle saves, tagline saves
- [ ] Embed iframe works on a blank page

---

## Session 77 — 2026-06-28

### CURRENT PHASE: Phase 4 — Consolidation into heyconnie ✅
### LAST COMPLETED: Full migration
### NEXT: Phase 5 — Manually onboard second detailer

---

### What Was Done

**Phase 4 complete.** heyconnie is now the single codebase and deployment for the platform.

**Copied from Luis Mobile Detail → heyconnie:**
- `api/` — all serverless endpoints (book, chat, slots, lookup-customer, loyalty-utils, etc.)
- `api/admin/` — all 17 admin endpoints
- `api/cron/` — all 13 cron jobs
- `api/voice/` — all 17 voice tool endpoints
- `api/utils/resolve-business.js` — multi-tenant routing helper
- `admin/` — admin panel (index.html, manifest, sw, icon)
- `config/` — vapi-assistant.js, setup-agent.js, basic-agent.js
- `scripts/` — vapi-setup.js, setup-agent-deploy.js + utilities
- `supabase/migrations/` — all migration SQL files
- `cancel.html`
- All MD docs: DB_SCHEMA.md, master-build-playbook-v2.md, onboarding-spec.md, learning-loop-spec.md, PRD/PRD_v1.md
- All Roadmap specs (merged with existing website-builder-feature-spec.md)

**Updated in heyconnie:**
- `vercel.json` — added all 13 cron jobs + `/cancel` route
- `package.json` — merged all dependencies (@anthropic-ai/sdk, twilio, dotenv, etc.)
- `CLAUDE.md` — new platform-level CLAUDE.md (heyconnie is the platform, Luis is tenant #1)
- Twilio SID redacted from docs (GitHub push protection)

**Committed and pushed** to `https://github.com/bluhatbookkeeping/heyconnie.git` — Vercel auto-deploy triggered.

### What's NOT Done (Andrew must do manually)

1. **Verify env vars in heyconnie Vercel project** — all vars from Luis project must be present:
   `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `RESEND_API_KEY`, `NOTIFICATION_EMAIL`,
   `ADMIN_SECRET`, `VAPI_API_KEY`, `VAPI_ASSISTANT_ID`, `VAPI_PHONE_NUMBER_ID`,
   `GOOGLE_MAPS_API_KEY`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`

2. **Confirm heyconnie Vercel deployment is healthy** — check deployment logs in Vercel dashboard

3. **Update Vapi webhook URLs** — point Connie's tool endpoints from luis-mobile-detailing.vercel.app → heyconnie.co (in Vapi dashboard → assistant → tools)

4. **Redirect luis-mobile-detailing.vercel.app → heyconnie.co** — add to Luis project vercel.json. Hold until Andrew confirms the customer site won't break. Note: Luis's customer-facing site (index.html with hero/gallery/booking form) stays in the Luis repo.

5. **Delete Luis Vercel project** — only after steps 1–4 confirmed. Manual step in Vercel dashboard.

### Issues Hit
- GitHub push protection blocked initial push (Twilio Account SID in CLAUDE.md + archive docs). Redacted to `[see Twilio dashboard]` and squashed into a single clean commit.

---

## Session 76 — 2026-06-28

### CURRENT PHASE: Phase 3 — Multi-tenant routing
### LAST COMPLETED PROMPT: Prompt 3
### NEXT PROMPT TO RUN: Prompt 4

---

### What Was Done

**Files created:**
- `api/utils/resolve-business.js` — shared helper; looks up `businesses.id` by `vapi_assistant_id` matching `req.body.message.call.assistantId`; returns `{ id, timezone }`; fallback to `{ id: 'luis-mobile-detail', timezone: 'America/Los_Angeles' }`

**Files modified — Step 2 (webhook + call-ended):**
- `api/voice/webhook.js` — removed `const BUSINESS_ID = 'luis-mobile-detail'`; added inline `resolveBusinessId(assistantId)` helper; `assistant-request` resolves via `VAPI_ASSISTANT_ID` env var; `end-of-call-report` resolves from `call.assistantId` in payload; passes `BUSINESS_ID` to `processCallEnded`
- `api/voice/call-ended.js` — removed module-level `BUSINESS_ID`; added inline `resolveBusinessId(assistantId)` helper; `processCallEnded(payload, businessId)` accepts optional `businessId` param (resolves from assistantId if not passed); `extractExchanges(transcript, businessId)` updated to accept and embed `businessId` per row

**Files modified — Step 3 (voice tool endpoints):**
- `api/voice/get-slots.js` — replaced `const BUSINESS_ID` + `require('../config/luis')` with `resolveBusiness(req)`; `timezone` now comes from businesses row; `toUtcDate` and `formatSlot` accept `timezone` param
- `api/voice/create-booking.js` — same; `timezone` from businesses row
- `api/voice/lookup-customer.js` — replaced `BUSINESS_ID` with `resolveBusiness(req).id`
- `api/voice/validate-promo.js` — was partially dynamic (`business_id || BUSINESS_ID`); now resolves via `resolveBusiness(req)` instead of hardcoded fallback

**Files modified — Step 4 (crons):**
- `api/cron/outbound-reminders.js` — loop over `businesses.select('id')`; `BUSINESS_ID = biz.id` inside loop
- `api/cron/abandoned-followup.js` — same pattern
- `api/cron/outbound-rebooking.js` — same; `getActivePromo(businessId)` param added
- `api/cron/rebooking-email.js` — loop over `businesses.select('id, base_url')`; `getActivePromo(businessId)` param; `sendRebookingEmail` accepts `bookingUrl` param built from `biz.base_url`
- `api/cron/weather-trigger.js` — loop over `businesses.select('id, base_url')`; `recentWeatherPromo(businessId)` and `getActivePromo(businessId)` parameterized; `sendWeatherEmail` accepts `bookingUrl` param
- `api/cron/review-requests.js` — loop over `businesses.select('id, google_review_url, yelp_review_url')`; skips businesses with no review URLs; `triggerReviewCall`, `sendReviewEmail`, `sendReviewSMS` all accept `googleReviewUrl`/`yelpReviewUrl` params; removed module-level `GOOGLE_REVIEW_URL`/`YELP_REVIEW_URL` env vars
- `api/cron/review-drip.js` — same URL parameterization; loop over businesses
- `api/cron/loyalty-reward-nudge.js` — loop over `businesses.select('id, base_url')`; `bookingUrl(code, siteUrl)`, `ctaButton(code, siteUrl)`, `unsubscribeLink(customerId, siteUrl)`, `emailShell(body, customerId, siteUrl)`, `buildEmail(type, {..., siteUrl})`, `sendNudge({..., siteUrl, businessId})` all parameterized; `loyalty_reminders.business_id` now uses `businessId` param
- `api/cron/daily-paid-nudge.js` — loop over `businesses.select('id, email, base_url')`; `notifyEmail = biz.email || process.env.NOTIFICATION_EMAIL`; admin link built from `biz.base_url`

**Skipped (per spec):**
- `api/book.js` — web form, not voice; Phase 4
- `api/lookup-customer.js` — web form, not voice; Phase 4
- `api/admin/` — Step 5 says skip; stays per-tenant URL
- `api/cron/activation-nudge.js` — already loops over businesses; not touched

### What's Working / Verified

- No hardcoded `BUSINESS_ID = 'luis-mobile-detail'` remains in `api/voice/` or `api/cron/` (grep confirmed)
- `businesses.vapi_assistant_id` already set to `a831eec7-9b7b-4b0c-928c-dea1c3cfd296` for Luis — confirmed via Supabase MCP before writing any code; no DB migration needed
- Committed `da3c694`, pushed to `main`; Vercel auto-deployed

### Decisions Made

- `assistant-request` event (Vapi asking which assistant to use) has no `assistantId` in payload yet — resolved via `VAPI_ASSISTANT_ID` env var pointing to Luis's assistant, then looked up in businesses table. In true multi-tenant, each detailer's number will have their assistant pre-assigned, so `assistant-request` won't fire for them.
- Fallback `'luis-mobile-detail'` kept in `resolve-business.js` — safety net if assistantId doesn't match any row; prevents 500s during transition
- Cron `businesses` query has no active filter — the businesses table has no `active` column. Crons with no bookings/customers for a new business simply find 0 rows and do nothing. Safe.
- `businesses.email` used as notification recipient in `daily-paid-nudge.js` instead of `NOTIFICATION_EMAIL` env var. Luis's row has `email = Andrew@bluhatfunding.com` — will need to update to Luis's email in DB directly.
- Outbound Vapi call content (e.g. `vapi_number: '626-654-1924'` in firstMessage strings) left hardcoded — these are content strings, not queries. Tracked for Phase 4.

### Issues Hit

- None blocking. Straightforward execution of CLAUDE.md spec.

---

## Session 75 — 2026-06-28

### Current Phase: Phase 2 — Final Test
### Last Completed: Playbook updated (Prompts 5–9 marked done), architecture planning
### Next Agent: Run the Phase 2 Final Test (9 steps below)

---

### NEXT AGENT INSTRUCTIONS

Read these files in order:
1. `CLAUDE.md`
2. `PROGRESS.md` — this entry only
3. `DB_SCHEMA.md`
4. `master-build-playbook-v2.md` → Final Test section

**Your job: Run the Phase 2 Final Test end-to-end.**

The 9 steps (from the playbook Final Test section):
1. Create test business via `POST /api/detailer-signup` (use a fresh phone number — NOT 415-279-4984)
2. Verify basic agent created in Vapi (`businesses.vapi_assistant_id` populated)
3. Verify phone number assigned (or flag as manual step)
4. Call the business number → basic agent answers, captures lead
5. Check owner got notification email with caller details
6. Trigger nudge cron manually: `GET /api/cron/activation-nudge` (or via Vercel dashboard)
7. Verify 48h nudge fires (phone + email) with call count
8. Call (818) 403-3447 as the test owner → complete onboarding (use test business PIN)
9. Verify basic agent upgrades to full Connie (same Vapi ID, same number)
10. Call business number again → now books appointments
11. Verify nudge drip stops (profile_status = 'active')

If the Final Test passes → Phase 2 is DONE. Update PROGRESS.md and check off Final Test in playbook.

---

### Architecture Decisions Made This Session (context for future agents)

**Big picture: Luis Mobile Detail project → Hey Connie platform**

Everything built in `luis-mobile-detailing.vercel.app` eventually moves into `heyconnie.co`. Luis becomes tenant #1. New detailers each get:
- Public microsite at `heyconnie.co/their-slug` (5 selectable templates)
- Booking widget (iframe embed for detailers with existing websites)
- Same admin panel, scoped to their data via RLS
- Optional custom domain mapping (paid add-on)

**Phase sequence after Phase 2 Final Test:**

**Phase 3 — Multi-tenant routing**
- Fix hardcoded `BUSINESS_ID` across 22 files in Luis project
- Add `vapi_assistant_id` → `business_id` mapping in webhooks
- Pass `business_id` through all voice tool endpoints
- Update all crons to loop over `businesses WHERE active = true`
- Spec already in CLAUDE.md

**Phase 4 — API consolidation**
- Move all `api/`, `api/admin/`, `api/voice/`, `api/cron/` into heyconnie project
- Move `admin/index.html` into heyconnie
- Update env vars in Vercel
- `luis-mobile-detailing.vercel.app` redirects to heyconnie.co and retires

**Phase 5 — Website Builder + Hosted Pages**
- `heyconnie.co/[slug]` → auto-generated microsite per tenant
- `heyconnie.co/book/[slug]` → booking widget standalone page (iframe embed)
- 5 templates (One-Pager Express first, then Clean Pro, Bold Dark, Local Trust, Gallery First)
- Admin "My Website" tab (template picker, image URLs, social links, embed code)
- SMS/TCPA consent on all booking forms
- Custom domain mapping (paid add-on)
- Spec: `Roadmap/website-builder-feature-spec.md`

---

### What Was Done This Session

**Duplicate phone number validation — COMPLETE (pushed live)**
- `api/detailer-signup.js` — both Luis and heyconnie repos
- Returns 409 with clear message when `owner_phone` already exists
- Phone field on heyconnie.co signup: 10-digit max, auto-formats as NXX-NXX-XXXX

**Playbook updated:**
- `master-build-playbook-v2.md` — Prompts 5–9 marked ✅, Final Test marked as next

---

### What Was Decided This Session

**Duplicate phone number validation on signup:**
- `businesses.owner_phone` UNIQUE constraint added to DB this session
- Currently a duplicate phone throws a silent 500 — user sees "Something went wrong"
- Fix: add explicit pre-insert check, return 409 with message:
  > "That phone number is already registered to another account. Please use a different number."
- Validation fires **on submit only** (not real-time)
- Frontend (`/Users/guest123/Projects/heyconnie/index.html`) already renders `json.error` in `.form-error` div — no frontend changes needed
- Plan file has full implementation detail

### What's Verified Working (carried forward)
- (626) 654-1924 Connie — recognizes returning customer, remembers 3 cars ✓
- (818) 403-3447 Setup agent — finds account by phone, reaches PIN prompt ✓
- `businesses.owner_phone` UNIQUE constraint live in DB ✓
- 24h + 48h nudge milestones in activation drip ✓
- Business hours gate on all phone nudges (9am–5pm default) ✓
- Admin Settings: single source of truth for contact/location ✓

### What's NOT Done — After Duplicate Phone Fix
Full Phase 2 end-to-end test (master-build-playbook-v2.md → Final Test):
1. Create test business via `api/detailer-signup` (need fresh phone, not 415)
2. Verify basic agent created in Vapi + phone assigned
3. Call business number → basic agent answers, captures lead
4. Owner gets notification email
5. Trigger nudge cron manually → verify 24h fires within hours
6. Call (818) 403-3447 as test owner → complete onboarding
7. Verify upgrade to full Connie (same Vapi ID, same number)
8. Call business number → now books appointments
9. Verify nudge drip stops (profile_status = 'active')

---

## Session 73 — 2026-06-28

### Current Phase: Phase 2 (Final Test)
### Last Completed: 24h nudge + business hours gate
### Next: Full Phase 2 end-to-end test (see master-build-playbook-v2.md → Final Test)

---

### What Was Done This Session

#### `api/cron/activation-nudge.js` — 24h nudge + business hours gate (`8c1d270`)

**24h milestone added:**
- Added `{ key: '24h', days: 1, channels: ['phone', 'email'] }` at top of `FIXED_MILESTONES`
- Added `'24h'` case to `phoneScript()` — branches on callCount > 0 (has calls vs no calls yet)
- Added `'24h'` entry to `EMAIL_CONTENT` — same branch logic, dynamic subject with call count

**Business hours gate on ALL phone nudges:**
- Added `isWithinBusinessHours(bizHours, timezone)` helper function
  - Gets current time in business's IANA timezone (`businesses.timezone`)
  - Looks up today's window from `availability_windows` table
  - If no hours set → defaults to **9am–5pm** in their timezone
  - Returns `true` only if current time falls within the window
- Updated `businesses` query to also fetch `timezone` and `availability_windows!left(day_of_week, start_time, end_time)`
- Phone send block now wrapped: `if (phonePending && biz.owner_phone && isWithinBusinessHours(bizHours, biz.timezone))`
- Skipped phone nudges are NOT inserted into `activation_nudges` — they stay pending and retry next day's cron
- Email always sends regardless of hours

**Supported timezones:** `America/Los_Angeles`, `America/Denver`, `America/Chicago`, `America/New_York`

---

### Full Nudge Schedule (current)
| Milestone | Days | Channels |
|-----------|------|----------|
| 24h | 1 | phone + email |
| 48h | 2 | phone + email |
| 4d | 4 | phone + email |
| 7d | 7 | phone + email |
| 14d | 14 | phone + email |
| 30d | 30 | phone + email |
| 60d | 60 | phone + email |
| 90d | 90 | phone + email |
| month4–6 | 120–180 | email only |
| quarterN | 270+ | email only |

---

### What's Verified Working (End of Session)
- (626) 654-1924 Connie — recognizes returning customer, remembers 3 cars ✓
- (818) 403-3447 Setup agent — finds account by phone, reaches PIN prompt ✓
- Admin Settings: single source of truth for contact/location ✓
- Business Profile tab: no duplicate contact fields ✓
- `businesses.owner_phone` unique constraint enforced ✓

### What's NOT Done — Next Agent Should Start Here
**Full Phase 2 end-to-end test** (from master-build-playbook-v2.md → Final Test section):
1. Create test business via `api/detailer-signup` (need a fresh phone number — not 415)
2. Verify basic agent created in Vapi + phone number assigned
3. Call the business number → basic agent answers, captures lead
4. Check owner got notification email
5. Trigger nudge cron manually → verify 24h fires within hours, skips phone if outside hours
6. Call (818) 403-3447 as test owner → complete onboarding
7. Verify basic agent upgrades to full Connie (same Vapi ID, same number)
8. Call business number → now books appointments
9. Verify nudge drip stops (profile_status = 'active')

**Known gap:** Twilio auto-purchase in `detailer-signup.js` — may be flagged as manual step. Check before running test.

---

## Session 72 — 2026-06-27

### What Was Done This Session

#### Commits Landed
All previously pending commits shipped:
- `e151a91` — `api/cron/activation-nudge.js` (Prompt 9) + `api/detailer-signup.js` (damage control fix)
- `3af175e` — `config/setup-agent.js`: firstMessage changed to "Hi, you've reached Hey Connie! What's your name?" + removed filler before `lookupBusiness` call. Deployed via `node scripts/setup-agent-deploy.js` → PATCH `281883e1` ✓

#### Admin UI — Removed Duplicate Contact/Location (`admin/index.html`)
- `4022929` — Removed entire Contact & Location section from Business Profile tab (phone, email, address, city, state, zip, timezone)
- Removed Business Name + Owner Name from Business Basics section in Business Profile tab
- Removed `bpSaveContact()` JS function entirely
- Removed `business_name`/`owner_name` from `bpSaveSection('basics')` payload
- Added info note: "Business name, contact info, and location are managed in the Settings tab" with link to Settings
- **Decision:** Settings tab is the single source of truth for contact/location. Business Profile tab is AI knowledge base only (greeting, tone, services, area, policies, FAQs).

#### Bug Fix — `{{customer.number}}` Literal in Tool Descriptions (`config/vapi-assistant.js`, `config/setup-agent.js`)
- `4b82555` — Removed `{{customer.number}}` from `caller_phone` parameter descriptions in both Connie and setup agent tool definitions
- **Root cause:** Vapi substitutes `{{customer.number}}` in the system prompt but NOT in tool parameter descriptions. Model was reading the literal string from the description and passing it as the `caller_phone` arg → stripped to empty string → lookup returned `found: false`
- Fix: descriptions now say "Pass the exact value from the system prompt header 'Caller's phone:'"
- Deployed Connie tools via `node scripts/vapi-setup.js` ✓

#### Bug Fix — Server-Side Phone Extraction (`api/voice/lookup-customer.js`, `api/voice/lookup-business.js`)
- `e8e1982` — `lookup-customer.js`: read caller phone from `req.body.message.call.customer.number` first, fall back to model arg
- `f50a1ab` — `lookup-business.js`: same fix. Also removed `{{customer.number}}` from setup agent tool description + redeployed setup agent ✓

#### Bug Fix — Duplicate `owner_phone` Records Blocking `maybeSingle()` (Supabase)
- **Problem:** `mike-auto-spa` and `jims-car-detail` (test records from June 26) had `owner_phone = '4152794984'` — same as Luis Mobile Detail. `maybeSingle()` errored on multiple matches → catch returned `found: false`.
- **Fix:** Deleted both test records and their `business_profiles` rows via Supabase MCP
- Added `UNIQUE` constraint on `businesses.owner_phone` — enforces one number per business at DB level
- **Decision:** Andrew's 415-279-4984 is the official test account for Luis Mobile Detail going forward

#### Bug Fix — Wrong Phone in Settings
- `businesses.phone` had a typo: `(415) 279-4948` instead of `(415) 279-4984` — corrected in admin Settings UI by Andrew

---

### What's Verified Working (End of Session)
- **(626) 654-1924 Connie** — recognizes Andrew as returning customer, remembers 3 cars ✓
- **(818) 403-3447 Setup agent** — finds account by phone, reaches PIN prompt ✓
- `lookup-customer` endpoint: direct curl returns `found: true` for `+14152794984` ✓
- `lookup-business` endpoint: direct curl returns `found: true` for `+14152794984` ✓
- Admin Settings tab: single source of truth for contact/location ✓
- Business Profile tab: no duplicate contact fields ✓
- `businesses.owner_phone` unique constraint: prevents duplicate registrations ✓

### What's NOT Done / Next Steps
- Prompt 10+ — see `master-build-playbook-v2.md` for next prompts
- Setup agent PIN flow — only verified it reaches the PIN prompt; full setup walkthrough not tested end-to-end
- `api/cron/activation-nudge.js` — deployed but never tested against a real draft business

---

## Session 71 — 2026-06-27

### Current Phase: Phase 9
### Last Completed Prompt: Prompt 9 (partial — code done, not deployed)
### Next Prompt: Setup agent firstMessage fix (see below)

---

### What Was Done This Session

#### Prompt 9 — Activation Nudge Scripts (`api/cron/activation-nudge.js`)
**Part A — Phone scripts rewritten:**
- `phoneScript()` now takes `callCount` as 4th param (default 0)
- `48h`: branches on callCount > 0 (has-calls vs no-calls variant, exact spec copy)
- `4d/7d/14d`: single script — "handled X calls but can't book yet"
- `30d/60d/90d`: single script — "X calls, still in message-only mode"
- Call site updated: `phoneScript(milestone.key, biz.owner_name, biz.name, callCount || 0)`

**Part B — Email templates rewritten:**
- `subject()` functions now accept `(name, biz, callCount)` — dynamic subjects with call count
- `48h`: "Your AI receptionist took X calls already" vs "Your AI receptionist is live"
- `4d`: "Your receptionist handled X calls — but can't book yet"
- `7d`: "1 week in — X calls captured, 0 bookings"
- `14d`: "X calls answered, still no bookings"
- `30d`: "X calls, X potential bookings missed"
- `60d/90d`: lighter touch, call count in body
- `LATE_EMAIL` and `QUARTERLY_EMAIL` unchanged
- Subject call site updated to pass `callCount`

**Status:** Code complete. NOT yet committed or deployed.

---

#### Damage Control — Prompt 7 Regression

**What broke:** `businesses.vapi_assistant_id` for `luis-mobile-detail` was overwritten from Connie's real ID (`a831eec7`) to a basic agent ID (`42457be4`). Also `business_profiles` table had no row for `luis-mobile-detail`, causing the Business Profile tab to show an empty state.

**Root cause:** Prompt 7's `generate-knowledge.js` `upgradeToFullAgent` function ran against the wrong assistant ID (which was already overwritten). How the ID got overwritten initially is unclear — likely a test run of `detailer-signup.js` with data that collided, or manual testing.

**DB fixes applied (live, Supabase MCP):**
- `businesses.vapi_assistant_id` restored to `a831eec7` ✓
- `business_profiles` row seeded for `luis-mobile-detail`:
  - `profile_status = 'active'`
  - `owner_phone = '4152794984'` (Andrew's number — enables setup agent lookup)
  - Services: Just a Wash $45/60min, Standard Detail $75/120min, Full Detail $350/240min
  - Service area: 10 SGV cities
  - Hours: Mon–Sat 08:00–18:00

**Code fix — `api/detailer-signup.js`:**
- Added `.is('vapi_assistant_id', null)` guard to the `businesses.update({ vapi_assistant_id })` call
- Prevents overwriting an existing agent ID even if the flow somehow reaches that line for an existing business

**Connie re-confirmed:** Ran `node scripts/vapi-setup.js` — all 7 tools restored and PATCHed to `a831eec7`. ✓

**Note:** Admin data (PIN = 2274, address, phone, etc.) was NEVER deleted. It was a display issue — `business_profiles` row was missing, causing `bpRender()` empty state. Data in `businesses` table was always intact.

**NOT yet committed:** The `api/cron/activation-nudge.js` and `api/detailer-signup.js` changes need to be committed and pushed.

---

#### Setup Agent firstMessage — Designed, NOT Built Yet

**Problem:** Current `firstMessage` in `config/setup-agent.js` line 194:
`"Hey! You've reached Hey Connie setup. Go ahead and speak when you're ready."`
Callers have no idea what to say.

**Agreed design (build next session):**

`firstMessage`: `"Hi, you've reached Hey Connie! What's your name? I'll check if we have your account on file."`

Caller says their name → agent calls `lookupBusiness(caller_phone)` immediately (no filler) → branches:
- **Found + has_pin: true** → "Hey [name]! I found your account. What's your 4-digit PIN?" → calls `verifyPin` → proceeds to setup/update
- **Found + has_pin: false** → "Hey [name]! I see your account but there's no PIN set yet. Log into heyconnie.co to add one, then call back."
- **Not found** → "Hey [name]! I don't see an account tied to this number yet. Head over to heyconnie.co to get started — you'll get a welcome email with everything you need, including this number to call back."

**Files to change:**
- `config/setup-agent.js` — `firstMessage` (line 194) + STEP 1 instruction in system prompt (remove "Let me look you up real quick!" filler, clarify agent calls `lookupBusiness` silently when caller speaks)
- After saving: run `node scripts/setup-agent-deploy.js` to PATCH assistant `281883e1`

**PIN flow:** PIN is always asked AFTER phone lookup confirms the account exists and has a PIN set. Phone number is the identifier; PIN is the verifier. This pattern holds for every call — first setup, returning updates, everything.

---

### What's Verified Working
- Connie (626-654-1924) tools restored — all 7 tools ✓
- `businesses.vapi_assistant_id` = `a831eec7` ✓
- `business_profiles` row seeded — Business Profile tab should now render ✓
- Andrew's customer record phone confirmed: `+14152794984` ✓
- Prompt 9 code complete in `api/cron/activation-nudge.js` ✓

### What's NOT Verified
- Admin hard refresh — Andrew should Cmd+Shift+R to confirm PIN (2274) and Business Profile both display
- Setup agent call from 415-279-4984 — should find account via `business_profiles.owner_phone`
- Prompt 9 activation-nudge not yet tested against a real draft business

### Commits Needed (next session start)
1. Prompt 9 changes: `api/cron/activation-nudge.js`
2. Damage control fix: `api/detailer-signup.js` (`.is('vapi_assistant_id', null)` guard)
3. Setup agent firstMessage fix (build next session, then commit)

---

## Session 70 — 2026-06-27

### Current Phase: Phase 8
### Last Completed Prompt: Prompt 8
### Next Prompt: Prompt 9

---

### What Was Done This Session

#### Bug Fix: Settings Save (api/admin/settings.js)
**Issue:** Saving Voice PIN in admin Settings tab returned 500.
**Root cause:** `supabase.upsert({ id, voice_pin })` tried to INSERT a new row — hit NOT NULL constraint on `businesses.name`.
**Fix:** Replaced `.upsert()` with `.update().eq('id', business_id)` — the row always exists before settings can be touched.
- Also added `console.error` logging of actual Supabase error (surfaced from generic "Failed to save settings").
- Files: `api/admin/settings.js`
- Verified: Voice PIN saves successfully in live admin.

---

#### Prompt 7 — Instant Basic Agent on Signup

**`config/basic-agent.js`** (NEW)
- `buildBasicAgentConfig(business_name, owner_name, base_url)` — Haiku-based lead-capture assistant config.
- No tools. Elliot voice. Webhook → `/api/voice/basic-agent-webhook`.
- System prompt: capture caller name + phone, tell them owner will call back.

**`api/voice/basic-agent-webhook.js`** (NEW)
- Handles `end-of-call-report` events from the basic agent.
- Looks up `business_id` via `businesses.vapi_assistant_id` (multi-tenant pattern).
- Uses Haiku to extract caller name + summary from transcript.
- Saves to `call_logs` with `outcome: 'lead_captured'`.
- Sends Resend notification email to owner immediately.

**`api/detailer-signup.js`** (MODIFIED)
- After `businesses` insert: calls `POST https://api.vapi.ai/assistant` with basic agent config.
- Saves returned `id` to `businesses.vapi_assistant_id`.
- Phone number auto-purchase not implemented — logs warning, continues gracefully.
- Welcome email updated with pink callout box: "Your AI receptionist is ALREADY set up."
- Vapi failure is non-fatal — returns `{ success: true, vapi_ready: false }` if Vapi fails.

**`api/admin/generate-knowledge.js`** (MODIFIED)
- Added `upgradeToFullAgent(businessId, assistantId, profile)` function.
- After profile goes active: fetches business + services, builds full Connie config via `buildAssistantConfig()`, creates/updates all 7 tools, PATCHes the existing assistant ID.
- Upgrade failure is non-fatal — knowledge is already live even if PATCH fails.
- Reuses `buildAssistantConfig` from `config/vapi-assistant.js`.

**Decisions:**
- Twilio phone auto-purchase is a manual step — flagged as warn log.
- `BASE_URL` env var used in signup for webhook routing. Falls back to `luis-mobile-detailing.vercel.app`.

---

#### Prompt 8 — Activation Nudge Drip

**Database migration** (`add_activation_nudges`)
- Created `activation_nudges` table: `(id, business_id, nudge_type, milestone, sent_at, vapi_call_id, email_sent, created_at)`
- Unique index: `(business_id, milestone, nudge_type)` — prevents all double-sends.
- Added `businesses.activation_opted_out BOOLEAN DEFAULT false`.

**`api/cron/activation-nudge.js`** (NEW)
- Runs daily at 8 AM PT (`0 15 * * *` UTC).
- Fetches all `activation_opted_out = false` businesses. Skips `profile_status = 'review' | 'active'`.
- Milestone schedule:
  - 48h, 4d, 7d, 14d, 30d, 60d, 90d → phone + email
  - month4, month5, month6 → email only
  - quarter1, quarter2... (every 90d after month6) → email only (generated dynamically)
- One milestone per business per run.
- Phone: `POST https://api.vapi.ai/call/phone` using `VAPI_OUTBOUND_ASSISTANT_ID` + `VAPI_PHONE_NUMBER_ID`. Logs to `outbound_calls`.
- Email: Resend from `setup@heyconnie.co`. Milestone-specific subject + body. Includes call count if > 0.
- Unsubscribe link in every email footer → `/api/unsubscribe-nudge?bid=...`

**`api/unsubscribe-nudge.js`** (NEW)
- `GET /api/unsubscribe-nudge?bid={business_id}` → sets `activation_opted_out = true`, returns branded HTML confirmation.

**`vercel.json`** — cron entry added.
**`DB_SCHEMA.md`** — `activation_nudges` table + `businesses.activation_opted_out` documented.

**Decisions:**
- Quarterly logic: `quarter1` = day 270, `quarter2` = day 360, etc. Milestone keys computed dynamically.

---

### What's Verified Working
- Voice PIN save in admin Settings ✓
- All Prompt 7 + 8 code pushed to main → Vercel deployed ✓
- `activation_nudges` table + `businesses.activation_opted_out` confirmed in Supabase ✓

### What's NOT Verified Yet
- Prompt 7: POST to `/api/detailer-signup` end-to-end — Vapi assistant creation (needs VAPI_API_KEY set in Vercel)
- Prompt 7: `/api/voice/basic-agent-webhook` — needs a real Vapi basic agent call to test
- Prompt 8: `/api/cron/activation-nudge` — needs a test business with `profile_status = 'draft'` and `created_at > 2 days ago`

### Commits Pushed (this session)
- `ff48736` — Surface real Supabase error on settings save failure
- `9238c7a` — Fix settings save: use update() instead of upsert()
- `f8f08e1` — Prompt 7: Instant basic Vapi agent on signup + upgrade to full Connie on knowledge generation
- `d1704bc` — Prompt 8: Activation nudge drip — cron, opt-out endpoint, DB schema

---

## Session 69 — 2026-06-27

### Current Phase: Phase 7
### Last Completed Prompt: Prompt 6 (Voice PIN Gatekeeper)
### Next Prompt: Prompt 7

---

### What Was Done This Session

#### Voice PIN — Settings Tab (admin/index.html + api/admin/settings.js)
- `api/admin/settings.js`:
  - Added `voice_pin` to `ALLOWED_FIELDS` array
  - Added `voice_pin` to GET select query (so it pre-fills on load)
  - Added POST validation: `voice_pin` must be exactly 4 digits if present
- `admin/index.html`:
  - New "Voice PIN" card added to Settings tab (below Save Settings button)
  - Fields: 4-digit text input (`id="sVoicePin"`)
  - Button: "Update PIN" → calls `saveVoicePin()`
  - `loadSettings()` now pre-fills `sVoicePin` from `_settings.voice_pin`
  - `saveVoicePin()` validates client-side then POSTs `{ business_id, voice_pin }` to `/api/admin/settings`
  - Inline success/error feedback, auto-clears after 3s
- sw.js: v47

#### Hours — Single Source of Truth (availability_windows)
**Decision:** `availability_windows` is the single source of truth for business hours. It drives both the booking slot engine AND what the voice agent tells customers. `business_profiles.hours` JSONB is kept for reference but is no longer the authoritative source.

- `api/voice/process-onboarding.js`:
  - Added `DAY_MAP` constant: `{ sun:0, mon:1, tue:2, wed:3, thu:4, fri:5, sat:6 }`
  - Added `syncHoursToAvailability(businessId, hours)` function:
    - Converts extracted hours `{ mon: { open, close }, ... }` → `availability_windows` rows
    - Deletes days not in new set, then upserts new rows on `(business_id, day_of_week)`
    - Called after profile save for both `initial_setup` and `profile_update` call types
  - Step numbering fixed: 4 = sync hours, 5 = mark processed, 6 = return
- `admin/index.html` — Business Profile tab Section 4 Hours:
  - Removed editable hours table and "Save Hours" button
  - Replaced with read-only note: "Your hours are managed in Settings → Business Hours"
  - Added "Go to Business Hours →" button that navigates to Settings → Business Hours tab
- sw.js: v48

#### Business Profile Empty State Fix (admin/index.html)
**Bug:** `bpRender()` showed "No business profile yet" empty state whenever `business_profiles` row was null — even if `businesses` table had name/phone/email/address already populated.

**Fix:**
- Added `_bpBiz = null` module-level variable alongside `_bp`
- `loadBizProfile()` now stores `settingsRes.settings` in `_bpBiz` (was anonymous `s`)
- `bpRender()` now checks: show empty state only if BOTH `_bp` is null AND `_bpBiz` has no name/phone/email/address
- Logic: `const hasBizData = _bpBiz && (_bpBiz.name || _bpBiz.phone || _bpBiz.email || _bpBiz.address)`
- sw.js: v49

---

### Commits Pushed (this session)
- `b108fee` — Add Voice PIN management to Settings tab
- `235e511` — Consolidate hours to availability_windows as single source of truth
- `ae63bd3` — Fix Business Profile empty state: show form when businesses data exists
- `55e73a5` — (heyconnie repo) Add voice PIN field to signup form

---

### What's Verified Working
- api/admin/settings.js ALLOWED_FIELDS includes voice_pin ✓
- process-onboarding.js syncHoursToAvailability() writes to availability_windows ✓
- BP tab Section 4 is now read-only with link to Settings ✓
- All changes pushed to main → Vercel deployed ✓
- heyconnie.co signup form has PIN field (pushed to bluhatbookkeeping/heyconnie) ✓

### What's NOT Verified Yet
- End-to-end test: call (818) 403-3447, complete a setup call, confirm hours land in availability_windows
- Luis's voice_pin is not set — call flow will hit PATH B until set via Settings → Voice PIN
- Business Profile empty state fix needs browser test against live admin

### Decisions Made
- `availability_windows` = single source of truth for hours (not `business_profiles.hours`)
- `business_profiles.hours` JSONB still gets written by process-onboarding for reference, but is no longer the authoritative source for the booking engine or voice agent
- BP Section 4 Hours input removed entirely — Settings → Business Hours is the one place to change hours
- Business Profile form shows if businesses row has ANY of: name, phone, email, address — not gated solely on business_profiles row existing

---

## Session 68 — 2026-06-27

### Current Phase: Phase 7
### Last Completed Prompt: Prompt 7 (Voice PIN Gatekeeper)

---

### What Was Done

#### Prompt 5 (carried from Session 67) — Admin Tab Fixes + Business Profile Contact Section
All 5 tasks executed and pushed to main → Vercel deployed.

**Files changed:**
- `api/admin/campaigns.js` — removed hardcoded `BUSINESS_ID = 'luis-mobile-detail'` fallback; now returns 400 if `?business=` param missing
- `api/admin/promos.js` — same fix
- `admin/index.html`:
  - `loadCampaigns()` GET and `launchCampaign()` POST now include `?business=` + BUSINESS_ID
  - New "Contact & Location" card added to Business Profile tab (phone, email, address, city, state, zip, timezone) — loads from `businesses` via `/api/admin/settings`, saves via `bpSaveContact()` → `/api/admin/settings` POST
  - Hours subtitle labels added: Settings hours → "Used by the booking engine to show available slots." BP hours → "Used by your voice agent when customers ask about your hours."
- `config/setup-agent.js` — closing now mentions admin panel promotions and loyalty rewards
- `scripts/setup-agent-deploy.js` — converted early-exit block into update path (upserts tools, patches assistant)
- `sw.js` — bumped to v45

#### Prompt 6 / Prompt 7 — Voice PIN Gatekeeper

**DB:**
- Migration applied to Supabase (`kgyipdyhzaypcxcpxqsg`): `ALTER TABLE businesses ADD COLUMN IF NOT EXISTS voice_pin TEXT`

**New file:**
- `api/voice/verify-pin.js` — Vapi tool endpoint
  - Input: `{ business_id, pin_attempt }`
  - Looks up `businesses.voice_pin`
  - Returns `{ verified: true }` on match
  - Returns `{ verified: false, attempts_remaining: X }` on wrong PIN
  - Locks after 3 failed attempts; returns `{ verified: false, locked: true }`
  - Attempt tracking in-memory (resets on cold start — acceptable for serverless)
  - Follows Vapi tool response format: `{ results: [{ toolCallId, result: JSON.stringify(data) }] }`

**Modified files:**
- `api/voice/lookup-business.js` — both return paths (profile + businesses fallback) now include `has_pin: !!(voice_pin)` so the agent knows which PATH to take
- `api/detailer-signup.js` — `voice_pin` added as required field; validates exactly 4 digits (`/^\d{4}$/`); saved to `businesses.voice_pin`
- `config/setup-agent.js` — full system prompt rewrite for gatekeeper flow:
  - PATH C: no account → send to heyconnie.co, end call
  - PATH B: account found, no PIN → can't proceed, send to admin panel, end call
  - PATH A: account found, has PIN → ask for PIN, call `verifyPin`, up to 3 attempts, lock + end call on failure
  - Scripted forgot-PIN and bypass-attempt responses
  - `verifyPin` tool definition added to `functionTools` array
- `scripts/setup-agent-deploy.js` — early-exit block replaced with update path: upserts all tools by name, patches assistant with new system prompt + toolIds

**Vapi (live):**
- `verifyPin` tool created: `9895dbe2-e006-4287-89bc-4b3b0c8d9a55`
- `lookupBusiness` tool patched
- Setup assistant `281883e1-ee8a-4603-b5f8-7ddf22894f69` patched with new system prompt + both tool IDs

**heyconnie.co signup form (`/Users/guest123/Projects/heyconnie/index.html`):**
- New "Create your 4-digit PIN" field added after Email
  - `inputmode="numeric"`, `maxlength="4"`, `pattern="\d{4}"`, `required`, `autocomplete="off"`
  - Sublabel: "This PIN protects your account when you call in."
  - Client-side validation: blocks submit if not exactly 4 digits
  - `voice_pin` added to POST payload → `/api/detailer-signup`

**sw.js** — bumped to v46

---

### What's Verified Working
- Supabase migration applied ✓ (`voice_pin` column exists on `businesses`)
- Vapi deploy script ran successfully ✓ (`verifyPin` tool created, assistant patched)
- campaigns.js and promos.js hardcoded fallback removed ✓
- All changes pushed to main → Vercel deployed (Luis Mobile Detail) ✓

### What's NOT Verified Yet
- Full call flow test: call (818) 403-3447 with a business that has a `voice_pin` set
- heyconnie.co signup form PIN field — pending push to heyconnie repo

### Decisions Made
- Attempt tracking is in-memory (not DB). Acceptable — voice calls are short, serverless instances restart between calls.
- `has_pin` returned by `lookupBusiness` so the agent can gate before asking for a PIN — no separate tool call needed.
- `voice_pin` stored as plain TEXT (not hashed). 4-digit PINs in a low-stakes voice context; hashing adds complexity without meaningful security gain.

### Issues Hit
- `setup-agent-deploy.js` was an initial-deploy-only script (exited early if assistant existed). Fixed by converting the early-exit to an update path.
- Vapi tool PATCH rejects `type` and `async` fields — stripped with destructuring before PATCH.

---
