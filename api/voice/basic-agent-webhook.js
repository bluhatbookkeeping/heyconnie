const Anthropic = require('@anthropic-ai/sdk')
const { createClient } = require('@supabase/supabase-js')
const { Resend } = require('resend')

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const resend = new Resend(process.env.RESEND_API_KEY)

const EXTRACT_SYSTEM = `You are analyzing a brief voicemail/receptionist call transcript.
Extract and return ONLY valid JSON with these fields:
{
  "caller_name": "the caller's name if mentioned, null if not",
  "summary": "one sentence: what did they want or why did they call? Be specific."
}
If the call was very short or unclear, set summary to "Called but didn't leave details."
Never invent information not in the transcript.`

async function extractLeadInfo(transcript) {
  if (!transcript || transcript.trim().length < 20) {
    return { caller_name: null, summary: 'Called but didn\'t leave details.' }
  }
  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      system: [{ type: 'text', text: EXTRACT_SYSTEM, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: `Transcript:\n\n${transcript}` }],
    })
    return JSON.parse(response.content[0]?.text || '{}')
  } catch (err) {
    console.error('[basic-agent-webhook] extraction failed:', err.message)
    return { caller_name: null, summary: 'Called — check recording for details.' }
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-vapi-secret')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  if (req.headers['x-vapi-secret'] !== process.env.VAPI_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const event = req.body
  const eventType = event?.message?.type || event?.type
  if (eventType !== 'end-of-call-report') return res.status(200).json({ received: true })

  const msg = event.message || event
  const call = msg.call || {}
  const assistantId = call.assistantId || msg.assistantId
  const vapiCallId = call.id || msg.callId
  const callerPhone = call.customer?.number || null
  const transcript = msg.transcript || call.transcript || ''
  const endedAt = call.endedAt || msg.endedAt || new Date().toISOString()
  const startedAt = call.startedAt || msg.startedAt
  const durationSeconds = (startedAt && endedAt)
    ? Math.round((new Date(endedAt) - new Date(startedAt)) / 1000)
    : null

  // Lookup business from assistant ID
  const { data: biz } = await supabase
    .from('businesses')
    .select('id, name, email, owner_name')
    .eq('vapi_assistant_id', assistantId)
    .maybeSingle()

  if (!biz) {
    console.warn('[basic-agent-webhook] no business found for assistantId:', assistantId)
    return res.status(200).json({ received: true })
  }

  // Extract lead info from transcript
  const { caller_name, summary } = await extractLeadInfo(transcript)

  // Save call log
  await supabase.from('call_logs').insert({
    business_id: biz.id,
    vapi_call_id: vapiCallId,
    caller_phone: callerPhone,
    transcript,
    outcome: 'lead_captured',
    duration_seconds: durationSeconds,
    ended_at: endedAt,
    ...(startedAt ? { started_at: startedAt } : {}),
  })

  // Notify owner
  if (biz.email) {
    const callerDisplay = caller_name || callerPhone || 'Unknown caller'
    const callTime = new Date(endedAt).toLocaleString('en-US', {
      timeZone: 'America/Los_Angeles',
      month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit',
    })
    try {
      await resend.emails.send({
        from: 'Hey Connie <setup@heyconnie.co>',
        to: biz.email,
        subject: `Your AI receptionist just took a call — ${callerDisplay}`,
        html: notifyEmail({ owner_name: biz.owner_name, business_name: biz.name, caller_name, caller_phone: callerPhone, summary, call_time: callTime }),
      })
    } catch (err) {
      console.error('[basic-agent-webhook] email failed:', err.message)
    }
  }

  return res.status(200).json({ received: true })
}

function notifyEmail({ owner_name, business_name, caller_name, caller_phone, summary, call_time }) {
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
            <h2 style="margin:0 0 4px;font-size:20px;font-weight:700;color:#0d0a0a;">Your AI receptionist just took a call!</h2>
            <p style="margin:0 0 24px;font-size:14px;color:#888;">${call_time} · ${business_name}</p>

            <table cellpadding="0" cellspacing="0" width="100%" style="background:#f8f8f7;border-radius:8px;padding:20px;margin-bottom:24px;">
              <tr>
                <td style="padding-bottom:12px;">
                  <p style="margin:0 0 2px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:#999;">Caller</p>
                  <p style="margin:0;font-size:16px;font-weight:600;color:#0d0a0a;">${caller_name || 'Name not captured'}</p>
                </td>
              </tr>
              ${caller_phone ? `<tr><td style="padding-bottom:12px;"><p style="margin:0 0 2px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:#999;">Phone</p><p style="margin:0;font-size:16px;font-weight:600;color:#0d0a0a;">${caller_phone}</p></td></tr>` : ''}
              <tr>
                <td>
                  <p style="margin:0 0 2px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:#999;">They asked about</p>
                  <p style="margin:0;font-size:15px;color:#333;">${summary}</p>
                </td>
              </tr>
            </table>

            <p style="margin:0;font-size:14px;color:#555;">Give them a call back when you get a chance, ${owner_name}!</p>
          </td>
        </tr>
        <tr>
          <td style="background:#0d0a0a;padding:16px 36px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#666;">© 2026 Hey Connie · Built by BluHat AI</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}
