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

  // GET — return current availability windows for a business
  if (req.method === 'GET') {
    const { business } = req.query
    if (!business) return res.status(400).json({ error: 'business is required' })

    const { data, error } = await supabase
      .from('availability_windows')
      .select('day_of_week, start_time, end_time')
      .eq('business_id', business)
      .order('day_of_week')

    if (error) return res.status(500).json({ error: 'Failed to fetch hours' })
    return res.status(200).json({ hours: data })
  }

  // POST — upsert availability windows
  if (req.method === 'POST') {
    const { business_id, hours } = req.body

    if (!business_id || !Array.isArray(hours)) {
      return res.status(400).json({ error: 'business_id and hours array required' })
    }

    for (const h of hours) {
      if (
        typeof h.day_of_week !== 'number' ||
        h.day_of_week < 0 || h.day_of_week > 6 ||
        !h.start_time || !h.end_time
      ) {
        return res.status(400).json({ error: 'Each hour entry needs day_of_week (0-6), start_time, end_time' })
      }
    }

    const incomingDays = hours.map(h => h.day_of_week)

    if (incomingDays.length > 0) {
      const { error: deleteError } = await supabase
        .from('availability_windows')
        .delete()
        .eq('business_id', business_id)
        .not('day_of_week', 'in', `(${incomingDays.join(',')})`)

      if (deleteError) return res.status(500).json({ error: 'Failed to update hours' })
    } else {
      // All days closed — delete everything for this business
      const { error: deleteError } = await supabase
        .from('availability_windows')
        .delete()
        .eq('business_id', business_id)

      if (deleteError) return res.status(500).json({ error: 'Failed to update hours' })
    }

    if (hours.length > 0) {
      const rows = hours.map(h => ({
        business_id,
        day_of_week: h.day_of_week,
        start_time: h.start_time,
        end_time: h.end_time,
      }))

      const { error: upsertError } = await supabase
        .from('availability_windows')
        .upsert(rows, { onConflict: 'business_id,day_of_week' })

      if (upsertError) return res.status(500).json({ error: 'Failed to update hours' })
    }

    return res.status(200).json({ success: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
