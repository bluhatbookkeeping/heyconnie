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

function renderBookingForm({ businessId, apiBase, businessName, services }) {
  const bizName = escHtml(businessName || '')
  const base    = apiBase || 'https://heyconnie.co'

  const serviceOptions = (services || []).map(s =>
    `<option value="${escHtml(s.name)}">${escHtml(s.name)} — Starting at $${Number(s.starting_price).toFixed(0)}</option>`
  ).join('\n')

  const makeOptions = Object.keys(CAR_DATA).map(m =>
    `<option value="${escHtml(m)}">${escHtml(m)}</option>`
  ).join('\n')

  const yearsOptions = YEARS.map(y => `<option value="${y}">${y}</option>`).join('\n')

  const carDataJson   = JSON.stringify(CAR_DATA)
  const servicesJson  = JSON.stringify(services || [])

  return `<form id="bookForm" class="hc-form" novalidate>
    <div class="hf-group">
      <label for="service">Service</label>
      <select id="service" name="service" required>
        <option value="">Select a service…</option>
        ${serviceOptions}
      </select>
    </div>

    <div class="hf-row-2">
      <div class="hf-group">
        <label for="make">Make</label>
        <select id="make" name="make" required>
          <option value="">Make…</option>
          ${makeOptions}
        </select>
      </div>
      <div class="hf-group">
        <label for="model">Model</label>
        <select id="model" name="model" required>
          <option value="">Model…</option>
        </select>
      </div>
    </div>

    <div class="hf-group" style="max-width:140px">
      <label for="year">Year</label>
      <select id="year" name="year" required>
        <option value="">Year…</option>
        ${yearsOptions}
      </select>
    </div>

    <div class="hf-row-2">
      <div class="hf-group">
        <label for="name">Full Name</label>
        <input type="text" id="name" name="name" placeholder="Luis Garcia" required autocomplete="name">
      </div>
      <div class="hf-group">
        <label for="phone">Phone Number</label>
        <input type="tel" id="phone" name="phone" placeholder="(626) 555-0100" required autocomplete="tel">
      </div>
    </div>

    <div class="hf-group">
      <label for="email">Email <span class="hf-opt">(optional)</span></label>
      <input type="email" id="email" name="email" placeholder="you@email.com" autocomplete="email">
    </div>

    <div class="hf-group">
      <label for="city">Service Address</label>
      <input type="text" id="city" name="city" placeholder="123 Main Street, Pasadena CA" required autocomplete="street-address">
    </div>

    <div class="hf-group">
      <label for="date">Preferred Date</label>
      <input type="date" id="date" name="date">
    </div>

    <div class="hf-group">
      <label>Preferred Time</label>
      <div class="hf-chips">
        <label class="hf-chip-wrap"><input type="radio" name="time" value="Morning"><span class="hf-chip">Morning</span></label>
        <label class="hf-chip-wrap"><input type="radio" name="time" value="Afternoon"><span class="hf-chip">Afternoon</span></label>
        <label class="hf-chip-wrap"><input type="radio" name="time" value="Evening"><span class="hf-chip">Evening</span></label>
      </div>
    </div>

    <div class="hf-group">
      <label for="notes">Notes <span class="hf-opt">(optional)</span></label>
      <textarea id="notes" name="notes" placeholder="Heavy soiling, pet hair, anything we should know…"></textarea>
    </div>

    <div class="hf-group">
      <label for="promo">Promo Code <span class="hf-opt">(optional)</span></label>
      <input type="text" id="promo" name="promo" placeholder="Enter code">
    </div>

    <div class="hf-consent">
      <input type="checkbox" id="smsConsent" name="smsConsent">
      <p>I agree to receive SMS messages from <strong>${bizName}</strong> regarding my booking, including appointment confirmations and reminders. Message &amp; data rates may apply. Reply STOP to opt-out at any time. View our <a href="https://heyconnie.co/terms" target="_blank">Terms</a> and <a href="https://heyconnie.co/privacy" target="_blank">Privacy Policy</a>.</p>
    </div>

    <button type="submit" class="hf-submit" id="submitBtn">Book Appointment</button>
    <div class="hf-msg" id="formMsg"></div>
  </form>

  <script>
  (function(){
    const CAR_DATA = ${carDataJson}
    const BUSINESS_ID = '${escHtml(businessId)}'
    const API_BASE    = '${base}'

    const makeEl  = document.getElementById('make')
    const modelEl = document.getElementById('model')

    makeEl.addEventListener('change', function () {
      const models = CAR_DATA[this.value] || []
      modelEl.innerHTML = '<option value="">Model…</option>' +
        models.map(m => '<option value="' + m + '">' + m + '</option>').join('')
    })

    const dateEl = document.getElementById('date')
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    dateEl.min = tomorrow.toISOString().split('T')[0]

    document.getElementById('bookForm').addEventListener('submit', async function(e) {
      e.preventDefault()
      const btn     = document.getElementById('submitBtn')
      const msg     = document.getElementById('formMsg')
      const consent = document.getElementById('smsConsent')

      if (!consent.checked) {
        msg.textContent = 'Please agree to the SMS consent to continue.'
        msg.className = 'hf-msg hf-error'
        return
      }

      const required = ['service','name','phone','city','make','model','year']
      const missing  = required.filter(id => !document.getElementById(id)?.value?.trim())
      if (missing.length) {
        msg.textContent = 'Please fill in all required fields.'
        msg.className = 'hf-msg hf-error'
        return
      }

      btn.disabled = true
      btn.textContent = 'Booking…'
      msg.className = 'hf-msg'
      msg.textContent = ''

      const time = document.querySelector('input[name="time"]:checked')?.value || ''

      try {
        const res = await fetch(API_BASE + '/api/book', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            business_id:    BUSINESS_ID,
            name:           document.getElementById('name').value.trim(),
            phone:          document.getElementById('phone').value.trim(),
            email:          document.getElementById('email').value.trim() || null,
            city:           document.getElementById('city').value.trim(),
            make:           document.getElementById('make').value.trim(),
            model:          document.getElementById('model').value.trim(),
            year:           document.getElementById('year').value.trim(),
            service:        document.getElementById('service').value.trim(),
            notes:          document.getElementById('notes').value.trim() || null,
            date:           document.getElementById('date').value || null,
            time,
            promo_code:     document.getElementById('promo').value.trim() || null,
            sms_consent:    true,
            sms_consent_at: new Date().toISOString(),
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Booking failed')
        msg.textContent = '✓ Booking received! We\\'ll be in touch to confirm your appointment.'
        msg.className = 'hf-msg hf-success'
        document.getElementById('bookForm').reset()
        modelEl.innerHTML = '<option value="">Model…</option>'
      } catch(err) {
        msg.textContent = err.message || 'Something went wrong. Please try again or call us.'
        msg.className = 'hf-msg hf-error'
      } finally {
        btn.disabled = false
        btn.textContent = 'Book Appointment'
      }
    })
  })()
  </script>`
}

module.exports = { renderBookingForm, CAR_DATA, YEARS, escHtml }
