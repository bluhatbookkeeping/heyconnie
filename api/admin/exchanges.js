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
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const user = await getUser(req)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  const { business, status = 'pending_review', topic, limit = 20, offset = 0 } = req.query
  if (!business) return res.status(400).json({ error: 'business is required' })

  const lim = Math.min(parseInt(limit) || 20, 100)
  const off = parseInt(offset) || 0

  // Build base query
  let query = supabase
    .from('call_exchanges')
    .select('id, customer_question, agent_response, topic, status, created_at, call_logs(caller_phone, started_at)')
    .eq('business_id', business)
    .eq('status', status)
    .order('created_at', { ascending: false })
    .range(off, off + lim - 1)

  if (topic) query = query.eq('topic', topic)

  const { data: exchanges, error } = await query
  if (error) return res.status(500).json({ error: 'Failed to fetch exchanges' })

  // Total count with same filters
  let countQuery = supabase
    .from('call_exchanges')
    .select('id', { count: 'exact', head: true })
    .eq('business_id', business)
    .eq('status', status)

  if (topic) countQuery = countQuery.eq('topic', topic)

  const { count: total, error: countError } = await countQuery
  if (countError) return res.status(500).json({ error: 'Failed to count exchanges' })

  // Pending count (always, regardless of status filter)
  const { count: pending_count, error: pendingError } = await supabase
    .from('call_exchanges')
    .select('id', { count: 'exact', head: true })
    .eq('business_id', business)
    .eq('status', 'pending_review')

  if (pendingError) return res.status(500).json({ error: 'Failed to count pending' })

  return res.status(200).json({ exchanges, total, pending_count })
}
