const { createClient } = require('@supabase/supabase-js')
const { sendRewardGivenEmail } = require('../loyalty-utils')

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

async function getUser(req) {
  const token = req.headers['authorization']?.replace('Bearer ', '')
  if (!token) return null
  const { data: { user }, error } = await supabase.auth.getUser(token)
  return error ? null : user
}

module.exports = async function handler(req, res) {
  const user = await getUser(req)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  const { business, customer_id, id, view, limit, offset } = req.query

  // GET — all programs for business, optionally with per-program punch count for a customer
  if (req.method === 'GET') {
    if (!business) return res.status(400).json({ error: 'business is required' })

    // Rewards earned — customers who have hit the threshold and not yet been given their reward
    if (view === 'rewards_earned') {
      const { data: programs } = await supabase
        .from('loyalty_programs')
        .select('id, required_visits, reward_description, applicable_services')
        .eq('business_id', business)
        .eq('active', true)

      if (!programs?.length) return res.status(200).json({ rewards: [] })

      const rewards = []
      for (const prog of programs) {
        const { data: punches } = await supabase
          .from('loyalty_punches')
          .select('customer_id, punched_at, customers(id, name, phone)')
          .eq('loyalty_program_id', prog.id)
          .eq('redeemed', false)
          .order('punched_at', { ascending: true })

        if (!punches?.length) continue

        // Group by customer
        const byCustomer = {}
        for (const punch of punches) {
          const cid = punch.customer_id
          if (!byCustomer[cid]) byCustomer[cid] = { punches: [], customer: punch.customers }
          byCustomer[cid].punches.push(punch.punched_at)
        }

        for (const [cid, data] of Object.entries(byCustomer)) {
          if (data.punches.length >= prog.required_visits) {
            rewards.push({
              customer_id: cid,
              customer_name: data.customer?.name || '—',
              customer_phone: data.customer?.phone || '—',
              program_id: prog.id,
              reward_description: prog.reward_description,
              applicable_services: prog.applicable_services,
              punch_count: data.punches.length,
              earliest_punch_at: data.punches[0],
            })
          }
        }
      }

      return res.status(200).json({ rewards })
    }

    // Redemption history — all redeemed punches
    if (view === 'redemption_history') {
      const pageLimit = parseInt(limit) || 20
      const pageOffset = parseInt(offset) || 0

      const { data: punches } = await supabase.rpc('loyalty_redemption_history', {
        p_business_id: business,
        p_limit: pageLimit,
        p_offset: pageOffset,
      })

      if (punches) {
        return res.status(200).json({ history: punches })
      }

      // Fallback: plain join without filtering on loyalty_programs
      const { data: rows } = await supabase
        .from('loyalty_punches')
        .select('redeemed_at, customer_id, loyalty_program_id, booking_id')
        .eq('business_id', business)
        .eq('redeemed', true)
        .order('redeemed_at', { ascending: false })
        .range(pageOffset, pageOffset + pageLimit - 1)

      if (!rows?.length) return res.status(200).json({ history: [] })

      // Enrich with customer + program data
      const customerIds = [...new Set(rows.map(r => r.customer_id).filter(Boolean))]
      const programIds = [...new Set(rows.map(r => r.loyalty_program_id).filter(Boolean))]
      const bookingIds = [...new Set(rows.map(r => r.booking_id).filter(Boolean))]

      const [{ data: customers }, { data: programs }, { data: bookings }] = await Promise.all([
        supabase.from('customers').select('id, name, phone').in('id', customerIds),
        supabase.from('loyalty_programs').select('id, reward_description, applicable_services').in('id', programIds),
        supabase.from('bookings').select('id, service').in('id', bookingIds),
      ])

      const custMap = Object.fromEntries((customers || []).map(c => [c.id, c]))
      const progMap = Object.fromEntries((programs || []).map(p => [p.id, p]))
      const bookMap = Object.fromEntries((bookings || []).map(b => [b.id, b]))

      const history = rows.map(r => ({
        customer_id: r.customer_id,
        customer_name: custMap[r.customer_id]?.name || '—',
        customer_phone: custMap[r.customer_id]?.phone || '—',
        reward_description: progMap[r.loyalty_program_id]?.reward_description || '—',
        service: bookMap[r.booking_id]?.service || progMap[r.loyalty_program_id]?.applicable_services?.[0] || '—',
        redeemed_at: r.redeemed_at,
      }))

      return res.status(200).json({ history })
    }

    const { data: programs, error } = await supabase
      .from('loyalty_programs')
      .select('*')
      .eq('business_id', business)
      .order('created_at', { ascending: true })

    if (error) return res.status(500).json({ error: 'Failed to fetch programs' })

    if (!customer_id || !programs?.length) {
      return res.status(200).json({ programs: programs || [] })
    }

    // Enrich each program with this customer's unredeemed count + redemption history
    const enriched = await Promise.all((programs || []).map(async (p) => {
      const [{ count }, { data: redeemedPunches }] = await Promise.all([
        supabase
          .from('loyalty_punches')
          .select('id', { count: 'exact', head: true })
          .eq('loyalty_program_id', p.id)
          .eq('customer_id', customer_id)
          .eq('redeemed', false),
        supabase
          .from('loyalty_punches')
          .select('redeemed_at')
          .eq('loyalty_program_id', p.id)
          .eq('customer_id', customer_id)
          .eq('redeemed', true)
          .order('redeemed_at', { ascending: false }),
      ])
      return { ...p, unredeemed_count: count || 0, redeemed_history: redeemedPunches || [] }
    }))

    return res.status(200).json({ programs: enriched })
  }

  // POST — create a new program OR mark reward given
  if (req.method === 'POST') {
    const body = req.body

    if (body.action === 'mark_reward_given') {
      const { cid, program_id } = body
      if (!cid || !program_id) return res.status(400).json({ error: 'cid and program_id are required' })

      const { data: program } = await supabase
        .from('loyalty_programs')
        .select('id, required_visits')
        .eq('id', program_id)
        .single()

      if (!program) return res.status(404).json({ error: 'Program not found' })

      const { data: punches } = await supabase
        .from('loyalty_punches')
        .select('id')
        .eq('loyalty_program_id', program_id)
        .eq('customer_id', cid)
        .eq('redeemed', false)
        .order('punched_at', { ascending: true })
        .limit(program.required_visits)

      if (!punches?.length) return res.status(400).json({ error: 'No unredeemed punches to redeem' })

      const { error } = await supabase
        .from('loyalty_punches')
        .update({ redeemed: true, redeemed_at: new Date().toISOString() })
        .in('id', punches.map(p => p.id))

      if (error) return res.status(500).json({ error: 'Failed to mark reward' })

      // Fire-and-forget notification to Luis
      const { data: customer } = await supabase.from('customers').select('name, phone').eq('id', cid).maybeSingle()
      const { data: prog } = await supabase.from('loyalty_programs').select('reward_description').eq('id', program_id).maybeSingle()
      sendRewardGivenEmail({
        customerName: customer?.name || 'Customer',
        customerPhone: customer?.phone || null,
        rewardDescription: prog?.reward_description || 'Loyalty reward',
        givenAt: new Date().toISOString(),
      }).catch(() => {})

      return res.status(200).json({ success: true, redeemed: punches.length })
    }

    // Create new program
    const { business_id, required_visits, reward_description, applicable_service, active } = body
    if (!business_id || !required_visits || !reward_description) {
      return res.status(400).json({ error: 'business_id, required_visits, and reward_description are required' })
    }

    const { data: result, error: err } = await supabase
      .from('loyalty_programs')
      .insert({
        business_id,
        name: reward_description,
        required_visits: parseInt(required_visits),
        reward_description,
        applicable_services: applicable_service ? [applicable_service] : null,
        active: active !== false,
      })
      .select('*')
      .single()

    if (err) return res.status(500).json({ error: 'Failed to create program' })
    return res.status(200).json({ program: result })
  }

  // PUT — update existing program by ?id=
  if (req.method === 'PUT') {
    if (!id) return res.status(400).json({ error: 'id is required' })

    const { required_visits, reward_description, applicable_service, active } = req.body
    const updates = {}
    if (required_visits !== undefined) updates.required_visits = parseInt(required_visits)
    if (reward_description !== undefined) { updates.reward_description = reward_description; updates.name = reward_description }
    if (applicable_service !== undefined) updates.applicable_services = applicable_service ? [applicable_service] : null
    if (active !== undefined) updates.active = active

    const { data: result, error: err } = await supabase
      .from('loyalty_programs')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single()

    if (err) return res.status(500).json({ error: 'Failed to update program' })
    return res.status(200).json({ program: result })
  }

  // DELETE — delete program by ?id=
  if (req.method === 'DELETE') {
    if (!id) return res.status(400).json({ error: 'id is required' })

    // Delete punches first (FK constraint)
    await supabase.from('loyalty_punches').delete().eq('loyalty_program_id', id)

    const { error } = await supabase.from('loyalty_programs').delete().eq('id', id)
    if (error) return res.status(500).json({ error: 'Failed to delete program' })
    return res.status(200).json({ success: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
