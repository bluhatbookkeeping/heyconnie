const { createClient } = require('@supabase/supabase-js')
const { Resend } = require('resend')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const resend = new Resend(process.env.RESEND_API_KEY)

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const { token } = req.query
  if (!token) return res.status(400).json({ error: 'Missing token' })

  // GET — fetch booking details for the confirmation page
  if (req.method === 'GET') {
    const { data: booking, error } = await supabase
      .from('bookings')
      .select('id, name, service, year, make, model, city, start_datetime, status, phone')
      .eq('cancel_token', token)
      .maybeSingle()

    if (error || !booking) return res.status(404).json({ error: 'Booking not found' })

    if (['cancelled', 'completed'].includes(booking.status)) {
      return res.status(410).json({ error: 'already_resolved', status: booking.status })
    }

    return res.status(200).json({
      name: booking.name,
      service: booking.service,
      year: booking.year,
      make: booking.make,
      model: booking.model,
      city: booking.city,
      start_datetime: booking.start_datetime,
      status: booking.status,
    })
  }

  // POST — confirm the cancellation
  if (req.method === 'POST') {
    const { data: booking, error } = await supabase
      .from('bookings')
      .select('id, name, phone, email, service, year, make, model, city, start_datetime, status')
      .eq('cancel_token', token)
      .maybeSingle()

    if (error || !booking) return res.status(404).json({ error: 'Booking not found' })

    if (['cancelled', 'completed'].includes(booking.status)) {
      return res.status(410).json({ error: 'already_resolved', status: booking.status })
    }

    const { error: updateError } = await supabase
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', booking.id)

    if (updateError) {
      console.error('Cancel update error:', updateError)
      return res.status(500).json({ error: 'Failed to cancel. Please call Luis at 626-409-3147.' })
    }

    const apptDisplay = booking.start_datetime
      ? new Date(booking.start_datetime).toLocaleString('en-US', {
          weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
          hour: 'numeric', minute: '2-digit', timeZone: 'America/Los_Angeles', timeZoneName: 'short',
        })
      : 'Time TBD'

    // Notify Luis
    try {
      await resend.emails.send({
        from: 'bookings@svcvoice.com',
        to: process.env.NOTIFICATION_EMAIL,
        subject: `Booking Cancelled: ${booking.name} — ${booking.service}`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
            <h2 style="color:#dc2626">Booking Cancelled</h2>
            <p>A customer cancelled their booking via the email link.</p>
            <table style="width:100%;border-collapse:collapse;font-size:15px">
              <tr><td style="padding:6px 0;font-weight:bold;width:140px">Name</td><td>${booking.name}</td></tr>
              <tr><td style="padding:6px 0;font-weight:bold">Phone</td><td>${booking.phone}</td></tr>
              <tr><td style="padding:6px 0;font-weight:bold">Service</td><td>${booking.service}</td></tr>
              <tr><td style="padding:6px 0;font-weight:bold">Vehicle</td><td>${booking.year} ${booking.make} ${booking.model}</td></tr>
              <tr><td style="padding:6px 0;font-weight:bold">Location</td><td>${booking.city}</td></tr>
              <tr><td style="padding:6px 0;font-weight:bold">Appointment</td><td>${apptDisplay}</td></tr>
            </table>
            <p style="color:#555;font-size:13px">The slot has been freed on the calendar.</p>
          </div>
        `,
      })
    } catch (emailError) {
      console.error('Cancel notification email error:', emailError)
    }

    return res.status(200).json({ success: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
