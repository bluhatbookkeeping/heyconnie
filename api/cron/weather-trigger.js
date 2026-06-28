/**
 * Weather trigger — fires daily at 8am PT (0 16 * * * UTC).
 * Logic: if it rained yesterday in Pasadena AND today's forecast is clear,
 * send a promo email to customers who booked in the last 90 days.
 *
 * Uses Open-Meteo (free, no API key).
 * Rate-limit: skips if a weather_promo outbound_calls row exists within 7 days
 * to avoid blasting customers on consecutive post-rain days.
 *
 * Email only — no voice call. Clean car = good time to book a wash.
 */

const { createClient } = require('@supabase/supabase-js')
const { Resend } = require('resend')

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const resend = new Resend(process.env.RESEND_API_KEY)


// Pasadena, CA
const LAT = 34.1478
const LON = -118.1445

// WMO weather codes < 3 = clear/mainly clear
function isClear(code) {
  return code < 3
}

async function getWeather() {
  const today = new Date()
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
  const yd = yesterday.toISOString().slice(0, 10)
  const td = today.toISOString().slice(0, 10)

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&daily=precipitation_sum,weathercode&timezone=America%2FLos_Angeles&start_date=${yd}&end_date=${td}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Open-Meteo error ${res.status}`)
  const json = await res.json()

  const dates = json.daily.time
  const precip = json.daily.precipitation_sum
  const codes  = json.daily.weathercode

  const ydIndex = dates.indexOf(yd)
  const tdIndex = dates.indexOf(td)

  return {
    rainedYesterday: ydIndex >= 0 && precip[ydIndex] > 2,
    clearToday:      tdIndex >= 0 && isClear(codes[tdIndex]),
    precipMm:        ydIndex >= 0 ? precip[ydIndex] : 0,
    todayCode:       tdIndex >= 0 ? codes[tdIndex] : null,
  }
}

async function recentWeatherPromo(businessId) {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { data } = await supabase
    .from('outbound_calls')
    .select('id')
    .eq('business_id', businessId)
    .eq('call_type', 'weather_promo')
    .gte('created_at', cutoff)
    .limit(1)
    .maybeSingle()
  return !!data
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

function firstName(name) {
  return (name || 'there').split(' ')[0]
}

async function sendWeatherEmail({ email, name, promoCode, promoDesc, bookingUrl }) {
  const fn = firstName(name)
  const bookingLink = promoCode
    ? `${bookingUrl}?promo=${encodeURIComponent(promoCode)}`
    : bookingUrl

  const promoBlock = promoCode ? `
    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px;margin:20px 0;text-align:center">
      <p style="margin:0 0 8px;font-weight:700;color:#1d4ed8">Post-rain special</p>
      <p style="margin:0;font-size:18px;font-weight:700">${promoDesc} with code <span style="color:#1d4ed8">${promoCode}</span></p>
    </div>
  ` : ''

  await resend.emails.send({
    from: 'bookings@svcvoice.com',
    to: email,
    subject: `The rain stopped — perfect time for a detail, ${fn}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a">
        <h2 style="color:#1d4ed8">Sun's back out in the SGV! ☀️</h2>
        <p>Hey ${fn}, after yesterday's rain your car could use some love. Luis is taking bookings today — it's the best time to get a wash before the dust settles back in.</p>
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

  // Check weather
  let weather
  try {
    weather = await getWeather()
  } catch (err) {
    console.error('weather-trigger: Open-Meteo fetch failed:', err.message)
    return res.status(500).json({ error: 'Weather API unavailable' })
  }

  if (!weather.rainedYesterday || !weather.clearToday) {
    return res.status(200).json({
      skipped: 'weather conditions not met',
      rainedYesterday: weather.rainedYesterday,
      clearToday: weather.clearToday,
    })
  }

  const { data: businesses } = await supabase.from('businesses').select('id, base_url')
  let sent = 0
  let failed = 0

  for (const biz of (businesses || [])) {
    const BUSINESS_ID = biz.id
    const bookingUrl = `${biz.base_url || 'https://luis-mobile-detailing.vercel.app'}/#booking`

    if (await recentWeatherPromo(BUSINESS_ID)) continue

    const promo = await getActivePromo(BUSINESS_ID)
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()

    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('id, customer_id, name, email, completed_at')
      .eq('business_id', BUSINESS_ID)
      .eq('status', 'completed')
      .gte('completed_at', cutoff)
      .not('email', 'is', null)
      .order('completed_at', { ascending: false })

    if (error) {
      console.error(`weather-trigger query error for ${BUSINESS_ID}:`, error)
      continue
    }

    const seen = new Set()
    const targets = (bookings || []).filter(b => {
      if (seen.has(b.customer_id)) return false
      seen.add(b.customer_id)
      return true
    })

    for (const booking of targets) {
      try {
        await sendWeatherEmail({
          email: booking.email,
          name: booking.name,
          promoCode: promo?.shared_code || null,
          promoDesc: promoLabel(promo),
          bookingUrl,
        })

        await supabase.from('outbound_calls').insert({
          booking_id: booking.id,
          customer_id: booking.customer_id,
          call_type: 'weather_promo',
          business_id: BUSINESS_ID,
        })

        sent++
      } catch (err) {
        console.error(`weather-trigger email failed for booking ${booking.id}:`, err.message)
        failed++
      }
    }
  }

  return res.status(200).json({
    sent,
    failed,
    weather: { precipMm: weather.precipMm, todayCode: weather.todayCode },
  })
}
