/**
 * Review drip — fires daily at 10am PT (0 18 * * * UTC).
 * Sends a follow-up email to customers where:
 *   - review_requested_at is between 3–7 days ago
 *   - review_drip_sent_at IS NULL (haven't gotten the drip yet)
 *
 * We can't know if they actually left a review, so this fires once
 * as a gentle reminder with both review links.
 *
 * Requires: bookings.review_drip_sent_at column (see supabase/migrations/)
 */

const { createClient } = require('@supabase/supabase-js')
const { Resend } = require('resend')

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const resend = new Resend(process.env.RESEND_API_KEY)

function firstName(name) {
  return (name || 'there').split(' ')[0]
}

async function sendDripEmail({ email, name, service, googleReviewUrl, yelpReviewUrl }) {
  const fn = firstName(name)
  const GOOGLE_REVIEW_URL = googleReviewUrl
  const YELP_REVIEW_URL   = yelpReviewUrl
  const hasGoogle = !!GOOGLE_REVIEW_URL
  const hasYelp   = !!YELP_REVIEW_URL

  await resend.emails.send({
    from: 'bookings@svcvoice.com',
    to: email,
    subject: `Still loving your ${service}, ${fn}?`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a">
        <h2 style="color:#1d4ed8">Just a quick reminder, ${fn}!</h2>
        <p>We reached out a few days ago about leaving Luis a review after your ${service}. If you haven't had a chance yet, it only takes about 30 seconds — and it genuinely helps Luis grow his business in the San Gabriel Valley.</p>
        <div style="text-align:center;margin:28px 0">
          ${hasGoogle ? `<a href="${GOOGLE_REVIEW_URL}" style="display:inline-block;background:#1d4ed8;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px">Leave a Google Review</a>` : ''}
          ${hasYelp ? `<br><a href="${YELP_REVIEW_URL}" style="display:inline-block;margin-top:12px;${hasGoogle ? 'color:#d32323;font-weight:600;font-size:14px;text-decoration:underline' : 'background:#d32323;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px'}">Leave a Yelp Review</a>` : ''}
        </div>
        <p style="color:#6b7280;font-size:14px">This is the last reminder we'll send — promise!</p>
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
  const windowStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const windowEnd   = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString()

  const { data: businesses } = await supabase
    .from('businesses')
    .select('id, google_review_url, yelp_review_url')

  let sent = 0
  let failed = 0

  for (const biz of (businesses || [])) {
    const BUSINESS_ID = biz.id

    if (!biz.google_review_url && !biz.yelp_review_url) continue

    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('id, name, email, service')
      .eq('business_id', BUSINESS_ID)
      .not('review_requested_at', 'is', null)
      .gte('review_requested_at', windowStart)
      .lte('review_requested_at', windowEnd)
      .is('review_drip_sent_at', null)

    if (error) {
      console.error(`review-drip query error for ${BUSINESS_ID}:`, error)
      continue
    }

    for (const booking of (bookings || [])) {
      if (!booking.email) continue

      try {
        await sendDripEmail({
          email: booking.email,
          name: booking.name,
          service: booking.service,
          googleReviewUrl: biz.google_review_url,
          yelpReviewUrl: biz.yelp_review_url,
        })
        await supabase
          .from('bookings')
          .update({ review_drip_sent_at: new Date().toISOString() })
          .eq('id', booking.id)
        sent++
      } catch (err) {
        console.error(`review-drip email failed for booking ${booking.id}:`, err.message)
        failed++
      }
    }
  }

  return res.status(200).json({ sent, failed })
}
