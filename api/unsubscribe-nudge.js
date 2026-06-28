const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Content-Type', 'text/html')

  const { bid } = req.query

  if (!bid) {
    return res.status(400).send(page(
      'Invalid link',
      'This unsubscribe link appears to be invalid or expired.'
    ))
  }

  const { error } = await supabase
    .from('businesses')
    .update({ activation_opted_out: true })
    .eq('id', bid)

  if (error) {
    console.error('[unsubscribe-nudge] update error:', error)
    return res.status(500).send(page('Something went wrong', 'Please try again or contact us at setup@heyconnie.co.'))
  }

  return res.status(200).send(page(
    "You're unsubscribed",
    "You won't receive any more follow-up emails from Hey Connie.<br><br>Your account is still active — call <strong>(818) 403-3447</strong> whenever you're ready to finish setting up your AI receptionist."
  ))
}

function page(title, body) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title} — Hey Connie</title>
  <style>
    body { font-family: -apple-system, sans-serif; background: #f4f4f2; margin: 0; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .card { background: #fff; border-radius: 12px; padding: 40px 32px; max-width: 480px; width: 90%; text-align: center; box-shadow: 0 2px 16px rgba(0,0,0,.08); }
    h1 { color: #0d0a0a; font-size: 22px; margin: 0 0 12px; }
    p { color: #6b7280; font-size: 15px; line-height: 1.6; margin: 0 0 24px; }
    a { display: inline-block; background: #f06071; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${title}</h1>
    <p>${body}</p>
    <a href="https://heyconnie.co">Back to Hey Connie</a>
  </div>
</body>
</html>`
}
