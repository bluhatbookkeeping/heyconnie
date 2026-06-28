const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

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
  const { caller_phone } = args

  // Prefer the phone from the Vapi call payload (always reliable) over model-supplied arg
  const vapiPhone = req.body?.message?.call?.customer?.number || req.body?.call?.customer?.number
  const resolvedPhone = vapiPhone || caller_phone

  const vapiResult = (data) => res.status(200).json({
    results: [{ toolCallId, result: JSON.stringify(data) }]
  })

  if (!resolvedPhone) return vapiResult({ found: false })

  const normalized = resolvedPhone.replace(/\D/g, '')

  try {
    const { data: profile, error } = await withTimeout(
      supabase
        .from('business_profiles')
        .select('business_id, business_name, owner_name, services, service_area, hours, policies, faq_seeds, tone, profile_status')
        .filter('owner_phone', 'ilike', `%${normalized.slice(-10)}%`)
        .maybeSingle(),
      5000
    )

    if (error) throw error

    if (profile) {
      // Fetch voice_pin from businesses table
      const { data: biz } = await withTimeout(
        supabase.from('businesses').select('voice_pin').eq('id', profile.business_id).single(),
        5000
      )
      const services = (profile.services || []).map(s => s.name).filter(Boolean)
      const cities = profile.service_area?.cities || []
      return vapiResult({
        found: true,
        business_id: profile.business_id,
        business_name: profile.business_name,
        owner_name: profile.owner_name,
        has_pin: !!(biz?.voice_pin),
        profile_status: profile.profile_status,
        has_services: services.length > 0,
        has_cities: cities.length > 0,
        has_hours: !!(profile.hours && Object.keys(profile.hours).length > 0),
        has_policies: !!(profile.policies && Object.keys(profile.policies).length > 0),
        has_faqs: Array.isArray(profile.faq_seeds) && profile.faq_seeds.length > 0,
        has_tone: !!(profile.tone && Object.keys(profile.tone).length > 0),
        services,
        cities,
      })
    }

    // No business_profiles row yet — first-time caller. Try businesses.owner_phone
    // so the setup agent can at least greet them and know which business to create for.
    const { data: biz, error: bizErr } = await withTimeout(
      supabase
        .from('businesses')
        .select('id, name, owner_name, voice_pin')
        .filter('owner_phone', 'ilike', `%${normalized.slice(-10)}%`)
        .maybeSingle(),
      5000
    )

    if (bizErr) throw bizErr

    if (biz) {
      return vapiResult({
        found: false,
        business_id: biz.id,
        business_name: biz.name,
        owner_name: biz.owner_name,
        has_pin: !!(biz.voice_pin),
        profile_status: 'none',
      })
    }

    return vapiResult({ found: false })
  } catch (err) {
    console.error('lookup-business error:', err.message)
    return vapiResult({ found: false })
  }
}
