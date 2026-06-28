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

module.exports = async function handler(req, res) {
  const user = await getUser(req)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  // GET — list all services for a business
  if (req.method === 'GET') {
    const { business } = req.query
    if (!business) return res.status(400).json({ error: 'business is required' })

    const { data, error } = await supabase
      .from('services')
      .select('id, name, duration_minutes, starting_price')
      .eq('business_id', business)
      .order('starting_price')

    if (error) return res.status(500).json({ error: 'Failed to fetch services' })
    return res.status(200).json({ services: data })
  }

  // POST — upsert a service (update if id provided, insert if not)
  if (req.method === 'POST') {
    const { business_id, id, name, duration_minutes, starting_price } = req.body

    if (!business_id || !name || duration_minutes == null || starting_price == null) {
      return res.status(400).json({ error: 'business_id, name, duration_minutes, and starting_price are required' })
    }

    const row = { business_id, name, duration_minutes: Number(duration_minutes), starting_price: Number(starting_price) }
    if (id) row.id = id

    const { data, error } = await supabase
      .from('services')
      .upsert(row, { onConflict: 'id' })
      .select('id, name, duration_minutes, starting_price')
      .single()

    if (error) return res.status(500).json({ error: 'Failed to save service' })
    return res.status(200).json({ service: data })
  }

  // DELETE — remove a service by id
  if (req.method === 'DELETE') {
    const { id, business_id } = req.body
    if (!id || !business_id) return res.status(400).json({ error: 'id and business_id are required' })

    const { error } = await supabase
      .from('services')
      .delete()
      .eq('id', id)
      .eq('business_id', business_id)

    if (error) return res.status(500).json({ error: 'Failed to delete service' })
    return res.status(200).json({ success: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
