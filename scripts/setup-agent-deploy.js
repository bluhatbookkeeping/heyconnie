#!/usr/bin/env node
/**
 * One-time deploy script for the Hey Connie Setup Agent.
 *
 * What it does:
 *   1. Creates "Hey Connie" Twilio sub-account (idempotent)
 *   2. Creates the Hey Connie Setup Agent in Vapi with lookupBusiness tool
 *   3. Buys a 626 Twilio number under the sub-account
 *   4. Imports the number to Vapi and assigns it to the setup assistant
 *   5. Writes all env vars to Vercel
 *
 * Guards:
 *   - Never touches Connie (a831eec7) or the 1924 number
 *   - Idempotent: aborts if setup assistant already exists
 *
 * Run: node scripts/setup-agent-deploy.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })
const { execSync } = require('child_process')
const { buildSetupAssistantConfig } = require('../config/setup-agent')

const VAPI_API_KEY        = process.env.VAPI_API_KEY
const VAPI_SECRET         = process.env.VAPI_SECRET
const TWILIO_ACCOUNT_SID  = process.env.TWILIO_ACCOUNT_SID
const TWILIO_AUTH_TOKEN   = process.env.TWILIO_AUTH_TOKEN
const BASE_URL            = 'https://luis-mobile-detailing.vercel.app'

// Must never be touched
const CONNIE_ASSISTANT_ID = 'a831eec7-9b7b-4b0c-928c-dea1c3cfd296'
const CONNIE_PHONE_NUM_ID = '5c541553-626b-4d99-98f8-a0fd40abb147'

if (!VAPI_API_KEY)       { console.error('ERROR: VAPI_API_KEY not set');       process.exit(1) }
if (!VAPI_SECRET)        { console.error('ERROR: VAPI_SECRET not set');        process.exit(1) }
if (!TWILIO_ACCOUNT_SID) { console.error('ERROR: TWILIO_ACCOUNT_SID not set'); process.exit(1) }
if (!TWILIO_AUTH_TOKEN)  { console.error('ERROR: TWILIO_AUTH_TOKEN not set');  process.exit(1) }

// ─── Vapi helpers ─────────────────────────────────────────────────────────────

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
    console.error(`\nVapi ${method} ${path} failed (${res.status}):`, JSON.stringify(json, null, 2))
    process.exit(1)
  }
  return json
}

// ─── Twilio helpers ───────────────────────────────────────────────────────────

async function twilioRequest(method, path, params, accountSid, authToken) {
  const sid   = accountSid || TWILIO_ACCOUNT_SID
  const token = authToken  || TWILIO_AUTH_TOKEN
  const base  = path.startsWith('http') ? path : `https://api.twilio.com/2010-04-01/Accounts/${sid}${path}`
  const auth  = Buffer.from(`${sid}:${token}`).toString('base64')
  const options = {
    method,
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
    },
  }
  if (params) options.body = new URLSearchParams(params).toString()
  const res  = await fetch(base, options)
  const json = await res.json()
  if (!res.ok) {
    console.error(`\nTwilio ${method} ${path} failed (${res.status}):`, JSON.stringify(json, null, 2))
    process.exit(1)
  }
  return json
}

// ─── Vercel env helper ────────────────────────────────────────────────────────

function setVercelEnv(key, value) {
  try {
    execSync(`printf '%s' "${value}" | vercel env add ${key} production --force`, { stdio: 'pipe' })
    return true
  } catch {
    return false
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🚀 Hey Connie — Setup Agent Deploy\n')

  // ── 1. Check if setup assistant already exists in Vapi ──
  process.stdout.write('Checking Vapi for existing setup assistant ... ')
  const assistantList = await vapiRequest('GET', '/assistant?limit=100')
  const existingAssistant = assistantList.find(a => a.name === 'Hey Connie Setup Agent')
  let assistantId = null

  if (existingAssistant) {
    assistantId = existingAssistant.id
    // Check if a phone number is already assigned to it
    const phoneList = await vapiRequest('GET', '/phone-number?limit=100')
    const assignedPhone = phoneList.find(p => p.assistantId === assistantId)
    if (assignedPhone) {
      console.log(`found + phone assigned — patching system prompt and tools.\n`)
      // Patch system prompt + tools (idempotent update path)
      const { functionTools, assistantBody } = buildSetupAssistantConfig(BASE_URL, VAPI_SECRET)
      // Upsert each tool by name
      const existingTools = await vapiRequest('GET', '/tool?limit=100')
      const toolIds = []
      for (const tool of functionTools) {
        const name = tool.function.name
        const existing = existingTools.find(t => t.function?.name === name)
        if (existing) {
          process.stdout.write(`  Patching tool: ${name} ... `)
          const { type: _t, async: _a, ...patchBody } = tool
          await vapiRequest('PATCH', `/tool/${existing.id}`, patchBody)
          toolIds.push(existing.id)
          console.log(`✓ ${existing.id}`)
        } else {
          process.stdout.write(`  Creating tool: ${name} (new) ... `)
          const created = await vapiRequest('POST', '/tool', tool)
          toolIds.push(created.id)
          console.log(`✓ ${created.id}`)
        }
      }
      process.stdout.write('  Patching assistant ... ')
      await vapiRequest('PATCH', `/assistant/${assistantId}`, {
        firstMessage: assistantBody.firstMessage,
        endCallPhrases: assistantBody.endCallPhrases,
        model: { ...assistantBody.model, toolIds },
      })
      console.log('✓')
      console.log('\n✅ Done. Setup agent updated in place.')
      console.log(`  VAPI_SETUP_ASSISTANT_ID=${assistantId}`)
      console.log(`  SETUP_PHONE_NUMBER=${assignedPhone.number}`)
      process.exit(0)
    }
    console.log(`found (no phone yet) — resuming from phone purchase.`)
  } else {
    console.log('not found, creating.')
  }

  // ── 2. Twilio sub-account (idempotent) ──
  process.stdout.write('Looking for "Hey Connie" Twilio sub-account ... ')
  const accountList = await twilioRequest('GET', 'https://api.twilio.com/2010-04-01/Accounts.json?FriendlyName=Hey+Connie')
  let subAccountSid, subAccountAuthToken

  if (accountList.accounts?.length > 0) {
    const sub = accountList.accounts[0]
    subAccountSid       = sub.sid
    subAccountAuthToken = sub.auth_token
    console.log(`found (${subAccountSid})`)
  } else {
    console.log('not found, creating.')
    process.stdout.write('Creating "Hey Connie" sub-account ... ')
    const created = await twilioRequest('POST', 'https://api.twilio.com/2010-04-01/Accounts.json', { FriendlyName: 'Hey Connie' })
    subAccountSid       = created.sid
    subAccountAuthToken = created.auth_token
    console.log(`✓ ${subAccountSid}`)
  }

  // ── 3-5. Create tool + assistant (skip if already exists) ──
  if (!assistantId) {
    const { functionTools, assistantBody } = buildSetupAssistantConfig(BASE_URL, VAPI_SECRET)

    process.stdout.write('Creating lookupBusiness tool in Vapi ... ')
    const createdTool = await vapiRequest('POST', '/tool', functionTools[0])
    console.log(`✓ ${createdTool.id}`)

    process.stdout.write('Creating Hey Connie Setup Agent in Vapi ... ')
    const assistant = await vapiRequest('POST', '/assistant', {
      name: 'Hey Connie Setup Agent',
      firstMessage: assistantBody.firstMessage,
      model: { ...assistantBody.model, toolIds: [createdTool.id] },
      voice: assistantBody.voice,
      serverUrl: `${BASE_URL}/api/voice/setup-call-ended`,
      serverUrlSecret: VAPI_SECRET,
      endCallFunctionEnabled: assistantBody.endCallFunctionEnabled,
      silenceTimeoutSeconds: assistantBody.silenceTimeoutSeconds,
      endCallPhrases: assistantBody.endCallPhrases,
    })
    if (assistant.id === CONNIE_ASSISTANT_ID) {
      console.error('\nERROR: Returned Connie assistant ID — should never happen.')
      process.exit(1)
    }
    assistantId = assistant.id
    console.log(`✓ ${assistantId}`)
  }

  // ── 6. Buy a 626 number under the sub-account ──
  // Search using master creds — try 818, fall back to 747 (overlay), then any CA number
  const areaCodesToTry = ['818', '747', '310', '323']
  let numberToBuyResult = null
  for (const ac of areaCodesToTry) {
    process.stdout.write(`Searching for available ${ac} number ... `)
    const res = await twilioRequest(
      'GET',
      `/AvailablePhoneNumbers/US/Local.json?AreaCode=${ac}&Limit=1`,
      null,
      TWILIO_ACCOUNT_SID,
      TWILIO_AUTH_TOKEN
    )
    if (res.available_phone_numbers?.length) {
      numberToBuyResult = res.available_phone_numbers[0].phone_number
      console.log(`found ${numberToBuyResult}`)
      break
    }
    console.log('none, trying next.')
  }
  if (!numberToBuyResult) {
    console.error('\nNo numbers available in any target area code. Check Twilio account.')
    process.exit(1)
  }
  const available = { available_phone_numbers: [{ phone_number: numberToBuyResult }] }
  const numberToBuy = numberToBuyResult
  process.stdout.write(`Purchasing ${numberToBuy} ... `)
  const purchased = await twilioRequest(
    'POST',
    `/IncomingPhoneNumbers.json`,
    { PhoneNumber: numberToBuy },
    subAccountSid,
    subAccountAuthToken
  )
  console.log(`✓ SID: ${purchased.sid}`)

  // ── 7. Import number to Vapi ──
  process.stdout.write('Importing number to Vapi ... ')
  const vapiPhone = await vapiRequest('POST', '/phone-number', {
    provider: 'twilio',
    twilioAccountSid: subAccountSid,
    twilioAuthToken: subAccountAuthToken,
    number: numberToBuy,
  })
  if (vapiPhone.id === CONNIE_PHONE_NUM_ID) {
    console.error('\nERROR: Returned Connie phone number ID — should never happen.')
    process.exit(1)
  }
  console.log(`✓ Vapi phone ID: ${vapiPhone.id}`)

  // ── 8. Assign number to setup assistant ──
  process.stdout.write('Assigning number to setup assistant ... ')
  await vapiRequest('PATCH', `/phone-number/${vapiPhone.id}`, { assistantId })
  console.log('✓')

  // ── 9. Write Vercel env vars ──
  console.log('\nWriting Vercel env vars ...')
  const results = {
    VAPI_SETUP_ASSISTANT_ID:      setVercelEnv('VAPI_SETUP_ASSISTANT_ID',      assistantId),
    SETUP_PHONE_NUMBER:           setVercelEnv('SETUP_PHONE_NUMBER',           numberToBuy),
    TWILIO_SUBACCOUNT_SID:        setVercelEnv('TWILIO_SUBACCOUNT_SID',        subAccountSid),
    TWILIO_SUBACCOUNT_AUTH_TOKEN: setVercelEnv('TWILIO_SUBACCOUNT_AUTH_TOKEN', subAccountAuthToken),
  }
  for (const [key, ok] of Object.entries(results)) {
    console.log(`  ${key}: ${ok ? '✓ set' : '⚠ set manually (see below)'}`)
  }

  // ── 10. Summary ──
  const manualVars = Object.entries(results).filter(([, ok]) => !ok)
  console.log('\n' + '─'.repeat(64))
  console.log('✅  Hey Connie Setup Agent Deployed\n')
  console.log(`  Vapi Setup Assistant ID:  ${assistantId}`)
  console.log(`  Setup Phone Number:       ${numberToBuy}`)
  console.log(`  Twilio Sub-account SID:   ${subAccountSid}`)
  console.log(`  Vapi Phone Number ID:     ${vapiPhone.id}`)
  console.log(`  Server URL:               ${BASE_URL}/api/voice/setup-call-ended`)
  console.log('─'.repeat(64))

  if (manualVars.length > 0) {
    console.log('\n⚠️  Add these to .env and Vercel manually:')
    const vals = {
      VAPI_SETUP_ASSISTANT_ID:      assistantId,
      SETUP_PHONE_NUMBER:           numberToBuy,
      TWILIO_SUBACCOUNT_SID:        subAccountSid,
      TWILIO_SUBACCOUNT_AUTH_TOKEN: subAccountAuthToken,
    }
    for (const [key] of manualVars) console.log(`  ${key}=${vals[key]}`)
  }

  console.log('\n📋  Next steps:')
  console.log('  1. Update CLAUDE.md "Voice Agent — Current State" with the IDs above')
  console.log('  2. Register heyconnie.co domain')
  console.log('  3. Complete A2P registration in Twilio dashboard using Hey Connie sub-account')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
