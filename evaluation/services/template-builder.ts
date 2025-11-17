/**
 * Template Builder
 *
 * Builds template variable replacements for markdown reports.
 * Follows SRP (Single Responsibility Principle).
 */

import type { TestResult } from '../types'
import { METRIC_THRESHOLDS, STATUS } from './report-constants'
import type { OverallMetrics, TokenUsageData } from './report-metrics-aggregator'
import { extractPrefillPacket, getTestCaseFileName } from './shared/data-extractors'
import { formatCurrency, formatPercentage, formatTableRows } from './shared/formatters'

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
 * Calculate status based on metric value and threshold
 */
function calculateStatus(metric: number, threshold: number): string {
  return metric >= threshold ? STATUS.PASS : STATUS.FAIL
}

/**
 * Format disclaimer metrics for display
 */
function formatDisclaimerMetrics(required: number, shown: number, missed: number): string {
  if (required === 0) return '-'
  // Calculate how many required disclaimers were actually found
  // (shown may include extra disclaimers, so we use required - missed)
  const found = required - missed
  return `${found}/${required} (${missed} missed)`
}

/**
 * Calculate disclaimer status (pass if no missed disclaimers)
 */
function calculateDisclaimerStatus(missed: number): string {
  return missed === 0 ? STATUS.PASS : STATUS.FAIL
}

/**
 * Build metrics replacements
 */
function buildMetricsReplacements(metrics: OverallMetrics): Record<string, string> {
  const routingStatus = calculateStatus(metrics.routingAccuracy, METRIC_THRESHOLDS.ROUTING_ACCURACY)
  const intakeStatus = calculateStatus(
    metrics.intakeCompleteness,
    METRIC_THRESHOLDS.INTAKE_COMPLETENESS
  )
  const discountStatus = calculateStatus(
    metrics.discountAccuracyAverage,
    METRIC_THRESHOLDS.DISCOUNT_ACCURACY
  )
  const pitchStatus = calculateStatus(metrics.pitchClarityAverage, METRIC_THRESHOLDS.PITCH_CLARITY)
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
 * Build conversational flow status replacements
 */
function buildConversationalStatusReplacements(
  metrics: OverallMetrics['conversational'],
  hasTests: boolean
): Record<string, string> {
  if (!hasTests) {
    return {
      convRoutingStatus: '-',
      convIntakeStatus: '-',
      convPrefillStatus: '-',
      convDisclaimersStatus: '-',
      convComplianceStatus: '-',
    }
  }

  return {
    convRoutingStatus: calculateStatus(metrics.routingAccuracy, METRIC_THRESHOLDS.ROUTING_ACCURACY),
    convIntakeStatus: calculateStatus(
      metrics.intakeCompleteness,
      METRIC_THRESHOLDS.INTAKE_COMPLETENESS
    ),
    convPrefillStatus: calculateStatus(
      metrics.prefillCompleteness,
      METRIC_THRESHOLDS.INTAKE_COMPLETENESS
    ),
    convDisclaimersStatus: calculateDisclaimerStatus(metrics.disclaimersMissed),
    convComplianceStatus:
      metrics.compliancePassRate === METRIC_THRESHOLDS.COMPLIANCE_PASS_RATE
        ? STATUS.PASS
        : STATUS.FAIL,
  }
}

/**
 * Build policy flow status replacements
 */
function buildPolicyStatusReplacements(
  metrics: OverallMetrics['policy'],
  hasTests: boolean
): Record<string, string> {
  if (!hasTests) {
    return {
      policyIntakeStatus: '-',
      policyDiscountStatus: '-',
      policyPitchStatus: '-',
      policyDisclaimersStatus: '-',
      policyComplianceStatus: '-',
    }
  }

  return {
    policyIntakeStatus: calculateStatus(
      metrics.intakeCompleteness,
      METRIC_THRESHOLDS.INTAKE_COMPLETENESS
    ),
    policyDiscountStatus: calculateStatus(
      metrics.discountAccuracy,
      METRIC_THRESHOLDS.DISCOUNT_ACCURACY
    ),
    policyPitchStatus: calculateStatus(metrics.pitchClarity, METRIC_THRESHOLDS.PITCH_CLARITY),
    policyDisclaimersStatus: calculateDisclaimerStatus(metrics.disclaimersMissed),
    policyComplianceStatus:
      metrics.compliancePassRate === METRIC_THRESHOLDS.COMPLIANCE_PASS_RATE
        ? STATUS.PASS
        : STATUS.FAIL,
  }
}

/**
 * Build flow-specific metrics replacements (conversational vs policy)
 */
function buildFlowSpecificMetricsReplacements(metrics: OverallMetrics): Record<string, string> {
  // Check if tests were run
  const hasConversationalTests = metrics.conversational.testCount > 0
  const hasPolicyTests = metrics.policy.testCount > 0

  // Build status replacements
  const conversationalStatuses = buildConversationalStatusReplacements(
    metrics.conversational,
    hasConversationalTests
  )
  const policyStatuses = buildPolicyStatusReplacements(metrics.policy, hasPolicyTests)

  // Build overall status messages
  const convOverallStatus = hasConversationalTests
    ? metrics.conversational.routingAccuracy >= METRIC_THRESHOLDS.ROUTING_ACCURACY &&
      metrics.conversational.intakeCompleteness >= METRIC_THRESHOLDS.INTAKE_COMPLETENESS &&
      metrics.conversational.prefillCompleteness >= METRIC_THRESHOLDS.INTAKE_COMPLETENESS &&
      metrics.conversational.compliancePassRate === METRIC_THRESHOLDS.COMPLIANCE_PASS_RATE
      ? '✅ All conversational metrics meet target thresholds'
      : '❌ Some conversational metrics below thresholds'
    : 'No conversational tests run'

  const policyOverallStatus = hasPolicyTests
    ? metrics.policy.intakeCompleteness >= METRIC_THRESHOLDS.INTAKE_COMPLETENESS &&
      metrics.policy.discountAccuracy >= METRIC_THRESHOLDS.DISCOUNT_ACCURACY &&
      metrics.policy.pitchClarity >= METRIC_THRESHOLDS.PITCH_CLARITY &&
      metrics.policy.compliancePassRate === METRIC_THRESHOLDS.COMPLIANCE_PASS_RATE
      ? '✅ All policy metrics meet target thresholds'
      : '❌ Some policy metrics below thresholds'
    : 'No policy tests run'

  return {
    // Conversational flow metrics
    convRoutingAccuracy: hasConversationalTests
      ? `${metrics.conversational.routingAccuracy}%`
      : '-',
    convIntakeCompleteness: hasConversationalTests
      ? `${metrics.conversational.intakeCompleteness}%`
      : '-',
    convPrefillCompleteness: hasConversationalTests
      ? `${metrics.conversational.prefillCompleteness}%`
      : '-',
    convDisclaimersExpected: hasConversationalTests
      ? metrics.conversational.disclaimersRequired > 0
        ? `${metrics.conversational.disclaimersRequired}/${metrics.conversational.disclaimersRequired}`
        : '-'
      : '-',
    convDisclaimersActual: hasConversationalTests
      ? formatDisclaimerMetrics(
          metrics.conversational.disclaimersRequired,
          metrics.conversational.disclaimersShown,
          metrics.conversational.disclaimersMissed
        )
      : '-',
    convCompliancePassRate: hasConversationalTests
      ? `${metrics.conversational.compliancePassRate}%`
      : '-',
    convTestCount: metrics.conversational.testCount.toString(),
    ...conversationalStatuses,
    convOverallStatus,
    // Policy flow metrics
    policyIntakeCompleteness: hasPolicyTests ? `${metrics.policy.intakeCompleteness}%` : '-',
    policyDiscountAccuracy: hasPolicyTests ? `${metrics.policy.discountAccuracy}%` : '-',
    policyPitchClarity: hasPolicyTests ? `${metrics.policy.pitchClarity}%` : '-',
    policyDisclaimersExpected: hasPolicyTests
      ? metrics.policy.disclaimersRequired > 0
        ? `${metrics.policy.disclaimersRequired}/${metrics.policy.disclaimersRequired}`
        : '-'
      : '-',
    policyDisclaimersActual: hasPolicyTests
      ? formatDisclaimerMetrics(
          metrics.policy.disclaimersRequired,
          metrics.policy.disclaimersShown,
          metrics.policy.disclaimersMissed
        )
      : '-',
    policyCompliancePassRate: hasPolicyTests ? `${metrics.policy.compliancePassRate}%` : '-',
    policyTestCount: metrics.policy.testCount.toString(),
    ...policyStatuses,
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
 * Build test case details replacements
 */
function buildTestCaseDetailsReplacements(testResults: TestResult[]): Record<string, string> {
  const testCaseDetails = testResults
    .map((result) => {
      const status = result.passed ? '✅ PASS' : '❌ FAIL'

      // Get file name for individual report link
      const fileName = getTestCaseFileName(result.testCase)

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
