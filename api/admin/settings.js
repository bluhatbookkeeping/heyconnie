const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

async function getUser(req) {
  const token = req.headers['authorization']?.replace('Bearer ', '')
  if (!token) return null
  const { data: { user }, error } = await supabase.auth.getUser(token)
  return error ? null : user
}

const ALLOWED_FIELDS = ['name', 'owner_name', 'email', 'phone', 'owner_phone', 'address', 'city', 'state', 'zip', 'timezone', 'voice_pin']

module.exports = async function handler(req, res) {
  const user = await getUser(req)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  if (req.method === 'GET') {
    const { business } = req.query
    if (!business) return res.status(400).json({ error: 'business is required' })

    const { data, error } = await supabase
      .from('businesses')
      .select('name, owner_name, email, phone, owner_phone, address, city, state, zip, timezone, voice_pin')
      .eq('id', business)
      .maybeSingle()

    if (error) return res.status(500).json({ error: 'Failed to fetch settings' })
    return res.status(200).json({ settings: data || {} })
  }

  if (req.method === 'POST') {
    const { business_id, ...rest } = req.body
    if (!business_id) return res.status(400).json({ error: 'business_id is required' })

    if (rest.voice_pin !== undefined && !/^\d{4}$/.test(String(rest.voice_pin).trim())) {
      return res.status(400).json({ error: 'voice_pin must be exactly 4 digits' })
    }

    const fields = {}
    for (const key of ALLOWED_FIELDS) {
      if (rest[key] !== undefined) fields[key] = rest[key]
    }

    const { error } = await supabase
      .from('businesses')
      .update(fields)
      .eq('id', business_id)

    if (error) {
      console.error('[settings] update error:', error)
      return res.status(500).json({ error: error.message || 'Failed to save settings' })
    }
    return res.status(200).json({ success: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
