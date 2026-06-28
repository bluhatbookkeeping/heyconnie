const { createClient } = require('@supabase/supabase-js')
const { Resend } = require('resend')

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const resend = new Resend(process.env.RESEND_API_KEY)

function generateCode(length = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < length; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

// Find (or lazily create) a 100%-off promotion backing each loyalty program.
// Returns the promotion id, or null on failure.
async function getOrCreateLoyaltyPromotion(program) {
  const promoName = `[Loyalty] ${program.name}`

  const { data: existing } = await supabase
    .from('promotions')
    .select('id')
    .eq('business_id', program.business_id)
    .eq('name', promoName)
    .maybeSingle()

  if (existing) return existing.id

  const { data: created, error } = await supabase
    .from('promotions')
    .insert({
      business_id: program.business_id,
      name: promoName,
      discount_type: 'percent',
      discount_value: 100,
      code_type: 'unique',
      one_time_per_customer: false,
      applicable_services: program.applicable_services || null,
      active: true,
    })
    .select('id')
    .single()

  if (error) { console.error('Failed to create loyalty promotion:', error); return null }
  return created.id
}

// Generate a unique reward code tied to the loyalty promotion and insert it.
// Returns the code string, or null on failure.
async function generateRewardCode(program, customerId) {
  const promotionId = await getOrCreateLoyaltyPromotion(program)
  if (!promotionId) return null

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = 'RWRD-' + generateCode(6)
    const { error } = await supabase
      .from('promo_codes')
      .insert({
        promotion_id: promotionId,
        business_id: program.business_id,
        code,
        customer_id: customerId || null,
      })
    if (!error) return code
    if (error.code !== '23505') { console.error('Code insert error:', error); return null }
    // 23505 = unique violation — regenerate
  }
  return null
}

// Insert punches for a completed booking across all matching active programs.
// Idempotent — UNIQUE(booking_id, program_id) prevents duplicates.
// Returns array of punch results, one per matching program.
async function insertPunchForBooking({ bookingId, businessId, customerId, customerEmail, customerName, service }) {
  if (!customerId) return []

  const { data: programs } = await supabase
    .from('loyalty_programs')
    .select('*')
    .eq('business_id', businessId)
    .eq('active', true)

  if (!programs?.length) return []

  const applicable = programs.filter(p => {
    if (!p.applicable_services || !p.applicable_services.length) return true
    return p.applicable_services.some(s => s.toLowerCase() === service?.toLowerCase())
  })

  if (!applicable.length) return []

  const results = []
  for (const program of applicable) {
    const { data: existing } = await supabase
      .from('loyalty_punches')
      .select('id')
      .eq('booking_id', bookingId)
      .eq('loyalty_program_id', program.id)
      .maybeSingle()

    if (existing) { results.push({ punched: false, reason: 'already_punched', program: program.name }); continue }

    const { error: insertError } = await supabase
      .from('loyalty_punches')
      .insert({
        business_id: businessId,
        loyalty_program_id: program.id,
        customer_id: customerId,
        booking_id: bookingId,
      })

    if (insertError) {
      if (insertError.code === '23505') { results.push({ punched: false, reason: 'already_punched', program: program.name }); continue }
      console.error('Punch insert error:', insertError)
      results.push({ punched: false, reason: insertError.message, program: program.name })
      continue
    }

    const { count } = await supabase
      .from('loyalty_punches')
      .select('id', { count: 'exact', head: true })
      .eq('loyalty_program_id', program.id)
      .eq('customer_id', customerId)
      .eq('redeemed', false)

    const punchCount = count || 0

    if (punchCount >= program.required_visits) {
      const rewardCode = await generateRewardCode(program, customerId)
      await sendRewardEmails({ program, customerEmail, customerName, punchCount, rewardCode })
    }

    results.push({ punched: true, punchCount, required: program.required_visits, reward: program.reward_description, program: program.name })
  }

  return results
}

async function sendRewardEmails({ program, customerEmail, customerName, punchCount, rewardCode }) {
  const notificationEmail = process.env.NOTIFICATION_EMAIL

  const codeNote = rewardCode
    ? `<p>Their reward code is <strong style="font-size:20px;letter-spacing:2px">${rewardCode}</strong> — it's already in the system and ready to redeem.</p>`
    : `<p>Honor this reward at their next appointment.</p>`

  const luisHtml = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#1d4ed8">Loyalty Reward Earned — Luis Mobile Detail</h2>
      <p><strong>${customerName}</strong> just completed their ${punchCount}${ordinal(punchCount)} visit and earned:</p>
      <p style="font-size:18px;font-weight:bold;color:#7c3aed">${program.reward_description}</p>
      ${codeNote}
      <br><p style="color:#666">— Luis Mobile Detail Admin</p>
    </div>
  `

  const customerCodeNote = rewardCode
    ? `<p>Your reward code is:</p>
       <p style="font-size:24px;font-weight:bold;letter-spacing:3px;color:#7c3aed;background:#f3e8ff;padding:12px 20px;display:inline-block;border-radius:8px">${rewardCode}</p>
       <p>Book your next appointment and it will be applied automatically:</p>
       <p><a href="https://luis-mobile-detailing.vercel.app/?promo=${rewardCode}#book" style="display:inline-block;background:#1d4ed8;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin-top:4px">Book Now — Reward Applied</a></p>`
    : `<p>Luis will honor this reward at your next appointment. Just mention it when you book!</p>`

  const customerHtml = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#1d4ed8">You earned a free reward! 🎉</h2>
      <p>Hi ${customerName},</p>
      <p>Congratulations — you've completed <strong>${punchCount} visits</strong> and earned:</p>
      <p style="font-size:18px;font-weight:bold;color:#7c3aed">${program.reward_description}</p>
      ${customerCodeNote}
      <p>Questions? Call or text Luis at <strong>626-409-3147</strong>.</p>
      <br><p style="color:#666">— Luis Mobile Detail<br>San Gabriel Valley, CA</p>
    </div>
  `

  try {
    const sends = [
      resend.emails.send({
        from: 'bookings@svcvoice.com',
        to: notificationEmail,
        subject: `Loyalty reward: ${customerName} earned ${program.reward_description}`,
        html: luisHtml,
      }),
    ]
    if (customerEmail) {
      sends.push(resend.emails.send({
        from: 'bookings@svcvoice.com',
        to: customerEmail,
        subject: 'You earned a free reward at Luis Mobile Detail!',
        html: customerHtml,
      }))
    }
    await Promise.all(sends)
  } catch (e) {
    console.error('Reward email error:', e)
  }
}

async function sendRewardGivenEmail({ customerName, customerPhone, rewardDescription, givenAt }) {
  const notificationEmail = process.env.NOTIFICATION_EMAIL
  const dateStr = new Date(givenAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#1d4ed8">Reward Given — Luis Mobile Detail</h2>
      <table style="width:100%;border-collapse:collapse">
        <tr><td style="padding:6px 0;font-weight:bold;width:140px">Customer</td><td>${customerName}</td></tr>
        <tr><td style="padding:6px 0;font-weight:bold">Phone</td><td>${customerPhone || '—'}</td></tr>
        <tr><td style="padding:6px 0;font-weight:bold">Reward</td><td style="color:#7c3aed;font-weight:bold">${rewardDescription}</td></tr>
        <tr><td style="padding:6px 0;font-weight:bold">Date Given</td><td>${dateStr}</td></tr>
      </table>
      <p style="color:#666;margin-top:16px">Their punch cycle has been reset — they start fresh toward the next reward.</p>
      <br><p style="color:#666">— Luis Mobile Detail Admin</p>
    </div>
  `

  try {
    await resend.emails.send({
      from: 'bookings@svcvoice.com',
      to: notificationEmail,
      subject: `Reward given: ${customerName} — ${rewardDescription}`,
      html,
    })
  } catch (e) {
    console.error('Reward given email error:', e)
  }
}

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return s[(v - 20) % 10] || s[v] || s[0]
}

module.exports = { insertPunchForBooking, sendRewardGivenEmail }
