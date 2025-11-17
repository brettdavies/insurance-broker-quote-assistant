/**
 * Test Policy Extraction with Mock File
 *
 * End-to-end test of policy extraction from file upload
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { policySummarySchema } from '@repo/shared'
import { GeminiProvider } from '../gemini-provider'

async function testPolicyExtraction() {
  if (!process.env.GEMINI_API_KEY) {
    console.log('⚠️  Set GEMINI_API_KEY to run this test')
    return
  }

  console.log('Testing policy extraction from file...\n')

  const provider = new GeminiProvider(process.env.GEMINI_API_KEY, 'gemini-2.5-flash-lite', 60000)

  // Read mock policy file
  const testFilePath = join(process.cwd(), 'test-files', 'mock-policy.txt')
  const fileContent = readFileSync(testFilePath)

  // Create File object (simulating what we get from HTTP request)
  const file = new File([fileContent], 'mock-policy.txt', { type: 'text/plain' })

  try {
    console.log('📤 Uploading file to Gemini...')
    const result = await provider.extractFromFile(file, undefined, policySummarySchema)

    console.log('✅ Extraction successful!\n')
    console.log('Extracted Profile:', JSON.stringify(result.profile, null, 2))
    console.log('\nConfidence Scores:', JSON.stringify(result.confidence, null, 2))
    console.log('\nReasoning:', result.reasoning)

    // Validate structure
    const validation = policySummarySchema.safeParse(result.profile)
    if (validation.success) {
      console.log('\n✅ Extracted data matches PolicySummary schema')
    } else {
      console.log('\n⚠️  Validation warnings:', validation.error.errors)
    }
  } catch (error) {
    console.error('❌ Extraction failed:', error)
    throw error
  }
}

testPolicyExtraction().catch(console.error)
