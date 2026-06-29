const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

const CAR_DATA = {
  'Acura':         ['ILX','Integra','MDX','RDX','TLX'],
  'Audi':          ['A3','A4','A5','A6','A8','Q3','Q5','Q7','Q8','RS6','S4','TT'],
  'BMW':           ['2 Series','3 Series','4 Series','5 Series','7 Series','M3','M4','M5','X1','X3','X5','X7'],
  'Cadillac':      ['CT4','CT5','Escalade','XT4','XT5','XT6'],
  'Chevrolet':     ['Blazer','Camaro','Colorado','Corvette','Equinox','Malibu','Silverado','Suburban','Tahoe','Traverse'],
  'Dodge':         ['Challenger','Charger','Durango','Ram 1500'],
  'Ford':          ['Bronco','Edge','Escape','Expedition','Explorer','F-150','Mustang','Ranger'],
  'GMC':           ['Acadia','Canyon','Sierra','Terrain','Yukon'],
  'Honda':         ['Accord','Civic','CR-V','HR-V','Odyssey','Passport','Pilot','Ridgeline'],
  'Hyundai':       ['Elantra','Ioniq 5','Kona','Palisade','Santa Fe','Sonata','Tucson'],
  'Infiniti':      ['Q50','Q60','QX50','QX60','QX80'],
  'Jeep':          ['Cherokee','Compass','Gladiator','Grand Cherokee','Renegade','Wrangler'],
  'Kia':           ['Carnival','EV6','Forte','K5','Soul','Sorento','Sportage','Stinger','Telluride'],
  'Land Rover':    ['Defender','Discovery','Range Rover','Range Rover Sport'],
  'Lexus':         ['ES','GX','IS','LC','LS','LX','NX','RX','UX'],
  'Lincoln':       ['Aviator','Corsair','Navigator'],
  'Mazda':         ['CX-5','CX-50','CX-9','Mazda3','Mazda6','MX-5 Miata'],
  'Mercedes-Benz': ['A-Class','AMG GT','C-Class','CLA','E-Class','GLA','GLC','GLE','GLS','S-Class'],
  'Nissan':        ['Altima','Armada','Frontier','Maxima','Murano','Pathfinder','Rogue','Sentra','Titan','370Z'],
  'Porsche':       ['911','Cayenne','Macan','Panamera','Taycan'],
  'Ram':           ['1500','2500','3500'],
  'Subaru':        ['Ascent','BRZ','Crosstrek','Forester','Impreza','Legacy','Outback','WRX'],
  'Tesla':         ['Cybertruck','Model 3','Model S','Model X','Model Y'],
  'Toyota':        ['4Runner','Avalon','Camry','Corolla','GR86','Highlander','Prius','RAV4','Sequoia','Sienna','Tacoma','Tundra','Venza'],
  'Volkswagen':    ['Atlas','Golf','ID.4','Jetta','Passat','Taos','Tiguan'],
  'Volvo':         ['S60','S90','V60','XC40','XC60','XC90'],
  'Other':         ['(Enter make in notes)'],
}

const YEARS = Array.from({ length: 35 }, (_, i) => String(2025 - i))

function formatPhone(raw) {
  const digits = (raw || '').replace(/\D/g, '').slice(-10)
  if (digits.length === 10) return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`
  return raw || ''
}

function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

function render404() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Page Not Found — Hey Connie</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Sora',system-ui,sans-serif;background:#f8fafc;color:#0f172a;min-height:100vh;display:flex;align-items:center;justify-content:center;text-align:center;padding:24px}
    .card{background:#fff;border-radius:16px;padding:48px 32px;max-width:480px;box-shadow:0 4px 24px rgba(0,0,0,.08)}
    h1{font-size:1.75rem;font-weight:700;margin-bottom:12px}
    p{color:#64748b;line-height:1.6;margin-bottom:24px}
    a{display:inline-block;background:#6366f1;color:#fff;border-radius:8px;padding:12px 24px;font-weight:600;text-decoration:none}
    a:hover{background:#4f46e5}
    .logo{font-size:1.1rem;font-weight:700;color:#6366f1;margin-bottom:32px}
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">Hey Connie</div>
    <h1>Page not found</h1>
    <p>This business page doesn't exist yet or hasn't been published.</p>
    <a href="https://heyconnie.co">Are you a mobile detailer? Get your own page →</a>
  </div>
</body>
</html>`
}

function renderOnePager(biz, services) {
  const bizName   = escHtml(biz.name || '')
  const tagline   = escHtml(biz.tagline || '')
  const phone     = biz.phone || ''
  const phoneFmt  = formatPhone(phone)
  const instagram = biz.instagram || ''
  const facebook  = biz.facebook_url || ''
  const slug      = biz.id

  const serviceOptions = services.map(s =>
    `<option value="${escHtml(s.name)}">${escHtml(s.name)} — Starting at $${Number(s.starting_price).toFixed(0)}</option>`
  ).join('\n')

  const serviceCards = services.map(s => `
    <div class="svc-card">
      <div class="svc-name">${escHtml(s.name)}</div>
      <div class="svc-price">Starting at $${Number(s.starting_price).toFixed(0)}</div>
    </div>`).join('')

  const makeOptions = Object.keys(CAR_DATA).map(m =>
    `<option value="${escHtml(m)}">${escHtml(m)}</option>`
  ).join('\n')

  const carDataJson = JSON.stringify(CAR_DATA)
  const yearsOptions = YEARS.map(y => `<option value="${y}">${y}</option>`).join('\n')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${bizName} — Mobile Car Detailing</title>
  <meta name="description" content="${bizName}. ${tagline}. Book online.">
  <meta property="og:title" content="${bizName}">
  <meta property="og:description" content="${tagline}">
  <meta property="og:type" content="website">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root{
      --blue:#1d4ed8;--blue-dark:#1e40af;--blue-light:#eff6ff;
      --text:#0f172a;--sub:#64748b;--border:#e2e8f0;
      --bg:#ffffff;--bg-gray:#f8fafc;--r:10px;
    }
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Sora',system-ui,sans-serif;color:var(--text);background:var(--bg);line-height:1.5;-webkit-font-smoothing:antialiased}
    a{color:inherit;text-decoration:none}

    /* ── Header ── */
    .header{background:var(--text);color:#fff;padding:20px 24px;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}
    .header-name{font-size:1.25rem;font-weight:700;letter-spacing:-.01em}
    .header-tagline{font-size:.85rem;color:#94a3b8;margin-top:2px}
    .btn-call{display:inline-flex;align-items:center;gap:8px;background:var(--blue);color:#fff;border-radius:8px;padding:10px 20px;font-weight:600;font-size:.9rem;white-space:nowrap;transition:background .15s}
    .btn-call:hover{background:var(--blue-dark)}
    .btn-call svg{flex-shrink:0}

    /* ── Services strip ── */
    .services{background:var(--bg-gray);border-bottom:1px solid var(--border);padding:24px}
    .services h2{font-size:1rem;font-weight:600;color:var(--sub);text-transform:uppercase;letter-spacing:.06em;margin-bottom:16px;text-align:center}
    .svc-grid{display:flex;gap:12px;flex-wrap:wrap;justify-content:center}
    .svc-card{background:#fff;border:1px solid var(--border);border-radius:var(--r);padding:16px 20px;min-width:140px;text-align:center}
    .svc-name{font-weight:600;font-size:.95rem;margin-bottom:4px}
    .svc-price{color:var(--blue);font-size:.85rem;font-weight:500}

    /* ── Booking form ── */
    .booking{padding:32px 24px;max-width:640px;margin:0 auto}
    .booking h2{font-size:1.4rem;font-weight:700;margin-bottom:4px}
    .booking .sub{color:var(--sub);font-size:.9rem;margin-bottom:24px}
    .form-group{margin-bottom:16px}
    label{display:block;font-size:.85rem;font-weight:600;margin-bottom:6px;color:var(--text)}
    label .opt{font-weight:400;color:var(--sub);font-size:.8rem;margin-left:4px}
    input,select,textarea{width:100%;padding:10px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:.95rem;font-family:inherit;background:#fff;color:var(--text);transition:border-color .15s;outline:none;appearance:none;-webkit-appearance:none}
    select{background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748b' d='M6 8L1 3h10z'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 12px center;padding-right:32px}
    input:focus,select:focus,textarea:focus{border-color:var(--blue)}
    textarea{resize:vertical;min-height:80px}
    .row-2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
    .row-3{display:grid;grid-template-columns:2fr 2fr 1fr;gap:12px}
    .time-opts{display:flex;gap:8px;flex-wrap:wrap}
    .time-opts label{cursor:pointer;flex:1;min-width:90px}
    .time-opts input[type=radio]{display:none}
    .time-chip{border:1.5px solid var(--border);border-radius:8px;padding:10px;text-align:center;font-size:.85rem;font-weight:500;transition:all .15s;background:#fff}
    .time-opts input[type=radio]:checked + .time-chip{border-color:var(--blue);background:var(--blue-light);color:var(--blue);font-weight:600}
    .consent-row{display:flex;align-items:flex-start;gap:10px;margin-top:4px}
    .consent-row input[type=checkbox]{width:18px;height:18px;flex-shrink:0;margin-top:2px;accent-color:var(--blue);cursor:pointer}
    .consent-row p{font-size:.78rem;color:var(--sub);line-height:1.5}
    .consent-row a{color:var(--blue);text-decoration:underline}
    .btn-submit{width:100%;padding:14px;background:var(--blue);color:#fff;border:none;border-radius:10px;font-size:1rem;font-weight:700;cursor:pointer;margin-top:20px;transition:background .15s;font-family:inherit}
    .btn-submit:hover{background:var(--blue-dark)}
    .btn-submit:disabled{background:#94a3b8;cursor:not-allowed}
    .form-msg{margin-top:16px;padding:14px 16px;border-radius:8px;font-size:.9rem;font-weight:500;display:none}
    .form-msg.success{background:#f0fdf4;border:1px solid #bbf7d0;color:#15803d}
    .form-msg.error{background:#fef2f2;border:1px solid #fecaca;color:#dc2626}

    /* ── Social ── */
    .social{padding:20px 24px;border-top:1px solid var(--border);background:var(--bg-gray);display:flex;gap:12px;justify-content:center;flex-wrap:wrap}
    .social-link{display:inline-flex;align-items:center;gap:8px;border:1px solid var(--border);border-radius:8px;padding:8px 16px;font-size:.85rem;font-weight:500;background:#fff;transition:border-color .15s}
    .social-link:hover{border-color:var(--blue);color:var(--blue)}

    /* ── Footer ── */
    footer{text-align:center;padding:20px 24px;font-size:.78rem;color:var(--sub);border-top:1px solid var(--border)}
    footer a{color:var(--blue)}

    @media(max-width:480px){
      .row-2,.row-3{grid-template-columns:1fr}
      .booking{padding:24px 16px}
    }
  </style>
</head>
<body>

<header class="header">
  <div>
    <div class="header-name">${bizName}</div>
    ${tagline ? `<div class="header-tagline">${tagline}</div>` : ''}
  </div>
  ${phone ? `<a class="btn-call" href="tel:${phone.replace(/\D/g,'')}">
    <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.63A2 2 0 012 .84h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 15.92v1z"/></svg>
    Call ${phoneFmt}
  </a>` : ''}
</header>

${services.length ? `
<section class="services">
  <h2>Services</h2>
  <div class="svc-grid">${serviceCards}</div>
</section>` : ''}

<section class="booking">
  <h2>Book an Appointment</h2>
  <p class="sub">Fill out the form below and ${biz.owner_name || 'we'} will confirm your booking.</p>

  <form id="bookForm" novalidate>
    <div class="form-group">
      <label for="service">Service</label>
      <select id="service" name="service" required>
        <option value="">Select a service…</option>
        ${serviceOptions}
      </select>
    </div>

    <div class="row-2">
      <div class="form-group">
        <label for="name">Full Name</label>
        <input type="text" id="name" name="name" placeholder="Luis Garcia" required autocomplete="name">
      </div>
      <div class="form-group">
        <label for="phone">Phone Number</label>
        <input type="tel" id="phone" name="phone" placeholder="(626) 555-0100" required autocomplete="tel">
      </div>
    </div>

    <div class="form-group">
      <label for="email">Email <span class="opt">(optional)</span></label>
      <input type="email" id="email" name="email" placeholder="you@email.com" autocomplete="email">
    </div>

    <div class="form-group">
      <label for="city">Service Address</label>
      <input type="text" id="city" name="city" placeholder="123 Main St, Pasadena CA" required autocomplete="street-address">
    </div>

    <div class="row-3">
      <div class="form-group">
        <label for="make">Make</label>
        <select id="make" name="make" required>
          <option value="">Make…</option>
          ${makeOptions}
        </select>
      </div>
      <div class="form-group">
        <label for="model">Model</label>
        <select id="model" name="model" required>
          <option value="">Model…</option>
        </select>
      </div>
      <div class="form-group">
        <label for="year">Year</label>
        <select id="year" name="year" required>
          <option value="">Year…</option>
          ${yearsOptions}
        </select>
      </div>
    </div>

    <div class="form-group">
      <label for="date">Preferred Date</label>
      <input type="date" id="date" name="date">
    </div>

    <div class="form-group">
      <label>Preferred Time</label>
      <div class="time-opts">
        <label><input type="radio" name="time" value="Morning"><span class="time-chip">Morning</span></label>
        <label><input type="radio" name="time" value="Afternoon"><span class="time-chip">Afternoon</span></label>
        <label><input type="radio" name="time" value="Evening"><span class="time-chip">Evening</span></label>
      </div>
    </div>

    <div class="form-group">
      <label for="notes">Notes <span class="opt">(optional)</span></label>
      <textarea id="notes" name="notes" placeholder="Anything we should know? Heavy soiling, pet hair, etc."></textarea>
    </div>

    <div class="form-group">
      <label for="promo">Promo Code <span class="opt">(optional)</span></label>
      <input type="text" id="promo" name="promo" placeholder="Enter code">
    </div>

    <div class="form-group">
      <div class="consent-row">
        <input type="checkbox" id="smsConsent" name="smsConsent" required>
        <p>I agree to receive SMS messages from <strong>${bizName}</strong> regarding my booking, including appointment confirmations and reminders. Message &amp; data rates may apply. Reply STOP to opt-out at any time. View our <a href="https://heyconnie.co/terms" target="_blank">Terms of Service</a> and <a href="https://heyconnie.co/privacy" target="_blank">Privacy Policy</a>.</p>
      </div>
    </div>

    <button type="submit" class="btn-submit" id="submitBtn">Book Appointment</button>
    <div class="form-msg" id="formMsg"></div>
  </form>
</section>

${instagram || facebook ? `
<div class="social">
  ${instagram ? `<a class="social-link" href="${escHtml(instagram)}" target="_blank" rel="noopener">
    <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
    Instagram
  </a>` : ''}
  ${facebook ? `<a class="social-link" href="${escHtml(facebook)}" target="_blank" rel="noopener">
    <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/></svg>
    Facebook
  </a>` : ''}
</div>` : ''}

<footer>
  <p>Powered by <a href="https://heyconnie.co" target="_blank">Hey Connie</a> &mdash; AI Voice Receptionist for Mobile Detailers</p>
</footer>

<script>
const CAR_DATA = ${carDataJson}
const BUSINESS_ID = '${slug}'

const makeEl  = document.getElementById('make')
const modelEl = document.getElementById('model')

makeEl.addEventListener('change', function () {
  const models = CAR_DATA[this.value] || []
  modelEl.innerHTML = '<option value="">Model…</option>' +
    models.map(m => '<option value="' + m + '">' + m + '</option>').join('')
})

const dateEl = document.getElementById('date')
const today = new Date()
today.setHours(0,0,0,0)
const minDate = new Date(today.getTime() + 24*60*60*1000) // tomorrow minimum
dateEl.min = minDate.toISOString().split('T')[0]

document.getElementById('bookForm').addEventListener('submit', async function(e) {
  e.preventDefault()
  const btn = document.getElementById('submitBtn')
  const msg = document.getElementById('formMsg')
  const consent = document.getElementById('smsConsent')

  if (!consent.checked) {
    msg.textContent = 'Please agree to the SMS consent to continue.'
    msg.className = 'form-msg error'
    msg.style.display = 'block'
    return
  }

  const required = ['service','name','phone','city','make','model','year']
  const missing = required.filter(id => !document.getElementById(id)?.value?.trim())
  if (missing.length) {
    msg.textContent = 'Please fill in all required fields.'
    msg.className = 'form-msg error'
    msg.style.display = 'block'
    return
  }

  btn.disabled = true
  btn.textContent = 'Booking…'
  msg.style.display = 'none'

  const time = document.querySelector('input[name="time"]:checked')?.value || ''

  try {
    const res = await fetch('/api/book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        business_id: BUSINESS_ID,
        name:        document.getElementById('name').value.trim(),
        phone:       document.getElementById('phone').value.trim(),
        email:       document.getElementById('email').value.trim() || null,
        city:        document.getElementById('city').value.trim(),
        make:        document.getElementById('make').value.trim(),
        model:       document.getElementById('model').value.trim(),
        year:        document.getElementById('year').value.trim(),
        service:     document.getElementById('service').value.trim(),
        notes:       document.getElementById('notes').value.trim() || null,
        date:        document.getElementById('date').value || null,
        time,
        promo_code:  document.getElementById('promo').value.trim() || null,
        sms_consent: true,
      }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Booking failed')
    msg.textContent = '✓ Booking received! We\\'ll be in touch to confirm your appointment.'
    msg.className = 'form-msg success'
    msg.style.display = 'block'
    document.getElementById('bookForm').reset()
    modelEl.innerHTML = '<option value="">Model…</option>'
  } catch(err) {
    msg.textContent = err.message || 'Something went wrong. Please try again or call us.'
    msg.className = 'form-msg error'
    msg.style.display = 'block'
  } finally {
    btn.disabled = false
    btn.textContent = 'Book Appointment'
  }
})
</script>
</body>
</html>`
}

module.exports = async function handler(req, res) {
  const slug = req.query.slug

  if (!slug) return res.status(404).send(render404())

  const { data: biz } = await supabase
    .from('businesses')
    .select('id,name,phone,email,instagram,facebook_url,tagline,owner_name,service_area,website_template,website_enabled')
    .eq('id', slug)
    .eq('website_enabled', true)
    .maybeSingle()

  if (!biz) return res.status(404).send(render404())

  const { data: services } = await supabase
    .from('services')
    .select('name,starting_price,duration_minutes')
    .eq('business_id', slug)
    .order('starting_price', { ascending: true })

  const html = renderOnePager(biz, services || [])

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300')
  return res.status(200).send(html)
}
