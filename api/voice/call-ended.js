const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

async function resolveBusinessId(assistantId) {
  if (!assistantId) return 'luis-mobile-detail'
  const { data: biz } = await supabase
    .from('businesses')
    .select('id')
    .eq('vapi_assistant_id', assistantId)
    .maybeSingle()
  return biz?.id || 'luis-mobile-detail'
}

// Booking-flow turns to skip — not knowledge worth reviewing
const BOOKING_SKIP_PATTERNS = [
  /^(yes|yeah|yep|yup|no|nope|sure|ok|okay|sounds good|perfect|great|thanks|thank you|bye|goodbye|hello|hi|got it|alright|right)\.?$/i,
  /\b(my name is|i'm calling|i am calling)\b/i,
  /\b(my (phone|number|email) is)\b/i,
  /\b(same (car|vehicle|location|address|service|spot|place))\b/i,
  /\b(that (works|sounds|is) (good|great|fine|perfect))\b/i,
  /\b(can you (repeat|say that|confirm)|did (i|you) say)\b/i,
]

// Real question signals — must have at least one
const QUESTION_SIGNALS = [
  /\?/,
  /\b(how much|what does|what is|what are|do you (do|offer|come|serve|handle|take|accept|work)|can you (do|come|help)|when (do|can|will|are|is)|where (do|are|is|can)|how long|how far|is there|are there|do you guys)\b/i,
]

function categorizeTopic(text) {
  const t = text.toLowerCase()
  if (/\b(price|pricing|cost|how much|fee|charge|dollar|\$|rate|quote)\b/.test(t)) return 'pricing'
  if (/\b(service|detail|wash|ceramic|interior|exterior|wax|polish|clay|buff|coat|clean|shampoo|tire|rim|window)\b/.test(t)) return 'services'
  if (/\b(schedule|book|available|availability|when|time|date|day|appointment|slot|open|hour|weekend|weekday)\b/.test(t)) return 'scheduling'
  if (/\b(area|city|come to|travel|drive|where|location|far|mile|pasadena|alhambra|arcadia|el monte|west covina|pomona|glendale|monrovia|temple city|rosemead|san gabriel|baldwin park|covina|azusa|glendora|la puente|duarte|irwindale|san marino|san dimas)\b/.test(t)) return 'location'
  return 'other'
}

// Parse transcript into [{speaker, text}] turns
function parseTurns(transcript) {
  if (!transcript) return []

  const turns = []
  let currentSpeaker = null
  let currentLines = []

  for (const raw of transcript.split('\n')) {
    const line = raw.trim()
    if (!line) continue

    const userMatch = line.match(/^(User|Customer|Human):\s*(.*)/i)
    const aiMatch = line.match(/^(AI|Assistant|Agent|Bot|Connie):\s*(.*)/i)

    if (userMatch) {
      if (currentSpeaker && currentLines.length) {
        turns.push({ speaker: currentSpeaker, text: currentLines.join(' ').trim() })
      }
      currentSpeaker = 'user'
      currentLines = [userMatch[2]]
    } else if (aiMatch) {
      if (currentSpeaker && currentLines.length) {
        turns.push({ speaker: currentSpeaker, text: currentLines.join(' ').trim() })
      }
      currentSpeaker = 'ai'
      currentLines = [aiMatch[2]]
    } else if (currentSpeaker) {
      currentLines.push(line)
    }
  }

  if (currentSpeaker && currentLines.length) {
    turns.push({ speaker: currentSpeaker, text: currentLines.join(' ').trim() })
  }

  return turns
}

// Extract reviewable Q&A exchanges from transcript
function extractExchanges(transcript, businessId) {
  const turns = parseTurns(transcript)
  const exchanges = []

  for (let i = 0; i < turns.length - 1; i++) {
    const curr = turns[i]
    const next = turns[i + 1]

    if (curr.speaker !== 'user' || next.speaker !== 'ai') continue

    const question = curr.text
    const response = next.text

    // Skip very short customer turns
    if (question.split(/\s+/).length < 4) continue

    // Skip booking flow patterns
    if (BOOKING_SKIP_PATTERNS.some(p => p.test(question))) continue

    // Must look like a real question
    if (!QUESTION_SIGNALS.some(p => p.test(question))) continue

    const topic = categorizeTopic(question + ' ' + response)

    exchanges.push({
      business_id: businessId,
      customer_question: question,
      agent_response: response,
      topic,
      status: 'pending_review',
    })
  }

  return exchanges
}

// Determine call outcome from transcript content
function determineOutcome(transcript) {
  if (!transcript) return 'question_answered'
  const t = transcript.toLowerCase()

  if (
    t.includes("you're all set") ||
    t.includes("you are all set") ||
    t.includes("all booked") ||
    t.includes("got you booked") ||
    t.includes("booking is confirmed") ||
    t.includes("luis is looking forward") ||
    t.includes("see you on")
  ) return 'booking_made'

  if (
    t.includes('transferring') ||
    t.includes('connect you with') ||
    t.includes('forwarding your call') ||
    t.includes('transfer you')
  ) return 'transferred'

  return 'question_answered'
}

// Core processing — called by both the standalone handler and webhook.js
// businessId is resolved by the caller when known (webhook.js); fallback to assistantId lookup
async function processCallEnded(payload, businessId) {
  const msg = payload.message || payload
  const call = msg.call || {}

  if (!businessId) {
    const assistantId = call.assistantId || msg.call?.assistantId || null
    businessId = await resolveBusinessId(assistantId)
  }

  const BUSINESS_ID = businessId

  const vapiCallId = call.id || msg.callId || null
  const callerPhone = call.customer?.number || null
  const transcript = msg.transcript || null
  const recordingUrl = msg.recordingUrl || call.recordingUrl || null
  const startedAt = call.startedAt || null
  const endedAt = call.endedAt || null

  const durationSeconds = startedAt && endedAt
    ? Math.round((new Date(endedAt) - new Date(startedAt)) / 1000)
    : null

  console.log(`[call-ended] vapiCallId=${vapiCallId} phone=${callerPhone} duration=${durationSeconds}s`)

  const outcome = determineOutcome(transcript)
  console.log(`[call-ended] outcome=${outcome}`)

  // Look up customer by phone
  let customerId = null
  if (callerPhone) {
    const normalized = callerPhone.replace(/\D/g, '').slice(-10)
    const { data: customer } = await supabase
      .from('customers')
      .select('id')
      .eq('business_id', BUSINESS_ID)
      .filter('phone', 'ilike', `%${normalized}%`)
      .maybeSingle()
    customerId = customer?.id || null
    console.log(`[call-ended] customer_id=${customerId}`)
  }

  // Extract Q&A exchanges
  const exchanges = extractExchanges(transcript, BUSINESS_ID)
  console.log(`[call-ended] extracted ${exchanges.length} exchanges`)

  // Upsert call_logs — preserves existing fields written by webhook.js
  const { data: callLog, error: logError } = await supabase
    .from('call_logs')
    .upsert(
      {
        vapi_call_id: vapiCallId,
        business_id: BUSINESS_ID,
        caller_phone: callerPhone,
        customer_id: customerId,
        started_at: startedAt,
        ended_at: endedAt,
        duration_seconds: durationSeconds,
        transcript,
        recording_url: recordingUrl,
        outcome,
        exchange_count: exchanges.length,
      },
      { onConflict: 'vapi_call_id' }
    )
    .select('id')
    .maybeSingle()

  if (logError) {
    console.error('[call-ended] call_logs upsert error:', logError)
    return { error: 'log_failed', callLogId: null, exchangeCount: 0 }
  }

  const callLogId = callLog?.id
  console.log(`[call-ended] call_log id=${callLogId}`)

  // Insert exchanges
  if (exchanges.length > 0 && callLogId) {
    const rows = exchanges.map(e => ({ ...e, call_id: callLogId }))
    const { error: exchError } = await supabase
      .from('call_exchanges')
      .insert(rows)
    if (exchError) {
      console.error('[call-ended] call_exchanges insert error:', exchError)
    } else {
      console.log(`[call-ended] inserted ${rows.length} exchanges for call ${callLogId}`)
    }
  }

  return { callLogId, exchangeCount: exchanges.length }
}

// Standalone Vercel endpoint — usable if Vapi serverUrl is pointed here directly
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-vapi-secret')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  if (process.env.VAPI_SECRET && req.headers['x-vapi-secret'] !== process.env.VAPI_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const eventType = req.body?.message?.type || req.body?.type
  console.log(`[call-ended] received event: ${eventType}`)

  if (eventType !== 'end-of-call-report') {
    return res.status(200).json({ received: true })
  }

  // Respond immediately — Vapi retries on non-200
  res.status(200).json({ received: true })

  // Process fire-and-forget after response
  processCallEnded(req.body).catch(err => {
    console.error('[call-ended] processCallEnded error:', err)
  })
}

// Export core function so webhook.js can import it without HTTP overhead
module.exports.processCallEnded = processCallEnded
