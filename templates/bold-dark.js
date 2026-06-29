const { renderBookingForm, escHtml } = require('./booking-form')

function formatPhone(raw) {
  const digits = (raw || '').replace(/\D/g, '').slice(-10)
  if (digits.length === 10) return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`
  return raw || ''
}

function formatPhoneBare(raw) {
  return (raw || '').replace(/\D/g, '').slice(-10)
}

const SVC_ICONS = [
  `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>`,
  `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3l14 9-14 9V3z"/></svg>`,
  `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
]

function renderBoldDark({ business, services }) {
  const biz        = business
  const bizName    = escHtml(biz.name || '')
  const tagline    = escHtml(biz.tagline || '')
  const serviceArea = escHtml(biz.service_area || '')
  const phone      = biz.phone || ''
  const phoneFmt   = formatPhone(phone)
  const phoneBare  = formatPhoneBare(phone)
  const instagram  = biz.instagram || ''
  const facebook   = biz.facebook_url || ''
  const slug       = biz.id
  const apiBase    = biz.base_url || 'https://heyconnie.co'
  const heroImg    = biz.hero_image_url || ''
  const gallery    = Array.isArray(biz.gallery_image_urls) ? biz.gallery_image_urls.filter(Boolean) : []

  const svcs = services || []
  const midIndex = Math.floor((svcs.length - 1) / 2)

  const serviceCards = svcs.map((s, i) => {
    const isFeatured = svcs.length > 1 && i === midIndex
    const icon = SVC_ICONS[i % SVC_ICONS.length]
    return `
      <div class="svc-card${isFeatured ? ' featured' : ''}">
        ${isFeatured ? '<div class="svc-badge">Most Popular</div>' : ''}
        <div class="svc-icon">${icon}</div>
        <div class="svc-name">${escHtml(s.name)}</div>
        <div class="svc-price">Starting at $${Number(s.starting_price).toFixed(0)}</div>
        ${s.description ? `<div class="svc-desc">${escHtml(s.description)}</div>` : ''}
        <div style="margin-top:22px">
          <a href="#book" class="btn ${isFeatured ? 'btn-primary' : 'btn-outline'} btn-full">Request This Service</a>
        </div>
      </div>`
  }).join('')

  const galleryHtml = gallery.length ? `
  <section class="section section--dark" id="gallery">
    <div class="container">
      <p class="label">Our Work</p>
      <h2 class="h2">Recent Details</h2>
      <div class="ig-grid">
        ${gallery.map(url => `
          <div class="ig-cell">
            <img src="${escHtml(url)}" alt="Detail work" loading="lazy">
            <div class="ig-overlay">
              <svg width="22" height="22" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
            </div>
          </div>`).join('')}
      </div>
      ${instagram ? `<p class="ig-handle">Follow us on Instagram: <a href="${escHtml(instagram)}" target="_blank" rel="noopener"><span>@${escHtml(instagram.replace(/.*instagram\.com\/([^/]+).*/,'$1'))}</span></a></p>` : ''}
    </div>
  </section>` : ''

  const heroStyle = heroImg
    ? `background-color:#111;background-image:url('${escHtml(heroImg)}');background-size:cover;background-position:center 40%`
    : `background:linear-gradient(160deg,#0a1120 0%,#0f172a 60%,#1e2d4a 100%)`

  const badgeText = serviceArea
    ? `Serving ${serviceArea}`
    : `Professional Mobile Detailing`

  const heroH1 = tagline
    ? `<em>${tagline}</em>`
    : `Professional Mobile Car Detailing<br><em>We Come to You</em>`

  const formHtml = renderBookingForm({
    businessId:   slug,
    apiBase,
    businessName: biz.name || '',
    services:     svcs,
  })

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${bizName}${serviceArea ? ' | Mobile Car Detailing in ' + escHtml(serviceArea) : ' — Mobile Car Detailing'}</title>
  <meta name="description" content="${bizName} offers professional mobile car detailing${serviceArea ? ' in ' + escHtml(serviceArea) : ''}. Book online today.">
  <meta property="og:title" content="${bizName}">
  <meta property="og:description" content="${tagline || 'Professional mobile car detailing. We come to you.'}">
  <meta property="og:type" content="website">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&display=swap" rel="stylesheet">
  <style>
    :root{
      --blue:#1d4ed8;--blue-dark:#1e3a8a;--blue-light:#eff6ff;
      --text:#1a1a1a;--muted:#6b7280;--bg:#ffffff;--bg-gray:#f8f9fa;
      --bg-dark:#0f172a;--border:#e5e7eb;
      --display:'Barlow Condensed',sans-serif;--body:'DM Sans',sans-serif;
      --r:8px;--rl:16px;
      --shadow:0 1px 3px rgba(0,0,0,.1),0 1px 2px rgba(0,0,0,.06);
      --shadow-md:0 4px 6px -1px rgba(0,0,0,.1),0 2px 4px -1px rgba(0,0,0,.06);
      --shadow-lg:0 10px 15px -3px rgba(0,0,0,.1),0 4px 6px -2px rgba(0,0,0,.05);
      --max:1200px;
    }
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    html{scroll-behavior:smooth;overflow-x:hidden}
    body{font-family:var(--body);color:var(--text);background:var(--bg);line-height:1.6;-webkit-font-smoothing:antialiased;overflow-x:hidden}
    img{max-width:100%;display:block}
    a{color:inherit;text-decoration:none}
    ul{list-style:none}
    .container{width:100%;max-width:var(--max);margin:0 auto;padding:0 20px}
    .section{padding:80px 0}
    .section--gray{background:var(--bg-gray)}
    .section--dark{background:var(--bg-dark);color:#fff}
    .label{font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--blue);margin-bottom:10px}
    .section--dark .label{color:rgba(255,255,255,.6)}
    .h2{font-family:var(--display);font-size:clamp(30px,5vw,50px);font-weight:700;line-height:1.08;margin-bottom:14px}
    .desc{font-size:17px;color:var(--muted);line-height:1.7;max-width:560px}
    .section--dark .desc{color:rgba(255,255,255,.7)}

    /* Buttons */
    .btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:14px 26px;font-family:var(--body);font-size:16px;font-weight:600;border-radius:var(--r);cursor:pointer;transition:all .2s;border:2px solid transparent;white-space:nowrap;text-decoration:none}
    .btn-primary{background:var(--blue);color:#fff;border-color:var(--blue)}
    .btn-primary:hover{background:var(--blue-dark);border-color:var(--blue-dark);transform:translateY(-1px);box-shadow:var(--shadow-md)}
    .btn-outline{background:transparent;color:var(--text);border-color:var(--border)}
    .btn-outline:hover{border-color:var(--text);transform:translateY(-1px)}
    .btn-outline-white{background:transparent;color:#fff;border-color:rgba(255,255,255,.45)}
    .btn-outline-white:hover{border-color:#fff;background:rgba(255,255,255,.1)}
    .btn-lg{padding:17px 34px;font-size:17px}
    .btn-full{width:100%}
    .btn-group{display:flex;flex-wrap:wrap;gap:12px;align-items:center}

    /* Nav */
    .nav{position:sticky;top:0;z-index:100;background:#fff;border-bottom:1px solid var(--border);box-shadow:var(--shadow)}
    .nav-inner{display:flex;align-items:center;justify-content:space-between;height:64px}
    .nav-logo{font-family:var(--display);font-size:21px;font-weight:700;letter-spacing:.02em;line-height:1.2}
    .nav-logo small{display:block;font-family:var(--body);font-size:11px;font-weight:500;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
    .nav-links{display:flex;align-items:center;gap:26px}
    .nav-links a{font-size:15px;font-weight:500;color:var(--muted);transition:color .15s}
    .nav-links a:hover{color:var(--blue)}
    .nav-right{display:flex;align-items:center;gap:12px}
    .nav-phone{font-size:15px;font-weight:700;color:var(--blue)}
    .nav-toggle{display:none;flex-direction:column;gap:5px;cursor:pointer;padding:4px;background:none;border:none}
    .nav-toggle span{display:block;width:24px;height:2px;background:var(--text);transition:all .3s;border-radius:2px}
    .nav-mobile{display:none;background:#fff;border-bottom:1px solid var(--border);padding:20px}
    .nav-mobile.open{display:block}
    .nav-mobile a{display:block;padding:12px 0;font-size:17px;font-weight:500;border-bottom:1px solid var(--border);color:var(--text)}
    .nav-mobile a:last-child{border-bottom:none}
    .mob-cta{margin-top:16px;display:flex;flex-direction:column;gap:10px}

    /* Hero */
    .hero{${heroStyle};color:#fff;padding:56px 0;position:relative;overflow:hidden}
    .hero::before{content:'';position:absolute;inset:0;background:linear-gradient(to right,rgba(0,0,0,.85) 0%,rgba(0,0,0,.68) 50%,rgba(0,0,0,.38) 100%);pointer-events:none}
    .hero-inner{position:relative;z-index:1;max-width:780px}
    .hero-badge{display:inline-flex;align-items:center;gap:8px;background:rgba(29,78,216,.2);border:1px solid rgba(29,78,216,.4);color:#93c5fd;font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;padding:6px 14px;border-radius:100px;margin-bottom:28px}
    .hero-dot{width:6px;height:6px;background:#60a5fa;border-radius:50%;animation:pulse 2s infinite}
    @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(.8)}}
    .hero h1{font-family:var(--display);font-size:clamp(38px,7vw,72px);font-weight:800;line-height:1.05;margin-bottom:20px}
    .hero h1 em{color:#60a5fa;font-style:normal}
    .hero-sub{font-size:clamp(16px,2.2vw,19px);color:rgba(255,255,255,.75);line-height:1.7;margin-bottom:36px;max-width:580px}
    .hero-phone{display:flex;align-items:center;gap:10px;font-size:20px;font-weight:700;color:#fff;margin-top:28px}
    .hero-phone a{color:#60a5fa}

    /* Trust bar */
    .trust-bar{background:var(--blue);padding:14px 0}
    .trust-bar-inner{display:flex;flex-wrap:wrap;justify-content:center;gap:8px 28px}
    .trust-item-bar{display:flex;align-items:center;gap:7px;color:#fff;font-size:13px;font-weight:500;white-space:nowrap}
    .chk{width:16px;height:16px;background:#fff;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0}
    .chk::after{content:'✓';font-size:10px;color:var(--blue);font-weight:800;line-height:1}

    /* Services */
    .services-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:24px;margin-top:48px}
    .svc-card{background:#fff;border:1px solid var(--border);border-radius:var(--rl);padding:30px;position:relative;transition:box-shadow .25s,transform .25s}
    .svc-card:hover{box-shadow:var(--shadow-lg);transform:translateY(-4px)}
    .svc-card.featured{border-color:var(--blue);border-width:2px}
    .svc-badge{position:absolute;top:-12px;left:28px;background:var(--blue);color:#fff;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:4px 12px;border-radius:100px}
    .svc-icon{width:46px;height:46px;background:var(--blue-light);border-radius:var(--r);display:flex;align-items:center;justify-content:center;color:var(--blue);margin-bottom:18px}
    .svc-name{font-family:var(--display);font-size:26px;font-weight:700;margin-bottom:6px}
    .svc-price{font-family:var(--display);font-size:22px;font-weight:700;color:var(--blue);margin-bottom:4px}
    .svc-desc{font-size:14px;color:var(--muted);margin-bottom:18px;line-height:1.6}

    /* Gallery */
    .ig-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;margin:28px 0;border-radius:var(--rl);overflow:hidden}
    .ig-cell{aspect-ratio:1;background:rgba(255,255,255,.05);display:flex;align-items:center;justify-content:center;overflow:hidden;position:relative}
    .ig-cell img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transition:transform .3s}
    .ig-cell:hover img{transform:scale(1.05)}
    .ig-cell .ig-overlay{position:absolute;inset:0;background:rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;color:#fff;opacity:0;transition:opacity .25s}
    .ig-cell:hover .ig-overlay{opacity:1}
    .ig-handle{font-size:16px;font-weight:600;margin-top:8px;color:rgba(255,255,255,.7)}
    .ig-handle a,.ig-handle span{color:#60a5fa}

    /* Booking section */
    .booking-section{padding:80px 0;background:var(--bg-dark)}
    .booking-section .label{color:rgba(255,255,255,.6)}
    .booking-section .h2{color:#fff}
    .booking-section .desc{color:rgba(255,255,255,.65)}
    .form-wrap{display:grid;grid-template-columns:1fr 1.5fr;gap:60px;align-items:start;margin-top:40px}
    .form-contact-box{background:var(--blue);border-radius:var(--rl);padding:26px;color:#fff}
    .form-contact-box h4{font-family:var(--display);font-size:22px;font-weight:700;margin-bottom:8px}
    .form-contact-box p{font-size:15px;opacity:.85;margin-bottom:14px;line-height:1.6}
    .form-contact-box a{color:#fff;font-weight:700;font-size:21px}
    .form-box{background:#fff;border-radius:var(--rl);padding:34px;box-shadow:var(--shadow-md)}

    /* Form (hc-form namespace) */
    .hc-form .hf-group{margin-bottom:16px}
    .hc-form label{display:block;font-size:14px;font-weight:600;margin-bottom:6px;color:var(--text)}
    .hc-form .hf-opt{font-weight:400;color:var(--muted);font-size:.8rem;margin-left:4px}
    .hc-form input,.hc-form select,.hc-form textarea{
      width:100%;padding:11px 13px;font-family:var(--body);font-size:16px;color:var(--text);
      background:var(--bg-gray);border:1.5px solid var(--border);border-radius:var(--r);
      outline:none;appearance:none;-webkit-appearance:none;transition:border-color .15s,box-shadow .15s
    }
    .hc-form select{
      background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round' d='M6 8l4 4 4-4'/%3E%3C/svg%3E");
      background-repeat:no-repeat;background-position:right 10px center;background-size:20px;padding-right:34px;background-color:var(--bg-gray)
    }
    .hc-form input:focus,.hc-form select:focus,.hc-form textarea:focus{border-color:var(--blue);background:#fff;box-shadow:0 0 0 3px rgba(29,78,216,.08)}
    .hc-form textarea{resize:vertical;min-height:80px}
    .hc-form .hf-row-2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
    .hc-form .hf-chips{display:flex;gap:8px;flex-wrap:wrap}
    .hc-form .hf-chip-wrap{cursor:pointer;flex:1;min-width:90px}
    .hc-form .hf-chip-wrap input[type=radio]{display:none}
    .hc-form .hf-chip{border:1.5px solid var(--border);border-radius:var(--r);padding:10px;text-align:center;font-size:.875rem;font-weight:500;background:var(--bg-gray);color:var(--muted);transition:all .15s;display:block}
    .hc-form .hf-chip-wrap input[type=radio]:checked + .hf-chip{border-color:var(--blue);background:var(--blue-light);color:var(--blue);font-weight:600}
    .hc-form .hf-consent{display:flex;align-items:flex-start;gap:10px;margin:8px 0 4px}
    .hc-form .hf-consent input[type=checkbox]{width:18px;height:18px;flex-shrink:0;margin-top:2px;accent-color:var(--blue);cursor:pointer}
    .hc-form .hf-consent p{font-size:.78rem;color:var(--muted);line-height:1.5}
    .hc-form .hf-consent a{color:var(--blue);text-decoration:underline}
    .hc-form .hf-submit{width:100%;padding:15px;background:var(--blue);color:#fff;border:none;border-radius:var(--r);font-size:16px;font-weight:700;cursor:pointer;margin-top:20px;transition:all .2s;font-family:var(--body)}
    .hc-form .hf-submit:hover{background:var(--blue-dark);transform:translateY(-1px);box-shadow:var(--shadow-md)}
    .hc-form .hf-submit:disabled{background:#9ca3af;cursor:not-allowed;transform:none;box-shadow:none}
    .hc-form .hf-msg{margin-top:14px;padding:13px 16px;border-radius:var(--r);font-size:.9rem;font-weight:500;display:none}
    .hc-form .hf-msg.hf-success{display:block;background:#f0fdf4;border:1px solid #bbf7d0;color:#15803d}
    .hc-form .hf-msg.hf-error{display:block;background:#fef2f2;border:1px solid #fecaca;color:#dc2626}

    /* CTA */
    .cta{background:var(--bg-dark);color:#fff;padding:80px 0;text-align:center;position:relative;overflow:hidden}
    .cta::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at 50% 50%,rgba(29,78,216,.32) 0%,transparent 70%);pointer-events:none}
    .cta .container{position:relative;z-index:1}
    .cta h2{font-family:var(--display);font-size:clamp(30px,5vw,54px);font-weight:800;margin-bottom:14px;line-height:1.08}
    .cta p{font-size:18px;color:rgba(255,255,255,.72);max-width:500px;margin:0 auto 36px;line-height:1.7}
    .cta .btn-group{justify-content:center}

    /* Footer */
    .footer{background:#0a0f1e;color:rgba(255,255,255,.55);padding:48px 0 24px}
    .footer-inner{display:grid;grid-template-columns:2fr 1fr;gap:48px;margin-bottom:36px}
    .footer-brand h3{font-family:var(--display);font-size:21px;font-weight:700;color:#fff;margin-bottom:3px}
    .footer-brand .sub{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.35);margin-bottom:12px}
    .footer-brand p{font-size:14px;line-height:1.7;max-width:280px}
    .footer-contact{margin-top:18px}
    .footer-contact a{display:block;font-size:15px;font-weight:600;color:#60a5fa;margin-bottom:5px}
    .footer-col h4{font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.4);margin-bottom:14px}
    .footer-col li{margin-bottom:9px}
    .footer-col li a{font-size:14px;color:rgba(255,255,255,.55);transition:color .15s}
    .footer-col li a:hover{color:#fff}
    .footer-bottom{border-top:1px solid rgba(255,255,255,.08);padding-top:22px;display:flex;justify-content:space-between;align-items:center;font-size:13px;flex-wrap:wrap;gap:8px}
    .footer-bottom a{color:#60a5fa}

    /* Responsive */
    @media(max-width:768px){
      .section{padding:56px 0}
      .nav-links,.nav-right{display:none}
      .nav-toggle{display:flex}
      .hero{padding:52px 0}
      .btn-group{flex-direction:column;width:100%}
      .btn-group .btn{width:100%;justify-content:center}
      .services-grid{grid-template-columns:1fr;gap:18px}
      .ig-grid{grid-template-columns:repeat(2,1fr)}
      .form-wrap{grid-template-columns:1fr;gap:28px}
      .form-box{padding:22px}
      .footer-inner{grid-template-columns:1fr;gap:28px}
      .footer-bottom{flex-direction:column;text-align:center}
    }
    @media(max-width:480px){
      .hc-form .hf-row-2{grid-template-columns:1fr}
      .booking-section{padding:48px 0}
    }
  </style>
</head>
<body>

<!-- NAV -->
<nav class="nav" id="top">
  <div class="container">
    <div class="nav-inner">
      <a href="#top" class="nav-logo">
        ${bizName}
        ${serviceArea ? `<small>Mobile Car Detailing &middot; ${escHtml(serviceArea)}</small>` : '<small>Mobile Car Detailing</small>'}
      </a>
      <ul class="nav-links">
        <li><a href="#services">Services</a></li>
        ${gallery.length ? '<li><a href="#gallery">Our Work</a></li>' : ''}
        <li><a href="#book">Book Appointment</a></li>
        ${instagram ? `<li><a href="${escHtml(instagram)}" target="_blank" rel="noopener">Instagram</a></li>` : ''}
      </ul>
      <div class="nav-right">
        ${phone ? `<a href="tel:${phoneBare}" class="nav-phone">${phoneFmt}</a>` : ''}
        <a href="#book" class="btn btn-primary" style="padding:10px 18px;font-size:14px">Book Now</a>
      </div>
      <button class="nav-toggle" id="navToggle" aria-label="Menu">
        <span></span><span></span><span></span>
      </button>
    </div>
  </div>
  <div class="nav-mobile" id="navMobile">
    <a href="#services">Services</a>
    ${gallery.length ? '<a href="#gallery">Our Work</a>' : ''}
    <a href="#book">Book Appointment</a>
    ${instagram ? `<a href="${escHtml(instagram)}" target="_blank" rel="noopener">Instagram</a>` : ''}
    <div class="mob-cta">
      ${phone ? `<a href="tel:${phoneBare}" class="btn btn-primary btn-full" style="justify-content:center">Call Now — ${phoneFmt}</a>` : ''}
      <a href="#book" class="btn btn-outline btn-full" style="justify-content:center">Book Appointment</a>
    </div>
  </div>
</nav>

<!-- HERO -->
<section class="hero">
  <div class="container">
    <div class="hero-inner">
      <div class="hero-badge">
        <span class="hero-dot"></span>
        ${badgeText}
      </div>
      <h1>${heroH1}</h1>
      <p class="hero-sub">Professional mobile car detailing — hand wash, full interior &amp; exterior detail, wax, polish, and more. All done at your location.</p>
      <div class="btn-group">
        ${phone ? `<a href="tel:${phoneBare}" class="btn btn-primary btn-lg">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.6 1.21h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.8a16 16 0 0 0 6.29 6.29l.95-.95a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
          Call Now
        </a>` : ''}
        <a href="#book" class="btn btn-outline-white btn-lg">Request an Appointment</a>
      </div>
      ${phone ? `<div class="hero-phone">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#60a5fa" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.6 1.21h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.8a16 16 0 0 0 6.29 6.29l.95-.95a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
        <a href="tel:${phoneBare}">${phoneFmt}</a>
      </div>` : ''}
    </div>
  </div>
</section>

<!-- TRUST BAR -->
<div class="trust-bar">
  <div class="container">
    <div class="trust-bar-inner">
      <div class="trust-item-bar"><span class="chk"></span> 100% Hand Wash</div>
      <div class="trust-item-bar"><span class="chk"></span> We Come to You</div>
      <div class="trust-item-bar"><span class="chk"></span> Interior &amp; Exterior</div>
      <div class="trust-item-bar"><span class="chk"></span> Wax &amp; Polish Available</div>
      ${serviceArea ? `<div class="trust-item-bar"><span class="chk"></span> ${escHtml(serviceArea)}</div>` : ''}
    </div>
  </div>
</div>

<!-- SERVICES -->
${svcs.length ? `
<section class="section section--gray" id="services">
  <div class="container">
    <p class="label">What We Offer</p>
    <h2 class="h2">Our Service Packages</h2>
    <p class="desc">Choose the package that fits your vehicle and budget. Not sure? Give us a call and we'll help you decide.</p>
    <div class="services-grid">
      ${serviceCards}
    </div>
  </div>
</section>` : ''}

<!-- GALLERY -->
${galleryHtml}

<!-- BOOKING FORM -->
<section class="booking-section" id="book">
  <div class="container">
    <p class="label">Schedule Your Detail</p>
    <h2 class="h2">Book an Appointment</h2>
    <p class="desc">Fill out the form and we'll confirm your booking. Have questions? Call us directly.</p>
    <div class="form-wrap">
      <div>
        ${phone ? `<div class="form-contact-box">
          <h4>Prefer to Call?</h4>
          <p>We're happy to answer any questions and book your appointment over the phone.</p>
          <a href="tel:${phoneBare}">${phoneFmt}</a>
        </div>` : ''}
      </div>
      <div class="form-box">
        ${formHtml}
      </div>
    </div>
  </div>
</section>

<!-- CTA -->
<section class="cta">
  <div class="container">
    <h2>Ready for a Fresh Detail?</h2>
    <p>Book online in minutes or give us a call. We serve ${serviceArea || 'your area'} and surrounding communities.</p>
    <div class="btn-group">
      ${phone ? `<a href="tel:${phoneBare}" class="btn btn-white btn-lg">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.6 1.21h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.8a16 16 0 0 0 6.29 6.29l.95-.95a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
        Call Now
      </a>` : ''}
      <a href="#book" class="btn btn-outline-white btn-lg">Book Online</a>
    </div>
  </div>
</section>

<!-- FOOTER -->
<footer class="footer">
  <div class="container">
    <div class="footer-inner">
      <div class="footer-brand">
        <h3>${bizName}</h3>
        <p class="sub">Mobile Car Detailing</p>
        <p>${tagline || 'Professional mobile car detailing — we come to you.'}</p>
        <div class="footer-contact">
          ${phone ? `<a href="tel:${phoneBare}">${phoneFmt}</a>` : ''}
          ${instagram ? `<a href="${escHtml(instagram)}" target="_blank" rel="noopener">Instagram</a>` : ''}
          ${facebook ? `<a href="${escHtml(facebook)}" target="_blank" rel="noopener">Facebook</a>` : ''}
        </div>
      </div>
      <div class="footer-col">
        <h4>Quick Links</h4>
        <ul>
          <li><a href="#services">Services</a></li>
          <li><a href="#book">Book Appointment</a></li>
          ${phone ? `<li><a href="tel:${phoneBare}">Call Now</a></li>` : ''}
        </ul>
      </div>
    </div>
    <div class="footer-bottom">
      <span>Powered by <a href="https://heyconnie.co" target="_blank" rel="noopener">Hey Connie</a> &mdash; AI Voice Receptionist for Mobile Detailers</span>
      <span><a href="https://heyconnie.co/privacy" target="_blank">Privacy</a> &middot; <a href="https://heyconnie.co/terms" target="_blank">Terms</a></span>
    </div>
  </div>
</footer>

<script>
(function(){
  const toggle = document.getElementById('navToggle')
  const mobile = document.getElementById('navMobile')
  if (toggle && mobile) {
    toggle.addEventListener('click', function() {
      mobile.classList.toggle('open')
    })
    mobile.querySelectorAll('a').forEach(function(a) {
      a.addEventListener('click', function() { mobile.classList.remove('open') })
    })
  }
})()
</script>

</body>
</html>`
}

module.exports = { renderBoldDark }
