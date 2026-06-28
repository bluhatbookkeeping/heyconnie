const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const BUSINESS_ID = 'luis-mobile-detail'

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'DELETE') return res.status(405).json({ error: 'Method not allowed' })

  const { id, phone } = req.query
  if (!id || !phone) return res.status(400).json({ error: 'id and phone are required' })

  // Verify the phone belongs to a real customer
  const digits = phone.replace(/\D/g, '').slice(-10)
  if (digits.length !== 10) return res.status(400).json({ error: 'Invalid phone' })

  const { data: customer } = await supabase
    .from('customers')
    .select('id')
    .eq('business_id', BUSINESS_ID)
    .filter('phone', 'ilike', `%${digits}%`)
    .maybeSingle()

  if (!customer) return res.status(404).json({ error: 'Customer not found' })

  // Verify the vehicle belongs to this customer before deleting
  const { data: vehicle } = await supabase
    .from('vehicles')
    .select('id')
    .eq('id', id)
    .eq('customer_id', customer.id)
    .eq('business_id', BUSINESS_ID)
    .maybeSingle()

  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' })

  await supabase.from('vehicles').delete().eq('id', id)

  // Return updated vehicle list so UI can re-render
  const { data: remaining } = await supabase
    .from('vehicles')
    .select('id, make, model, year')
    .eq('customer_id', customer.id)
    .order('created_at', { ascending: false })
    .limit(5)

  return res.status(200).json({ all_vehicles: remaining || [] })
}
