const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const SETUP_PHONE_NUMBER = process.env.SETUP_PHONE_NUMBER || '(818) 403-3447'

async function getUser(req) {
  const token = req.headers['authorization']?.replace('Bearer ', '')
  if (!token) return null
  const { data: { user }, error } = await supabase.auth.getUser(token)
  return error ? null : user
}

function isAdminSecret(req) {
  return req.headers['x-admin-secret'] === process.env.ADMIN_SECRET
}

function generateBusinessId(businessName) {
  return businessName
    .toLowerCase()
    .replace(/['']/g, '')          // strip apostrophes
    .replace(/[^a-z0-9]+/g, '-')  // non-alphanumeric → hyphen
    .replace(/^-+|-+$/g, '')      // trim leading/trailing hyphens
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const authorized = isAdminSecret(req) || await getUser(req)
  if (!authorized) return res.status(401).json({ error: 'Unauthorized' })

  const { business_name, owner_name, owner_phone, owner_email } = req.body || {}

  if (!business_name?.trim()) return res.status(400).json({ error: 'business_name is required' })
  if (!owner_phone?.trim())   return res.status(400).json({ error: 'owner_phone is required' })

  const business_id = generateBusinessId(business_name)

  // Check for ID collision
  const { data: existing } = await supabase
    .from('businesses')
    .select('id')
    .eq('id', business_id)
    .maybeSingle()

  if (existing) {
    return res.status(409).json({
      error: `Business ID "${business_id}" already exists. Choose a different name or contact support.`
    })
  }

  // Normalize owner_phone to last 10 digits for storage
  const normalizedPhone = owner_phone.replace(/\D/g, '').slice(-10)

  // 1. Insert into businesses
  const { error: bizError } = await supabase
    .from('businesses')
    .insert({
      id: business_id,
      name: business_name.trim(),
      owner_name: owner_name?.trim() || null,
      owner_phone: normalizedPhone,
      email: owner_email?.trim() || null,
      features: { chat: false, voice: false, marketing: false },
      timezone: 'America/Los_Angeles',
    })

  if (bizError) {
    console.error('create-business: businesses insert error', bizError)
    return res.status(500).json({ error: 'Failed to create business record' })
  }

  // 2. Insert into business_profiles
  const { error: profileError } = await supabase
    .from('business_profiles')
    .insert({
      business_id,
      business_name: business_name.trim(),
      owner_name: owner_name?.trim() || null,
      owner_phone: normalizedPhone,
      profile_status: 'draft',
    })

  if (profileError) {
    console.error('create-business: business_profiles insert error', profileError)
    // Don't fail the whole request — business row exists, profile can be created manually
  }

  // 3. Create initial onboarding_calls row
  const { error: callError } = await supabase
    .from('onboarding_calls')
    .insert({
      business_id,
      call_type: 'initial_setup',
      processed: false,
    })

  if (callError) {
    console.error('create-business: onboarding_calls insert error', callError)
    // Non-fatal — row can be created when the actual call comes in
  }

  return res.status(201).json({
    business_id,
    setup_phone: SETUP_PHONE_NUMBER,
    message: `Call ${SETUP_PHONE_NUMBER} to set up your AI receptionist`,
  })
}
