/**
 * Quick test to verify unified extraction works
 */

import { extractFieldsFrontend } from './packages/shared/src/utils/field-extraction-orchestrator'

const testText = 'IL auto. 3 vehicles: 2021 F-150, 2019 Camry, 2020 CR-V. 3 drivers. Age 36. 12k miles/yr. Clean record. Credit 750. Has pro'

console.log('Testing unified extraction...')
console.log('Input:', testText)
console.log('')

const fields = extractFieldsFrontend(testText)

console.log('Extracted fields:', fields.length)
for (const field of fields) {
  console.log(`- ${field.fieldName}: ${field.value} (from: "${field.originalText}")`)
}

// Check for specific fields
const hasAge = fields.some(f => f.fieldName === 'age')
const hasCreditScore = fields.some(f => f.fieldName === 'creditScore')

console.log('')
console.log('✅ Has age:', hasAge)
console.log('✅ Has creditScore:', hasCreditScore)

if (!hasAge || !hasCreditScore) {
  console.error('❌ EXTRACTION FAILED - missing age or creditScore')
  process.exit(1)
}

console.log('✅ All checks passed!')
