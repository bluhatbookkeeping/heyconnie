const { createClient } = require('@supabase/supabase-js')
const { resolveBusiness } = require('../utils/resolve-business')

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

  // Require auth only when the header is present (Vapi calls); public web form calls omit it
  const vapiSecret = req.headers['x-vapi-secret']
  if (vapiSecret && vapiSecret !== process.env.VAPI_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const toolCallId = req.body?.message?.toolCallList?.[0]?.id
  const args = req.body?.message?.toolCallList?.[0]?.function?.arguments || req.body
  const { code, business_id, caller_phone, service } = args
  const { id: resolvedId } = await resolveBusiness(req)
  const bizId = business_id || resolvedId
  const vapiResult = (data) => res.status(200).json({ results: [{ toolCallId, result: JSON.stringify(data) }] })

  if (!code || !caller_phone) {
    return res.status(400).json({ valid: false, reason: 'Missing code or caller_phone' })
  }

  // Strip spaces so "SUMMER 10" and "SUMMER10" both match
  const normalizedCode = code.trim().toUpperCase().replace(/\s+/g, '')
  const today = new Date().toISOString().slice(0, 10)

  // Try unique promo_code first
  const { data: promoCode } = await supabase
    .from('promo_codes')
    .select('id, promotion_id, customer_id, redeemed, redeemed_by_phone')
    .eq('business_id', bizId)
    .eq('code', normalizedCode)
    .maybeSingle()

  let promotion = null
  let promoCodeId = null

  if (promoCode) {
    if (promoCode.redeemed) {
      return vapiResult({ valid: false, reason: 'This code has already been used.' })
    }

    // If tied to a specific customer, verify phone matches
    if (promoCode.customer_id) {
      const { data: customer } = await supabase
        .from('customers')
        .select('phone')
        .eq('id', promoCode.customer_id)
        .maybeSingle()

      if (customer) {
        const storedLast10 = customer.phone.replace(/\D/g, '').slice(-10)
        const callerLast10 = caller_phone.replace(/\D/g, '').slice(-10)
        if (storedLast10 !== callerLast10) {
          return vapiResult({ valid: false, reason: 'This code is assigned to a different customer.' })
        }
      }
    }

    const { data: promo } = await supabase
      .from('promotions')
      .select('*')
      .eq('id', promoCode.promotion_id)
      .maybeSingle()

    promotion = promo
    promoCodeId = promoCode.id
  } else {
    // Try shared code — compare space-stripped so "SUMMER 10" matches "SUMMER10"
    const { data: sharedPromos } = await supabase
      .from('promotions')
      .select('*')
      .eq('business_id', bizId)
      .eq('code_type', 'shared')

    promotion = (sharedPromos || []).find(p =>
      p.shared_code?.replace(/\s+/g, '').toUpperCase() === normalizedCode
    ) || null
  }

  if (!promotion) {
    return vapiResult({ valid: false, reason: 'Code not found.' })
  }

  if (!promotion.active) {
    return vapiResult({ valid: false, reason: 'This promotion is no longer active.' })
  }

  if (promotion.valid_from && today < promotion.valid_from) {
    return vapiResult({ valid: false, reason: 'This promotion has not started yet.' })
  }

  if (promotion.valid_until && today > promotion.valid_until) {
    return vapiResult({ valid: false, reason: 'This promotion has expired.' })
  }

  if (promotion.max_total_uses !== null && promotion.total_uses >= promotion.max_total_uses) {
    return vapiResult({ valid: false, reason: 'This promotion has reached its maximum uses.' })
  }

  if (service && promotion.applicable_services && promotion.applicable_services.length) {
    const match = promotion.applicable_services.some(s => s.toLowerCase() === service.trim().toLowerCase())
    if (!match) {
      return vapiResult({ valid: false, reason: `This code is only valid for: ${promotion.applicable_services.join(', ')}.` })
    }
  }

  // One-time-per-customer check
  if (promotion.one_time_per_customer) {
    const callerLast10 = caller_phone.replace(/\D/g, '').slice(-10)
    const { data: prior } = await supabase
      .from('promo_redemptions')
      .select('id')
      .eq('promotion_id', promotion.id)
      .ilike('customer_phone', `%${callerLast10}`)
      .maybeSingle()

    if (prior) {
      return vapiResult({ valid: false, reason: 'You have already used this promotion.' })
    }
  }

  return vapiResult({
    valid: true,
    promotion_id: promotion.id,
    promo_code_id: promoCodeId,
    discount_type: promotion.discount_type,
    discount_value: promotion.discount_value,
    code: normalizedCode,
  })
}
