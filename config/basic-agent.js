/**
 * Minimal lead-capture agent for new detailers before onboarding is complete.
 * No booking tools — just captures name, phone, and reason for calling.
 */

function buildBasicAgentConfig(business_name, owner_name, base_url) {
  const systemPrompt = `You are a friendly receptionist for ${business_name}. The business is currently setting up their system, so you can't book appointments yet. Your job is to:

1. Greet warmly: the firstMessage already said hello, so just listen and respond naturally.
2. Listen to what they need.
3. Capture their name and phone number.
4. Let them know: "I'll make sure ${owner_name} gets your message and calls you back shortly."
5. End the call politely.

Be warm, professional, and brief. Never make up services, prices, or availability. Just capture the lead.

IMPORTANT: Do not ask for a phone number if the caller already provided it or if you can see it from the call. Focus on understanding why they're calling and getting their name.`

  return {
    name: `${business_name} AI Receptionist (Basic)`,
    firstMessage: `Hi, thanks for calling ${business_name}! How can I help you today?`,
    model: {
      provider: 'anthropic',
      model: 'claude-haiku-4-5-20251001',
      maxTokens: 512,
      systemPrompt,
    },
    voice: { provider: 'vapi', voiceId: 'Elliot' },
    transcriber: {
      provider: 'deepgram',
      model: 'nova-2',
      language: 'en-US',
    },
    endCallFunctionEnabled: true,
    silenceTimeoutSeconds: 20,
    endCallPhrases: ['Have a great day', 'Have a great day!', 'Goodbye', 'Bye for now', 'Take care', 'bye bye', 'goodbye'],
    ...(base_url ? { serverUrl: `${base_url}/api/voice/basic-agent-webhook` } : {}),
  }
}

module.exports = { buildBasicAgentConfig }
