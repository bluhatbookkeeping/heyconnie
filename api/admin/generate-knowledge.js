const { createClient } = require('@supabase/supabase-js')
const { runSync } = require('./knowledge/sync')
const { buildAssistantConfig } = require('../../config/vapi-assistant')

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

// Map profile data to { category, question, answer } rows
function generateQAs(profile) {
  const rows = []

  // Services
  for (const svc of (profile.services || [])) {
    if (!svc.name) continue
    const parts = []
    if (svc.price) parts.push(`starts at ${svc.price}`)
    if (svc.duration_minutes) parts.push(`takes about ${svc.duration_minutes} minutes`)
    if (svc.description) parts.push(svc.description)

    rows.push({
      category: 'pricing',
      question: `How much does ${svc.name} cost?`,
      answer: parts.length ? parts.join('. ') + '.' : `Please call for current pricing on ${svc.name}.`
    })

    if (svc.description || svc.duration_minutes) {
      rows.push({
        category: 'services',
        question: `What is included in the ${svc.name}?`,
        answer: [svc.description, svc.duration_minutes ? `Takes approximately ${svc.duration_minutes} minutes.` : null]
          .filter(Boolean).join(' ')
      })
    }
  }

  // Service area — one Q/A per city
  const cities = profile.service_area?.cities || []
  if (cities.length > 0) {
    rows.push({
      category: 'location',
      question: 'What areas do you serve?',
      answer: `We serve ${cities.join(', ')}.${profile.service_area?.radius_note ? ' ' + profile.service_area.radius_note : ''}`
    })
    for (const city of cities) {
      rows.push({
        category: 'location',
        question: `Do you come to ${city}?`,
        answer: `Yes, we service ${city}.`
      })
    }
  }

  // Hours
  if (profile.hours && typeof profile.hours === 'object') {
    const dayNames = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' }
    const openDays = Object.entries(profile.hours)
      .filter(([, h]) => h?.open && h?.close)
      .map(([day, h]) => `${dayNames[day] || day} ${h.open}–${h.close}`)
    if (openDays.length > 0) {
      rows.push({
        category: 'scheduling',
        question: 'What are your hours?',
        answer: `We are available: ${openDays.join(', ')}.`
      })
    }
  }

  // Policies
  const policies = profile.policies || {}

  if (policies.cancellation) {
    rows.push({
      category: 'scheduling',
      question: 'What is your cancellation policy?',
      answer: policies.cancellation
    })
  }

  if (policies.weather) {
    rows.push({
      category: 'scheduling',
      question: 'Do you work in the rain?',
      answer: policies.weather
    })
  }

  if (policies.payment_methods?.length) {
    rows.push({
      category: 'other',
      question: 'What payment methods do you accept?',
      answer: `We accept ${policies.payment_methods.join(', ')}.`
    })
  }

  if (policies.requirements) {
    rows.push({
      category: 'other',
      question: 'What does the customer need to provide?',
      answer: policies.requirements
    })
  }

  // FAQ seeds from onboarding call
  for (const faq of (profile.faq_seeds || [])) {
    if (!faq.question || !faq.answer) continue
    rows.push({
      category: 'other',
      question: faq.question,
      answer: faq.answer
    })
  }

  return rows
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const user = await getUser(req)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  const { business_id } = req.body || {}
  if (!business_id) return res.status(400).json({ error: 'business_id is required' })

  // 1. Fetch business profile
  const { data: profile, error: profileError } = await supabase
    .from('business_profiles')
    .select('*')
    .eq('business_id', business_id)
    .single()

  if (profileError || !profile) {
    return res.status(404).json({ error: 'No profile found for this business_id' })
  }

  // 2. Fetch Vapi assistant ID from businesses table
  const { data: biz, error: bizError } = await supabase
    .from('businesses')
    .select('vapi_assistant_id')
    .eq('id', business_id)
    .single()

  if (bizError || !biz?.vapi_assistant_id) {
    return res.status(400).json({ error: 'No vapi_assistant_id configured for this business' })
  }

  // 3. Generate Q/A rows from profile
  const qaRows = generateQAs(profile)

  if (qaRows.length === 0) {
    return res.status(400).json({ error: 'Profile has insufficient data to generate knowledge entries' })
  }

  // 4. Upsert into knowledge_base — update if question already exists, insert if not
  const { data: existingRows } = await supabase
    .from('knowledge_base')
    .select('id, question')
    .eq('business_id', business_id)

  const existingMap = new Map(
    (existingRows || []).map(r => [r.question.toLowerCase().trim(), r.id])
  )

  const toInsert = []
  const toUpdate = []

  for (const row of qaRows) {
    const key = row.question.toLowerCase().trim()
    if (existingMap.has(key)) {
      toUpdate.push({ id: existingMap.get(key), answer: row.answer, category: row.category })
    } else {
      toInsert.push({ business_id, ...row })
    }
  }

  const errors = []

  if (toInsert.length > 0) {
    const { error: insertError } = await supabase.from('knowledge_base').insert(toInsert)
    if (insertError) errors.push(`insert: ${insertError.message}`)
  }

  for (const row of toUpdate) {
    const { error: updateError } = await supabase
      .from('knowledge_base')
      .update({ answer: row.answer, category: row.category })
      .eq('id', row.id)
    if (updateError) errors.push(`update ${row.id}: ${updateError.message}`)
  }

  if (errors.length > 0) {
    console.error('[generate-knowledge] DB errors:', errors)
    return res.status(500).json({ error: 'Failed to write some knowledge entries', details: errors })
  }

  // 5. Sync to Vapi (reads from both knowledge_base + golden_responses)
  let syncResult
  try {
    syncResult = await runSync(business_id, biz.vapi_assistant_id)
  } catch (err) {
    console.error('[generate-knowledge] Vapi sync failed:', err.message)
    return res.status(500).json({
      error: 'Knowledge written to DB but Vapi sync failed',
      detail: err.message,
      response_count: qaRows.length
    })
  }

  // 6. Mark profile as active
  await supabase
    .from('business_profiles')
    .update({ profile_status: 'active', updated_at: new Date().toISOString() })
    .eq('business_id', business_id)

  // 7. Upgrade basic agent → full Connie config (non-fatal)
  try {
    await upgradeToFullAgent(business_id, biz.vapi_assistant_id, profile)
  } catch (err) {
    console.error('[generate-knowledge] Vapi upgrade failed:', err.message)
  }

  return res.status(200).json({
    success: true,
    response_count: qaRows.length,
    inserted: toInsert.length,
    updated: toUpdate.length,
    file_id: syncResult.file_id,
  })
}

async function upgradeToFullAgent(businessId, assistantId, profile) {
  const VAPI_API_KEY = process.env.VAPI_API_KEY
  if (!VAPI_API_KEY) throw new Error('VAPI_API_KEY not set')
  if (!assistantId) throw new Error('No vapi_assistant_id on business — cannot upgrade')

  // Fetch services for the full config
  const { data: services } = await supabase
    .from('services')
    .select('name, starting_price, duration_minutes')
    .eq('business_id', businessId)

  // Fetch full business row
  const { data: biz } = await supabase
    .from('businesses')
    .select('*')
    .eq('id', businessId)
    .single()

  const business = {
    ...biz,
    services: services || [],
    service_area: profile?.service_area?.cities?.join(', ') || biz.service_area || '',
    base_url: process.env.BASE_URL || 'https://luis-mobile-detailing.vercel.app',
  }

  const { functionTools, assistantBody } = buildAssistantConfig(business, process.env.VAPI_SECRET)

  async function vapiRequest(method, path, body) {
    const res = await fetch(`https://api.vapi.ai${path}`, {
      method,
      headers: { 'Authorization': `Bearer ${VAPI_API_KEY}`, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    })
    const json = await res.json()
    if (!res.ok) throw new Error(`Vapi ${method} ${path} ${res.status}: ${JSON.stringify(json)}`)
    return json
  }

  // Get existing tool IDs on the assistant
  const current = await vapiRequest('GET', `/assistant/${assistantId}`)
  const existingToolIds = current.model?.toolIds || []
  const existingTools = await Promise.all(existingToolIds.map(id => vapiRequest('GET', `/tool/${id}`)))

  // Update or create each function tool
  const toolIds = []
  for (const tool of functionTools) {
    const name = tool.function.name
    const existing = existingTools.find(t => t.function?.name === name)
    if (existing) {
      const { type: _type, async: _async, ...patchBody } = tool
      await vapiRequest('PATCH', `/tool/${existing.id}`, patchBody)
      toolIds.push(existing.id)
    } else {
      const result = await vapiRequest('POST', '/tool', tool)
      toolIds.push(result.id)
    }
  }

  // PATCH assistant with full config
  await vapiRequest('PATCH', `/assistant/${assistantId}`, {
    name: assistantBody.name,
    firstMessage: assistantBody.firstMessage,
    endCallPhrases: assistantBody.endCallPhrases,
    serverUrl: assistantBody.serverUrl,
    model: { ...assistantBody.model, toolIds },
  })

  console.log(`[generate-knowledge] Upgraded assistant ${assistantId} to full Connie config for ${businessId}`)
}
