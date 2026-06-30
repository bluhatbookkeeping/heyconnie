const { createClient } = require('@supabase/supabase-js')
const { renderLegalPage } = require('./utils/render-legal-page')

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

const BODY = `
  <h1>Terms of Service</h1>
  <p class="meta">Effective Date: June 29, 2026 &nbsp;&middot;&nbsp; Last Updated: June 29, 2026</p>

  <p>Welcome to Hey Connie. These Terms of Service ("Terms") govern your use of the Hey Connie platform, including our website, AI voice receptionist, booking services, and SMS communications (collectively, the "Service"), operated by <strong>Blu Hat Funding LLC, operating as Hey Connie</strong> ("we," "us," or "our").</p>

  <p>By using the Service or providing your contact information on any Hey Connie-powered form, you agree to these Terms. If you do not agree, do not use the Service.</p>

  <h2>1. Description of Service</h2>
  <p>Hey Connie provides an AI-powered receptionist and booking platform for mobile auto detailing businesses. The platform enables customers to schedule appointments, receive booking confirmations, and communicate with their detailer via voice, SMS, and web.</p>

  <h2>2. SMS Communications and Consent</h2>

  <div class="highlight">
    <p><strong>By providing your phone number on a Hey Connie form or booking widget, you expressly consent to receive transactional SMS text messages from Hey Connie related to your use of the Service. This consent is not a condition of booking an appointment or using the Service.</strong></p>
  </div>

  <p>SMS messages you may receive include:</p>
  <ul>
    <li>Appointment booking confirmations</li>
    <li>Appointment reminders (sent 24 hours and 2 hours before your scheduled appointment)</li>
    <li>Appointment changes, rescheduling notices, and cancellations</li>
    <li>Follow-up messages after your appointment</li>
    <li>Loyalty rewards and promotional offers (only if you have opted in separately)</li>
    <li>Review requests after service completion</li>
  </ul>

  <p><strong>Message frequency varies</strong> depending on your booking activity. <strong>Message and data rates may apply</strong> depending on your mobile carrier plan.</p>

  <p><strong>To opt out:</strong> Reply <strong>STOP</strong> to any SMS message at any time. You will receive one confirmation message and no further messages will be sent, except as required by law.</p>

  <p><strong>For help:</strong> Reply <strong>HELP</strong> to any SMS or email us at <a href="mailto:support@heyconnie.co">support@heyconnie.co</a>.</p>

  <p>SMS messaging is delivered through Twilio, our messaging provider. Phone numbers collected through Hey Connie are never sold, rented, or shared with third parties for marketing purposes.</p>

  <h2>3. Voice Communications</h2>
  <p>Hey Connie may place automated voice reminder calls to phone numbers provided. By booking an appointment, you consent to receive voice calls related to your booking, including reminders 24 hours before your scheduled appointment. You may opt out by contacting your detailer or emailing <a href="mailto:support@heyconnie.co">support@heyconnie.co</a>.</p>

  <h2>4. Booking and Appointments</h2>
  <p>Hey Connie facilitates appointment scheduling on behalf of independent mobile auto detailing businesses. All services are performed by the detailer, not by Hey Connie. Pricing, availability, and service details are set by each detailer independently.</p>
  <p>Hey Connie is not responsible for the quality of detailing services, cancellations by the detailer, or disputes between customers and detailers.</p>

  <h2>5. User Responsibilities</h2>
  <ul>
    <li>You must provide accurate contact and vehicle information when booking.</li>
    <li>You are responsible for being available at the scheduled time and location.</li>
    <li>You must not use the Service for any unlawful purpose.</li>
    <li>You must not attempt to reverse-engineer, scrape, or misuse any part of the platform.</li>
  </ul>

  <h2>6. Privacy</h2>
  <p>Your use of the Service is also governed by our <a href="/privacy">Privacy Policy</a>, which explains how we collect, use, and protect your personal information, including your phone number and booking data.</p>

  <h2>7. Intellectual Property</h2>
  <p>All content, technology, and branding associated with Hey Connie are the property of Blu Hat Funding LLC. You may not reproduce, distribute, or create derivative works without written permission.</p>

  <h2>8. Disclaimer of Warranties</h2>
  <p>The Service is provided "as is" and "as available" without warranties of any kind, express or implied. We do not guarantee that the Service will be uninterrupted, error-free, or that AI-assisted communications will be perfectly accurate.</p>

  <h2>9. Limitation of Liability</h2>
  <p>To the fullest extent permitted by law, Blu Hat Funding LLC shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Service, including missed appointments or miscommunications.</p>

  <h2>10. Changes to These Terms</h2>
  <p>We may update these Terms from time to time. We will notify you of significant changes by updating the "Last Updated" date above. Continued use of the Service after changes constitutes acceptance of the updated Terms.</p>

  <h2>11. Governing Law</h2>
  <p>These Terms are governed by the laws of the State of California, without regard to conflict of law provisions.</p>

  <h2>12. Contact Us</h2>
  <p>Questions about these Terms? Contact us at:</p>
  <p>
    <strong>Blu Hat Funding LLC, operating as Hey Connie</strong><br>
    Pasadena, CA<br>
    Email: <a href="mailto:support@heyconnie.co">support@heyconnie.co</a><br>
    Website: <a href="https://heyconnie.co">heyconnie.co</a>
  </p>
`

module.exports = async function handler(req, res) {
  const slug = req.query.b || null
  let biz = null

  if (slug) {
    const { data } = await supabase
      .from('businesses')
      .select('id,name,phone,instagram,service_area')
      .eq('id', slug)
      .single()
    biz = data || null
  }

  const html = renderLegalPage(biz, {
    title: 'Terms of Service',
    pageLabel: 'Terms of Service',
    bodyHtml: BODY,
    footerLink: '<a href="/privacy">Privacy Policy</a>'
  })

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600')
  res.status(200).send(html)
}
