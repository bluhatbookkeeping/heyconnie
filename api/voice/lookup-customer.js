const { createClient } = require('@supabase/supabase-js')
const { resolveBusiness } = require('../utils/resolve-business')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

function describeDiscount(p) {
  if (!p) return ''
  if (p.discount_type === 'percent') return `${p.discount_value}% off`
  if (p.discount_type === 'fixed') return `$${p.discount_value} off`
  return p.name || ''
}

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

  const { id: BUSINESS_ID } = await resolveBusiness(req)
  const normalized = resolvedPhone.replace(/\D/g, '')

  try {
    const { data: customer, error: customerError } = await withTimeout(
      supabase
        .from('customers')
        .select('id, name, email')
        .eq('business_id', BUSINESS_ID)
        .filter('phone', 'ilike', `%${normalized.slice(-10)}%`)
        .maybeSingle(),
      5000
    )

    if (customerError || !customer) return vapiResult({ found: false })

    const [{ data: lastBooking }, { data: vehicles }, { data: intel }, { data: promoCodes }] = await Promise.all([
      supabase
        .from('bookings')
        .select('service, make, model, year, start_datetime, status, city')
        .eq('business_id', BUSINESS_ID)
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('vehicles')
        .select('make, model, year')
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false })
        .limit(3),
      supabase
        .from('customer_intel')
        .select('preferences, upsell_opportunities')
        .eq('customer_id', customer.id)
        .maybeSingle(),
      supabase
        .from('promo_codes')
        .select('code, promotions(name, discount_type, discount_value)')
        .eq('customer_id', customer.id)
        .eq('business_id', BUSINESS_ID)
        .eq('redeemed', false)
        .eq('expired', false)
        .limit(5),
    ])

    return vapiResult({
      found: true,
      customer_id: customer.id,
      name: customer.name,
      has_email: !!customer.email,
      last_booking: lastBooking || null,
      vehicles: vehicles || [],
      preferences: intel?.preferences || null,
      upsell_opportunities: intel?.upsell_opportunities || null,
      available_promos: (promoCodes || []).map(r => ({
        code: r.code,
        name: r.promotions?.name || 'Promo',
        description: describeDiscount(r.promotions),
      })),
    })
  } catch (err) {
    // Never hang — Vapi waits the full timeoutSeconds if we don't respond
    console.error('lookup-customer error:', err.message)
    return vapiResult({ found: false })
  }
}
