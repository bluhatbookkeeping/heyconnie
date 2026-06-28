const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')

  const { cid, type } = req.query

  if (!cid || type !== 'loyalty') {
    res.setHeader('Content-Type', 'text/html')
    return res.status(400).send(page('Invalid unsubscribe link', 'This link appears to be invalid or expired.'))
  }

  await supabase
    .from('customers')
    .update({ loyalty_unsubscribed: true })
    .eq('id', cid)

  res.setHeader('Content-Type', 'text/html')
  return res.status(200).send(page(
    "You're unsubscribed",
    "You won't receive any more loyalty reward reminder emails from Luis Mobile Detail.<br><br>Your earned rewards are still valid — just enter your code when you book your next appointment."
  ))
}

function page(title, body) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title} — Luis Mobile Detail</title>
  <style>
    body { font-family: -apple-system, sans-serif; background: #f8f9fa; margin: 0; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .card { background: #fff; border-radius: 12px; padding: 40px 32px; max-width: 480px; width: 90%; text-align: center; box-shadow: 0 2px 16px rgba(0,0,0,.08); }
    h1 { color: #1a1a1a; font-size: 22px; margin: 0 0 12px; }
    p { color: #6b7280; font-size: 15px; line-height: 1.6; margin: 0 0 24px; }
    a { display: inline-block; background: #1d4ed8; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${title}</h1>
    <p>${body}</p>
    <a href="https://luis-mobile-detailing.vercel.app/#book">Book an Appointment</a>
  </div>
</body>
</html>`
}
