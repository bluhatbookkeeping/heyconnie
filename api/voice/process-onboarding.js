const Anthropic = require('@anthropic-ai/sdk')
const { createClient } = require('@supabase/supabase-js')

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

// Static — cache-eligible
const SETUP_EXTRACTION_SYSTEM = `You are a data extraction engine. Given a transcript from a business onboarding call for a mobile detailing business, extract structured profile data and return ONLY valid JSON.

Extract this shape exactly:
{
  "business_name": "string or null",
  "owner_name": "string or null",
  "greeting": "string — how the AI should answer the phone, or null",
  "services": [{ "name": "string", "price": "string", "description": "string or null", "duration_minutes": number or null }],
  "service_area": { "cities": ["string"], "radius_note": "string or null" },
  "hours": { "mon": { "open": "HH:MM", "close": "HH:MM" }, "tue": ..., "wed": ..., "thu": ..., "fri": ..., "sat": ..., "sun": ... },
  "policies": { "cancellation": "string or null", "weather": "string or null", "payment_methods": ["string"], "requirements": "string or null" },
  "faq_seeds": [{ "question": "string", "answer": "string" }],
  "tone": { "style": "casual or professional", "agent_name": "string or null", "language": "english", "avoid_phrases": ["string"] }
}

Rules:
- Only include hours for days explicitly mentioned. Omit days with no information.
- services array must include every service mentioned with a price. Empty array if none found.
- faq_seeds must include every question+answer pair that came up. Empty array if none.
- For any field with no information in the transcript, use null or empty array as appropriate.
- Do NOT invent or infer information not stated in the transcript.
- Return ONLY the JSON object. No explanation, no markdown, no wrapper.`

const UPDATE_EXTRACTION_SYSTEM = `You are a data extraction engine. Given a transcript from a business profile UPDATE call, extract ONLY the fields that changed. Return ONLY valid JSON.

Extract this shape exactly — include a key only if it was mentioned in the call:
{
  "business_name": "string or null",
  "owner_name": "string or null",
  "greeting": "string or null",
  "services_add": [{ "name": "string", "price": "string", "description": "string or null", "duration_minutes": number or null }],
  "services_update": [{ "name": "string", "price": "string or null", "description": "string or null", "duration_minutes": number or null }],
  "services_remove": ["service name strings"],
  "cities_add": ["string"],
  "cities_remove": ["string"],
  "hours": { "mon": { "open": "HH:MM", "close": "HH:MM" }, ... },
  "policies": { "cancellation": "string or null", "weather": "string or null", "payment_methods": ["string"], "requirements": "string or null" },
  "faq_seeds_add": [{ "question": "string", "answer": "string" }],
  "tone": { "style": "string or null", "agent_name": "string or null", "avoid_phrases": ["string"] }
}

Rules:
- Only include keys that were explicitly discussed in the call. Omit everything else.
- services_update matches existing services by name — only include fields that changed.
- hours: only include days that were mentioned.
- policies: only include fields that were discussed.
- Return ONLY the JSON object. No explanation, no markdown, no wrapper.`

async function extractProfile(transcript, callType) {
  const systemPrompt = callType === 'initial_setup' ? SETUP_EXTRACTION_SYSTEM : UPDATE_EXTRACTION_SYSTEM

  let response
  try {
    response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      system: [
        {
          type: 'text',
          text: systemPrompt,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [
        {
          role: 'user',
          content: `Extract structured data from this onboarding call transcript:\n\n${transcript}`,
        },
      ],
    })
  } catch (err) {
    console.error('[process-onboarding] Claude extraction failed:', err.message, err.status)
    return null
  }

  try {
    let text = response.content[0]?.text || 'null'
    // Strip markdown code fences if present
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
    return JSON.parse(text)
  } catch {
    console.error('[process-onboarding] Failed to parse Claude JSON:', response.content[0]?.text?.slice(0, 200))
    return null
  }
}

function mergeProfile(existing, changes) {
  const merged = { ...existing }

  // Simple text fields — replace if non-null
  for (const field of ['business_name', 'owner_name', 'greeting']) {
    if (changes[field] != null) merged[field] = changes[field]
  }

  // services — append adds, update matches by name, remove by name
  const currentServices = Array.isArray(merged.services) ? [...merged.services] : []

  if (Array.isArray(changes.services_add)) {
    merged.services = [...currentServices, ...changes.services_add]
  } else {
    merged.services = currentServices
  }

  if (Array.isArray(changes.services_update)) {
    merged.services = merged.services.map(svc => {
      const update = changes.services_update.find(u => u.name.toLowerCase() === svc.name.toLowerCase())
      return update ? { ...svc, ...update } : svc
    })
  }

  if (Array.isArray(changes.services_remove)) {
    const removeNames = changes.services_remove.map(n => n.toLowerCase())
    merged.services = merged.services.filter(svc => !removeNames.includes(svc.name.toLowerCase()))
  }

  // cities — append adds, remove removals
  const currentCities = existing.service_area?.cities || []
  let updatedCities = [...currentCities]

  if (Array.isArray(changes.cities_add)) {
    const existingLower = updatedCities.map(c => c.toLowerCase())
    for (const city of changes.cities_add) {
      if (!existingLower.includes(city.toLowerCase())) updatedCities.push(city)
    }
  }

  if (Array.isArray(changes.cities_remove)) {
    const removeNames = changes.cities_remove.map(c => c.toLowerCase())
    updatedCities = updatedCities.filter(c => !removeNames.includes(c.toLowerCase()))
  }

  merged.service_area = {
    ...(existing.service_area || {}),
    cities: updatedCities,
  }

  // hours — merge at day level
  if (changes.hours && typeof changes.hours === 'object') {
    merged.hours = { ...(existing.hours || {}), ...changes.hours }
  }

  // policies — merge at key level
  if (changes.policies && typeof changes.policies === 'object') {
    merged.policies = { ...(existing.policies || {}), ...changes.policies }
  }

  // faq_seeds — append new seeds
  if (Array.isArray(changes.faq_seeds_add)) {
    merged.faq_seeds = [...(existing.faq_seeds || []), ...changes.faq_seeds_add]
  }

  // tone — merge at key level
  if (changes.tone && typeof changes.tone === 'object') {
    merged.tone = { ...(existing.tone || {}), ...changes.tone }
  }

  return merged
}

// Day name → day_of_week integer (0 = Sunday)
const DAY_MAP = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 }

async function syncHoursToAvailability(businessId, hours) {
  if (!hours || typeof hours !== 'object' || !Object.keys(hours).length) return

  const rows = []
  for (const [day, times] of Object.entries(hours)) {
    const dow = DAY_MAP[day.toLowerCase().slice(0, 3)]
    if (dow === undefined || !times?.open || !times?.close) continue
    rows.push({
      business_id: businessId,
      day_of_week: dow,
      start_time: times.open,
      end_time: times.close,
    })
  }

  if (!rows.length) return

  // Delete days not in the new set, then upsert the new rows
  const incomingDays = rows.map(r => r.day_of_week)
  await supabase
    .from('availability_windows')
    .delete()
    .eq('business_id', businessId)
    .not('day_of_week', 'in', `(${incomingDays.join(',')})`)

  const { error } = await supabase
    .from('availability_windows')
    .upsert(rows, { onConflict: 'business_id,day_of_week' })

  if (error) console.error('[process-onboarding] availability_windows sync error:', error.message)
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { business_id, vapi_call_id, transcript, call_type } = req.body || {}

  if (!business_id || !transcript || !call_type) {
    return res.status(400).json({ error: 'business_id, transcript, and call_type are required' })
  }

  if (!['initial_setup', 'profile_update'].includes(call_type)) {
    return res.status(400).json({ error: 'call_type must be initial_setup or profile_update' })
  }

  // Step 1 — Save raw transcript
  const { data: callRow, error: callInsertError } = await supabase
    .from('onboarding_calls')
    .insert({
      business_id,
      vapi_call_id: vapi_call_id || null,
      call_type,
      transcript,
      processed: false,
    })
    .select('id')
    .single()

  if (callInsertError) {
    console.error('[process-onboarding] onboarding_calls insert error:', callInsertError)
    return res.status(500).json({ error: 'Failed to save call record' })
  }

  const callRowId = callRow.id

  // Step 2 — Extract structured data via Haiku
  const extracted = await extractProfile(transcript, call_type)

  if (!extracted) {
    return res.status(500).json({ error: 'Extraction failed', call_id: callRowId })
  }

  // Save extracted data to onboarding_calls regardless of what happens next
  await supabase
    .from('onboarding_calls')
    .update({ extracted_data: extracted })
    .eq('id', callRowId)

  // Step 3 — Write to business_profiles
  let finalProfile

  if (call_type === 'initial_setup') {
    // Upsert full profile
    const profileData = {
      business_id,
      business_name: extracted.business_name || 'Unknown Business',
      owner_name: extracted.owner_name || null,
      greeting: extracted.greeting || null,
      services: extracted.services || [],
      service_area: extracted.service_area || { cities: [], radius_note: null },
      hours: extracted.hours || null,
      policies: extracted.policies || null,
      faq_seeds: extracted.faq_seeds || [],
      tone: extracted.tone || null,
      onboarding_call_id: vapi_call_id || null,
      onboarding_transcript: transcript,
      profile_status: 'review',
      updated_at: new Date().toISOString(),
    }

    const { data: upserted, error: upsertError } = await supabase
      .from('business_profiles')
      .upsert(profileData, { onConflict: 'business_id' })
      .select()
      .single()

    if (upsertError) {
      console.error('[process-onboarding] business_profiles upsert error:', upsertError)
      return res.status(500).json({ error: 'Failed to save profile', call_id: callRowId })
    }

    finalProfile = upserted

  } else {
    // Fetch existing profile and merge
    const { data: existing, error: fetchError } = await supabase
      .from('business_profiles')
      .select('*')
      .eq('business_id', business_id)
      .single()

    if (fetchError || !existing) {
      console.error('[process-onboarding] No existing profile found for:', business_id)
      return res.status(404).json({ error: 'No profile found for this business_id. Run initial_setup first.' })
    }

    const merged = mergeProfile(existing, extracted)
    merged.profile_status = 'review'
    merged.updated_at = new Date().toISOString()

    const { data: updated, error: updateError } = await supabase
      .from('business_profiles')
      .update(merged)
      .eq('business_id', business_id)
      .select()
      .single()

    if (updateError) {
      console.error('[process-onboarding] business_profiles update error:', updateError)
      return res.status(500).json({ error: 'Failed to update profile', call_id: callRowId })
    }

    finalProfile = updated
  }

  // Step 4 — Sync hours to availability_windows (booking engine single source of truth)
  const hoursToSync = call_type === 'initial_setup'
    ? extracted.hours
    : extracted.hours  // mergeProfile already merged hours into finalProfile; re-use extracted delta
  await syncHoursToAvailability(business_id, hoursToSync)

  // Step 5 — Mark call as processed
  await supabase
    .from('onboarding_calls')
    .update({ processed: true })
    .eq('id', callRowId)

  // Step 6 — Return final profile
  return res.status(200).json({
    ok: true,
    call_id: callRowId,
    profile: finalProfile,
  })
}
