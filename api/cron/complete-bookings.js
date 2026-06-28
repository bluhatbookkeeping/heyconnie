const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

module.exports = async function handler(req, res) {
  const secret = req.headers['x-admin-secret']
  if (secret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const now = new Date().toISOString()

  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('id')
    .eq('status', 'confirmed')
    .not('end_datetime', 'is', null)
    .lt('end_datetime', now)

  if (error) return res.status(500).json({ error: 'Failed to query bookings' })
  if (!bookings || !bookings.length) return res.status(200).json({ completed: 0 })

  const ids = bookings.map(b => b.id)
  const { error: updateError } = await supabase
    .from('bookings')
    .update({ status: 'completed' })
    .in('id', ids)

  if (updateError) return res.status(500).json({ error: 'Failed to update bookings' })

  return res.status(200).json({ completed: bookings.length })
}
