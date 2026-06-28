const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

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

  // Only act on call-ended reports
  if (eventType !== 'end-of-call-report') {
    return res.status(200).json({ received: true })
  }

  const call = event.message || event
  const vapiCallId  = call.call?.id || call.callId || call.id
  const callerPhone = call.call?.customer?.number || call.customer?.number || null
  const transcript  = call.transcript || null

  if (!callerPhone) {
    console.warn('[setup-call-ended] No caller phone in payload — skipping')
    return res.status(200).json({ received: true })
  }

  if (!transcript || transcript.trim().length < 50) {
    console.warn('[setup-call-ended] Transcript too short or missing — skipping', vapiCallId)
    return res.status(200).json({ received: true })
  }

  // ── Determine which business this call belongs to ──────────────────

  const normalized = callerPhone.replace(/\D/g, '').slice(-10)

  // 1. Check business_profiles for a matching owner_phone
  const { data: profile, error: profileErr } = await supabase
    .from('business_profiles')
    .select('business_id, profile_status')
    .filter('owner_phone', 'ilike', `%${normalized}%`)
    .maybeSingle()

  if (profileErr) {
    console.error('[setup-call-ended] business_profiles lookup error:', profileErr)
  }

  let businessId = null
  let callType   = 'initial_setup'

  if (profile) {
    businessId = profile.business_id
    // Treat as update if the profile is already past draft
    if (profile.profile_status === 'active' || profile.profile_status === 'review') {
      callType = 'profile_update'
    }
  } else {
    // 2. No profile match — fall back to businesses.owner_phone (the owner's personal
    //    cell registered when Andrew created their businesses row).
    const { data: biz, error: bizErr } = await supabase
      .from('businesses')
      .select('id')
      .filter('owner_phone', 'ilike', `%${normalized}%`)
      .maybeSingle()

    if (bizErr) {
      console.error('[setup-call-ended] businesses lookup error:', bizErr)
    }

    if (biz) {
      businessId = biz.id
      callType   = 'initial_setup'
    } else {
      console.warn('[setup-call-ended] Could not resolve business for caller', normalized, '— skipping')
      return res.status(200).json({ received: true, matched: false })
    }
  }

  // ── Forward to process-onboarding ─────────────────────────────────

  try {
    const processUrl = new URL('/api/voice/process-onboarding', `https://${req.headers.host}`).toString()

    const processRes = await fetch(processUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-vapi-secret': process.env.VAPI_SECRET,
      },
      body: JSON.stringify({
        business_id:   businessId,
        vapi_call_id:  vapiCallId,
        transcript,
        call_type:     callType,
      }),
    })

    const processJson = await processRes.json().catch(() => ({}))

    if (!processRes.ok) {
      console.error('[setup-call-ended] process-onboarding returned', processRes.status, processJson)
    } else {
      console.log('[setup-call-ended] processed', { businessId, callType, vapiCallId })
    }
  } catch (err) {
    console.error('[setup-call-ended] fetch to process-onboarding failed:', err.message)
  }

  return res.status(200).json({ received: true, business_id: businessId, call_type: callType })
}
