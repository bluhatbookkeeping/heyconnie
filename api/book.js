const { createClient } = require('@supabase/supabase-js')
const { Resend } = require('resend')


const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const resend = new Resend(process.env.RESEND_API_KEY)

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const {
    name, phone, email, city,
    make, model, year,
    service, condition, notes,
    date, time,
    start_datetime, promo_code,
    business_id: bodyBusinessId,
    sms_consent,
  } = req.body

  const BUSINESS_ID = bodyBusinessId?.trim() || 'luis-mobile-detail'

  // Validate required fields
  const missing = ['name', 'phone', 'city', 'make', 'model', 'year', 'service']
    .filter(f => !req.body[f]?.trim())

  if (missing.length) {
    return res.status(400).json({ error: 'Missing required fields', fields: missing })
  }

  // Conflict check when a confirmed slot is provided
  let endDatetime = null
  if (start_datetime) {
    const { data: svc } = await supabase
      .from('services')
      .select('duration_minutes')
      .eq('business_id', BUSINESS_ID)
      .eq('name', service?.trim())
      .maybeSingle()
    if (!svc) return res.status(400).json({ error: 'Unknown service' })
    const startMs = new Date(start_datetime).getTime()
    if (isNaN(startMs)) {
      return res.status(400).json({ error: 'Invalid start_datetime' })
    }
    endDatetime = new Date(startMs + svc.duration_minutes * 60 * 1000).toISOString()

    const { data: conflicts } = await supabase
      .from('bookings')
      .select('id')
      .eq('business_id', BUSINESS_ID)
      .neq('status', 'cancelled')
      .not('start_datetime', 'is', null)
      .lt('start_datetime', endDatetime)
      .gt('end_datetime', start_datetime)

    if (conflicts && conflicts.length > 0) {
      return res.status(409).json({ error: 'slot_taken' })
    }
  }

  // Promo validation
  let promoApplied = null
  if (promo_code) {
    // Strip spaces so "SUMMER 10" and "SUMMER10" both match
    const normalizedCode = promo_code.trim().toUpperCase().replace(/\s+/g, '')
    const today = new Date().toISOString().slice(0, 10)

    const { data: promoCode } = await supabase
      .from('promo_codes')
      .select('id, promotion_id, redeemed, expired')
      .eq('business_id', BUSINESS_ID)
      .eq('code', normalizedCode)
      .maybeSingle()

    let promotion = null
    let promoCodeId = null

    if (promoCode && !promoCode.redeemed && !promoCode.expired) {
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
      }
    }
  }

  // Upsert customer record so web form bookings appear in the CRM
  let customerId = null
  const phoneLast10 = phone.trim().replace(/\D/g, '').slice(-10)
  const phoneE164 = '+1' + phoneLast10
  const { data: existingCustomer } = await supabase
    .from('customers')
    .select('id')
    .eq('business_id', BUSINESS_ID)
    .filter('phone', 'ilike', `%${phoneLast10}%`)
    .maybeSingle()

  if (existingCustomer) {
    customerId = existingCustomer.id
    await supabase.from('customers')
      .update({ name: name.trim(), email: email?.trim() || null })
      .eq('id', customerId)
  } else {
    const { data: newCustomer } = await supabase.from('customers')
      .insert({ business_id: BUSINESS_ID, phone: phoneE164, name: name.trim(), email: email?.trim() || null })
      .select('id').single()
    customerId = newCustomer?.id || null
  }

  // Upsert vehicle record so it shows in CRM
  if (customerId && make?.trim() && model?.trim() && year?.trim()) {
    const { data: existingVehicle } = await supabase
      .from('vehicles')
      .select('id')
      .eq('customer_id', customerId)
      .eq('make', make.trim())
      .eq('model', model.trim())
      .eq('year', year.trim())
      .maybeSingle()
    if (!existingVehicle) {
      await supabase.from('vehicles').insert({
        business_id: BUSINESS_ID,
        customer_id: customerId,
        make: make.trim(),
        model: model.trim(),
        year: year.trim(),
      })
    }
  }

  // Map time preference labels to representative time values for the time column
  const TIME_MAP = {
    'morning': '08:00', 'afternoon': '12:00', 'evening': '17:00'
  }
  const timeKey = time ? Object.keys(TIME_MAP).find(k => time.toLowerCase().includes(k)) : null
  const preferredTimeDb = timeKey ? TIME_MAP[timeKey] : null

  // Save booking to Supabase
  const cancelToken = require('crypto').randomUUID()
  const { data, error: dbError } = await supabase.from('bookings').insert({
    business_id: BUSINESS_ID,
    customer_id: customerId,
    name: name.trim(),
    phone: phone.trim(),
    email: email?.trim() || null,
    city: city.trim(),
    make: make.trim(),
    model: model.trim(),
    year: year.trim(),
    service: service.trim(),
    condition: Array.isArray(condition) ? condition : [],
    notes: notes?.trim() || null,
    preferred_date: date || null,
    preferred_time: preferredTimeDb,
    start_datetime: start_datetime || null,
    end_datetime: endDatetime,
    source: 'form',
    status: 'new',
    cancel_token: cancelToken,
    sms_consent_at: sms_consent ? new Date().toISOString() : null,
  })
  .select('id')
  .single()

  if (dbError) {
    console.error('Supabase insert error:', dbError)
    return res.status(500).json({ error: 'Failed to save booking. Please try again.' })
  }

  // Redeem promo
  if (promoApplied && data) {
    if (promoApplied.promo_code_id) {
      await supabase
        .from('promo_codes')
        .update({ redeemed: true, redeemed_by_phone: phone, redeemed_at: new Date().toISOString() })
        .eq('id', promoApplied.promo_code_id)
    } else {
      await supabase.rpc('increment_promo_uses', { promo_id: promoApplied.promotion_id })
    }
    await supabase.from('promo_redemptions').insert({
      promotion_id: promoApplied.promotion_id,
      promo_code_id: promoApplied.promo_code_id || null,
      booking_id: data.id,
      customer_phone: phone,
      discount_type: promoApplied.discount_type,
      discount_value: promoApplied.discount_value,
    })
  }

  // Pricing — look up base price from services, apply any promo discount
  let basePrice = null
  let promoDiscount = 0
  let totalPrice = null
  const { data: svcPrice } = await supabase
    .from('services')
    .select('starting_price')
    .eq('business_id', BUSINESS_ID)
    .eq('name', service?.trim())
    .maybeSingle()
  if (svcPrice) {
    basePrice = svcPrice.starting_price
    if (promoApplied) {
      promoDiscount = promoApplied.discount_type === 'percent'
        ? Math.round(basePrice * promoApplied.discount_value) / 100
        : promoApplied.discount_value
    }
    totalPrice = Math.max(0, basePrice - promoDiscount)
  }

  // Format for emails
  const conditionStr = Array.isArray(condition) && condition.length
    ? condition.join(', ')
    : 'Not specified'
  const dateStr = date || 'Not specified'
  const timeStr = time || 'Not specified'
  const apptDisplay = start_datetime
    ? new Date(start_datetime).toLocaleString('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric', hour:'numeric', minute:'2-digit', timeZone:'America/Los_Angeles', timeZoneName:'short' })
    : null
  const notificationEmail = process.env.NOTIFICATION_EMAIL

  const pricingBlock = totalPrice != null ? `
    <tr><td colspan="2" style="padding:6px 0;border-top:1px solid #bbf7d0"></td></tr>
    ${basePrice !== totalPrice ? `<tr><td style="padding:4px 0;font-weight:bold;width:160px">${service}</td><td>$${basePrice}</td></tr>
    <tr><td style="padding:4px 0;font-weight:bold">Promo Code</td><td style="color:#16a34a"><strong>${promoApplied.code}</strong> — ${promoApplied.discount_type === 'percent' ? `${promoApplied.discount_value}% off` : `$${promoApplied.discount_value} off`} (-$${promoDiscount})</td></tr>` : `<tr><td style="padding:4px 0;font-weight:bold;width:160px">${service}</td><td>$${totalPrice}</td></tr>`}
    <tr><td style="padding:4px 0;font-weight:bold">Total Due</td><td><strong>$${totalPrice}</strong></td></tr>
    <tr><td colspan="2" style="padding:4px 0;font-size:13px;color:#555">Final price may vary by vehicle size and condition. Payment accepted via cash or Zelle.</td></tr>
  ` : ''

  const apptLine = apptDisplay || (dateStr !== 'Not specified' ? dateStr + (timeStr !== 'Not specified' ? ' · ' + timeStr : '') : 'Not specified')
  const notificationHtml = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a">
      <h2 style="color:#1d4ed8;margin-bottom:4px">New Booking Request</h2>
      <p style="margin-top:0;color:#555">Luis Mobile Detail · San Gabriel Valley, CA</p>

      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px 20px;margin:20px 0">
        <div style="font-weight:700;font-size:16px;color:#15803d;margin-bottom:12px">Booking Summary</div>

        <table style="width:100%;border-collapse:collapse;font-size:15px">
          <tr><td style="padding:4px 0;font-weight:bold;width:140px;vertical-align:top">Name</td><td>${name}</td></tr>
          <tr><td style="padding:4px 0;font-weight:bold;vertical-align:top">Phone</td><td><a href="tel:${phone}" style="color:#1d4ed8">${phone}</a></td></tr>
          ${email ? `<tr><td style="padding:4px 0;font-weight:bold;vertical-align:top">Email</td><td><a href="mailto:${email}" style="color:#1d4ed8">${email}</a></td></tr>` : ''}
          <tr><td style="padding:4px 0;font-weight:bold;vertical-align:top">Location</td><td>${city} &nbsp;<a href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(city)}" style="color:#1d4ed8">Get Directions</a></td></tr>
          <tr><td colspan="2" style="padding:6px 0;border-top:1px solid #bbf7d0"></td></tr>
          <tr><td style="padding:4px 0;font-weight:bold;vertical-align:top">Vehicle</td><td>${year} ${make} ${model}</td></tr>
          <tr><td style="padding:4px 0;font-weight:bold;vertical-align:top">Service</td><td>${service}</td></tr>
          ${conditionStr !== 'Not specified' ? `<tr><td style="padding:4px 0;font-weight:bold;vertical-align:top">Condition</td><td>${conditionStr}</td></tr>` : ''}
          ${notes ? `<tr><td style="padding:4px 0;font-weight:bold;vertical-align:top">Notes</td><td>${notes}</td></tr>` : ''}
          ${promoApplied ? `<tr><td style="padding:4px 0;font-weight:bold;vertical-align:top">Promo</td><td>${promoApplied.code} — ${promoApplied.discount_type === 'percent' ? `${promoApplied.discount_value}% off` : `$${promoApplied.discount_value} off`}</td></tr>` : ''}
          <tr><td colspan="2" style="padding:6px 0;border-top:1px solid #bbf7d0"></td></tr>
          <tr><td style="padding:4px 0;font-weight:bold;vertical-align:top">Appointment</td><td>${apptLine}</td></tr>
          ${totalPrice != null ? pricingBlock : ''}
        </table>
      </div>

      <p style="color:#666;font-size:13px">— Luis Mobile Detail Booking System</p>
    </div>
  `

  // Loyalty punch count — fetch current progress for this customer to include in confirmation email
  let loyaltyLine = ''
  if (customerId) {
    try {
      const { data: loyaltyProgram } = await supabase
        .from('loyalty_programs')
        .select('id, required_visits, reward_description, active')
        .eq('business_id', BUSINESS_ID)
        .eq('active', true)
        .maybeSingle()

      if (loyaltyProgram) {
        const { count: punchCount } = await supabase
          .from('loyalty_punches')
          .select('id', { count: 'exact', head: true })
          .eq('loyalty_program_id', loyaltyProgram.id)
          .eq('customer_id', customerId)
          .eq('redeemed', false)

        const current = punchCount || 0
        const needed = loyaltyProgram.required_visits - current
        if (needed > 0) {
          loyaltyLine = `<p style="margin-top:12px;padding:10px 14px;background:#eff6ff;border-radius:6px;font-size:14px">⭐ You have <strong>${current} of ${loyaltyProgram.required_visits}</strong> punches toward your free <strong>${loyaltyProgram.reward_description}</strong> — ${needed} more to go!</p>`
        } else {
          loyaltyLine = `<p style="margin-top:12px;padding:10px 14px;background:#f3e8ff;border-radius:6px;font-size:14px">🎉 You've earned a free <strong>${loyaltyProgram.reward_description}</strong>! Mention this when you confirm your appointment.</p>`
        }
      }
    } catch (e) {
      // Loyalty lookup is non-fatal
    }
  }

  const confirmationHtml = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a">
      <h2 style="color:#1d4ed8;margin-bottom:4px">We got your request!</h2>
      <p style="margin-top:0;color:#555">Luis Mobile Detail · San Gabriel Valley, CA</p>
      <p>Hi ${name},</p>
      <p>Your booking request has been received. Luis will reach out shortly to confirm your appointment.</p>

      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px 20px;margin:20px 0">
        <div style="font-weight:700;font-size:16px;color:#15803d;margin-bottom:12px">Booking Summary</div>

        <table style="width:100%;border-collapse:collapse;font-size:15px">
          <tr><td style="padding:4px 0;font-weight:bold;width:140px;vertical-align:top">Name</td><td>${name}</td></tr>
          <tr><td style="padding:4px 0;font-weight:bold;vertical-align:top">Phone</td><td>${phone}</td></tr>
          ${email ? `<tr><td style="padding:4px 0;font-weight:bold;vertical-align:top">Email</td><td>${email}</td></tr>` : ''}
          <tr><td style="padding:4px 0;font-weight:bold;vertical-align:top">Location</td><td>${city}</td></tr>
          <tr><td colspan="2" style="padding:6px 0;border-top:1px solid #bbf7d0"></td></tr>
          <tr><td style="padding:4px 0;font-weight:bold;vertical-align:top">Vehicle</td><td>${year} ${make} ${model}</td></tr>
          <tr><td style="padding:4px 0;font-weight:bold;vertical-align:top">Service</td><td>${service}</td></tr>
          ${conditionStr !== 'Not specified' ? `<tr><td style="padding:4px 0;font-weight:bold;vertical-align:top">Condition</td><td>${conditionStr}</td></tr>` : ''}
          ${notes ? `<tr><td style="padding:4px 0;font-weight:bold;vertical-align:top">Notes</td><td>${notes}</td></tr>` : ''}
          ${apptDisplay ? `<tr><td colspan="2" style="padding:6px 0;border-top:1px solid #bbf7d0"></td></tr><tr><td style="padding:4px 0;font-weight:bold;vertical-align:top">Appointment</td><td>${apptDisplay}</td></tr>` : ''}
          ${totalPrice != null ? pricingBlock : `<tr><td colspan="2" style="padding:8px 0;border-top:1px solid #bbf7d0"></td></tr><tr><td colspan="2" style="font-size:13px;color:#555">Luis will confirm pricing when he reaches out.</td></tr>`}
        </table>
      </div>

      ${loyaltyLine}
      <div style="margin-top:16px;padding:12px 16px;background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;font-size:14px;line-height:1.6">
        <strong>Need to cancel?</strong> <a href="https://luis-mobile-detailing.vercel.app/cancel?token=${cancelToken}" style="color:#1d4ed8">Cancel my appointment</a><br>
        <strong>Need to reschedule?</strong> Call or text our scheduling line at <a href="tel:6266541924" style="color:#1d4ed8">(626) 654-1924</a>
      </div>
      <p>Questions? Call or text us at <strong><a href="tel:6266541924" style="color:#1d4ed8">(626) 654-1924</a></strong>.</p>
      <p style="color:#666;font-size:13px">— Luis Mobile Detail<br>San Gabriel Valley, CA</p>
    </div>
  `

  // Send emails — booking is already saved so email failure is non-fatal
  try {
    const emailJobs = [
      resend.emails.send({
        from: 'bookings@svcvoice.com',
        to: notificationEmail,
        subject: `New booking: ${name} — ${service}`,
        html: notificationHtml,
      }),
    ]
    if (email) {
      emailJobs.push(resend.emails.send({
        from: 'bookings@svcvoice.com',
        to: email,
        subject: 'Luis Mobile Detail — We got your request!',
        html: confirmationHtml,
      }))
    }
    await Promise.all(emailJobs)
  } catch (emailError) {
    // Booking saved — log email failure but don't surface it to the customer
    console.error('Resend error:', emailError)
  }

  return res.status(200).json({
    success: true,
    base_price: basePrice,
    discount: promoDiscount,
    total: totalPrice,
    promo_code: promoApplied?.code || null,
    promo_label: promoApplied
      ? (promoApplied.discount_type === 'percent' ? `${promoApplied.discount_value}% off` : `$${promoApplied.discount_value} off`)
      : null,
    cancel_token: cancelToken,
  })
}
