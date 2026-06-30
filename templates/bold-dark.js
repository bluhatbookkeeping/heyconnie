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

  const svcOptions = svcs.map(s =>
    `<option value="${escHtml(s.name)}">${escHtml(s.name)} — Starting at $${Number(s.starting_price).toFixed(0)}</option>`
  ).join('')

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
        ${instagram ? `<li><a href="${escHtml(instagram)}" target="_blank" rel="noopener">See us on Instagram</a></li>` : ''}
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
    ${instagram ? `<a href="${escHtml(instagram)}" target="_blank" rel="noopener">See us on Instagram</a>` : ''}
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
      ${serviceArea ? `<div class="trust-item-bar"><span class="chk"></span> ${escHtml(serviceArea)}</div>` : ''}
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
<section class="booking-section" id="book">
  <div class="container">
    <p class="label">Book an Appointment</p>
    <div class="form-wrap">
      <div>
        <h2 class="h2" style="margin-bottom:14px">Request Your Detail</h2>
        <p class="desc" style="margin-bottom:28px">Fill out the form and Luis will follow up with pricing and availability based on your vehicle and the service you need.</p>
        ${phone ? `<div class="form-contact-box">
          <h4>Prefer to Call?</h4>
          <p>For faster service, call Luis directly. He can answer questions, give you a price, and confirm availability right away.</p>
          <a href="tel:${phoneBare}">☎ ${phoneNav}</a>
        </div>` : ''}
      </div>
      <div class="form-box" id="bookingBox">
        <!-- Screen: phone lookup -->
        <div id="scrPhone" style="text-align:center;max-width:380px;margin:0 auto">
          <h3 style="font-family:var(--display);font-size:22px;font-weight:700;margin-bottom:6px">Book Your Detail</h3>
          <p style="font-size:14px;color:var(--muted);margin-bottom:20px">Enter your phone number to get started.<br>Booked with us before? We'll pull up your details.</p>
          <div class="hc-form">
            <div class="hf-group">
              <label for="bkPhone" style="text-align:center">Phone Number</label>
              <input type="tel" id="bkPhone" placeholder="(626) 555-1234" maxlength="14" autocomplete="tel" style="text-align:center">
            </div>
            <button class="hf-submit" id="bkPhoneBtn" type="button">Get Started</button>
            <div class="hf-msg" id="bkPhoneMsg"></div>
            <div class="hf-consent" style="margin-top:14px">
              <label>
                <input type="checkbox" id="bkSmsConsentPhone">
                <span>I agree to receive SMS text messages from Hey Connie about my appointment, booking confirmations, reminders, and scheduling updates. Message frequency varies. Message and data rates may apply. Reply HELP for help or STOP to cancel. Consent is not required to book. See <a href="/terms?b=${slug}">Terms</a> and <a href="/privacy?b=${slug}">Privacy Policy</a>.</span>
              </label>
            </div>
            ${phone ? `<p style="margin-top:14px;font-size:13px;color:var(--muted);text-align:center">Or call us: <a href="tel:${phoneBare}" style="color:var(--blue);font-weight:600">${phoneNav}</a></p>` : ''}
          </div>
        </div>

        <!-- Screen: returning customer -->
        <div id="scrReturning" style="display:none">
          <p id="bkGreeting" style="font-size:15px;font-weight:600;margin-bottom:16px"></p>
          <div class="hc-form">
            <div class="hf-group">
              <label>Vehicle</label>
              <div id="bkVehicleDisplay" style="font-size:15px;color:var(--muted);margin-bottom:4px"></div>
            </div>
            <div class="hf-group">
              <label for="bkSvcReturn">Service</label>
              <select id="bkSvcReturn"><option value="">Choose a service…</option>${svcOptions}</select>
            </div>
            <div class="hf-group">
              <label for="bkDateReturn">Preferred Date</label>
              <input type="date" id="bkDateReturn">
            </div>
            <div id="bkSlotsReturn" style="display:none;margin-bottom:12px"></div>
            <div class="hf-group">
              <label for="bkPromoReturn">Promo Code <span class="hf-opt">(optional)</span></label>
              <input type="text" id="bkPromoReturn" placeholder="Enter code">
            </div>
            <div class="hf-group">
              <label for="bkNotesReturn">Notes <span class="hf-opt">(optional)</span></label>
              <textarea id="bkNotesReturn" placeholder="Gate code, parking notes, etc."></textarea>
            </div>
            <div class="hf-consent">
              <label>
                <input type="checkbox" id="bkSmsConsentReturn">
                <span>I agree to receive SMS text messages from Hey Connie about my appointment, booking confirmations, reminders, and scheduling updates. Message frequency varies. Message and data rates may apply. Reply HELP for help or STOP to cancel. Consent is not required to book. See <a href="/terms?b=${slug}">Terms</a> and <a href="/privacy?b=${slug}">Privacy Policy</a>.</span>
              </label>
            </div>
            <button class="hf-submit" id="bkReturnBtn" type="button">Confirm Booking</button>
            <div class="hf-msg" id="bkReturnMsg"></div>
            <p style="margin-top:12px;font-size:13px;color:var(--muted);text-align:center"><a href="#" id="bkNotMe" style="color:var(--blue)">Not me? Book as new customer →</a></p>
          </div>
        </div>

        <!-- Screen: new customer -->
        <div id="scrNew" style="display:none">
          <h3 style="font-family:var(--display);font-size:22px;font-weight:700;margin-bottom:16px">Book an Appointment</h3>
          <div class="hc-form">
            <div class="hf-group">
              <label for="bkSvcNew">Service</label>
              <select id="bkSvcNew"><option value="">Choose a service…</option>${svcOptions}</select>
            </div>
            <div class="hf-row-2">
              <div class="hf-group">
                <label for="bkName">Full Name</label>
                <input type="text" id="bkName" placeholder="Jane Smith" autocomplete="name">
              </div>
              <div class="hf-group">
                <label for="bkEmail">Email <span class="hf-opt">(optional)</span></label>
                <input type="email" id="bkEmail" placeholder="jane@email.com" autocomplete="email">
              </div>
            </div>
            <div class="hf-group">
              <label for="bkAddress">Service Address</label>
              <input type="text" id="bkAddress" placeholder="123 Main St, Pasadena, CA" autocomplete="street-address">
            </div>
            <div class="hf-row-2">
              <div class="hf-group">
                <label for="bkDateNew">Preferred Date</label>
                <input type="date" id="bkDateNew">
              </div>
              <div class="hf-group">
                <label for="bkTime">Preferred Time</label>
                <select id="bkTime">
                  <option value="morning">Morning (8am–12pm)</option>
                  <option value="afternoon">Afternoon (12pm–4pm)</option>
                  <option value="evening">Evening (4pm–7pm)</option>
                </select>
              </div>
            </div>
            <div class="hf-group">
              <label for="bkPromoNew">Promo Code <span class="hf-opt">(optional)</span></label>
              <input type="text" id="bkPromoNew" placeholder="Enter code">
            </div>
            <div class="hf-group">
              <label for="bkNotesNew">Notes <span class="hf-opt">(optional)</span></label>
              <textarea id="bkNotesNew" placeholder="Vehicle details, gate code, etc."></textarea>
            </div>
            <div class="hf-consent">
              <label>
                <input type="checkbox" id="bkSmsConsent">
                <span>I agree to receive SMS text messages from Hey Connie about my appointment, booking confirmations, reminders, and scheduling updates. Message frequency varies. Message and data rates may apply. Reply HELP for help or STOP to cancel. Consent is not required to book. See <a href="/terms?b=${slug}">Terms</a> and <a href="/privacy?b=${slug}">Privacy Policy</a>.</span>
              </label>
            </div>
            <button class="hf-submit" id="bkNewBtn" type="button">Book an Appointment</button>
            <div class="hf-msg" id="bkNewMsg"></div>
          </div>
        </div>

        <!-- Screen: success -->
        <div id="scrSuccess" style="display:none;text-align:center;padding:32px 16px">
          <div style="font-size:48px;margin-bottom:16px">✅</div>
          <h3 style="font-family:var(--display);font-size:26px;font-weight:700;margin-bottom:8px">You're Booked!</h3>
          <p style="color:var(--muted);font-size:15px" id="bkSuccessMsg"></p>
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
  var phoneVal = ''
  var customerData = null
  var smsConsentAt = null

  function show(id){ ['scrPhone','scrReturning','scrNew','scrSuccess'].forEach(function(s){ document.getElementById(s).style.display = s===id?'':'none' }) }
  function msg(id, text, isErr){ var el=document.getElementById(id); el.textContent=text; el.className='hf-msg '+(isErr?'hf-error':'hf-success') }

  // Phone input — format as (XXX) XXX-XXXX; restore cursor after value set to avoid position-0 reset
  var phoneInput = document.getElementById('bkPhone')
  if (phoneInput) {
    phoneInput.addEventListener('input', function(){
      var pos = this.selectionStart
      var oldLen = this.value.length
      var digits = this.value.replace(/[^0-9]/g,'').slice(0,10)
      var f = ''
      if (digits.length > 0) f = '(' + digits.slice(0,3)
      if (digits.length >= 4) f += ') ' + digits.slice(3,6)
      if (digits.length >= 7) f += '-' + digits.slice(6,10)
      if (this.value !== f) {
        this.value = f
        var newPos = pos + (f.length - oldLen)
        this.setSelectionRange(newPos, newPos)
      }
    })
  }

  // Phone lookup
  var phoneBtn = document.getElementById('bkPhoneBtn')
  if (phoneBtn) phoneBtn.addEventListener('click', function(){
    var raw = document.getElementById('bkPhone').value.replace(/[^0-9]/g,'')
    if (raw.length < 10) { msg('bkPhoneMsg','Please enter a valid phone number.',true); return }
    phoneVal = raw
    if (document.getElementById('bkSmsConsentPhone').checked) smsConsentAt = new Date().toISOString()
    phoneBtn.disabled = true; phoneBtn.textContent = 'Looking up…'
    fetch(API_BASE+'/api/lookup-customer?phone='+raw+'&business='+SLUG)
      .then(function(r){ return r.json() })
      .then(function(d){
        phoneBtn.disabled = false; phoneBtn.textContent = 'Continue'
        if (d.found && d.name) {
          customerData = d
          document.getElementById('bkGreeting').textContent = 'Welcome back, '+d.name+'! 👋'
          var veh = d.vehicles && d.vehicles[0]
          document.getElementById('bkVehicleDisplay').textContent = veh ? (veh.year+' '+veh.make+' '+veh.model) : 'No vehicle on file'
          show('scrReturning')
        } else {
          show('scrNew')
        }
      })
      .catch(function(){ phoneBtn.disabled=false; phoneBtn.textContent='Continue'; show('scrNew') })
  })

  // Not me
  var notMe = document.getElementById('bkNotMe')
  if (notMe) notMe.addEventListener('click', function(e){ e.preventDefault(); customerData=null; show('scrNew') })

  // Slot loader for returning customer
  var dateReturn = document.getElementById('bkDateReturn')
  if (dateReturn) dateReturn.addEventListener('change', function(){
    var svc = document.getElementById('bkSvcReturn').value
    var date = this.value
    if (!svc || !date) return
    var wrap = document.getElementById('bkSlotsReturn')
    wrap.style.display = ''; wrap.innerHTML = '<p style="font-size:13px;color:var(--muted)">Loading slots…</p>'
    fetch(API_BASE+'/api/slots?date='+date+'&service='+encodeURIComponent(svc)+'&business='+SLUG)
      .then(function(r){ return r.json() })
      .then(function(d){
        if (!d.slots || !d.slots.length){ wrap.innerHTML='<p style="font-size:13px;color:var(--muted)">No slots available — try another date.</p>'; return }
        wrap.innerHTML = '<div style="display:flex;flex-wrap:wrap;gap:8px">'+d.slots.map(function(s){
          return '<button type="button" class="slot-btn" data-slot="'+s+'" style="padding:7px 14px;border:1.5px solid var(--border);border-radius:var(--r);background:#fff;font-size:13px;font-weight:500;cursor:pointer">'+s+'</button>'
        }).join('')+'</div>'
        wrap.querySelectorAll('.slot-btn').forEach(function(btn){
          btn.addEventListener('click', function(){
            wrap.querySelectorAll('.slot-btn').forEach(function(b){ b.style.borderColor='var(--border)'; b.style.background='#fff' })
            btn.style.borderColor='var(--blue)'; btn.style.background='var(--blue-light)'
            wrap.dataset.selected = btn.dataset.slot
          })
        })
      })
      .catch(function(){ wrap.innerHTML='<p style="font-size:13px;color:var(--muted)">Could not load slots.</p>' })
  })

  // Returning customer submit
  var retBtn = document.getElementById('bkReturnBtn')
  if (retBtn) retBtn.addEventListener('click', function(){
    var svc = document.getElementById('bkSvcReturn').value
    var date = document.getElementById('bkDateReturn').value
    var slot = (document.getElementById('bkSlotsReturn')||{}).dataset && document.getElementById('bkSlotsReturn').dataset.selected
    if (!svc || !date) { msg('bkReturnMsg','Please choose a service and date.',true); return }
    retBtn.disabled=true; retBtn.textContent='Booking…'
    fetch(API_BASE+'/api/book', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        business_id: SLUG,
        phone: phoneVal,
        service: svc,
        preferred_date: date,
        preferred_time: slot || '',
        promo_code: document.getElementById('bkPromoReturn').value.trim(),
        notes: document.getElementById('bkNotesReturn').value.trim(),
        sms_consent_at: document.getElementById('bkSmsConsentReturn').checked ? new Date().toISOString() : smsConsentAt
      })
    })
    .then(function(r){ return r.json() })
    .then(function(d){
      retBtn.disabled=false; retBtn.textContent='Confirm Booking'
      if (d.success || d.booking_id) {
        document.getElementById('bkSuccessMsg').textContent = "We'll send you a confirmation shortly. See you on " + date + "!"
        show('scrSuccess')
      } else {
        msg('bkReturnMsg', d.error || 'Something went wrong. Please try again.', true)
      }
    })
    .catch(function(){ retBtn.disabled=false; retBtn.textContent='Confirm Booking'; msg('bkReturnMsg','Network error. Please try again.',true) })
  })

  // New customer submit
  var newBtn = document.getElementById('bkNewBtn')
  if (newBtn) newBtn.addEventListener('click', function(){
    var svc = document.getElementById('bkSvcNew').value
    var name = document.getElementById('bkName').value.trim()
    var address = document.getElementById('bkAddress').value.trim()
    var date = document.getElementById('bkDateNew').value
    if (!svc || !name || !address || !date) { msg('bkNewMsg','Please fill in all required fields.',true); return }
    var consent = document.getElementById('bkSmsConsent').checked
    newBtn.disabled=true; newBtn.textContent='Sending…'
    fetch(API_BASE+'/api/book', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        business_id: SLUG,
        phone: phoneVal,
        service: svc,
        name: name,
        email: document.getElementById('bkEmail').value.trim(),
        address: address,
        preferred_date: date,
        preferred_time: document.getElementById('bkTime').value,
        promo_code: document.getElementById('bkPromoNew').value.trim(),
        notes: document.getElementById('bkNotesNew').value.trim(),
        sms_consent_at: consent ? new Date().toISOString() : smsConsentAt
      })
    })
    .then(function(r){ return r.json() })
    .then(function(d){
      newBtn.disabled=false; newBtn.textContent='Book an Appointment'
      if (d.success || d.booking_id) {
        document.getElementById('bkSuccessMsg').textContent = "Request received! We'll confirm your " + date + " appointment shortly."
        show('scrSuccess')
      } else {
        msg('bkNewMsg', d.error || 'Something went wrong. Please try again.', true)
      }
    })
    .catch(function(){ newBtn.disabled=false; newBtn.textContent='Book an Appointment'; msg('bkNewMsg','Network error. Please try again.',true) })
  })

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
