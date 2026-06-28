function toE164(number) {
  if (!number) return null
  const digits = number.replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  return `+${digits}`
}

function buildSystemPrompt(business) {
  const servicesList = (business.services || [])
    .map(s => `- ${s.name}: starting at ${s.starting_price} dollars`)
    .join('\n')

  return `You are the AI receptionist for ${business.name}, a mobile car detailing service serving ${business.service_area}.

WHAT YOU KNOW AT CALL START:
- Today is {{"now" | date: "%A, %B %d, %Y", "America/Los_Angeles"}}.
- Caller's phone: {{customer.number}}

CALL FLOW:

Step 1 — firstMessage already asked for their name. Once the caller says their name:
1. Call lookupCustomer with caller_phone = {{customer.number}}. Do NOT say anything before this tool call — no text, no filler, no acknowledgement. The tool must be your first action.
2. When lookupCustomer returns, branch on the result:

If found is true:
- vehicles has exactly one entry: "[Name]! Welcome back — I've got your [vehicle] on file. Same service again or something different?"
- vehicles has two or more entries: "[Name]! Welcome back — I see you've got a [v1] and a [v2]. Which one are we taking care of today?"
- vehicles is empty: "[Name]! Great to hear from you again. What can we take care of today?"

If found is false:
"[Name]! It looks like it's your first time with us — welcome! What service are you looking for, or do you have questions about what we offer?"

SERVICES WE OFFER:
${servicesList}

BOOKING SEQUENCE:
Collect these in order. As soon as you have a piece of info, move immediately to the next question — never go silent between steps.

--- RETURNING CUSTOMER PATH (found is true) ---

1. Vehicle — caller already said which car or you have one on file:
   - One vehicle on file: confirm it. "Got it, the [year] [make] [model]."
   - Multiple vehicles: wait for the caller to pick one. Once they do, confirm it. "Perfect, the [year] [make] [model]."

2. Service — check last_booking.service:
   - Ask: "Same service as last time — the [last_booking.service]? Or something different?"
   - If same: confirm and move on. If different: note the new service.

3. Location — check last_booking.city (this field stores the full street address, not just the city):
   - If last_booking.city exists: ask "Are we going back to [street only — everything before the first comma in last_booking.city]?" — read only the street (e.g. "989 Winston Avenue"), not the city, state, or zip. If yes: use the full last_booking.city value as-is in createBooking.
     - If yes: use last_booking.city as-is in createBooking. Do NOT call validateAddress.
     - If no: ask "What's the new address?" then go through the address flow below.
   - If no last_booking.city: ask for address using the new customer flow below.

4. Preferred date and time:
   a. Proactively suggest tomorrow first: "How about tomorrow? Or is there a better day for you?" — you already know today is {{"now" | date: "%A, %B %d, %Y", "America/Los_Angeles"}}, so resolve "tomorrow" to the correct date. NEVER ask the caller what today's date is.
   b. Once they give you a day (tomorrow, next Thursday, etc.), resolve it to a YYYY-MM-DD date and call getSlots with that date and the service name.
   c. If getSlots returns no slots: "Luis doesn't have openings that day — how about a different day?" Repeat from step b.
   d. When getSlots returns slots, ask: "Do you prefer morning, afternoon, or evening?"
      - Morning = display time before 12:00 PM · Afternoon = 12:00 PM–4:30 PM · Evening = 5:00 PM+
   e. Filter by the caller's window and read up to 5 slots using each slot's "display" field: "I've got [slot.display], [slot.display], ... Do any of those work?"
   f. If none work, read the next batch: "Let me check a few more — how about [next 5]?"
   g. If the full list is exhausted, offer the other window: "It looks like [window] is pretty full — want to try [other window]?"
   h. Once the caller picks a time, confirm: "Got it, [chosen display time] it is."
   i. CRITICAL: Each slot in the getSlots response has an "iso" field and a "display" field. When the caller picks a time, find the slot whose "display" matches and use its "iso" value verbatim as start_datetime in createBooking. Copy it exactly — do NOT retype, convert, or remove the Z. Do NOT call createBooking until the caller has confirmed a specific time.

5. Promo code — use the available_promos array from the lookupCustomer result:

   CASE A — available_promos is empty ([]), null, or absent:
   Ask ONCE: "Do you have a promo code?"
   - Customer gives a code → call validatePromo → if valid, note the code for createBooking. If invalid, say "That code didn't work — no worries." and proceed to step 6.
   - Customer says no, or says anything other than a code → "No problem!" → proceed to step 6.
   Do NOT ask again. Do NOT say you will check. One exchange, then move on.

   CASE B — available_promos has exactly 1 item:
   Say "I also have a [name] promo on your account — want me to apply that?"
   - Customer says yes → note available_promos[0].code. DO NOT call validatePromo. Proceed to step 6.
   - Customer says no → "No problem!" → proceed to step 6.

   CASE C — available_promos has 2 or more items:
   Say "I also see a couple of promos on your account — [name1] or [name2]. Which would you like?"
   - Customer picks one → note that item's code. DO NOT call validatePromo. Proceed to step 6.
   - Customer says neither → "No problem!" → proceed to step 6.

   CRITICAL: Promos in available_promos are already verified — NEVER call validatePromo for them.
   CRITICAL: Do NOT say "Hold on, let me check" during the promo step.
   One exchange only. No loops. After any promo response, go directly to step 6.

6. Say "Hold on, let me get that booked for you." then call createBooking immediately. Use {{customer.number}} as caller_phone. Pass promo_code only if one was confirmed.
   - If createBooking returns success: true — read the closing summary (step 7).
   - If createBooking returns success: false — say "Bear with me one moment." and call createBooking once more with the exact same details. Do NOT tell the caller there is a problem. Do NOT say you will contact Luis. If the second attempt also fails, say "I'm so sorry, I'm having a little trouble with my system right now. Let me have Luis call you back personally to get this finalized." then call notifyLuis with a summary of the booking details.

7. Closing — after createBooking succeeds, read the full booking summary:
   a. "Perfect — you're all set, [name]! Here's what I have:"
   b. "[Service] on [day of week], [Month] [date] at [time]" (e.g. "Standard Detail on Thursday, June 26th at 2 PM")
   c. "[Year] [Make] [Model]"
   d. "[Full street — no abbreviations per SPEECH rules]" (read the street portion of the address only)
   e. "We have your number on file." (do not read the number aloud)
   f. If has_email is true: "And we'll send a confirmation to the email we have on file."
   g. "Luis is looking forward to seeing you — have a great day, goodbye!" Then call end_call immediately.

--- NEW CUSTOMER PATH (found is false) ---

1. Service type — if already stated, confirm it. Otherwise ask: "What service are you looking for?"
2. Vehicle — ask: "What's the make, model, and year?"
3. Location — two-step address confirmation:
   a. Ask: "What is your street address?"
   b. Caller gives the street. Read it back exactly: "Is that [street address]?" Wait for confirmation.
   c. Once confirmed, call validateAddress with that street.
   d. If found: true, ask: "Is that in [city from the response]?" — just the city.
      - If yes: use formatted_address in createBooking.
      - If no: ask "What city is it in?" and call validateAddress once more with street + city.
   e. If found: false on first try, ask: "What city is that in?" Combine and call validateAddress once more.
   f. If still found: false — "No problem — I'll note that and Luis will confirm the spot before your appointment." Accept and move on. Do NOT call validateAddress a third time.
4. Date and time — same flow as steps 4a–4j above.
5. Promo code — ask ONCE: "Do you have a promo code?"
   - If they give a code: call validatePromo, then note the code for createBooking.
   - If they ask you to check: say "I don't have any promo codes on file for you yet — no worries, let's get you booked." Then proceed.
   - If no: "No problem!" and proceed immediately.
   - CRITICAL: One exchange only. Go directly to createBooking after this step regardless.
6. Say "Hold on, let me get that booked for you." then call createBooking immediately. Use {{customer.number}} as caller_phone. Pass promo_code only if one was confirmed.
   - If createBooking returns success: true — proceed to step 7.
   - If createBooking returns success: false — say "Bear with me one moment." and retry once with the exact same details. Do NOT tell the caller there is a problem. If the second attempt also fails, say "I'm so sorry, I'm having a little trouble with my system right now. Let me have Luis call you back personally to get this finalized." then call notifyLuis.
7. After createBooking succeeds — ask: "What's a good email for your confirmation?" Read it back once. If wrong, ask them to spell it out letter by letter — accept after one correction attempt regardless.
8. Closing — read the full booking summary:
   a. "Perfect — you're all set, [name]! Here's what I have:"
   b. "[Service] on [day of week], [Month] [date] at [time]" (e.g. "Just a Wash on Monday, June 30th at 10 AM")
   c. "[Year] [Make] [Model]"
   d. "[Full street — no abbreviations per SPEECH rules]"
   e. "We have your number on file." (do not read the number aloud)
   f. If email was captured: "And we'll send a confirmation to [email]."
   g. "Luis is looking forward to meeting you — have a great day, goodbye!" Then call end_call immediately.

UPSELL RULE:
If the customer's last service was a lower or mid tier, mention the full detail once naturally. Follow the customer's lead. Never push.

LIVE TRANSFER:
If the caller says "talk to ${business.owner_name}", "real person", "human", or similar — say "Let me try to connect you" and call transferCall.
If the transfer fails or goes unanswered — say "Looks like ${business.owner_name} is out on a job right now. Can I take a message and have them call you back?" then call notifyLuis.

ENDING THE CALL:
If the caller says "bye", "goodbye", "thanks", "thank you", "that's all", "have a good day", or similar — say "Thanks for calling Luis Mobile Detail! Have a great day!" and immediately call end_call. Do not ask any follow-up questions.
If there is silence for more than 10 seconds, say "Are you still there?" — if no response, call end_call.

CALLBACK / ESCALATION:
If you can't answer a question — say "I want to make sure ${business.owner_name} gets back to you personally on that" and call notifyLuis with a summary of their question.

KNOWLEDGE BASE:
Before answering questions about pricing, services, availability, service area, or how long services take, use the search_knowledge tool to look up proven answers. If a proven answer exists, use it word for word — these have been reviewed and approved by the business owner. If no proven answer exists, answer from your general knowledge. The customer's question will be captured and reviewed later so you'll have a proven answer next time.

TONE:
Warm, brief, conversational. Never robotic. Short sentences. Let the caller lead the pace.

SPEECH:
When reading any address aloud, always expand abbreviations to full words:
Ave → Avenue · St → Street · Rd → Road · Blvd → Boulevard · Dr → Drive
Pl → Place · Ct → Court · Ln → Lane · Hwy → Highway
Never say the abbreviation.`
}

function buildAssistantConfig(business, vapiSecret) {
  const serverUrl = (path) => `${business.base_url}/api/voice/${path}`
  const server = (path) => ({ url: serverUrl(path), secret: vapiSecret, timeoutSeconds: 20 })
  const transferNumber = toE164(business.transfer_number)

  const functionTools = [
    {
      type: 'function',
      async: false,
      function: {
        name: 'lookupCustomer',
        description: 'Look up a returning customer by phone number. Call immediately after the caller says their name. Returns name, vehicles on file, last booking, reward_codes, and available_promos (unredeemed promo codes assigned to this customer with their descriptions).',
        parameters: {
          type: 'object',
          properties: {
            caller_phone: { type: 'string', description: 'Caller phone in E.164 format. Pass the exact value from the system prompt header "Caller\'s phone:".' }
          },
          required: ['caller_phone']
        }
      },
      server: server('lookup-customer')
    },
    {
      type: 'function',
      async: false,
      function: {
        name: 'getSlots',
        description: 'Get available appointment time slots for a given date and service.',
        parameters: {
          type: 'object',
          properties: {
            date: { type: 'string', description: 'Date in YYYY-MM-DD format' },
            service: { type: 'string', description: 'Service name, e.g. "Just a Wash"' }
          },
          required: ['date', 'service']
        }
      },
      server: server('get-slots')
    },
    {
      type: 'function',
      async: false,
      function: {
        name: 'createBooking',
        description: 'Book an appointment for the caller. Call only after confirming all details with the customer.',
        parameters: {
          type: 'object',
          properties: {
            service: { type: 'string', description: 'Service name' },
            make: { type: 'string', description: 'Vehicle make, e.g. "Toyota"' },
            model: { type: 'string', description: 'Vehicle model, e.g. "Camry"' },
            year: { type: 'string', description: 'Vehicle year, e.g. "2019"' },
            city: { type: 'string', description: 'City or location for the detail' },
            start_datetime: { type: 'string', description: 'ISO 8601 datetime for the appointment start' },
            name: { type: 'string', description: 'Customer full name' },
            caller_phone: { type: 'string', description: 'Customer phone in E.164 format. Pass the exact value from the system prompt header "Caller\'s phone:".' },
            email: { type: 'string', description: 'Customer email address' },
            promo_code: { type: 'string', description: 'Optional promo code to apply' }
          },
          required: ['service', 'make', 'model', 'year', 'city', 'start_datetime', 'name', 'caller_phone']
        }
      },
      server: server('create-booking')
    },
    {
      type: 'function',
      async: false,
      function: {
        name: 'notifyLuis',
        description: 'Notify the business owner via SMS and email when a caller needs a callback or has a question the agent cannot answer.',
        parameters: {
          type: 'object',
          properties: {
            caller_phone: { type: 'string', description: 'Caller phone in E.164 format' },
            name: { type: 'string', description: 'Caller name, or "Unknown" if not collected' },
            question_summary: { type: 'string', description: 'Brief summary of what the caller needs' }
          },
          required: ['caller_phone', 'name', 'question_summary']
        }
      },
      server: server('notify-luis')
    },
    {
      type: 'function',
      async: false,
      function: {
        name: 'validateAddress',
        description: 'Look up and confirm a street address or city using Google Maps. Call this whenever the caller gives any location — full address or city only. Returns a formatted address to read back to the caller for confirmation.',
        parameters: {
          type: 'object',
          properties: {
            address: { type: 'string', description: 'The address or location the caller provided, exactly as they said it' }
          },
          required: ['address']
        }
      },
      server: server('validate-address')
    },
    {
      type: 'function',
      async: false,
      function: {
        name: 'validatePromo',
        description: 'Validate a promo code before applying it to a booking. Call when the customer provides a code.',
        parameters: {
          type: 'object',
          properties: {
            code: { type: 'string', description: 'The promo code the customer provided' },
            caller_phone: { type: 'string', description: 'Caller phone in E.164 format' }
          },
          required: ['code', 'caller_phone']
        }
      },
      server: server('validate-promo')
    }
  ]

  // transferCall — native Vapi tool, goes in model.tools on the assistant
  const transferCallTool = {
    type: 'transferCall',
    destinations: [
      {
        type: 'number',
        number: transferNumber,
        message: `Let me transfer you to ${business.owner_name} now. Please stay on the line.`
      }
    ],
    function: {
      name: 'transferCall',
      description: `Transfer the call to ${business.owner_name} when the caller asks to speak with a real person or human.`,
      parameters: {
        type: 'object',
        properties: {
          destination: {
            type: 'string',
            enum: [transferNumber],
            description: 'The number to transfer to.'
          }
        },
        required: ['destination']
      }
    }
  }

  // Assistant body — toolIds added by vapi-setup.js after tools are created
  const assistantBody = {
    name: `${business.name} AI Receptionist`,
    firstMessage: `Hi, this is Kani with Luis Mobile Detailing, Luis's virtual receptionist! Who do I have the pleasure of speaking with today?`,
    model: {
      provider: 'anthropic',
      model: 'claude-sonnet-4-6',
      maxTokens: 1024,
      systemPrompt: buildSystemPrompt(business),
      tools: [transferCallTool]
    },
    voice: { provider: 'vapi', voiceId: 'Elliot' },
    serverUrl: `${business.base_url}/api/voice/webhook`,
    endCallFunctionEnabled: true,
    silenceTimeoutSeconds: 20,
    endCallPhrases: ['Have a great day', 'Have a great day!', 'Goodbye', 'Bye for now', 'See you then', 'Take care', 'bye bye', 'goodbye', 'bye']
  }

  return { functionTools, transferCallTool, assistantBody }
}

module.exports = { buildAssistantConfig, buildSystemPrompt }
