/**
 * Report Metrics Aggregator
 *
 * Aggregates metrics across multiple test results for report generation.
 * Follows SRP (Single Responsibility Principle).
 * Enhanced with flow-specific metrics for conversational vs policy tests.
 */

import type { TestResult } from '../types'
import { aggregateAccuracy, calculateAverage, filterByTestType } from './report-utils'
import { extractTrace } from './shared/data-extractors'
import { calculateCost, extractTokenUsage } from './token-tracker'

/**
 * Overall metrics for all test results
 */
export interface OverallMetrics {
  routingAccuracy: number
  intakeCompleteness: number
  discountAccuracyAverage: number
  pitchClarityAverage: number
  disclaimersRequired: number
  disclaimersShown: number
  disclaimersMissed: number
  compliancePassRate: number
  // Flow-specific metrics (per spec)
  conversational: {
    routingAccuracy: number
    intakeCompleteness: number
    prefillCompleteness: number
    disclaimersRequired: number
    disclaimersShown: number
    disclaimersMissed: number
    compliancePassRate: number
    testCount: number
  }
  policy: {
    intakeCompleteness: number
    discountAccuracy: number
    pitchClarity: number
    disclaimersRequired: number
    disclaimersShown: number
    disclaimersMissed: number
    compliancePassRate: number
    testCount: number
  }
}

/**
 * Token usage data
 */
export interface TokenUsageData {
  totalInputTokens: number
  totalOutputTokens: number
  totalCost: number
  perTest: Array<{
    testId: string
    inputTokens: number
    outputTokens: number
    cost: number
  }>
}

/**
 * Extract metric values from test results
 */
function extractMetricValues<T>(
  results: TestResult[],
  extractor: (r: TestResult) => T | undefined,
  filter?: (value: T) => boolean
): T[] {
  const values = results.map(extractor).filter((v): v is T => v !== undefined)
  return filter ? values.filter(filter) : values
}

/**
 * Calculate compliance pass rate percentage
 */
function calculateCompliancePassRate(results: TestResult[]): number {
  const passed = results.filter((r) => r.metrics?.compliancePassed === true).length
  return results.length > 0 ? Math.round((passed / results.length) * 100) : 0
}

/**
 * Calculate aggregate disclaimer metrics
 */
function calculateDisclaimerMetrics(results: TestResult[]): {
  required: number
  shown: number
  missed: number
} {
  let totalRequired = 0
  let totalShown = 0
  let totalMissed = 0

  for (const result of results) {
    const metrics = result.metrics
    if (metrics) {
      totalRequired += metrics.disclaimersRequired ?? 0
      totalShown += metrics.disclaimersShown ?? 0
      totalMissed += metrics.disclaimersMissed ?? 0
    }
  }

  return {
    required: totalRequired,
    shown: totalShown,
    missed: totalMissed,
  }
}

/**
 * Calculate conversational flow metrics
 */
function calculateConversationalMetrics(
  conversationalResults: TestResult[]
): OverallMetrics['conversational'] {
  const routingAccuracies = extractMetricValues(
    conversationalResults,
    (r) => r.metrics?.routingAccuracy,
    (acc) => acc > 0
  )
  const intakeCompletenesses = extractMetricValues(
    conversationalResults,
    (r) => r.metrics?.intakeCompleteness
  )
  const prefillCompletenesses = extractMetricValues(
    conversationalResults,
    (r) => r.metrics?.prefillCompleteness
  )

  const disclaimerMetrics = calculateDisclaimerMetrics(conversationalResults)

  return {
    routingAccuracy: calculateAverage(routingAccuracies),
    intakeCompleteness: calculateAverage(intakeCompletenesses),
    prefillCompleteness: calculateAverage(prefillCompletenesses),
    disclaimersRequired: disclaimerMetrics.required,
    disclaimersShown: disclaimerMetrics.shown,
    disclaimersMissed: disclaimerMetrics.missed,
    compliancePassRate: calculateCompliancePassRate(conversationalResults),
    testCount: conversationalResults.length,
  }
}

/**
 * Calculate policy flow metrics
 */
function calculatePolicyMetrics(results: TestResult[]): OverallMetrics['policy'] {
  const intakeCompletenesses = extractMetricValues(results, (r) => r.metrics?.intakeCompleteness)
  const discountAccuracies = extractMetricValues(results, (r) => r.metrics?.discountAccuracy)
  const pitchClarities = extractMetricValues(results, (r) => r.metrics?.pitchClarity)

  const disclaimerMetrics = calculateDisclaimerMetrics(results)

  return {
    intakeCompleteness: calculateAverage(intakeCompletenesses),
    discountAccuracy: calculateAverage(discountAccuracies),
    pitchClarity: calculateAverage(pitchClarities),
    disclaimersRequired: disclaimerMetrics.required,
    disclaimersShown: disclaimerMetrics.shown,
    disclaimersMissed: disclaimerMetrics.missed,
    compliancePassRate: calculateCompliancePassRate(results),
    testCount: results.length,
  }
}

/**
 * Calculate overall metrics from test results
 */
export function calculateOverallMetrics(results: TestResult[]): OverallMetrics {
  const conversationalResults = filterByTestType(results, 'conversational')
  const policyResults = filterByTestType(results, 'policy')

  // Overall metrics (across all test types)
  const routingAccuracies = extractMetricValues(
    conversationalResults,
    (r) => r.metrics?.routingAccuracy,
    (acc) => acc > 0
  )
  const intakeCompletenesses = extractMetricValues(results, (r) => r.metrics?.intakeCompleteness)
  const discountAccuracies = extractMetricValues(policyResults, (r) => r.metrics?.discountAccuracy)
  const pitchClarities = extractMetricValues(policyResults, (r) => r.metrics?.pitchClarity)
  const overallDisclaimerMetrics = calculateDisclaimerMetrics(results)

  return {
    routingAccuracy: calculateAverage(routingAccuracies),
    intakeCompleteness: calculateAverage(intakeCompletenesses),
    discountAccuracyAverage: calculateAverage(discountAccuracies),
    pitchClarityAverage: calculateAverage(pitchClarities),
    disclaimersRequired: overallDisclaimerMetrics.required,
    disclaimersShown: overallDisclaimerMetrics.shown,
    disclaimersMissed: overallDisclaimerMetrics.missed,
    compliancePassRate: calculateCompliancePassRate(results),
    conversational: calculateConversationalMetrics(conversationalResults),
    policy: calculatePolicyMetrics(policyResults),
  }
}

/**
 * Calculate per-carrier routing accuracy
 */
export function calculatePerCarrierRouting(results: TestResult[]): Record<string, number> {
  const conversationalResults = filterByTestType(results, 'conversational')
  return aggregateAccuracy(
    conversationalResults,
    (r) => r.testCase.carrier,
    (r) => r.metrics?.routingAccuracy === 100
  )
}

/**
 * Calculate per-state routing accuracy
 */
export function calculatePerStateRouting(results: TestResult[]): Record<string, number> {
  const conversationalResults = filterByTestType(results, 'conversational')
  return aggregateAccuracy(
    conversationalResults,
    (r) => r.testCase.state,
    (r) => r.metrics?.routingAccuracy === 100
  )
}

/**
 * Extract token usage data from test results
 */
export function extractTokenUsageData(results: TestResult[]): TokenUsageData {
  let totalInputTokens = 0
  let totalOutputTokens = 0
  const perTest: Array<{
    testId: string
    inputTokens: number
    outputTokens: number
    cost: number
  }> = []

  for (const result of results) {
    if (result.actualResponse) {
      const trace = extractTrace(result.actualResponse)
      if (trace) {
        const { inputTokens, outputTokens } = extractTokenUsage(trace)
        totalInputTokens += inputTokens
        totalOutputTokens += outputTokens
        const cost = calculateCost(inputTokens, outputTokens)

        perTest.push({
          testId: result.testCase.id,
          inputTokens,
          outputTokens,
          cost,
        })
      }
    }
  }

  return {
    totalInputTokens,
    totalOutputTokens,
    totalCost: calculateCost(totalInputTokens, totalOutputTokens),
    perTest,
  }
}
