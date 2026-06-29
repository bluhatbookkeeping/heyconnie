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

function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

function renderWidget(biz, services) {
  const bizName      = escHtml(biz.name || '')
  const slug         = biz.id
  const serviceOpts  = services.map(s =>
    `<option value="${escHtml(s.name)}">${escHtml(s.name)} — Starting at $${Number(s.starting_price).toFixed(0)}</option>`
  ).join('\n')
  const makeOptions  = Object.keys(CAR_DATA).map(m =>
    `<option value="${escHtml(m)}">${escHtml(m)}</option>`
  ).join('\n')
  const yearsOptions = YEARS.map(y => `<option value="${y}">${y}</option>`).join('\n')
  const carDataJson  = JSON.stringify(CAR_DATA)

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Book — ${bizName}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root{--blue:#1d4ed8;--blue-dark:#1e40af;--blue-light:#eff6ff;--text:#0f172a;--sub:#64748b;--border:#e2e8f0;--bg:#ffffff;--r:8px}
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Sora',system-ui,sans-serif;color:var(--text);background:var(--bg);line-height:1.5;padding:20px 16px;-webkit-font-smoothing:antialiased}
    h2{font-size:1.2rem;font-weight:700;margin-bottom:4px}
    .sub{color:var(--sub);font-size:.85rem;margin-bottom:20px}
    .form-group{margin-bottom:14px}
    label{display:block;font-size:.82rem;font-weight:600;margin-bottom:5px}
    label .opt{font-weight:400;color:var(--sub);margin-left:4px}
    input,select,textarea{width:100%;padding:9px 11px;border:1.5px solid var(--border);border-radius:var(--r);font-size:.9rem;font-family:inherit;background:#fff;color:var(--text);outline:none;appearance:none;-webkit-appearance:none;transition:border-color .15s}
    select{background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748b' d='M6 8L1 3h10z'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 10px center;padding-right:28px}
    input:focus,select:focus,textarea:focus{border-color:var(--blue)}
    textarea{resize:vertical;min-height:70px}
    .row-2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
    .row-3{display:grid;grid-template-columns:2fr 2fr 1fr;gap:10px}
    .time-opts{display:flex;gap:6px}
    .time-opts label{cursor:pointer;flex:1}
    .time-opts input[type=radio]{display:none}
    .time-chip{border:1.5px solid var(--border);border-radius:var(--r);padding:8px;text-align:center;font-size:.82rem;font-weight:500;transition:all .15s;background:#fff}
    .time-opts input[type=radio]:checked + .time-chip{border-color:var(--blue);background:var(--blue-light);color:var(--blue);font-weight:600}
    .consent-row{display:flex;align-items:flex-start;gap:9px;margin-top:2px}
    .consent-row input[type=checkbox]{width:16px;height:16px;flex-shrink:0;margin-top:2px;accent-color:var(--blue);cursor:pointer}
    .consent-row p{font-size:.74rem;color:var(--sub);line-height:1.5}
    .consent-row a{color:var(--blue);text-decoration:underline}
    .btn-submit{width:100%;padding:13px;background:var(--blue);color:#fff;border:none;border-radius:var(--r);font-size:.95rem;font-weight:700;cursor:pointer;margin-top:16px;transition:background .15s;font-family:inherit}
    .btn-submit:hover{background:var(--blue-dark)}
    .btn-submit:disabled{background:#94a3b8;cursor:not-allowed}
    .form-msg{margin-top:12px;padding:12px 14px;border-radius:var(--r);font-size:.85rem;font-weight:500;display:none}
    .form-msg.success{background:#f0fdf4;border:1px solid #bbf7d0;color:#15803d}
    .form-msg.error{background:#fef2f2;border:1px solid #fecaca;color:#dc2626}
    .powered{text-align:center;margin-top:20px;font-size:.72rem;color:var(--sub)}
    .powered a{color:var(--blue)}
    @media(max-width:380px){.row-2,.row-3{grid-template-columns:1fr}}
  </style>
</head>
<body>

<h2>Book an Appointment</h2>
<p class="sub">with ${bizName}</p>

<form id="bookForm" novalidate>
  <div class="form-group">
    <label for="service">Service</label>
    <select id="service" required>
      <option value="">Select a service…</option>
      ${serviceOpts}
    </select>
  </div>

  <div class="row-2">
    <div class="form-group">
      <label for="name">Full Name</label>
      <input type="text" id="name" placeholder="Luis Garcia" required autocomplete="name">
    </div>
    <div class="form-group">
      <label for="phone">Phone</label>
      <input type="tel" id="phone" placeholder="(626) 555-0100" required autocomplete="tel">
    </div>
  </div>

  <div class="form-group">
    <label for="email">Email <span class="opt">(optional)</span></label>
    <input type="email" id="email" placeholder="you@email.com" autocomplete="email">
  </div>

  <div class="form-group">
    <label for="city">Service Address</label>
    <input type="text" id="city" placeholder="123 Main St, Pasadena CA" required autocomplete="street-address">
  </div>

  <div class="row-3">
    <div class="form-group">
      <label for="make">Make</label>
      <select id="make" required>
        <option value="">Make…</option>
        ${makeOptions}
      </select>
    </div>
    <div class="form-group">
      <label for="model">Model</label>
      <select id="model" required>
        <option value="">Model…</option>
      </select>
    </div>
    <div class="form-group">
      <label for="year">Year</label>
      <select id="year" required>
        <option value="">Year…</option>
        ${yearsOptions}
      </select>
    </div>
  </div>

  <div class="form-group">
    <label for="date">Preferred Date</label>
    <input type="date" id="date">
  </div>

  <div class="form-group">
    <label>Time Preference</label>
    <div class="time-opts">
      <label><input type="radio" name="time" value="Morning"><span class="time-chip">Morning</span></label>
      <label><input type="radio" name="time" value="Afternoon"><span class="time-chip">Afternoon</span></label>
      <label><input type="radio" name="time" value="Evening"><span class="time-chip">Evening</span></label>
    </div>
  </div>

  <div class="form-group">
    <label for="notes">Notes <span class="opt">(optional)</span></label>
    <textarea id="notes" placeholder="Heavy soiling, pet hair, etc."></textarea>
  </div>

  <div class="form-group">
    <label for="promo">Promo Code <span class="opt">(optional)</span></label>
    <input type="text" id="promo" placeholder="Enter code">
  </div>

  <div class="form-group">
    <div class="consent-row">
      <input type="checkbox" id="smsConsent" required>
      <p>I agree to receive SMS messages from <strong>${bizName}</strong> regarding my booking. Msg &amp; data rates may apply. Reply STOP to opt-out. <a href="https://heyconnie.co/terms" target="_blank">Terms</a> &amp; <a href="https://heyconnie.co/privacy" target="_blank">Privacy</a>.</p>
    </div>
  </div>

  <button type="submit" class="btn-submit" id="submitBtn">Book Appointment</button>
  <div class="form-msg" id="formMsg"></div>
</form>

<p class="powered">Powered by <a href="https://heyconnie.co" target="_blank">Hey Connie</a></p>

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
const minDate = new Date(Date.now() + 24*60*60*1000)
dateEl.min = minDate.toISOString().split('T')[0]

document.getElementById('bookForm').addEventListener('submit', async function(e) {
  e.preventDefault()
  const btn = document.getElementById('submitBtn')
  const msg = document.getElementById('formMsg')

  if (!document.getElementById('smsConsent').checked) {
    msg.textContent = 'Please agree to SMS consent to continue.'
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
    const res = await fetch('https://heyconnie.co/api/book', {
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
    msg.textContent = '✓ Booking received! We\\'ll confirm your appointment shortly.'
    msg.className = 'form-msg success'
    msg.style.display = 'block'
    document.getElementById('bookForm').reset()
    modelEl.innerHTML = '<option value="">Model…</option>'
  } catch(err) {
    msg.textContent = err.message || 'Something went wrong. Please try again.'
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

function render404Widget() {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Not Found</title></head><body style="font-family:system-ui;padding:24px;color:#0f172a"><p>Booking form not available.</p></body></html>`
}

module.exports = async function handler(req, res) {
  const slug = req.query.slug

  if (!slug) return res.status(404).send(render404Widget())

  const { data: biz } = await supabase
    .from('businesses')
    .select('id,name,website_enabled')
    .eq('id', slug)
    .eq('website_enabled', true)
    .maybeSingle()

  if (!biz) return res.status(404).send(render404Widget())

  const { data: services } = await supabase
    .from('services')
    .select('name,starting_price')
    .eq('business_id', slug)
    .order('starting_price', { ascending: true })

  const html = renderWidget(biz, services || [])

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('X-Frame-Options', 'ALLOWALL')
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300')
  return res.status(200).send(html)
}
