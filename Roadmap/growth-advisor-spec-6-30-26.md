# Growth Advisor — AI COO Spec

_Separate from the master build playbook. This is a bigger feature 
that turns Hey Connie from a receptionist into a business partner._

_Prerequisites: Phases 1–4 of master playbook must be complete. 
The Growth Advisor uses the learning loop data, business profiles, 
and voice-managed tools._

---

## WHAT THIS IS

A monthly outbound call where Connie calls the detailer — not to 
ask questions, but to present insights and recommendations. She's 
already analyzed their bookings, customer patterns, service mix, 
promo performance, and loyalty data. She shows up prepared, like 
a COO with a dashboard who happens to call you.

This is the feature that makes Hey Connie irreplaceable. A 
receptionist answers calls. A COO helps you grow. That's the 
difference between a $15/hour tool and a $500/month platform.

---

## WHAT THE ADVISOR DOES

### Monthly Business Review Call
- Total bookings + trend vs last month
- Revenue estimate by service
- Most and least popular services
- New vs returning customer ratio
- Call-to-booking conversion rate
- Top 5 customers by visit frequency
- At-risk customers (30+ days since last visit)
- One-time customers who never came back
- Active promo performance (redemptions, revenue impact)
- Loyalty card progress (who's close to a reward)

### Actionable Recommendations
Not just data — specific actions the advisor can take on the spot:
- "8 customers haven't been back in 45 days — want me to send 
  them a 15% comeback offer?"
- "Full Detail is your highest-revenue service but only 30% of 
  bookings. Want me to run a promo to push it?"
- "3 customers are one punch away from a free wash. A quick 
  reminder might bring them in this week."
- "You had 31 calls but only 23 booked. That's 8 potential 
  customers who didn't convert — want me to follow up?"

### Takes Action Immediately
If the detailer says yes to any recommendation, the advisor uses 
the Phase 4 voice-managed tools (manage-promo, manage-loyalty, 
campaign engine) to create the promo, send the emails, or schedule 
the follow-ups right there on the call. No admin panel needed.

---

## DATA SOURCES (all existing tables)

| Table | What it tells us |
|-------|-----------------|
| bookings | Volume, revenue, service mix, booking frequency |
| customers | Customer count, returning vs new, contact info |
| call_logs | Call volume, conversion rate, missed opportunities |
| call_exchanges | What questions customers ask most |
| golden_responses | What the agent has learned (knowledge depth) |
| services | Pricing, duration, service catalog |
| promotions | Active promos, discount amounts |
| promo_codes | Code usage tracking |
| promo_redemptions | Redemption volume, which promos work |
| loyalty_programs | Punch card config |
| loyalty_punches | Customer progress toward rewards |

---

## SESSION OPENER

```
Read these files in this order:
1. CLAUDE.md
2. PROGRESS.md — ONLY the latest entry.
3. DB_SCHEMA.md — authoritative schema.
4. growth-advisor-spec.md (this file)

Pick up where the last session left off. The next prompt to run:
```

---

# THE PROMPTS

---

## ☐ Prompt 1 — Business analytics endpoint

```
Read DB_SCHEMA.md — bookings, customers, services, promotions, 
promo_codes, promo_redemptions, loyalty_programs, loyalty_punches, 
call_logs, call_exchanges tables.

Create api/admin/business-insights.js — GET endpoint.

Input: business_id (required), period (default 'month')
Periods: 'week', 'month', 'quarter'

Returns:
{
  period: "June 2026",
  comparison_period: "May 2026",
  summary: {
    total_bookings: 23,
    prev_bookings: 18,
    trend: "up",
    revenue_estimate: 4250,
    prev_revenue: 3400,
    new_customers: 8,
    returning_customers: 15,
    calls_total: 31,
    calls_booked: 23,
    conversion_rate: 74
  },
  services: {
    most_popular: { name: "Standard Detail", count: 14 },
    highest_revenue: { name: "Full Detail", revenue: 2450 },
    breakdown: [
      { name, count, revenue, pct_of_bookings }
    ]
  },
  customers: {
    top_5: [{ name, phone, visits, total_spent, last_visit }],
    at_risk: [{ name, phone, days_since_last, total_visits }],
    never_returned: [{ name, phone, first_visit_date, service }],
    at_risk_count: 8,
    never_returned_count: 4
  },
  promos: {
    active: [{ name, code, redemptions_this_period, total_redemptions }],
    expired_unused: [{ name, code, reason: "no redemptions" }],
    top_performer: { name, redemptions, estimated_revenue_driven }
  },
  loyalty: {
    active_program: { name, required_visits, reward },
    customers_close: [{ name, phone, current_punches, needed }],
    rewards_earned: 2,
    total_punches_this_period: 15
  },
  knowledge: {
    total_golden_responses: 23,
    pending_reviews: 5,
    most_asked_topic: "pricing"
  },
  recommendations: []  // we'll generate these in Prompt 2
}

Query logic:
- Bookings: WHERE business_id = X AND created_at within period
- Revenue: JOIN bookings.service to services.starting_price
- At-risk: last booking.created_at > 30 days ago, had 2+ visits
- Never returned: exactly 1 booking, > 14 days ago
- Calls: count call_logs within period
- Conversion: calls with outcome = 'booking_made' / total calls
- Promos: JOIN promotions to promo_redemptions within period
- Loyalty: JOIN loyalty_programs to loyalty_punches

Auth: admin only (JWT or x-admin-secret)
```

---

## ☐ Prompt 2 — AI-generated recommendations

```
Extend api/admin/business-insights.js:

After gathering all the data, use Claude Haiku to generate 
3-5 actionable recommendations based on the numbers.

Send the summary data to Haiku with this prompt:

"You are a business advisor for a mobile car detailing business. 
Based on these numbers, generate 3-5 specific, actionable 
recommendations. Each recommendation should include:
- What you noticed (the data point)
- Why it matters
- What to do about it (specific action)
- Whether this can be automated (send promo, send reminder, etc.)

Return as JSON array:
[{ 
  insight: string, 
  action: string, 
  automatable: boolean, 
  action_type: 'send_promo' | 'send_reminder' | 'follow_up' | 'adjust_pricing' | 'none',
  priority: 'high' | 'medium' | 'low' 
}]

Focus on revenue opportunities and customer retention. Be specific 
with numbers. Don't be generic."

Parse the recommendations and include them in the response.
```

---

## ☐ Prompt 3 — Growth Advisor outbound call

```
Create two things:

1. config/growth-advisor.js — THIRD Vapi assistant config

This agent makes outbound calls to detailers with their monthly 
business review. Separate from Connie (customer agent) and the 
setup agent.

System prompt structure:

"You are Connie, the business advisor for [business_name]. You're 
calling [owner_name] with their monthly business update. You have 
their data ready — present it conversationally, not like reading 
a spreadsheet.

OPENING:
'Hey [owner_name]! It's Connie with your monthly update for 
[business_name]. Got a few minutes?'

PRESENT INSIGHTS (use the data passed in context):
- Lead with the headline: bookings up or down, revenue trend
- Highlight the best-performing service
- Mention top customers by name
- Flag at-risk customers with specific counts
- Share promo performance if any are active
- Mention loyalty progress

RECOMMENDATIONS:
For each recommendation from the insights data:
- State what you noticed
- Explain why it matters
- Suggest what to do
- If automatable: 'Want me to set that up right now?'

TAKING ACTION:
If the owner says yes to a recommendation, use these tools:
- manage-promo: create comeback offers, seasonal specials
- manage-loyalty: adjust reward thresholds
- (future: campaign tools for email/SMS blasts)

Always confirm before taking action.

CLOSING:
'That's your update for [month]. Your AI receptionist handled 
[call_count] calls this month and she's getting smarter every 
week. Anything else you want to look at? Great — talk to you 
next month!'

TONE:
- Upbeat but not salesy
- Use their name
- Round numbers ('about 4 thousand' not '$4,250')
- Keep it under 5 minutes unless they want to dig deeper
- If they seem busy: 'I can send this as an email instead — 
  want me to do that?'"

Include manage-promo and manage-loyalty as tools in the config.

2. scripts/growth-advisor-deploy.js — PATCH-only deploy script
   Same pattern as setup-agent-deploy.js
```

---

## ☐ Prompt 4 — Monthly cron + call trigger

```
Create api/cron/growth-advisor.js

Runs on the 1st of each month (or first Monday).

For each business where:
- profile_status = 'active'
- has at least 5 bookings total (enough data to be useful)
- activation_opted_out is false

Do:
1. Call GET /api/admin/business-insights?business_id=X&period=month
2. Format the insights as a context string for the advisor prompt
3. Fire outbound Vapi call:
   - Use the growth advisor assistant
   - Call the owner's phone (businesses.owner_phone or 
     business_profiles.owner_phone)
   - Pass insights in the assistant overrides / context
4. Log to outbound_calls with call_type = 'growth_review'

If the call isn't answered:
- Send the insights as an email instead via Resend
- Subject: "Your [month] business update from Connie"
- Format the data as a clean email with the same sections
- Include a CTA: "Call (818) 403-3447 to discuss these numbers 
  or take action on any recommendations."
```

---

## ☐ Prompt 5 — Growth insights in admin panel

```
Add a "Business Insights" section to the admin dashboard.

This can be a new tab or a prominent section on the main 
dashboard page.

Shows the business-insights data as visual cards:

TOP ROW — Big numbers:
- Bookings this month (number + trend arrow vs last month)
- Revenue estimate (number + trend)
- Conversion rate (calls → bookings, with percentage)
- New customers this month

SERVICES SECTION:
- Horizontal bar chart: bookings by service
- Revenue by service
- Most and least popular callout

CUSTOMERS SECTION:
- At-risk customers (list with days since last visit)
  - "Send comeback offer" button per customer
- Never-returned customers (list)
  - "Send follow-up" button per customer
- Top 5 customers (list with visit count)

PROMOS SECTION:
- Active promos with redemption count
- Top performer highlighted
- "Create new promo" button

LOYALTY SECTION:
- Customers close to reward (list with punch count)
- "Send reminder" button per customer
- Rewards earned this month

RECOMMENDATIONS:
- AI-generated recommendations as cards
- Each with an "Action" button that either:
  - Creates a promo (opens create-promo flow)
  - Sends a campaign (opens campaign builder)
  - Or links to the relevant admin section

"Send comeback offer" button: creates a 10-15% promo targeting 
that customer via the campaign engine. One click.

"Send reminder" button: sends a loyalty reminder email.

Keep it simple. Big numbers, clear actions, mobile-friendly.
Period selector: This Week / This Month / This Quarter.
```

---

## FUTURE EXPANSION IDEAS

These are not spec'd — just ideas for the roadmap:

### Weekly Digest (email or text)
Lighter version of the monthly call. Quick stats email every 
Monday morning. No phone call needed.

### Competitive Intelligence
Track what questions customers ask that the agent can't answer. 
These are service gaps. "Customers asked about ceramic coating 
12 times this month but you don't offer it."

### Seasonal Planning
"Based on last year's data, your busiest month was September. 
You might want to start a back-to-school special in August."

### Revenue Optimization
"Your Full Detail is priced at $350 but competitors in your area 
charge $400-450. You might be leaving money on the table."

### Customer Lifetime Value
Track and present CLV per customer. "Your top customer has spent 
$2,400 with you over 18 months. Customers like this are worth 
a personal thank-you or a holiday gift card."

### Churn Prediction
"These 5 customers are showing signs they might not come back — 
longer gaps between visits, shorter conversations, skipping the 
usual services."

---

## QUICK REFERENCE

| What | Where |
|------|-------|
| Analytics endpoint | `api/admin/business-insights.js` |
| Advisor config | `config/growth-advisor.js` |
| Deploy script | `scripts/growth-advisor-deploy.js` |
| Monthly cron | `api/cron/growth-advisor.js` |
| Admin insights | `admin/index.html` (insights tab/section) |
| Data tables | bookings, customers, call_logs, services, promotions, promo_redemptions, loyalty_programs, loyalty_punches |
