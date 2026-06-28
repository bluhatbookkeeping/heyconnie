// Run locally: node scripts/preview-loyalty-emails.js
// Sends all loyalty email variants to astrauss99@gmail.com for preview.
// Requires RESEND_API_KEY in .env.local

require('dotenv').config({ path: '.env.local' })
const { Resend } = require('resend')

const resend = new Resend(process.env.RESEND_API_KEY)
const PREVIEW_TO = 'astrauss99@gmail.com'
const SITE_URL = 'https://luis-mobile-detailing.vercel.app'
const DUMMY_CODE = 'RWRD-PREVIEW'
const DUMMY_CID  = '00000000-0000-0000-0000-000000000000'

function bookingUrl(code) { return `${SITE_URL}/?promo=${code}#book` }
function formatDate(iso) { return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) }

function rewardBox(code) {
  return `<div style="background:#f3e8ff;border:2px solid #7c3aed;border-radius:10px;padding:16px 20px;margin:20px 0;text-align:center"><div style="color:#6d28d9;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Your Reward Code</div><div style="font-family:monospace;font-size:26px;font-weight:700;color:#7c3aed;letter-spacing:3px">${code}</div></div>`
}

function ctaButton(code) {
  return `<a href="${bookingUrl(code)}" style="display:inline-block;background:#1d4ed8;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;margin-top:8px">Book Now — Reward Applied Automatically</a>`
}

function unsubLink(cid) {
  return `<a href="${SITE_URL}/api/unsubscribe?cid=${cid}&type=loyalty" style="color:#9ca3af">Unsubscribe from reward reminders</a>`
}

function shell(body, cid) {
  return `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a">${body}<hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0"><p style="color:#9ca3af;font-size:12px">Questions? Call or text Luis at <strong>626-409-3147</strong>.<br>Luis Mobile Detail · San Gabriel Valley, CA<br><br>${cid ? unsubLink(cid) : ''}</p></div>`
}

const EMAILS = [
  // ── Customer-facing drip emails ──────────────────────────────────────
  {
    tag: '[CUSTOMER] Reward earned',
    subject: 'You earned a free reward at Luis Mobile Detail!',
    html: shell(`
      <h2 style="color:#1d4ed8">You earned a free reward! 🎉</h2>
      <p>Hi Andrew,</p>
      <p>Congratulations — you've completed <strong>5 visits</strong> and earned:</p>
      <p style="font-size:18px;font-weight:bold;color:#7c3aed">Free car wash</p>
      <p>Your reward code is:</p>
      <p style="font-size:24px;font-weight:bold;letter-spacing:3px;color:#7c3aed;background:#f3e8ff;padding:12px 20px;display:inline-block;border-radius:8px">${DUMMY_CODE}</p>
      <p>Book your next appointment and it will be applied automatically:</p>
      <p><a href="${SITE_URL}/?promo=${DUMMY_CODE}#book" style="display:inline-block;background:#1d4ed8;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin-top:4px">Book Now — Reward Applied</a></p>
      <p>Questions? Call or text Luis at <strong>626-409-3147</strong>.</p>
      <br><p style="color:#666">— Luis Mobile Detail<br>San Gabriel Valley, CA</p>
    `),
  },
  {
    tag: '[CUSTOMER] 30-day drip',
    subject: `Your free Free car wash is waiting for you`,
    html: shell(`
      <h2 style="color:#1d4ed8">Hey Andrew, your reward is ready</h2>
      <p>You earned a <strong>Free car wash</strong> on your last visit — and it's still sitting here waiting for you.</p>
      <p>When you're ready to book your next wash or detail, just use your code below and it'll apply automatically.</p>
      ${rewardBox(DUMMY_CODE)}
      ${ctaButton(DUMMY_CODE)}
      <p style="color:#6b7280;font-size:13px;margin-top:16px">No rush — just wanted to make sure you knew it was there.</p>
    `, DUMMY_CID),
  },
  {
    tag: '[CUSTOMER] 60-day drip',
    subject: `Luis wanted to check in — your reward is still here`,
    html: shell(`
      <h2 style="color:#1d4ed8">It's been a little while, Andrew</h2>
      <p>Luis noticed you haven't booked in a bit — and wanted to remind you that your free <strong>Free car wash</strong> is still here whenever you're ready.</p>
      <p>Your car deserves some love. Use your reward code below to book:</p>
      ${rewardBox(DUMMY_CODE)}
      ${ctaButton(DUMMY_CODE)}
      <p style="color:#6b7280;font-size:13px;margin-top:16px">Luis serves all of the San Gabriel Valley — Pasadena, West Covina, El Monte, Pomona, and surrounding cities.</p>
    `, DUMMY_CID),
  },
  {
    tag: '[CUSTOMER] 90-day drip',
    subject: `One last reminder — your free Free car wash is still here`,
    html: shell(`
      <h2 style="color:#1d4ed8">One last reminder, Andrew</h2>
      <p>We don't want to keep bugging you — but your free <strong>Free car wash</strong> has been waiting 3 months now.</p>
      <p>Whenever you're ready to get the car detailed, it's yours. No strings attached.</p>
      ${rewardBox(DUMMY_CODE)}
      ${ctaButton(DUMMY_CODE)}
      <p style="color:#6b7280;font-size:13px;margin-top:16px">After this we'll give you some space — but the reward stays valid for another 3 months.</p>
    `, DUMMY_CID),
  },
  {
    tag: '[CUSTOMER] 180-day final + code expiration',
    subject: `We're letting your reward go, Andrew`,
    html: shell(`
      <h2 style="color:#6b7280">Hey Andrew — we're closing this one out</h2>
      <p>Your free <strong>Free car wash</strong> has been waiting for 6 months. Life gets busy — we get it.</p>
      <p>We're going to retire this reward code, but we wanted to give you one final chance to use it first.</p>
      ${rewardBox(DUMMY_CODE)}
      ${ctaButton(DUMMY_CODE)}
      <p style="color:#6b7280;font-size:13px;margin-top:16px">If you ever come back for a detail, Luis would love to earn your next reward. He's out in the San Gabriel Valley every day — just give him a call at 626-409-3147.</p>
    `, DUMMY_CID),
  },
  {
    tag: '[CUSTOMER] Expiry warning (reward has valid_until)',
    subject: `Your free Free car wash expires ${formatDate(new Date(Date.now() + 30*24*60*60*1000).toISOString())} — use it before it's gone`,
    html: shell(`
      <h2 style="color:#dc2626">Your reward expires soon, Andrew</h2>
      <p>Just a heads up — your free <strong>Free car wash</strong> expires on <strong>${formatDate(new Date(Date.now() + 30*24*60*60*1000).toISOString())}</strong>.</p>
      <p>You earned this reward by being a loyal customer. Don't let it go to waste!</p>
      ${rewardBox(DUMMY_CODE)}
      ${ctaButton(DUMMY_CODE)}
      <p style="color:#6b7280;font-size:13px;margin-top:16px">Or just mention it to Luis when you call — he'll take care of you.</p>
    `, DUMMY_CID),
  },

  // ── Luis / merchant-facing emails ────────────────────────────────────
  {
    tag: '[LUIS] Reward earned notification',
    subject: `Loyalty reward: Andrew Strauss earned Free car wash`,
    html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto"><h2 style="color:#1d4ed8">Loyalty Reward Earned — Luis Mobile Detail</h2><p><strong>Andrew Strauss</strong> just completed their 5th visit and earned:</p><p style="font-size:18px;font-weight:bold;color:#7c3aed">Free car wash</p><p>Their reward code is <strong style="font-size:20px;letter-spacing:2px">${DUMMY_CODE}</strong> — it's already in the system and ready to redeem.</p><br><p style="color:#666">— Luis Mobile Detail Admin</p></div>`,
  },
  {
    tag: '[LUIS] Reward given notification',
    subject: `Reward given: Andrew Strauss — Free car wash`,
    html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto"><h2 style="color:#1d4ed8">Reward Given — Luis Mobile Detail</h2><table style="width:100%;border-collapse:collapse"><tr><td style="padding:6px 0;font-weight:bold;width:140px">Customer</td><td>Andrew Strauss</td></tr><tr><td style="padding:6px 0;font-weight:bold">Phone</td><td>626-555-0100</td></tr><tr><td style="padding:6px 0;font-weight:bold">Reward</td><td style="color:#7c3aed;font-weight:bold">Free car wash</td></tr><tr><td style="padding:6px 0;font-weight:bold">Date Given</td><td>${formatDate(new Date().toISOString())}</td></tr></table><p style="color:#666;margin-top:16px">Their punch cycle has been reset — they start fresh toward the next reward.</p><br><p style="color:#666">— Luis Mobile Detail Admin</p></div>`,
  },
]

async function run() {
  console.log(`Sending ${EMAILS.length} preview emails to ${PREVIEW_TO}...\n`)
  for (const email of EMAILS) {
    try {
      await resend.emails.send({
        from: 'bookings@svcvoice.com',
        to: PREVIEW_TO,
        subject: `[PREVIEW] ${email.tag} — ${email.subject}`,
        html: email.html,
      })
      console.log(`✓  ${email.tag}`)
    } catch (e) {
      console.error(`✗  ${email.tag}:`, e.message)
    }
    // Small delay to avoid rate limits
    await new Promise(r => setTimeout(r, 300))
  }
  console.log('\nDone. Check your inbox.')
}

run()
