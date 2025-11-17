/**
 * Section builders for individual reports
 */

import type { IntakeResult, PolicyAnalysisResult } from '@repo/shared'
import type { TestResult } from '../../types'

/**
 * Build error section (only if test failed)
 */
export function buildErrorSection(result: TestResult): string {
  if (result.passed || !result.error) return ''

  return `## ❌ Test Failed

**Error:**
\`\`\`
${result.error}
\`\`\`

---

`
}

/**
 * Build conversational input section
 */
function buildConversationalInputSection(input?: string): string {
  return `**Conversational Input:**
\`\`\`
${input || 'No input provided'}
\`\`\`
`
}

/**
 * Build policy input section
 */
function buildPolicyInputSection(
  response: PolicyAnalysisResult | undefined,
  policyInput?: string | unknown
): string {
  const policyData = response?.currentPolicy || policyInput
  return `**Policy Input:**
\`\`\`json
${JSON.stringify(policyData, null, 2)}
\`\`\`
`
}

/**
 * Build test input section (conversational = input string, policy = parsed policy data)
 */
export function buildTestInputSection(result: TestResult): string {
  if (result.testCase.type === 'conversational') {
    return buildConversationalInputSection(result.testCase.input)
  }

  if (result.testCase.type === 'policy') {
    const response = result.actualResponse as PolicyAnalysisResult | undefined
    return buildPolicyInputSection(response, result.testCase.policyInput)
  }

  return 'No input data available'
}

/**
 * Extract actual profile/policy from response based on flow type
 */
function extractActualData(result: TestResult): Record<string, unknown> | undefined {
  if (result.testCase.type === 'conversational') {
    return (result.actualResponse as IntakeResult | undefined)?.profile
  }
  return (result.actualResponse as PolicyAnalysisResult | undefined)?.currentPolicy
}

/**
 * Check if two field values match (with special handling for currentCarrier)
 */
function fieldsMatch(field: string, expectedValue: unknown, actualValue: unknown): boolean {
  const expectedStr = JSON.stringify(expectedValue)
  const actualStr = actualValue !== undefined ? JSON.stringify(actualValue) : 'null'

  // Special handling for currentCarrier (case-insensitive)
  if (
    field === 'currentCarrier' &&
    typeof expectedValue === 'string' &&
    typeof actualValue === 'string'
  ) {
    return expectedValue.toLowerCase() === actualValue.toLowerCase()
  }

  return expectedStr === actualStr
}

/**
 * Build field comparison section (expected vs extracted)
 * Shows which fields were successfully extracted and which were missed
 */
export function buildFieldComparisonSection(result: TestResult): string {
  const expected = result.testCase.expectedProfile
  const actual = extractActualData(result)

  if (!expected || !actual) return ''

  const rows: string[] = []
  rows.push('## Field Extraction Comparison\n')
  rows.push('| Field | Expected | Extracted | Match |')
  rows.push('|-------|----------|-----------|-------|')

  // Iterate over expected fields
  for (const [field, expectedValue] of Object.entries(expected)) {
    if (expectedValue === undefined || expectedValue === null || expectedValue === '') continue

    const actualValue = actual[field]
    const expectedStr = JSON.stringify(expectedValue)
    const actualStr = actualValue !== undefined ? JSON.stringify(actualValue) : 'null'
    const match = fieldsMatch(field, expectedValue, actualValue)

    rows.push(`| ${field} | ${expectedStr} | ${actualStr} | ${match ? '✅' : '❌'} |`)
  }

  rows.push('')
  return rows.join('\n')
}
