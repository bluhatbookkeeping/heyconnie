const { createClient } = require('@supabase/supabase-js')
const { Resend } = require('resend')

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const resend = new Resend(process.env.RESEND_API_KEY)

const SITE_URL = 'https://luis-mobile-detailing.vercel.app'

async function getUser(req) {
  const token = req.headers['authorization']?.replace('Bearer ', '')
  if (!token) return null
  const { data: { user }, error } = await supabase.auth.getUser(token)
  return error ? null : user
}

function generateCode(length = 8) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < length; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

// Resolve segment → list of { id, name, email, phone }
async function resolveSegment(bizId, segmentType, segmentConfig) {
  if (segmentType === 'manual_list') {
    const ids = segmentConfig.customer_ids || []
    if (!ids.length) return []
    const { data } = await supabase
      .from('customers')
      .select('id, name, email, phone')
      .eq('business_id', bizId)
      .in('id', ids)
    return data || []
  }

  if (segmentType === 'lapsed_days') {
    const days = segmentConfig.days || 60
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

    // Find customers whose most recent completed booking is older than cutoff
    const { data: bookings } = await supabase
      .from('bookings')
      .select('customer_id, start_datetime')
      .eq('business_id', bizId)
      .eq('status', 'completed')
      .not('customer_id', 'is', null)
      .order('start_datetime', { ascending: false })

    if (!bookings?.length) return []

    // Latest booking per customer
    const latestByCustomer = {}
    for (const b of bookings) {
      if (!latestByCustomer[b.customer_id]) latestByCustomer[b.customer_id] = b.start_datetime
    }

    const lapsedIds = Object.entries(latestByCustomer)
      .filter(([, dt]) => dt < cutoff)
      .map(([id]) => id)

    if (!lapsedIds.length) return []

    const { data } = await supabase
      .from('customers')
      .select('id, name, email, phone')
      .eq('business_id', bizId)
      .in('id', lapsedIds)
    return data || []
  }

  if (segmentType === 'service_type') {
    const service = segmentConfig.service
    const days = segmentConfig.lapsed_days || null
    if (!service) return []

    const query = supabase
      .from('bookings')
      .select('customer_id')
      .eq('business_id', bizId)
      .eq('service', service)
      .not('customer_id', 'is', null)

    if (days) {
      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
      query.lt('start_datetime', cutoff)
    }

    const { data: bookings } = await query
    if (!bookings?.length) return []

    const ids = [...new Set(bookings.map(b => b.customer_id))]
    const { data } = await supabase
      .from('customers')
      .select('id, name, email, phone')
      .eq('business_id', bizId)
      .in('id', ids)
    return data || []
  }

  if (segmentType === 'never_returned') {
    const days = segmentConfig.days || 30
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

    // Customers with exactly 1 completed booking older than cutoff
    const { data: bookings } = await supabase
      .from('bookings')
      .select('customer_id')
      .eq('business_id', bizId)
      .eq('status', 'completed')
      .not('customer_id', 'is', null)

    if (!bookings?.length) return []

    const countByCustomer = {}
    for (const b of bookings) {
      countByCustomer[b.customer_id] = (countByCustomer[b.customer_id] || 0) + 1
    }

    const oneTimeIds = Object.entries(countByCustomer)
      .filter(([, count]) => count === 1)
      .map(([id]) => id)

    if (!oneTimeIds.length) return []

    // Confirm their single booking is older than cutoff
    const { data: old } = await supabase
      .from('bookings')
      .select('customer_id, start_datetime')
      .eq('business_id', bizId)
      .eq('status', 'completed')
      .in('customer_id', oneTimeIds)
      .lt('start_datetime', cutoff)

    const qualifiedIds = [...new Set((old || []).map(b => b.customer_id))]
    if (!qualifiedIds.length) return []

    const { data } = await supabase
      .from('customers')
      .select('id, name, email, phone')
      .eq('business_id', bizId)
      .in('id', qualifiedIds)
    return data || []
  }

  return []
}

// Send a single campaign_send row via email
async function sendEmail(send, campaign, promo) {
  const firstName = (send.customer_name || 'there').split(' ')[0]
  const discountLine = promo
    ? (promo.discount_type === 'percent'
        ? `${promo.discount_value}% off`
        : `$${promo.discount_value} off`)
    : null

  const promoSection = send.promo_code
    ? `<div style="background:#eff6ff;border:2px dashed #1d4ed8;border-radius:8px;padding:20px;text-align:center;margin:24px 0">
        <div style="font-size:13px;color:#1d4ed8;font-weight:600;margin-bottom:8px">YOUR PROMO CODE</div>
        <div style="font-size:28px;font-weight:700;letter-spacing:3px;color:#1a1a1a">${send.promo_code}</div>
        ${discountLine ? `<div style="font-size:14px;color:#374151;margin-top:8px">${discountLine} · Use at checkout</div>` : ''}
      </div>`
    : ''

  const bookingUrl = send.promo_code ? `${SITE_URL}?promo=${send.promo_code}` : SITE_URL

  await resend.emails.send({
    from: 'Luis Mobile Detail <bookings@svcvoice.com>',
    to: send.customer_email,
    subject: `Hey ${firstName} — ${campaign.name}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a">
        <div style="background:#0f172a;padding:24px;border-radius:8px 8px 0 0">
          <h1 style="color:#fff;margin:0;font-size:22px">Luis Mobile Detail</h1>
          <p style="color:#94a3b8;margin:4px 0 0;font-size:14px">San Gabriel Valley's Mobile Detailing</p>
        </div>
        <div style="padding:32px 24px;background:#fff;border:1px solid #e5e7eb;border-top:none">
          <h2 style="margin:0 0 16px;font-size:20px">Hey ${firstName} 👋</h2>
          <p style="color:#374151;line-height:1.6">It's been a while! Luis wanted to reach out personally with a special offer just for you.</p>
          ${promoSection}
          <div style="text-align:center;margin:24px 0">
            <a href="${bookingUrl}" style="display:inline-block;background:#1d4ed8;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:600;font-size:16px">Book Your Detail →</a>
          </div>
          <p style="color:#6b7280;font-size:13px">Or call/text Luis directly: <strong>(626) 654-1924</strong></p>
        </div>
        <div style="padding:16px 24px;background:#f8f9fa;border-radius:0 0 8px 8px;font-size:12px;color:#9ca3af">
          Luis Mobile Detail · Serving the San Gabriel Valley · Pasadena, West Covina, El Monte, Pomona &amp; more
        </div>
      </div>
    `,
  })
}

// Send via SMS using Twilio
async function sendSMS(send, campaign, promo) {
  const twilio = require('twilio')
  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)

  const firstName = (send.customer_name || 'there').split(' ')[0]
  const discountLine = promo
    ? (promo.discount_type === 'percent' ? `${promo.discount_value}% off` : `$${promo.discount_value} off`)
    : null

  let body = `Hey ${firstName}! It's Luis from Luis Mobile Detail.`
  if (discountLine && send.promo_code) {
    body += ` I wanted to give you ${discountLine} on your next detail — use code ${send.promo_code}.`
  }
  body += ` Book here: ${SITE_URL}`
  if (send.promo_code) body += `?promo=${send.promo_code}`
  body += ` · (626) 654-1924`

  await client.messages.create({
    body,
    from: process.env.TWILIO_FROM_NUMBER,
    to: send.customer_phone,
  })
}

// Initiate outbound Vapi call
async function sendVapiCall(send, campaign, promo) {
  const discountLine = promo
    ? (promo.discount_type === 'percent' ? `${promo.discount_value}% off` : `$${promo.discount_value} off`)
    : null

  const offerText = discountLine
    ? `I have a special offer for you — ${discountLine} on your next detail${send.promo_code ? `, and your promo code is ${send.promo_code}` : ''}.`
    : `I have a special offer for you on your next detail.`

  const response = await fetch('https://api.vapi.ai/call/phone', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.VAPI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      assistantId: process.env.VAPI_OUTBOUND_ASSISTANT_ID,
      phoneNumberId: process.env.VAPI_PHONE_NUMBER_ID,
      customer: {
        number: send.customer_phone,
        name: send.customer_name || undefined,
      },
      assistantOverrides: {
        variableValues: {
          customerName: (send.customer_name || 'there').split(' ')[0],
          campaignName: campaign.name,
          offerText,
          promoCode: send.promo_code || '',
          bookingUrl: send.promo_code ? `${SITE_URL}?promo=${send.promo_code}` : SITE_URL,
        },
      },
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Vapi call failed: ${err}`)
  }
}

// Execute pending sends for a campaign
async function executeSends(campaignId, bizId) {
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('*, promotions(*)')
    .eq('id', campaignId)
    .single()

  if (!campaign) return

  await supabase.from('campaigns').update({ status: 'sending' }).eq('id', campaignId)

  const { data: sends } = await supabase
    .from('campaign_sends')
    .select('*')
    .eq('campaign_id', campaignId)
    .eq('status', 'pending')

  if (!sends?.length) {
    await supabase.from('campaigns').update({ status: 'sent' }).eq('id', campaignId)
    return
  }

  const promo = campaign.promotions || null
  let sentCount = 0

  for (const send of sends) {
    const updates = { sent_at: new Date().toISOString() }
    try {
      if (send.channel_used === 'email' && send.customer_email) {
        await sendEmail(send, campaign, promo)
        updates.status = 'sent'
        sentCount++
      } else if (send.channel_used === 'sms' && send.customer_phone) {
        await sendSMS(send, campaign, promo)
        updates.status = 'sent'
        sentCount++
      } else if (send.channel_used === 'vapi' && send.customer_phone) {
        await sendVapiCall(send, campaign, promo)
        updates.status = 'called'
        sentCount++
      } else {
        updates.status = 'failed'
        updates.error_text = 'Missing contact info for channel'
      }
    } catch (err) {
      updates.status = 'failed'
      updates.error_text = err.message?.slice(0, 500) || 'Unknown error'
      console.error(`Campaign send error [${send.id}]:`, err.message)
    }

    await supabase.from('campaign_sends').update(updates).eq('id', send.id)
  }

  await supabase
    .from('campaigns')
    .update({ status: 'sent', sent_count: sentCount })
    .eq('id', campaignId)
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') return res.status(200).end()

  const user = await getUser(req)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  const bizId = req.query.business
  if (!bizId) return res.status(400).json({ error: 'Missing required query param: business' })

  // ── GET /api/admin/campaigns — list all ───────────────────────────────
  if (req.method === 'GET' && !req.query.action) {
    const { data, error } = await supabase
      .from('campaigns')
      .select('*, promotions(name, discount_type, discount_value)')
      .eq('business_id', bizId)
      .order('created_at', { ascending: false })

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ campaigns: data || [] })
  }

  // ── GET /api/admin/campaigns?action=preview — dry run ─────────────────
  if (req.method === 'GET' && req.query.action === 'preview') {
    const { segment_type, segment_config } = req.query
    let config = {}
    try { config = JSON.parse(segment_config || '{}') } catch (_) {}

    const customers = await resolveSegment(bizId, segment_type, config)
    return res.status(200).json({ count: customers.length, customers: customers.slice(0, 50) })
  }

  // ── POST /api/admin/campaigns — create + queue ─────────────────────────
  if (req.method === 'POST') {
    const { name, segment_type, segment_config, promotion_id, channel, scheduled_at } = req.body

    if (!name || !segment_type || !channel) {
      return res.status(400).json({ error: 'Missing required fields: name, segment_type, channel' })
    }

    // Resolve segment
    const customers = await resolveSegment(bizId, segment_type, segment_config || {})
    if (!customers.length) {
      return res.status(400).json({ error: 'No customers match this segment' })
    }

    // Determine status
    const isScheduled = !!scheduled_at
    const status = isScheduled ? 'scheduled' : 'draft'

    // Create campaign row
    const { data: campaign, error: campaignErr } = await supabase
      .from('campaigns')
      .insert({
        business_id: bizId,
        name: name.trim(),
        segment_type,
        segment_config: segment_config || {},
        promotion_id: promotion_id || null,
        channel,
        scheduled_at: scheduled_at || null,
        status,
        sent_count: 0,
      })
      .select()
      .single()

    if (campaignErr) return res.status(500).json({ error: campaignErr.message })

    // Determine channels to create sends for
    const channels = channel === 'all' ? ['email', 'sms', 'vapi'] : [channel]

    // Assign unique promo codes if promotion has unique codes available
    let availableCodes = []
    if (promotion_id) {
      const { data: promo } = await supabase
        .from('promotions')
        .select('code_type, shared_code')
        .eq('id', promotion_id)
        .single()

      if (promo?.code_type === 'unique') {
        // Try to find unassigned codes first
        const { data: existing } = await supabase
          .from('promo_codes')
          .select('id, code')
          .eq('promotion_id', promotion_id)
          .eq('redeemed', false)
          .is('customer_id', null)
          .limit(customers.length)

        // Generate new codes if not enough pre-existing
        const needed = customers.length - (existing?.length || 0)
        let newCodes = []
        if (needed > 0) {
          const toInsert = []
          const seen = new Set((existing || []).map(c => c.code))
          while (toInsert.length < needed) {
            const code = generateCode()
            if (!seen.has(code)) { seen.add(code); toInsert.push({ promotion_id, business_id: bizId, code }) }
          }
          const { data: inserted } = await supabase.from('promo_codes').insert(toInsert).select('id, code')
          newCodes = inserted || []
        }

        availableCodes = [...(existing || []), ...newCodes]
      } else if (promo?.code_type === 'shared' && promo.shared_code) {
        // All customers get the same code — we don't need promo_code rows per customer
        availableCodes = customers.map(() => ({ id: null, code: promo.shared_code }))
      }
    }

    // Build campaign_sends rows
    const sendRows = []
    customers.forEach((customer, idx) => {
      const codeEntry = availableCodes[idx] || null
      for (const ch of channels) {
        sendRows.push({
          campaign_id: campaign.id,
          business_id: bizId,
          customer_id: customer.id,
          customer_name: customer.name,
          customer_email: customer.email,
          customer_phone: customer.phone,
          channel_used: ch,
          promo_code_id: codeEntry?.id || null,
          promo_code: codeEntry?.code || null,
          status: 'pending',
        })
      }
    })

    const { error: sendsErr } = await supabase.from('campaign_sends').insert(sendRows)
    if (sendsErr) return res.status(500).json({ error: sendsErr.message })

    // Fire immediately if not scheduled (async — don't await)
    if (!isScheduled) {
      executeSends(campaign.id, bizId).catch(err => console.error('executeSends error:', err))
    }

    return res.status(201).json({ campaign, customer_count: customers.length, scheduled: isScheduled })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

// Export for use by the cron
module.exports.executeSends = executeSends
