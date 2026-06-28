const { createClient } = require('@supabase/supabase-js')
const { timezone } = require('./config/luis')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

// Returns how many ms the given timezone is behind UTC at the reference date.
// Uses Intl shortOffset (e.g. "GMT-7") — fully independent of the process timezone.
function getOffsetMs(refDate, tz) {
  const part = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'shortOffset' })
    .formatToParts(refDate)
    .find(p => p.type === 'timeZoneName').value  // e.g. "GMT-7"
  const match = part.match(/GMT([+-])(\d+)(?::(\d+))?/)
  if (!match) return 0
  const sign = match[1] === '+' ? 1 : -1
  const hours = parseInt(match[2], 10)
  const minutes = parseInt(match[3] || '0', 10)
  return -sign * (hours * 60 + minutes) * 60 * 1000
}

// Convert a "HH:MM" time string on a given date into a UTC Date,
// treating the time as local business timezone.
function toUtcDate(dateStr, timeStr) {
  const [y, mo, d] = dateStr.split('-').map(Number)
  const [h, mi] = timeStr.split(':').map(Number)
  const ref = new Date(Date.UTC(y, mo - 1, d, 12, 0, 0))  // noon UTC, safe DST reference
  const offsetMs = getOffsetMs(ref, timezone)
  return new Date(Date.UTC(y, mo - 1, d, h, mi) + offsetMs)
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { date, service, business } = req.query

  if (!date || !service || !business) {
    return res.status(400).json({ error: 'date, service, and business are required' })
  }

  const { data: svc } = await supabase
    .from('services')
    .select('duration_minutes')
    .eq('business_id', business)
    .eq('name', service)
    .maybeSingle()
  if (!svc) return res.status(400).json({ error: 'Unknown service' })
  const durationMins = svc.duration_minutes

  // day_of_week: 0=Sun … 6=Sat, matching JS Date.getUTCDay on a local midnight
  const [year, month, day] = date.split('-').map(Number)
  const dayOfWeek = new Date(Date.UTC(year, month - 1, day)).getUTCDay()

  // 1. Check blocked_dates
  const { data: blocked } = await supabase
    .from('blocked_dates')
    .select('id')
    .eq('business_id', business)
    .eq('blocked_date', date)
    .maybeSingle()

  if (blocked) return res.status(200).json({ slots: [] })

  // 2. Get availability window for this day
  const { data: window } = await supabase
    .from('availability_windows')
    .select('start_time, end_time')
    .eq('business_id', business)
    .eq('day_of_week', dayOfWeek)
    .maybeSingle()

  if (!window) return res.status(200).json({ slots: [] })

  // 3. Fetch existing confirmed bookings for this date
  const windowStart = toUtcDate(date, window.start_time)
  const windowEnd   = toUtcDate(date, window.end_time)

  const { data: existingBookings } = await supabase
    .from('bookings')
    .select('start_datetime, end_datetime')
    .eq('business_id', business)
    .neq('status', 'cancelled')
    .not('start_datetime', 'is', null)
    .gte('start_datetime', windowStart.toISOString())
    .lt('start_datetime', windowEnd.toISOString())

  const bookings = existingBookings || []

  // 4. Walk 30-min slots, reject any that overlap an existing booking
  const slots = []
  const slotDurationMs = durationMins * 60 * 1000
  const stepMs = 30 * 60 * 1000
  const latestStart = new Date(windowEnd.getTime() - slotDurationMs)

  for (let t = windowStart.getTime(); t <= latestStart.getTime(); t += stepMs) {
    const slotStart = t
    const slotEnd   = t + slotDurationMs

    const hasConflict = bookings.some(b => {
      const bStart = new Date(b.start_datetime).getTime()
      const bEnd   = new Date(b.end_datetime).getTime()
      return bStart < slotEnd && bEnd > slotStart
    })

    if (!hasConflict) {
      slots.push(new Date(slotStart).toISOString())
    }
  }

  return res.status(200).json({ slots })
}
