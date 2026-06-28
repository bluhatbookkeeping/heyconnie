/**
 * Outbound appointment reminder calls — fires daily at 6pm PT (0 2 * * * UTC).
 * Queries bookings starting in the next 12–24h, triggers a Vapi outbound call per booking.
 * Sets reminder_sent_at on each booking after firing so we never double-send.
 *
 * VOICEMAIL DROP CONFIG (Vapi dashboard — assistant VAPI_OUTBOUND_ASSISTANT_ID):
 *   Vapi supports voicemail detection via the assistant's voicemailDetection setting:
 *   {
 *     "provider": "twilio",
 *     "voicemailDetectionTypes": ["machine_end_beep", "machine_end_silence"],
 *     "enabled": true,
 *     "machineDetectionTimeout": 30
 *   }
 *   Set the assistant's voicemailMessage to the drop script below so Vapi reads it
 *   when it detects voicemail:
 *   "Hey [Name], this is Luis Mobile Detail — reminder that you have a [service] scheduled
 *    tomorrow. Call us at 626-654-1924 to reschedule if needed. Talk soon!"
 *   In the Vapi outbound call payload, pass customer name/service in assistantOverrides
 *   so the voicemail script can be personalized.
 */

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

const VAPI_BASE = 'https://api.vapi.ai'

function formatTimePT(iso) {
  return new Date(iso).toLocaleString('en-US', {
    timeZone: 'America/Los_Angeles',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

async function triggerOutboundCall({ phone, name, service, city, startDatetime }) {
  const timePT = formatTimePT(startDatetime)

  const body = {
    assistantId: process.env.VAPI_OUTBOUND_ASSISTANT_ID,
    phoneNumberId: process.env.VAPI_PHONE_NUMBER_ID,
    customer: { number: phone },
    assistantOverrides: {
      variableValues: {
        customer_name: name || 'there',
        service,
        appointment_time: timePT,
        city: city || 'your area',
        vapi_number: '626-654-1924',
      },
      firstMessage: `Hey ${name || 'there'}, this is a reminder from Luis Mobile Detail — you have a ${service} scheduled tomorrow at ${timePT} in ${city || 'your area'}. Call 626-654-1924 to reschedule if needed. See you tomorrow!`,
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
  const windowStart = new Date(now.getTime() + 12 * 60 * 60 * 1000).toISOString()
  const windowEnd   = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()

  const { data: businesses } = await supabase.from('businesses').select('id')
  let sent = 0
  let failed = 0

  for (const biz of (businesses || [])) {
    const BUSINESS_ID = biz.id

    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('id, name, phone, service, city, start_datetime')
      .eq('business_id', BUSINESS_ID)
      .eq('status', 'confirmed')
      .gte('start_datetime', windowStart)
      .lte('start_datetime', windowEnd)
      .is('reminder_sent_at', null)

    if (error) {
      console.error(`outbound-reminders query error for ${BUSINESS_ID}:`, error)
      continue
    }

    for (const booking of (bookings || [])) {
      if (!booking.phone) { failed++; continue }

      try {
        const call = await triggerOutboundCall({
          phone: booking.phone,
          name: booking.name,
          service: booking.service,
          city: booking.city,
          startDatetime: booking.start_datetime,
        })

        await supabase
          .from('bookings')
          .update({ reminder_sent_at: new Date().toISOString() })
          .eq('id', booking.id)

        await supabase.from('outbound_calls').insert({
          booking_id: booking.id,
          call_type: 'reminder',
          vapi_call_id: call.id || null,
          business_id: BUSINESS_ID,
        })

        sent++
      } catch (err) {
        console.error(`Reminder call failed for booking ${booking.id}:`, err.message)
        failed++
      }
    }
  }

  return res.status(200).json({ sent, failed })
}
