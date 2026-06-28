const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const BUSINESS_ID = 'luis-mobile-detail'

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { phone, email } = req.query
  if (!phone && !email) return res.status(400).json({ error: 'phone or email required' })

  let customer = null

  // Try phone first
  if (phone) {
    const digits = phone.replace(/\D/g, '').slice(-10)
    if (digits.length === 10) {
      const { data } = await supabase
        .from('customers')
        .select('id, name, email')
        .eq('business_id', BUSINESS_ID)
        .filter('phone', 'ilike', `%${digits}%`)
        .maybeSingle()
      customer = data
    }
  }

  // Fallback to email lookup
  if (!customer && email) {
    const { data } = await supabase
      .from('customers')
      .select('id, name, email')
      .eq('business_id', BUSINESS_ID)
      .ilike('email', email.trim())
      .maybeSingle()
    customer = data
  }

  if (!customer) {
    return res.status(200).json({ found: false })
  }

  const [bookingResult, vehiclesResult, rewardCodesResult, allPromoCodesResult] = await Promise.all([
    supabase
      .from('bookings')
      .select('service, make, model, year, city')
      .eq('business_id', BUSINESS_ID)
      .eq('customer_id', customer.id)
      .not('status', 'eq', 'cancelled')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),

    supabase
      .from('vehicles')
      .select('id, make, model, year')
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false })
      .limit(5),

    supabase
      .from('promo_codes')
      .select('code, promotions(name)')
      .eq('customer_id', customer.id)
      .eq('redeemed', false)
      .like('code', 'RWRD-%')
      .limit(3),

    supabase
      .from('promo_codes')
      .select('code, promotions(name, discount_type, discount_value)')
      .eq('customer_id', customer.id)
      .eq('redeemed', false)
      .eq('expired', false)
      .limit(5),
  ])

  const last = bookingResult.data
  const vehicles = vehiclesResult.data || []
  const rewardCodes = (rewardCodesResult.data || []).map(function(r) {
    return { code: r.code, reward_description: r.promotions?.name || 'Free reward' }
  })

  function describeDiscount(p) {
    if (!p) return 'discount'
    if (p.discount_type === 'percent') return p.discount_value + '% off'
    if (p.discount_type === 'fixed') return '$' + p.discount_value + ' off'
    return p.name || 'discount'
  }

  const availablePromos = (allPromoCodesResult.data || []).map(function(r) {
    return {
      code: r.code,
      name: r.promotions?.name || 'Promo',
      description: describeDiscount(r.promotions),
    }
  })

  // Fetch last service per vehicle from bookings history
  const vehiclesWithService = await Promise.all(vehicles.map(async function(v) {
    const { data: lastBooking } = await supabase
      .from('bookings')
      .select('service')
      .eq('customer_id', customer.id)
      .eq('make', v.make)
      .eq('model', v.model)
      .eq('year', v.year)
      .not('status', 'eq', 'cancelled')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    return Object.assign({}, v, { last_service: lastBooking?.service || null })
  }))

  return res.status(200).json({
    found: true,
    name: customer.name,
    email: customer.email || null,
    city: last?.city || null,
    last_service: last?.service || null,
    make: last?.make || null,
    model: last?.model || null,
    year: last?.year || null,
    all_vehicles: vehiclesWithService,
    reward_codes: rewardCodes,
    available_promos: availablePromos,
  })
}
