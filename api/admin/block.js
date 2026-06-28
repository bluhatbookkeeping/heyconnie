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

  // POST — add a blocked date
  if (req.method === 'POST') {
    const { business_id, blocked_date, reason } = req.body

    if (!business_id || !blocked_date) {
      return res.status(400).json({ error: 'business_id and blocked_date are required' })
    }

    const { data, error } = await supabase
      .from('blocked_dates')
      .insert({ business_id, blocked_date, reason: reason || null })
      .select('id, blocked_date, reason')
      .single()

    if (error) return res.status(500).json({ error: 'Failed to block date' })
    return res.status(200).json({ blocked: data })
  }

  // DELETE — remove a blocked date by id
  if (req.method === 'DELETE') {
    const { id, business_id } = req.body

    if (!id || !business_id) {
      return res.status(400).json({ error: 'id and business_id are required' })
    }

    const { error } = await supabase
      .from('blocked_dates')
      .delete()
      .eq('id', id)
      .eq('business_id', business_id)

    if (error) return res.status(500).json({ error: 'Failed to remove blocked date' })
    return res.status(200).json({ success: true })
  }

  // GET — list blocked dates for a business
  if (req.method === 'GET') {
    const { business } = req.query
    if (!business) return res.status(400).json({ error: 'business is required' })

    const { data, error } = await supabase
      .from('blocked_dates')
      .select('id, blocked_date, reason')
      .eq('business_id', business)
      .order('blocked_date')

    if (error) return res.status(500).json({ error: 'Failed to fetch blocked dates' })
    return res.status(200).json({ blocked: data })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
