# Luis Mobile Detail — Booking Form Rebuild Spec v2

## Goal

Rebuild the booking form at `https://luis-mobile-detailing.vercel.app/` with a phone-first entry flow that serves two purposes: capturing the lead immediately for new customers, and unlocking a fast-track rebooking experience for returning customers.

The current flow is: Vehicle → Service → Contact.
The new flow starts with a single phone number field that branches into two paths depending on whether the customer has booked before.

---

## Entry Screen — Phone Number Gate

The form opens with a single input field. This is NOT a full form step with a progress bar — it's a clean, minimal entry point that feels like a doorway, not a form.

**Layout:**

- Heading: "Book Your Detail"
- Subheading: "Enter your phone number to get started. Booked with us before? We'll pull up your details."
- Phone number input field (large, prominent, auto-focused on mobile)
- "Get Started" button
- Below the button, small text: "Or call Luis directly:" with clickable phone number link

**Behavior:**

- Phone field validates for 10-digit US number
- Format hint in placeholder: `(626) 555-1234`
- On submit, run an async lookup against previous bookings by phone number
- The lookup must return in under 500ms — do not block the UI with a loading spinner. Use a subtle inline indicator (a small shimmer or brief "Checking..." text next to the field) if needed
- Based on lookup result, route to one of two paths below

---

## Path A — Returning Customer

Triggered when the phone number matches a previous booking.

### A1: Welcome Back Summary

Instead of dropping them into a multi-step form, show a summary card with their information from their most recent booking pre-filled.

**Layout:**

- Heading: "Welcome back, [First Name]!"
- Subheading: "Here's your info from last time. Confirm the details and pick a time."

- **Summary card** showing:
  - Service: [Last service they booked, e.g., "Standard Detail"] — displayed as a tappable/selectable card, visually highlighted, with the other service options visible but not selected so they can switch if they want
  - Vehicle: [Year Make Model, e.g., "2019 Toyota Camry"]
  - Location: [Their service address]
  - Name: [Full name]
  - Email: [If previously provided]

- All fields are editable. Clicking any field or an "Edit" link next to it opens that field for editing inline. But the default experience is: everything is already filled in, they don't need to touch anything unless something changed.

### A2: Date & Time Selection

Below the summary card (same screen, scrollable — not a separate step):

- **Preferred Date** — date picker
- **Available Times** — tappable pills, multi-select allowed:
  - `Morning (8am–12pm)` · `Afternoon (12pm–5pm)` · `Evening (5pm–8pm)` · `Flexible`

- **Promo Code** — collapsed behind a `Have a promo code?` link. Only shows the input when clicked.

- **Notes** — collapsed behind a `+ Add notes or special requests` link. Only shows the textarea when clicked.

### A3: Submit

- "Request Appointment" button
- Below button: "Luis will confirm your appointment shortly. No commitment required."

**The ideal returning customer journey: enter phone → see everything pre-filled → pick a date → submit. Three interactions total.**

### A4: Add Another Vehicle

After submission, show the confirmation screen (see Confirmation section below) with an "Add another vehicle?" button. This is for households with multiple cars. Clicking it opens a shortened form: just vehicle (make/model/year) + service selection + date/time. Name, phone, and location carry over from the first booking.

---

## Path B — New Customer

Triggered when the phone number does not match any previous booking.

The phone number is already captured from the entry screen, so it does not appear again in the form. The progress bar appears here with three steps.

### B1: "What service do you need?" (Service Selection)

**Progress bar:** Step 1 of 3 — Service · Details · Vehicle

**Fields:**

- **Service Requested** (required) — Large tappable cards, not a dropdown. Each card shows:
  - Service name
  - Starting price
  - 1-line description
  - Options:
    - `Just a Wash` — Starting at $45. Quick exterior hand wash and tire shine.
    - `Standard Detail` — Starting at $75. Interior and exterior clean, inside and out.
    - `Full Detail` — Starting at $350. The complete package — wax, polish, engine bay, carpet shampoo.
    - `Not sure — help me choose` — Luis will recommend the right service for your vehicle.
  - Selecting a card highlights it. A "Next" button becomes active.

- **Vehicle Condition** (optional, multi-select) — Styled as tappable pills/tags, not checkboxes. Label: "Anything we should know?"
  - `Pet hair` · `Stains` · `Very dirty` · `Odor / smoke` · `Water spots` · `Tree sap / tar` · `Oxidized paint`

- **Notes** — collapsed behind `+ Add notes or special requests` link

### B2: "How do we reach you?" (Contact & Location)

**Progress bar:** Step 2 of 3

**Fields:**

- **Full Name** (required)
- **Email Address** (optional) — do not make this required. Many mobile users skip email. Do not lose a lead over it.
- **Service Location** (required) — helper text: "We come to you — enter your home, office, or wherever you want the detail done." Enable address autocomplete for mobile.

Phone number is NOT shown here — it was already collected on the entry screen. Display it as a small confirmed line at the top of this step: "Phone: (626) 555-1234 ✓" so the customer knows it's saved. Make it tappable to edit if they made a typo.

### B3: "Tell us about your vehicle" (Vehicle & Scheduling)

**Progress bar:** Step 3 of 3

**Fields:**

- **Vehicle Make** (required) — dropdown
- **Vehicle Model** (required) — dependent dropdown, populated after make is selected
- **Vehicle Year** (required) — dropdown

- **Preferred Date** (optional) — date picker
- **Available Times** (optional) — tappable pills, multi-select:
  - `Morning (8am–12pm)` · `Afternoon (12pm–5pm)` · `Evening (5pm–8pm)` · `Flexible`

- **Promo Code** — collapsed behind `Have a promo code?` link

- "Request Appointment" button
- Below button: "Luis will confirm your appointment shortly. No commitment required."

---

## Confirmation Screen (Both Paths)

Shown after successful submission for both returning and new customers.

**Layout:**

- Checkmark icon or animation
- Heading: "Request Received!"
- Subheading: "Luis Mobile Detail received your booking request and will confirm your appointment shortly."

- **Booking Summary** showing all submitted info:
  - Service requested
  - Vehicle (year, make, model)
  - Date and time preference
  - Service location
  - Contact info

- Payment note: "Payment accepted via cash or Zelle at time of service."
- Contact line: "Questions? Call or text Luis at 626-654-1924" (clickable)
- "Add another vehicle?" button — for households with multiple cars. Opens a shortened form: vehicle + service + date/time only. Name, phone, and location carry over.

---

## Data Storage for Returning Customer Lookup

Every completed booking should store the following fields associated with the phone number so they can be retrieved on the next visit:

- Phone (primary key for lookup)
- Full name
- Email (if provided)
- Service location
- Vehicle make, model, year
- Last service requested
- Last booking date

If a customer has booked multiple times with different vehicles, store all vehicles and show the most recent one as the default in the returning customer summary, with a "Switch vehicle" option to select a different one from their history.

---

## UI & Design Notes

- Keep the existing visual design, color scheme (blue primary), and typography. This is a flow restructure, not a visual redesign.
- The phone entry screen should feel minimal and inviting — centered on the page, lots of white space, one field. Not a dense form.
- Service cards should match the visual style of the pricing cards already on the page — distinct from form inputs.
- On mobile, service cards stack vertically. On desktop, they sit in a 2×2 grid or horizontal row.
- All touch targets minimum 44px height.
- Collapsed fields (Notes, Promo Code) use a subtle link style (`+ Add notes`) not a button.
- Condition pills/tags wrap naturally on mobile, no horizontal scroll.
- Progress bar only appears in the new customer flow (Path B). The returning customer flow (Path A) is a single scrollable screen, no steps.

---

## Validation Rules

- Phone number: validate 10-digit US format, strip to digits, store as E.164 (`+1XXXXXXXXXX`)
- Required fields Path A (returning): phone (entry screen), date or time selection encouraged but not blocked — Luis confirms by phone anyway
- Required fields Path B (new): phone (entry screen), service (B1), name + location (B2), make + model + year (B3)
- Inline error messages on fields, not alert boxes
- A partial submission with just phone + service + name is a usable lead even if they drop off before entering vehicle info

---

## Analytics Events

Track these to measure conversion and drop-off:

- `phone_entry_started` — user focuses the phone field
- `phone_entry_submitted` — user submits phone number
- `returning_customer_detected` — phone lookup matched a previous booking
- `returning_customer_submitted` — returning customer completed rebooking
- `returning_customer_changed_service` — returning customer switched to a different service than last time
- `new_customer_step1_completed` — new customer selected a service
- `new_customer_step2_completed` — new customer filled contact info
- `new_customer_step3_completed` — new customer submitted full form
- `promo_code_applied` — promo code entered and applied
- `additional_vehicle_added` — user clicked "Add another vehicle" after first submission

---

## Edge Cases

- **Phone lookup fails or is slow:** Do not block the form. After 2 seconds, fall through to the new customer flow. If the lookup returns later with a match, do not retroactively change the flow — just let them continue as a new customer. Their info will still be saved for next time.

- **Customer has multiple past bookings with different services:** Show the most recent service as the default selection on the returning customer summary. The other service options are still visible and selectable.

- **Customer has multiple vehicles on file:** Show the most recent vehicle as default. Add a "Switch vehicle" dropdown or link that shows their other vehicles. Include an "Add new vehicle" option in that dropdown.

- **Customer changed their address:** The location field on the returning customer summary is pre-filled but editable. No special handling needed.

- **Promo code is invalid:** Show inline error below the promo code field: "This code isn't valid. Check the code and try again." Do not clear the field — let them correct the typo.

- **Form is accessed via a direct link with a service pre-selected** (e.g., from clicking "Request This Service" on a pricing card): If the URL includes a service parameter, pre-select that service in Step B1 for new customers, or override the default service shown in the returning customer summary. The customer can still change it.
