const { createClient } = require('@supabase/supabase-js')
const { executeSends } = require('../admin/campaigns')

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

module.exports = async function handler(req, res) {
  const secret = req.headers['x-admin-secret']
  if (secret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const now = new Date().toISOString()

  // Find campaigns that are scheduled and due
  const { data: due, error } = await supabase
    .from('campaigns')
    .select('id, business_id')
    .eq('status', 'scheduled')
    .lte('scheduled_at', now)

  if (error) return res.status(500).json({ error: error.message })
  if (!due?.length) return res.status(200).json({ fired: 0 })

  let fired = 0
  for (const campaign of due) {
    try {
      await executeSends(campaign.id, campaign.business_id)
      fired++
    } catch (err) {
      console.error(`send-campaigns cron error [${campaign.id}]:`, err.message)
      await supabase.from('campaigns').update({ status: 'failed' }).eq('id', campaign.id)
    }
  }

  return res.status(200).json({ fired })
}
