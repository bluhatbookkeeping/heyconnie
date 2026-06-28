const { Resend } = require('resend')
const twilio = require('twilio')

const resend = new Resend(process.env.RESEND_API_KEY)

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-vapi-secret')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (req.body?._warmup) return res.status(200).json({ ok: true })

  const vapiSecret = req.headers['x-vapi-secret']
  if (vapiSecret && vapiSecret !== process.env.VAPI_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const toolCallId = req.body?.message?.toolCallList?.[0]?.id
  const args = req.body?.message?.toolCallList?.[0]?.function?.arguments || req.body
  const { caller_phone, name, question_summary } = args
  const vapiResult = (data) => res.status(200).json({ results: [{ toolCallId, result: JSON.stringify(data) }] })

  if (!caller_phone) return res.status(400).json({ error: 'caller_phone required' })

  const callerLabel = name ? `${name} (${caller_phone})` : caller_phone
  const smsBody = `📞 Callback Needed — Luis Mobile Detail\nName: ${callerLabel}\nQuestion: ${question_summary || 'No summary provided'}`

  try {
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    await client.messages.create({
      body: smsBody,
      from: process.env.TWILIO_FROM_NUMBER,
      to: process.env.LUIS_PHONE,
    })
  } catch (smsErr) {
    console.error('Twilio SMS error:', smsErr)
  }

  try {
    await resend.emails.send({
      from: 'bookings@svcvoice.com',
      to: process.env.NOTIFICATION_EMAIL,
      subject: `📞 Callback Request: ${name || caller_phone}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <h2 style="color:#1d4ed8">Callback Request — Luis Mobile Detail</h2>
          <table style="width:100%;border-collapse:collapse">
            <tr><td style="padding:8px 0;font-weight:bold;width:140px">Name</td><td>${name || 'Not provided'}</td></tr>
            <tr><td style="padding:8px 0;font-weight:bold">Phone</td><td>${caller_phone}</td></tr>
            <tr><td style="padding:8px 0;font-weight:bold">Question</td><td>${question_summary || 'Not provided'}</td></tr>
          </table>
        </div>
      `,
    })
  } catch (emailErr) {
    console.error('Resend error:', emailErr)
  }

  return vapiResult({ success: true })
}
