/**
 * Template Builder
 *
 * Builds template variable replacements for markdown reports.
 * Follows SRP (Single Responsibility Principle).
 */

import type { IntakeResult, PolicyAnalysisResult } from '@repo/shared'
import type { TestResult } from '../types'
import { METRIC_THRESHOLDS, STATUS } from './report-constants'
import type { OverallMetrics, TokenUsageData } from './report-metrics-aggregator'
import { formatCurrency, formatPercentage, formatTableRows } from './report-utils'

/**
 * Build all template replacements for markdown report
 */
export function buildTemplateReplacements(
  timestamp: string,
  overallMetrics: OverallMetrics,
  perCarrierRouting: Record<string, number>,
  perStateRouting: Record<string, number>,
  tokenUsage: TokenUsageData,
  testResults: TestResult[]
): Record<string, string> {
  return {
    ...buildTimestampReplacement(timestamp),
    ...buildMetricsReplacements(overallMetrics),
    ...buildFlowSpecificMetricsReplacements(overallMetrics),
    ...buildTableReplacements(perCarrierRouting, perStateRouting, tokenUsage),
    ...buildTestCaseDetailsReplacements(testResults),
    ...buildSummaryReplacements(testResults),
  }
}

/**
 * Build timestamp replacement
 */
function buildTimestampReplacement(timestamp: string): Record<string, string> {
  const formattedTimestamp = new Date(timestamp).toLocaleString('en-US', {
    dateStyle: 'full',
    timeStyle: 'long',
  })

  return { timestamp: formattedTimestamp }
}

/**
 * Build metrics replacements
 */
function buildMetricsReplacements(metrics: OverallMetrics): Record<string, string> {
  const routingStatus =
    metrics.routingAccuracy >= METRIC_THRESHOLDS.ROUTING_ACCURACY ? STATUS.PASS : STATUS.FAIL
  const intakeStatus =
    metrics.intakeCompleteness >= METRIC_THRESHOLDS.INTAKE_COMPLETENESS ? STATUS.PASS : STATUS.FAIL
  const discountStatus =
    metrics.discountAccuracyAverage >= METRIC_THRESHOLDS.DISCOUNT_ACCURACY
      ? STATUS.PASS
      : STATUS.FAIL
  const pitchStatus =
    metrics.pitchClarityAverage >= METRIC_THRESHOLDS.PITCH_CLARITY ? STATUS.PASS : STATUS.FAIL
  const complianceStatus =
    metrics.compliancePassRate === METRIC_THRESHOLDS.COMPLIANCE_PASS_RATE
      ? STATUS.PASS
      : STATUS.FAIL

  const overallStatus =
    metrics.routingAccuracy >= METRIC_THRESHOLDS.ROUTING_ACCURACY &&
    metrics.intakeCompleteness >= METRIC_THRESHOLDS.INTAKE_COMPLETENESS &&
    metrics.discountAccuracyAverage >= METRIC_THRESHOLDS.DISCOUNT_ACCURACY &&
    metrics.pitchClarityAverage >= METRIC_THRESHOLDS.PITCH_CLARITY &&
    metrics.compliancePassRate === METRIC_THRESHOLDS.COMPLIANCE_PASS_RATE
      ? '✅ All metrics meet target thresholds'
      : '❌ Some metrics below thresholds'

  return {
    routingAccuracy: metrics.routingAccuracy.toString(),
    intakeCompleteness: metrics.intakeCompleteness.toString(),
    discountAccuracy: metrics.discountAccuracyAverage.toString(),
    pitchClarity: metrics.pitchClarityAverage.toString(),
    compliancePassRate: metrics.compliancePassRate.toString(),
    routingStatus,
    intakeStatus,
    discountStatus,
    pitchStatus,
    complianceStatus,
    overallStatus,
  }
}

/**
 * Build flow-specific metrics replacements (conversational vs policy)
 */
function buildFlowSpecificMetricsReplacements(metrics: OverallMetrics): Record<string, string> {
  // Conversational flow metrics
  const convRoutingStatus =
    metrics.conversational.routingAccuracy >= METRIC_THRESHOLDS.ROUTING_ACCURACY
      ? STATUS.PASS
      : STATUS.FAIL
  const convIntakeStatus =
    metrics.conversational.intakeCompleteness >= METRIC_THRESHOLDS.INTAKE_COMPLETENESS
      ? STATUS.PASS
      : STATUS.FAIL
  const convPrefillStatus =
    metrics.conversational.prefillCompleteness >= METRIC_THRESHOLDS.INTAKE_COMPLETENESS
      ? STATUS.PASS
      : STATUS.FAIL
  const convComplianceStatus =
    metrics.conversational.compliancePassRate === METRIC_THRESHOLDS.COMPLIANCE_PASS_RATE
      ? STATUS.PASS
      : STATUS.FAIL

  const convOverallStatus =
    metrics.conversational.routingAccuracy >= METRIC_THRESHOLDS.ROUTING_ACCURACY &&
    metrics.conversational.intakeCompleteness >= METRIC_THRESHOLDS.INTAKE_COMPLETENESS &&
    metrics.conversational.prefillCompleteness >= METRIC_THRESHOLDS.INTAKE_COMPLETENESS &&
    metrics.conversational.compliancePassRate === METRIC_THRESHOLDS.COMPLIANCE_PASS_RATE
      ? '✅ All conversational metrics meet target thresholds'
      : '❌ Some conversational metrics below thresholds'

  // Policy flow metrics
  const policyIntakeStatus =
    metrics.policy.intakeCompleteness >= METRIC_THRESHOLDS.INTAKE_COMPLETENESS
      ? STATUS.PASS
      : STATUS.FAIL
  const policyDiscountStatus =
    metrics.policy.discountAccuracy >= METRIC_THRESHOLDS.DISCOUNT_ACCURACY
      ? STATUS.PASS
      : STATUS.FAIL
  const policyPitchStatus =
    metrics.policy.pitchClarity >= METRIC_THRESHOLDS.PITCH_CLARITY ? STATUS.PASS : STATUS.FAIL
  const policyComplianceStatus =
    metrics.policy.compliancePassRate === METRIC_THRESHOLDS.COMPLIANCE_PASS_RATE
      ? STATUS.PASS
      : STATUS.FAIL

  const policyOverallStatus =
    metrics.policy.intakeCompleteness >= METRIC_THRESHOLDS.INTAKE_COMPLETENESS &&
    metrics.policy.discountAccuracy >= METRIC_THRESHOLDS.DISCOUNT_ACCURACY &&
    metrics.policy.pitchClarity >= METRIC_THRESHOLDS.PITCH_CLARITY &&
    metrics.policy.compliancePassRate === METRIC_THRESHOLDS.COMPLIANCE_PASS_RATE
      ? '✅ All policy metrics meet target thresholds'
      : '❌ Some policy metrics below thresholds'

  return {
    // Conversational flow
    convRoutingAccuracy: metrics.conversational.routingAccuracy.toString(),
    convIntakeCompleteness: metrics.conversational.intakeCompleteness.toString(),
    convPrefillCompleteness: metrics.conversational.prefillCompleteness.toString(),
    convCompliancePassRate: metrics.conversational.compliancePassRate.toString(),
    convTestCount: metrics.conversational.testCount.toString(),
    convRoutingStatus,
    convIntakeStatus,
    convPrefillStatus,
    convComplianceStatus,
    convOverallStatus,
    // Policy flow
    policyIntakeCompleteness: metrics.policy.intakeCompleteness.toString(),
    policyDiscountAccuracy: metrics.policy.discountAccuracy.toString(),
    policyPitchClarity: metrics.policy.pitchClarity.toString(),
    policyCompliancePassRate: metrics.policy.compliancePassRate.toString(),
    policyTestCount: metrics.policy.testCount.toString(),
    policyIntakeStatus,
    policyDiscountStatus,
    policyPitchStatus,
    policyComplianceStatus,
    policyOverallStatus,
  }
}

/**
 * Build table replacements
 */
function buildTableReplacements(
  perCarrierRouting: Record<string, number>,
  perStateRouting: Record<string, number>,
  tokenUsage: TokenUsageData
): Record<string, string> {
  const carrierTableRows = formatTableRows(
    perCarrierRouting,
    (carrier, accuracy) => `| ${carrier} | ${formatPercentage(accuracy)} |`
  )

  const stateTableRows = formatTableRows(
    perStateRouting,
    (state, accuracy) => `| ${state} | ${formatPercentage(accuracy)} |`
  )

  return {
    carrierTableRows: carrierTableRows || '| - | - |',
    stateTableRows: stateTableRows || '| - | - |',
    totalInputTokens: tokenUsage.totalInputTokens.toLocaleString(),
    totalOutputTokens: tokenUsage.totalOutputTokens.toLocaleString(),
    totalCost: formatCurrency(tokenUsage.totalCost),
  }
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
 * Build test case details replacements
 */
function buildTestCaseDetailsReplacements(testResults: TestResult[]): Record<string, string> {
  const testCaseDetails = testResults
    .map((result) => {
      const status = result.passed ? '✅ PASS' : '❌ FAIL'

      // Get file name for individual report link
      const testId = result.testCase.id
      let fileName = testId
      if (testId.startsWith('conv-')) {
        fileName = `conversational-${testId.replace('conv-', '')}`
      } else if (testId.startsWith('policy-')) {
        fileName = testId
      }

      const detailLink = `[View Detailed Report →](./${fileName}.md)`

      // Extract prefill packet
      const prefillPacket = extractPrefillPacket(result)

      return `### ${result.testCase.name}

- **ID:** ${result.testCase.id}
- **Type:** ${result.testCase.type}
- **Carrier:** ${result.testCase.carrier}
- **State:** ${result.testCase.state}
- **Product:** ${Array.isArray(result.testCase.product) ? result.testCase.product.join(', ') : result.testCase.product}
- **Status:** ${status}

**Prefill Packet:**
\`\`\`json
${prefillPacket}
\`\`\`

${detailLink}

---
`
    })
    .join('\n')

  return {
    testCaseDetails: testCaseDetails || '_No test case details_',
  }
}

/**
 * Build summary replacements
 */
function buildSummaryReplacements(testResults: TestResult[]): Record<string, string> {
  const passedTests = testResults.filter((r) => r.passed).length
  const failedTests = testResults.filter((r) => !r.passed).length
  const passRate = testResults.length > 0 ? Math.round((passedTests / testResults.length) * 100) : 0

  return {
    totalTests: testResults.length.toString(),
    passedTests: passedTests.toString(),
    failedTests: failedTests.toString(),
    passRate: formatPercentage(passRate),
  }
}
