const { createClient } = require('@supabase/supabase-js')
const { buildAssistantConfig } = require('../../config/vapi-assistant')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const VAPI_BASE = 'https://api.vapi.ai'

async function getUser(req) {
  const token = req.headers['authorization']?.replace('Bearer ', '')
  if (!token) return null
  const { data: { user }, error } = await supabase.auth.getUser(token)
  return error ? null : user
}

async function vapiPost(path, body, apiKey) {
  const res = await fetch(`${VAPI_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  })
  const data = await res.json()
  if (!res.ok) throw new Error(JSON.stringify(data))
  return data
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const adminSecret = req.headers['x-admin-secret']
  const user = adminSecret ? null : await getUser(req)
  if (!user && adminSecret !== process.env.ADMIN_SECRET) return res.status(401).json({ error: 'Unauthorized' })

  const { business_id, base_url, transfer_number } = req.body || {}
  if (!business_id) return res.status(400).json({ error: 'business_id is required' })

  const { data: business, error: bizError } = await supabase
    .from('businesses')
    .select('*')
    .eq('id', business_id)
    .single()

  if (bizError || !business) return res.status(404).json({ error: 'Business not found' })

  if (base_url) business.base_url = base_url
  if (transfer_number) business.transfer_number = transfer_number

  if (!business.base_url) return res.status(400).json({ error: 'base_url is required' })

  const apiKey = process.env.VAPI_API_KEY
  const vapiSecret = process.env.VAPI_SECRET
  const { functionTools, transferCallTool } = buildAssistantConfig(business, vapiSecret)

  // Step 1: Create each function tool via Vapi Tools API → collect IDs
  let toolIds = []
  try {
    const created = await Promise.all(functionTools.map(t => vapiPost('/tool', t, apiKey)))
    toolIds = created.map(t => t.id)
  } catch (err) {
    console.error('Failed to create Vapi tools:', err.message)
    return res.status(502).json({ error: 'Failed to create Vapi tools', detail: err.message })
  }

  // Step 2: Create the assistant — toolIds for function tools, transferCall inline in model.tools
  const { assistantBody } = buildAssistantConfig(business, vapiSecret)
  assistantBody.model.toolIds = toolIds
  assistantBody.model.tools = [transferCallTool]

  let vapiData
  try {
    vapiData = await vapiPost('/assistant', assistantBody, apiKey)
  } catch (err) {
    console.error('Failed to create Vapi assistant:', err.message)
    return res.status(502).json({ error: 'Vapi assistant creation failed', detail: err.message })
  }

  const assistantId = vapiData.id

  const { error: writeError } = await supabase
    .from('businesses')
    .update({ vapi_assistant_id: assistantId })
    .eq('id', business_id)

  if (writeError) {
    console.error('Failed to write vapi_assistant_id:', writeError)
    return res.status(500).json({
      error: 'Assistant created but failed to save ID to database',
      assistantId,
      businessName: business.name
    })
  }

  return res.status(200).json({ assistantId, businessName: business.name, toolIds })
}
