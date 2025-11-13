/**
 * Template Builder
 *
 * Builds template variable replacements for markdown reports.
 * Follows SRP (Single Responsibility Principle).
 */

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
  fieldCompleteness: Record<string, number>,
  tokenUsage: TokenUsageData,
  sampleTracesSection: string,
  testResults: TestResult[]
): Record<string, string> {
  return {
    ...buildTimestampReplacement(timestamp),
    ...buildMetricsReplacements(overallMetrics),
    ...buildTableReplacements(perCarrierRouting, perStateRouting, fieldCompleteness, tokenUsage),
    ...buildTracesReplacement(sampleTracesSection),
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
 * Build table replacements
 */
function buildTableReplacements(
  perCarrierRouting: Record<string, number>,
  perStateRouting: Record<string, number>,
  fieldCompleteness: Record<string, number>,
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

  const fieldTableRows = formatTableRows(
    fieldCompleteness,
    (field, completeness) => `| ${field} | ${formatPercentage(completeness)} |`
  )

  const tokenTableRows = tokenUsage.perTest
    .map(
      (usage) =>
        `| ${usage.testId} | ${usage.inputTokens.toLocaleString()} | ${usage.outputTokens.toLocaleString()} | ${formatCurrency(usage.cost)} |`
    )
    .join('\n')

  return {
    carrierTableRows: carrierTableRows || '| - | - |',
    stateTableRows: stateTableRows || '| - | - |',
    fieldTableRows: fieldTableRows || '| - | - |',
    totalInputTokens: tokenUsage.totalInputTokens.toLocaleString(),
    totalOutputTokens: tokenUsage.totalOutputTokens.toLocaleString(),
    totalCost: formatCurrency(tokenUsage.totalCost),
    tokenTableRows: tokenTableRows || '| - | - | - | - |',
  }
}

/**
 * Build traces replacement
 */
function buildTracesReplacement(sampleTracesSection: string): Record<string, string> {
  return {
    sampleTracesSection: sampleTracesSection || '_No traces available_',
  }
}

/**
 * Build test case details replacements
 */
function buildTestCaseDetailsReplacements(testResults: TestResult[]): Record<string, string> {
  const testCaseDetails = testResults
    .map((result) => {
      const status = result.passed ? '✅ Pass  ' : '❌ Fail  '
      const resultMetrics = result.metrics
      const metricsSection = resultMetrics
        ? `
**Metrics:**
- Routing Accuracy: ${formatPercentage(resultMetrics.routingAccuracy || 0)}
- Intake Completeness: ${formatPercentage(resultMetrics.intakeCompleteness || 0)}
- Discount Accuracy: ${formatPercentage(resultMetrics.discountAccuracy || 0)}
- Pitch Clarity: ${formatPercentage(resultMetrics.pitchClarity || 0)}
- Compliance: ${resultMetrics.compliancePassed ? '✅ Pass  ' : '❌ Fail  '}`
        : ''

      const errorSection = result.error ? `\n**Error:** ${result.error}` : ''

      return `### ${result.testCase.name} (ID: ${result.testCase.id})

**Type:** ${result.testCase.type}
**Carrier:** ${result.testCase.carrier}
**State:** ${result.testCase.state}
**Product:** ${Array.isArray(result.testCase.product) ? result.testCase.product.join(', ') : result.testCase.product}
**Status:** ${status}${metricsSection}${errorSection}

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
