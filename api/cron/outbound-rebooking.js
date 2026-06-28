/**
 * Outbound rebooking campaign calls — fires daily at 10am PT (0 18 * * * UTC).
 * Finds completed bookings past their service rebooking window where the customer
 * has no subsequent booking. Triggers a Vapi outbound call per customer.
 * Tracks in outbound_calls to prevent double-sends.
 *
 * Rebooking windows:
 *   Just a Wash    → 21 days
 *   Standard Detail → 42 days
 *   Full Detail     → 56 days
 *
 * VOICEMAIL DROP CONFIG (Vapi dashboard — assistant VAPI_OUTBOUND_ASSISTANT_ID):
 *   Same voicemail detection settings as outbound-reminders.js apply here.
 *   Set voicemailMessage on the outbound assistant to:
 *   "Hey [Name], it's Luis Mobile Detail — it's been a while since we took care of
 *    your [car]. Just wanted to check in and see if you're due for another detail.
 *    Give us a call at 626-654-1924 or we'll try you again soon!"
 *   Pass customer_name and vehicle in assistantOverrides.variableValues.
 */

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

const VAPI_BASE = 'https://api.vapi.ai'

const REBOOKING_WINDOWS = {
  'just a wash': 21,
  'standard detail': 42,
  'full detail': 56,
}

function windowDays(service) {
  return REBOOKING_WINDOWS[(service || '').toLowerCase().trim()] || 42
}

async function getActivePromo(businessId) {
  const today = new Date().toISOString().slice(0, 10)
  const { data } = await supabase
    .from('promotions')
    .select('shared_code, name, discount_type, discount_value')
    .eq('business_id', businessId)
    .eq('active', true)
    .eq('code_type', 'shared')
    .or(`valid_from.is.null,valid_from.lte.${today}`)
    .or(`valid_until.is.null,valid_until.gte.${today}`)
    .limit(1)
    .maybeSingle()
  return data || null
}

async function triggerOutboundCall({ phone, name, service, vehicle, weeksSince, promoCode, promoDescription }) {
  const promoLine = promoCode
    ? ` I can also apply a discount right now if you want to book today — just say yes and I'll take care of it.`
    : ''

  const vehicleLabel = vehicle || 'your car'
  const weeksLabel = weeksSince === 1 ? '1 week' : `${weeksSince} weeks`

  const body = {
    assistantId: process.env.VAPI_OUTBOUND_ASSISTANT_ID,
    phoneNumberId: process.env.VAPI_PHONE_NUMBER_ID,
    customer: { number: phone },
    assistantOverrides: {
      variableValues: {
        customer_name: name || 'there',
        service,
        vehicle: vehicleLabel,
        weeks_since: weeksLabel,
        promo_code: promoCode || '',
        promo_description: promoDescription || '',
        vapi_number: '626-654-1924',
      },
      firstMessage: `Hey ${name || 'there'}, it's been about ${weeksLabel} since Luis detailed ${vehicleLabel}. He has some openings coming up — want me to grab a slot for you?${promoLine}`,
    },
  }

  const resp = await fetch(`${VAPI_BASE}/call/phone`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.VAPI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!resp.ok) {
    const text = await resp.text()
    throw new Error(`Vapi outbound error ${resp.status}: ${text}`)
  }

  return resp.json()
}

module.exports = async function handler(req, res) {
  const secret = req.headers['x-admin-secret']
  if (secret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const now = new Date()
  const { data: businesses } = await supabase.from('businesses').select('id')
  let sent = 0
  let skipped = 0
  let failed = 0

  for (const biz of (businesses || [])) {
    const BUSINESS_ID = biz.id
    const activePromo = await getActivePromo(BUSINESS_ID)

    const { data: completed, error } = await supabase
      .from('bookings')
      .select('id, customer_id, name, phone, service, make, model, year, start_datetime')
      .eq('business_id', BUSINESS_ID)
      .eq('status', 'completed')
      .not('customer_id', 'is', null)
      .not('phone', 'is', null)
      .gte('start_datetime', new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000).toISOString())
      .lte('start_datetime', now.toISOString())

    if (error) {
      console.error(`outbound-rebooking query error for ${BUSINESS_ID}:`, error)
      continue
    }

    for (const booking of (completed || [])) {
      const days = windowDays(booking.service)
      const completedAt = new Date(booking.start_datetime)
      const daysSince = Math.floor((now - completedAt) / (24 * 60 * 60 * 1000))

      if (daysSince < days) { skipped++; continue }

      const { data: subsequent } = await supabase
        .from('bookings')
        .select('id')
        .eq('business_id', BUSINESS_ID)
        .eq('customer_id', booking.customer_id)
        .in('status', ['new', 'confirmed'])
        .gt('start_datetime', booking.start_datetime)
        .limit(1)
        .maybeSingle()

      if (subsequent) { skipped++; continue }

      const { data: prior } = await supabase
        .from('outbound_calls')
        .select('id')
        .eq('booking_id', booking.id)
        .eq('call_type', 'rebooking')
        .maybeSingle()

      if (prior) { skipped++; continue }

      const vehicle = [booking.year, booking.make, booking.model].filter(Boolean).join(' ') || null
      const weeksSince = Math.round(daysSince / 7)

      try {
        const call = await triggerOutboundCall({
          phone: booking.phone,
          name: booking.name,
          service: booking.service,
          vehicle,
          weeksSince,
          promoCode: activePromo?.shared_code || null,
          promoDescription: activePromo
            ? (activePromo.discount_type === 'percent'
              ? `${activePromo.discount_value}% off`
              : `$${activePromo.discount_value} off`)
            : null,
        })

        await supabase.from('outbound_calls').insert({
          booking_id: booking.id,
          customer_id: booking.customer_id,
          call_type: 'rebooking',
          vapi_call_id: call.id || null,
          business_id: BUSINESS_ID,
        })

        sent++
      } catch (err) {
        console.error(`Rebooking call failed for booking ${booking.id}:`, err.message)
        failed++
      }
    }
  }

  return res.status(200).json({ sent, skipped, failed })
}
