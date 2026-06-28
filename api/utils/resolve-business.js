const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

const FALLBACK = { id: 'luis-mobile-detail', timezone: 'America/Los_Angeles' }

async function resolveBusiness(req) {
  const assistantId = req.body?.message?.call?.assistantId || req.body?.call?.assistantId
  if (!assistantId) return FALLBACK
  const { data: biz } = await supabase
    .from('businesses')
    .select('id, timezone')
    .eq('vapi_assistant_id', assistantId)
    .maybeSingle()
  return biz || FALLBACK
}

module.exports = { resolveBusiness }
