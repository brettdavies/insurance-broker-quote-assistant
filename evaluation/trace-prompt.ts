#!/usr/bin/env bun

/**
 * Trace the exact prompt sent to LLM by calling the API endpoint
 * This simulates what the frontend would send
 */

const API_BASE_URL = process.env.EVALUATION_API_URL || 'http://localhost:7070/api'
const TEST_MESSAGE = 'CA auto. 35yo. 2 cars, 2 drivers. Clean record 5yrs. Owns home. Zip 90210'

async function main() {
  console.log('🔍 Tracing LLM prompt flow...\n')
  console.log(`📝 Input message: "${TEST_MESSAGE}"\n`)

  console.log('📡 Calling API endpoint (simulating frontend call)...\n')

  const response = await fetch(`${API_BASE_URL}/intake`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: TEST_MESSAGE,
      conversationHistory: [],
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('❌ API Error:', error)
    process.exit(1)
  }

  const result = await response.json()

  console.log('✅ API Response received\n')
  console.log('📊 Extracted Profile:')
  console.log(JSON.stringify(result.profile, null, 2))

  console.log('\n📋 Check logs/program.log for the actual LLM prompt')
  console.log('   Look for entries with type: "llm_prompt_debug"')
}

if (import.meta.main) {
  main().catch((error) => {
    console.error('❌ Error:', error)
    process.exit(1)
  })
}
