/**
 * Activation nudge drip — fires daily at 8 AM PT (0 15 * * * UTC).
 * For every business that signed up but never completed onboarding
 * (profile_status = 'draft'), sends phone + email nudges at escalating
 * intervals until they complete setup or opt out.
 *
 * Milestone schedule:
 *   24h, 48h, 4d, 7d, 14d, 30d, 60d, 90d  →  phone + email
 *   month4, month5, month6                  →  email only
 *   quarter1, quarter2, ...                 →  email only (every 90d after month6)
 *
 * Phone calls only fire within business hours (from availability_windows).
 * If no hours are set, defaults to 9am–5pm in the business's timezone.
 * Email sends any time.
 *
 * Stop conditions: profile_status = 'review' | 'active', or activation_opted_out = true
 */

const { createClient } = require('@supabase/supabase-js')
const { Resend } = require('resend')

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const resend = new Resend(process.env.RESEND_API_KEY)

const SETUP_PHONE = '(818) 403-3447'
const SETUP_PHONE_BARE = '818-403-3447'
const VAPI_BASE = 'https://api.vapi.ai'

// All fixed milestones in order. Quarterly ones are generated dynamically below.
const FIXED_MILESTONES = [
  { key: '24h',    days: 1,   channels: ['phone', 'email'] },
  { key: '48h',    days: 2,   channels: ['phone', 'email'] },
  { key: '4d',     days: 4,   channels: ['phone', 'email'] },
  { key: '7d',     days: 7,   channels: ['phone', 'email'] },
  { key: '14d',    days: 14,  channels: ['phone', 'email'] },
  { key: '30d',    days: 30,  channels: ['phone', 'email'] },
  { key: '60d',    days: 60,  channels: ['phone', 'email'] },
  { key: '90d',    days: 90,  channels: ['phone', 'email'] },
  { key: 'month4', days: 120, channels: ['email'] },
  { key: 'month5', days: 150, channels: ['email'] },
  { key: 'month6', days: 180, channels: ['email'] },
]

// Generate quarterly milestones for days since signup beyond month 6.
// quarter1 = day 270 (month9), quarter2 = day 360 (month12), etc.
function getQuarterlyMilestones(daysSince) {
  const milestones = []
  let n = 1
  while (180 + n * 90 <= daysSince + 1) {
    milestones.push({ key: `quarter${n}`, days: 180 + n * 90, channels: ['email'] })
    n++
  }
  return milestones
}

function toE164(phone) {
  if (!phone) return null
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  return `+${digits}`
}

// ── Business hours gate ───────────────────────────────────────────────────────

// Returns true if the current moment is within the business's calling window.
// bizHours: array of { day_of_week, start_time, end_time } from availability_windows.
// timezone: IANA string from businesses.timezone.
// If no hours set, defaults to 9am–5pm in their timezone.
function isWithinBusinessHours(bizHours, timezone) {
  const tz = timezone || 'America/Los_Angeles'
  const now = new Date()

  // Get local time parts in the business's timezone
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: 'numeric',
    minute: 'numeric',
    weekday: 'short',
    hour12: false,
  }).formatToParts(now)

  const dayAbbr = parts.find(p => p.type === 'weekday')?.value
  const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10)
  const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10)
  const currentMinutes = hour * 60 + minute

  // Map weekday abbreviation to 0=Sun index
  const dayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  const todayIndex = dayMap[dayAbbr]

  // Default window: 9am–5pm (540–1020 minutes)
  const DEFAULT_START = 9 * 60
  const DEFAULT_END = 17 * 60

  if (!bizHours || bizHours.length === 0) {
    return currentMinutes >= DEFAULT_START && currentMinutes < DEFAULT_END
  }

  const todayHours = bizHours.find(h => h.day_of_week === todayIndex)
  if (!todayHours) return false // closed today

  const [startH, startM] = (todayHours.start_time || '09:00').split(':').map(Number)
  const [endH, endM] = (todayHours.end_time || '17:00').split(':').map(Number)
  const windowStart = startH * 60 + startM
  const windowEnd = endH * 60 + endM

  return currentMinutes >= windowStart && currentMinutes < windowEnd
}

// ── Phone call scripts ────────────────────────────────────────────────────────

function phoneScript(milestone, name, businessName, callCount = 0) {
  const n = name || 'there'
  const biz = businessName || 'your business'
  const x = callCount || 0
  switch (milestone) {
    case '24h':
      return x > 0
        ? `Hey ${n}! This is Connie from Hey Connie. Your AI receptionist just went live and she's already taken ${x} call${x > 1 ? 's' : ''}! Let's spend 10 minutes teaching her your services so she can start booking appointments directly instead of just taking messages. Call us back at ${SETUP_PHONE_BARE} anytime — we're ready when you are!`
        : `Hey ${n}! This is Connie from Hey Connie. Your AI receptionist is live and answering your phone right now! Let's spend 10 minutes teaching her your services so she's ready to book your very first call. Call us back at ${SETUP_PHONE_BARE} — it goes fast!`
    case '48h':
      return x > 0
        ? `Hey ${n}! This is Connie from Hey Connie. Your AI receptionist has already taken ${x} call${x > 1 ? 's' : ''} since you signed up! Right now she's just capturing names and numbers — let's spend 10 minutes teaching her your services so she can start booking appointments directly. Want to do it now?`
        : `Hey ${n}! This is Connie from Hey Connie. Your AI receptionist is live and answering your phone. Let's spend 10 minutes teaching her your services so when that first call comes in, she can book it. Ready?`
    case '4d':
    case '7d':
    case '14d':
      return `Hey ${n}, it's Connie. Your receptionist has handled ${x} call${x !== 1 ? 's' : ''} so far but she can't book appointments yet — she's just taking messages. Ten minutes on the phone with me and she'll start booking jobs directly. Want to knock it out? Call ${SETUP_PHONE_BARE}.`
    case '30d':
    case '60d':
    case '90d':
      return `Hey ${n}, Connie here. Your receptionist has taken ${x} call${x !== 1 ? 's' : ''} but she's still in message-only mode. Those callers had to wait for a callback instead of booking on the spot. Let's fix that — 10 minutes and she's fully live. Call ${SETUP_PHONE_BARE} whenever you're ready.`
    default:
      return null
  }
}

// ── Email content ─────────────────────────────────────────────────────────────

const EMAIL_CONTENT = {
  '24h': {
    subject: (name, biz, callCount) => callCount > 0
      ? `Your AI receptionist is live — and she already took ${callCount} call${callCount > 1 ? 's' : ''}!`
      : `Your AI receptionist is live right now`,
    headline: (name) => `You're all set, ${name || 'there'}!`,
    body: (name, biz, callCount) => callCount > 0 ? `
      <p style="margin:0 0 16px;font-size:15px;color:#444;line-height:1.7;">
        Your Hey Connie receptionist is already on the job — she's handled <strong>${callCount} call${callCount > 1 ? 's' : ''}</strong> since you signed up. Right now she's just capturing names and numbers.
      </p>
      <p style="margin:0 0 16px;font-size:15px;color:#444;line-height:1.7;">
        Spend 10 minutes with us and she'll start booking appointments directly. Call <strong>${SETUP_PHONE}</strong> to get started.
      </p>` : `
      <p style="margin:0 0 16px;font-size:15px;color:#444;line-height:1.7;">
        Your Hey Connie receptionist is live and ready to answer every call for <strong>${biz}</strong> — but right now she can only take messages.
      </p>
      <p style="margin:0 0 16px;font-size:15px;color:#444;line-height:1.7;">
        Call <strong>${SETUP_PHONE}</strong> to spend 10 minutes teaching her your services. After that, she books appointments on her own.
      </p>`,
  },
  '48h': {
    subject: (name, biz, callCount) => callCount > 0
      ? `Your AI receptionist took ${callCount} call${callCount > 1 ? 's' : ''} already`
      : `Your AI receptionist is live`,
    headline: (name) => `Hey ${name || 'there'}!`,
    body: (name, biz, callCount) => callCount > 0 ? `
      <p style="margin:0 0 16px;font-size:15px;color:#444;line-height:1.7;">
        ${name ? name + ', your' : 'Your'} Hey Connie receptionist is answering your phone — she's already handled <strong>${callCount} call${callCount > 1 ? 's' : ''}</strong>! Spend 10 minutes teaching her your services and she'll start booking directly.
      </p>
      <p style="margin:0 0 16px;font-size:15px;color:#444;line-height:1.7;">
        Call <strong>${SETUP_PHONE}</strong> to get started.
      </p>` : `
      <p style="margin:0 0 16px;font-size:15px;color:#444;line-height:1.7;">
        Your AI receptionist for <strong>${biz}</strong> is live and waiting for that first call. Spend 10 minutes teaching her your services and she'll be able to book it on the spot.
      </p>
      <p style="margin:0 0 16px;font-size:15px;color:#444;line-height:1.7;">
        Call <strong>${SETUP_PHONE}</strong> to get started.
      </p>`,
  },
  '4d': {
    subject: (name, biz, callCount) => callCount > 0
      ? `Your receptionist handled ${callCount} call${callCount > 1 ? 's' : ''} — but can't book yet`
      : `4 days in — your receptionist is ready for training`,
    headline: (name) => `She's answering, but she can't book`,
    body: (name, biz, callCount) => `
      <p style="margin:0 0 16px;font-size:15px;color:#444;line-height:1.7;">
        ${callCount > 0 ? `Your receptionist has already picked up <strong>${callCount} call${callCount > 1 ? 's' : ''}</strong> for ${biz}. Right now she's just capturing names and numbers — every one of those callers had to wait for you to call back.` : `It's been a few days since you signed up for Hey Connie.`}
      </p>
      <p style="margin:0 0 16px;font-size:15px;color:#444;line-height:1.7;">
        One 10-minute call teaches her your services so she books appointments directly — no more callbacks.
      </p>`,
  },
  '7d': {
    subject: (name, biz, callCount) => callCount > 0
      ? `1 week in — ${callCount} call${callCount > 1 ? 's' : ''} captured, 0 bookings`
      : `1 week since you signed up for Hey Connie`,
    headline: (name) => `One week in`,
    body: (name, biz, callCount) => `
      <p style="margin:0 0 16px;font-size:15px;color:#444;line-height:1.7;">
        ${callCount > 0 ? `Your AI receptionist has taken <strong>${callCount} call${callCount > 1 ? 's' : ''}</strong> this week for ${biz} — but she can't book appointments yet. Each of those callers had to wait for a callback.` : `A week has gone by and ${biz}'s AI receptionist is still in training mode.`}
      </p>
      <p style="margin:0 0 16px;font-size:15px;color:#444;line-height:1.7;">
        One quick 10-minute call and she starts booking jobs directly — no more middleman.
      </p>`,
  },
  '14d': {
    subject: (name, biz, callCount) => callCount > 0
      ? `${callCount} call${callCount > 1 ? 's' : ''} answered — still no bookings`
      : `Still here when you're ready, ${name || 'there'}`,
    headline: (name) => `Calls in, but bookings aren't happening yet`,
    body: (name, biz, callCount) => `
      <p style="margin:0 0 16px;font-size:15px;color:#444;line-height:1.7;">
        ${callCount > 0 ? `Your receptionist has answered <strong>${callCount} call${callCount > 1 ? 's' : ''}</strong> for ${biz}. Every one of those customers had to wait for a callback instead of booking on the spot.` : `Two weeks in — life gets busy, we get it.`}
      </p>
      <p style="margin:0 0 16px;font-size:15px;color:#444;line-height:1.7;">
        One call to ${SETUP_PHONE} upgrades her to full booking mode — services, pricing, availability, the whole thing.
      </p>`,
  },
  '30d': {
    subject: (name, biz, callCount) => callCount > 0
      ? `${callCount} call${callCount > 1 ? 's' : ''}, ${callCount} potential booking${callCount > 1 ? 's' : ''} missed`
      : `One month in — ${biz}'s AI receptionist`,
    headline: (name) => `One month since you signed up`,
    body: (name, biz, callCount) => `
      <p style="margin:0 0 16px;font-size:15px;color:#444;line-height:1.7;">
        ${callCount > 0 ? `She's answered <strong>${callCount} call${callCount > 1 ? 's' : ''}</strong> for ${biz} this month. Every single one of those callers could have booked on the spot — instead they waited for a callback.` : `A month has passed since you signed up for Hey Connie.`}
      </p>
      <p style="margin:0 0 16px;font-size:15px;color:#444;line-height:1.7;">
        Whenever you have 10 minutes, call ${SETUP_PHONE} and she'll start converting those calls into booked jobs.
      </p>`,
  },
  '60d': {
    subject: (name, biz, callCount) => `Checking in — your Hey Connie receptionist`,
    headline: (name) => `Still here for you`,
    body: (name, biz, callCount) => `
      <p style="margin:0 0 16px;font-size:15px;color:#444;line-height:1.7;">
        It's been a couple of months. ${callCount > 0 ? `Your receptionist has captured <strong>${callCount} lead${callCount > 1 ? 's' : ''}</strong> for ${biz} — imagine if those turned into booked appointments automatically.` : `Whenever you're ready to get ${biz}'s AI receptionist fully trained, we're here.`}
      </p>
      <p style="margin:0 0 16px;font-size:15px;color:#444;line-height:1.7;">
        Call ${SETUP_PHONE} — 10 minutes and she's booking appointments automatically.
      </p>`,
  },
  '90d': {
    subject: (name, biz, callCount) => `Still here, ${name || 'there'}`,
    headline: (name) => `90 days in`,
    body: (name, biz, callCount) => `
      <p style="margin:0 0 16px;font-size:15px;color:#444;line-height:1.7;">
        Three months since you signed up. ${callCount > 0 ? `Your receptionist has taken <strong>${callCount} call${callCount > 1 ? 's' : ''}</strong> for ${biz} — she's been there, just waiting to do more.` : `Your AI receptionist for ${biz} is still ready to go.`}
      </p>
      <p style="margin:0 0 16px;font-size:15px;color:#444;line-height:1.7;">
        Call ${SETUP_PHONE} whenever you're ready. She'll be waiting.
      </p>`,
  },
}

const LATE_EMAIL = {
  subject: (name, biz) => `A quick update on your Hey Connie account`,
  headline: (name) => `Still here for ${name || 'you'}`,
  body: (name, biz, callCount) => `
    <p style="margin:0 0 16px;font-size:15px;color:#444;line-height:1.7;">
      ${callCount > 0 ? `Your AI receptionist for ${biz} has captured <strong>${callCount} lead${callCount > 1 ? 's' : ''}</strong> — but she could be doing so much more.` : `Your AI receptionist for ${biz} is still set up and ready whenever you are.`}
    </p>
    <p style="margin:0 0 16px;font-size:15px;color:#444;line-height:1.7;">
      One 5-minute call to ${SETUP_PHONE} and she'll be booking appointments, quoting prices, and handling questions automatically.
    </p>`,
}

const QUARTERLY_EMAIL = {
  subject: (name) => `Still here whenever you're ready`,
  headline: (name) => `Checking in from Hey Connie`,
  body: (name, biz, callCount) => `
    <p style="margin:0 0 16px;font-size:15px;color:#444;line-height:1.7;">
      Just a quick note — your AI receptionist for ${biz} is still set up and waiting. ${callCount > 0 ? `She's taken <strong>${callCount} call${callCount > 1 ? 's' : ''}</strong> and captured those leads for you.` : ''}
    </p>
    <p style="margin:0 0 16px;font-size:15px;color:#444;line-height:1.7;">
      Whenever you have 5 minutes, call ${SETUP_PHONE} and we'll get her fully trained up. No pressure.
    </p>`,
}

function getEmailContent(milestoneKey) {
  if (EMAIL_CONTENT[milestoneKey]) return EMAIL_CONTENT[milestoneKey]
  if (['month4', 'month5', 'month6'].includes(milestoneKey)) return LATE_EMAIL
  return QUARTERLY_EMAIL // quarterN
}

function buildEmailHtml({ ownerName, businessName, headline, bodyHtml, baseUrl, businessId }) {
  const unsubUrl = `${baseUrl}/api/unsubscribe-nudge?bid=${encodeURIComponent(businessId)}`
  return `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f4f4f2;font-family:'DM Sans',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f2;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:#0d0a0a;padding:24px 36px;">
            <span style="font-size:22px;font-weight:800;color:#f06071;">Hey Connie</span>
          </td>
        </tr>
        <tr>
          <td style="padding:36px;">
            <h2 style="margin:0 0 20px;font-size:20px;font-weight:700;color:#0d0a0a;">${headline}</h2>
            ${bodyHtml}
            <div style="margin-top:28px;">
              <a href="tel:${SETUP_PHONE.replace(/\D/g, '')}" style="display:inline-block;background:#f06071;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;">Call ${SETUP_PHONE} to set up your agent</a>
            </div>
          </td>
        </tr>
        <tr>
          <td style="background:#0d0a0a;padding:16px 36px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#555;">
              © 2026 Hey Connie · Built by BluHat AI ·
              <a href="${unsubUrl}" style="color:#555;">Stop these emails</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

// ── Main handler ──────────────────────────────────────────────────────────────

module.exports = async function handler(req, res) {
  if (req.headers['x-admin-secret'] !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const BASE_URL = process.env.BASE_URL || 'https://luis-mobile-detailing.vercel.app'

  // Fetch all draft businesses that haven't opted out
  const { data: businesses, error: bizError } = await supabase
    .from('businesses')
    .select(`
      id, name, owner_name, email, owner_phone, created_at, timezone,
      business_profiles!left(profile_status),
      availability_windows!left(day_of_week, start_time, end_time)
    `)
    .eq('activation_opted_out', false)

  if (bizError) {
    console.error('[activation-nudge] businesses query error:', bizError)
    return res.status(500).json({ error: 'DB query failed' })
  }

  const results = []

  for (const biz of (businesses || [])) {
    const profileStatus = biz.business_profiles?.[0]?.profile_status
    if (profileStatus === 'review' || profileStatus === 'active') continue
    if (!biz.email && !biz.owner_phone) continue

    const daysSince = Math.floor((Date.now() - new Date(biz.created_at).getTime()) / (1000 * 60 * 60 * 24))

    // Build eligible milestones up to current day
    const allMilestones = [...FIXED_MILESTONES, ...getQuarterlyMilestones(daysSince)]
      .filter(m => m.days <= daysSince)
      .sort((a, b) => a.days - b.days)

    if (allMilestones.length === 0) continue

    // Fetch already-sent nudges for this business
    const { data: sent } = await supabase
      .from('activation_nudges')
      .select('milestone, nudge_type')
      .eq('business_id', biz.id)

    const sentSet = new Set((sent || []).map(r => `${r.milestone}:${r.nudge_type}`))

    // Fetch call count for this business
    const { count: callCount } = await supabase
      .from('call_logs')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', biz.id)

    // Find the NEXT unsent milestone (one per run)
    let nudgeSent = false
    for (const milestone of allMilestones) {
      const channels = milestone.channels
      const emailPending = channels.includes('email') && !sentSet.has(`${milestone.key}:email`)
      const phonePending = channels.includes('phone') && !sentSet.has(`${milestone.key}:phone`)

      if (!emailPending && !phonePending) continue

      // Send phone call — only within business hours
      const bizHours = biz.availability_windows || []
      if (phonePending && biz.owner_phone && isWithinBusinessHours(bizHours, biz.timezone)) {
        const e164 = toE164(biz.owner_phone)
        const script = phoneScript(milestone.key, biz.owner_name, biz.name, callCount || 0)
        if (e164 && script) {
          try {
            const callRes = await fetch(`${VAPI_BASE}/call/phone`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${process.env.VAPI_API_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                assistantId: process.env.VAPI_OUTBOUND_ASSISTANT_ID,
                phoneNumberId: process.env.VAPI_PHONE_NUMBER_ID,
                customer: { number: e164 },
                assistantOverrides: { firstMessage: script },
              }),
            })
            const callJson = callRes.ok ? await callRes.json() : {}
            await supabase.from('outbound_calls').insert({
              business_id: biz.id,
              call_type: 'activation_nudge',
              vapi_call_id: callJson.id || null,
              status: callRes.ok ? 'fired' : 'failed',
            })
            await supabase.from('activation_nudges').insert({
              business_id: biz.id,
              nudge_type: 'phone',
              milestone: milestone.key,
              vapi_call_id: callJson.id || null,
            })
          } catch (err) {
            console.error(`[activation-nudge] phone failed ${biz.id} ${milestone.key}:`, err.message)
          }
        }
      }

      // Send email
      if (emailPending && biz.email) {
        const content = getEmailContent(milestone.key)
        const subject = typeof content.subject === 'function'
          ? content.subject(biz.owner_name, biz.name, callCount || 0)
          : content.subject
        const headline = content.headline(biz.owner_name)
        const bodyHtml = content.body(biz.owner_name, biz.name, callCount || 0)
        const html = buildEmailHtml({
          ownerName: biz.owner_name,
          businessName: biz.name,
          headline,
          bodyHtml,
          baseUrl: BASE_URL,
          businessId: biz.id,
        })
        try {
          await resend.emails.send({
            from: 'Hey Connie <setup@heyconnie.co>',
            to: biz.email,
            subject,
            html,
          })
          await supabase.from('activation_nudges').insert({
            business_id: biz.id,
            nudge_type: 'email',
            milestone: milestone.key,
            email_sent: true,
          })
        } catch (err) {
          console.error(`[activation-nudge] email failed ${biz.id} ${milestone.key}:`, err.message)
        }
      }

      results.push({ business_id: biz.id, milestone: milestone.key })
      nudgeSent = true
      break // only one milestone per business per run
    }
  }

  return res.status(200).json({ processed: results.length, nudges: results })
}
