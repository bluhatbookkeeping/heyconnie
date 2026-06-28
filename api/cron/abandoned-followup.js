const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

const VAPI_BASE = 'https://api.vapi.ai'

async function triggerOutboundCall({ phone, name }) {
  const body = {
    assistantId: process.env.VAPI_OUTBOUND_ASSISTANT_ID,
    phoneNumberId: process.env.VAPI_PHONE_NUMBER_ID,
    customer: { number: phone },
    assistantOverrides: {
      variableValues: {
        customer_name: name || 'there',
        vapi_number: '626-654-1924',
      },
      firstMessage: `Hey ${name || 'there'}, it's Luis Mobile Detail — looks like we got cut off earlier. Want to finish booking your detail? I've got your info ready.`,
    },
  }

  const resp = await fetch(`${VAPI_BASE}/call/phone`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.VAPI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!resp.ok) {
    const text = await resp.text()
    throw new Error(`Vapi outbound error ${resp.status}: ${text}`)
  }

  return resp.json()
}

module.exports = async function handler(req, res) {
  const secret = req.headers['x-admin-secret']
  if (secret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const now = new Date()
  const cutoff = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString()

  const { data: businesses } = await supabase.from('businesses').select('id')
  let sent = 0
  let failed = 0

  for (const biz of (businesses || [])) {
    const BUSINESS_ID = biz.id

    const { data: logs, error } = await supabase
      .from('call_logs')
      .select('id, customer_id, caller_phone, customers(name)')
      .eq('business_id', BUSINESS_ID)
      .eq('needs_followup', true)
      .is('followup_call_sent_at', null)
      .gte('created_at', cutoff)

    if (error) {
      console.error(`abandoned-followup query error for ${BUSINESS_ID}:`, error)
      continue
    }

    for (const log of (logs || [])) {
      const phone = log.caller_phone
      if (!phone) { failed++; continue }

      const name = log.customers?.name || null

      try {
        const call = await triggerOutboundCall({ phone, name })

        await supabase
          .from('call_logs')
          .update({ followup_call_sent_at: new Date().toISOString() })
          .eq('id', log.id)

        await supabase.from('outbound_calls').insert({
          customer_id: log.customer_id || null,
          call_type: 'abandoned_followup',
          vapi_call_id: call.id || null,
          business_id: BUSINESS_ID,
        })

        sent++
      } catch (err) {
        console.error(`Abandoned followup call failed for call_log ${log.id}:`, err.message)
        failed++
      }
    }
  }

  return res.status(200).json({ sent, failed })
}
