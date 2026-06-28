const { createClient } = require('@supabase/supabase-js')
const { Resend } = require('resend')
const twilio = require('twilio')

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const resend = new Resend(process.env.RESEND_API_KEY)

const VAPI_BASE = 'https://api.vapi.ai'

function firstName(name) {
  return (name || 'there').split(' ')[0]
}

async function triggerReviewCall({ phone, name, service, googleReviewUrl, yelpReviewUrl }) {
  const body = {
    assistantId: process.env.VAPI_OUTBOUND_ASSISTANT_ID,
    phoneNumberId: process.env.VAPI_PHONE_NUMBER_ID,
    customer: { number: phone },
    assistantOverrides: {
      variableValues: {
        customer_name: name || 'there',
        service,
        google_review_url: googleReviewUrl,
        vapi_number: '626-654-1924',
      },
      firstMessage: `Hey ${firstName(name)}, it's Luis Mobile Detail following up on your ${service}. Hope the car is looking great! If you have 30 seconds, leaving us a${googleReviewUrl && yelpReviewUrl ? ' Google or Yelp' : googleReviewUrl ? ' Google' : ' Yelp'} review would really help Luis out. Want me to text you the link?`,
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

async function sendReviewSMS(phone, name, googleReviewUrl, yelpReviewUrl) {
  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  await client.messages.create({
    body: `Hey ${firstName(name)}! Here's the link to leave Luis a review — takes 30 seconds and helps a ton:${googleReviewUrl ? `\nGoogle: ${googleReviewUrl}` : ''}${yelpReviewUrl ? `\nYelp: ${yelpReviewUrl}` : ''}\nThanks!`,
    from: process.env.TWILIO_FROM_NUMBER,
    to: phone,
  })
}

async function sendReviewEmail({ email, name, service, googleReviewUrl, yelpReviewUrl }) {
  const fn = firstName(name)
  await resend.emails.send({
    from: 'bookings@svcvoice.com',
    to: email,
    subject: `How did we do, ${fn}?`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a">
        <h2 style="color:#1d4ed8">How was your ${service}, ${fn}?</h2>
        <p>We hope your car is looking great! If you have 30 seconds, leaving Luis a review would mean the world to him — it helps other neighbors in the San Gabriel Valley find him.</p>
        <div style="text-align:center;margin:28px 0">
          ${googleReviewUrl ? `<a href="${googleReviewUrl}" style="display:inline-block;background:#1d4ed8;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px">Leave a Google Review</a>` : ''}
          ${yelpReviewUrl ? `<br><a href="${yelpReviewUrl}" style="display:inline-block;margin-top:12px;${googleReviewUrl ? 'color:#d32323;font-weight:600;font-size:14px;text-decoration:underline' : 'background:#d32323;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px'}">Leave a Yelp Review</a>` : ''}
        </div>
        <p style="color:#6b7280;font-size:14px">Takes about 30 seconds. Seriously means a lot.</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
        <p style="color:#9ca3af;font-size:12px">Questions? Call or text Luis at <strong>626-409-3147</strong>.<br>Luis Mobile Detail · San Gabriel Valley, CA</p>
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
  const windowStart = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString()
  const windowEnd   = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()

  const { data: businesses } = await supabase
    .from('businesses')
    .select('id, google_review_url, yelp_review_url')

  let calls = 0
  let emails = 0
  let suppressed = 0
  let failed = 0

  for (const biz of (businesses || [])) {
    const BUSINESS_ID = biz.id

    if (!biz.google_review_url && !biz.yelp_review_url) continue

    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('id, customer_id, name, phone, email, service, completed_at')
      .eq('business_id', BUSINESS_ID)
      .eq('status', 'completed')
      .gte('completed_at', windowStart)
      .lte('completed_at', windowEnd)
      .is('review_requested_at', null)

    if (error) {
      console.error(`review-requests query error for ${BUSINESS_ID}:`, error)
      continue
    }

    for (const booking of (bookings || [])) {
      const { data: dissatisfied } = await supabase
        .from('call_logs')
        .select('id')
        .eq('business_id', BUSINESS_ID)
        .eq('customer_id', booking.customer_id)
        .eq('outcome', 'dissatisfied')
        .limit(1)
        .maybeSingle()

      if (dissatisfied) {
        suppressed++
        await supabase
          .from('bookings')
          .update({ review_requested_at: new Date().toISOString() })
          .eq('id', booking.id)
        continue
      }

      if (booking.phone) {
        try {
          const call = await triggerReviewCall({
            phone: booking.phone,
            name: booking.name,
            service: booking.service,
            googleReviewUrl: biz.google_review_url,
            yelpReviewUrl: biz.yelp_review_url,
          })

          await supabase.from('outbound_calls').insert({
            booking_id: booking.id,
            customer_id: booking.customer_id,
            call_type: 'review_request',
            vapi_call_id: call.id || null,
            business_id: BUSINESS_ID,
          })

          calls++
        } catch (err) {
          console.error(`Review call failed for booking ${booking.id}:`, err.message)
          failed++
        }
      }

      if (booking.email) {
        try {
          await sendReviewEmail({
            email: booking.email,
            name: booking.name,
            service: booking.service,
            googleReviewUrl: biz.google_review_url,
            yelpReviewUrl: biz.yelp_review_url,
          })
          emails++
        } catch (err) {
          console.error(`Review email failed for booking ${booking.id}:`, err.message)
        }
      }

      await supabase
        .from('bookings')
        .update({ review_requested_at: new Date().toISOString() })
        .eq('id', booking.id)
    }
  }

  return res.status(200).json({ calls, emails, suppressed, failed })
}
