const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const VALID_ACTIONS = ['approve', 'edit', 'reject']

async function getUser(req) {
  const token = req.headers['authorization']?.replace('Bearer ', '')
  if (!token) return null
  const { data: { user }, error } = await supabase.auth.getUser(token)
  return error ? null : user
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const user = await getUser(req)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  const { exchange_id, action, edited_response, notes } = req.body

  if (!exchange_id) return res.status(400).json({ error: 'exchange_id is required' })
  if (!VALID_ACTIONS.includes(action)) return res.status(400).json({ error: 'action must be approve, edit, or reject' })
  if (action === 'edit' && !edited_response?.trim()) {
    return res.status(400).json({ error: 'edited_response is required for action=edit' })
  }

  // Update exchange status
  const { error: updateError } = await supabase
    .from('call_exchanges')
    .update({
      status: action === 'approve' ? 'approved' : action === 'edit' ? 'edited' : 'rejected',
      reviewed_at: new Date().toISOString(),
      reviewer_notes: notes || null
    })
    .eq('id', exchange_id)

  if (updateError) return res.status(500).json({ error: 'Failed to update exchange' })

  if (action === 'reject') {
    return res.status(200).json({ success: true, action, golden_id: null })
  }

  // Fetch exchange to build golden_responses row
  const { data: exchange, error: fetchError } = await supabase
    .from('call_exchanges')
    .select('business_id, customer_question, agent_response, topic')
    .eq('id', exchange_id)
    .single()

  if (fetchError || !exchange) return res.status(500).json({ error: 'Failed to fetch exchange for golden response' })

  const { data: golden, error: goldenError } = await supabase
    .from('golden_responses')
    .insert({
      business_id: exchange.business_id,
      exchange_id,
      question: exchange.customer_question,
      response: action === 'edit' ? edited_response.trim() : exchange.agent_response,
      topic: exchange.topic
    })
    .select('id')
    .single()

  if (goldenError) return res.status(500).json({ error: 'Failed to create golden response' })

  return res.status(200).json({ success: true, action, golden_id: golden.id })
}
