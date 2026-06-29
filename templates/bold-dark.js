const { renderBookingForm, escHtml } = require('./booking-form')

function formatPhone(raw) {
  const digits = (raw || '').replace(/\D/g, '').slice(-10)
  if (digits.length === 10) return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`
  return raw || ''
}

function renderBoldDark({ business, services }) {
  const biz       = business
  const bizName   = escHtml(biz.name || '')
  const tagline   = escHtml(biz.tagline || '')
  const phone     = biz.phone || ''
  const phoneFmt  = formatPhone(phone)
  const instagram = biz.instagram || ''
  const facebook  = biz.facebook_url || ''
  const slug      = biz.id
  const apiBase   = biz.base_url || 'https://heyconnie.co'
  const gallery   = Array.isArray(biz.gallery_image_urls) ? biz.gallery_image_urls.filter(Boolean) : []

  const serviceCards = (services || []).map(s => `
    <div class="bd-svc-card">
      <div class="bd-svc-name">${escHtml(s.name)}</div>
      <div class="bd-svc-price">Starting at $${Number(s.starting_price).toFixed(0)}</div>
      ${s.duration_minutes ? `<div class="bd-svc-dur">${s.duration_minutes} min</div>` : ''}
    </div>`).join('')

  const galleryHtml = gallery.length ? `
  <section class="bd-gallery">
    <h2 class="bd-section-title">Our Work</h2>
    <div class="bd-gallery-grid">
      ${gallery.map(url => `<div class="bd-gallery-item"><img src="${escHtml(url)}" alt="Detail work" loading="lazy"></div>`).join('')}
    </div>
  </section>` : ''

  const socialLinks = (instagram || facebook) ? `
  <div class="bd-social">
    ${instagram ? `<a class="bd-social-link" href="${escHtml(instagram)}" target="_blank" rel="noopener">
      <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
      Instagram
    </a>` : ''}
    ${facebook ? `<a class="bd-social-link" href="${escHtml(facebook)}" target="_blank" rel="noopener">
      <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/></svg>
      Facebook
    </a>` : ''}
  </div>` : ''

  const formHtml = renderBookingForm({
    businessId:   slug,
    apiBase,
    businessName: biz.name || '',
    services,
  })

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${bizName} — Mobile Car Detailing</title>
  <meta name="description" content="${bizName}. ${tagline}. Book online today.">
  <meta property="og:title" content="${bizName}">
  <meta property="og:description" content="${tagline}">
  <meta property="og:type" content="website">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    /* ── Reset ── */
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'DM Sans',system-ui,sans-serif;background:#0f172a;color:#f1f5f9;line-height:1.5;-webkit-font-smoothing:antialiased}
    a{color:inherit;text-decoration:none}
    img{display:block;width:100%;height:100%;object-fit:cover}

    /* ── Nav bar ── */
    .bd-nav{display:flex;align-items:center;justify-content:space-between;padding:16px 24px;background:#0a1120;border-bottom:1px solid rgba(255,255,255,.06)}
    .bd-nav-name{font-family:'Barlow Condensed',sans-serif;font-size:1.25rem;font-weight:700;letter-spacing:.02em;color:#f8fafc}
    .bd-nav-call{display:inline-flex;align-items:center;gap:8px;background:#1d4ed8;color:#fff;border-radius:8px;padding:10px 18px;font-weight:600;font-size:.875rem;transition:background .15s;white-space:nowrap}
    .bd-nav-call:hover{background:#1e40af}
    .bd-nav-call svg{flex-shrink:0}

    /* ── Hero ── */
    .bd-hero{padding:64px 24px 56px;text-align:center;background:linear-gradient(160deg,#0f172a 0%,#1e293b 100%);border-bottom:1px solid rgba(255,255,255,.06)}
    .bd-hero-name{font-family:'Barlow Condensed',sans-serif;font-size:clamp(2.5rem,7vw,4.5rem);font-weight:800;letter-spacing:-.01em;line-height:1;color:#f8fafc;text-transform:uppercase}
    .bd-hero-tag{margin-top:16px;font-size:clamp(1rem,2.5vw,1.25rem);color:#94a3b8;font-weight:500;max-width:560px;margin-left:auto;margin-right:auto}
    .bd-hero-cta{margin-top:32px;display:inline-flex;align-items:center;gap:10px;background:#1d4ed8;color:#fff;border-radius:10px;padding:16px 32px;font-size:1.1rem;font-weight:700;letter-spacing:.01em;transition:background .15s}
    .bd-hero-cta:hover{background:#1e40af}
    .bd-hero-cta svg{flex-shrink:0}

    /* ── Section title ── */
    .bd-section-title{font-family:'Barlow Condensed',sans-serif;font-size:1.75rem;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:#f8fafc;margin-bottom:24px}

    /* ── Services ── */
    .bd-services{padding:48px 24px;border-bottom:1px solid rgba(255,255,255,.06)}
    .bd-svc-grid{display:flex;gap:16px;flex-wrap:wrap;justify-content:center}
    .bd-svc-card{background:#1e293b;border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:24px 28px;min-width:160px;text-align:center;flex:1;max-width:220px}
    .bd-svc-name{font-family:'Barlow Condensed',sans-serif;font-size:1.2rem;font-weight:700;color:#f8fafc;text-transform:uppercase;letter-spacing:.04em;margin-bottom:8px}
    .bd-svc-price{color:#3b82f6;font-size:1rem;font-weight:600}
    .bd-svc-dur{color:#64748b;font-size:.8rem;margin-top:4px}

    /* ── Gallery ── */
    .bd-gallery{padding:48px 24px;border-bottom:1px solid rgba(255,255,255,.06)}
    .bd-gallery-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
    .bd-gallery-item{border-radius:8px;overflow:hidden;aspect-ratio:4/3;background:#1e293b}

    /* ── Booking section ── */
    .bd-booking{padding:48px 24px;max-width:660px;margin:0 auto}
    .bd-booking-sub{color:#94a3b8;font-size:.95rem;margin-bottom:28px}

    /* ── Form (hc-form namespace) ── */
    .hc-form .hf-group{margin-bottom:16px}
    .hc-form label{display:block;font-size:.82rem;font-weight:600;margin-bottom:6px;color:#cbd5e1;letter-spacing:.02em;text-transform:uppercase}
    .hc-form .hf-opt{font-weight:400;color:#64748b;font-size:.8rem;text-transform:none;letter-spacing:0;margin-left:4px}
    .hc-form input,.hc-form select,.hc-form textarea{
      width:100%;padding:11px 14px;background:#1e293b;border:1.5px solid rgba(255,255,255,.1);border-radius:8px;
      font-size:.95rem;font-family:'DM Sans',system-ui,sans-serif;color:#f1f5f9;outline:none;
      appearance:none;-webkit-appearance:none;transition:border-color .15s
    }
    .hc-form select{
      background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2394a3b8' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
      background-repeat:no-repeat;background-position:right 12px center;background-color:#1e293b;padding-right:34px
    }
    .hc-form select option{background:#1e293b;color:#f1f5f9}
    .hc-form input:focus,.hc-form select:focus,.hc-form textarea:focus{border-color:#3b82f6}
    .hc-form textarea{resize:vertical;min-height:80px}
    .hc-form .hf-row-2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
    .hc-form .hf-chips{display:flex;gap:8px;flex-wrap:wrap}
    .hc-form .hf-chip-wrap{cursor:pointer;flex:1;min-width:90px}
    .hc-form .hf-chip-wrap input[type=radio]{display:none}
    .hc-form .hf-chip{border:1.5px solid rgba(255,255,255,.12);border-radius:8px;padding:10px;text-align:center;font-size:.875rem;font-weight:500;background:#1e293b;color:#94a3b8;transition:all .15s;display:block}
    .hc-form .hf-chip-wrap input[type=radio]:checked + .hf-chip{border-color:#3b82f6;background:rgba(59,130,246,.15);color:#60a5fa;font-weight:600}
    .hc-form .hf-consent{display:flex;align-items:flex-start;gap:10px;margin:8px 0 4px}
    .hc-form .hf-consent input[type=checkbox]{width:18px;height:18px;flex-shrink:0;margin-top:2px;accent-color:#3b82f6;cursor:pointer}
    .hc-form .hf-consent p{font-size:.78rem;color:#64748b;line-height:1.5}
    .hc-form .hf-consent a{color:#3b82f6;text-decoration:underline}
    .hc-form .hf-submit{width:100%;padding:15px;background:#1d4ed8;color:#fff;border:none;border-radius:10px;font-size:1rem;font-weight:700;cursor:pointer;margin-top:20px;transition:background .15s;font-family:'DM Sans',system-ui,sans-serif;letter-spacing:.01em}
    .hc-form .hf-submit:hover{background:#1e40af}
    .hc-form .hf-submit:disabled{background:#334155;cursor:not-allowed;color:#64748b}
    .hc-form .hf-msg{margin-top:14px;padding:13px 16px;border-radius:8px;font-size:.9rem;font-weight:500;display:none}
    .hc-form .hf-msg.hf-success{display:block;background:rgba(21,128,61,.15);border:1px solid rgba(21,128,61,.3);color:#4ade80}
    .hc-form .hf-msg.hf-error{display:block;background:rgba(220,38,38,.1);border:1px solid rgba(220,38,38,.25);color:#f87171}

    /* ── Social ── */
    .bd-social{padding:24px;border-top:1px solid rgba(255,255,255,.06);background:#0a1120;display:flex;gap:12px;justify-content:center;flex-wrap:wrap}
    .bd-social-link{display:inline-flex;align-items:center;gap:8px;border:1px solid rgba(255,255,255,.1);border-radius:8px;padding:10px 18px;font-size:.875rem;font-weight:500;background:#1e293b;color:#94a3b8;transition:all .15s}
    .bd-social-link:hover{border-color:#3b82f6;color:#60a5fa}

    /* ── Footer ── */
    .bd-footer{text-align:center;padding:20px 24px;font-size:.78rem;color:#475569;border-top:1px solid rgba(255,255,255,.06);background:#0a1120}
    .bd-footer a{color:#3b82f6}

    @media(max-width:520px){
      .hc-form .hf-row-2{grid-template-columns:1fr}
      .bd-gallery-grid{grid-template-columns:repeat(2,1fr)}
      .bd-booking{padding:32px 16px}
    }
  </style>
</head>
<body>

<nav class="bd-nav">
  <span class="bd-nav-name">${bizName}</span>
  ${phone ? `<a class="bd-nav-call" href="tel:${phone.replace(/\D/g,'')}">
    <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.4 1.18 2 2 0 012 .84h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 15.92v1z"/></svg>
    ${phoneFmt}
  </a>` : ''}
</nav>

<section class="bd-hero">
  <h1 class="bd-hero-name">${bizName}</h1>
  ${tagline ? `<p class="bd-hero-tag">${tagline}</p>` : ''}
  ${phone ? `<a class="bd-hero-cta" href="#booking">
    <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
    Book Now
  </a>` : ''}
</section>

${(services || []).length ? `
<section class="bd-services">
  <h2 class="bd-section-title">Services</h2>
  <div class="bd-svc-grid">${serviceCards}</div>
</section>` : ''}

${galleryHtml}

<section class="bd-booking" id="booking">
  <h2 class="bd-section-title">Book an Appointment</h2>
  <p class="bd-booking-sub">Fill out the form and ${biz.owner_name || 'we'}'ll confirm your booking.</p>
  ${formHtml}
</section>

${socialLinks}

<footer class="bd-footer">
  <p>Powered by <a href="https://heyconnie.co" target="_blank">Hey Connie</a> &mdash; AI Voice Receptionist for Mobile Detailers</p>
</footer>

</body>
</html>`
}

module.exports = { renderBoldDark }
