const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

async function getUser(req) {
  const token = req.headers['authorization']?.replace('Bearer ', '')
  if (!token) return null
  const { data: { user }, error } = await supabase.auth.getUser(token)
  return error ? null : user
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const user = await getUser(req)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  const { business, id } = req.query
  if (!business) return res.status(400).json({ error: 'business is required' })

  // ── POST — create new customer ────────────────────────────────────────────
  if (req.method === 'POST') {
    const { name, phone, email, make, model, year } = req.body || {}
    if (!name || !phone) return res.status(400).json({ error: 'name and phone are required' })
    const phoneLast10 = phone.replace(/\D/g, '').slice(-10)
    const phoneE164 = '+1' + phoneLast10
    // Check for existing customer with same phone
    const { data: existing } = await supabase
      .from('customers').select('id').eq('business_id', business)
      .filter('phone', 'ilike', `%${phoneLast10}%`).maybeSingle()
    if (existing) return res.status(409).json({ error: 'A customer with this phone number already exists.' })
    const { data: newCust, error: insertErr } = await supabase
      .from('customers')
      .insert({ business_id: business, name: name.trim(), phone: phoneE164, email: email?.trim() || null })
      .select('id').single()
    if (insertErr) return res.status(500).json({ error: insertErr.message })
    if (make && model && year) {
      await supabase.from('vehicles').insert({
        business_id: business, customer_id: newCust.id,
        make: make.trim(), model: model.trim(), year: year.toString().trim(),
      })
    }
    return res.status(201).json({ id: newCust.id })
  }

  // ── PUT — update existing customer ────────────────────────────────────────
  if (req.method === 'PUT') {
    if (!id) return res.status(400).json({ error: 'id is required' })
    const { name, phone, email, make, model, year } = req.body || {}
    if (!name || !phone) return res.status(400).json({ error: 'name and phone are required' })
    const { error: updErr } = await supabase
      .from('customers')
      .update({ name: name.trim(), phone: '+1' + phone.replace(/\D/g, '').slice(-10), email: email?.trim() || null })
      .eq('id', id).eq('business_id', business)
    if (updErr) return res.status(500).json({ error: updErr.message })
    // Replace vehicle: delete existing, insert new if provided
    if (make && model && year) {
      await supabase.from('vehicles').delete().eq('customer_id', id).eq('business_id', business)
      await supabase.from('vehicles').insert({
        business_id: business, customer_id: id,
        make: make.trim(), model: model.trim(), year: year.toString().trim(),
      })
    }
    return res.status(200).json({ success: true })
  }

  // ── DELETE customer ───────────────────────────────────────────────────────
  if (req.method === 'DELETE') {
    if (!id) return res.status(400).json({ error: 'id is required' })
    if (id.startsWith('phone:')) {
      // Orphan: fetch all unlinked bookings, match by digits-only phone, delete by ID
      const phoneKey = id.replace('phone:', '') // already digits-only from list build
      const { data: allOrphans } = await supabase
        .from('bookings')
        .select('id, phone')
        .eq('business_id', business)
        .is('customer_id', null)
      const matchIds = (allOrphans || [])
        .filter(b => b.phone?.replace(/\D/g, '').slice(-10) === phoneKey.slice(-10))
        .map(b => b.id)
      if (matchIds.length) {
        const { error } = await supabase.from('bookings').delete().in('id', matchIds)
        if (error) { console.error('orphan delete error:', error); return res.status(500).json({ error: error.message || 'Failed to delete records' }) }
      }
      return res.status(200).json({ success: true })
    }
    // Real customer: cascade — vehicles → bookings → customer
    await supabase.from('vehicles').delete().eq('customer_id', id).eq('business_id', business)
    await supabase.from('bookings').delete().eq('customer_id', id).eq('business_id', business)
    const { error } = await supabase.from('customers').delete().eq('id', id).eq('business_id', business)
    if (error) { console.error('customer delete error:', error); return res.status(500).json({ error: error.message || 'Failed to delete customer' }) }
    return res.status(200).json({ success: true })
  }

  // ── GET single customer detail ────────────────────────────────────────────
  // id may be a UUID (customers table) or "phone:<digits>" for orphan bookings
  if (id) {
    const isOrphan = id.startsWith('phone:')
    const phoneKey = isOrphan ? id.replace('phone:', '') : null

    if (isOrphan) {
      // Orphan: pull bookings by phone match, no customers row
      const [bookingsRes, servicesRes] = await Promise.all([
        supabase.from('bookings')
          .select('id, service, start_datetime, status, source, make, model, year, name, phone, email')
          .eq('business_id', business)
          .is('customer_id', null)
          .ilike('phone', `%${phoneKey}`)
          .order('start_datetime', { ascending: false }),
        supabase.from('services').select('name, starting_price').eq('business_id', business),
      ])
      const priceMap = {}
      for (const s of (servicesRes.data || [])) priceMap[s.name] = s.starting_price
      const bookings = (bookingsRes.data || []).map(b => ({ ...b, base_price: priceMap[b.service] ?? null }))
      const first = bookings[0] || {}
      const totalSpend = bookings.filter(b => b.status !== 'cancelled').reduce((s, b) => s + (b.base_price || 0), 0)
      // Build unique vehicles from booking history
      const seenVehicles = new Set()
      const vehicles = []
      for (const b of bookings) {
        if (b.make && b.model && b.year) {
          const key = `${b.year}-${b.make}-${b.model}`
          if (!seenVehicles.has(key)) { seenVehicles.add(key); vehicles.push({ make: b.make, model: b.model, year: b.year }) }
        }
      }
      return res.status(200).json({
        customer: { id: null, name: first.name, phone: first.phone, email: first.email, created_at: first.start_datetime },
        bookings,
        vehicles,
        redemptions: [],
        total_spend: totalSpend,
        visit_count: bookings.filter(b => b.status !== 'cancelled').length,
      })
    }

    const [custRes, bookingsRes, vehiclesRes, redemptionsRes, servicesRes] = await Promise.all([
      supabase.from('customers').select('*').eq('id', id).eq('business_id', business).single(),
      supabase.from('bookings')
        .select('id, service, start_datetime, status, source')
        .eq('customer_id', id)
        .order('start_datetime', { ascending: false }),
      supabase.from('vehicles').select('make, model, year').eq('customer_id', id),
      supabase.from('promo_redemptions')
        .select('discount_type, discount_value, promo_name_snapshot, code_snapshot, promotions(name, shared_code), promo_codes(code)')
        .eq('customer_id', id),
      supabase.from('services').select('name, starting_price').eq('business_id', business),
    ])

    if (custRes.error || !custRes.data) return res.status(404).json({ error: 'Customer not found' })

    const priceMap = {}
    for (const s of (servicesRes.data || [])) priceMap[s.name] = s.starting_price

    let linkedBookings = (bookingsRes.data || []).map(b => ({ ...b, base_price: priceMap[b.service] ?? null }))

    // If no linked bookings, check for orphan bookings by phone (pre-CRM-fix records)
    if (!linkedBookings.length && custRes.data.phone) {
      const phoneLast10 = custRes.data.phone.replace(/\D/g, '').slice(-10)
      const { data: orphanData } = await supabase
        .from('bookings')
        .select('id, service, start_datetime, status, source, make, model, year')
        .eq('business_id', business)
        .is('customer_id', null)
        .ilike('phone', `%${phoneLast10}`)
        .order('start_datetime', { ascending: false })
      linkedBookings = (orphanData || []).map(b => ({ ...b, base_price: priceMap[b.service] ?? null }))
    }

    const bookings = linkedBookings

    // Build vehicles: from vehicles table, or fall back to booking history
    let vehicles = vehiclesRes.data || []
    if (!vehicles.length) {
      const seenV = new Set()
      for (const b of bookings) {
        if (b.make && b.model && b.year) {
          const key = `${b.year}-${b.make}-${b.model}`
          if (!seenV.has(key)) { seenV.add(key); vehicles.push({ make: b.make, model: b.model, year: b.year }) }
        }
      }
    }

    const redemptions = (redemptionsRes.data || []).map(r => ({
      discount_type: r.discount_type,
      discount_value: r.discount_value,
      promo_name: r.promotions?.name ?? r.promo_name_snapshot ?? '(deleted promotion)',
      code: r.promo_codes?.code ?? r.promotions?.shared_code ?? r.code_snapshot ?? null,
    }))

    const totalSpend = bookings
      .filter(b => b.status !== 'cancelled')
      .reduce((sum, b) => sum + (b.base_price || 0), 0)

    return res.status(200).json({
      customer: custRes.data,
      bookings,
      vehicles,
      redemptions,
      total_spend: totalSpend,
      visit_count: bookings.filter(b => b.status !== 'cancelled').length,
    })
  }

  // ── GET customer list with aggregates ────────────────────────────────────
  const [custRes, linkedBookingsRes, orphanBookingsRes, servicesRes, vehiclesRes] = await Promise.all([
    supabase.from('customers').select('id, name, phone, email, created_at').eq('business_id', business),
    supabase.from('bookings')
      .select('customer_id, service, start_datetime, status')
      .eq('business_id', business)
      .not('customer_id', 'is', null),
    // Bookings with no customer_id — web form bookings before the CRM fix
    supabase.from('bookings')
      .select('id, name, phone, email, service, start_datetime, status, created_at, make, model, year')
      .eq('business_id', business)
      .is('customer_id', null),
    supabase.from('services').select('name, starting_price').eq('business_id', business),
    supabase.from('vehicles').select('customer_id, make, model, year').eq('business_id', business),
  ])

  if (custRes.error) return res.status(500).json({ error: 'Failed to fetch customers' })

  const priceMap = {}
  for (const s of (servicesRes.data || [])) priceMap[s.name] = s.starting_price

  // Build latest vehicle per customer_id
  const vehicleByCustomer = {}
  for (const v of (vehiclesRes.data || [])) {
    if (!vehicleByCustomer[v.customer_id]) vehicleByCustomer[v.customer_id] = v
  }

  // Aggregate linked bookings per customer_id
  const bookingsByCustomer = {}
  for (const b of (linkedBookingsRes.data || [])) {
    if (b.status === 'cancelled') continue
    if (!bookingsByCustomer[b.customer_id]) {
      bookingsByCustomer[b.customer_id] = { count: 0, spend: 0, last: null, services: new Set() }
    }
    const agg = bookingsByCustomer[b.customer_id]
    agg.count++
    agg.spend += priceMap[b.service] || 0
    agg.services.add(b.service)
    if (!agg.last || b.start_datetime > agg.last) agg.last = b.start_datetime
  }

  const customers = (custRes.data || []).map(c => {
    const agg = bookingsByCustomer[c.id] || { count: 0, spend: 0, last: null, services: new Set() }
    const v = vehicleByCustomer[c.id]
    return {
      ...c,
      visit_count: agg.count,
      total_spend: agg.spend,
      last_service: agg.last,
      services_used: [...agg.services],
      latest_vehicle: v ? `${v.year} ${v.make} ${v.model}` : null,
      source: 'customers',
    }
  })

  // Merge orphan bookings (no customer_id) — dedupe by phone last 10 digits
  const seenPhones = new Set(customers.map(c => c.phone.replace(/\D/g, '').slice(-10)))
  const orphanMap = {}
  for (const b of (orphanBookingsRes.data || [])) {
    if (!b.phone) continue
    const key = b.phone.replace(/\D/g, '').slice(-10)
    if (seenPhones.has(key)) continue // already in customers table
    if (!orphanMap[key]) {
      orphanMap[key] = {
        id: `phone:${key}`,
        name: b.name,
        phone: b.phone,
        email: b.email || null,
        created_at: b.created_at,
        visit_count: 0, spend: 0, last_service: null, services_used: [],
        latest_vehicle: (b.year && b.make && b.model) ? `${b.year} ${b.make} ${b.model}` : null,
        source: 'bookings',
      }
    }
    if (b.status !== 'cancelled') {
      orphanMap[key].visit_count++
      orphanMap[key].spend += priceMap[b.service] || 0
      if (!orphanMap[key].last_service || b.start_datetime > orphanMap[key].last_service) {
        orphanMap[key].last_service = b.start_datetime
      }
      if (!orphanMap[key].services_used.includes(b.service)) {
        orphanMap[key].services_used.push(b.service)
      }
    }
  }
  customers.push(...Object.values(orphanMap))

  return res.status(200).json({ customers })
}
