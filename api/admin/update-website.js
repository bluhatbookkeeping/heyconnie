const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

async function getUser(req) {
  const token = req.headers['authorization']?.replace('Bearer ', '')
  if (!token) return null
  const { data: { user }, error } = await supabase.auth.getUser(token)
  return error ? null : user
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const user = await getUser(req)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  const {
    business_id,
    website_enabled,
    website_template,
    tagline,
    hero_image_url,
    gallery_image_urls,
    instagram,
    facebook_url,
  } = req.body

  if (!business_id) return res.status(400).json({ error: 'business_id required' })

  const updates = {}
  if (website_enabled  !== undefined) updates.website_enabled  = Boolean(website_enabled)
  if (website_template !== undefined) updates.website_template = website_template
  if (tagline          !== undefined) updates.tagline          = tagline || null
  if (hero_image_url   !== undefined) updates.hero_image_url   = hero_image_url || null
  if (gallery_image_urls !== undefined) updates.gallery_image_urls = gallery_image_urls
  if (instagram        !== undefined) updates.instagram        = instagram || null
  if (facebook_url     !== undefined) updates.facebook_url     = facebook_url || null

  if (!Object.keys(updates).length) return res.status(400).json({ error: 'No fields to update' })

  const { error } = await supabase.from('businesses').update(updates).eq('id', business_id)

  if (error) {
    console.error('update-website error:', error)
    return res.status(500).json({ error: 'Failed to save' })
  }

  return res.status(200).json({ ok: true })
}
