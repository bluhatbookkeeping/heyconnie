const { createClient } = require('@supabase/supabase-js')
const { renderLegalPage } = require('./utils/render-legal-page')

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

const BODY = `
  <h1>Privacy Policy</h1>
  <p class="meta">Effective Date: June 29, 2026 &nbsp;&middot;&nbsp; Last Updated: June 29, 2026</p>

  <p>This Privacy Policy describes how <strong>Blu Hat Funding LLC, operating as Hey Connie</strong> ("Hey Connie," "we," "us," or "our") collects, uses, and protects information you provide when using our platform, including our website, AI voice receptionist, booking widgets, and SMS communications (collectively, the "Service").</p>

  <h2>1. Information We Collect</h2>
  <p>We collect the following types of information:</p>
  <ul>
    <li><strong>Contact information:</strong> Name, phone number, and email address provided when booking an appointment or contacting us.</li>
    <li><strong>Vehicle information:</strong> Make, model, and year of your vehicle, provided for service purposes.</li>
    <li><strong>Service address:</strong> Location where mobile detailing services are to be performed.</li>
    <li><strong>Booking details:</strong> Service type, preferred dates, appointment history, and notes.</li>
    <li><strong>SMS consent:</strong> Whether you have consented to receive SMS messages, and the timestamp of that consent.</li>
    <li><strong>Usage data:</strong> Pages visited, interactions with our booking widget, and general analytics data.</li>
    <li><strong>Voice call data:</strong> Call recordings or transcripts from interactions with our AI voice receptionist, Connie, for quality and training purposes.</li>
  </ul>

  <h2>2. How We Use Your Information</h2>
  <p>We use the information we collect to:</p>
  <ul>
    <li>Schedule, confirm, and manage your appointments</li>
    <li>Send booking confirmations, reminders, and scheduling updates via SMS and email</li>
    <li>Provide customer support and respond to inquiries</li>
    <li>Improve our AI voice receptionist and booking platform</li>
    <li>Send promotional offers or loyalty rewards (only with your explicit consent)</li>
    <li>Comply with legal obligations</li>
  </ul>

  <h2>3. SMS Communications and Phone Number Privacy</h2>

  <div class="highlight">
    <p><strong>Mobile phone numbers and SMS opt-in consent collected by Hey Connie are not sold, rented, shared, or disclosed to third parties or affiliates for marketing or promotional purposes.</strong></p>
  </div>

  <p>Phone numbers are used exclusively to deliver transactional notifications related to your booking activity via Twilio, our SMS messaging provider. These include:</p>
  <ul>
    <li>Appointment booking confirmations</li>
    <li>Appointment reminders (24 hours and 2 hours before your appointment)</li>
    <li>Appointment changes, rescheduling, and cancellations</li>
    <li>Post-appointment follow-ups and review requests</li>
    <li>Loyalty rewards notifications (if opted in)</li>
  </ul>

  <p><strong>To opt out of SMS messages:</strong> Reply <strong>STOP</strong> to any message. You will receive one final confirmation and no further messages will be sent, except as required by law.</p>
  <p><strong>For help:</strong> Reply <strong>HELP</strong> to any SMS or email <a href="mailto:support@heyconnie.co">support@heyconnie.co</a>.</p>
  <p>Message frequency varies. Message and data rates may apply.</p>

  <h2>4. How We Share Your Information</h2>
  <p>We share your information only in the following limited circumstances:</p>
  <ul>
    <li><strong>With your detailer:</strong> Your name, phone number, vehicle, address, and booking details are shared with the mobile auto detailer fulfilling your appointment.</li>
    <li><strong>With service providers:</strong> We use Twilio for SMS and voice delivery, Supabase for data storage, and Resend for email delivery. These providers process your data only as necessary to deliver the Service.</li>
    <li><strong>As required by law:</strong> We may disclose information if required by applicable law, regulation, or legal process.</li>
  </ul>
  <p>We do not sell, rent, or trade your personal information to any third party for marketing purposes.</p>

  <h2>5. Data Retention</h2>
  <p>We retain your booking and contact information for as long as necessary to provide the Service and comply with legal obligations. You may request deletion of your data at any time by contacting us at <a href="mailto:support@heyconnie.co">support@heyconnie.co</a>.</p>

  <h2>6. Data Security</h2>
  <p>We implement industry-standard security measures to protect your personal information, including encrypted data storage and secure API communication. However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.</p>

  <h2>7. Your Rights</h2>
  <p>Depending on your location, you may have the right to:</p>
  <ul>
    <li>Access the personal information we hold about you</li>
    <li>Request correction of inaccurate information</li>
    <li>Request deletion of your personal information</li>
    <li>Opt out of SMS communications at any time by replying STOP</li>
    <li>Opt out of email marketing by clicking "unsubscribe" in any marketing email</li>
  </ul>
  <p>To exercise any of these rights, contact us at <a href="mailto:support@heyconnie.co">support@heyconnie.co</a>.</p>

  <h2>8. Cookies and Analytics</h2>
  <p>Our website may use cookies and similar technologies to understand how visitors use our site and to improve our Service. You can control cookie settings through your browser preferences.</p>

  <h2>9. Children's Privacy</h2>
  <p>The Service is not directed to children under 13. We do not knowingly collect personal information from children under 13. If you believe we have collected such information, please contact us immediately.</p>

  <h2>10. Changes to This Policy</h2>
  <p>We may update this Privacy Policy from time to time. We will notify you of significant changes by updating the "Last Updated" date at the top of this page. Continued use of the Service after changes constitutes acceptance of the updated policy.</p>

  <h2>11. Contact Us</h2>
  <p>Questions about this Privacy Policy? Contact us at:</p>
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
    title: 'Privacy Policy',
    pageLabel: 'Privacy Policy',
    bodyHtml: BODY,
    footerLink: '<a href="/terms">Terms of Service</a>'
  })

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600')
  res.status(200).send(html)
}
