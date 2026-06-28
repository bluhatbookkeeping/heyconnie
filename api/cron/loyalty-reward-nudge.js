const { createClient } = require('@supabase/supabase-js')
const { Resend } = require('resend')

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const resend = new Resend(process.env.RESEND_API_KEY)

function bookingUrl(code, siteUrl) {
  return `${siteUrl || 'https://luis-mobile-detailing.vercel.app'}/?promo=${code}#book`
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function firstName(name) {
  return (name || 'there').split(' ')[0]
}

function rewardBox(code) {
  return `
    <div style="background:#f3e8ff;border:2px solid #7c3aed;border-radius:10px;padding:16px 20px;margin:20px 0;text-align:center">
      <div style="color:#6d28d9;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Your Reward Code</div>
      <div style="font-family:monospace;font-size:26px;font-weight:700;color:#7c3aed;letter-spacing:3px">${code}</div>
    </div>
  `
}

function ctaButton(code, siteUrl) {
  return `
    <a href="${bookingUrl(code, siteUrl)}" style="display:inline-block;background:#1d4ed8;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;margin-top:8px">
      Book Now — Reward Applied Automatically
    </a>
  `
}

function unsubscribeLink(customerId, siteUrl) {
  return `<a href="${siteUrl || 'https://luis-mobile-detailing.vercel.app'}/api/unsubscribe?cid=${customerId}&type=loyalty" style="color:#9ca3af">Unsubscribe from reward reminders</a>`
}

function emailShell(body, customerId, siteUrl) {
  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a">
      ${body}
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0">
      <p style="color:#9ca3af;font-size:12px">Questions? Call or text Luis at <strong>626-409-3147</strong>.<br>Luis Mobile Detail · San Gabriel Valley, CA<br><br>${customerId ? unsubscribeLink(customerId, siteUrl) : ''}</p>
    </div>
  `
}

function buildEmail(type, { customerName, rewardDescription, code, expiryDate, customerId, siteUrl }) {
  const name = firstName(customerName)

  if (type === 'expiry') {
    return {
      subject: `Your free ${rewardDescription} expires ${formatDate(expiryDate)} — use it before it's gone`,
      html: emailShell(`
        <h2 style="color:#dc2626">Your reward expires soon, ${name}</h2>
        <p>Just a heads up — your free <strong>${rewardDescription}</strong> expires on <strong>${formatDate(expiryDate)}</strong>.</p>
        <p>You earned this reward by being a loyal customer. Don't let it go to waste!</p>
        ${rewardBox(code)}
        ${ctaButton(code, siteUrl)}
        <p style="color:#6b7280;font-size:13px;margin-top:16px">Or just mention it to Luis when you call — he'll take care of you.</p>
      `, customerId, siteUrl),
    }
  }

  if (type === 30) {
    return {
      subject: `Your free ${rewardDescription} is waiting for you`,
      html: emailShell(`
        <h2 style="color:#1d4ed8">Hey ${name}, your reward is ready</h2>
        <p>You earned a <strong>${rewardDescription}</strong> on your last visit — and it's still sitting here waiting for you.</p>
        <p>When you're ready to book your next wash or detail, just use your code below and it'll apply automatically.</p>
        ${rewardBox(code)}
        ${ctaButton(code, siteUrl)}
        <p style="color:#6b7280;font-size:13px;margin-top:16px">No rush — just wanted to make sure you knew it was there.</p>
      `, customerId, siteUrl),
    }
  }

  if (type === 60) {
    return {
      subject: `Luis wanted to check in — your reward is still here`,
      html: emailShell(`
        <h2 style="color:#1d4ed8">It's been a little while, ${name}</h2>
        <p>Luis noticed you haven't booked in a bit — and wanted to remind you that your free <strong>${rewardDescription}</strong> is still here whenever you're ready.</p>
        <p>Your car deserves some love. Use your reward code below to book:</p>
        ${rewardBox(code)}
        ${ctaButton(code, siteUrl)}
        <p style="color:#6b7280;font-size:13px;margin-top:16px">Luis serves all of the San Gabriel Valley — Pasadena, West Covina, El Monte, Pomona, and surrounding cities.</p>
      `, customerId, siteUrl),
    }
  }

  if (type === 90) {
    return {
      subject: `One last reminder — your free ${rewardDescription} is still here`,
      html: emailShell(`
        <h2 style="color:#1d4ed8">One last reminder, ${name}</h2>
        <p>We don't want to keep bugging you — but your free <strong>${rewardDescription}</strong> has been waiting 3 months now.</p>
        <p>Whenever you're ready to get the car detailed, it's yours. No strings attached.</p>
        ${rewardBox(code)}
        ${ctaButton(code, siteUrl)}
        <p style="color:#6b7280;font-size:13px;margin-top:16px">After this we'll give you some space — but the reward stays valid for another 3 months.</p>
      `, customerId, siteUrl),
    }
  }

  // 180 days — final email, code expires after this send
  return {
    subject: `We're letting your reward go, ${name}`,
    html: emailShell(`
      <h2 style="color:#6b7280">Hey ${name} — we're closing this one out</h2>
      <p>Your free <strong>${rewardDescription}</strong> has been waiting for 6 months. Life gets busy — we get it.</p>
      <p>We're going to retire this reward code, but we wanted to give you one final chance to use it first.</p>
      ${rewardBox(code)}
      ${ctaButton(code)}
      <p style="color:#6b7280;font-size:13px;margin-top:16px">If you ever come back for a detail, Luis would love to earn your next reward. He's out in the San Gabriel Valley every day — just give him a call at 626-409-3147.</p>
    `, customerId),
  }
}

async function sendNudge({ customerEmail, customerName, code, rewardDescription, emailType, expiryDate, promo_code_id, customer_id, milestoneDays, siteUrl, businessId }) {
  const { subject, html } = buildEmail(emailType, { customerName, rewardDescription, code, expiryDate, customerId: customer_id, siteUrl })

  try {
    await resend.emails.send({
      from: 'bookings@svcvoice.com',
      to: customerEmail,
      subject,
      html,
    })
  } catch (e) {
    console.error(`Reward nudge email error [${code}]:`, e)
    return false
  }

  // Record the send — unique constraint prevents duplicates on retry
  const { error } = await supabase.from('loyalty_reminders').insert({
    promo_code_id,
    business_id: businessId,
    customer_id: customer_id || null,
    milestone_days: milestoneDays,
  })

  if (error && error.code !== '23505') {
    console.error(`loyalty_reminders insert error [${code}]:`, error)
  }

  // Expire the code after the 180-day final email
  if (milestoneDays === 180) {
    await supabase
      .from('promo_codes')
      .update({ expired: true, expired_at: new Date().toISOString() })
      .eq('id', promo_code_id)
  }

  return true
}

module.exports = async function handler(req, res) {
  const secret = req.headers['x-admin-secret']
  if (secret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const now = new Date()
  let sent = 0

  const expiryWindowStart = new Date(now.getTime() + 29 * 24 * 60 * 60 * 1000).toISOString()
  const expiryWindowEnd   = new Date(now.getTime() + 31 * 24 * 60 * 60 * 1000).toISOString()

  const { data: businesses } = await supabase.from('businesses').select('id, base_url')

  for (const biz of (businesses || [])) {
    const BUSINESS_ID = biz.id
    const siteUrl = biz.base_url || 'https://luis-mobile-detailing.vercel.app'

    // ─── Pass A: Expiry warnings ───
    const { data: expiringCodes } = await supabase
      .from('promo_codes')
      .select('id, code, customer_id, promotion_id, promotions(name, valid_until), customers(name, email, loyalty_unsubscribed)')
      .eq('business_id', BUSINESS_ID)
      .eq('redeemed', false)
      .eq('expired', false)
      .like('code', 'RWRD-%')
      .not('customer_id', 'is', null)

    for (const row of (expiringCodes || [])) {
      if (row.customers?.loyalty_unsubscribed) continue

      const validUntil = row.promotions?.valid_until
      if (!validUntil) continue
      if (validUntil < expiryWindowStart || validUntil > expiryWindowEnd) continue

      const customerEmail = row.customers?.email
      if (!customerEmail) continue

      const { data: existing } = await supabase
        .from('loyalty_reminders')
        .select('id')
        .eq('promo_code_id', row.id)
        .eq('milestone_days', -30)
        .maybeSingle()

      if (existing) continue

      const ok = await sendNudge({
        customerEmail,
        customerName: row.customers?.name,
        code: row.code,
        rewardDescription: row.promotions?.name || 'free reward',
        emailType: 'expiry',
        expiryDate: validUntil,
        promo_code_id: row.id,
        customer_id: row.customer_id,
        milestoneDays: -30,
        siteUrl,
        businessId: BUSINESS_ID,
      })
      if (ok) sent++
    }

    // ─── Pass B: Re-engagement drip ───
    const MILESTONES = [30, 60, 90, 180]

    for (const days of MILESTONES) {
      const windowStart = new Date(now.getTime() - (days + 0.5) * 24 * 60 * 60 * 1000).toISOString()
      const windowEnd   = new Date(now.getTime() - (days - 0.5) * 24 * 60 * 60 * 1000).toISOString()

      const { data: codes } = await supabase
        .from('promo_codes')
        .select('id, code, customer_id, promotion_id, promotions(name, valid_until), customers(name, email, loyalty_unsubscribed)')
        .eq('business_id', BUSINESS_ID)
        .eq('redeemed', false)
        .eq('expired', false)
        .like('code', 'RWRD-%')
        .not('customer_id', 'is', null)
        .gte('created_at', windowStart)
        .lte('created_at', windowEnd)

      for (const row of (codes || [])) {
        if (row.promotions?.valid_until) continue
        if (row.customers?.loyalty_unsubscribed) continue

        const customerEmail = row.customers?.email
        if (!customerEmail) continue

        const { data: existing } = await supabase
          .from('loyalty_reminders')
          .select('id')
          .eq('promo_code_id', row.id)
          .eq('milestone_days', days)
          .maybeSingle()

        if (existing) continue

        const ok = await sendNudge({
          customerEmail,
          customerName: row.customers?.name,
          code: row.code,
          rewardDescription: row.promotions?.name || 'free reward',
          emailType: days,
          promo_code_id: row.id,
          customer_id: row.customer_id,
          milestoneDays: days,
          siteUrl,
          businessId: BUSINESS_ID,
        })
        if (ok) sent++
      }
    }
  }

  return res.status(200).json({ sent })
}
