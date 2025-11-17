/**
 * Metrics table builder for individual reports
 */

import type { TestResult } from '../../types'
import type { TestMetrics } from '../metrics-calculator'
import { formatPercentage } from '../shared/formatters'
import type { MetricConfig } from './types'

/**
 * Build a single metric table row
 */
function buildMetricRow(
  label: string,
  expected: string,
  actual: string,
  isPassing: boolean
): string {
  const status = isPassing ? '✅' : '❌'
  return `| ${label} | ${expected} | ${actual} | ${status} |`
}

/**
 * Build percentage-based metric row
 */
function buildPercentageMetricRow(
  label: string,
  expectedThreshold: number,
  actualValue: number,
  isPassing: (value: number) => boolean
): string {
  return buildMetricRow(
    label,
    `≥${expectedThreshold}%`,
    formatPercentage(actualValue),
    isPassing(actualValue)
  )
}

/**
 * Build compliance metric row
 */
function buildComplianceRow(compliancePassed: boolean): string {
  return buildMetricRow('Compliance', 'Pass', compliancePassed ? 'Pass' : 'Fail', compliancePassed)
}

/**
 * Build disclaimer metric row
 */
function buildDisclaimerRow(required: number, shown: number, missed: number): string {
  // Calculate how many required disclaimers were actually found
  // (shown may include extra disclaimers, so we use required - missed)
  const found = required - missed
  const actual = `${found}/${required} (${missed} missed)`
  const expected = `${required}/${required}`
  const isPassing = missed === 0
  return buildMetricRow('Disclaimers', expected, actual, isPassing)
}

/**
 * Metric configurations for conversational flow
 */
const CONVERSATIONAL_METRICS: MetricConfig[] = [
  {
    key: 'routingAccuracy',
    label: 'Routing Accuracy',
    expected: '≥90%',
    formatValue: formatPercentage,
    formatExpected: () => '≥90%',
    isPassing: (value) => value >= 90,
    applicableToFlow: () => true,
  },
  {
    key: 'intakeCompleteness',
    label: 'Intake Completeness',
    expected: '≥95%',
    formatValue: formatPercentage,
    formatExpected: () => '≥95%',
    isPassing: (value) => value >= 95,
    applicableToFlow: () => true,
  },
  {
    key: 'prefillCompleteness',
    label: 'Prefill Completeness',
    expected: '≥95%',
    formatValue: formatPercentage,
    formatExpected: () => '≥95%',
    isPassing: (value) => value >= 95,
    applicableToFlow: () => true,
  },
]

/**
 * Metric configurations for policy flow
 */
const POLICY_METRICS: MetricConfig[] = [
  {
    key: 'intakeCompleteness',
    label: 'Intake Completeness',
    expected: '≥95%',
    formatValue: formatPercentage,
    formatExpected: () => '≥95%',
    isPassing: (value) => value >= 95,
    applicableToFlow: () => true,
  },
  {
    key: 'discountAccuracy',
    label: 'Discount Accuracy',
    expected: '≥90%',
    formatValue: formatPercentage,
    formatExpected: () => '≥90%',
    isPassing: (value) => value >= 90,
    applicableToFlow: () => true,
  },
  {
    key: 'pitchClarity',
    label: 'Savings Pitch Clarity',
    expected: '≥85%',
    formatValue: formatPercentage,
    formatExpected: () => '≥85%',
    isPassing: (value) => value >= 85,
    applicableToFlow: () => true,
  },
]

/**
 * Build metrics table rows for a specific flow type
 */
function buildFlowMetricsRows(
  metrics: TestMetrics,
  flowType: 'conversational' | 'policy',
  metricConfigs: MetricConfig[]
): string[] {
  const rows: string[] = []

  for (const config of metricConfigs) {
    const value = metrics[config.key]
    if (value !== undefined && typeof value === 'number') {
      rows.push(
        buildPercentageMetricRow(
          config.label,
          Number.parseInt(config.expected.replace(/\D/g, ''), 10),
          value,
          config.isPassing
        )
      )
    }
  }

  return rows
}

/**
 * Build metrics table rows for individual report
 */
export function buildMetricsTableRows(result: TestResult): string {
  if (!result.metrics) return '| No metrics available | - | - | - |'

  const rows: string[] = []
  const { metrics, testCase } = result

  // Build flow-specific metrics
  if (testCase.type === 'conversational') {
    rows.push(...buildFlowMetricsRows(metrics, 'conversational', CONVERSATIONAL_METRICS))
  } else if (testCase.type === 'policy') {
    rows.push(...buildFlowMetricsRows(metrics, 'policy', POLICY_METRICS))
  }

  // Add disclaimer row (common to both flows, only if disclaimers are required)
  // Must be directly above compliance
  if (metrics.disclaimersRequired !== undefined && metrics.disclaimersRequired > 0) {
    rows.push(
      buildDisclaimerRow(
        metrics.disclaimersRequired,
        metrics.disclaimersShown ?? 0,
        metrics.disclaimersMissed ?? 0
      )
    )
  }

  // Add compliance row (common to both flows)
  // Must be directly below disclaimers
  if (metrics.compliancePassed !== undefined) {
    rows.push(buildComplianceRow(metrics.compliancePassed))
  }

  return rows.length > 0 ? rows.join('\n') : '| No metrics available | - | - | - |'
}
