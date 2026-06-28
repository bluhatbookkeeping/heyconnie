const { createClient } = require('@supabase/supabase-js')
const { Resend } = require('resend')
const { resolveBusiness } = require('../utils/resolve-business')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)
const resend = new Resend(process.env.RESEND_API_KEY)

function formatDateTime(iso) {
  if (!iso) return 'TBD'
  return new Date(iso).toLocaleString('en-US', {
    timeZone: timezone,
    weekday: 'long', month: 'long', day: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  })
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
  const args = req.body?.message?.toolCallList?.[0]?.function?.arguments || req.body
  const vapiResult = (data) => res.status(200).json({ results: [{ toolCallId, result: JSON.stringify(data) }] })

  const biz = await resolveBusiness(req)
  const BUSINESS_ID = biz.id
  const timezone = biz.timezone || 'America/Los_Angeles'
  const {
    customer_id,
    name,
    make, model, year,
    service, city,
    start_datetime, notes,
    addons, promo_code,
  } = args
  let email = args.email
  const caller_phone = args.caller_phone || args.phone

  const missing = ['name', 'service', 'city', 'start_datetime']
    .filter(f => { const v = args[f]; return !v || !String(v).trim() })
  if (!caller_phone) missing.push('caller_phone / phone')

  if (missing.length) {
    return res.status(400).json({ error: 'Missing required fields', fields: missing })
  }

  // Duration lookup → end_datetime
  const { data: svc } = await supabase
    .from('services')
    .select('duration_minutes, starting_price')
    .eq('business_id', BUSINESS_ID)
    .ilike('name', service.trim())
    .maybeSingle()

  if (!svc) return res.status(400).json({ error: 'Unknown service' })

  // Normalize: if no timezone offset, treat as UTC (getSlots returns UTC ISO strings)
  const normalizedStart = /[Z+]/.test(start_datetime.trim()) ? start_datetime : start_datetime + 'Z'
  const startMs = new Date(normalizedStart).getTime()
  if (isNaN(startMs)) return res.status(400).json({ error: 'Invalid start_datetime' })
  const end_datetime = new Date(startMs + svc.duration_minutes * 60 * 1000).toISOString()

  // Conflict check
  const { data: conflicts } = await supabase
    .from('bookings')
    .select('id')
    .eq('business_id', BUSINESS_ID)
    .neq('status', 'cancelled')
    .not('start_datetime', 'is', null)
    .lt('start_datetime', end_datetime)
    .gt('end_datetime', normalizedStart)

  if (conflicts && conflicts.length > 0) {
    return res.status(409).json({ error: 'slot_taken', message: 'That time slot is no longer available.' })
  }

  // Promo validation (re-validate at booking time — race condition protection)
  let promoApplied = null
  if (promo_code) {
    // Strip spaces so "SUMMER 10" and "SUMMER10" both match
    const normalizedCode = promo_code.trim().toUpperCase().replace(/\s+/g, '')
    const today = new Date().toISOString().slice(0, 10)

    const { data: promoCode } = await supabase
      .from('promo_codes')
      .select('id, promotion_id, customer_id, redeemed')
      .eq('business_id', BUSINESS_ID)
      .eq('code', normalizedCode)
      .maybeSingle()

    let promotion = null
    let promoCodeId = null

    if (promoCode && !promoCode.redeemed) {
      const { data: promo } = await supabase.from('promotions').select('*').eq('id', promoCode.promotion_id).maybeSingle()
      promotion = promo
      promoCodeId = promoCode.id
    } else if (!promoCode) {
      // Compare space-stripped so "SUMMER 10" matches "SUMMER10"
      const { data: sharedPromos } = await supabase
        .from('promotions')
        .select('*')
        .eq('business_id', BUSINESS_ID)
        .eq('code_type', 'shared')
      promotion = (sharedPromos || []).find(p =>
        p.shared_code?.replace(/\s+/g, '').toUpperCase() === normalizedCode
      ) || null
    }

    const serviceAllowed = !promotion?.applicable_services?.length ||
      promotion.applicable_services.some(s => s.toLowerCase() === service.trim().toLowerCase())

    if (
      promotion &&
      promotion.active &&
      (!promotion.valid_from || today >= promotion.valid_from) &&
      (!promotion.valid_until || today <= promotion.valid_until) &&
      (promotion.max_total_uses === null || promotion.total_uses < promotion.max_total_uses) &&
      serviceAllowed
    ) {
      promoApplied = {
        promotion_id: promotion.id,
        promo_code_id: promoCodeId,
        code: normalizedCode,
        discount_type: promotion.discount_type,
        discount_value: promotion.discount_value,
        code_type: promotion.code_type,
      }
    }
  }

  // Pricing
  const basePrice = svc.starting_price ?? null
  let promoDiscount = 0
  if (promoApplied && basePrice != null) {
    promoDiscount = promoApplied.discount_type === 'percent'
      ? Math.round(basePrice * promoApplied.discount_value) / 100
      : promoApplied.discount_value
  }
  const totalPrice = basePrice != null ? Math.max(0, basePrice - promoDiscount) : null

  // Upsert customer
  let resolvedCustomerId = customer_id || null
  if (!resolvedCustomerId) {
    const { data: existing } = await supabase
      .from('customers')
      .select('id')
      .eq('business_id', BUSINESS_ID)
      .filter('phone', 'ilike', `%${caller_phone.replace(/\D/g, '').slice(-10)}%`)
      .maybeSingle()

    if (existing) {
      resolvedCustomerId = existing.id
      if (name) {
        await supabase.from('customers').update({ name, email: email || undefined }).eq('id', resolvedCustomerId)
      }
      // Pull stored email if caller didn't provide one
      if (!email) {
        const { data: cust } = await supabase.from('customers').select('email').eq('id', resolvedCustomerId).maybeSingle()
        if (cust?.email) email = cust.email
      }
    } else {
      const { data: newCustomer } = await supabase
        .from('customers')
        .insert({ business_id: BUSINESS_ID, phone: caller_phone, name, email: email || null })
        .select('id')
        .single()
      resolvedCustomerId = newCustomer?.id || null
    }
  }

  // Upsert vehicle
  if (resolvedCustomerId && make && model && year) {
    const { data: existingVehicle } = await supabase
      .from('vehicles')
      .select('id')
      .eq('customer_id', resolvedCustomerId)
      .eq('make', make)
      .eq('model', model)
      .eq('year', year)
      .maybeSingle()

    if (!existingVehicle) {
      await supabase.from('vehicles').insert({
        business_id: BUSINESS_ID,
        customer_id: resolvedCustomerId,
        make, model, year,
      })
    }
  }

  const fullNotes = [notes, addons ? `Add-ons: ${addons}` : null].filter(Boolean).join(' | ')

  // Save booking
  const { data: booking, error: dbError } = await supabase
    .from('bookings')
    .insert({
      business_id: BUSINESS_ID,
      customer_id: resolvedCustomerId,
      name: name.trim(),
      phone: caller_phone.trim(),
      email: email?.trim() || null,
      city: city.trim(),
      make: make != null ? String(make).trim() || null : null,
      model: model != null ? String(model).trim() || null : null,
      year: year != null ? String(year).trim() || null : null,
      service: service.trim(),
      notes: fullNotes || null,
      start_datetime: normalizedStart,
      end_datetime,
      source: 'voice',
      status: 'new',
    })
    .select('id')
    .single()

  if (dbError) {
    console.error('Supabase insert error:', dbError.code, dbError.message, dbError.details)
    return vapiResult({ success: false, error: 'booking_failed', message: "I wasn't able to save the booking due to a technical issue. I've noted your details and Luis will reach out to confirm your appointment." })
  }

  // Redeem promo after successful booking insert
  if (promoApplied) {
    if (promoApplied.promo_code_id) {
      // Unique code — mark redeemed
      await supabase
        .from('promo_codes')
        .update({ redeemed: true, redeemed_by_phone: caller_phone, redeemed_at: new Date().toISOString() })
        .eq('id', promoApplied.promo_code_id)
    } else {
      // Shared code — increment total_uses
      await supabase.rpc('increment_promo_uses', { promo_id: promoApplied.promotion_id })
    }

    await supabase.from('promo_redemptions').insert({
      promotion_id: promoApplied.promotion_id,
      promo_code_id: promoApplied.promo_code_id || null,
      booking_id: booking.id,
      customer_id: resolvedCustomerId || null,
      customer_phone: caller_phone,
      discount_type: promoApplied.discount_type,
      discount_value: promoApplied.discount_value,
    })
  }

  const dateLabel = formatDateTime(start_datetime)
  const vehicleLabel = [year, make, model].filter(Boolean).join(' ') || 'vehicle not specified'
  const promoEmailRow = promoApplied
    ? `<tr><td style="padding:8px 0;font-weight:bold">Promo</td><td>${promoApplied.code} — ${promoApplied.discount_type === 'percent' ? `${promoApplied.discount_value}% off` : `$${promoApplied.discount_value} off`}</td></tr>`
    : ''

  // Email to Luis
  try {
    await resend.emails.send({
      from: 'bookings@svcvoice.com',
      to: process.env.NOTIFICATION_EMAIL,
      subject: `📞 Voice Booking: ${name} — ${service}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <h2 style="color:#1d4ed8">Voice Booking — Luis Mobile Detail</h2>
          <table style="width:100%;border-collapse:collapse">
            <tr><td style="padding:8px 0;font-weight:bold;width:140px">Name</td><td>${name}</td></tr>
            <tr><td style="padding:8px 0;font-weight:bold">Phone</td><td>${caller_phone}</td></tr>
            ${email ? `<tr><td style="padding:8px 0;font-weight:bold">Email</td><td>${email}</td></tr>` : ''}
            <tr><td style="padding:8px 0;font-weight:bold">Location</td><td>${city} &nbsp;<a href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(city)}" style="color:#1d4ed8">Get Directions</a></td></tr>
            <tr><td colspan="2" style="padding:8px 0;border-top:1px solid #eee"></td></tr>
            <tr><td style="padding:8px 0;font-weight:bold">Vehicle</td><td>${vehicleLabel}</td></tr>
            <tr><td style="padding:8px 0;font-weight:bold">Service</td><td>${service}</td></tr>
            ${addons ? `<tr><td style="padding:8px 0;font-weight:bold">Add-ons</td><td>${addons}</td></tr>` : ''}
            <tr><td style="padding:8px 0;font-weight:bold">Notes</td><td>${notes || 'None'}</td></tr>
            ${promoEmailRow}
            <tr><td colspan="2" style="padding:8px 0;border-top:1px solid #eee"></td></tr>
            <tr><td style="padding:8px 0;font-weight:bold">Date/Time</td><td>${dateLabel}</td></tr>
          </table>
        </div>
      `,
    })
  } catch (emailErr) {
    console.error('Resend error:', emailErr)
  }

  // Customer confirmation email (only if email provided)
  if (email) {
    const custPricingBlock = totalPrice != null ? `
      <tr><td colspan="2" style="padding:8px 0;border-top:1px solid #eee"></td></tr>
      ${basePrice !== totalPrice ? `<tr><td style="padding:4px 0;font-weight:bold;width:140px">Base Price</td><td>$${basePrice}</td></tr>
      <tr><td style="padding:4px 0;font-weight:bold">Promo Code</td><td style="color:#16a34a"><strong>${promoApplied.code}</strong> — ${promoApplied.discount_type === 'percent' ? `${promoApplied.discount_value}% off` : `$${promoApplied.discount_value} off`} (-$${promoDiscount})</td></tr>` : ''}
      <tr><td style="padding:4px 0;font-weight:bold">Total Due</td><td><strong>$${totalPrice}</strong></td></tr>
      <tr><td colspan="2" style="padding:4px 0;font-size:13px;color:#555">Payment accepted via cash or Zelle.</td></tr>
    ` : ''
    try {
      await resend.emails.send({
        from: 'bookings@svcvoice.com',
        to: email,
        subject: 'Luis Mobile Detail — Your booking is confirmed!',
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
            <h2 style="color:#1d4ed8">You're booked!</h2>
            <p>Hi ${name},</p>
            <p>Luis confirmed your <strong>${service}</strong> on <strong>${vehicleLabel}</strong> for <strong>${dateLabel}</strong>.</p>
            ${totalPrice != null ? `<table style="width:100%;border-collapse:collapse">${custPricingBlock}</table>` : ''}
            <p>Questions? Call or text Luis at <strong>626-409-3147</strong>.</p>
            <br>
            <p style="color:#666">— Luis Mobile Detail<br>San Gabriel Valley, CA</p>
          </div>
        `,
      })
    } catch (custEmailErr) {
      console.error('Customer email error:', custEmailErr)
    }
  }

  return vapiResult({
    success: true,
    booking_id: booking.id,
    promo_applied: promoApplied
      ? { code: promoApplied.code, discount_type: promoApplied.discount_type, discount_value: promoApplied.discount_value }
      : null,
  })
}
