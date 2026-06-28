const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

// In-memory attempt tracker: { business_id: { count, lockedAt } }
// Resets on cold start — fine for voice calls (short-lived serverless)
const attempts = {}
const MAX_ATTEMPTS = 3
const LOCK_MINUTES = 30

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))
  ])
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-vapi-secret')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (req.body?._warmup) return res.status(200).json({ ok: true })

  const vapiSecret = req.headers['x-vapi-secret']
  if (vapiSecret && vapiSecret !== process.env.VAPI_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const toolCallId = req.body?.message?.toolCallList?.[0]?.id
  const envelope = req.body?.message?.toolCallList?.[0]?.function?.arguments
  const args = envelope || req.body
  const { business_id, pin_attempt } = args

  const vapiResult = (data) => res.status(200).json({
    results: [{ toolCallId, result: JSON.stringify(data) }]
  })

  if (!business_id || !pin_attempt) {
    return vapiResult({ verified: false, error: 'Missing business_id or pin_attempt' })
  }

  // Check lock
  const state = attempts[business_id] || { count: 0, lockedAt: null }
  if (state.lockedAt) {
    const minutesElapsed = (Date.now() - state.lockedAt) / 60000
    if (minutesElapsed < LOCK_MINUTES) {
      return vapiResult({ verified: false, locked: true })
    }
    // Lock expired — reset
    attempts[business_id] = { count: 0, lockedAt: null }
  }

  try {
    const { data: biz, error } = await withTimeout(
      supabase
        .from('businesses')
        .select('voice_pin')
        .eq('id', business_id)
        .single(),
      5000
    )

    if (error || !biz) {
      return vapiResult({ verified: false, error: 'Business not found' })
    }

    const pinStr = String(pin_attempt).trim()
    if (biz.voice_pin && pinStr === biz.voice_pin) {
      // Correct — clear any attempt state
      delete attempts[business_id]
      return vapiResult({ verified: true })
    }

    // Wrong PIN
    const newCount = (attempts[business_id]?.count || 0) + 1
    if (newCount >= MAX_ATTEMPTS) {
      attempts[business_id] = { count: newCount, lockedAt: Date.now() }
      return vapiResult({ verified: false, locked: true, attempts_remaining: 0 })
    }

    attempts[business_id] = { count: newCount, lockedAt: null }
    return vapiResult({
      verified: false,
      locked: false,
      attempts_remaining: MAX_ATTEMPTS - newCount,
    })
  } catch (err) {
    console.error('verify-pin error:', err.message)
    return vapiResult({ verified: false, error: 'Service error' })
  }
}
