module.exports = function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  // Key is domain-restricted in Google Cloud — safe to expose here
  const mapsKey = process.env.GOOGLE_GEOCODING_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_PLACES_KEY || ''
  return res.status(200).json({ mapsKey })
}
