const { createClient } = require('@supabase/supabase-js')
const { resolveBusiness } = require('../utils/resolve-business')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

function getOffsetMs(refDate, tz) {
  const part = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'shortOffset' })
    .formatToParts(refDate)
    .find(p => p.type === 'timeZoneName').value
  const match = part.match(/GMT([+-])(\d+)(?::(\d+))?/)
  if (!match) return 0
  const sign = match[1] === '+' ? 1 : -1
  const hours = parseInt(match[2], 10)
  const minutes = parseInt(match[3] || '0', 10)
  return -sign * (hours * 60 + minutes) * 60 * 1000
}

function toUtcDate(dateStr, timeStr, timezone) {
  const [y, mo, d] = dateStr.split('-').map(Number)
  const [h, mi] = timeStr.split(':').map(Number)
  const ref = new Date(Date.UTC(y, mo - 1, d, 12, 0, 0))
  const offsetMs = getOffsetMs(ref, timezone)
  return new Date(Date.UTC(y, mo - 1, d, h, mi) + offsetMs)
}

function formatSlot(isoString, timezone) {
  return new Date(isoString).toLocaleTimeString('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-vapi-secret')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (req.body?._warmup) return res.status(200).json({ ok: true })

  const vapiSecret = req.headers['x-vapi-secret']
  if (vapiSecret && vapiSecret !== process.env.VAPI_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const toolCallId = req.body?.message?.toolCallList?.[0]?.id
  const args = req.body?.message?.toolCallList?.[0]?.function?.arguments || req.body
  const { date, service } = args
  const vapiResult = (data) => res.status(200).json({ results: [{ toolCallId, result: JSON.stringify(data) }] })
  if (!date || !service) return res.status(400).json({ error: 'date and service required' })

  const biz = await resolveBusiness(req)
  const BUSINESS_ID = biz.id
  const timezone = biz.timezone || 'America/Los_Angeles'

  const { data: svc } = await supabase
    .from('services')
    .select('duration_minutes')
    .eq('business_id', BUSINESS_ID)
    .ilike('name', service.trim())
    .maybeSingle()

  if (!svc) return res.status(400).json({ error: 'Unknown service' })
  const durationMins = svc.duration_minutes

  const [year, month, day] = date.split('-').map(Number)
  const dayOfWeek = new Date(Date.UTC(year, month - 1, day)).getUTCDay()

  const { data: blocked } = await supabase
    .from('blocked_dates')
    .select('id')
    .eq('business_id', BUSINESS_ID)
    .eq('blocked_date', date)
    .maybeSingle()

  if (blocked) return vapiResult({ slots: [], human_readable: [], message: 'Luis is unavailable that day.' })

  const { data: window } = await supabase
    .from('availability_windows')
    .select('start_time, end_time')
    .eq('business_id', BUSINESS_ID)
    .eq('day_of_week', dayOfWeek)
    .maybeSingle()

  if (!window) return vapiResult({ slots: [], human_readable: [], message: 'Luis is unavailable that day.' })

  const windowStart = toUtcDate(date, window.start_time, timezone)
  const windowEnd   = toUtcDate(date, window.end_time, timezone)

  const { data: existingBookings } = await supabase
    .from('bookings')
    .select('start_datetime, end_datetime')
    .eq('business_id', BUSINESS_ID)
    .neq('status', 'cancelled')
    .not('start_datetime', 'is', null)
    .gte('start_datetime', windowStart.toISOString())
    .lt('start_datetime', windowEnd.toISOString())

  const bookings = existingBookings || []
  const slots = []
  const slotDurationMs = durationMins * 60 * 1000
  const stepMs = 30 * 60 * 1000
  const latestStart = new Date(windowEnd.getTime() - slotDurationMs)

  for (let t = windowStart.getTime(); t <= latestStart.getTime(); t += stepMs) {
    const slotEnd = t + slotDurationMs
    const hasConflict = bookings.some(b => {
      const bStart = new Date(b.start_datetime).getTime()
      const bEnd   = new Date(b.end_datetime).getTime()
      return bStart < slotEnd && bEnd > t
    })
    if (!hasConflict) slots.push(new Date(t).toISOString())
  }

  const paired = slots.map(iso => ({ iso, display: formatSlot(iso, timezone) }))
  return vapiResult({
    slots: paired,
    message: slots.length
      ? `Luis has openings at: ${paired.map(p => p.display).join(', ')}.`
      : 'Luis is fully booked that day.',
  })
}
