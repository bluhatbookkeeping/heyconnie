const Anthropic = require('@anthropic-ai/sdk')
const { createClient } = require('@supabase/supabase-js')
const { processCallEnded } = require('./call-ended')

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
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

// Extraction prompt is static — eligible for prompt caching
const EXTRACTION_SYSTEM = `You are a call analysis engine for a mobile car detailing business.
Given a call transcript, extract structured intelligence and return ONLY valid JSON with these fields:
{
  "preferences": "string — scheduling preferences, service preferences, communication style (null if none found)",
  "objections": "string — price concerns, doubts, hesitations expressed (null if none found)",
  "unanswered_questions": "string — questions the agent couldn't answer (null if none found)",
  "upsell_opportunities": "string — signals for additional services, e.g. pet hair, frequent washing, multiple vehicles (null if none found)",
  "script_suggestions": ["array of strings — specific gaps or improvements for the voice agent script"]
}
Be concise. Null fields are better than invented content.`

async function analyzeTranscript(transcript, vapiCallId) {
  if (!transcript || transcript.trim().length < 50) return null

  let response
  try {
    response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: [
        {
          type: 'text',
          text: EXTRACTION_SYSTEM,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [
        {
          role: 'user',
          content: `Analyze this call transcript:\n\n${transcript}`,
        },
      ],
    })
  } catch (err) {
    console.error(`[webhook] Claude extraction failed for ${vapiCallId}:`, err)
    return null
  }

  try {
    return JSON.parse(response.content[0]?.text || 'null')
  } catch {
    console.error(`[webhook] Failed to parse Claude JSON for ${vapiCallId}`)
    return null
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-vapi-secret')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  if (req.headers['x-vapi-secret'] !== process.env.VAPI_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const event = req.body
  const eventType = event?.message?.type || event?.type

  // Inject date + customer context before the agent speaks
  if (eventType === 'assistant-request') {
    const callerPhone = event.message?.call?.customer?.number
                     || event.call?.customer?.number
                     || null

    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(new Date())
    const dayOfWeek = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', weekday: 'long' }).format(new Date())

    const variableValues = {
      today,
      day_of_week: dayOfWeek,
      caller_phone: callerPhone || '',
      caller_name: '',
      is_returning: 'false',
      vehicles: '',
    }

    // Resolve business from the assistant we're about to return
    const businessId = await resolveBusinessId(process.env.VAPI_ASSISTANT_ID)

    if (callerPhone) {
      try {
        const normalized = callerPhone.replace(/\D/g, '').slice(-10)
        const { data: customer } = await supabase
          .from('customers')
          .select('id, name')
          .eq('business_id', businessId)
          .filter('phone', 'ilike', `%${normalized}%`)
          .maybeSingle()

        if (customer) {
          const { data: vehicleRows } = await supabase
            .from('vehicles')
            .select('make, model, year')
            .eq('customer_id', customer.id)
            .order('created_at', { ascending: false })
            .limit(3)

          variableValues.caller_name = customer.name || ''
          variableValues.is_returning = 'true'
          variableValues.vehicles = (vehicleRows || [])
            .map(v => `${v.year} ${v.make} ${v.model}`).join(', ')
        }
      } catch (err) {
        console.error('[webhook] assistant-request lookup error:', err.message)
      }
    }

    return res.status(200).json({
      assistantId: process.env.VAPI_ASSISTANT_ID,
      assistantOverrides: { variableValues },
    })
  }

  // Vapi sends various lifecycle events — only act on call-ended
  if (eventType !== 'end-of-call-report') {
    return res.status(200).json({ received: true })
  }

  const call = event.message || event
  const callAssistantId = call.call?.assistantId || event.message?.call?.assistantId
  const BUSINESS_ID = await resolveBusinessId(callAssistantId)

  const vapiCallId = call.call?.id || call.callId || call.id
  const callerPhone = call.call?.customer?.number || call.customer?.number || null
  const transcript = call.transcript || null
  const durationSeconds = call.durationSeconds || call.call?.endedAt
    ? Math.round((new Date(call.call?.endedAt) - new Date(call.call?.startedAt)) / 1000)
    : null
  const endedReason = call.endedReason || call.call?.endedReason || 'unknown'

  // Map Vapi ended reasons to our outcome vocabulary
  let outcome = 'completed'
  if (endedReason === 'customer-did-not-answer' || endedReason === 'voicemail') {
    outcome = 'no-answer'
  } else if (endedReason === 'customer-ended-call' && durationSeconds !== null && durationSeconds < 10) {
    outcome = 'abandoned'
  } else if (endedReason === 'assistant-error' || endedReason === 'pipeline-error') {
    outcome = 'error'
  }

  // Look up customer_id if we have a phone number
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
  }

  // Write call_logs row
  const { data: callLog, error: logError } = await supabase
    .from('call_logs')
    .upsert(
      {
        vapi_call_id: vapiCallId,
        business_id: BUSINESS_ID,
        caller_phone: callerPhone,
        customer_id: customerId,
        outcome,
        duration_seconds: durationSeconds,
        transcript,
      },
      { onConflict: 'vapi_call_id' }
    )
    .select('id')
    .maybeSingle()

  if (logError) {
    console.error('[webhook] call_logs upsert error:', logError)
    // Still return 200 so Vapi doesn't retry
    return res.status(200).json({ received: true, error: 'log_failed' })
  }

  const callLogId = callLog?.id

  // Extract Q&A exchanges — must complete before responding (Vercel kills after res.send)
  await processCallEnded(event, BUSINESS_ID).catch(err => {
    console.error('[webhook] processCallEnded error:', err)
  })

  res.status(200).json({ received: true, call_log_id: callLogId })

  if (!transcript || !customerId) return

  const intel = await analyzeTranscript(transcript, vapiCallId)
  if (!intel) return

  const { preferences, objections, unanswered_questions, upsell_opportunities, script_suggestions } = intel

  // Upsert customer_intel
  await supabase
    .from('customer_intel')
    .upsert(
      {
        business_id: BUSINESS_ID,
        customer_id: customerId,
        preferences,
        objections,
        unanswered_questions,
        upsell_opportunities,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'customer_id' }
    )
    .then(({ error }) => {
      if (error) console.error('[webhook] customer_intel upsert error:', error)
    })

  // Insert script_suggestions (one row per suggestion)
  if (Array.isArray(script_suggestions) && script_suggestions.length > 0 && callLogId) {
    const rows = script_suggestions.map(suggestion => ({
      business_id: BUSINESS_ID,
      call_log_id: callLogId,
      suggestion,
    }))
    await supabase
      .from('script_suggestions')
      .insert(rows)
      .then(({ error }) => {
        if (error) console.error('[webhook] script_suggestions insert error:', error)
      })
  }
}
