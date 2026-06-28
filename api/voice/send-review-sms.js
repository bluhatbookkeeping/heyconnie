/**
 * Vapi tool endpoint — fires when a customer says "yes" to a review link
 * during an outbound review request call.
 *
 * Registered as a tool on VAPI_OUTBOUND_ASSISTANT_ID.
 * Run scripts/register-review-sms-tool.js once to add it.
 *
 * Vapi sends: { caller_phone, name }
 * Returns:    { result: "SMS sent" }  ← Vapi expects a `result` string
 */

const twilio = require('twilio')

const GOOGLE_REVIEW_URL = process.env.GOOGLE_REVIEW_URL
const YELP_REVIEW_URL = process.env.YELP_REVIEW_URL

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

  const { caller_phone, name } = req.body || {}

  if (!caller_phone) {
    return res.status(400).json({ result: 'Missing caller_phone — SMS not sent' })
  }

  if (!GOOGLE_REVIEW_URL && !YELP_REVIEW_URL) {
    console.error('send-review-sms: no review URLs configured')
    return res.status(200).json({ result: 'No review URLs configured — SMS skipped' })
  }

  const firstName = (name || '').split(' ')[0] || 'there'

  const lines = [`Hey ${firstName}! Here's the link to leave Luis a review — takes 30 seconds:`]
  if (GOOGLE_REVIEW_URL) lines.push(`Google: ${GOOGLE_REVIEW_URL}`)
  if (YELP_REVIEW_URL)   lines.push(`Yelp: ${YELP_REVIEW_URL}`)
  lines.push('Thanks so much!')

  try {
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    await client.messages.create({
      body: lines.join('\n'),
      from: process.env.TWILIO_FROM_NUMBER,
      to: caller_phone,
    })
    console.log(`send-review-sms: sent to ${caller_phone}`)
    return res.status(200).json({ result: 'SMS sent' })
  } catch (err) {
    console.error('send-review-sms Twilio error:', err.message)
    return res.status(200).json({ result: 'SMS failed — try again later' })
  }
}
