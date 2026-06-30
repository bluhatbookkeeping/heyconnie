const { createClient } = require('@supabase/supabase-js')
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  const slug = req.query.b || ''
  if (!slug) return res.status(400).json({ error: 'missing b param' })

  const { data, error } = await supabase
    .from('businesses')
    .select('id,name,phone,instagram,service_area')
    .eq('id', slug)
    .single()

  if (error || !data) return res.status(404).json({ error: 'not found' })

  res.setHeader('Cache-Control', 'public, max-age=300')
  res.status(200).json(data)
}
