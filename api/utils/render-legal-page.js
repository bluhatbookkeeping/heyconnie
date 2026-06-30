// Renders a legal page (Terms/Privacy) with the detailer's nav header.
// biz: businesses row (or null for generic Hey Connie header)
// opts: { title, pageLabel, bodyHtml, footerLink }
function renderLegalPage(biz, opts) {
  const { title, pageLabel, bodyHtml, footerLink } = opts

  let navHtml
  if (biz) {
    const slug        = biz.id
    const bizName     = esc(biz.name || '')
    const serviceArea = biz.service_area ? esc(biz.service_area.split(',')[0].trim()) : 'Mobile Detailing'
    const phone       = biz.phone || ''
    const phoneBare   = phone.replace(/\D/g, '')
    const phoneFmt    = phone
    const instagram   = biz.instagram || ''
    const igHandle    = instagram
      ? instagram.replace(/.*instagram\.com\/([^/?#]+).*/i, '$1').replace(/\/$/, '')
      : ''

    navHtml = `
<nav class="nav" id="top">
  <div class="container">
    <div class="nav-inner">
      <a href="/${slug}#top" class="nav-logo">
        ${bizName}
        <small>Mobile Car Detailing &middot; ${serviceArea}</small>
      </a>
      <ul class="nav-links">
        <li><a href="/${slug}#services">Services</a></li>
        <li><a href="/${slug}#pricing">Pricing</a></li>
        <li><a href="/${slug}#book">Book Appointment</a></li>
        ${instagram ? `<li><a href="${esc(instagram)}" target="_blank" rel="noopener">Instagram</a></li>` : ''}
        <li><a href="/${slug}#book">Contact</a></li>
      </ul>
      <div class="nav-right">
        ${phone ? `<a href="tel:${phoneBare}" class="nav-phone">${phoneFmt}</a>` : ''}
        <a href="/${slug}#book" class="btn btn-primary" style="padding:10px 18px;font-size:14px">Book Now</a>
      </div>
      <button class="nav-toggle" id="navToggle" aria-label="Menu">
        <span></span><span></span><span></span>
      </button>
    </div>
  </div>
  <div class="nav-mobile" id="navMobile">
    <a href="/${slug}#services">Services</a>
    <a href="/${slug}#pricing">Pricing</a>
    <a href="/${slug}#book">Book Appointment</a>
    ${instagram ? `<a href="${esc(instagram)}" target="_blank" rel="noopener">Instagram</a>` : ''}
    <div class="mob-cta">
      ${phone ? `<a href="tel:${phoneBare}" class="btn btn-primary btn-full" style="justify-content:center">Call Now &mdash; ${phoneFmt}</a>` : ''}
      <a href="/${slug}#book" class="btn btn-outline btn-full" style="justify-content:center">Book Appointment</a>
    </div>
  </div>
</nav>`
  } else {
    navHtml = `
<nav class="nav" id="top">
  <div class="container">
    <div class="nav-inner">
      <a href="https://heyconnie.co" class="nav-logo">
        Hey Connie
        <small>AI Voice Receptionist for Mobile Detailers</small>
      </a>
      <div class="nav-right">
        <a href="https://heyconnie.co" class="btn btn-primary" style="padding:10px 18px;font-size:14px">Home</a>
      </div>
    </div>
  </div>
</nav>`
  }

  const navToggleScript = biz ? `
<script>
  document.getElementById('navToggle').addEventListener('click',function(){
    document.getElementById('navMobile').classList.toggle('open')
  })
</script>` : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(title)} — Hey Connie</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&display=swap" rel="stylesheet">
  <style>
    :root{--blue:#1d4ed8;--blue-dark:#1e3a8a;--text:#1a1a1a;--muted:#6b7280;--bg:#ffffff;--border:#e5e7eb;--display:'Barlow Condensed',sans-serif;--body:'DM Sans',sans-serif;--r:8px;--shadow:0 1px 3px rgba(0,0,0,.1);--shadow-md:0 4px 6px -1px rgba(0,0,0,.1);--max:1200px}
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    html{scroll-behavior:smooth}
    body{font-family:var(--body);color:var(--text);background:var(--bg);line-height:1.7;-webkit-font-smoothing:antialiased}
    a{color:#1d4ed8;text-decoration:underline}
    .container{width:100%;max-width:var(--max);margin:0 auto;padding:0 20px}
    .btn{display:inline-flex;align-items:center;justify-content:center;padding:14px 26px;font-family:var(--body);font-size:16px;font-weight:600;border-radius:var(--r);cursor:pointer;transition:all .2s;border:2px solid transparent;white-space:nowrap;text-decoration:none}
    .btn-primary{background:var(--blue);color:#fff;border-color:var(--blue)}
    .btn-primary:hover{background:var(--blue-dark);border-color:var(--blue-dark);transform:translateY(-1px);box-shadow:var(--shadow-md)}
    .btn-outline{background:transparent;color:var(--text);border-color:var(--border)}
    .btn-full{width:100%}
    .nav{position:sticky;top:0;z-index:100;background:#fff;border-bottom:1px solid var(--border);box-shadow:var(--shadow)}
    .nav-inner{display:flex;align-items:center;justify-content:space-between;height:64px}
    .nav-logo{font-family:var(--display);font-size:21px;font-weight:700;letter-spacing:.02em;line-height:1.2;color:var(--text);text-decoration:none}
    .nav-logo small{display:block;font-family:var(--body);font-size:11px;font-weight:500;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
    .nav-links{display:flex;align-items:center;gap:26px;list-style:none}
    .nav-links a{font-size:15px;font-weight:500;color:var(--muted);transition:color .15s;text-decoration:none}
    .nav-links a:hover{color:var(--blue)}
    .nav-right{display:flex;align-items:center;gap:12px}
    .nav-phone{font-size:15px;font-weight:700;color:var(--blue);text-decoration:none}
    .nav-toggle{display:none;flex-direction:column;gap:5px;cursor:pointer;padding:4px;background:none;border:none}
    .nav-toggle span{display:block;width:24px;height:2px;background:var(--text);transition:all .3s;border-radius:2px}
    .nav-mobile{display:none;background:#fff;border-bottom:1px solid var(--border);padding:20px}
    .nav-mobile.open{display:block}
    .nav-mobile a{display:block;padding:12px 0;font-size:17px;font-weight:500;border-bottom:1px solid var(--border);color:var(--text);text-decoration:none}
    .nav-mobile a:last-child{border-bottom:none}
    .mob-cta{margin-top:16px;display:flex;flex-direction:column;gap:10px}
    .legal{max-width:760px;margin:0 auto;padding:48px 24px 80px}
    .legal h1{font-family:var(--display);font-size:clamp(28px,5vw,42px);font-weight:800;margin-bottom:8px;color:var(--text)}
    .legal .meta{font-size:14px;color:var(--muted);margin-bottom:40px}
    .legal h2{font-size:20px;font-weight:700;margin:36px 0 12px;color:var(--text)}
    .legal p{margin-bottom:14px;font-size:15px;color:#374151}
    .legal ul{margin:0 0 14px 20px}
    .legal li{font-size:15px;color:#374151;margin-bottom:6px}
    .highlight{background:#eff6ff;border-left:4px solid var(--blue);padding:16px 20px;border-radius:0 8px 8px 0;margin:24px 0}
    .highlight p{margin:0;font-size:14px}
    footer{text-align:center;padding:24px;font-size:13px;color:#9ca3af;border-top:1px solid var(--border)}
    footer a{color:var(--blue)}
    @media(max-width:767px){
      .nav-links,.nav-right{display:none}
      .nav-toggle{display:flex}
    }
  </style>
</head>
<body>

${navHtml}

<div class="legal">
${bodyHtml}
</div>

<footer>
  &copy; 2026 Blu Hat Funding LLC, operating as Hey Connie. All rights reserved.
  &nbsp;&middot;&nbsp; ${footerLink}
</footer>

${navToggleScript}
</body>
</html>`
}

function esc(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

module.exports = { renderLegalPage }
