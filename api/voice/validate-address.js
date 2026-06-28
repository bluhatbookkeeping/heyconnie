module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-vapi-secret')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (req.body?._warmup) return res.status(200).json({ ok: true })

  const toolCallId = req.body?.message?.toolCallList?.[0]?.id
  const args = req.body?.message?.toolCallList?.[0]?.function?.arguments || req.body
  const { address } = args || {}
  const vapiResult = (data) => res.status(200).json({ results: [{ toolCallId, result: JSON.stringify(data) }] })

  if (!address) return vapiResult({ found: false, error: 'No address provided' })

  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    console.error('[validate-address] GOOGLE_MAPS_API_KEY not set')
    return vapiResult({ found: false, error: 'Address lookup unavailable' })
  }

  try {
    // If no comma in address (street only), append CA for better geocoding
    const addressWithContext = address.includes(',') ? address : `${address}, CA`
    const encoded = encodeURIComponent(addressWithContext)
    // bounds biases results toward the San Gabriel Valley without filtering out-of-area
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encoded}&components=country:US&bounds=33.9,-118.2|34.2,-117.8&key=${apiKey}`
    const response = await fetch(url)
    const data = await response.json()

    if (data.status !== 'OK' || !data.results?.length) {
      return vapiResult({ found: false, raw_input: address })
    }

    const place = data.results[0]
    const components = place.address_components || []
    const get = (type) => components.find(c => c.types.includes(type))?.long_name || ''

    return vapiResult({
      found: true,
      formatted_address: place.formatted_address,
      city: get('locality') || get('sublocality'),
      state: get('administrative_area_level_1'),
      zip: get('postal_code'),
    })
  } catch (err) {
    console.error('[validate-address] error:', err.message)
    return vapiResult({ found: false, error: 'Lookup failed' })
  }
}
