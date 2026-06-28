const { createClient } = require('@supabase/supabase-js')
const { Resend } = require('resend')
const { buildBasicAgentConfig } = require('../config/basic-agent')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)
const resend = new Resend(process.env.RESEND_API_KEY)

const SETUP_PHONE = '(818) 403-3447'
const BASE_URL = process.env.BASE_URL || 'https://luis-mobile-detailing.vercel.app'

async function createVapiAssistant(business_name, owner_name) {
  const VAPI_API_KEY = process.env.VAPI_API_KEY
  if (!VAPI_API_KEY) throw new Error('VAPI_API_KEY not set')

  const config = buildBasicAgentConfig(business_name, owner_name, BASE_URL)
  const res = await fetch('https://api.vapi.ai/assistant', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${VAPI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(config),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(`Vapi error ${res.status}: ${JSON.stringify(json)}`)
  return json.id
}

function generateBusinessId(businessName) {
  return businessName
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { business_name, owner_name, owner_phone, owner_email, voice_pin } = req.body || {}

  if (!business_name?.trim()) return res.status(400).json({ error: 'business_name is required' })
  if (!owner_name?.trim())   return res.status(400).json({ error: 'owner_name is required' })
  if (!owner_phone?.trim())  return res.status(400).json({ error: 'owner_phone is required' })
  if (!owner_email?.trim())  return res.status(400).json({ error: 'owner_email is required' })
  if (!voice_pin || !/^\d{4}$/.test(String(voice_pin).trim())) {
    return res.status(400).json({ error: 'voice_pin must be exactly 4 digits' })
  }

  const business_id = generateBusinessId(business_name)

  const { data: existing } = await supabase
    .from('businesses')
    .select('id')
    .eq('id', business_id)
    .maybeSingle()

  if (existing) {
    return res.status(409).json({
      error: `A business with that name already exists. Try a slightly different name or contact us.`
    })
  }

  const normalizedPhone = owner_phone.replace(/\D/g, '').slice(-10)

  const { data: existingPhone } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_phone', normalizedPhone)
    .maybeSingle()

  if (existingPhone) {
    return res.status(409).json({
      error: 'That phone number is already registered to another account. Please use a different number.'
    })
  }

  const { error: bizError } = await supabase
    .from('businesses')
    .insert({
      id: business_id,
      name: business_name.trim(),
      owner_name: owner_name.trim(),
      owner_phone: normalizedPhone,
      email: owner_email.trim(),
      voice_pin: String(voice_pin).trim(),
      features: { chat: false, voice: false, marketing: false },
      timezone: 'America/Los_Angeles',
    })

  if (bizError) {
    console.error('[detailer-signup] businesses insert error:', bizError)
    return res.status(500).json({ error: 'Something went wrong. Please try again.' })
  }

  // Create basic Vapi agent — non-fatal if it fails
  // Use UPDATE scoped to the exact business_id just inserted (bizError check above ensures it exists)
  // Never use a bare UPDATE without the .eq() filter — would overwrite every row
  try {
    const vapiAssistantId = await createVapiAssistant(business_name.trim(), owner_name.trim())
    await supabase
      .from('businesses')
      .update({ vapi_assistant_id: vapiAssistantId })
      .eq('id', business_id)
      .is('vapi_assistant_id', null) // only update if no ID already set — prevents overwriting existing agents
    console.log(`[detailer-signup] Vapi assistant created: ${vapiAssistantId} for ${business_id}`)
  } catch (err) {
    console.error('[detailer-signup] Vapi assistant creation failed:', err.message)
  }

  // Phone number auto-purchase not yet implemented — assign manually in Vapi dashboard
  console.warn('[detailer-signup] Phone auto-purchase not implemented — assign number manually in Vapi dashboard for:', business_id)

  await supabase.from('business_profiles').insert({
    business_id,
    business_name: business_name.trim(),
    owner_name: owner_name.trim(),
    owner_phone: normalizedPhone,
    profile_status: 'draft',
  })

  await supabase.from('onboarding_calls').insert({
    business_id,
    call_type: 'initial_setup',
    processed: false,
  })

  // Send emails — non-fatal if they fail
  try {
    await Promise.all([
      resend.emails.send({
        from: 'Hey Connie <setup@heyconnie.co>',
        to: owner_email.trim(),
        subject: "You're in! Here's how to set up your AI receptionist",
        html: welcomeEmail({ business_name: business_name.trim(), owner_name: owner_name.trim(), setup_phone: SETUP_PHONE }),
      }),
      resend.emails.send({
        from: 'Hey Connie <setup@heyconnie.co>',
        to: process.env.NOTIFICATION_EMAIL,
        subject: `New detailer signup: ${business_name.trim()}`,
        html: alertEmail({ business_name, owner_name, owner_phone, owner_email, business_id }),
      }),
    ])
  } catch (err) {
    console.error('[detailer-signup] email send error:', err.message)
  }

  return res.status(201).json({ success: true, business_id, vapi_ready: !!vapiAssistantId })
}

function welcomeEmail({ business_name, owner_name, setup_phone }) {
  return `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f4f4f2;font-family:'DM Sans',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f2;padding:40px 20px;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:#0d0a0a;padding:32px 40px;text-align:center;">
            <span style="font-size:26px;font-weight:800;color:#f06071;letter-spacing:-0.5px;">Hey Connie</span>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;">
            <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#0d0a0a;">You're in, ${owner_name}! 🎉</h1>
            <p style="margin:0 0 24px;font-size:16px;color:#555;line-height:1.6;">
              <strong>${business_name}</strong> is registered. One phone call and your AI receptionist is live.
            </p>

            <div style="background:#f4f4f2;border-radius:10px;padding:24px;margin-bottom:28px;">
              <p style="margin:0 0 6px;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:#888;">Your setup number</p>
              <p style="margin:0;font-size:32px;font-weight:800;color:#0d0a0a;letter-spacing:1px;">${setup_phone}</p>
            </div>

            <h2 style="margin:0 0 16px;font-size:17px;font-weight:700;color:#0d0a0a;">What happens on the call:</h2>
            <table cellpadding="0" cellspacing="0" width="100%">
              ${['Tell us your services and pricing', 'Tell us your cities and hours', 'Tell us how you like to work'].map((step, i) => `
              <tr>
                <td style="vertical-align:top;padding-bottom:14px;">
                  <span style="display:inline-block;width:28px;height:28px;background:#f06071;color:#fff;font-weight:700;font-size:13px;border-radius:50%;text-align:center;line-height:28px;margin-right:12px;">${i + 1}</span>
                  <span style="font-size:15px;color:#333;line-height:28px;">${step}</span>
                </td>
              </tr>`).join('')}
            </table>

            <div style="background:#fff4f5;border:1.5px solid #f06071;border-radius:10px;padding:20px;margin-top:24px;">
              <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#f06071;">Your AI receptionist is ALREADY set up.</p>
              <p style="margin:0;font-size:14px;color:#444;line-height:1.6;">
                Once we assign your phone number (we'll do this for you within 24 hours), she'll be live answering calls and capturing leads — before you've even done the onboarding call. Call <strong>${setup_phone}</strong> to teach her your services so she can start booking appointments directly.
              </p>
            </div>
            <p style="margin:24px 0 0;font-size:14px;color:#888;line-height:1.6;">
              The whole call takes about 5 minutes. After that, your AI receptionist will be ready to review and go live. You can call back anytime to make changes.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#0d0a0a;padding:20px 40px;text-align:center;">
            <p style="margin:0;font-size:13px;color:#666;">© 2026 Hey Connie · Built by BluHat AI</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function alertEmail({ business_name, owner_name, owner_phone, owner_email, business_id }) {
  return `
<p><strong>New detailer signup</strong></p>
<table cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-size:14px;">
  <tr><td style="color:#666;padding-right:16px;">Business</td><td><strong>${business_name}</strong></td></tr>
  <tr><td style="color:#666;">Owner</td><td>${owner_name}</td></tr>
  <tr><td style="color:#666;">Phone</td><td>${owner_phone}</td></tr>
  <tr><td style="color:#666;">Email</td><td>${owner_email}</td></tr>
  <tr><td style="color:#666;">Business ID</td><td><code>${business_id}</code></td></tr>
</table>`
}
