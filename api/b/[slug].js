const { createClient } = require('@supabase/supabase-js')
const { renderBoldDark } = require('../../templates/bold-dark')

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

function render404() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Page Not Found — Hey Connie</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'DM Sans',system-ui,sans-serif;background:#0f172a;color:#f1f5f9;min-height:100vh;display:flex;align-items:center;justify-content:center;text-align:center;padding:24px}
    .card{background:#1e293b;border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:48px 32px;max-width:480px}
    h1{font-size:1.75rem;font-weight:700;margin-bottom:12px}
    p{color:#94a3b8;line-height:1.6;margin-bottom:24px}
    a{display:inline-block;background:#1d4ed8;color:#fff;border-radius:8px;padding:12px 24px;font-weight:600;text-decoration:none}
    a:hover{background:#1e40af}
    .logo{font-size:1.1rem;font-weight:700;color:#3b82f6;margin-bottom:32px}
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

function selectTemplate(business, services) {
  const template = business.website_template || 'bold-dark'
  if (template === 'bold-dark') return renderBoldDark({ business, services })
  // clean-pro added in Phase 6
  return renderBoldDark({ business, services })
}

module.exports = async function handler(req, res) {
  const slug = req.query.slug

  if (!slug) return res.status(404).send(render404())

  const { data: biz } = await supabase
    .from('businesses')
    .select('id,name,phone,email,instagram,facebook_url,tagline,owner_name,base_url,website_template,website_enabled,gallery_image_urls,hero_image_url')
    .eq('id', slug)
    .eq('website_enabled', true)
    .maybeSingle()

  if (!biz) return res.status(404).send(render404())

  const { data: services } = await supabase
    .from('services')
    .select('name,starting_price,duration_minutes,description')
    .eq('business_id', slug)
    .order('starting_price', { ascending: true })

  const html = selectTemplate(biz, services || [])

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300')
  return res.status(200).send(html)
}
