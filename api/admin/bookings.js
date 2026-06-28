const { createClient } = require('@supabase/supabase-js')
const { insertPunchForBooking } = require('../loyalty-utils')

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
  const user = await getUser(req)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  // GET — list upcoming bookings for a business
  if (req.method === 'GET') {
    const { business } = req.query
    if (!business) return res.status(400).json({ error: 'business is required' })

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    const { data, error } = await supabase
      .from('bookings')
      .select('id, customer_id, name, phone, email, city, make, model, year, service, condition, notes, start_datetime, end_datetime, status, created_at')
      .eq('business_id', business)
      .gte('start_datetime', thirtyDaysAgo)
      .order('start_datetime', { ascending: false })

    if (error) return res.status(500).json({ error: 'Failed to fetch bookings' })

    // Enrich with pricing: base price from services + promo discount from promo_redemptions
    const { data: services } = await supabase
      .from('services')
      .select('name, starting_price')
      .eq('business_id', business)

    const priceMap = {}
    for (const s of (services || [])) priceMap[s.name] = s.starting_price

    const bookingIds = data.map(b => b.id)
    let redemptionMap = {}
    if (bookingIds.length) {
      const { data: rds } = await supabase
        .from('promo_redemptions')
        .select('booking_id, discount_type, discount_value, promotions(name, shared_code), promo_codes(code)')
        .in('booking_id', bookingIds)
      for (const r of (rds || [])) {
        const code = r.promo_codes?.code || r.promotions?.shared_code || null
        redemptionMap[r.booking_id] = {
          discount_type: r.discount_type,
          discount_value: r.discount_value,
          promo_name: r.promotions?.name || null,
          code,
        }
      }
    }

    const bookings = data.map(b => {
      const base_price = priceMap[b.service] ?? null
      const promo = redemptionMap[b.id] || null
      let discount = 0
      if (promo && base_price != null) {
        discount = promo.discount_type === 'percent'
          ? Math.round(base_price * promo.discount_value) / 100
          : promo.discount_value
      }
      const total = base_price != null ? Math.max(0, base_price - discount) : null
      return { ...b, base_price, promo, discount, total }
    })

    return res.status(200).json({ bookings })
  }

  // PATCH — cancel or reschedule a booking
  if (req.method === 'PATCH') {
    const { id, business_id, action, start_datetime } = req.body

    if (!id || !business_id || !action) {
      return res.status(400).json({ error: 'id, business_id, and action are required' })
    }

    if (action === 'complete') {
      // Fetch booking details needed for punch insert
      const { data: booking } = await supabase
        .from('bookings')
        .select('id, customer_id, email, name, service, business_id, status')
        .eq('id', id)
        .eq('business_id', business_id)
        .single()

      if (!booking) return res.status(404).json({ error: 'Booking not found' })
      if (booking.status === 'completed') return res.status(200).json({ success: true, already: true })

      const { error } = await supabase
        .from('bookings')
        .update({ status: 'completed' })
        .eq('id', id)
        .eq('business_id', business_id)

      if (error) return res.status(500).json({ error: 'Failed to complete booking' })

      const punches = await insertPunchForBooking({
        bookingId: booking.id,
        businessId: booking.business_id,
        customerId: booking.customer_id,
        customerEmail: booking.email,
        customerName: booking.name,
        service: booking.service,
      })

      return res.status(200).json({ success: true, punches })
    }

    if (action === 'cancel') {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', id)
        .eq('business_id', business_id)

      if (error) return res.status(500).json({ error: 'Failed to cancel booking' })
      return res.status(200).json({ success: true })
    }

    if (action === 'reschedule') {
      if (!start_datetime) {
        return res.status(400).json({ error: 'start_datetime is required for reschedule' })
      }

      const { service: newService } = req.body

      // Use provided service or fall back to booking's existing service
      let serviceName = newService
      if (!serviceName) {
        const { data: booking } = await supabase
          .from('bookings')
          .select('service')
          .eq('id', id)
          .eq('business_id', business_id)
          .single()
        if (!booking) return res.status(404).json({ error: 'Booking not found' })
        serviceName = booking.service
      }

      const { data: svc } = await supabase
        .from('services')
        .select('duration_minutes')
        .eq('business_id', business_id)
        .eq('name', serviceName)
        .maybeSingle()

      if (!svc) return res.status(400).json({ error: 'Unknown service' })

      const startMs = new Date(start_datetime).getTime()
      if (isNaN(startMs)) return res.status(400).json({ error: 'Invalid start_datetime' })

      const end_datetime = new Date(startMs + svc.duration_minutes * 60 * 1000).toISOString()

      // Conflict check — exclude this booking itself
      const { data: conflicts } = await supabase
        .from('bookings')
        .select('id')
        .eq('business_id', business_id)
        .neq('id', id)
        .neq('status', 'cancelled')
        .not('start_datetime', 'is', null)
        .lt('start_datetime', end_datetime)
        .gt('end_datetime', start_datetime)

      if (conflicts && conflicts.length > 0) {
        return res.status(409).json({ error: 'slot_taken' })
      }

      const updateFields = { start_datetime, end_datetime, status: 'confirmed' }
      if (newService) updateFields.service = newService

      const { error } = await supabase
        .from('bookings')
        .update(updateFields)
        .eq('id', id)
        .eq('business_id', business_id)

      if (error) return res.status(500).json({ error: 'Failed to reschedule booking' })
      return res.status(200).json({ success: true, end_datetime, service: serviceName })
    }

    return res.status(400).json({ error: 'action must be cancel or reschedule' })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
