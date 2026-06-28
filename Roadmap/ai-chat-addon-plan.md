# AI Chat Widget — Feature Plan

## Context
Luis Mobile Detail is a live single-file HTML site (no framework, no build step) on Vercel. The business needs a chat agent that can answer customer questions about services, pricing, and service area — grounded strictly in known business facts, no hallucination. When a customer wants to book, the agent scrolls them to the existing booking form. When a question is beyond the agent's knowledge, it collects the customer's contact info and emails a notification to the business owner. This is being built as a reusable add-on for future detailer clients.

**Escalation email (test):** astrauss99@gmail.com  
**Status:** ✅ COMPLETE — live on Vercel

---

## Files to Create

### `/api/chat.js` — Vercel serverless function
- Accepts `POST { messages: [...] }` (10-turn history max, trimmed from front)
- Loads business config from `/api/config/luis.js`
- Builds system prompt dynamically from config
- Calls Claude API: `model: claude-sonnet-4-6`, `max_tokens: 512`
- Inspects response for action tokens before returning:
  - `[ACTION:SCROLL_TO_BOOKING]` → strip token, return `{ reply, action: "SCROLL_TO_BOOKING" }`
  - `[ACTION:ESCALATE]\n{json}` → strip both, POST escalation to Formspree, return clean reply
- CORS: allow production origin + localhost for dev
- Reads `ANTHROPIC_API_KEY` from `process.env`

### `/api/config/luis.js` — Business config (reusable pattern)
```js
module.exports = {
  name: "Luis Mobile Detail",
  phone: "626-409-3147",
  instagram: "@luismobiledetail",
  serviceArea: "San Gabriel Valley — Pasadena, West Covina, El Monte, Pomona, Alhambra and surrounding cities",
  services: [
    { name: "Just a Wash", price: "Starting at $45" },
    { name: "Standard Detail", price: "Starting at $75" },
    { name: "Full Detail", price: "Starting at $350" }
  ],
  pricingNote: "Prices are starting points. Final price depends on vehicle size and condition. Confirmed before work begins.",
  escalationFormspreeUrl: "https://formspree.io/f/PLACEHOLDER",
  greeting: "Hi! I'm the virtual assistant for Luis Mobile Detail. I can answer questions about our services and pricing. What can I help you with?"
}
```
**To onboard another detailer:** create `/api/config/newclient.js`, pass `?client=newclient` on the frontend fetch call.

### `package.json` (repo root — new)
```json
{ "dependencies": { "@anthropic-ai/sdk": "^0.36.0" } }
```
Vercel auto-installs at deploy. No local build step.

---

## System Prompt Structure (built from config at runtime)
```
You are a helpful assistant for {name}, a mobile car detailing business
serving {serviceArea}.

BUSINESS FACTS (only facts you may state):
- Phone: {phone}
- Instagram: {instagram}
- Services: [list each with name and price]
- {pricingNote}

RULES:
1. Only answer questions about this business. Never discuss competitors or general advice unrelated to booking.
2. Never invent or estimate a price. Reference starting prices only and note final pricing is confirmed before work begins.
3. If the customer wants to book, reply naturally and include exactly: [ACTION:SCROLL_TO_BOOKING]
4. If a question is outside your knowledge, ask for their name and phone or email, then include:
   [ACTION:ESCALATE]
   {"name":"...","contact":"...","question":"..."}
5. Max 2–4 sentences per reply. Friendly, plain language.
6. Never claim to be human. You are a virtual assistant for {name}.
```

---

## Files to Modify

### `index.html`
Three additions, all self-contained:

**CSS** — append inside existing `<style>` block:
- `.chat-bubble` — fixed, bottom-right, z-index:200, blue background, matches existing brand
- `.chat-panel` — fixed window above bubble, hidden by default, transitions open
- `.chat-msg.agent` / `.chat-msg.user` — left/right bubbles using existing CSS vars
- Mobile breakpoint at 480px: panel goes near full-width

**HTML** — just before `</body>`:
- `#chatBubble` toggle button with chat SVG icon
- `#chatPanel` with header, `#chatMessages` scroll area, input row

**JS** — second `<script>` block after existing one:
- Toggle open/close, render greeting on first open
- Send: append user bubble → POST `/api/chat` → render reply
- On `action: "SCROLL_TO_BOOKING"`: scroll to `#book`, close panel (600ms delay)
- On escalation: show "Luis will reach out to you shortly" message
- On error: fallback — "Please call Luis at 626-409-3147"
- Enter key sends, auto-scroll after each message

### `sw.js`
- `luis-detail-v2` → `luis-detail-v3`

---

## Vercel Environment Variables
- `ANTHROPIC_API_KEY` — Anthropic API key (all environments)

---

## Implementation Order
1. `package.json` — add Anthropic SDK dependency
2. `/api/config/luis.js` — business config
3. `/api/chat.js` — serverless function
4. `sw.js` — cache version bump
5. `index.html` — CSS → HTML → JS (in that order within the file)
6. Set `ANTHROPIC_API_KEY` in Vercel dashboard before pushing
7. Push to `main` — Vercel auto-deploys

---

## Verification
1. Open https://luis-mobile-detailing.vercel.app — chat bubble appears bottom-right
2. Ask "what does a full detail include?" — agent responds with accurate info only
3. Ask "I want to book" — agent replies and page scrolls to `#book` form
4. Ask something outside the business (e.g. "what wax brand do you use?") — agent asks for contact info, escalation email arrives at astrauss99@gmail.com
5. Test on mobile at 375px — widget usable, doesn't cover form
