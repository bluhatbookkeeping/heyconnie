/**
 * transferCall — live transfer endpoint for Vapi assistant 42457be4.
 *
 * ─── VAPI DASHBOARD SETUP (required to activate) ───────────────────────────
 *
 * 1. Log in to app.vapi.ai → Assistants → open assistant 42457be4.
 *
 * 2. Go to "Tools" tab → Add Tool → select "Transfer Call".
 *
 * 3. Under "Destinations", add one destination:
 *      Type:        Number
 *      Number:      <LUIS_PHONE env var value — his personal cell>
 *      Description: "Transfer to Luis"
 *
 * 4. Set transferPlan.mode = "blind-transfer"
 *    (call routes immediately; no hold music or warm introduction needed)
 *
 * 5. Set "Fallback Message" to:
 *    "Luis isn't available right now. I'll have him call you back shortly."
 *
 * 6. In the tool's "Server" section, set:
 *      URL:    https://luis-mobile-detailing.vercel.app/api/voice/transfer-call
 *      Header: x-vapi-secret = <VAPI_SECRET env var value>
 *
 * 7. In the assistant's system prompt, tell the AI when to use this tool:
 *    "If the caller asks to speak to a real person, or if you cannot answer
 *     their question, use the transferCall tool to connect them to Luis."
 *
 * ENV VAR REQUIRED:
 *   LUIS_PHONE — Luis's personal cell in E.164 format (e.g. +16264093147). Never hardcode.
 *
 * ────────────────────────────────────────────────────────────────────────────
 */

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-vapi-secret')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const vapiSecret = req.headers['x-vapi-secret']
  if (vapiSecret && vapiSecret !== process.env.VAPI_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (!process.env.LUIS_PHONE) {
    console.error('LUIS_PHONE env var not set — cannot transfer call')
    return res.status(500).json({
      result: 'Transfer is unavailable right now. Luis will call you back as soon as possible.',
    })
  }

  // Vapi reads the "result" field and passes it to the LLM as the tool response.
  // The actual SIP transfer is handled by Vapi's transferPlan configured on the assistant.
  // Return the destination so Vapi can use it if configured for dynamic transfers.
  return res.status(200).json({
    result: 'Transferring you to Luis now. Please hold for just a moment.',
    destination: {
      type: 'number',
      number: process.env.LUIS_PHONE,
      description: 'Luis — owner, Luis Mobile Detail',
    },
  })
}
