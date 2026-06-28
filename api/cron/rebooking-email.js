/**
 * Rebooking email nudge — fires daily at 9am PT (0 17 * * * UTC).
 * Parallel to outbound-rebooking.js (voice calls at 10am PT).
 * Sends email one hour before the voice call so customers who check
 * email first can self-book without waiting for a call.
 *
 * Rebooking windows:
 *   Just a Wash    → 21 days
 *   Standard Detail → 42 days
 *   Full Detail     → 56 days
 *
 * Dedup: skips customers who already have a 'rebooking_email' row
 * in outbound_calls for this booking. No new DB column needed.
 */

const { createClient } = require('@supabase/supabase-js')
const { Resend } = require('resend')

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const resend = new Resend(process.env.RESEND_API_KEY)

const REBOOKING_WINDOWS = {
  'just a wash': 21,
  'standard detail': 42,
  'full detail': 56,
}

function windowDays(service) {
  return REBOOKING_WINDOWS[(service || '').toLowerCase().trim()] || 42
}

function firstName(name) {
  return (name || 'there').split(' ')[0]
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

function promoLabel(promo) {
  if (!promo) return null
  if (promo.discount_type === 'percent') return `${promo.discount_value}% off`
  return `$${promo.discount_value} off`
}

async function sendRebookingEmail({ email, name, service, vehicle, promoCode, promoDesc, bookingUrl }) {
  const fn = firstName(name)
  const vehicleLabel = vehicle ? ` on your ${vehicle}` : ''
  const bookingLink = promoCode
    ? `${bookingUrl}?promo=${encodeURIComponent(promoCode)}`
    : bookingUrl

  const promoBlock = promoCode ? `
    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px;margin:20px 0;text-align:center">
      <p style="margin:0 0 8px;font-weight:700;color:#1d4ed8">Limited-time offer</p>
      <p style="margin:0;font-size:18px;font-weight:700">${promoDesc} with code <span style="color:#1d4ed8">${promoCode}</span></p>
    </div>
  ` : ''

  await resend.emails.send({
    from: 'bookings@svcvoice.com',
    to: email,
    subject: `Time for another detail, ${fn}?`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a">
        <h2 style="color:#1d4ed8">Hey ${fn}, your car might be due for a refresh!</h2>
        <p>It's been a while since your last ${service}${vehicleLabel}. Luis is taking bookings in the San Gabriel Valley — easy to get back on the schedule.</p>
        ${promoBlock}
        <div style="text-align:center;margin:28px 0">
          <a href="${bookingLink}" style="display:inline-block;background:#1d4ed8;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px">Book Now</a>
        </div>
        <p style="color:#6b7280;font-size:14px">Or call/text Luis directly at <strong>626-409-3147</strong>.</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
        <p style="color:#9ca3af;font-size:12px">Luis Mobile Detail · San Gabriel Valley, CA</p>
      </div>
    `,
  })
}

module.exports = async function handler(req, res) {
  const secret = req.headers['x-admin-secret']
  if (secret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const now = new Date()
  const { data: businesses } = await supabase.from('businesses').select('id, base_url')
  const results = { sent: 0, skipped: 0, failed: 0 }

  for (const biz of (businesses || [])) {
    const BUSINESS_ID = biz.id
    const baseBookingUrl = `${biz.base_url || 'https://luis-mobile-detailing.vercel.app'}/#booking`
    const promo = await getActivePromo(BUSINESS_ID)

    for (const [serviceKey, days] of Object.entries(REBOOKING_WINDOWS)) {
      const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString()
      const tooOld = new Date(now.getTime() - days * 2 * 24 * 60 * 60 * 1000).toISOString()

      const { data: bookings, error } = await supabase
        .from('bookings')
        .select('id, customer_id, name, email, service, completed_at')
        .eq('business_id', BUSINESS_ID)
        .eq('status', 'completed')
        .ilike('service', `%${serviceKey}%`)
        .lte('completed_at', cutoff)
        .gte('completed_at', tooOld)

      if (error) {
        console.error(`rebooking-email query error for ${BUSINESS_ID}/${serviceKey}:`, error)
        continue
      }

      for (const booking of (bookings || [])) {
        if (!booking.email) continue

        const { data: activeBooking } = await supabase
          .from('bookings')
          .select('id')
          .eq('business_id', BUSINESS_ID)
          .eq('customer_id', booking.customer_id)
          .in('status', ['confirmed', 'pending'])
          .gt('id', booking.id)
          .limit(1)
          .maybeSingle()

        if (activeBooking) { results.skipped++; continue }

        const { data: alreadySent } = await supabase
          .from('outbound_calls')
          .select('id')
          .eq('business_id', BUSINESS_ID)
          .eq('booking_id', booking.id)
          .eq('call_type', 'rebooking_email')
          .limit(1)
          .maybeSingle()

        if (alreadySent) { results.skipped++; continue }

        try {
          await sendRebookingEmail({
            email: booking.email,
            name: booking.name,
            service: booking.service,
            vehicle: null,
            promoCode: promo?.shared_code || null,
            promoDesc: promoLabel(promo),
            bookingUrl: baseBookingUrl,
          })

          await supabase.from('outbound_calls').insert({
            booking_id: booking.id,
            customer_id: booking.customer_id,
            call_type: 'rebooking_email',
            business_id: BUSINESS_ID,
          })

          results.sent++
        } catch (err) {
          console.error(`rebooking-email failed for booking ${booking.id}:`, err.message)
          results.failed++
        }
      }
    }
  }

  return res.status(200).json(results)
}
