const BASE_URL = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : 'https://luis-mobile-detailing.vercel.app'

const ENDPOINTS = [
  '/api/voice/lookup-customer',
  '/api/voice/get-slots',
  '/api/voice/create-booking',
  '/api/voice/notify-luis',
  '/api/voice/get-date',
  '/api/voice/validate-address',
]

module.exports = async function handler(req, res) {
  await Promise.all(ENDPOINTS.map(path =>
    fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ _warmup: true })
    }).catch(() => {})
  ))

  return res.status(200).json({ ok: true, warmed: ENDPOINTS.length })
}
