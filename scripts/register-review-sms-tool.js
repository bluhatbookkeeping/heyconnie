#!/usr/bin/env node
/**
 * One-time script: registers the send_review_sms tool in Vapi and attaches it
 * to the outbound assistant (VAPI_OUTBOUND_ASSISTANT_ID).
 *
 * Run once after deploying api/voice/send-review-sms.js:
 *   node scripts/register-review-sms-tool.js
 *
 * Reads from .env — make sure VAPI_API_KEY, VAPI_SECRET, and
 * VAPI_OUTBOUND_ASSISTANT_ID are set.
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })

const VAPI_API_KEY           = process.env.VAPI_API_KEY
const VAPI_SECRET            = process.env.VAPI_SECRET
const OUTBOUND_ASSISTANT_ID  = process.env.VAPI_OUTBOUND_ASSISTANT_ID
const BASE_URL               = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : 'https://luis-mobile-detailing.vercel.app'

if (!VAPI_API_KEY || !OUTBOUND_ASSISTANT_ID) {
  console.error('ERROR: VAPI_API_KEY and VAPI_OUTBOUND_ASSISTANT_ID must be set in .env')
  process.exit(1)
}

async function vapiRequest(method, path, body) {
  const res = await fetch(`https://api.vapi.ai${path}`, {
    method,
    headers: {
      'Authorization': `Bearer ${VAPI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await res.json()
  if (!res.ok) {
    console.error(`Vapi ${method} ${path} failed (${res.status}):`, JSON.stringify(json, null, 2))
    process.exit(1)
  }
  return json
}

async function main() {
  console.log(`\nRegistering send_review_sms tool for outbound assistant: ${OUTBOUND_ASSISTANT_ID}`)
  console.log(`Base URL: ${BASE_URL}\n`)

  // 1. Create the tool
  process.stdout.write('  Creating tool: send_review_sms ... ')
  const tool = await vapiRequest('POST', '/tool', {
    type: 'function',
    function: {
      name: 'send_review_sms',
      description: 'Sends the customer a text message with the review link(s) after they say yes on an outbound review request call.',
      parameters: {
        type: 'object',
        properties: {
          caller_phone: {
            type: 'string',
            description: 'The customer\'s phone number in E.164 format (e.g. +16264093147)',
          },
          name: {
            type: 'string',
            description: 'The customer\'s first name (optional)',
          },
        },
        required: ['caller_phone'],
      },
    },
    server: {
      url: `${BASE_URL}/api/voice/send-review-sms`,
      secret: VAPI_SECRET,
    },
  })
  console.log(`✓ ${tool.id}`)

  // 2. Fetch the current assistant to get existing toolIds
  process.stdout.write('  Fetching current assistant toolIds ... ')
  const assistant = await vapiRequest('GET', `/assistant/${OUTBOUND_ASSISTANT_ID}`)
  const existingToolIds = assistant.model?.toolIds || []
  console.log(`✓ ${existingToolIds.length} existing tool(s)`)

  // 3. Patch the assistant with the new tool added
  process.stdout.write('  Patching assistant with new tool ... ')
  await vapiRequest('PATCH', `/assistant/${OUTBOUND_ASSISTANT_ID}`, {
    model: {
      ...assistant.model,
      toolIds: [...existingToolIds, tool.id],
    },
  })
  console.log('✓')

  console.log('\n✅ Done. send_review_sms tool is now live on the outbound assistant.')
  console.log(`   Tool ID: ${tool.id}`)
  console.log('   The AI will call this tool when a customer says yes to a review link.\n')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
