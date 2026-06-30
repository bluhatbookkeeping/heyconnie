const { escHtml } = require('./booking-form')

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
  const phoneNav   = phoneBare.length === 10 ? `${phoneBare.slice(0,3)}-${phoneBare.slice(3,6)}-${phoneBare.slice(6)}` : phoneFmt
  const instagram  = biz.instagram || ''
  const facebook   = biz.facebook_url || ''
  const slug       = biz.id
  const apiBase    = biz.base_url || 'https://heyconnie.co'
  const heroImg    = biz.hero_image_url || ''
  const gallery    = Array.isArray(biz.gallery_image_urls) ? biz.gallery_image_urls.filter(Boolean) : []
  const aboutImg   = (biz.features && biz.features.about_image_url) || ''

  const svcs = services || []
  const midIndex = Math.floor((svcs.length - 1) / 2)

  const SVC_DETAILS = {
    'Just a Wash': {
      desc: 'Best for customers who want a clean exterior without the full detail.',
      items: ['100% hand wash','Exterior rinse and foam wash','Wheel and tire cleaning','Hand dry','Tire shine','Light exterior wipe-down']
    },
    'Standard Detail': {
      desc: 'Best for regular maintenance and a deeper clean inside and out.',
      items: ['Everything in Just a Wash','Interior vacuum','Wipe down dashboard, doors & console','Window cleaning','Light interior cleaning','Wheel and tire detail','Exterior hand wash']
    },
    'Full Detail': {
      desc: 'Best for a deep clean inside and out. The complete package.',
      items: ['Everything in Standard Detail','Wax','Polish','Engine bay shampoo','Rug and carpet shampoo','Deep interior cleaning','Seat and floor cleaning','Door jamb cleaning','Detailed wheel cleaning','Full interior & exterior refresh']
    }
  }

  const serviceCards = svcs.map((s, i) => {
    const isFeatured = svcs.length > 1 && i === midIndex
    const icon = SVC_ICONS[i % SVC_ICONS.length]
    const details = SVC_DETAILS[s.name] || {}
    const desc = details.desc || s.description || ''
    const items = details.items || []
    const checkList = items.length ? `<ul class="svc-list">${items.map(it => `<li><span class="ck">✓</span>${escHtml(it)}</li>`).join('')}</ul>` : ''
    return `
      <div class="svc-card${isFeatured ? ' featured' : ''}">
        ${isFeatured ? '<div class="svc-badge">Most Popular</div>' : ''}
        <div class="svc-icon">${icon}</div>
        <div class="svc-name">${escHtml(s.name)}</div>
        <div class="svc-price">Starting at $${Number(s.starting_price).toFixed(0)}</div>
        ${desc ? `<div class="svc-desc">${escHtml(desc)}</div>` : ''}
        ${checkList}
        <div style="margin-top:auto;padding-top:22px">
          <a href="#book" class="btn ${isFeatured ? 'btn-primary' : 'btn-outline'} btn-full">Request This Service</a>
        </div>
      </div>`
  }).join('')

  const igHandle = instagram
    ? instagram.replace(/.*instagram\.com\/([^/?#]+).*/i, '$1').replace(/\/$/, '')
    : ''

  const galleryHtml = gallery.length ? `
  <section class="section" id="gallery">
    <div class="container" style="text-align:center">
      <p class="label">See Our Work</p>
      <h2 class="h2">Real Cars. Real Results.</h2>
      ${instagram && igHandle ? `<p style="font-size:15px;color:var(--muted);margin-bottom:8px;max-width:520px;margin-left:auto;margin-right:auto">Follow ${bizName} on Instagram to see recent details, before-and-after photos, and finished cars.</p><p class="ig-handle" style="margin-bottom:28px"><a href="${escHtml(instagram)}" target="_blank" rel="noopener" style="color:var(--blue)">@${escHtml(igHandle)}</a></p>` : igHandle ? `<p class="ig-handle">@${escHtml(igHandle)}</p>` : ''}
      <div class="ig-grid">
        ${gallery.map(url => {
          const inner = `<img src="${escHtml(url)}" alt="Detail work"><div class="ig-overlay"><span class="ig-overlay-txt">View on Instagram</span></div>`
          return instagram
            ? `<a class="ig-cell" href="${escHtml(instagram)}" target="_blank" rel="noopener">${inner}</a>`
            : `<div class="ig-cell">${inner}</div>`
        }).join('')}
      </div>
      ${instagram ? `<div style="text-align:center;margin-top:24px"><a href="${escHtml(instagram)}" target="_blank" rel="noopener" class="btn btn-primary btn-lg">See our Instagram @${escHtml(igHandle)}</a></div>` : ''}
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

  const SVC_SHORT_DESC = {
    'Just a Wash': 'Quick exterior hand wash and tire shine.',
    'Standard Detail': 'Interior and exterior clean, inside and out.',
    'Full Detail': 'The complete package — wax, polish, engine bay, carpet shampoo.'
  }
  const notSureCard = `<div class="book-svc-card" data-service="Not sure — help me choose" onclick="selectSvcA(this)"><div class="bsvc-name">Not sure</div><div class="bsvc-price">Help me choose</div><div class="bsvc-desc">Luis will recommend the right service for your vehicle.</div></div>`
  const svcBookCardsA = svcs.map(s => {
    const desc = SVC_SHORT_DESC[s.name] || ''
    return `<div class="book-svc-card" data-service="${escHtml(s.name)}" onclick="selectSvcA(this)"><div class="bsvc-name">${escHtml(s.name)}</div><div class="bsvc-price">Starting at $${Number(s.starting_price).toFixed(0)}</div>${desc ? `<div class="bsvc-desc">${escHtml(desc)}</div>` : ''}</div>`
  }).join('') + notSureCard
  const svcBookCardsB = svcs.map(s => {
    const desc = SVC_SHORT_DESC[s.name] || ''
    return `<div class="book-svc-card" data-service="${escHtml(s.name)}" onclick="selectSvcB(this)"><div class="bsvc-name">${escHtml(s.name)}</div><div class="bsvc-price">Starting at $${Number(s.starting_price).toFixed(0)}</div>${desc ? `<div class="bsvc-desc">${escHtml(desc)}</div>` : ''}</div>`
  }).join('') + `<div class="book-svc-card" data-service="Not sure — help me choose" onclick="selectSvcB(this)"><div class="bsvc-name">Not sure</div><div class="bsvc-price">Help me choose</div><div class="bsvc-desc">Luis will recommend the right service for your vehicle.</div></div>`

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
  <script>const SLUG='${slug}';const API_BASE='${apiBase}';</script>
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
    .svc-card{background:#fff;border:1px solid var(--border);border-radius:var(--rl);padding:30px;position:relative;transition:box-shadow .25s,transform .25s;display:flex;flex-direction:column}
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
    .ig-handle{font-size:16px;font-weight:600;margin-top:8px;color:var(--muted)}
    .ig-handle a,.ig-handle span{color:var(--blue)}

    /* Booking section */
    .booking-section{padding:80px 0;background:var(--bg-gray)}
    .booking-section .label{color:var(--blue)}
    .booking-section .h2{color:var(--text)}
    .booking-section .desc{color:var(--muted)}
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
    .hc-form .hf-consent{margin:8px 0 4px}
    .hc-form .hf-consent label{display:flex;align-items:flex-start;gap:10px;cursor:pointer;width:100%}
    .hc-form .hf-consent input[type=checkbox]{width:18px;height:18px;flex-shrink:0;margin-top:2px;accent-color:var(--blue);cursor:pointer;appearance:checkbox;-webkit-appearance:checkbox;background:none;border:none;padding:0}
    .hc-form .hf-consent span{font-size:.78rem;color:var(--muted);line-height:1.5;font-weight:400}
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

    /* Fade-up animation */
    .fu{opacity:0;transform:translateY(24px);transition:opacity .55s ease,transform .55s ease}
    .fu.vis{opacity:1;transform:none}

    /* About */
    .about-grid{display:grid;grid-template-columns:1fr 1fr;gap:64px;align-items:center}
    .about-stats{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:28px}
    .about-stat{background:var(--bg-gray);border-radius:var(--rl);padding:22px 20px}
    .about-stat-num{font-family:var(--display);font-size:34px;font-weight:700;color:var(--blue);line-height:1}
    .about-stat-lbl{font-size:13px;color:var(--muted);margin-top:4px}
    .about-img{background:var(--bg-gray);border-radius:var(--rl);aspect-ratio:4/3;overflow:hidden;display:flex;align-items:center;justify-content:center}
    .about-img img{width:100%;height:100%;object-fit:cover}

    /* Service checklists */
    .svc-list{margin:10px 0 14px}
    .svc-list li{display:flex;align-items:flex-start;gap:9px;font-size:14px;margin-bottom:7px;color:var(--text)}
    .svc-list li.dim{color:var(--muted)}
    .ck{width:18px;height:18px;border-radius:50%;background:var(--blue);color:#fff;display:inline-flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;flex-shrink:0;margin-top:1px}
    .ck-dim{background:var(--border);color:var(--muted)}

    /* Pricing */
    .pricing-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;margin-top:48px}
    .price-card{background:#fff;border:1px solid var(--border);border-radius:var(--rl);padding:32px 28px;text-align:center;transition:box-shadow .25s,transform .25s}
    .price-card:hover{box-shadow:var(--shadow-lg);transform:translateY(-4px)}
    .price-card.featured{border:2px solid var(--blue);background:var(--blue-light)}
    .price-name{font-family:var(--display);font-size:22px;font-weight:700;margin-bottom:8px}
    .price-amt{font-family:var(--display);font-size:48px;font-weight:800;color:var(--blue);line-height:1}
    .price-note{font-size:13px;color:var(--muted);margin-top:4px;margin-bottom:20px}
    .price-disclaimer{background:#fefce8;border:1px solid #fde68a;color:#92400e;font-size:14px;padding:14px 18px;border-radius:var(--r);margin-top:32px;line-height:1.6}

    /* Trust tiles */
    .trust-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:20px;margin-top:48px}
    .trust-tile{background:#fff;border:1px solid var(--border);border-radius:var(--rl);padding:24px 20px;text-align:center;transition:box-shadow .25s}
    .trust-tile:hover{box-shadow:var(--shadow-md)}
    .trust-tile-icon{font-size:28px;width:52px;height:52px;background:var(--blue-light);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 12px}
    .trust-tile-text{font-size:14px;font-weight:600;color:var(--text);line-height:1.4}

    /* Gallery overrides */
    .ig-cell{background:var(--bg-gray);border:1px solid var(--border)}
    .ig-overlay-txt{font-size:13px;font-weight:600}
    .ig-handle{font-size:17px}

    /* Button additions */
    .btn-white{background:#fff;color:var(--blue);border-color:#fff}
    .btn-white:hover{background:#eff6ff;transform:translateY(-1px)}

    /* Footer 3-col */
    .footer-inner{grid-template-columns:2fr 1fr 1fr}
    .footer-contact a{display:flex;align-items:center;gap:8px}

    /* Chat widget */
    #chatBubble{position:fixed;bottom:24px;right:24px;z-index:999;width:52px;height:52px;border-radius:50%;background:var(--blue);color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 4px 16px rgba(29,78,216,.4);border:none;transition:transform .2s}
    #chatBubble:hover{transform:scale(1.08)}
    #chatPanel{position:fixed;bottom:90px;right:24px;z-index:999;width:340px;max-height:520px;background:#fff;border-radius:var(--rl);box-shadow:0 8px 32px rgba(0,0,0,.18);display:none;flex-direction:column;overflow:hidden}
    #chatPanel.open{display:flex}
    .chat-header{background:var(--blue);color:#fff;padding:16px 18px;display:flex;align-items:center;gap:12px}
    .chat-header-avatar{width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.25);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0}
    .chat-header-name{font-weight:700;font-size:15px}
    .chat-header-status{font-size:12px;opacity:.8}
    #chatClose{margin-left:auto;background:none;border:none;color:#fff;cursor:pointer;padding:4px;opacity:.7}
    #chatClose:hover{opacity:1}
    #chatMessages{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px}
    .chat-msg{max-width:80%;padding:10px 13px;border-radius:12px;font-size:14px;line-height:1.5}
    .chat-msg.agent{background:var(--bg-gray);color:var(--text);align-self:flex-start;border-bottom-left-radius:3px}
    .chat-msg.user{background:var(--blue);color:#fff;align-self:flex-end;border-bottom-right-radius:3px}
    .chat-msg.typing{background:var(--bg-gray);color:var(--muted);font-style:italic}
    .chat-input-row{display:flex;gap:8px;padding:12px 14px;border-top:1px solid var(--border)}
    #chatInput{flex:1;padding:9px 12px;border:1.5px solid var(--border);border-radius:var(--r);font-family:var(--body);font-size:14px;outline:none}
    #chatInput:focus{border-color:var(--blue)}
    #chatSend{background:var(--blue);color:#fff;border:none;border-radius:var(--r);padding:9px 14px;cursor:pointer;font-weight:600;font-size:14px}
    #chatSend:hover{background:var(--blue-dark)}

    /* Multi-step booking form */
    .field-error{font-size:13px;color:#ef4444;margin-top:5px;min-height:18px}
    .book-svc-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:8px}
    .book-svc-card{padding:16px;border:1.5px solid var(--border);border-radius:var(--r);cursor:pointer;transition:border-color .15s,background .15s;background:#fff;user-select:none}
    .book-svc-card:hover{border-color:var(--blue);background:var(--blue-light)}
    .book-svc-card.selected{border-color:var(--blue);background:var(--blue-light);border-width:2px}
    .book-svc-card .bsvc-name{font-weight:700;font-size:15px}
    .book-svc-card .bsvc-price{font-size:13px;color:var(--blue);font-weight:600;margin-top:2px}
    .book-svc-card .bsvc-desc{font-size:13px;color:var(--muted);margin-top:4px;line-height:1.5}
    .pill-grid{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}
    .pill-btn{padding:9px 16px;font-family:var(--body);font-size:14px;font-weight:600;background:var(--bg-gray);border:1.5px solid var(--border);border-radius:20px;cursor:pointer;transition:all .15s;color:var(--text);line-height:1}
    .pill-btn:hover{border-color:var(--blue);background:var(--blue-light)}
    .pill-btn.selected{background:var(--blue);border-color:var(--blue);color:#fff}
    .collapse-link{font-size:14px;color:var(--blue);cursor:pointer;background:none;border:none;padding:0;font-family:var(--body);font-weight:500;display:inline-flex;align-items:center;gap:4px}
    .collapse-link:hover{text-decoration:underline}
    .summary-card{background:var(--bg-gray);border:1.5px solid var(--border);border-radius:var(--r);padding:14px 16px;margin-bottom:16px}
    .summary-row{display:flex;align-items:baseline;gap:8px;padding:6px 0;border-bottom:1px solid var(--border);font-size:14px}
    .summary-row:last-child{border-bottom:none}
    .summary-label{color:var(--muted);font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;min-width:72px;flex-shrink:0}
    .summary-val{flex:1;font-weight:500}
    .summary-edit-link{font-size:13px;color:var(--blue);cursor:pointer;margin-left:auto;white-space:nowrap;flex-shrink:0}
    .phone-confirmed{font-size:14px;color:var(--muted);margin-bottom:16px;padding:10px 13px;background:var(--bg-gray);border-radius:var(--r);border:1.5px solid var(--border)}
    .phone-confirmed span{color:var(--text);font-weight:600}
    .phone-confirmed a{color:var(--blue);font-size:13px;margin-left:8px}
    .step-progress{display:flex;align-items:center;margin-bottom:28px;gap:0}
    .step-item{display:flex;flex-direction:column;align-items:center;flex:1;position:relative}
    .step-item:not(:last-child)::after{content:'';position:absolute;top:16px;left:50%;width:100%;height:2px;background:var(--border);z-index:0}
    .step-item.done:not(:last-child)::after,.step-item.active:not(:last-child)::after{background:var(--blue)}
    .step-num{width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;background:var(--bg-gray);border:2px solid var(--border);color:var(--muted);position:relative;z-index:1;transition:all .25s}
    .step-item.active .step-num,.step-item.done .step-num{background:var(--blue);border-color:var(--blue);color:#fff}
    .step-label{font-size:11px;font-weight:600;color:var(--muted);margin-top:5px;letter-spacing:.04em;text-transform:uppercase;text-align:center}
    .step-item.active .step-label,.step-item.done .step-label{color:var(--blue)}
    .step-panel{display:none}
    .step-panel.active{display:block}
    .step-title{font-family:var(--display);font-size:20px;font-weight:700;margin-bottom:18px;padding-bottom:14px;border-bottom:1px solid var(--border)}
    .step-nav{display:flex;gap:10px;margin-top:20px}
    .step-nav .btn{flex:1}
    .slot-grid{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}
    .slot-btn{padding:9px 14px;font-family:var(--body);font-size:14px;font-weight:600;background:var(--bg-gray);border:1.5px solid var(--border);border-radius:var(--r);cursor:pointer;transition:all .15s;color:var(--text)}
    .slot-btn:hover{border-color:var(--blue);background:#fff}
    .slot-btn.selected{background:var(--blue);border-color:var(--blue);color:#fff}
    .slot-msg{font-size:14px;color:var(--muted);margin-top:8px}
    .cal-wrap{border:1.5px solid var(--border);border-radius:var(--r);overflow:hidden;background:#fff;user-select:none}
    .cal-header{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:var(--bg-gray);border-bottom:1px solid var(--border)}
    .cal-header button{background:none;border:none;cursor:pointer;font-size:18px;color:var(--text);padding:2px 8px;border-radius:4px;line-height:1}
    .cal-header button:hover{background:var(--border)}
    .cal-month{font-family:var(--body);font-weight:700;font-size:15px}
    .cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:0}
    .cal-dow{text-align:center;font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;padding:8px 0;background:var(--bg-gray);border-bottom:1px solid var(--border)}
    .cal-day{text-align:center;padding:9px 4px;font-size:14px;font-weight:500;cursor:pointer;transition:background .12s,color .12s;color:var(--text)}
    .cal-day:hover:not(.cal-off):not(.cal-past):not(.cal-empty){background:var(--blue-light);color:var(--blue)}
    .cal-day.cal-selected{background:var(--blue);color:#fff;border-radius:4px}
    .cal-day.cal-off,.cal-day.cal-past{color:#ccc;cursor:default;pointer-events:none}
    .cal-day.cal-empty{pointer-events:none}
    .cal-day.cal-today{font-weight:800;text-decoration:underline}
    .form-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
    .fg{display:flex;flex-direction:column;gap:5px}
    .fg.full{grid-column:1/-1}
    .fg label{font-size:14px;font-weight:600}
    .fg input,.fg select,.fg textarea{width:100%;padding:11px 13px;font-family:var(--body);font-size:16px;color:var(--text);background:var(--bg-gray);border:1.5px solid var(--border);border-radius:var(--r);outline:none;appearance:none;transition:border-color .15s,box-shadow .15s}
    .fg select{background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round' d='M6 8l4 4 4-4'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 10px center;background-size:20px;padding-right:34px}
    .fg input:focus,.fg select:focus,.fg textarea:focus{border-color:var(--blue);background:#fff;box-shadow:0 0 0 3px rgba(29,78,216,.08)}
    .fg textarea{resize:vertical;min-height:90px}
    .form-hint{font-size:13px;color:var(--muted);text-align:center;margin-top:10px}
    .form-success{display:none;text-align:center;padding:44px 28px}
    .form-success.show{display:block}
    .sms-consent-wrap{margin:14px 0 4px}
    .sms-consent-wrap label{display:flex;align-items:flex-start;gap:10px;cursor:pointer;width:100%}
    .sms-consent-wrap input[type=checkbox]{width:18px;height:18px;flex-shrink:0;margin-top:2px;accent-color:var(--blue);cursor:pointer;appearance:checkbox;-webkit-appearance:checkbox;background:none;border:none;padding:0}
    .sms-consent-wrap span{font-size:.78rem;color:var(--muted);line-height:1.5;font-weight:400}
    .sms-consent-wrap a{color:var(--blue);text-decoration:underline}

    /* Responsive */
    @media(max-width:1024px){
      .footer-inner{grid-template-columns:2fr 1fr}
      .footer-col:last-child{display:none}
      .trust-grid{grid-template-columns:repeat(2,1fr)}
      .pricing-grid{grid-template-columns:1fr 1fr}
      #chatPanel{width:calc(100vw - 48px)}
    }
    @media(max-width:768px){
      .section{padding:56px 0}
      .nav-links,.nav-right{display:none}
      .nav-toggle{display:flex}
      .hero{padding:52px 0}
      .btn-group{flex-direction:column;width:100%}
      .btn-group .btn{width:100%;justify-content:center}
      .about-grid{grid-template-columns:1fr}
      .about-img{display:none}
      .services-grid{grid-template-columns:1fr;gap:18px}
      .pricing-grid{grid-template-columns:1fr}
      .trust-grid{grid-template-columns:repeat(2,1fr)}
      .ig-grid{grid-template-columns:repeat(2,1fr)}
      .form-wrap{grid-template-columns:1fr;gap:28px}
      .form-box{padding:22px}
      .footer-inner{grid-template-columns:1fr;gap:28px}
      .footer-bottom{flex-direction:column;text-align:center}
    }
    @media(max-width:480px){
      .hc-form .hf-row-2{grid-template-columns:1fr}
      .booking-section{padding:48px 0}
      .trust-grid{grid-template-columns:1fr}
      .pricing-grid{grid-template-columns:1fr}
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
        <small>Mobile Car Detailing &middot; ${escHtml(serviceArea ? serviceArea.split(',')[0].trim() : 'Pasadena')}</small>
      </a>
      <ul class="nav-links">
        <li><a href="#services">Services</a></li>
        <li><a href="#pricing">Pricing</a></li>
        <li><a href="#book">Book Appointment</a></li>
        <li><a href="#book">Contact</a></li>
      </ul>
      <div class="nav-right">
        ${phone ? `<a href="tel:${phoneBare}" class="nav-phone">${phoneNav}</a>` : ''}
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
        <a href="#book" class="btn btn-outline-white btn-lg">Book an Appointment</a>
        ${instagram ? `<a href="${escHtml(instagram)}" target="_blank" rel="noopener" class="btn btn-outline-white btn-lg">
          <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
          See us on Instagram
        </a>` : ''}
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
    </div>
  </div>
</div>

<!-- ABOUT -->
<section class="section" id="about">
  <div class="container">
    <div class="about-grid">
      <div>
        <p class="label fu">About Luis Mobile Detail</p>
        <h2 class="h2 fu">Professional Detailing That Comes to You</h2>
        <p class="desc fu">Luis Mobile Detail brings professional car detailing directly to your home, office, or location. From a quick wash to a full interior and exterior detail, Luis takes pride in doing the job by hand and making every vehicle look its best.</p>
        <p class="desc fu" style="margin-top:14px">Based in Pasadena, we serve the entire San Gabriel Valley and surrounding Los Angeles area. No need to take your car anywhere — just schedule a time and we'll handle the rest.</p>
        <div class="about-stats">
          <div class="about-stat fu"><div class="about-stat-num">100%</div><div class="about-stat-lbl">Hand wash, every time</div></div>
          <div class="about-stat fu" style="transition-delay:.08s"><div class="about-stat-num">SGV</div><div class="about-stat-lbl">Local Pasadena based</div></div>
          <div class="about-stat fu" style="transition-delay:.16s"><div class="about-stat-num">3</div><div class="about-stat-lbl">Service packages</div></div>
          <div class="about-stat fu" style="transition-delay:.24s"><div class="about-stat-num">On-Site</div><div class="about-stat-lbl">We come to your location</div></div>
        </div>
      </div>
      <div class="about-img fu" style="${aboutImg ? 'background:none;padding:0;border-radius:var(--rl);overflow:hidden;border:none' : ''}">
        ${aboutImg ? `<img src="${escHtml(aboutImg)}" alt="${escHtml(bizName)} - professional car detailing" style="width:100%;height:100%;object-fit:cover;border-radius:var(--rl)">` : gallery.length ? `<img src="${escHtml(gallery[0])}" alt="${escHtml(bizName)}">` : ''}
      </div>
    </div>
  </div>
</section>

<!-- SERVICES -->
${svcs.length ? `
<section class="section section--gray" id="services">
  <div class="container">
    <p class="label">What We Offer</p>
    <h2 class="h2">Our Service Packages</h2>
    <p class="desc">Choose the package that fits your vehicle and budget. Not sure? Call Luis and he'll help you decide.</p>
    <div class="services-grid">
      ${serviceCards}
    </div>
  </div>
</section>` : ''}

<!-- PRICING -->
${svcs.length ? `
<section class="section" id="pricing">
  <div class="container">
    <p class="label fu">Pricing</p>
    <h2 class="h2 fu">Simple, Honest Pricing</h2>
    <p class="desc fu">Pricing depends on vehicle size, condition, and service requested.<br>Submit the form below or call Luis for an exact quote.</p>
    <div class="pricing-grid">
      ${svcs.map((s, i) => {
        const isFeatured = svcs.length > 1 && i === midIndex
        return `
        <div class="price-card${isFeatured ? ' featured' : ''} fu">
          <div class="price-name">${escHtml(s.name)}</div>
          <div class="price-amt">$${Number(s.starting_price).toFixed(0)}</div>
          <div class="price-note">Starting price &mdash; call for exact quote</div>
          <a href="#book" class="btn ${isFeatured ? 'btn-primary' : 'btn-outline'} btn-full">Book This</a>
        </div>`
      }).join('')}
    </div>
    <p class="price-disclaimer"><strong>Note:</strong> Larger vehicles, heavy dirt, pet hair, stains, or extra polishing may cost more. All prices are confirmed before any work begins. Call Luis at <a href="tel:${phoneBare}" style="font-weight:700;color:inherit">${phoneFmt}</a> or fill out the form below for a fast quote.</p>
    <div style="text-align:center;margin-top:36px">
      <p style="font-size:16px;color:var(--muted);margin-bottom:18px">Ready to get a quote for your vehicle?</p>
      <div class="btn-group" style="justify-content:center">
        <a href="tel:${phoneBare}" class="btn btn-primary">Call for a Quote</a>
        <a href="#book" class="btn btn-outline">Book an Appointment</a>
      </div>
    </div>
  </div>
</section>` : ''}

<!-- TRUST TILES -->
<section class="section section--gray">
  <div class="container">
    <p class="label fu">Why Choose Luis</p>
    <h2 class="h2 fu">What You Can Expect</h2>
    <div class="trust-grid">
      ${[
        {svg:`<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/></svg>`, text:'100% Hand Wash — Every Time'},
        {svg:`<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 0 1-2.827 0l-4.244-4.243a8 8 0 1 1 11.314 0z"/><path d="M15 11a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"/></svg>`, text:'Mobile Service — We Come to You'},
        {svg:`<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M7 15h2M11 15h6"/></svg>`, text:'Interior and Exterior Detailing'},
        {svg:`<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3l14 9-14 9V3z"/></svg>`, text:'Wax &amp; Polish Available'},
        {svg:`<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><circle cx="12" cy="12" r="3"/></svg>`, text:'Engine Bay Shampoo Available'},
        {svg:`<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M7 16a4 4 0 0 1-.88-7.903A5 5 0 1 1 15.9 6L16 6a5 5 0 0 1 1 9.9M9 19l3 3m0 0l3-3m-3 3V10"/></svg>`, text:'Rug &amp; Carpet Shampoo Available'},
        {svg:`<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M9 20l-5.447-2.724A1 1 0 0 1 3 16.382V5.618a1 1 0 0 1 1.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0 0 21 18.382V7.618a1 1 0 0 0-.553-.894L15 4m0 13V4m0 0L9 7"/></svg>`, text:'Local Pasadena &amp; San Gabriel Valley'},
        {svg:`<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>`, text:'Call or Request Online Anytime'}
      ].map(({svg, text}, i) =>
        `<div class="trust-tile fu" style="transition-delay:${i * 0.05}s"><div class="trust-tile-icon">${svg}</div><div class="trust-tile-text">${text}</div></div>`
      ).join('')}
    </div>
  </div>
</section>

<!-- GALLERY -->
${galleryHtml}

<!-- BOOKING FORM -->
<section class="section section--gray" id="book">
  <div class="container">
    <div class="form-wrap">
      <div>
        <p class="label">Book an Appointment</p>
        <h2 class="h2">Request Your Detail</h2>
        <p class="desc">Fill out the form and ${bizName} will follow up with pricing and availability based on your vehicle and the service you need.</p>
        ${phone ? `<div class="form-contact-box">
          <h4>Prefer to Call?</h4>
          <p>For faster service, call directly. We can answer questions, give you a price, and confirm availability right away.</p>
          <a href="tel:${phoneBare}"><svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:6px"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.6 1.21h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.8a16 16 0 0 0 6.29 6.29l.95-.95a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>${phoneNav}</a>
        </div>` : ''}
      </div>

      <div class="form-box">
        <div id="formContent">

          <!-- Phone Entry Screen -->
          <div id="phoneEntry" style="text-align:center;padding:10px 0 4px">
            <div class="step-title" style="border:none;padding-bottom:6px">Book Your Detail</div>
            <p style="font-size:15px;color:var(--muted);margin-bottom:22px;line-height:1.6">Enter your phone number to get started.<br>Booked with us before? We'll pull up your details.</p>
            <div class="fg" style="max-width:320px;margin:0 auto">
              <label for="entryPhone">Phone Number</label>
              <input type="tel" id="entryPhone" placeholder="(626) 555-1234" maxlength="14" autocomplete="tel" style="font-size:18px;text-align:center">
              <div id="entryPhoneErr" class="field-error"></div>
            </div>
            <div style="margin-top:18px;max-width:320px;margin-left:auto;margin-right:auto">
              <button type="button" id="entryBtn" class="btn btn-primary btn-lg" style="width:100%" onclick="submitPhone()">Get Started</button>
            </div>
            <div id="entryMsg" style="font-size:13px;color:var(--muted);margin-top:10px;min-height:20px"></div>
            <div class="sms-consent-wrap" style="max-width:320px;margin:14px auto 0;text-align:left">
              <label>
                <input type="checkbox" id="smsConsentPhone">
                <span>I agree to receive SMS text messages from Hey Connie about my appointment, booking confirmations, reminders, and scheduling updates. Message frequency varies. Message and data rates may apply. Reply HELP for help or STOP to cancel. Consent is not required to book. See <a href="/terms?b=${slug}">Terms</a> and <a href="/privacy?b=${slug}">Privacy Policy</a>.</span>
              </label>
            </div>
            ${phone ? `<p style="margin-top:16px;font-size:14px;color:var(--muted)">Or call us: <a href="tel:${phoneBare}" style="color:var(--blue);font-weight:600">${phoneNav}</a></p>` : ''}
          </div>

          <!-- Path A: Returning Customer -->
          <div id="pathA" style="display:none">
            <div class="step-title" id="pathATitle" style="padding-bottom:10px">Welcome back!</div>
            <p style="font-size:15px;color:var(--muted);margin-bottom:20px;line-height:1.6">Here's your info from last time. Confirm the details and pick a time.</p>
            <form id="formA" novalidate>
              <input type="hidden" id="aPhone" name="phone">
              <input type="hidden" id="aName" name="name">
              <input type="hidden" id="aEmail" name="email">
              <input type="hidden" id="aCity" name="city">
              <input type="hidden" id="aMake" name="make">
              <input type="hidden" id="aModelH" name="model">
              <input type="hidden" id="aYear" name="year">
              <input type="hidden" id="aService" name="service">

              <!-- Vehicle picker (shown when customer has 2+ vehicles) -->
              <div id="aVehiclePickerWrap" style="display:none;margin-bottom:20px">
                <div style="font-size:15px;font-weight:700;font-family:var(--display);margin-bottom:8px">Which vehicle?</div>
                <div id="aVehicleGrid" class="book-svc-grid"></div>
              </div>

              <!-- Service selection -->
              <div style="font-size:15px;font-weight:700;font-family:var(--display);margin-bottom:8px">Service</div>
              <div class="book-svc-grid" id="pathASvcGrid">
                ${svcBookCardsA}
              </div>
              <div id="pathASvcErr" class="field-error" style="margin-top:4px"></div>

              <!-- Summary card -->
              <div style="font-size:15px;font-weight:700;font-family:var(--display);margin:20px 0 8px">Your Details</div>
              <div class="summary-card">
                <div class="summary-row">
                  <span class="summary-label">Vehicle</span>
                  <span class="summary-val" id="aSummaryVehicle">—</span>
                  <span class="summary-edit-link" onclick="togglePathAEdit('vehicle')">Edit</span>
                </div>
                <div id="aEditVehicle" style="display:none;padding:10px 0 4px">
                  <div class="form-grid" style="grid-template-columns:1fr 1fr">
                    <div class="fg">
                      <label for="aEditMake">Make</label>
                      <select id="aEditMake"><option value="">Select make...</option></select>
                    </div>
                    <div class="fg">
                      <label for="aEditModel">Model</label>
                      <select id="aEditModel" disabled><option value="">Select make first...</option></select>
                    </div>
                    <div class="fg">
                      <label for="aEditYear">Year</label>
                      <input type="number" id="aEditYear" placeholder="e.g. 2020" min="1930" max="2027">
                    </div>
                  </div>
                </div>
                <div class="summary-row">
                  <span class="summary-label">Location</span>
                  <span class="summary-val" id="aSummaryCity">—</span>
                  <span class="summary-edit-link" onclick="togglePathAEdit('city')">Edit</span>
                </div>
                <div id="aEditCity" style="display:none;padding:10px 0 4px">
                  <div class="fg">
                    <label for="aEditCityInput">Service Location</label>
                    <input type="text" id="aEditCityInput" placeholder="Enter your address..." autocomplete="off">
                  </div>
                </div>
                <div class="summary-row">
                  <span class="summary-label">Phone</span>
                  <span class="summary-val" id="aSummaryPhone">—</span>
                  <span class="summary-edit-link" onclick="togglePathAEdit('phone')">Edit</span>
                </div>
                <div id="aEditPhone" style="display:none;padding:10px 0 4px">
                  <div class="fg">
                    <label for="aEditPhoneInput">Phone Number</label>
                    <input type="tel" id="aEditPhoneInput" placeholder="(415) 279-4984">
                  </div>
                </div>
                <div class="summary-row">
                  <span class="summary-label">Name</span>
                  <span class="summary-val" id="aSummaryName">—</span>
                  <span class="summary-edit-link" onclick="togglePathAEdit('name')">Edit</span>
                </div>
                <div id="aEditName" style="display:none;padding:10px 0 4px">
                  <div class="fg">
                    <label for="aEditNameInput">Full Name</label>
                    <input type="text" id="aEditNameInput" placeholder="Your full name">
                  </div>
                </div>
                <div class="summary-row">
                  <span class="summary-label">Email</span>
                  <span class="summary-val" id="aSummaryEmail">—</span>
                  <span class="summary-edit-link" onclick="togglePathAEdit('email')">Edit</span>
                </div>
                <div id="aEditEmail" style="display:none;padding:10px 0 4px">
                  <div class="fg">
                    <label for="aEditEmailInput">Email *</label>
                    <input type="email" id="aEditEmailInput" placeholder="you@email.com">
                  </div>
                </div>
              </div>

              <!-- Date + Slot picker -->
              <div class="fg full">
                <label>Preferred Date</label>
                <div class="cal-wrap" id="aCalWrap">
                  <div class="cal-header">
                    <button type="button" onclick="calNav('a',-1)">&#8592;</button>
                    <span class="cal-month" id="aCalMonth"></span>
                    <button type="button" onclick="calNav('a',1)">&#8594;</button>
                  </div>
                  <div class="cal-grid" id="aCalGrid"></div>
                </div>
                <input type="hidden" id="aDate" name="date">
                <div id="aDateDisplay" style="font-size:13px;color:var(--blue);font-weight:600;margin-top:6px;min-height:18px"></div>
              </div>
              <div class="fg full" id="aSlotWrap" style="display:none">
                <label>Available Times</label>
                <div class="slot-grid" id="aSlotGrid"></div>
                <p class="slot-msg" id="aSlotMsg"></p>
              </div>
              <input type="hidden" id="aStartDatetime" value="">

              <!-- Promo (collapsed) -->
              <button type="button" id="aPromoToggleBtn" class="collapse-link" onclick="toggleCollapse('aPromoWrap',this)" style="margin-top:12px">
                <span>+ Have a promo code?</span>
              </button>
              <div id="aPromoWrap" style="display:none;margin-top:10px">
                <div class="fg">
                  <div style="display:flex;gap:8px;align-items:flex-start">
                    <input type="text" id="aPromoCode" placeholder="Enter code" style="text-transform:uppercase;flex:1" autocomplete="off">
                    <button type="button" id="aPromoApplyBtn" class="btn btn-outline" style="white-space:nowrap;flex-shrink:0" onclick="applyPromoCode('A')">Apply</button>
                  </div>
                  <div id="aPromoMsg" style="font-size:13px;margin-top:6px"></div>
                </div>
              </div>

              <!-- Notes (collapsed) -->
              <button type="button" class="collapse-link" onclick="toggleCollapse('aNotesWrap',this)" style="margin-top:10px">
                <span>+ Add notes or special requests</span>
              </button>
              <div id="aNotesWrap" style="display:none;margin-top:10px">
                <div class="fg">
                  <textarea id="aNotes" name="notes" placeholder="Anything we should know..."></textarea>
                </div>
              </div>

              <!-- SMS consent -->
              <div class="sms-consent-wrap" style="margin-top:14px">
                <label>
                  <input type="checkbox" id="smsConsentA">
                  <span>I agree to receive SMS text messages from Hey Connie about my appointment, booking confirmations, reminders, and scheduling updates. Message frequency varies. Message and data rates may apply. Reply HELP for help or STOP to cancel. Consent is not required to book. See <a href="/terms?b=${slug}">Terms</a> and <a href="/privacy?b=${slug}">Privacy Policy</a>.</span>
                </label>
              </div>

              <div class="step-nav" style="margin-top:24px">
                <button type="submit" class="btn btn-primary btn-lg">Request Appointment</button>
              </div>
              <p class="form-hint" style="margin-top:12px">We'll confirm your appointment shortly. No commitment required.</p>
            </form>
          </div>

          <!-- Path B: New Customer (3-step) -->
          <div id="pathB" style="display:none">
            <div class="step-progress">
              <div class="step-item active" id="bsi1"><div class="step-num">1</div><div class="step-label">Service</div></div>
              <div class="step-item" id="bsi2"><div class="step-num">2</div><div class="step-label">When &amp; Who</div></div>
              <div class="step-item" id="bsi3"><div class="step-num">3</div><div class="step-label">Vehicle</div></div>
            </div>
            <form id="bookingForm" novalidate>
              <input type="hidden" id="bPhone" name="phone">

              <!-- Step B1: Service + condition pills + notes -->
              <div class="step-panel active" id="stepB1">
                <div class="step-title">What service do you need?</div>
                <div class="book-svc-grid">
                  ${svcBookCardsB}
                </div>
                <input type="hidden" id="bService" name="service">
                <div id="b1SvcErr" class="field-error" style="margin-top:8px"></div>
                <div style="margin-top:20px">
                  <label style="font-size:14px;font-weight:600;display:block;margin-bottom:4px">Anything we should know? <span style="font-weight:400;color:var(--muted)">(optional)</span></label>
                  <div class="pill-grid">
                    <button type="button" class="pill-btn" data-cond="Pet hair" onclick="toggleCondPill(this)">Pet hair</button>
                    <button type="button" class="pill-btn" data-cond="Stains" onclick="toggleCondPill(this)">Stains</button>
                    <button type="button" class="pill-btn" data-cond="Very dirty" onclick="toggleCondPill(this)">Very dirty</button>
                    <button type="button" class="pill-btn" data-cond="Odor/smoke" onclick="toggleCondPill(this)">Odor / smoke</button>
                    <button type="button" class="pill-btn" data-cond="Water spots" onclick="toggleCondPill(this)">Water spots</button>
                    <button type="button" class="pill-btn" data-cond="Tree sap/tar" onclick="toggleCondPill(this)">Tree sap / tar</button>
                    <button type="button" class="pill-btn" data-cond="Oxidized paint" onclick="toggleCondPill(this)">Oxidized paint</button>
                  </div>
                </div>
                <button type="button" class="collapse-link" onclick="toggleCollapse('b1NotesWrap',this)" style="margin-top:14px">
                  <span>+ Add notes or special requests</span>
                </button>
                <div id="b1NotesWrap" style="display:none;margin-top:10px">
                  <div class="fg">
                    <textarea id="bNotes" name="notes" placeholder="Anything else we should know..."></textarea>
                  </div>
                </div>
                <div class="step-nav">
                  <button type="button" class="btn btn-primary btn-lg" onclick="nextStepB(1)">Next — When &amp; Who</button>
                </div>
              </div>

              <!-- Step B2: Contact + Schedule -->
              <div class="step-panel" id="stepB2">
                <div class="step-title">When &amp; how do we reach you?</div>
                <div class="phone-confirmed" onclick="editEntryPhone(event)">
                  Phone: <span id="phoneConfirmedVal"></span> ✓<a href="#">Edit</a>
                </div>
                <div class="form-grid">
                  <div class="fg full">
                    <label for="bName">Full Name *</label>
                    <input type="text" id="bName" name="name" placeholder="Your full name" required>
                  </div>
                  <div class="fg full">
                    <label for="bEmail">Email Address *</label>
                    <input type="email" id="bEmail" name="email" placeholder="you@email.com">
                  </div>
                  <div class="fg full">
                    <label for="bCity">Service Location *</label>
                    <input type="text" id="bCity" name="city" placeholder="Enter your address..." required autocomplete="off">
                    <div style="font-size:12px;color:var(--muted);margin-top:4px">We come to you — enter your home, office, or wherever you want the detail done.</div>
                  </div>
                  <div class="fg full">
                    <label>Preferred Date</label>
                    <div class="cal-wrap" id="bCalWrap">
                      <div class="cal-header">
                        <button type="button" onclick="calNav('b',-1)">&#8592;</button>
                        <span class="cal-month" id="bCalMonth"></span>
                        <button type="button" onclick="calNav('b',1)">&#8594;</button>
                      </div>
                      <div class="cal-grid" id="bCalGrid"></div>
                    </div>
                    <input type="hidden" id="bDate" name="date">
                    <div id="bDateDisplay" style="font-size:13px;color:var(--blue);font-weight:600;margin-top:6px;min-height:18px"></div>
                  </div>
                  <div class="fg full" id="bSlotWrap" style="display:none">
                    <label>Available Times</label>
                    <div class="slot-grid" id="bSlotGrid"></div>
                    <p class="slot-msg" id="bSlotMsg"></p>
                  </div>
                  <input type="hidden" id="bStartDatetime" value="">
                </div>
                <div class="step-nav">
                  <button type="button" class="btn btn-outline btn-lg" onclick="prevStepB(2)">Back</button>
                  <button type="button" class="btn btn-primary btn-lg" onclick="nextStepB(2)">Next — Your Vehicle</button>
                </div>
              </div>

              <!-- Step B3: Vehicle + Promo + SMS consent -->
              <div class="step-panel" id="stepB3">
                <div class="step-title">Tell us about your vehicle</div>
                <div class="form-grid">
                  <div class="fg">
                    <label for="make">Vehicle Make *</label>
                    <select id="make" name="make" required><option value="">Select make...</option></select>
                  </div>
                  <div class="fg">
                    <label for="model">Vehicle Model *</label>
                    <select id="model" name="model" required disabled><option value="">Select make first...</option></select>
                  </div>
                  <div class="fg">
                    <label for="year">Vehicle Year *</label>
                    <input type="number" id="year" name="year" placeholder="e.g. 2020" min="1930" max="2027" required>
                  </div>
                </div>
                <button type="button" class="collapse-link" onclick="toggleCollapse('bPromoWrap',this)" style="margin-top:8px">
                  <span>+ Have a promo code?</span>
                </button>
                <div id="bPromoWrap" style="display:none;margin-top:10px">
                  <div class="fg">
                    <div style="display:flex;gap:8px;align-items:flex-start">
                      <input type="text" id="bPromoCode" placeholder="Enter code" style="text-transform:uppercase;flex:1" autocomplete="off">
                      <button type="button" id="bPromoApplyBtn" class="btn btn-outline" style="white-space:nowrap;flex-shrink:0" onclick="applyPromoCode('B')">Apply</button>
                    </div>
                    <div id="bPromoMsg" style="font-size:13px;margin-top:6px"></div>
                  </div>
                </div>
                <!-- SMS consent -->
                <div class="sms-consent-wrap" style="margin-top:14px">
                  <label>
                    <input type="checkbox" id="smsConsentB">
                    <span>I agree to receive SMS text messages from Hey Connie about my appointment, booking confirmations, reminders, and scheduling updates. Message frequency varies. Message and data rates may apply. Reply HELP for help or STOP to cancel. Consent is not required to book. See <a href="/terms?b=${slug}">Terms</a> and <a href="/privacy?b=${slug}">Privacy Policy</a>.</span>
                  </label>
                </div>
                <div class="step-nav">
                  <button type="button" class="btn btn-outline btn-lg" onclick="prevStepB(3)">Back</button>
                  <button type="submit" class="btn btn-primary btn-lg" id="bSubmitBtn">Request Appointment</button>
                </div>
                <p class="form-hint" style="margin-top:12px">We'll confirm your appointment shortly. No commitment required.</p>
              </div>
            </form>
          </div>

        </div>

        <!-- Success screen -->
        <div class="form-success" id="formSuccess">
          <div style="font-size:48px;margin-bottom:8px">✅</div>
          <h3 style="font-family:var(--display);font-size:28px;font-weight:700;margin-bottom:10px">Request Received!</h3>
          <p style="font-size:15px;color:var(--muted);line-height:1.7;max-width:380px;margin:0 auto 12px">${bizName} received your booking request and will confirm your appointment shortly.</p>
          <div id="successPricing" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px 20px;margin:16px 0;text-align:left;font-size:15px;line-height:1.7">
            <div style="font-weight:700;margin-bottom:10px;color:#15803d">Booking Summary</div>
            <div id="successPricingRows"></div>
            <div id="successPaymentNote" style="display:none;margin-top:8px;font-size:13px;color:#555">Payment accepted via <strong>cash or Zelle</strong> at time of service.</div>
          </div>
          ${phone ? `<p style="font-size:14px;color:var(--muted)">Questions? Call us at <a href="tel:${phoneBare}" style="color:var(--blue)">${phoneNav}</a>.</p>` : ''}
          <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin-top:8px">
            <button type="button" class="btn btn-outline btn-lg" onclick="addAnotherVehicle()">Add another vehicle?</button>
            <button type="button" class="btn btn-outline" onclick="resetBookingForm()">Start over</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- CTA -->
<section class="cta">
  <div class="container">
    <h2>Ready to Get Your Car<br>Looking Clean Again?</h2>
    <p>Book online in minutes or give us a call. We serve ${serviceArea || 'the San Gabriel Valley'} and surrounding communities.</p>
    <div class="btn-group">
      ${phone ? `<a href="tel:${phoneBare}" class="btn btn-white btn-lg">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.6 1.21h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.8a16 16 0 0 0 6.29 6.29l.95-.95a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
        Call Now
      </a>` : ''}
      <a href="#book" class="btn btn-outline-white btn-lg">Book Online</a>
      ${instagram ? `<a href="${escHtml(instagram)}" target="_blank" rel="noopener" class="btn btn-outline-white btn-lg">See Work on Instagram</a>` : ''}
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
          ${phone ? `<a href="tel:${phoneBare}"><svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.6 1.21h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.8a16 16 0 0 0 6.29 6.29l.95-.95a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>${phoneFmt}</a>` : ''}
          ${instagram ? `<a href="${escHtml(instagram)}" target="_blank" rel="noopener"><svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>@${escHtml(igHandle)}</a>` : ''}
          ${facebook ? `<a href="${escHtml(facebook)}" target="_blank" rel="noopener">Facebook</a>` : ''}
        </div>
      </div>
      <div class="footer-col">
        <h4>Services</h4>
        <ul>
          ${svcs.map(s => `<li><a href="#services">${escHtml(s.name)}</a></li>`).join('')}
          <li><a href="#book">View Pricing</a></li>
        </ul>
      </div>
      <div class="footer-col">
        <h4>Quick Links</h4>
        <ul>
          <li><a href="#about">About</a></li>
          <li><a href="#book">Book Appointment</a></li>
          ${phone ? `<li><a href="tel:${phoneBare}">Call Now</a></li>` : ''}
          ${instagram ? `<li><a href="${escHtml(instagram)}" target="_blank" rel="noopener">See us on Instagram</a></li>` : ''}
        </ul>
      </div>
    </div>
    <div class="footer-bottom">
      <span>&copy; ${bizName}${serviceArea ? ' &mdash; ' + escHtml(serviceArea) : ''}</span>
      <span>Powered by <a href="https://heyconnie.co" target="_blank" rel="noopener">Hey Connie</a></span>
    </div>
  </div>
</footer>

<!-- Chat widget HTML -->
<button id="chatBubble" aria-label="Chat with us">
  <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
</button>
<div id="chatPanel">
  <div class="chat-header">
    <div class="chat-header-avatar">👩</div>
    <div>
      <div class="chat-header-name">Connie</div>
      <div class="chat-header-status">AI Assistant &bull; Typically replies instantly</div>
    </div>
    <button id="chatClose" aria-label="Close chat">
      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
    </button>
  </div>
  <div id="chatMessages"></div>
  <div class="chat-input-row">
    <input id="chatInput" type="text" placeholder="Ask me anything…">
    <button id="chatSend">Send</button>
  </div>
</div>

<script>
(function(){
  // --- Nav ---
  var toggle = document.getElementById('navToggle')
  var mobile = document.getElementById('navMobile')
  if (toggle && mobile) {
    toggle.addEventListener('click', function(){ mobile.classList.toggle('open') })
    mobile.querySelectorAll('a').forEach(function(a){ a.addEventListener('click', function(){ mobile.classList.remove('open') }) })
  }

  // --- Fade-up ---
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(e){ if (e.isIntersecting){ e.target.classList.add('vis'); io.unobserve(e.target) } })
    }, { threshold: 0.12 })
    document.querySelectorAll('.fu').forEach(function(el){ io.observe(el) })
  } else {
    document.querySelectorAll('.fu').forEach(function(el){ el.classList.add('vis') })
  }

  // --- Booking form ---
  var CAR_DATA = {
    'Acura':['ILX','Integra','MDX','NSX','RDX','RLX','TL','TLX','TSX'],
    'Audi':['A3','A4','A5','A6','A7','A8','e-tron','Q3','Q4 e-tron','Q5','Q7','Q8','R8','RS3','RS5','RS6','RS7','S3','S4','S5','S6','S7','TT'],
    'BMW':['1 Series','2 Series','3 Series','4 Series','5 Series','6 Series','7 Series','8 Series','i3','i4','i7','iX','M2','M3','M4','M5','M8','X1','X2','X3','X4','X5','X6','X7','XM','Z4'],
    'Buick':['Enclave','Encore','Encore GX','Envision','LaCrosse','Regal'],
    'Cadillac':['CT4','CT5','Escalade','Escalade ESV','Lyriq','XT4','XT5','XT6'],
    'Chevrolet':['Blazer','Bolt EUV','Bolt EV','Camaro','Colorado','Corvette','Equinox','Express','Impala','Malibu','Silverado 1500','Silverado 2500HD','Silverado 3500HD','Suburban','Tahoe','Traverse','Trax'],
    'Chrysler':['300','Pacifica','Voyager'],
    'Dodge':['Challenger','Charger','Durango','Grand Caravan','Hornet','Journey','Ram 1500'],
    'Ford':['Bronco','Bronco Sport','Edge','Escape','Expedition','Explorer','F-150','F-250','F-350','Fusion','Maverick','Mustang','Mustang Mach-E','Ranger','Transit','Transit Connect'],
    'Genesis':['G70','G80','G90','GV70','GV80'],
    'GMC':['Acadia','Canyon','Envoy','Sierra 1500','Sierra 2500HD','Sierra 3500HD','Terrain','Yukon','Yukon XL'],
    'Honda':['Accord','Civic','CR-V','CR-Z','Element','Fit','HR-V','Insight','Odyssey','Passport','Pilot','Prologue','Ridgeline'],
    'Hyundai':['Elantra','Ioniq','Ioniq 5','Ioniq 6','Kona','Nexo','Palisade','Santa Cruz','Santa Fe','Sonata','Tucson','Venue'],
    'Infiniti':['Q50','Q60','QX50','QX55','QX60','QX80'],
    'Jaguar':['E-Pace','F-Pace','F-Type','I-Pace','XE','XF','XJ'],
    'Jeep':['Cherokee','Compass','Gladiator','Grand Cherokee','Grand Cherokee L','Grand Wagoneer','Renegade','Wagoneer','Wrangler'],
    'Kia':['Carnival','EV6','EV9','K5','Niro','Seltos','Sorento','Soul','Sportage','Stinger','Telluride'],
    'Land Rover':['Defender','Discovery','Discovery Sport','Range Rover','Range Rover Evoque','Range Rover Sport','Range Rover Velar'],
    'Lexus':['ES','GS','GX','IS','LC','LS','LX','NX','RX','RZ','UX'],
    'Lincoln':['Aviator','Corsair','MKZ','Nautilus','Navigator'],
    'Lucid':['Air'],
    'Mazda':['CX-30','CX-5','CX-50','CX-70','CX-90','Mazda2','Mazda3','Mazda6','MX-30','MX-5 Miata'],
    'Mercedes-Benz':['A-Class','C-Class','CLA','CLS','E-Class','EQB','EQE','EQS','G-Class','GLA','GLB','GLC','GLE','GLS','S-Class','SL','SLK','Sprinter'],
    'Mitsubishi':['Eclipse Cross','Mirage','Outlander','Outlander PHEV','Outlander Sport'],
    'Nissan':['Altima','Armada','Frontier','GT-R','Kicks','Leaf','Maxima','Murano','Pathfinder','Rogue','Rogue Sport','Sentra','Titan','Versa','Z'],
    'Porsche':['718 Boxster','718 Cayman','911','Cayenne','Macan','Panamera','Taycan'],
    'Ram':['1500','1500 Classic','2500','3500','ProMaster','ProMaster City'],
    'Rivian':['R1S','R1T','R2'],
    'Subaru':['Ascent','BRZ','Crosstrek','Forester','Impreza','Legacy','Outback','Solterra','WRX'],
    'Tesla':['Cybertruck','Model 3','Model S','Model X','Model Y'],
    'Toyota':['4Runner','86','Avalon','bZ4X','Camry','Corolla','Corolla Cross','Crown','GR86','GR Corolla','GR Supra','Highlander','Land Cruiser','Mirai','Prius','RAV4','RAV4 Prime','Sequoia','Sienna','Tacoma','Tundra','Venza'],
    'Volkswagen':['Arteon','Atlas','Atlas Cross Sport','Golf','GTI','ID.4','Jetta','Passat','Taos','Tiguan'],
    'Volvo':['C40 Recharge','S60','S90','V60','V90','XC40','XC60','XC90'],
    'Other':['Other']
  };

  var makeEl = document.getElementById('make');
  var modelEl = document.getElementById('model');

  Object.keys(CAR_DATA).sort().forEach(function(make) {
    var opt = document.createElement('option');
    opt.value = make; opt.textContent = make;
    makeEl.appendChild(opt);
  });

  makeEl.addEventListener('change', function() {
    var models = CAR_DATA[makeEl.value] || [];
    modelEl.innerHTML = '<option value="">Select model...</option>';
    models.forEach(function(m) {
      var opt = document.createElement('option');
      opt.value = m; opt.textContent = m;
      modelEl.appendChild(opt);
    });
    modelEl.disabled = models.length === 0;
    modelEl.style.borderColor = '';
  });

  var _entryPhone = '';
  var _validatedPromoA = null;
  var _validatedPromoB = null;
  var _lastSubmitPayload = null;
  var _urlPromo = new URLSearchParams(window.location.search).get('promo') || null;
  var _addingVehicle = false;
  var _smsConsentAt = null;

  var formContent = document.getElementById('formContent');
  var formSuccess = document.getElementById('formSuccess');

  var entryPhoneEl = document.getElementById('entryPhone');
  entryPhoneEl.addEventListener('input', function(e) {
    var digits = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
    var f = '';
    if (digits.length > 0) f = '(' + digits.slice(0, 3);
    if (digits.length >= 4) f += ') ' + digits.slice(3, 6);
    if (digits.length >= 7) f += '-' + digits.slice(6, 10);
    e.target.value = f;
    document.getElementById('entryPhoneErr').textContent = '';
  });
  entryPhoneEl.addEventListener('keydown', function(e) {
    if (e.key === 'Backspace' && entryPhoneEl.value.endsWith(') ')) {
      e.preventDefault();
      entryPhoneEl.value = entryPhoneEl.value.slice(0, -2);
    }
    if (e.key === 'Enter') { e.preventDefault(); submitPhone(); }
  });

  window.submitPhone = async function() {
    var raw = entryPhoneEl.value.replace(/[^0-9]/g, '');
    var errEl = document.getElementById('entryPhoneErr');
    var btn = document.getElementById('entryBtn');
    if (raw.length !== 10) {
      errEl.textContent = 'Please enter a valid 10-digit US phone number.';
      return;
    }
    _entryPhone = raw;
    errEl.textContent = '';
    if (document.getElementById('smsConsentPhone').checked) _smsConsentAt = new Date().toISOString();
    btn.disabled = true;
    btn.textContent = 'Checking…';

    var done = false;
    var timeout = setTimeout(function() {
      if (!done) { done = true; routeToPathB(); }
    }, 8000);

    try {
      var r = await fetch(API_BASE + '/api/lookup-customer?phone=' + raw + '&business=' + SLUG);
      var data = await r.json();
      if (done) return;
      done = true;
      clearTimeout(timeout);
      if (data.found) { routeToPathA(data); } else { routeToPathB(); }
    } catch(e) {
      if (!done) { done = true; clearTimeout(timeout); routeToPathB(); }
    }
  };

  function formatDisplayPhone(d) {
    return d.length === 10 ? '(' + d.slice(0,3) + ') ' + d.slice(3,6) + '-' + d.slice(6) : d;
  }

  function routeToPathA(data) {
    document.getElementById('phoneEntry').style.display = 'none';
    document.getElementById('pathA').style.display = 'block';
    formContent.scrollIntoView({ behavior: 'smooth', block: 'start' });

    var firstName = (data.name || '').split(' ')[0];
    document.getElementById('pathATitle').textContent = 'Welcome back, ' + firstName + '!';

    document.getElementById('aPhone').value  = '+1' + _entryPhone;
    document.getElementById('aName').value   = data.name  || '';
    document.getElementById('aEmail').value  = data.email || '';
    document.getElementById('aCity').value   = data.city  || '';
    document.getElementById('aMake').value   = data.make  || '';
    document.getElementById('aModelH').value = data.model || '';
    document.getElementById('aYear').value   = data.year  || '';

    document.getElementById('aSummaryName').textContent    = data.name  || '—';
    document.getElementById('aSummaryPhone').textContent   = formatDisplayPhone(_entryPhone);
    document.getElementById('aSummaryEmail').textContent   = data.email || 'Not provided';
    document.getElementById('aSummaryCity').textContent    = data.city  || '—';
    document.getElementById('aSummaryVehicle').textContent = [data.year, data.make, data.model].filter(Boolean).join(' ') || '—';

    var aMakeEl = document.getElementById('aEditMake');
    aMakeEl.innerHTML = '<option value="">Select make...</option>';
    Object.keys(CAR_DATA).sort().forEach(function(m) {
      var o = document.createElement('option');
      o.value = m; o.textContent = m;
      if (m === data.make) o.selected = true;
      aMakeEl.appendChild(o);
    });
    if (data.make) populateAEditModel(data.make, data.model);
    aMakeEl.addEventListener('change', function() { populateAEditModel(this.value, null); });

    if (data.last_service) {
      document.querySelectorAll('#pathASvcGrid .book-svc-card').forEach(function(card) {
        if (card.dataset.service === data.last_service) {
          card.classList.add('selected');
          document.getElementById('aService').value = data.last_service;
        }
      });
    }

    initAddressAutocomplete('aEditCityInput');

    var svc = new URLSearchParams(window.location.search).get('service');
    if (svc) {
      document.querySelectorAll('#pathASvcGrid .book-svc-card').forEach(function(card) {
        if (card.dataset.service.toLowerCase().indexOf(svc.toLowerCase()) !== -1) card.click();
      });
    }

    renderVehicleGrid(data.all_vehicles || [], '+1' + _entryPhone);

    var rewardBanner = document.getElementById('aRewardBanner');
    if (rewardBanner) rewardBanner.remove();
    var codes = data.reward_codes || [];
    if (codes.length) {
      var rc = codes[0];
      var banner = document.createElement('div');
      banner.id = 'aRewardBanner';
      banner.style.cssText = 'background:#f3e8ff;border:2px solid #7c3aed;border-radius:10px;padding:14px 16px;margin:16px 0;display:flex;align-items:center;gap:12px;flex-wrap:wrap';
      banner.innerHTML =
        '<div style="flex:1;min-width:0">' +
          '<div style="font-weight:700;color:#6d28d9;font-size:15px">You have a reward ready!</div>' +
          '<div style="color:#4c1d95;font-size:13px;margin-top:2px">' + rc.reward_description + '</div>' +
          '<div style="font-family:monospace;font-size:17px;font-weight:700;color:#7c3aed;letter-spacing:2px;margin-top:4px">' + rc.code + '</div>' +
        '</div>' +
        '<button type="button" id="aApplyRewardBtn" style="background:#7c3aed;color:#fff;border:none;border-radius:8px;padding:10px 18px;font-weight:700;cursor:pointer;white-space:nowrap;font-size:14px">Apply Reward</button>';
      var promoToggle = document.getElementById('aPromoToggleBtn');
      if (promoToggle) promoToggle.parentNode.insertBefore(banner, promoToggle);
      document.getElementById('aApplyRewardBtn').addEventListener('click', function() {
        document.getElementById('aPromoCode').value = rc.code;
        applyPromoCode('A');
      });
    }

    if (_urlPromo) {
      document.getElementById('aPromoCode').value = _urlPromo;
      applyPromoCode('A');
      _urlPromo = null;
    }
  }

  function selectSvcAByName(svcName) {
    document.querySelectorAll('#pathASvcGrid .book-svc-card').forEach(function(c) { c.classList.remove('selected'); });
    document.getElementById('aService').value = '';
    document.getElementById('pathASvcErr').textContent = '';
    if (!svcName) return;
    document.querySelectorAll('#pathASvcGrid .book-svc-card').forEach(function(card) {
      if (card.dataset.service === svcName) {
        card.classList.add('selected');
        document.getElementById('aService').value = svcName;
      }
    });
  }

  function renderVehicleGrid(vehicles, phone) {
    var wrap = document.getElementById('aVehiclePickerWrap');
    var grid = document.getElementById('aVehicleGrid');
    grid.innerHTML = '';

    if (vehicles.length <= 1) {
      wrap.style.display = 'none';
      return;
    }

    wrap.style.display = '';

    vehicles.forEach(function(v, i) {
      var card = document.createElement('div');
      card.className = 'book-svc-card' + (i === 0 ? ' selected' : '');
      card.style.position = 'relative';
      card.innerHTML =
        '<div class="bsvc-name">' + v.year + ' ' + v.make + '</div>' +
        '<div class="bsvc-price">' + v.model + '</div>' +
        '<button type="button" aria-label="Remove vehicle" style="position:absolute;top:6px;right:8px;background:none;border:none;cursor:pointer;font-size:16px;color:#9ca3af;line-height:1" data-vid="' + v.id + '">×</button>';

      card.addEventListener('click', function(e) {
        if (e.target.tagName === 'BUTTON') return;
        grid.querySelectorAll('.book-svc-card').forEach(function(c) { c.classList.remove('selected'); });
        card.classList.add('selected');
        document.getElementById('aMake').value   = v.make;
        document.getElementById('aModelH').value = v.model;
        document.getElementById('aYear').value   = v.year;
        document.getElementById('aSummaryVehicle').textContent = v.year + ' ' + v.make + ' ' + v.model;
        document.getElementById('aEditVehicle').style.display = 'none';
        selectSvcAByName(v.last_service || null);
      });

      card.querySelector('button').addEventListener('click', function(e) {
        e.stopPropagation();
        deleteVehicle(v.id, phone, vehicles);
      });

      grid.appendChild(card);

      if (i === 0) {
        document.getElementById('aMake').value   = v.make;
        document.getElementById('aModelH').value = v.model;
        document.getElementById('aYear').value   = v.year;
        document.getElementById('aSummaryVehicle').textContent = v.year + ' ' + v.make + ' ' + v.model;
        selectSvcAByName(v.last_service || null);
      }
    });

    var otherCard = document.createElement('div');
    otherCard.className = 'book-svc-card';
    otherCard.innerHTML = '<div class="bsvc-name">+ Different Vehicle</div><div class="bsvc-desc">Enter make, model &amp; year</div>';
    otherCard.addEventListener('click', function() {
      grid.querySelectorAll('.book-svc-card').forEach(function(c) { c.classList.remove('selected'); });
      otherCard.classList.add('selected');
      document.getElementById('aMake').value   = '';
      document.getElementById('aModelH').value = '';
      document.getElementById('aYear').value   = '';
      document.getElementById('aSummaryVehicle').textContent = '—';
      document.getElementById('aEditVehicle').style.display = 'block';
    });
    grid.appendChild(otherCard);
  }

  async function deleteVehicle(vehicleId, phone, currentVehicles) {
    var digits = phone.replace(/[^0-9]/g, '').slice(-10);
    try {
      var res = await fetch(API_BASE + '/api/admin/vehicles?id=' + encodeURIComponent(vehicleId) + '&phone=' + digits, { method: 'DELETE' });
      var data = await res.json();
      if (!res.ok) { alert(data.error || 'Could not remove vehicle. Please try again.'); return; }
      var remaining = data.all_vehicles || [];
      if (remaining.length === 0) {
        document.getElementById('aVehiclePickerWrap').style.display = 'none';
        document.getElementById('aMake').value   = '';
        document.getElementById('aModelH').value = '';
        document.getElementById('aYear').value   = '';
        document.getElementById('aSummaryVehicle').textContent = '—';
        document.getElementById('aEditVehicle').style.display = 'block';
      } else if (remaining.length === 1) {
        document.getElementById('aVehiclePickerWrap').style.display = 'none';
        var v = remaining[0];
        document.getElementById('aMake').value   = v.make;
        document.getElementById('aModelH').value = v.model;
        document.getElementById('aYear').value   = v.year;
        document.getElementById('aSummaryVehicle').textContent = v.year + ' ' + v.make + ' ' + v.model;
        document.getElementById('aEditVehicle').style.display = 'none';
      } else {
        renderVehicleGrid(remaining, phone);
      }
    } catch (err) {
      alert('Could not remove vehicle. Please try again.');
    }
  }

  function populateAEditModel(make, selected) {
    var el = document.getElementById('aEditModel');
    var models = CAR_DATA[make] || [];
    el.innerHTML = '<option value="">Select model...</option>';
    models.forEach(function(m) {
      var o = document.createElement('option');
      o.value = m; o.textContent = m;
      if (m === selected) o.selected = true;
      el.appendChild(o);
    });
    el.disabled = models.length === 0;
  }

  window.selectSvcA = function(card) {
    document.querySelectorAll('#pathASvcGrid .book-svc-card').forEach(function(c) { c.classList.remove('selected'); });
    card.classList.add('selected');
    document.getElementById('aService').value = card.dataset.service;
    document.getElementById('pathASvcErr').textContent = '';
  };

  window.togglePathAEdit = function(field) {
    var map = { vehicle: 'aEditVehicle', city: 'aEditCity', name: 'aEditName', email: 'aEditEmail', phone: 'aEditPhone' };
    var wrap = document.getElementById(map[field]);
    var open = wrap.style.display !== 'none';
    if (!open) {
      wrap.style.display = 'block';
      if (field === 'city')  document.getElementById('aEditCityInput').value = document.getElementById('aCity').value;
      if (field === 'name')  document.getElementById('aEditNameInput').value  = document.getElementById('aName').value;
      if (field === 'email') document.getElementById('aEditEmailInput').value = document.getElementById('aEmail').value;
      if (field === 'phone') document.getElementById('aEditPhoneInput').value = formatDisplayPhone(_entryPhone);
    } else {
      wrap.style.display = 'none';
      if (field === 'vehicle') {
        var m  = document.getElementById('aEditMake').value;
        var mo = document.getElementById('aEditModel').value;
        var y  = document.getElementById('aEditYear').value;
        if (m)  document.getElementById('aMake').value   = m;
        if (mo) document.getElementById('aModelH').value = mo;
        if (y)  document.getElementById('aYear').value   = y;
        document.getElementById('aSummaryVehicle').textContent = [y,m,mo].filter(Boolean).join(' ') || '—';
      }
      if (field === 'city') {
        var cv = document.getElementById('aEditCityInput').value;
        if (cv) { document.getElementById('aCity').value = cv; document.getElementById('aSummaryCity').textContent = cv; }
      }
      if (field === 'name') {
        var nv = document.getElementById('aEditNameInput').value;
        if (nv) { document.getElementById('aName').value = nv; document.getElementById('aSummaryName').textContent = nv; }
      }
      if (field === 'email') {
        var ev = document.getElementById('aEditEmailInput').value;
        document.getElementById('aEmail').value = ev;
        document.getElementById('aSummaryEmail').textContent = ev || 'Not provided';
      }
      if (field === 'phone') {
        var raw = document.getElementById('aEditPhoneInput').value.replace(/[^0-9]/g, '').slice(-10);
        if (raw.length === 10) {
          _entryPhone = raw;
          document.getElementById('aPhone').value = '+1' + raw;
          document.getElementById('aSummaryPhone').textContent = formatDisplayPhone(raw);
        }
      }
    }
  };

  document.getElementById('formA').addEventListener('submit', async function(e) {
    e.preventDefault();
    var service = document.getElementById('aService').value;
    if (!service) {
      document.getElementById('pathASvcErr').textContent = 'Please select a service.';
      document.getElementById('pathASvcGrid').scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    var submitBtn = e.target.querySelector('[type="submit"]');
    if (!document.getElementById('aEmail').value.trim()) {
      var emailEdit = document.getElementById('aEditEmail');
      if (emailEdit) emailEdit.style.display = 'block';
      var emailInput = document.getElementById('aEditEmailInput');
      if (emailInput) { emailInput.style.borderColor = '#ef4444'; emailInput.scrollIntoView({ behavior: 'smooth', block: 'center' }); emailInput.focus(); }
      return;
    }
    var vehicleEditEl = document.getElementById('aEditVehicle');
    if (vehicleEditEl && vehicleEditEl.style.display !== 'none') {
      var em = document.getElementById('aEditMake').value;
      var emo = document.getElementById('aEditModel').value;
      var ey = document.getElementById('aEditYear').value;
      if (em)  document.getElementById('aMake').value   = em;
      if (emo) document.getElementById('aModelH').value = emo;
      if (ey)  document.getElementById('aYear').value   = ey;
    }
    if (!document.getElementById('aMake').value || !document.getElementById('aModelH').value || !document.getElementById('aYear').value) {
      if (vehicleEditEl) { vehicleEditEl.style.display = 'block'; vehicleEditEl.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
      alert('Please complete your vehicle info (make, model, and year) before submitting.');
      return;
    }
    if (!document.getElementById('aStartDatetime').value) {
      var aDateEl = document.getElementById('aDate');
      if (!aDateEl.value) { var aCalEl = document.getElementById('aCalWrap'); aCalEl.style.outline = '2px solid #ef4444'; aCalEl.style.borderRadius = '8px'; aCalEl.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
      else { document.getElementById('aSlotWrap').scrollIntoView({ behavior: 'smooth', block: 'center' }); alert('Please select a time slot.'); }
      return;
    }
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending…';
    var payload = {
      business_id:    SLUG,
      phone:          document.getElementById('aPhone').value,
      name:           document.getElementById('aName').value,
      email:          document.getElementById('aEmail').value,
      city:           document.getElementById('aCity').value,
      make:           document.getElementById('aMake').value,
      model:          document.getElementById('aModelH').value,
      year:           document.getElementById('aYear').value,
      service:        service,
      notes:          document.getElementById('aNotes') ? document.getElementById('aNotes').value || null : null,
      start_datetime: document.getElementById('aStartDatetime').value || null,
      promo_code:     _validatedPromoA ? _validatedPromoA.code : null,
      sms_consent_at: document.getElementById('smsConsentA').checked ? new Date().toISOString() : _smsConsentAt
    };
    await submitBooking(payload, submitBtn);
  });

  function routeToPathB() {
    document.getElementById('phoneEntry').style.display = 'none';
    document.getElementById('pathB').style.display = 'block';
    document.getElementById('bPhone').value = '+1' + _entryPhone;
    document.getElementById('phoneConfirmedVal').textContent = formatDisplayPhone(_entryPhone);
    _addingVehicle = false;
    showStepB(1);
    formContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (_urlPromo) {
      document.getElementById('bPromoCode').value = _urlPromo;
      applyPromoCode('B');
      _urlPromo = null;
    }
    var svc = new URLSearchParams(window.location.search).get('service');
    if (svc) {
      document.querySelectorAll('#stepB1 .book-svc-card').forEach(function(card) {
        if (card.dataset.service.toLowerCase().indexOf(svc.toLowerCase()) !== -1) card.click();
      });
    }
  }

  window.editEntryPhone = function(e) {
    if (e) e.preventDefault();
    document.getElementById('pathA').style.display = 'none';
    document.getElementById('pathB').style.display = 'none';
    document.getElementById('phoneEntry').style.display = 'block';
    document.getElementById('entryBtn').disabled = false;
    document.getElementById('entryBtn').textContent = 'Get Started';
    document.getElementById('entryMsg').textContent = '';
  };

  window.selectSvcB = function(card) {
    document.querySelectorAll('#stepB1 .book-svc-card').forEach(function(c) { c.classList.remove('selected'); });
    card.classList.add('selected');
    document.getElementById('bService').value = card.dataset.service;
    document.getElementById('b1SvcErr').textContent = '';
  };

  function showStepB(n) {
    document.querySelectorAll('#pathB .step-panel').forEach(function(p) { p.classList.remove('active'); });
    document.getElementById('stepB' + n).classList.add('active');
    [1,2,3].forEach(function(i) {
      var si = document.getElementById('bsi' + i);
      si.classList.remove('active','done');
      if (i < n) si.classList.add('done');
      if (i === n) si.classList.add('active');
    });
    formContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (n === 2) initAddressAutocomplete('bCity');
  }

  function validateStepB(n) {
    if (n === 1) {
      if (!document.getElementById('bService').value) {
        document.getElementById('b1SvcErr').textContent = 'Please select a service.';
        document.getElementById('stepB1').scrollIntoView({ behavior: 'smooth', block: 'start' });
        return false;
      }
      return true;
    }
    if (n === 2) {
      var fields = [document.getElementById('bName'), document.getElementById('bEmail'), document.getElementById('bCity')];
      var ok = true;
      fields.forEach(function(f) {
        f.style.borderColor = '';
        if (!f.value.trim()) { f.style.borderColor = '#ef4444'; ok = false; }
      });
      if (!ok) {
        var first = fields.filter(function(f) { return !f.value.trim(); })[0];
        if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return ok;
    }
    if (n === 3) {
      var mEl = document.getElementById('make');
      var moEl = document.getElementById('model');
      var yEl = document.getElementById('year');
      var ok3 = true;
      [mEl, moEl].forEach(function(f) { f.style.borderColor = ''; if (!f.value.trim()) { f.style.borderColor = '#ef4444'; ok3 = false; } });
      yEl.style.borderColor = '';
      var yr = parseInt(yEl.value, 10);
      if (!yr || yr < 1980 || yr > 2027) { yEl.style.borderColor = '#ef4444'; ok3 = false; }
      if (!ok3) {
        var firstErr = [mEl, moEl, yEl].filter(function(f) { return f.style.borderColor === '#ef4444'; })[0];
        if (firstErr) firstErr.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return ok3;
    }
    return true;
  }

  window.nextStepB = function(current) {
    if (!validateStepB(current)) return;
    showStepB(current + 1);
  };

  window.prevStepB = function(current) {
    showStepB(current - 1);
  };

  document.getElementById('bookingForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    if (!validateStepB(3)) return;
    if (!document.getElementById('bStartDatetime').value) {
      var bDateEl = document.getElementById('bDate');
      if (!bDateEl.value) { var bCalEl = document.getElementById('bCalWrap'); bCalEl.style.outline = '2px solid #ef4444'; bCalEl.style.borderRadius = '8px'; bCalEl.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
      else { document.getElementById('bSlotWrap').scrollIntoView({ behavior: 'smooth', block: 'center' }); alert('Please select a time slot.'); }
      return;
    }
    var submitBtn = document.getElementById('bSubmitBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending…';
    var condition = Array.prototype.slice.call(document.querySelectorAll('#stepB1 .pill-btn.selected[data-cond]')).map(function(b){ return b.dataset.cond; });
    var payload = {
      business_id:    SLUG,
      phone:          document.getElementById('bPhone').value,
      name:           document.getElementById('bName').value,
      email:          document.getElementById('bEmail').value,
      city:           document.getElementById('bCity').value,
      make:           document.getElementById('make').value,
      model:          document.getElementById('model').value,
      year:           document.getElementById('year').value,
      service:        document.getElementById('bService').value,
      condition:      condition,
      notes:          document.getElementById('bNotes') ? document.getElementById('bNotes').value || null : null,
      start_datetime: document.getElementById('bStartDatetime').value || null,
      promo_code:     _validatedPromoB ? _validatedPromoB.code : null,
      sms_consent_at: document.getElementById('smsConsentB').checked ? new Date().toISOString() : _smsConsentAt
    };
    await submitBooking(payload, submitBtn);
  });

  async function submitBooking(payload, submitBtn) {
    _lastSubmitPayload = payload;
    try {
      var r = await fetch(API_BASE + '/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      var data = await r.json();
      if (r.status === 409) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Request Appointment';
        alert('That time slot was just booked by someone else. Please pick a different time.');
        return;
      }
      if (!r.ok) throw new Error(data.error || 'error');

      var rowsEl = document.getElementById('successPricingRows');
      var paymentEl = document.getElementById('successPaymentNote');
      var rows = '<div style="margin-bottom:10px;padding-bottom:10px;border-bottom:1px solid #bbf7d0">';
      rows += '<div><strong>' + payload.name + '</strong> &nbsp;&middot;&nbsp; ' + formatDisplayPhone(payload.phone.slice(-10)) + '</div>';
      if (payload.email) rows += '<div style="color:#555;font-size:13px">' + payload.email + '</div>';
      if (payload.make) rows += '<div style="margin-top:4px">' + payload.year + ' ' + payload.make + ' ' + payload.model + '</div>';
      if (payload.city) rows += '<div style="font-size:13px;color:#555">' + payload.city + '</div>';
      if (payload.start_datetime) rows += '<div style="font-size:13px;color:#555;margin-top:2px">Appointment: ' + new Date(payload.start_datetime).toLocaleString('en-US', { weekday:'short', month:'short', day:'numeric', hour:'numeric', minute:'2-digit', timeZone:'America/Los_Angeles' }) + '</div>';
      rows += '</div>';
      if (data.total != null) {
        if (data.discount > 0) {
          rows += '<div>' + payload.service + ': <strong>$' + data.base_price + '</strong></div>';
          rows += '<div>Promo <span style="font-family:monospace;font-weight:600">' + data.promo_code + '</span> (' + data.promo_label + '): <strong style="color:#16a34a">-$' + data.discount + '</strong></div>';
          rows += '<div style="border-top:1px solid #bbf7d0;margin-top:6px;padding-top:6px;font-size:16px">Total due: <strong>$' + data.total + '</strong></div>';
        } else {
          rows += '<div>' + payload.service + ': <strong>$' + data.total + '</strong></div>';
        }
        rows += '<div style="font-size:13px;color:#555;margin-top:4px">Final price may vary by vehicle size and condition.</div>';
        paymentEl.style.display = '';
      } else {
        rows += '<div style="font-size:13px;color:#555">' + payload.service + ' — pricing will be confirmed when we reach out.</div>';
      }
      rowsEl.innerHTML = rows;
      formContent.style.display = 'none';
      formSuccess.classList.add('show');
      formSuccess.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch(err) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Request Appointment';
      alert('Something went wrong. Please try again or call us directly.');
    }
  }

  window.addAnotherVehicle = function() {
    if (!_lastSubmitPayload) { resetBookingForm(); return; }
    formSuccess.classList.remove('show');
    formContent.style.display = '';
    document.getElementById('pathA').style.display = 'none';
    document.getElementById('phoneEntry').style.display = 'none';
    document.getElementById('pathB').style.display = 'block';
    document.getElementById('bookingForm').reset();
    document.getElementById('bPhone').value = _lastSubmitPayload.phone;
    document.getElementById('bName').value  = _lastSubmitPayload.name;
    document.getElementById('bEmail').value = _lastSubmitPayload.email || '';
    document.getElementById('bCity').value  = _lastSubmitPayload.city;
    document.getElementById('phoneConfirmedVal').textContent = formatDisplayPhone(_entryPhone);
    document.querySelectorAll('#stepB1 .book-svc-card').forEach(function(c){ c.classList.remove('selected'); });
    document.getElementById('bService').value = '';
    document.querySelectorAll('#stepB1 .pill-btn').forEach(function(p){ p.classList.remove('selected'); });
    document.getElementById('bDate').value = '';
    _calState.b.selected = null;
    renderCal('b');
    document.getElementById('bDateDisplay').textContent = '';
    document.getElementById('bSlotWrap').style.display = 'none';
    document.getElementById('bStartDatetime').value = '';
    _validatedPromoB = null;
    makeEl.value = '';
    modelEl.innerHTML = '<option value="">Select make first...</option>';
    modelEl.disabled = true;
    document.getElementById('year').value = '';
    _addingVehicle = true;
    showStepB(1);
    formContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  window.resetBookingForm = function() {
    formContent.style.display = '';
    formSuccess.classList.remove('show');
    document.getElementById('pathA').style.display = 'none';
    document.getElementById('pathB').style.display = 'none';
    document.getElementById('phoneEntry').style.display = 'block';
    document.getElementById('entryPhone').value = '';
    document.getElementById('entryBtn').disabled = false;
    document.getElementById('entryBtn').textContent = 'Get Started';
    document.getElementById('entryMsg').textContent = '';
    document.getElementById('entryPhoneErr').textContent = '';
    _entryPhone = '';
    _smsConsentAt = null;
    _validatedPromoA = null;
    _validatedPromoB = null;
    document.getElementById('aSlotWrap').style.display = 'none';
    document.getElementById('aStartDatetime').value = '';
    document.getElementById('bSlotWrap').style.display = 'none';
    document.getElementById('bStartDatetime').value = '';
    _lastSubmitPayload = null;
    _addingVehicle = false;
    document.getElementById('bookingForm').reset();
    modelEl.innerHTML = '<option value="">Select make first...</option>';
    modelEl.disabled = true;
    formContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  var _workingDays = null;

  (async function loadWorkingDays() {
    try {
      var res = await fetch(API_BASE + '/api/working-days?business=' + SLUG);
      var data = await res.json();
      _workingDays = new Set(data.days || []);
    } catch(e) {
      _workingDays = new Set([0,1,2,3,4,5,6]);
    }
    renderCal('a');
    renderCal('b');
  })();

  var _calState = {
    a: { year: null, month: null, selected: null },
    b: { year: null, month: null, selected: null }
  };

  (function initCalState() {
    var now = new Date();
    _calState.a.year = now.getFullYear();
    _calState.a.month = now.getMonth();
    _calState.b.year = now.getFullYear();
    _calState.b.month = now.getMonth();
  })();

  function renderCal(prefix) {
    var state = _calState[prefix];
    var monthEl = document.getElementById(prefix + 'CalMonth');
    var gridEl  = document.getElementById(prefix + 'CalGrid');
    if (!monthEl || !gridEl) return;

    var year = state.year, month = state.month;
    var now = new Date();
    var todayStr = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-' + String(now.getDate()).padStart(2,'0');

    monthEl.textContent = new Date(year, month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    var html = '<div class="cal-dow">Su</div><div class="cal-dow">Mo</div><div class="cal-dow">Tu</div><div class="cal-dow">We</div><div class="cal-dow">Th</div><div class="cal-dow">Fr</div><div class="cal-dow">Sa</div>';

    var firstDay = new Date(year, month, 1).getDay();
    var daysInMonth = new Date(year, month + 1, 0).getDate();

    for (var i = 0; i < firstDay; i++) {
      html += '<div class="cal-day cal-empty"></div>';
    }

    for (var d = 1; d <= daysInMonth; d++) {
      var dateStr = year + '-' + String(month+1).padStart(2,'0') + '-' + String(d).padStart(2,'0');
      var dow = new Date(year, month, d).getDay();
      var cls = 'cal-day';
      if (dateStr < todayStr) cls += ' cal-past';
      else if (_workingDays !== null && !_workingDays.has(dow)) cls += ' cal-off';
      if (dateStr === todayStr) cls += ' cal-today';
      if (state.selected === dateStr) cls += ' cal-selected';
      html += '<div class="' + cls + '" data-date="' + dateStr + '" onclick="calPickDay(\\'' + prefix + '\\',\\'' + dateStr + '\\',this)">' + d + '</div>';
    }

    gridEl.innerHTML = html;
  }

  window.calNav = function(prefix, dir) {
    var state = _calState[prefix];
    state.month += dir;
    if (state.month > 11) { state.month = 0; state.year++; }
    if (state.month < 0)  { state.month = 11; state.year--; }
    var now = new Date();
    if (state.year < now.getFullYear() || (state.year === now.getFullYear() && state.month < now.getMonth())) {
      state.month = now.getMonth(); state.year = now.getFullYear();
    }
    renderCal(prefix);
  };

  window.calPickDay = function(prefix, dateStr, el) {
    if (!el || el.classList.contains('cal-off') || el.classList.contains('cal-past')) return;
    _calState[prefix].selected = dateStr;
    renderCal(prefix);
    document.getElementById(prefix + 'Date').value = dateStr;
    var calWrap = document.getElementById(prefix + 'CalWrap');
    if (calWrap) calWrap.style.outline = '';
    var display = document.getElementById(prefix + 'DateDisplay');
    if (display) {
      var pd = new Date(dateStr + 'T12:00:00');
      display.textContent = pd.toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric' });
    }
    if (prefix === 'a') fetchSlotsA();
    else fetchSlotsB();
  };

  function renderSlots(slots, gridId, msgId, hiddenId) {
    var grid = document.getElementById(gridId);
    var msg  = document.getElementById(msgId);
    var hidden = document.getElementById(hiddenId);
    hidden.value = '';
    grid.innerHTML = '';
    if (!slots || slots.length === 0) {
      msg.textContent = 'No available times for this date. Try another day.';
      return;
    }
    msg.textContent = '';
    slots.forEach(function(iso) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'slot-btn';
      btn.textContent = new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Los_Angeles' });
      btn.addEventListener('click', function() {
        grid.querySelectorAll('.slot-btn').forEach(function(b){ b.classList.remove('selected'); });
        btn.classList.add('selected');
        hidden.value = iso;
      });
      grid.appendChild(btn);
    });
  }

  window.fetchSlotsA = async function() {
    var date = document.getElementById('aDate').value;
    var service = document.getElementById('aService').value;
    var wrap = document.getElementById('aSlotWrap');
    document.getElementById('aStartDatetime').value = '';
    if (!date) { wrap.style.display = 'none'; return; }
    wrap.style.display = 'block';
    document.getElementById('aSlotGrid').innerHTML = '<p class="slot-msg">Loading…</p>';
    document.getElementById('aSlotMsg').textContent = '';
    if (!service) { document.getElementById('aSlotGrid').innerHTML = ''; document.getElementById('aSlotMsg').textContent = 'Select a service above first.'; return; }
    var res = await fetch(API_BASE + '/api/slots?date=' + date + '&service=' + encodeURIComponent(service) + '&business=' + SLUG);
    var data = await res.json();
    renderSlots(data.slots, 'aSlotGrid', 'aSlotMsg', 'aStartDatetime');
  };

  window.fetchSlotsB = async function() {
    var date = document.getElementById('bDate').value;
    var service = document.getElementById('bService').value;
    var wrap = document.getElementById('bSlotWrap');
    document.getElementById('bStartDatetime').value = '';
    if (!date) { wrap.style.display = 'none'; return; }
    wrap.style.display = 'block';
    document.getElementById('bSlotGrid').innerHTML = '<p class="slot-msg">Loading…</p>';
    document.getElementById('bSlotMsg').textContent = '';
    if (!service) { document.getElementById('bSlotGrid').innerHTML = ''; document.getElementById('bSlotMsg').textContent = 'Select a service above first.'; return; }
    var res = await fetch(API_BASE + '/api/slots?date=' + date + '&service=' + encodeURIComponent(service) + '&business=' + SLUG);
    var data = await res.json();
    renderSlots(data.slots, 'bSlotGrid', 'bSlotMsg', 'bStartDatetime');
  };

  window.toggleCondPill = function(btn) { btn.classList.toggle('selected'); };

  window.toggleCollapse = function(id, btn) {
    var el = document.getElementById(id);
    var wasOpen = el.style.display !== 'none';
    el.style.display = wasOpen ? 'none' : 'block';
    var span = btn.querySelector('span');
    if (span) span.textContent = wasOpen
      ? span.textContent.replace('–', '+')
      : span.textContent.replace('+', '–');
  };

  document.querySelectorAll('#bookingForm input, #bookingForm select, #bookingForm textarea, #formA input, #formA select, #formA textarea').forEach(function(f) {
    f.addEventListener('input', function() { this.style.borderColor = ''; });
  });

  window.applyPromoCode = async function(path) {
    var codeEl   = document.getElementById(path === 'A' ? 'aPromoCode' : 'bPromoCode');
    var msgEl    = document.getElementById(path === 'A' ? 'aPromoMsg'  : 'bPromoMsg');
    var applyBtn = document.getElementById(path === 'A' ? 'aPromoApplyBtn' : 'bPromoApplyBtn');
    var code    = codeEl.value.trim().toUpperCase();
    var phone   = document.getElementById(path === 'A' ? 'aPhone'   : 'bPhone').value;
    var service = document.getElementById(path === 'A' ? 'aService' : 'bService').value;
    if (!code) { msgEl.innerHTML = ''; return; }
    applyBtn.disabled = true;
    applyBtn.textContent = 'Checking…';
    msgEl.innerHTML = '';
    try {
      var r = await fetch(API_BASE + '/api/voice/validate-promo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code, caller_phone: phone || '0000000000', business_id: SLUG, service: service }),
      });
      var data = await r.json();
      if (data.valid) {
        var promoObj = Object.assign({}, data, { code: code });
        if (path === 'A') _validatedPromoA = promoObj; else _validatedPromoB = promoObj;
        var label = data.discount_type === 'percent' ? data.discount_value + '% off' : '$' + data.discount_value + ' off';
        msgEl.innerHTML = '<span style="color:#16a34a;font-weight:600">✓ ' + code + ' — ' + label + ' applied</span>';
      } else {
        if (path === 'A') _validatedPromoA = null; else _validatedPromoB = null;
        msgEl.innerHTML = '<span style="color:#dc2626">' + (data.reason || "This code isn't valid. Check the code and try again.") + '</span>';
      }
    } catch(e) {
      msgEl.innerHTML = '<span style="color:#dc2626">Could not validate code. Try again.</span>';
    }
    applyBtn.disabled = false;
    applyBtn.textContent = 'Apply';
  };

  ['aPromoCode','bPromoCode'].forEach(function(id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', function() { this.value = this.value.toUpperCase().replace(/ /g,''); });
  });

  var _placesLoaded = false;
  var _placesQueue = [];

  function initAddressAutocomplete(fieldId) {
    var input = document.getElementById(fieldId);
    if (!input) return;
    if (_placesLoaded) { attachAutocomplete(input); return; }
    _placesQueue.push(input);
    if (_placesQueue.length > 1) return;
    fetch(API_BASE + '/api/maps-key').then(function(r){ return r.json(); }).then(function(d) {
      if (!d.mapsKey) return;
      window.__addressAutocompleteReady = function() {
        _placesLoaded = true;
        _placesQueue.forEach(function(el) { attachAutocomplete(el); });
        _placesQueue = [];
      };
      var script = document.createElement('script');
      script.src = 'https://maps.googleapis.com/maps/api/js?key=' + d.mapsKey + '&libraries=places&callback=__addressAutocompleteReady';
      script.async = true;
      document.head.appendChild(script);
    }).catch(function(){});
  }

  function attachAutocomplete(input) {
    if (input.dataset.acAttached) return;
    input.dataset.acAttached = '1';
    try {
      var ac = new google.maps.places.Autocomplete(input, {
        types: ['address'],
        componentRestrictions: { country: 'us' },
        fields: ['formatted_address'],
      });
      ac.addListener('place_changed', function() {
        var place = ac.getPlace();
        if (place.formatted_address) input.value = place.formatted_address;
      });
    } catch(e) {}
  }

  // --- Chat widget ---
  var bubble = document.getElementById('chatBubble')
  var panel = document.getElementById('chatPanel')
  var closeBtn = document.getElementById('chatClose')
  var chatInput = document.getElementById('chatInput')
  var chatSend = document.getElementById('chatSend')
  var chatMessages = document.getElementById('chatMessages')
  var chatOpen = false

  function addMsg(text, role){
    var el = document.createElement('div')
    el.className = 'chat-msg '+role
    el.textContent = text
    chatMessages.appendChild(el)
    chatMessages.scrollTop = chatMessages.scrollHeight
    return el
  }

  if (bubble) bubble.addEventListener('click', function(){
    chatOpen = !chatOpen
    panel.classList.toggle('open', chatOpen)
    if (chatOpen && !chatMessages.children.length) {
      addMsg("Hi! I'm Connie. How can I help you today?", 'agent')
    }
    if (chatOpen && chatInput) chatInput.focus()
  })

  if (closeBtn) closeBtn.addEventListener('click', function(){ chatOpen=false; panel.classList.remove('open') })

  function sendChat(){
    var text = chatInput ? chatInput.value.trim() : ''
    if (!text) return
    addMsg(text, 'user')
    chatInput.value = ''
    var typing = addMsg('Typing…', 'agent typing')
    fetch(API_BASE+'/api/chat', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ message: text, business_id: SLUG })
    })
    .then(function(r){ return r.json() })
    .then(function(d){
      typing.remove()
      addMsg(d.reply || d.message || 'Let me connect you with the team.', 'agent')
    })
    .catch(function(){ typing.remove(); addMsg('Sorry, something went wrong. Please call us directly.', 'agent') })
  }

  if (chatSend) chatSend.addEventListener('click', sendChat)
  if (chatInput) chatInput.addEventListener('keydown', function(e){ if (e.key==='Enter' && !e.shiftKey){ e.preventDefault(); sendChat() } })
})()
</script>

</body>
</html>`
}

module.exports = { renderBoldDark }
