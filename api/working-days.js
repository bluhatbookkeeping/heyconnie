const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { business } = req.query
  if (!business) return res.status(400).json({ error: 'business is required' })

  const { data, error } = await supabase
    .from('availability_windows')
    .select('day_of_week')
    .eq('business_id', business)

  if (error) return res.status(500).json({ error: error.message })

  const days = (data || []).map(r => r.day_of_week)
  return res.status(200).json({ days })
}
