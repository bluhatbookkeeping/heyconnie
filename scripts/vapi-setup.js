#!/usr/bin/env node
/**
 * Updates the existing Vapi assistant and its tools in place.
 * Requires VAPI_ASSISTANT_ID to be set — never creates a new assistant.
 * Run: node scripts/vapi-setup.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })

const business = require('../api/config/luis')
const { buildAssistantConfig } = require('../config/vapi-assistant')

const VAPI_API_KEY = process.env.VAPI_API_KEY
const VAPI_SECRET = process.env.VAPI_SECRET
const VAPI_ASSISTANT_ID = process.env.VAPI_ASSISTANT_ID
const BASE_URL = 'https://luis-mobile-detailing.vercel.app'

if (!VAPI_API_KEY) { console.error('ERROR: VAPI_API_KEY is not set.'); process.exit(1) }
if (!VAPI_SECRET) { console.error('ERROR: VAPI_SECRET is not set.'); process.exit(1) }
if (!VAPI_ASSISTANT_ID) { console.error('ERROR: VAPI_ASSISTANT_ID is not set. This script updates an existing assistant — never creates one.'); process.exit(1) }

const fullBusiness = { ...business, base_url: BASE_URL }
const { functionTools, assistantBody } = buildAssistantConfig(fullBusiness, VAPI_SECRET)

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
  console.log(`\nUpdating Vapi assistant: ${VAPI_ASSISTANT_ID}`)
  console.log(`Business: ${business.name}\n`)

  // Fetch current assistant to get existing toolIds
  const current = await vapiRequest('GET', `/assistant/${VAPI_ASSISTANT_ID}`)
  const existingToolIds = current.model?.toolIds || []

  // Fetch existing tools so we can match by name and PATCH instead of POST
  const existingTools = []
  for (const id of existingToolIds) {
    const tool = await vapiRequest('GET', `/tool/${id}`)
    existingTools.push(tool)
  }

  // Update or create each function tool
  const toolIds = []
  for (const tool of functionTools) {
    const name = tool.function.name
    const existing = existingTools.find(t => t.function?.name === name)

    if (existing) {
      process.stdout.write(`  Updating tool: ${name} ... `)
      const { type: _type, async: _async, ...patchBody } = tool
      await vapiRequest('PATCH', `/tool/${existing.id}`, patchBody)
      toolIds.push(existing.id)
      console.log(`✓ ${existing.id}`)
    } else {
      process.stdout.write(`  Creating tool: ${name} (new) ... `)
      const result = await vapiRequest('POST', '/tool', tool)
      toolIds.push(result.id)
      console.log(`✓ ${result.id}`)
    }
  }

  // PATCH the assistant with updated firstMessage, systemPrompt, and toolIds
  process.stdout.write('\n  Patching assistant ... ')
  await vapiRequest('PATCH', `/assistant/${VAPI_ASSISTANT_ID}`, {
    firstMessage: assistantBody.firstMessage,
    endCallPhrases: assistantBody.endCallPhrases,
    model: {
      ...assistantBody.model,
      toolIds,
    },
  })
  console.log('✓')

  console.log('\n✅ Done. Assistant updated in place — no Vapi dashboard changes needed.')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
