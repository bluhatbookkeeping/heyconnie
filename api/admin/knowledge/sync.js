const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const VAPI_API_KEY = process.env.VAPI_API_KEY
const DEFAULT_ASSISTANT_ID = (process.env.VAPI_ASSISTANT_ID && process.env.VAPI_ASSISTANT_ID !== 'undefined')
  ? process.env.VAPI_ASSISTANT_ID
  : 'a831eec7-9b7b-4b0c-928c-dea1c3cfd296'
const DEFAULT_BUSINESS_ID = 'luis-mobile-detail'
const TOPIC_ORDER = ['pricing', 'services', 'scheduling', 'location', 'other']

async function getUser(req) {
  const token = req.headers['authorization']?.replace('Bearer ', '')
  if (!token) return null
  const { data: { user }, error } = await supabase.auth.getUser(token)
  return error ? null : user
}

function buildMarkdown(businessName, grouped) {
  let md = `# ${businessName} — Knowledge Base\n\n`
  for (const topic of TOPIC_ORDER) {
    const items = grouped[topic]
    if (!items || items.length === 0) continue
    const heading = topic.charAt(0).toUpperCase() + topic.slice(1)
    md += `## ${heading}\n\n`
    for (const item of items) {
      md += `Q: ${item.question}\nA: ${item.answer}\n\n`
    }
  }
  return md.trim()
}

// Multipart/form-data without external deps (Node 18+ TextEncoder)
function buildFormData(fileContent, filename) {
  const boundary = `----FormBoundary${Date.now().toString(36)}`
  const CRLF = '\r\n'
  const enc = new TextEncoder()

  const preamble =
    `--${boundary}${CRLF}` +
    `Content-Disposition: form-data; name="file"; filename="${filename}"${CRLF}` +
    `Content-Type: text/markdown${CRLF}${CRLF}`

  const suffix =
    `${CRLF}--${boundary}${CRLF}` +
    `Content-Disposition: form-data; name="purpose"${CRLF}${CRLF}` +
    `assistants${CRLF}--${boundary}--${CRLF}`

  const fileBytes = enc.encode(fileContent)
  const preBytes = enc.encode(preamble)
  const sufBytes = enc.encode(suffix)

  const body = new Uint8Array(preBytes.length + fileBytes.length + sufBytes.length)
  body.set(preBytes, 0)
  body.set(fileBytes, preBytes.length)
  body.set(sufBytes, preBytes.length + fileBytes.length)

  return { body, contentType: `multipart/form-data; boundary=${boundary}` }
}

async function vapiRequest(method, path, bodyObj) {
  const res = await fetch(`https://api.vapi.ai${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${VAPI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: bodyObj ? JSON.stringify(bodyObj) : undefined
  })
  const json = await res.json()
  if (!res.ok) throw new Error(`Vapi ${method} ${path} → ${res.status}: ${JSON.stringify(json)}`)
  return json
}

// Core sync logic — callable by both the HTTP handler and generate-knowledge.js
async function runSync(businessId, assistantId) {
  if (!VAPI_API_KEY) throw new Error('Missing env var: VAPI_API_KEY')

  // 1. Fetch active golden responses (learning-loop approved)
  const { data: goldens, error: goldensError } = await supabase
    .from('golden_responses')
    .select('question, response, topic')
    .eq('business_id', businessId)
    .eq('is_active', true)
    .order('created_at', { ascending: true })

  if (goldensError) throw new Error('Failed to fetch golden responses')

  // 2. Fetch static knowledge base entries (profile-generated)
  const { data: kbRows, error: kbError } = await supabase
    .from('knowledge_base')
    .select('question, answer, category')
    .eq('business_id', businessId)
    .order('created_at', { ascending: true })

  if (kbError) throw new Error('Failed to fetch knowledge base')

  // 3. Fetch business name + current file ID
  const { data: biz, error: bizError } = await supabase
    .from('businesses')
    .select('name, vapi_knowledge_file_id')
    .eq('id', businessId)
    .single()

  if (bizError) throw new Error('Failed to fetch business record')

  // 4. Merge and group by topic. knowledge_base uses category; golden_responses uses topic.
  //    golden_responses take precedence on duplicate questions.
  const grouped = {}

  for (const row of (kbRows || [])) {
    const t = row.category || 'other'
    if (!grouped[t]) grouped[t] = []
    grouped[t].push({ question: row.question, answer: row.answer })
  }

  for (const row of (goldens || [])) {
    const t = row.topic || 'other'
    if (!grouped[t]) grouped[t] = []
    // Golden responses override any matching knowledge_base entry
    const existing = grouped[t].findIndex(i => i.question.toLowerCase() === row.question.toLowerCase())
    if (existing >= 0) {
      grouped[t][existing] = { question: row.question, answer: row.response }
    } else {
      grouped[t].push({ question: row.question, answer: row.response })
    }
  }

  const totalCount = (goldens?.length || 0) + (kbRows?.length || 0)
  const markdown = buildMarkdown(biz.name || businessId, grouped)
  const filename = `${businessId}-knowledge.md`

  // 5. Delete old Vapi file if one exists (non-fatal)
  if (biz?.vapi_knowledge_file_id) {
    await fetch(`https://api.vapi.ai/file/${biz.vapi_knowledge_file_id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${VAPI_API_KEY}` }
    }).catch(() => {})
  }

  // 6. Upload new markdown file to Vapi
  const { body, contentType } = buildFormData(markdown, filename)
  const uploadRes = await fetch('https://api.vapi.ai/file', {
    method: 'POST',
    headers: { Authorization: `Bearer ${VAPI_API_KEY}`, 'Content-Type': contentType },
    body
  })

  if (!uploadRes.ok) {
    const err = await uploadRes.text()
    throw new Error(`Vapi file upload failed: ${err}`)
  }

  const uploaded = await uploadRes.json()
  const newFileId = uploaded.id

  // 7. Find or create the search_knowledge query tool and attach to the assistant
  let queryToolId = null
  const assistant = await vapiRequest('GET', `/assistant/${assistantId}`)
  const existingToolIds = assistant.model?.toolIds || []

  let existingQueryTool = null
  for (const id of existingToolIds) {
    const tool = await vapiRequest('GET', `/tool/${id}`)
    if (tool.type === 'query') {
      existingQueryTool = tool
      break
    }
  }

  const kbBody = {
    provider: 'google',
    name: `${biz.name || businessId} Knowledge`,
    description: 'Proven responses to customer questions about pricing, services, scheduling, and service area.',
    fileIds: [newFileId]
  }

  if (existingQueryTool) {
    await vapiRequest('PATCH', `/tool/${existingQueryTool.id}`, { knowledgeBases: [kbBody] })
    queryToolId = existingQueryTool.id
  } else {
    const created = await vapiRequest('POST', '/tool', { type: 'query', knowledgeBases: [kbBody] })
    queryToolId = created.id
  }

  const nonQueryToolIds = existingToolIds.filter(id => id !== existingQueryTool?.id)
  const updatedToolIds = [...nonQueryToolIds, queryToolId]

  const existingModel = assistant.model || {}
  await vapiRequest('PATCH', `/assistant/${assistantId}`, {
    model: { ...existingModel, toolIds: updatedToolIds }
  })

  // 8. Save new file ID + sync timestamp to businesses table
  await supabase
    .from('businesses')
    .update({
      vapi_knowledge_file_id: newFileId,
      last_knowledge_sync: new Date().toISOString()
    })
    .eq('id', businessId)

  return { synced: totalCount, file_id: newFileId, tool_id: queryToolId }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const user = await getUser(req)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const result = await runSync(DEFAULT_BUSINESS_ID, DEFAULT_ASSISTANT_ID)
    return res.status(200).json({ success: true, ...result })
  } catch (err) {
    console.error('[sync] error:', err.message)
    return res.status(500).json({ error: err.message })
  }
}

module.exports.runSync = runSync
