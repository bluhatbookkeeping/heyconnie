const Anthropic = require('@anthropic-ai/sdk')
const { Resend } = require('resend')
const config = require('./config/luis')

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const resend = new Resend(process.env.RESEND_API_KEY)

// In-memory rate limiter: 5 requests per IP per 10 minutes
const rateLimitMap = new Map()
const RATE_LIMIT = 5
const RATE_WINDOW_MS = 10 * 60 * 1000

function isRateLimited(ip) {
  const now = Date.now()
  const entry = rateLimitMap.get(ip) || { count: 0, resetAt: now + RATE_WINDOW_MS }
  if (now > entry.resetAt) {
    entry.count = 0
    entry.resetAt = now + RATE_WINDOW_MS
  }
  entry.count++
  rateLimitMap.set(ip, entry)
  return entry.count > RATE_LIMIT
}

function buildSystemPrompt() {
  const serviceList = config.services
    .map(s => `  - ${s.name}: ${s.price}`)
    .join('\n')

  return `You are a helpful virtual assistant for ${config.name}, a mobile car detailing business serving ${config.serviceArea}.

BUSINESS FACTS (only facts you may state):
- Phone: ${config.phone}
- Instagram: ${config.instagram}
- Services:\n${serviceList}
- ${config.pricingNote}

RULES:
1. Only answer questions about this business. Never discuss competitors or unrelated topics.
2. Never invent or estimate a price. Reference starting prices only and note final pricing is confirmed before work begins.
3. If the customer wants to book an appointment, reply naturally and include exactly: [ACTION:SCROLL_TO_BOOKING]
4. If a question is outside your knowledge, first ask for their name and phone number or email in a friendly message. Do NOT include [ACTION:ESCALATE] yet — wait until they actually provide their name AND contact info in a later message. Only after you have both their name and contact info, include on a new line:
   [ACTION:ESCALATE]
   {"name":"<their name>","contact":"<their phone or email>","question":"<their original question>"}
5. Keep replies to 2–4 sentences. Friendly, plain language.
6. Never claim to be human. You are a virtual assistant for ${config.name}.`
}

const ALLOWED_ORIGINS = [
  'https://luis-mobile-detailing.vercel.app',
  'http://localhost:3005',
  'http://localhost:3000',
]

module.exports = async function handler(req, res) {
  const origin = req.headers.origin
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket?.remoteAddress || 'unknown'
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: 'Too many requests. Please try again later.' })
  }

  const { messages } = req.body || {}
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array required' })
  }

  // Trim to last 10 turns
  const trimmed = messages.slice(-10)

  let rawReply
  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      system: [
        {
          type: 'text',
          text: buildSystemPrompt(),
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: trimmed,
    })
    rawReply = response.content[0]?.text || ''
  } catch (err) {
    console.error('Anthropic error:', err)
    return res.status(500).json({ error: 'AI unavailable', fallback: true })
  }

  // Handle SCROLL_TO_BOOKING action
  const scrollMatch = rawReply.includes('[ACTION:SCROLL_TO_BOOKING]')
  let reply = rawReply.replace('[ACTION:SCROLL_TO_BOOKING]', '').trim()

  if (scrollMatch) {
    return res.status(200).json({ reply, action: 'SCROLL_TO_BOOKING' })
  }

  // Handle ESCALATE action
  const escalateIndex = reply.indexOf('[ACTION:ESCALATE]')
  if (escalateIndex !== -1) {
    const beforeToken = reply.slice(0, escalateIndex).trim()
    const afterToken = reply.slice(escalateIndex + '[ACTION:ESCALATE]'.length).trim()

    let escalateData = {}
    try {
      escalateData = JSON.parse(afterToken)
    } catch {
      // Best-effort parse — still send what we have
    }

    // Only fire escalation email when we actually have contact info
    const hasContact = escalateData.name && escalateData.name !== 'Not provided'
      && escalateData.contact && escalateData.contact !== 'Not provided'

    if (!hasContact) {
      return res.status(200).json({ reply: beforeToken || "I'd be happy to have Luis follow up with you. Could I get your name and phone number or email?", action: 'COLLECT_CONTACT' })
    }

    // Fire escalation email — non-fatal
    try {
      await resend.emails.send({
        from: 'bookings@svcvoice.com',
        to: config.notificationEmail,
        subject: `Chat escalation — ${escalateData.name || 'Unknown customer'}`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
            <h2 style="color:#1d4ed8">Chat Escalation — Luis Mobile Detail</h2>
            <p><strong>Name:</strong> ${escalateData.name || 'Not provided'}</p>
            <p><strong>Contact:</strong> ${escalateData.contact || 'Not provided'}</p>
            <p><strong>Question:</strong> ${escalateData.question || 'Not provided'}</p>
          </div>
        `,
      })
    } catch (emailErr) {
      console.error('Escalation email error:', emailErr)
    }

    return res.status(200).json({ reply: beforeToken, action: 'ESCALATE' })
  }

  return res.status(200).json({ reply })
}
