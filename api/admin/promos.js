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

function generateCode(length = 8) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < length; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') return res.status(200).end()
  const user = await getUser(req)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  const bizId = req.query.business
  if (!bizId) return res.status(400).json({ error: 'Missing required query param: business' })

  // ── GET — list all promotions ──────────────────────────────────────
  if (req.method === 'GET') {
    const { data: promos, error } = await supabase
      .from('promotions')
      .select('*')
      .eq('business_id', bizId)
      .order('created_at', { ascending: false })

    if (error) return res.status(500).json({ error: error.message })

    // Attach code counts for unique promos
    const ids = promos.filter(p => p.code_type === 'unique').map(p => p.id)
    let codeCounts = {}
    if (ids.length) {
      const { data: counts } = await supabase
        .from('promo_codes')
        .select('promotion_id, redeemed')
        .in('promotion_id', ids)

      for (const row of (counts || [])) {
        if (!codeCounts[row.promotion_id]) codeCounts[row.promotion_id] = { total: 0, redeemed: 0 }
        codeCounts[row.promotion_id].total++
        if (row.redeemed) codeCounts[row.promotion_id].redeemed++
      }
    }

    return res.status(200).json({
      promotions: promos.map(p => ({
        ...p,
        code_counts: codeCounts[p.id] || null,
      })),
    })
  }

  // ── POST — create promotion ────────────────────────────────────────
  if (req.method === 'POST') {
    const {
      name, discount_type, discount_value, code_type, shared_code,
      max_total_uses, one_time_per_customer, valid_from, valid_until,
      unique_code_count, customer_id, applicable_services,
    } = req.body

    if (!name || !discount_type || discount_value == null || !code_type) {
      return res.status(400).json({ error: 'Missing required fields: name, discount_type, discount_value, code_type' })
    }

    if (code_type === 'shared' && !shared_code) {
      return res.status(400).json({ error: 'shared_code required when code_type is shared' })
    }

    const { data: promo, error: insertError } = await supabase
      .from('promotions')
      .insert({
        business_id: bizId,
        name: name.trim(),
        discount_type,
        discount_value: Number(discount_value),
        code_type,
        shared_code: code_type === 'shared' ? shared_code.trim().toUpperCase().replace(/\s+/g, '') : null,
        max_total_uses: max_total_uses ? Number(max_total_uses) : null,
        one_time_per_customer: !!one_time_per_customer,
        valid_from: valid_from || null,
        valid_until: valid_until || null,
        applicable_services: Array.isArray(applicable_services) && applicable_services.length ? applicable_services : null,
        active: true,
      })
      .select()
      .single()

    if (insertError) return res.status(500).json({ error: insertError.message })

    // Generate unique codes if applicable
    if (code_type === 'unique' && unique_code_count) {
      const count = Math.min(Number(unique_code_count), 500)
      const codes = []
      const seen = new Set()

      while (codes.length < count) {
        const code = generateCode()
        if (!seen.has(code)) {
          seen.add(code)
          codes.push({
            promotion_id: promo.id,
            business_id: bizId,
            code,
            customer_id: customer_id || null,
          })
        }
      }

      const { data: insertedCodes, error: codesError } = await supabase
        .from('promo_codes').insert(codes).select('code, customer_id')
      if (codesError) return res.status(500).json({ error: codesError.message, promotion: promo })
      return res.status(201).json({ promotion: promo, codes: (insertedCodes || []).map(c => c.code) })
    }

    return res.status(201).json({ promotion: promo, codes: [] })
  }

  // ── PUT — update / deactivate ──────────────────────────────────────
  if (req.method === 'PUT') {
    const id = req.query.id
    if (!id) return res.status(400).json({ error: 'Missing ?id' })

    const allowed = ['name', 'active', 'valid_until', 'valid_from', 'max_total_uses', 'one_time_per_customer']
    const updates = {}
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key]
    }

    if (!Object.keys(updates).length) {
      return res.status(400).json({ error: 'No updatable fields provided' })
    }

    const { data: promo, error } = await supabase
      .from('promotions')
      .update(updates)
      .eq('id', id)
      .eq('business_id', bizId)
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })

    return res.status(200).json({ promotion: promo })
  }

  // ── DELETE — permanently remove a promotion ────────────────────────
  if (req.method === 'DELETE') {
    const id = req.query.id
    if (!id) return res.status(400).json({ error: 'Missing ?id' })

    // Fetch the promotion name + shared_code to snapshot into redemption records
    const { data: promo, error: fetchErr } = await supabase
      .from('promotions')
      .select('name, shared_code, code_type')
      .eq('id', id)
      .eq('business_id', bizId)
      .single()

    if (fetchErr || !promo) return res.status(404).json({ error: 'Promotion not found' })

    // Snapshot promo name + code into any existing redemption records so
    // customer history survives after the promotion row is deleted.
    await supabase
      .from('promo_redemptions')
      .update({
        promo_name_snapshot: promo.name,
        code_snapshot: promo.shared_code || null,
      })
      .eq('promotion_id', id)

    // Cascade delete child rows, then the promotion itself
    await supabase.from('promo_codes').delete().eq('promotion_id', id)
    await supabase.from('promo_redemptions').delete().eq('promotion_id', id)

    const { error: delErr } = await supabase
      .from('promotions')
      .delete()
      .eq('id', id)
      .eq('business_id', bizId)

    if (delErr) return res.status(500).json({ error: delErr.message })

    return res.status(200).json({ deleted: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
