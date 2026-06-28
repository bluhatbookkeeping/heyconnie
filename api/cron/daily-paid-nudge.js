const { createClient } = require('@supabase/supabase-js')
const { Resend } = require('resend')

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const resend = new Resend(process.env.RESEND_API_KEY)

module.exports = async function handler(req, res) {
  const secret = req.headers['x-admin-secret']
  if (secret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const since = new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString()
  const now = new Date().toISOString()

  const { data: businesses } = await supabase
    .from('businesses')
    .select('id, email, base_url')

  let totalSent = 0

  for (const biz of (businesses || [])) {
    const BUSINESS_ID = biz.id
    const adminUrl = `${biz.base_url || 'https://luis-mobile-detailing.vercel.app'}/admin`
    const notifyEmail = biz.email || process.env.NOTIFICATION_EMAIL

    if (!notifyEmail) continue

    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('id, name, phone, service, start_datetime')
      .eq('business_id', BUSINESS_ID)
      .eq('status', 'confirmed')
      .gte('start_datetime', since)
      .lte('start_datetime', now)
      .order('start_datetime', { ascending: true })

    if (error || !bookings?.length) continue

    const rows = bookings.map(b => {
      const dt = b.start_datetime
        ? new Date(b.start_datetime).toLocaleString('en-US', {
            timeZone: 'America/Los_Angeles',
            weekday: 'short', month: 'short', day: 'numeric',
            hour: 'numeric', minute: '2-digit', hour12: true,
          })
        : 'No time set'
      return `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${b.name}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${b.service}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${dt}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${b.phone || '—'}</td>
        </tr>`
    }).join('')

    const html = `
      <div style="font-family:sans-serif;max-width:640px;margin:0 auto">
        <h2 style="color:#1d4ed8">Did these appointments get paid today?</h2>
        <p>The following ${bookings.length} booking${bookings.length > 1 ? 's' : ''} happened today and ${bookings.length > 1 ? 'are' : 'is'} still showing as unpaid in the system.</p>
        <p>Please open the admin panel and mark whichever ones were paid. This records the loyalty punch for the customer.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <thead>
            <tr style="background:#f1f5f9;text-align:left">
              <th style="padding:8px 12px">Customer</th>
              <th style="padding:8px 12px">Service</th>
              <th style="padding:8px 12px">Time</th>
              <th style="padding:8px 12px">Phone</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <a href="${adminUrl}" style="display:inline-block;margin-top:8px;padding:12px 24px;background:#1d4ed8;color:#fff;text-decoration:none;border-radius:6px;font-weight:600">
          Open Admin Panel →
        </a>
        <br><br>
        <p style="color:#9ca3af;font-size:13px">Bookings marked as no-show or cancelled don't need to be marked paid.</p>
      </div>
    `

    try {
      await resend.emails.send({
        from: 'bookings@svcvoice.com',
        to: notifyEmail,
        subject: `${bookings.length} appointment${bookings.length > 1 ? 's' : ''} need${bookings.length > 1 ? '' : 's'} to be marked paid`,
        html,
      })
      totalSent++
    } catch (e) {
      console.error(`Daily nudge email error for ${BUSINESS_ID}:`, e)
    }
  }

  return res.status(200).json({ sent: totalSent > 0, totalSent })
}
