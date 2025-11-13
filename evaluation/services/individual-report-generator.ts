/**
 * Individual Report Generator
 *
 * Generates detailed markdown reports for individual test cases.
 * One report file per test case with comprehensive trace details.
 *
 * Follows SOLID principles:
 * - SRP: Single responsibility (generate one report)
 * - DRY: Reuses trace-section-builder for trace details
 */

import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { DecisionTrace, IntakeResult, PolicyAnalysisResult } from '@repo/shared'
import type { TestCase, TestResult } from '../types'
import { INDIVIDUAL_REPORT_TEMPLATE_PATH } from './report-constants'
import { buildTraceSection } from './trace-section-builder'

/**
 * Extract trace from test result
 */
function extractTrace(result: TestResult): unknown {
  if (!result.actualResponse) return null

  const response = result.actualResponse as IntakeResult | PolicyAnalysisResult

  // Check for trace in IntakeResult
  if ('trace' in response) {
    return response.trace
  }

  // Check for trace in PolicyAnalysisResult
  if ('extraction' in response && typeof response.extraction === 'object') {
    const extraction = response.extraction as { trace?: unknown }
    if (extraction.trace) return extraction.trace
  }

  return null
}

/**
 * Format status emoji for display
 */
function formatStatus(passed: boolean): string {
  return passed ? '✅ PASSED' : '❌ FAILED'
}

/**
 * Build metrics table rows for individual report
 */
function buildMetricsTableRows(result: TestResult): string {
  if (!result.metrics) return '| No metrics available | - | - | - |'

  const rows: string[] = []

  // Conversational flow metrics
  if (result.testCase.type === 'conversational') {
    if (result.metrics.routingAccuracy !== undefined) {
      rows.push(
        `| Routing Accuracy | ≥90% | ${result.metrics.routingAccuracy.toFixed(1)}% | ${result.metrics.routingAccuracy >= 90 ? '✅' : '❌'} |`
      )
    }
    if (result.metrics.intakeCompleteness !== undefined) {
      rows.push(
        `| Intake Completeness | ≥95% | ${result.metrics.intakeCompleteness.toFixed(1)}% | ${result.metrics.intakeCompleteness >= 95 ? '✅' : '❌'} |`
      )
    }
    if (result.metrics.prefillCompleteness !== undefined) {
      rows.push(
        `| Prefill Completeness | ≥95% | ${result.metrics.prefillCompleteness.toFixed(1)}% | ${result.metrics.prefillCompleteness >= 95 ? '✅' : '❌'} |`
      )
    }
    if (result.metrics.compliancePassRate !== undefined) {
      rows.push(
        `| Compliance Pass Rate | 100% | ${result.metrics.compliancePassRate.toFixed(1)}% | ${result.metrics.compliancePassRate === 100 ? '✅' : '❌'} |`
      )
    }
  }

  // Policy flow metrics
  if (result.testCase.type === 'policy') {
    if (result.metrics.intakeCompleteness !== undefined) {
      rows.push(
        `| Intake Completeness | ≥95% | ${result.metrics.intakeCompleteness.toFixed(1)}% | ${result.metrics.intakeCompleteness >= 95 ? '✅' : '❌'} |`
      )
    }
    if (result.metrics.discountAccuracy !== undefined) {
      rows.push(
        `| Discount Accuracy | ≥90% | ${result.metrics.discountAccuracy.toFixed(1)}% | ${result.metrics.discountAccuracy >= 90 ? '✅' : '❌'} |`
      )
    }
    if (result.metrics.pitchClarity !== undefined) {
      rows.push(
        `| Savings Pitch Clarity | ≥85% | ${result.metrics.pitchClarity.toFixed(1)}% | ${result.metrics.pitchClarity >= 85 ? '✅' : '❌'} |`
      )
    }
    if (result.metrics.compliancePassRate !== undefined) {
      rows.push(
        `| Compliance Pass Rate | 100% | ${result.metrics.compliancePassRate.toFixed(1)}% | ${result.metrics.compliancePassRate === 100 ? '✅' : '❌'} |`
      )
    }
  }

  return rows.length > 0 ? rows.join('\n') : '| No metrics available | - | - | - |'
}

/**
 * Build error section (only if test failed)
 */
function buildErrorSection(result: TestResult): string {
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
 * Build test input section (conversational = input string, policy = parsed policy data)
 */
function buildTestInputSection(result: TestResult): string {
  if (result.testCase.type === 'conversational') {
    return `**Conversational Input:**
\`\`\`
${result.testCase.input || 'No input provided'}
\`\`\`
`
  }

  // Policy flow - show parsed policy data
  if (result.testCase.type === 'policy') {
    const response = result.actualResponse as PolicyAnalysisResult | undefined
    const policyData = response?.policy || result.testCase.policyInput

    return `**Policy Input:**
\`\`\`json
${JSON.stringify(policyData, null, 2)}
\`\`\`
`
  }

  return 'No input data available'
}

/**
 * Extract prefill packet from result
 */
function extractPrefillPacket(result: TestResult): string {
  if (!result.actualResponse) return '{}'

  const response = result.actualResponse as IntakeResult | PolicyAnalysisResult

  // IntakeResult has prefill at top level
  if ('prefill' in response) {
    return JSON.stringify(response.prefill, null, 2)
  }

  // PolicyAnalysisResult may have prefill in different location
  // Check if there's a prefill field anywhere
  if (typeof response === 'object' && response !== null) {
    for (const key of Object.keys(response)) {
      if (key.toLowerCase().includes('prefill')) {
        return JSON.stringify(response[key as keyof typeof response], null, 2)
      }
    }
  }

  return '{}'
}

/**
 * Calculate token usage from result
 */
function calculateTokenUsage(result: TestResult): {
  inputTokens: number
  outputTokens: number
  cost: string
} {
  const trace = extractTrace(result)
  if (!trace || typeof trace !== 'object') {
    return { inputTokens: 0, outputTokens: 0, cost: '$0.00' }
  }

  const traceObj = trace as {
    llmCalls?: Array<{ promptTokens?: number; completionTokens?: number }>
  }
  const llmCalls = traceObj.llmCalls || []

  let inputTokens = 0
  let outputTokens = 0

  for (const call of llmCalls) {
    inputTokens += call.promptTokens || 0
    outputTokens += call.completionTokens || 0
  }

  // Calculate cost (GPT-4o-mini pricing: $0.15 per 1M input, $0.60 per 1M output)
  const cost = (inputTokens * 0.15 + outputTokens * 0.6) / 1_000_000

  return {
    inputTokens,
    outputTokens,
    cost: `$${cost.toFixed(4)}`,
  }
}

/**
 * Get test case file name from test case
 */
function getTestCaseFileName(testCase: TestCase): string {
  // Extract file name from test ID
  // conv-01 → conversational-01
  // policy-01 → policy-01
  if (testCase.id.startsWith('conv-')) {
    return `conversational-${testCase.id.replace('conv-', '')}`
  }
  if (testCase.id.startsWith('policy-')) {
    return testCase.id
  }
  return testCase.id
}

/**
 * Generate individual report for a test case
 */
export async function generateIndividualReport(
  result: TestResult,
  outputDir: string
): Promise<string> {
  // Load template
  const template = await readFile(INDIVIDUAL_REPORT_TEMPLATE_PATH, 'utf-8')

  // Extract data
  const trace = extractTrace(result)
  const tokenUsage = calculateTokenUsage(result)
  const timestamp = new Date().toISOString()
  const fileName = getTestCaseFileName(result.testCase)

  // Build trace section
  let traceSection = 'No trace data available'
  if (trace && typeof trace === 'object') {
    try {
      traceSection = buildTraceSection(result.testCase.id, trace as DecisionTrace, result)
    } catch (error) {
      traceSection = `Error building trace section: ${error}`
    }
  }

  // Build template replacements
  const replacements: Record<string, string> = {
    testName: result.testCase.name,
    testId: result.testCase.id,
    flowType: result.testCase.type === 'conversational' ? 'Conversational' : 'Policy',
    testStatus: formatStatus(result.passed),
    carrier: result.testCase.carrier || 'N/A',
    state: result.testCase.state || 'N/A',
    product: Array.isArray(result.testCase.product)
      ? result.testCase.product.join(', ')
      : result.testCase.product || 'N/A',
    metricsTableRows: buildMetricsTableRows(result),
    errorSection: buildErrorSection(result),
    testInputSection: buildTestInputSection(result),
    traceSection,
    prefillPacket: extractPrefillPacket(result),
    inputTokens: tokenUsage.inputTokens.toLocaleString(),
    outputTokens: tokenUsage.outputTokens.toLocaleString(),
    cost: tokenUsage.cost,
    timestamp,
  }

  // Replace all placeholders
  let output = template
  for (const [key, value] of Object.entries(replacements)) {
    output = output.replace(new RegExp(`{{${key}}}`, 'g'), value)
  }

  // Write to file
  const outputPath = join(outputDir, `${fileName}.md`)
  await writeFile(outputPath, output)

  return outputPath
}
